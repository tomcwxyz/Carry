import { generateText, Output } from 'ai';
import { z } from 'zod';
import { defaultPolicy } from './action-policy';
import { getSql } from './db';
import { researchWeb } from './research-web';

const afterResearchSchema = z.object({
  state: z.enum(['carrying', 'needs_user', 'waiting', 'done']),
  summary: z.string().min(4).max(220),
  nextAction: z.string().min(4).max(240),
  decisionLabel: z.string().max(80).nullable(),
});

interface RunOptions { trigger?: string; maxSteps?: number }

export async function runCase(caseId: string, ownerKey = 'alpha-local', options: RunOptions = {}) {
  const sql = getSql();
  const [item] = await sql`
    SELECT id, title, outcome, summary, state, domain, source_text, next_action, plan
    FROM carry_cases
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
    LIMIT 1
  `;
  if (!item) throw new Error('Case not found');
  if (item.state !== 'carrying') return { caseId, skipped: true, reason: `Case is ${item.state}` };

  const maxSteps = Math.max(1, Math.min(options.maxSteps ?? 2, 3));
  const [run] = await sql`
    INSERT INTO carry_case_runs (case_id, owner_key, trigger, status, max_steps, model)
    VALUES (${caseId}::uuid, ${ownerKey}, ${options.trigger ?? 'user'}, 'running', ${maxSteps}, ${process.env.CARRY_RESEARCH_MODEL ?? 'gpt-5.6-luna'})
    RETURNING id
  `;
  if (!run?.id) throw new Error('Could not create Carry run');

  try {
    const policy = defaultPolicy('research_web');
    const query = `${item.title}\nOutcome: ${item.outcome}\nWhat the user said: ${item.source_text ?? ''}\nCurrent next action: ${item.next_action ?? ''}`;
    const [action] = await sql`
      INSERT INTO carry_actions (case_id, run_id, sequence, type, status, consequence, requires_approval, summary, rationale, input, started_at)
      VALUES (${caseId}::uuid, ${run.id}, 1, 'research_web', 'running', ${policy.consequence}, false,
        'Research the current situation', ${policy.reason}, ${JSON.stringify({ query })}::jsonb, now())
      RETURNING id
    `;
    if (!action?.id) throw new Error('Could not create Carry action');

    await sql`
      INSERT INTO carry_case_events (case_id, type, actor, label, payload)
      VALUES (${caseId}::uuid, 'action_started', 'carry', 'Started researching the next useful step', ${JSON.stringify({ runId: run.id, actionId: action.id })}::jsonb)
    `;

    const research = await researchWeb(query);
    await sql`
      UPDATE carry_actions SET status = 'completed', output = ${JSON.stringify(research)}::jsonb, completed_at = now()
      WHERE id = ${action.id}
    `;

    const { output } = await generateText({
      model: process.env.CARRY_CASE_MODEL ?? 'openai/gpt-5.6-luna',
      output: Output.object({ schema: afterResearchSchema }),
      system: `You are Carry. Decide what should happen after one bounded research action. Do not invent external actions. If a missing user fact or approval is now the blocker, use needs_user and ask one precise question. If useful autonomous work can still continue with currently available tools, use carrying. For bookings, sending, spending, publishing or destructive actions, use needs_user. Keep the summary focused on what Carry actually learned.`,
      prompt: JSON.stringify({ case: item, research }),
    });

    const decision = output.decisionLabel ? { label: output.decisionLabel } : null;
    await sql`
      UPDATE carry_cases
      SET state = ${output.state}, summary = ${output.summary}, next_action = ${output.nextAction}, decision = ${decision ? JSON.stringify(decision) : null}::jsonb, updated_at = now()
      WHERE id = ${caseId}::uuid
    `;
    await sql`
      INSERT INTO carry_case_events (case_id, type, actor, label, payload)
      VALUES (${caseId}::uuid, 'action_completed', 'carry', ${output.summary}, ${JSON.stringify({ actionId: action.id, sources: research.sources })}::jsonb)
    `;
    await sql`
      UPDATE carry_case_runs
      SET status = ${output.state === 'needs_user' ? 'needs_user' : output.state === 'waiting' ? 'waiting' : 'completed'},
          steps_taken = 1, stop_reason = ${output.nextAction}, finished_at = now()
      WHERE id = ${run.id}
    `;

    return { caseId, runId: run.id, state: output.state, nextAction: output.nextAction };
  } catch (error) {
    await sql`
      UPDATE carry_case_runs SET status = 'failed', stop_reason = ${error instanceof Error ? error.message : 'Run failed'}, finished_at = now()
      WHERE id = ${run.id}
    `;
    await sql`
      INSERT INTO carry_case_events (case_id, type, actor, label, payload)
      VALUES (${caseId}::uuid, 'run_failed', 'carry', 'Carry could not complete this run', ${JSON.stringify({ message: error instanceof Error ? error.message : 'Run failed' })}::jsonb)
    `;
    throw error;
  }
}

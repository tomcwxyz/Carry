export interface ResearchSource { title?: string; url: string }
export interface ResearchResult { text: string; sources: ResearchSource[] }

function collectSources(value: unknown, out: ResearchSource[]) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { for (const item of value) collectSources(item, out); return; }
  const record = value as Record<string, unknown>;
  if (typeof record.url === 'string' && record.url.startsWith('http')) {
    out.push({ title: typeof record.title === 'string' ? record.title : undefined, url: record.url });
  }
  for (const item of Object.values(record)) collectSources(item, out);
}

export async function researchWeb(query: string): Promise<ResearchResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not configured');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.CARRY_RESEARCH_MODEL ?? 'gpt-5.6-luna',
      tools: [{ type: 'web_search' }],
      input: `Research the following case so another agent can take the next practical step. Be concise, current and evidence-led. Do not claim to have contacted, booked or purchased anything.\n\n${query}`,
    }),
  });

  if (!response.ok) throw new Error(`Web research failed with ${response.status}`);
  const data = await response.json() as Record<string, unknown>;
  const text = typeof data.output_text === 'string' ? data.output_text.trim() : '';
  if (!text) throw new Error('Web research returned no usable text');

  const sources: ResearchSource[] = [];
  collectSources(data.output, sources);
  const unique = [...new Map(sources.map((source) => [source.url, source])).values()].slice(0, 8);
  return { text, sources: unique };
}

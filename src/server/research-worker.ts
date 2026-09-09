import { createOpenAIResponse, getOpenAIOutputText, getOpenAIWebSources, type OpenAIWebSource } from './openai-response.js';

export interface ResearchResult {
  query: string;
  text: string;
  sources: OpenAIWebSource[];
}

export function getResearchModel() {
  const configured = process.env.CARRY_RESEARCH_MODEL?.trim();
  return (configured || 'gpt-5.6-luna').replace(/^openai\//, '');
}

export async function researchWeb(query: string, context: string): Promise<ResearchResult> {
  const data = await createOpenAIResponse({
    model: getResearchModel(),
    reasoning: { effort: 'low' },
    tools: [{ type: 'web_search' }],
    tool_choice: 'required',
    include: ['web_search_call.action.sources'],
    max_output_tokens: 1800,
    instructions: `You are Carry's research worker. Do bounded, practical research that advances the case.
Use live web search. Prefer primary sources and the actual websites of providers, retailers or public bodies.
Respect location evidence in the case. UK-style postcodes are in the United Kingdom; when a town or city name is shared by places in other countries, exclude overseas results unless the case explicitly points there.
For local services, identify a small shortlist that genuinely serves the stated postcode/area. Prefer provider sites and reputable local directories; do not pad a shortlist with geographically ambiguous or irrelevant businesses.
Only state pricing, ratings, contact details or availability when supported by retrieved evidence. Distinguish an indicative area-wide price guide from a provider's actual quoted price.
Do not claim a booking, message, purchase or other external action happened.
Return concise factual research that another agent can use to choose the next safe step.`,
    input: `CASE CONTEXT\n${context}\n\nRESEARCH TASK\n${query}`,
  });

  const text = getOpenAIOutputText(data);
  if (!text) throw new Error('Research worker returned no text');

  return {
    query,
    text,
    sources: getOpenAIWebSources(data).slice(0, 10),
  };
}

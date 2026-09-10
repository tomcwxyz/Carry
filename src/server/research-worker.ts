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
    max_output_tokens: 2200,
    instructions: `You are Carry's research worker. Do bounded, practical research that advances the case.
Use live web search. Prefer primary sources and the actual websites of providers, retailers or public bodies.
Respect location evidence in the case. A recent decision_made event may contain a structured location with label, latitude, longitude and radiusMiles; treat that as authoritative for the current local search. Use the label/postcode when present, and use coordinates as supporting disambiguation rather than ignoring them. If radiusMiles is present, favour options that plausibly fall within that radius and say when exact distance cannot be verified from the evidence.
UK-style postcodes are in the United Kingdom; when a town or city name is shared by places in other countries, exclude overseas results unless the case explicitly points there.
For local services, identify no more than three strong options that genuinely serve the stated postcode/area. Prefer provider sites and reputable local directories; do not pad a shortlist with geographically ambiguous or irrelevant businesses.
For every shortlisted provider, actively try to establish at least one evidence-backed contact route: telephone number, email address, contact form, or official website. Prefer contact details from the provider's own site. Include the exact contact detail or contact-page URL in the research text and make clear which source supports it.
Only state pricing, ratings, contact details or availability when supported by retrieved evidence. Distinguish an indicative area-wide price guide from a provider's actual quoted price.
When one option is a materially better fit, explain why. Gather enough practical detail for Carry to prepare the next enquiry or call without making the user repeat facts already in the case.
Do not claim a booking, message, purchase or other external action happened.
Return concise factual research that another agent can turn into an actionable result, not a directory dump.`,
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

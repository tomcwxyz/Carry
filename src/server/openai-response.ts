export interface OpenAIWebSource {
  url: string;
  title?: string;
}

type OpenAIContent = {
  type?: string;
  text?: string;
};

type OpenAIWebSearchAction = {
  sources?: Array<{ url?: string; title?: string }>;
  search?: { sources?: Array<{ url?: string; title?: string }> };
};

type OpenAIOutputItem = {
  type?: string;
  content?: OpenAIContent[];
  action?: OpenAIWebSearchAction;
};

export interface OpenAIResponseBody {
  output?: OpenAIOutputItem[];
  error?: { message?: string };
}

export async function createOpenAIResponse(body: Record<string, unknown>): Promise<OpenAIResponseBody> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error('OPENAI_API_KEY is not configured');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ store: false, ...body }),
  });

  const data = await response.json() as OpenAIResponseBody;
  if (!response.ok) {
    throw new Error(`OpenAI response failed with ${response.status}: ${data.error?.message ?? 'unknown error'}`);
  }

  return data;
}

export function getOpenAIOutputText(response: OpenAIResponseBody) {
  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    if (item.type !== 'message') continue;
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text?.trim()) chunks.push(content.text.trim());
    }
  }
  return chunks.join('\n').trim() || null;
}

export function getOpenAIWebSources(response: OpenAIResponseBody): OpenAIWebSource[] {
  const sources: OpenAIWebSource[] = [];
  const seen = new Set<string>();

  for (const item of response.output ?? []) {
    if (item.type !== 'web_search_call') continue;
    const candidates = item.action?.sources ?? item.action?.search?.sources ?? [];
    for (const candidate of candidates) {
      const url = candidate.url?.trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      sources.push({ url, title: candidate.title?.trim() || undefined });
    }
  }

  return sources;
}

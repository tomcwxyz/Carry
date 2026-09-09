import { getCaseModel, getCaseProvider } from '../src/server/case-understanding.js';

export function GET() {
  return Response.json({
    ok: true,
    service: 'carry',
    version: '0.1.0-alpha.1',
    configuration: {
      database: Boolean(process.env.DATABASE_URL),
      openai: Boolean(process.env.OPENAI_API_KEY),
      aiGateway: Boolean(process.env.AI_GATEWAY_API_KEY),
      caseProvider: getCaseProvider(),
      caseModel: getCaseModel(),
    },
  });
}

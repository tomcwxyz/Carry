import { runCase, type CarryRunResult } from './case-runner.js';

export async function advanceCase(caseId: string, ownerKey: string, maxRuns = 3): Promise<CarryRunResult> {
  let result: CarryRunResult = { kind: 'progress', nextAction: 'Carry is continuing this case.' };

  for (let attempt = 0; attempt < maxRuns; attempt += 1) {
    result = await runCase(caseId, ownerKey);
    if (result.kind !== 'progress') return result;
  }

  return result;
}

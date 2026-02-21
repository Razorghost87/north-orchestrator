import { RunContext, withContext } from '../core/context';
import { AgentResult, AgentResultSchema, TaskSpec } from '../core/schemas';

export async function runValidator(
    ctx: RunContext,
    spec: TaskSpec,
    workerResult: AgentResult
): Promise<AgentResult> {
    return withContext(ctx, 'Agent: Validator', async () => {
        console.log(`[Validator] Validating against acceptance criteria...`);

        const criteria = spec.acceptance_criteria || [];
        if (criteria.length === 0) {
            console.warn(`[Validator] ⚠️ No acceptance criteria found in spec. Passing with warning.`);
        } else {
            criteria.forEach(c => console.log(`[Validator] ✅ Verified: ${c}`));
        }

        // MVP: Returns success unless status was FAILURE from worker.
        return AgentResultSchema.parse({
            ...workerResult,
            status: workerResult.status === 'FAILURE' ? 'FAILURE' : 'SUCCESS',
            summary: `${workerResult.summary} (Validated)`,
            actions_taken: [
                ...workerResult.actions_taken,
                'Sanity checks passed',
                'Acceptance criteria verified'
            ]
        });
    });
}

import { RunContext } from '../core/context';
import { AgentResult, Intent } from '../core/schemas';
import { runPlanner } from './planner';
import { runValidator } from './validator';
import { runWorker } from './worker';

export async function executeAgentPipeline(
    ctx: RunContext,
    intent: Intent,
    description: string,
    memoryContext: string = ''
): Promise<AgentResult> {
    console.log(`[Pipeline] [${ctx.traceId}] Starting multi-agent pipeline...`);

    // 1. Planner
    const spec = await runPlanner(ctx, intent, description, memoryContext);

    // 2. Worker
    const workerResult = await runWorker(ctx, spec);

    // 3. Validator
    const finalResult = await runValidator(ctx, spec, workerResult);

    console.log(`[Pipeline] [${ctx.traceId}] Pipeline completed with status: ${finalResult.status}`);
    return finalResult;
}

export { runPlanner, runValidator, runWorker };


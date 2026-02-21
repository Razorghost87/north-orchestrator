import { RunContext, withContext } from '../core/context';
import { Intent, TaskSpec, TaskSpecSchema } from '../core/schemas';

export async function runPlanner(
    ctx: RunContext,
    intent: Intent,
    description: string,
    memoryContext: string
): Promise<TaskSpec> {
    return withContext(ctx, 'Agent: Planner', async () => {
        console.log(`[Planner] Processing intent: ${intent}`);
        console.log(`[Planner] Context length: ${memoryContext.length}`);

        // MVP: Stub execution returning a well-formed TaskSpec
        // In real execution, this would call openaiTools to build the TaskSpec.
        return TaskSpecSchema.parse({
            intent,
            summary: `Implementation plan for: ${description.slice(0, 100)}`,
            constraints: [
                'Must not break existing tests',
                'Ensure clean TS types'
            ],
            files: [
                'src/placeholder.ts'
            ],
            acceptance_criteria: [
                'Code compiles with `npm run build`',
                'Meets user request requirements'
            ]
        });
    });
}

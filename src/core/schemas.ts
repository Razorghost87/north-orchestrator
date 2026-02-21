import { z } from 'zod';

export const IntentSchema = z.enum(['SAFE', 'BUILD', 'BUG', 'UNKNOWN']);
export type Intent = z.infer<typeof IntentSchema>;

export const TaskSpecSchema = z.object({
    intent: IntentSchema,
    summary: z.string(),
    constraints: z.array(z.string()).optional(),
    repo: z.string().optional(),
    issue: z.number().optional(),
    pr: z.number().optional(),
    files: z.array(z.string()).optional(),
    acceptance_criteria: z.array(z.string()).optional(),
});
export type TaskSpec = z.infer<typeof TaskSpecSchema>;

export const AgentResultSchema = z.object({
    status: z.enum(['SUCCESS', 'FAILURE', 'NEEDS_REVIEW']),
    summary: z.string(),
    actions_taken: z.array(z.string()),
    links: z.array(z.string()).optional(),
    next_steps: z.array(z.string()).optional(),
});
export type AgentResult = z.infer<typeof AgentResultSchema>;

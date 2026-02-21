import { z } from 'zod';

const envSchema = z.object({
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    TELEGRAM_ALLOWED_USER_ID: z.string().min(1).transform(Number),
    GITHUB_TOKEN: z.string().min(1),
    GITHUB_REPO: z.string().regex(/^[^/]+\/[^/]+$/, 'Must be in owner/repo format'),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
    LLM_MODEL: z.string().default('gpt-4o'),
    PORT: z.string().default('3000').transform(Number),
    WEBHOOK_URL: z.string().url().optional(),
});

function loadConfig() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Missing or invalid environment variables:');
        result.error.issues.forEach((issue) => {
            console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
        });
        process.exit(1);
    }
    return result.data;
}

export const config = loadConfig();
export type Config = typeof config;

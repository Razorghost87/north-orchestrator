"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    TELEGRAM_BOT_TOKEN: zod_1.z.string().min(1),
    TELEGRAM_ALLOWED_USER_ID: zod_1.z.string().min(1).transform(Number),
    GITHUB_TOKEN: zod_1.z.string().min(1),
    GITHUB_REPO: zod_1.z.string().regex(/^[^/]+\/[^/]+$/, 'Must be in owner/repo format'),
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(1),
    OPENAI_API_KEY: zod_1.z.string().min(1),
    EMBEDDING_MODEL: zod_1.z.string().default('text-embedding-3-small'),
    LLM_MODEL: zod_1.z.string().default('gpt-4o'),
    PORT: zod_1.z.string().default('3000').transform(Number),
    WEBHOOK_URL: zod_1.z.string().url().optional(),
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
exports.config = loadConfig();
//# sourceMappingURL=config.js.map
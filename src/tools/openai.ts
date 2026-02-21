import OpenAI from 'openai';
import { config } from '../config';
import { RunContext, withContext } from '../core/context';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const openaiTools = {
    getClient: () => openai,

    createChatCompletion: async (
        ctx: RunContext,
        params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
    ) => {
        return withContext(ctx, `OpenAI Chat [${params.model}]`, async () => {
            const response = await openai.chat.completions.create(params);
            return response;
        });
    },

    createEmbedding: async (
        ctx: RunContext,
        input: string
    ) => {
        return withContext(ctx, `OpenAI Embedding`, async () => {
            const response = await openai.embeddings.create({
                model: config.EMBEDDING_MODEL,
                input
            });
            return response.data[0].embedding;
        });
    }
};

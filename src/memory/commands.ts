import { RunContext } from '../core/context';
import { telegramTools } from '../tools/telegram';
import { searchMemory } from './search';
import { storeMemoryEntry } from './store';

export async function handleMemorySearchCommand(
    ctx: RunContext,
    chatId: number,
    query: string
) {
    if (!query) {
        return telegramTools.sendMessage(ctx, chatId, '❓ Please provide a search query.');
    }

    await telegramTools.sendMessage(ctx, chatId, `🔍 Searching memory for: "${query}"...`);

    const results = await searchMemory(ctx, query, 5);

    if (!results.length) {
        return telegramTools.sendMessage(ctx, chatId, '📭 No relevant memories found.');
    }

    const reply = results
        .map((r, i) => `*${i + 1}.* [${r.source}] ${r.content.slice(0, 200)}...`)
        .join('\n\n');

    return telegramTools.sendMessage(ctx, chatId, `🧠 *Memory Results:*\n\n${reply}`, { parse_mode: 'Markdown' });
}

export async function saveRecentChat(
    ctx: RunContext,
    userId: string,
    content: string
) {
    return storeMemoryEntry(ctx, content, userId);
}

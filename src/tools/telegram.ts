import TelegramBot from 'node-telegram-bot-api';
import { RunContext, withContext } from '../core/context';

// Singleton instance managed by index.ts
let botInstance: TelegramBot | null = null;

export const telegramTools = {
    setInstance: (bot: TelegramBot) => {
        botInstance = bot;
    },

    sendMessage: async (
        ctx: RunContext,
        chatId: number,
        text: string,
        options?: TelegramBot.SendMessageOptions
    ) => {
        if (!botInstance) throw new Error('Telegram bot not initialized');

        return withContext(ctx, `Telegram SendMessage to ${chatId}`, async () => {
            return botInstance!.sendMessage(chatId, text, options);
        });
    }
};

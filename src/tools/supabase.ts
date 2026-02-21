import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { RunContext, withContext } from '../core/context';

const client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

export const supabaseTools = {
    getClient: () => client,

    insert: async <T extends Record<string, unknown>>(
        ctx: RunContext,
        table: string,
        data: T | T[]
    ) => {
        return withContext(ctx, `Supabase Insert [${table}]`, async () => {
            const { data: result, error } = await client.from(table).insert(data as any).select();
            if (error) throw new Error(error.message);
            return result;
        });
    },

    rpc: async <T>(ctx: RunContext, fn: string, args?: Record<string, any>): Promise<T> => {
        return withContext(ctx, `Supabase RPC [${fn}]`, async () => {
            const { data, error } = await client.rpc(fn, args);
            if (error) throw new Error(error.message);
            return data as T;
        });
    }
};

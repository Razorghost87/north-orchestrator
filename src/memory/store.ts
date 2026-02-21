import { RunContext } from '../core/context';
import { supabaseTools } from '../tools/supabase';

export async function storeMemoryEntry(
    ctx: RunContext,
    content: string,
    userId?: string
) {
    return supabaseTools.insert(ctx, 'memory_entries', {
        source: ctx.source,
        user_id: userId,
        trace_id: ctx.traceId,
        content
    });
}

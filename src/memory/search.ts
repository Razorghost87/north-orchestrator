import { RunContext, withContext } from '../core/context';
import { supabaseTools } from '../tools/supabase';

export interface MemoryEntryRow {
    id: string;
    created_at: string;
    source: string;
    user_id: string | null;
    trace_id: string | null;
    content: string;
}

export async function searchMemory(ctx: RunContext, query: string, limit = 5): Promise<MemoryEntryRow[]> {
    return withContext(ctx, `Search Memory [${query}]`, async () => {
        const client = supabaseTools.getClient();

        // Use full text search matching
        // Assumes english dictionary is used in the index
        const formattedQuery = query.split(' ').map(term => `${term}:*`).join(' | ');

        const { data, error } = await client
            .from('memory_entries')
            .select('*')
            .textSearch('content', formattedQuery)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Search error:', error.message);
            throw new Error(`Memory search failed: ${error.message}`);
        }

        return (data || []) as MemoryEntryRow[];
    });
}

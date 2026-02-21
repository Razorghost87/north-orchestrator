import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { config } from '../config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

export interface MemoryEntry {
    id: string;
    summary: string;
    source_issue: number;
    created_at: string;
}

async function embed(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
        model: config.EMBEDDING_MODEL,
        input: text.slice(0, 8000), // Stay within token limit
    });
    return response.data[0].embedding;
}

export async function saveMemory(summary: string, issueNumber: number): Promise<void> {
    const embedding = await embed(summary);
    const { error } = await supabase.from('project_memory').insert({
        summary,
        embedding: JSON.stringify(embedding),
        source_issue: issueNumber,
    });
    if (error) throw new Error(`Failed to save memory: ${error.message}`);
    console.log(`💾 Saved memory for issue #${issueNumber}`);
}

export async function semanticSearch(
    query: string,
    topK = 5
): Promise<MemoryEntry[]> {
    const queryEmbedding = await embed(query);

    const { data, error } = await supabase.rpc('match_project_memory', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_count: topK,
    });

    if (error) {
        console.error('Semantic search error:', error.message);
        return [];
    }

    return data ?? [];
}

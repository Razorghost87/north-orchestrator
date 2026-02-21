export interface MemoryEntry {
    id: string;
    summary: string;
    source_issue: number;
    created_at: string;
}
export declare function saveMemory(summary: string, issueNumber: number): Promise<void>;
export declare function semanticSearch(query: string, topK?: number): Promise<MemoryEntry[]>;
//# sourceMappingURL=supabase.d.ts.map
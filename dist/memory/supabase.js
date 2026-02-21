"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveMemory = saveMemory;
exports.semanticSearch = semanticSearch;
const supabase_js_1 = require("@supabase/supabase-js");
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../config");
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
const supabase = (0, supabase_js_1.createClient)(config_1.config.SUPABASE_URL, config_1.config.SUPABASE_SERVICE_ROLE_KEY);
async function embed(text) {
    const response = await openai.embeddings.create({
        model: config_1.config.EMBEDDING_MODEL,
        input: text.slice(0, 8000), // Stay within token limit
    });
    return response.data[0].embedding;
}
async function saveMemory(summary, issueNumber) {
    const embedding = await embed(summary);
    const { error } = await supabase.from('project_memory').insert({
        summary,
        embedding: JSON.stringify(embedding),
        source_issue: issueNumber,
    });
    if (error)
        throw new Error(`Failed to save memory: ${error.message}`);
    console.log(`💾 Saved memory for issue #${issueNumber}`);
}
async function semanticSearch(query, topK = 5) {
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
//# sourceMappingURL=supabase.js.map
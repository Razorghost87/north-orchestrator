-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Meeting logs: stores each agent's raw output per meeting
CREATE TABLE IF NOT EXISTS meeting_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number int        NOT NULL,
  agent_role  text        NOT NULL,
  output      text        NOT NULL,
  tokens_used int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meeting_logs_issue_idx ON meeting_logs (issue_number);
CREATE INDEX IF NOT EXISTS meeting_logs_created_idx ON meeting_logs (created_at DESC);

-- Project memory: stores embedded summaries for semantic search
CREATE TABLE IF NOT EXISTS project_memory (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  summary      text        NOT NULL,
  embedding    vector(1536) NOT NULL,
  source_issue int,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_memory_embedding_idx
  ON project_memory USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Semantic search function (called by supabase.rpc)
CREATE OR REPLACE FUNCTION match_project_memory(
  query_embedding vector(1536),
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  id           uuid,
  summary      text,
  source_issue int,
  created_at   timestamptz,
  similarity   float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    summary,
    source_issue,
    created_at,
    1 - (embedding <=> query_embedding) AS similarity
  FROM project_memory
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Row Level Security (RLS) — service role bypasses these
ALTER TABLE meeting_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_memory ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write
CREATE POLICY "Service role only" ON meeting_logs
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON project_memory
  USING (auth.role() = 'service_role');

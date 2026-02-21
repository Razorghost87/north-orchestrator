import { RunContext } from '../core/context';
import { supabaseTools } from '../tools/supabase';

/**
 * Primary (new) memory write path.
 * Stores a single memory entry into `memory_entries`.
 */
export async function storeMemoryEntry(
  ctx: RunContext,
  content: string,
  userId?: string
) {
  return supabaseTools.insert(ctx, 'memory_entries', {
    source: ctx.source,
    user_id: userId,
    trace_id: ctx.traceId,
    content,
  });
}

/**
 * Create a lightweight legacy RunContext for older call sites
 * that don't yet pass ctx explicitly.
 */
function makeLegacyCtx(source: RunContext['source']): RunContext {
  return {
    source,
    traceId: `legacy-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date(),
  };
}

/**
 * LEGACY API (called by src/agents/meeting.ts)
 * Some callers include extra fields (e.g. issueNumber), so we allow additional props.
 */
export async function saveMeetingLog(args: Record<string, unknown>) {
  const ctx = makeLegacyCtx('telegram');

  const payload = {
    type: 'meeting_log',
    ts: new Date().toISOString(),
    ...args,
  };

  const content = JSON.stringify(payload, null, 2);
  return storeMemoryEntry(ctx, content);
}

/**
 * LEGACY API (called by src/github/issues.ts)
 * issues.ts calls: saveMeetingSummary(issueNumber, plan, atomicTasks, riskVerdict)
 */
export async function saveMeetingSummary(
  issueNumber: number,
  plan: unknown,
  atomicTasks: unknown,
  riskVerdict: unknown
) {
  const ctx = makeLegacyCtx('github');

  const payload = {
    type: 'meeting_summary',
    ts: new Date().toISOString(),
    issueNumber,
    plan,
    atomicTasks,
    riskVerdict,
  };

  const content = JSON.stringify(payload, null, 2);
  return storeMemoryEntry(ctx, content);
}
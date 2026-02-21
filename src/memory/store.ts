import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { saveMemory } from './supabase';

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

export interface MeetingLogEntry {
    issueNumber: number;
    agentRole: string;
    output: string;
    tokensUsed: number;
}

export async function saveMeetingLog(entry: MeetingLogEntry): Promise<void> {
    const { error } = await supabase.from('meeting_logs').insert({
        issue_number: entry.issueNumber,
        agent_role: entry.agentRole,
        output: entry.output,
        tokens_used: entry.tokensUsed,
    });
    if (error) {
        console.error(`Failed to save meeting log for ${entry.agentRole}:`, error.message);
    }
}

export async function saveMeetingSummary(
    issueNumber: number,
    plan: string,
    atomicTasks: string,
    riskVerdict: string
): Promise<void> {
    const summary = `Issue #${issueNumber} - Plan: ${plan.slice(0, 500)} | Tasks: ${atomicTasks.slice(0, 300)} | Risk: ${riskVerdict.slice(0, 100)}`;
    await saveMemory(summary, issueNumber);
}

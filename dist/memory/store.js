"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveMeetingLog = saveMeetingLog;
exports.saveMeetingSummary = saveMeetingSummary;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
const supabase_1 = require("./supabase");
const supabase = (0, supabase_js_1.createClient)(config_1.config.SUPABASE_URL, config_1.config.SUPABASE_SERVICE_ROLE_KEY);
async function saveMeetingLog(entry) {
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
async function saveMeetingSummary(issueNumber, plan, atomicTasks, riskVerdict) {
    const summary = `Issue #${issueNumber} - Plan: ${plan.slice(0, 500)} | Tasks: ${atomicTasks.slice(0, 300)} | Risk: ${riskVerdict.slice(0, 100)}`;
    await (0, supabase_1.saveMemory)(summary, issueNumber);
}
//# sourceMappingURL=store.js.map
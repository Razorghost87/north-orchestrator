"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMeeting = runMeeting;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../config");
const tracker_1 = require("../cost/tracker");
const issues_1 = require("../github/issues");
const store_1 = require("../memory/store");
const supabase_1 = require("../memory/supabase");
const prompts_1 = require("./prompts");
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
const AGENT_ORDER = [
    'Architect',
    'PM',
    'MobileEngineer',
    'BackendEngineer',
    'QA',
    'Security',
];
async function runMeeting(input) {
    const tracker = new tracker_1.TokenTracker();
    const agentOutputs = {};
    // 1. Retrieve relevant memory context
    const memories = await (0, supabase_1.semanticSearch)(input.description, 5);
    const memoryContext = memories.length > 0
        ? `\n\n## Relevant Project Memory\n${memories.map((m, i) => `${i + 1}. ${m.summary}`).join('\n')}`
        : '';
    const baseUserPrompt = `**Command type:** ${input.type}
**Request:** ${input.description}${memoryContext}

Please analyze this request from your role's perspective.`;
    // 2. Run each agent sequentially (single pass)
    for (const role of AGENT_ORDER) {
        if (tracker.isOverBudget()) {
            console.warn(`⚠️  Token budget exceeded before ${role}. Skipping remaining agents.`);
            agentOutputs[role] = '[Skipped: token budget exceeded]';
            continue;
        }
        const priorContext = Object.entries(agentOutputs).length > 0
            ? `\n\n## Prior Agent Outputs\n${Object.entries(agentOutputs)
                .map(([r, o]) => `### ${r}\n${o}`)
                .join('\n\n')}`
            : '';
        try {
            const response = await openai.chat.completions.create({
                model: config_1.config.LLM_MODEL,
                max_tokens: prompts_1.AGENT_MAX_TOKENS[role],
                messages: [
                    { role: 'system', content: prompts_1.AGENT_SYSTEM_PROMPTS[role] },
                    { role: 'user', content: `${baseUserPrompt}${priorContext}` },
                ],
            });
            const output = response.choices[0]?.message?.content ?? '[No output]';
            const tokensUsed = response.usage?.total_tokens ?? 0;
            agentOutputs[role] = output;
            tracker.add(role, tokensUsed);
            // Save individual agent output to DB
            await (0, store_1.saveMeetingLog)({
                issueNumber: input.issueNumber,
                agentRole: role,
                output,
                tokensUsed,
            });
            console.log(`✅ ${role} complete (${tokensUsed} tokens)`);
        }
        catch (err) {
            console.error(`❌ ${role} failed:`, err);
            agentOutputs[role] = `[Error: ${err.message}]`;
        }
    }
    // 3. Synthesis pass (max 2 reasoning passes enforced by tracker)
    const synthesisResult = await runSynthesis(agentOutputs, input, tracker);
    // 4. Post plan to GitHub issue
    await (0, issues_1.postPlanToIssue)(input.issueNumber, synthesisResult.plan, synthesisResult.atomicTasks, synthesisResult.riskVerdict);
    console.log(`📊 Total tokens used: ${tracker.total}`);
    return { ...synthesisResult, totalTokens: tracker.total };
}
async function runSynthesis(agentOutputs, input, tracker, pass = 1) {
    const MAX_SYNTHESIS_PASSES = 2;
    if (pass > MAX_SYNTHESIS_PASSES) {
        console.warn('⚠️  Max synthesis passes reached. Using partial output.');
        return {
            plan: 'Synthesis aborted: max passes reached.',
            atomicTasks: '- [ ] Review meeting logs manually',
            riskVerdict: 'HIGH — synthesis incomplete',
        };
    }
    const allOutputs = AGENT_ORDER.map((role) => `### ${role}\n${agentOutputs[role] ?? '[missing]'}`).join('\n\n');
    const response = await openai.chat.completions.create({
        model: config_1.config.LLM_MODEL,
        max_tokens: 2000,
        messages: [
            { role: 'system', content: prompts_1.SYNTHESIS_SYSTEM_PROMPT },
            {
                role: 'user',
                content: `**Command:** ${input.type}: ${input.description}\n\n## Agent Meeting Outputs\n\n${allOutputs}`,
            },
        ],
    });
    const output = response.choices[0]?.message?.content ?? '';
    const tokensUsed = response.usage?.total_tokens ?? 0;
    tracker.add('Synthesis', tokensUsed);
    // Parse structured sections
    const planMatch = output.match(/## PLAN\n([\s\S]*?)(?=## ATOMIC TASKS|$)/);
    const tasksMatch = output.match(/## ATOMIC TASKS\n([\s\S]*?)(?=## RISK VERDICT|$)/);
    const riskMatch = output.match(/## RISK VERDICT\n([\s\S]*?)$/);
    const plan = planMatch?.[1]?.trim() ?? output;
    const atomicTasks = tasksMatch?.[1]?.trim() ?? '- [ ] Review meeting logs';
    const riskVerdict = riskMatch?.[1]?.trim() ?? 'UNKNOWN';
    // If synthesis looks incomplete, retry (pass 2)
    if (!planMatch || !tasksMatch || !riskMatch) {
        console.warn(`⚠️  Synthesis pass ${pass} incomplete, retrying...`);
        return runSynthesis(agentOutputs, input, tracker, pass + 1);
    }
    return { plan, atomicTasks, riskVerdict };
}
//# sourceMappingURL=meeting.js.map
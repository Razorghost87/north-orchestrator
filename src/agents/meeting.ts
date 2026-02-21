import OpenAI from 'openai';
import { config } from '../config';
import { TokenTracker } from '../cost/tracker';
import { postPlanToIssue } from '../github/issues';
import { saveMeetingLog } from '../memory/store';
import { semanticSearch } from '../memory/supabase';
import {
    AGENT_MAX_TOKENS,
    AGENT_SYSTEM_PROMPTS,
    AgentRole,
    SYNTHESIS_SYSTEM_PROMPT,
} from './prompts';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const AGENT_ORDER: AgentRole[] = [
    'Architect',
    'PM',
    'MobileEngineer',
    'BackendEngineer',
    'QA',
    'Security',
];

export interface MeetingInput {
    type: string;
    description: string;
    issueNumber: number;
}

export interface MeetingResult {
    plan: string;
    atomicTasks: string;
    riskVerdict: string;
    totalTokens: number;
}

export async function runMeeting(input: MeetingInput): Promise<MeetingResult> {
    const tracker = new TokenTracker();
    const agentOutputs: Record<string, string> = {};

    // 1. Retrieve relevant memory context
    const memories = await semanticSearch(input.description, 5);
    const memoryContext =
        memories.length > 0
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

        const priorContext =
            Object.entries(agentOutputs).length > 0
                ? `\n\n## Prior Agent Outputs\n${Object.entries(agentOutputs)
                    .map(([r, o]) => `### ${r}\n${o}`)
                    .join('\n\n')}`
                : '';

        try {
            const response = await openai.chat.completions.create({
                model: config.LLM_MODEL,
                max_tokens: AGENT_MAX_TOKENS[role],
                messages: [
                    { role: 'system', content: AGENT_SYSTEM_PROMPTS[role] },
                    { role: 'user', content: `${baseUserPrompt}${priorContext}` },
                ],
            });

            const output = response.choices[0]?.message?.content ?? '[No output]';
            const tokensUsed = response.usage?.total_tokens ?? 0;

            agentOutputs[role] = output;
            tracker.add(role, tokensUsed);

            // Save individual agent output to DB
            await saveMeetingLog({
                issueNumber: input.issueNumber,
                agentRole: role,
                output,
                tokensUsed,
            });

            console.log(`✅ ${role} complete (${tokensUsed} tokens)`);
        } catch (err) {
            console.error(`❌ ${role} failed:`, err);
            agentOutputs[role] = `[Error: ${(err as Error).message}]`;
        }
    }

    // 3. Synthesis pass (max 2 reasoning passes enforced by tracker)
    const synthesisResult = await runSynthesis(agentOutputs, input, tracker);

    // 4. Post plan to GitHub issue
    await postPlanToIssue(input.issueNumber, synthesisResult.plan, synthesisResult.atomicTasks, synthesisResult.riskVerdict);

    console.log(`📊 Total tokens used: ${tracker.total}`);
    return { ...synthesisResult, totalTokens: tracker.total };
}

async function runSynthesis(
    agentOutputs: Record<string, string>,
    input: MeetingInput,
    tracker: TokenTracker,
    pass = 1
): Promise<Omit<MeetingResult, 'totalTokens'>> {
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
        model: config.LLM_MODEL,
        max_tokens: 2000,
        messages: [
            { role: 'system', content: SYNTHESIS_SYSTEM_PROMPT },
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

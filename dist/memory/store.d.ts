export interface MeetingLogEntry {
    issueNumber: number;
    agentRole: string;
    output: string;
    tokensUsed: number;
}
export declare function saveMeetingLog(entry: MeetingLogEntry): Promise<void>;
export declare function saveMeetingSummary(issueNumber: number, plan: string, atomicTasks: string, riskVerdict: string): Promise<void>;
//# sourceMappingURL=store.d.ts.map
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
export declare function runMeeting(input: MeetingInput): Promise<MeetingResult>;
//# sourceMappingURL=meeting.d.ts.map
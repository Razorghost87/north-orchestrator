export declare function createIssue(type: string, description: string): Promise<{
    number: number;
    html_url: string;
}>;
export declare function postPlanToIssue(issueNumber: number, plan: string, atomicTasks: string, riskVerdict: string): Promise<void>;
export declare function getLastIssue(): Promise<{
    number: number;
    html_url: string;
    state: string;
} | null>;
//# sourceMappingURL=issues.d.ts.map
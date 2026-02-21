export interface AgentUsage {
    role: string;
    tokens: number;
}
export declare class TokenTracker {
    private usages;
    add(role: string, tokens: number): void;
    get total(): number;
    isOverBudget(): boolean;
    get breakdown(): AgentUsage[];
    summary(): string;
}
//# sourceMappingURL=tracker.d.ts.map
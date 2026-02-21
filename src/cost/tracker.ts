export interface AgentUsage {
    role: string;
    tokens: number;
}

const HARD_BUDGET = 25000; // Total tokens across entire meeting

export class TokenTracker {
    private usages: AgentUsage[] = [];

    add(role: string, tokens: number): void {
        this.usages.push({ role, tokens });
        console.log(`  📊 ${role}: ${tokens} tokens (running total: ${this.total})`);
    }

    get total(): number {
        return this.usages.reduce((sum, u) => sum + u.tokens, 0);
    }

    isOverBudget(): boolean {
        return this.total >= HARD_BUDGET;
    }

    get breakdown(): AgentUsage[] {
        return [...this.usages];
    }

    summary(): string {
        const lines = this.usages.map((u) => `  ${u.role}: ${u.tokens}`);
        return `Token usage breakdown:\n${lines.join('\n')}\n  TOTAL: ${this.total} / ${HARD_BUDGET}`;
    }
}

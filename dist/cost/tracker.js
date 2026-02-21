"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenTracker = void 0;
const HARD_BUDGET = 25000; // Total tokens across entire meeting
class TokenTracker {
    usages = [];
    add(role, tokens) {
        this.usages.push({ role, tokens });
        console.log(`  📊 ${role}: ${tokens} tokens (running total: ${this.total})`);
    }
    get total() {
        return this.usages.reduce((sum, u) => sum + u.tokens, 0);
    }
    isOverBudget() {
        return this.total >= HARD_BUDGET;
    }
    get breakdown() {
        return [...this.usages];
    }
    summary() {
        const lines = this.usages.map((u) => `  ${u.role}: ${u.tokens}`);
        return `Token usage breakdown:\n${lines.join('\n')}\n  TOTAL: ${this.total} / ${HARD_BUDGET}`;
    }
}
exports.TokenTracker = TokenTracker;
//# sourceMappingURL=tracker.js.map
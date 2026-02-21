import { randomUUID } from 'crypto';

export interface RunContext {
    traceId: string;
    source: 'github' | 'telegram' | 'system';
    timestamp: Date;
}

export function createRunContext(source: RunContext['source'], overrideTraceId?: string): RunContext {
    return {
        traceId: overrideTraceId || randomUUID(),
        source,
        timestamp: new Date(),
    };
}

export function withContext<T>(
    context: RunContext,
    operationName: string,
    fn: () => Promise<T>
): Promise<T> {
    console.log(`[${context.traceId}] [${context.source}] 🚀 Starting ${operationName}`);
    const start = Date.now();
    return fn().then(
        (result) => {
            console.log(`[${context.traceId}] ✅ Completed ${operationName} in ${Date.now() - start}ms`);
            return result;
        },
        (error) => {
            console.error(`[${context.traceId}] ❌ Failed ${operationName} in ${Date.now() - start}ms:`, error);
            throw error;
        }
    );
}

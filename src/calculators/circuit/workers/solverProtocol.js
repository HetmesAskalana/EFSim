import { solveCircuit } from "../solver/solver.js";

export function processSolverMessage(message) {
    const requestId = message?.requestId ?? null;
    if (!message || requestId === null || requestId === undefined) {
        return {
            requestId,
            error: "Worker 收到无效的电路修复请求"
        };
    }

    return {
        requestId,
        result: solveCircuit(message.input)
    };
}

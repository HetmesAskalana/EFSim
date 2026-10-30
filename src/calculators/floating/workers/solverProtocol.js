import { solve } from "../solver/solver.js";

export function processSolverMessage(message) {
    const requestId = message?.requestId ?? null;

    if (!message || message.type !== "solve" || typeof message.requestId !== "string") {
        return {
            type: "result",
            requestId,
            payload: {
                status: "error",
                message: "Worker 收到无效请求",
                assignments: []
            }
        };
    }

    return {
        type: "result",
        requestId: message.requestId,
        payload: solve(message.payload)
    };
}

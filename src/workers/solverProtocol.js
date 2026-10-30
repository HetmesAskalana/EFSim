import {
    processSolverMessage as processCircuitSolverMessage
} from "../calculators/circuit/workers/solverProtocol.js";
import {
    processSolverMessage as processFloatingSolverMessage
} from "../calculators/floating/workers/solverProtocol.js";

function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

function floatingError(message, error) {
    return {
        solver: "floating",
        type: "result",
        requestId: message?.requestId ?? null,
        payload: {
            status: "error",
            message: errorMessage(error),
            assignments: []
        }
    };
}

export function processSolverMessage(message) {
    if (message?.solver === "circuit") {
        try {
            return {
                solver: "circuit",
                ...processCircuitSolverMessage(message)
            };
        } catch (error) {
            return {
                solver: "circuit",
                requestId: message?.requestId ?? null,
                error: errorMessage(error)
            };
        }
    }

    if (message?.solver === "floating") {
        try {
            return {
                solver: "floating",
                ...processFloatingSolverMessage(message)
            };
        } catch (error) {
            return floatingError(message, error);
        }
    }

    return {
        solver: null,
        type: "error",
        requestId: message?.requestId ?? null,
        error: "Worker 收到未知求解器请求"
    };
}

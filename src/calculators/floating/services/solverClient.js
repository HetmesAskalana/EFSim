export class SolverCancelledError extends Error {
    constructor(message = "求解请求已取消") {
        super(message);
        this.name = "SolverCancelledError";
    }
}

export class SolverWorkerError extends Error {
    constructor(message = "求解 Worker 发生异常") {
        super(message);
        this.name = "SolverWorkerError";
    }
}

function defaultWorkerFactory() {
    return new Worker(new URL("../../../workers/solver.worker.js", import.meta.url), {
        type: "module"
    });
}

export class SolverClient {
    constructor(workerFactory = defaultWorkerFactory) {
        this.workerFactory = workerFactory;
        this.worker = null;
        this.nextRequestNumber = 1;
        this.pending = new Map();
        this.handleMessage = this.handleMessage.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    ensureWorker() {
        if (this.worker) {
            return this.worker;
        }
        this.worker = this.workerFactory();
        this.worker.addEventListener("message", this.handleMessage);
        this.worker.addEventListener("error", this.handleError);
        this.worker.addEventListener("messageerror", this.handleError);
        return this.worker;
    }

    solve(payload) {
        const worker = this.ensureWorker();
        const requestId = `solve-${this.nextRequestNumber}`;
        this.nextRequestNumber += 1;

        return new Promise((resolve, reject) => {
            this.pending.set(requestId, { resolve, reject });
            try {
                worker.postMessage({ solver: "floating", type: "solve", requestId, payload });
            } catch (error) {
                this.pending.delete(requestId);
                reject(error);
            }
        });
    }

    handleMessage(event) {
        const message = event.data;
        if (!message || message.solver !== "floating" || message.type !== "result"
            || typeof message.requestId !== "string") {
            return;
        }

        const pendingRequest = this.pending.get(message.requestId);
        if (!pendingRequest) {
            return;
        }
        this.pending.delete(message.requestId);
        pendingRequest.resolve(message.payload);
    }

    handleError(event) {
        const message = event?.message || "求解 Worker 发生异常";
        const error = new SolverWorkerError(message);
        for (const { reject } of this.pending.values()) {
            reject(error);
        }
        this.pending.clear();
        this.destroyWorker();
    }

    cancelAll() {
        const error = new SolverCancelledError();
        for (const { reject } of this.pending.values()) {
            reject(error);
        }
        this.pending.clear();
        this.destroyWorker();
    }

    destroyWorker() {
        if (!this.worker) {
            return;
        }
        this.worker.removeEventListener("message", this.handleMessage);
        this.worker.removeEventListener("error", this.handleError);
        this.worker.removeEventListener("messageerror", this.handleError);
        this.worker.terminate();
        this.worker = null;
    }

    dispose() {
        this.cancelAll();
    }
}

export function createSolverClient() {
    return new SolverClient();
}

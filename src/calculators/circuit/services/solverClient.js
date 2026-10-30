export class SolverClient {
    constructor(workerFactory = () => new Worker(
        new URL("../../../workers/solver.worker.js", import.meta.url),
        { type: "module" }
    )) {
        this.workerFactory = workerFactory;
        this.worker = null;
        this.requestId = 0;
        this.pending = new Map();
    }

    solve(input) {
        if (!this.worker) {
            this.worker = this.workerFactory();
            this.worker.addEventListener("message", (event) => this.handleMessage(event));
            this.worker.addEventListener("error", (event) => this.handleWorkerError(event));
            this.worker.addEventListener("messageerror", (event) => this.handleWorkerError(event));
        }

        const requestId = ++this.requestId;
        return new Promise((resolve, reject) => {
            this.pending.set(requestId, { resolve, reject });
            try {
                this.worker.postMessage({ solver: "circuit", requestId, input });
            } catch (error) {
                this.pending.delete(requestId);
                reject(error);
            }
        });
    }

    handleMessage(event) {
        if (event.data?.solver !== "circuit") return;
        const pending = this.pending.get(event.data.requestId);
        if (!pending) return;
        this.pending.delete(event.data.requestId);
        if (event.data.error) pending.reject(new Error(event.data.error));
        else pending.resolve(event.data.result);
    }

    handleWorkerError(event) {
        const error = new Error(event.message || "求解线程异常退出");
        for (const pending of this.pending.values()) pending.reject(error);
        this.pending.clear();
        this.disposeWorker();
    }

    disposeWorker() {
        this.worker?.terminate();
        this.worker = null;
    }

    dispose() {
        const error = new Error("求解任务已取消");
        for (const pending of this.pending.values()) pending.reject(error);
        this.pending.clear();
        this.disposeWorker();
    }
}

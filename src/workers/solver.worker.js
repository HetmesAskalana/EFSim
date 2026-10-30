import { processSolverMessage } from "./solverProtocol.js";

self.addEventListener("message", (event) => {
    self.postMessage(processSolverMessage(event.data));
});

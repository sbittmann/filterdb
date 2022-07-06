import { Worker } from "worker_threads";
import { EventEmitter } from "events";
import { cpus } from "os";
import { Readable } from "stream";
import { join } from "path";

const CPU_COUNT = cpus().length;
const ROOT = new URL("../", import.meta.url).pathname.substring(1);

export default class ThreadPool extends EventEmitter {
    #started = false;
    #options;
    #workers = [];
    #freeWorkers = [];

    constructor(options) {
        super();
        this.#options = options;
    }

    async start() {
        if (!this.#started) {
            for (let i = 0; i < CPU_COUNT; i++) {
                this.#addNewWorker();
            }
            this.#started = true;
        }
    }
    #addNewWorker() {
        const worker = new Worker(join(ROOT, "./lib/Thread.js"), {
            synchronizedStdio: false,
            workerData: this.#options,
        });
        worker.on("message", (result) => {
            if (result.type == "end") {
                this.emit("freeWorker");
                this.#freeWorkers.push(worker);
            }
        });
        worker.on("error", (err) => {
            console.log(err);
            this.#workers.splice(this.#workers.indexOf(worker), 1);
            this.#addNewWorker();
        });
        this.#workers.push(worker);
        this.#freeWorkers.push(worker);
    }
    #queue(cb) {
        if (this.#freeWorkers.length === 0) {
            this.once("freeWorker", () => this.#queue(cb));
            return;
        }
        const worker = this.#freeWorkers.pop();
        cb(worker);
    }
    executeQuery(options) {
        let stream = new Readable({
            objectMode: true,
            read() {},
        });

        this.#queue((worker) => {
            stream.on("close", () => {
                worker.postMessage({ cmd: "close" });
            });
            worker.postMessage({
                task: "executeQuery",
                options: options,
            });
            function event(val) {
                if (val.type === "data") {
                    stream.query = val.data.query;
                    stream.push(val.data.data);
                    return;
                }
                if (val.type === "end") {
                    stream.push(null);
                    worker.off("message", event);
                }
                if (val.type == "error") {
                    stream.destroy(new Error(val.data.error.message));
                    return;
                }
            }
            worker.on("message", event);
        });

        return stream;
    }
    async createIndex(options) {
        return await new Promise((res, rej) => {
            this.#queue((worker) => {
                worker.postMessage({
                    task: "createIndex",
                    options: options,
                });
                function event(val) {
                    if (val.type === "end") {
                        worker.off("message", event);
                        res(true);
                    }
                }
                worker.on("message", event);
            });
        });
    }
    async removeIndex(options) {
        return await new Promise((res, rej) => {
            this.#queue((worker) => {
                worker.postMessage({
                    task: "removeIndex",
                    options: options,
                });
                function event(val) {
                    if (val.type === "end") {
                        worker.off("message", event);
                        res(true);
                    }
                }
                worker.on("message", event);
            });
        });
    }
    async stop() {
        this.#started = false;
        let all = [];
        for (const worker of this.#workers) {
            all.push(worker.terminate());
        }
        await Promise.all(all);
        this.#workers = [];
        this.#freeWorkers = [];
    }
}

import { spawn, Pool, Worker } from "threads"
import { Readable } from "stream"
import * as utils from "./utils.js"


export default class ThreadPool {
    #pool
    #started = false;
    async start() {
        if(!this.#started) {
            this.#pool = Pool(() => spawn(new Worker("./Thread.js")))
            this.#started = true;
        }
    }
    executeQuery(query, context, meta, path, dbname) {
        let stream = new Readable({
            objectMode: true,
            read() {}
        });
        
        this.#pool.queue((worker) => {
            let s = worker.query(query.toString(), context, meta, path, dbname);

            let subscribtion = s.subscribe(val => {
                stream.push(val.data);
                stream.query = val.query;
            })
            s.then(() => {
                stream.push(null);
            })
            stream.on("close", () => { 
                subscribtion.unsubscribe();
            });
        }, {
            //concurrency: 100,
        })
        return stream;
    }
    async stop() {
        this.#started = false;
        await this.#pool.terminate();
    }
}
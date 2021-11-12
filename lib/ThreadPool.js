import { spawn, Pool, Worker } from "threads"
import { Readable } from "stream"


export default class ThreadPool {
    #pool
    #started = false;
    async start() {
        if(!this.#started) {
            this.#pool = Pool(() => spawn(new Worker("./Thread.js")), {
                concurrency: 20,
            })
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
        })
        return stream;
    }
    async createIndex(name, meta, path, dbname) {
        let res = await this.#pool.queue((worker) => {
            return worker.createIndex(name, meta, path, dbname)
        });
        return res;
    }
    async removeIndex(name, meta, path, dbname) {
        let res = await this.#pool.queue((worker) => {
            return worker.removeIndex(name, meta, path, dbname)
        });
        return res;
    }
    
    async stop() {
        this.#started = false;
        await this.#pool.terminate();
    }
}
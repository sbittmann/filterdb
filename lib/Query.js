import { Readable } from "stream"
import { actionTypes } from "./utils.js"

export default class Query extends Readable {
    #stream;
    #reduced = false;
    #readStarted = false
    #threadPool;
    #options = {}

    constructor(threadPool, options) {
        super({objectMode: true});
        this.#options = options;
        this.#threadPool = threadPool;
        this.#options.query = this.#options.query.toString();
        this.#options.actions = [];
        this.on("close", () => {
            this.#stream.destroy();
        });
    }
    _read() {
        if(this.#readStarted) {
            return;
        }
        this.#readStarted = true;
        this.#stream = this.#threadPool.executeQuery(this.#options)

        
        this.#stream.on("data", (data) => {
            this.push(data);
        })
        this.#stream.on("error", (err) => {
            this.destroy(err);
        })
        this.#stream.on("end", () => {
            this.push(null)
        })
    }
    filter(query, context) {
        this.#options.actions.push({type: actionTypes.FILTER, data: {query: query.toString(), context}})
        return this;
    }
    sort(query, context) {
        this.#options.actions.push({type: actionTypes.SORT, data: {query: query.toString(), context}})
        return this;
    }
    map(query, context) {
        this.#options.actions.push({type: actionTypes.MAP, data: {query: query.toString(), context}})
        return this;
    }
    reduce(query, initVal, context) {
        this.#options.actions.push({type: actionTypes.REDUCE, data: {query: query.toString(), context, initVal}})
        this.#reduced = true;
        return this;
    }

    getQuery() {
        return this.#stream.query;
    }

    async then(result, error) {
        let recordSet = [];

        recordSet.getQuery = () => {
            return this.#stream.query;
        }


        try {
            for await (let row of this) {
                recordSet.push(row);
            }
        } catch (e) {
            error(e)
            return;
        }
        
        if(this.#reduced) {
            result(recordSet[0])       
        }
        

        result(recordSet);
    }
}
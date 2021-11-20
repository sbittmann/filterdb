import { Transform } from "stream"
import VirtualMaschine from "../VirtualMaschine.js";

export default class Reduce extends Transform {
    #vm
    #val;

    constructor(query, context, initVal, virtualDB) {
        super({readableObjectMode: true, writableObjectMode: true});
        this.#vm = new VirtualMaschine(query, context, virtualDB);

        this.#val = initVal;
    }

    _transform(data, _, cb) {
        try {
            this.#val = this.#vm.run(this.#val, data)
            cb();
        } catch(e) {
            this.destroy(e)
        }
        
    }

    _flush(cb) {
        this.push(this.#val);
        this.push(null)
        cb()
    }
}
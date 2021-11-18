import { Transform } from "stream"
import VirtualMaschine from "../VirtualMaschine.js";

export default class Reduce extends Transform {
    #vm
    #val;

    constructor(query, context, initVal) {
        super({readableObjectMode: true, writableObjectMode: true});
        this.#vm = new VirtualMaschine(query, context);

        this.#val = initVal;
    }

    _transform(data, _, cb) {
        this.#val = this.#vm.run(this.#val, data)
        cb();
    }

    _flush(cb) {
        this.push(this.#val);
        this.push(null)
        cb()
    }
}
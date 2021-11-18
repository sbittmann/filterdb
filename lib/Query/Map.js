import { Transform } from "stream"
import VirtualMaschine from "../VirtualMaschine.js";

export default class Map extends Transform {
    #vm;

    #index = 0;
    constructor(query, context) {
        super({readableObjectMode: true, writableObjectMode: true});
        this.#vm = new VirtualMaschine(query, context)
    }

    _transform(data, _, cb) {
        this.push(this.#vm.run(data, this.#index))
        this.#index++;
        cb();
    }

    _flush(cb) {
        this.push(null);
        cb();
    } 
}
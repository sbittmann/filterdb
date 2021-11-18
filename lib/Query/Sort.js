import { Transform } from "stream"
import VirtualMaschine from "../VirtualMaschine.js";

export default class Sort extends Transform {
    #vm;

    #array = [];
    
    constructor(query, context) {
        super({readableObjectMode: true, writableObjectMode: true});
        this.#vm = new VirtualMaschine(query, context);
    }

    _transform(data, _, cb) {
        this.#array.push(data);
        cb();
    }

    _flush(cb) {
        let sortedArray = this.#array.sort((a, b) => this.#vm.run(a, b));
        let length = sortedArray.length;
        for (let i = 0; i < length; i++) {
            this.push(sortedArray[i]);
        }
        this.push(null);
        cb();
    }
}
import { Transform } from "stream"
import VirtualMaschine from "../VirtualMaschine.js";

export default class Filter extends Transform {
    #vm;

    constructor(query, context) {
        super({readableObjectMode: true, writableObjectMode: true});
        this.#vm = new VirtualMaschine(query, context)
    }

    _transform(data, _, cb) {
        let result = this.#vm.run(data);
        if(result) {
            this.push(data)
        }
        
        cb();
    }
}
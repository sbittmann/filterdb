import { Transform } from "stream"
import VirtualMaschine from "../VirtualMaschine.js";

export default class Map extends Transform {
    #vm;

    #index = 0;
    constructor(query, context, virtualDB) {
        super({readableObjectMode: true, writableObjectMode: true});
        this.#vm = new VirtualMaschine(query, context, virtualDB)
    }

    _transform(data, _, cb) {
        try {
            this.push(this.#vm.run(data, this.#index))
            this.#index++;
            cb();
        }
        catch(e) {
            this.destroy(e)
        }
    }

    _flush(cb) {
        this.push(null);
        cb();
    } 
}
import { Transform } from "stream"
import VirtualMaschine from "../VirtualMaschine.js";

export default class Filter extends Transform {
    #vm;

    constructor(query, context, virtualDB) {
        super({readableObjectMode: true, writableObjectMode: true});
        this.#vm = new VirtualMaschine(query, context, virtualDB)
    }

    _transform(data, _, cb) {
        try{
            let result = this.#vm.run(data);
            if(result) {
                this.push(data)
            }
        }
        catch(e) {
            this.destroy(e)
        }
        
        cb();
    }
}
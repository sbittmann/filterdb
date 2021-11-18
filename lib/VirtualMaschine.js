import { NodeVM, VMScript } from "vm2";

let scripts = {};

export default class VirtualMaschine {
    #code
    #context 
    #vm
    constructor(code, context = {}) {
        this.#code = code;
        this.#context = context;

        if (!scripts[this.#code]) {
            scripts[this.#code]= new VMScript("module.exports = (" + this.#code + ")"),
            scripts[this.#code].compile();
        }
        this.#vm = new NodeVM({
            sandbox: this.#context,
            eval: false,
        }).run(scripts[this.#code]);
    }

    run(...args) {
        return this.#vm(...args);
    }
}
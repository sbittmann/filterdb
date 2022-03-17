import { NodeVM, VMScript } from "vm2";

let scripts = {};

export default class VirtualMaschine {
    #code;
    #context;
    #vm;
    constructor(code, context = {}, virtualDB, token) {
        this.#code = code;
        this.#context = context;

        if (!scripts[this.#code]) {
            (scripts[this.#code] = new VMScript(`module.exports = (${this.#code})`)), scripts[this.#code].compile();
        }
        let vm = new NodeVM({
            sandbox: this.#context,
            allowAsync: false,
            eval: false,
        });
        vm.freeze(virtualDB, "db");
        this.#vm = vm.run(scripts[this.#code]);
    }

    run(...args) {
        return this.#vm(...args);
    }
}

import CodeInterpreter from "./lib/CodeInterpreter.js";
import Storage from "./lib/Storage.js";
import path from "path";

let f = (l) => {
    return l.throwTest === "asdf";
};

let p = path.resolve(path.join("storage", "test"));

let s = new Storage(p);
let c = new CodeInterpreter(
    f.toString(),
    {
        name: "Max Mustermann",
    },
    null,
    {},
    {},
);

console.dir(c.parse(), { depth: null });

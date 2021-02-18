import * as acorn from "acorn";
import * as interpreter from "./CodeInterpreter.js"

export default class CodeParser {
    constructor(code) {
        this.code = "let func = " + code.toString()
    }
    parse() {
        let parsed = acorn.parse(this.code, {ecmaVersion: 2020, sourceType: "script"});

        let name = parsed.body[0].declarations[0].init.params[0].name;
        let expression = parsed.body[0].declarations[0].init;

        if(['ArrowFunctionExpression', 'FunctionExpression'].includes(expression.type)) {
            return iterateNodes(expression.body.body, name);
        }
        throw new Error('Not a function')
    }
}

function iterateNodes(nodes, rowName) {
    let result = [];
    for(let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        result.push(interpreter.interpreteNode(node, rowName));
    }
}
import * as acorn from "acorn";

export default class CodeParser {
    constructor(code) {
        this.code = code
    }
    parse() {
        let parsed = acorn.parse(this.code, {ecmaVersion: 2020, sourceType: "script"});
        let expression = parsed.body[0].declarations[0].init;
        if(['ArrowFunctionExpression', 'FunctionExpression'].includes(expression.type)) {
            let result = iterateNodes(expression.body.body)
            return result;
        }
    }
}

function iterateNodes(nodes) {
    for(let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        interpreteNode(node);
        //console.log(iterateNodes(nodes))
    }
    return 'AAA ';
}

function interpreteNode(node) {
    let result = {};

    switch (node.type) {        
        case 'ReturnStatement':
            result. node.
            break;
    }
        
}
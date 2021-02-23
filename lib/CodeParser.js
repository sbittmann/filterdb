import * as acorn from "acorn";
import { NodeVM, VMScript } from "vm2"
import Perf from "./PerformanceCounter.js"
import through from "through2"

let scripts = {

}

export default class CodeParser {
    #code
    #parsed
    #validator
    constructor(code, context) {
        this.#code = code.toString();
        
        if(!scripts[this.#code]) {
            let pf = new Perf("CodeParser", "constructor.compileScript")    
            scripts[this.#code] = new VMScript("module.exports = (" + this.#code + ")");
            scripts[this.#code].compile();
            pf.finish();
        }
        let pf = new Perf("CodeParser", "constructor.createValidator")
        this.#validator = (new NodeVM({
            sandbox: context
        }).run(scripts[this.#code]));
        pf.finish();
    }
    parse() {
        this.#parsed = acorn.parse("let func = " + this.#code, {ecmaVersion: 2020, sourceType: "script"});
        let name = this.#parsed.body[0].declarations[0].init.params[0].name;
        let expression = this.#parsed.body[0].declarations[0].init;
        let queryFields = [];
        if(['ArrowFunctionExpression', 'FunctionExpression'].includes(expression.type)) {
            return iterateNodes(expression.body.body, name, queryFields);
        }
        
        throw new Error('Not a function')
    }

    interprete(db, indexDb) {
        let validate = this.#validator

         
        let dbStream = db.createReadStream({
            keys: false
        })

        let userStream = dbStream.pipe(through.obj(async function (row, enc, cb) {
            let pf = new Perf("CodeParser", "interprete.VMRunTime")
            let result = await validate(row);
            pf.finish();
            if(result === true) {
                this.push(row);
            }
            cb();
        }))
        
        userStream.on("close", () => {
            dbStream.destroy();
        });     
        
        return userStream
    }
}

function iterateNodes(nodes, rowName, queryFields) {
    let result = [];
    for(let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        result.push(interpreteNode(node, rowName, queryFields));
    }
    return result;
}

function interpreteNode(node, rowName, queryFields) {
    switch (node.type) {        
        case 'ReturnStatement':
            return ReturnStatement(node, rowName, queryFields);
        case 'BinaryExpression':
            return BinaryExpression(node, rowName, queryFields);
        case 'MemberExpression':
            return MemberExpression(node, rowName, queryFields);
        case 'Identifier':
            return Identifier(node, rowName, queryFields);
        case 'Literal': 
            return Literal(node, rowName, queryFields);
        case 'LogicalExpression': 
            return LogicalExpression(node, rowName, queryFields);
        default:
            console.log(node);
            throw new Error("Unknown node type " + node.type);
    }
}

function ReturnStatement(node, rowName, queryFields) {
    let argument = interpreteNode(node.argument, rowName, queryFields);
    return { "$return": argument }
}

function BinaryExpression(node, rowName, queryFields) {
    let left = interpreteNode(node.left, rowName, queryFields)
    let right = interpreteNode(node.right, rowName, queryFields)
    if(["==", "==="].includes(node.operator)) {
        let result = {};
        result[left] = right;

        return result
    }
    if(["!==", "!="].includes(node.operator)) {
        return
    }
}

function MemberExpression(node, rowName, queryFields) {
    let obj = interpreteNode(node.object, rowName, queryFields)
    let prop = interpreteNode(node.property, rowName, queryFields)

    if(obj === rowName) {
        queryFields.push(prop);
        return prop;
    }

    return `${obj}.${prop}`;
}

function Identifier(node, rowName, queryFields) {
    return node.name;
}

function Literal(node, rowName) {
    return node.value;
}

function LogicalExpression(node, rowName, queryFields) {
    let left = interpreteNode(node.left, rowName, queryFields);
    let right = interpreteNode(node.right, rowName, queryFields);
    if(node.operator === "&&") {
        return {
            "$and": [left, right]
        }
    }
    if(node.operator === "||") {
        return {
            "$or": [left, right]
        }
    }
    throw new Error("unknown operator: " + node.operator)
}
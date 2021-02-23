import * as acorn from "acorn";
import { NodeVM, VMScript } from "vm2";
import Perf from "./PerformanceCounter.js";
import through from "through2";

let scripts = {};

export default class CodeInterpreter {
    #code;
    #parsed;
    #validator;
    #context;
    constructor(code, context) {
        this.#code = code.toString();
        this.#context = context;
        if (!scripts[this.#code]) {
            let pf = new Perf("CodeInterpreter", "constructor.compileScript");
            scripts[this.#code] = {
                vm: new VMScript("module.exports = (" + this.#code + ")"),
            };
            scripts[this.#code].vm.compile();
            pf.finish();
        }
        let pf = new Perf("CodeInterpreter", "constructor.createValidator");
        this.#validator = new NodeVM({
            sandbox: this.#context,
        }).run(scripts[this.#code].vm);
        pf.finish();
    }
    parse() {
        this.#parsed = acorn.parse("let func = " + this.#code, {
            ecmaVersion: 2020,
            sourceType: "script",
        });
        console.dir(this.#parsed, { depth: null });
        let name = this.#parsed.body[0].declarations[0].init.params[0].name;
        let expression = this.#parsed.body[0].declarations[0].init;
        let queryFields = [];
        if (
            ["ArrowFunctionExpression", "FunctionExpression"].includes(
                expression.type,
            )
        ) {
            let r = iterateNodes(
                expression.body.body,
                name,
                queryFields,
                this.#context,
            );
            console.log(queryFields);
            return r;
        }

        throw new Error("Not a function");
    }

    interprete(db, indexDb) {
        //console.dir(this.parse(), { depth: null });

        let validate = this.#validator;

        let dbStream = db.createReadStream({
            keys: false,
        });
        let fin;
        let userStream = dbStream.pipe(
            through.obj(async function (row, enc, cb) {
                let pf = new Perf("CodeInterpreter", "interprete.VMRunTime");
                let result = await validate(row);
                pf.finish();
                if (result === true) {
                    this.push(row);
                }
                cb();
            }),
        );

        userStream.on("close", () => {
            console.log("close");
            dbStream.destroy();
        });

        return userStream;
    }
}

function iterateNodes(nodes, rowName, queryFields, context, options = {}) {
    let result = [];
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        result.push(
            interpreteNode(node, rowName, queryFields, context, options),
        );
    }
    return result;
}

function interpreteNode(node, rowName, queryFields, context, options = {}) {
    switch (node.type) {
        case "ReturnStatement":
            return ReturnStatement(
                node,
                rowName,
                queryFields,
                context,
                options,
            );
        case "BinaryExpression":
            return BinaryExpression(
                node,
                rowName,
                queryFields,
                context,
                options,
            );
        case "MemberExpression":
            return MemberExpression(
                node,
                rowName,
                queryFields,
                context,
                options,
            );
        case "Identifier":
            return Identifier(node, rowName, queryFields, context, options);
        case "Literal":
            return Literal(node, rowName, queryFields, context, options);
        case "LogicalExpression":
            return LogicalExpression(
                node,
                rowName,
                queryFields,
                context,
                options,
            );
        default:
            console.log(node);
            throw new Error("Unknown node type " + node.type);
    }
}

function ReturnStatement(node, rowName, queryFields, context) {
    let argument = interpreteNode(node.argument, rowName, queryFields, context);
    return { $return: argument };
}

function BinaryExpression(node, rowName, queryFields, context) {
    let left = interpreteNode(node.left, rowName, queryFields, context);
    let right = interpreteNode(node.right, rowName, queryFields, context);
    if (["==", "==="].includes(node.operator)) {
        let result = {};
        result[left] = right;

        return result;
    }
    if (["!==", "!="].includes(node.operator)) {
        return;
    }
    throw new Error("Unkown operator:" + node.operator);
}

function MemberExpression(
    node,
    rowName,
    queryFields,
    context,
    { replace = true } = {},
) {
    let obj = interpreteNode(node.object, rowName, queryFields, context, {
        replace: false,
    });
    let prop = interpreteNode(node.property, rowName, queryFields, context, {
        replace: false,
    });

    console.log(replace, obj, prop, rowName);

    if (replace) {
        if (obj.startsWith(rowName)) {
            return `${obj}.${prop}`.substring(rowName.length + 1);
            return prop;
        }
        return getProp(context, `${obj}.${prop}`);
    }

    return `${obj}.${prop}`;
}

function Identifier(
    node,
    rowName,
    queryFields,
    context,
    { replace = true } = {},
) {
    if (replace) {
        return context[node.name];
    }
    return node.name;
}

function Literal(node, rowName, queryFields, context) {
    console.log(node);
    return node.value;
}

function LogicalExpression(node, rowName, queryFields, context) {
    let left = interpreteNode(node.left, rowName, queryFields, context);
    let right = interpreteNode(node.right, rowName, queryFields, context);

    if (node.operator === "&&") {
        return {
            $and: [left, right],
        };
    }
    if (node.operator === "||") {
        return {
            $or: [left, right],
        };
    }
    throw new Error("unknown operator: " + node.operator);
}

function getProp(obj, prop) {
    let path = prop.split(".");
    while (path.length > 0) {
        let actProp = path.shift();
        if (obj[actProp] !== undefined) {
            obj = obj[actProp];
        } else {
            return;
        }
    }
    return obj;
}

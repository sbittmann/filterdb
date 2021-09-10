import * as acorn from "acorn";
import { NodeVM, VMScript } from "vm2";
import { Readable } from "stream"

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
            scripts[this.#code] = {
                vm: new VMScript("module.exports = (" + this.#code + ")"),
            };
            scripts[this.#code].vm.compile();
        }
        this.#validator = new NodeVM({
            sandbox: this.#context,
        }).run(scripts[this.#code].vm);
    }
    parse() {
        this.#parsed = acorn.parse("let func = " + this.#code, {
            ecmaVersion: 2020,
            sourceType: "script",
        });
        let name = this.#parsed.body[0].declarations[0].init.params[0].name;
        let expression = this.#parsed.body[0].declarations[0].init;
        if (
            ["ArrowFunctionExpression", "FunctionExpression"].includes(
                expression.type,
            )
        ) {
            let r = iterateNodes(expression.body.body, name, this.#context);
            return r;
        }

        throw new Error("Not a function");
    }

    interprete(db, meta) {
        let range;
        try {
            range = this.interpreteIndex(db, meta);
        } catch {
            range = db.getRange({  
                start: [`table.${meta.name}.data`, 0]
                ,end: [`table.${meta.name}.data`, 'zzzzzzzzzzzzzzzzzzzzz', 0] 
            }).filter(({ value }) => { return this.#validator(value) === true })
        }

    
        return Readable.from(range)
    }

    interpreteIndex(db, meta) {
        let code = this.parse();
        if (code[0].$return) {
            let values = Object.entries(code[0].$return);
            let key = values[0][0];
            let value = values[0][1];

            if (!key.startsWith("$")) {
                if (meta.indexes[key] && meta.indexes[key].build) {
                    return db
                        .createIndexStream(key, {
                            gte: value,
                            lte: value,
                            keys: true,
                            values: false,
                        })
                        .pipe(
                            through.obj(async function (row, enc, cb) {
                                let key = row.pop();
                                let value = await db.get(key);
                                this.push(value);
                                cb();
                            }),
                        );
                }
            }
        }
        throw new Error("not possible to interprete");
    }
}

function iterateNodes(nodes, rowName, context, options = {}) {
    let result = [];
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        result.push(interpreteNode(node, rowName, context, options));
    }
    return result;
}

function interpreteNode(node, rowName, context, options = {}) {
    switch (node.type) {
        case "ReturnStatement":
            return ReturnStatement(node, rowName, context, options);
        case "BinaryExpression":
            return BinaryExpression(node, rowName, context, options);
        case "MemberExpression":
            return MemberExpression(node, rowName, context, options);
        case "Identifier":
            return Identifier(node, rowName, context, options);
        case "Literal":
            return Literal(node, rowName, context, options);
        case "LogicalExpression":
            return LogicalExpression(node, rowName, context, options);
        default:
            console.log("Unknown node type " + node.type, node);
            throw new Error("Unknown node type " + node.type);
    }
}

function ReturnStatement(node, rowName, context) {
    let argument = interpreteNode(node.argument, rowName, context);
    return { $return: argument };
}

function BinaryExpression(node, rowName, context) {
    let left = interpreteNode(node.left, rowName, context);
    let right = interpreteNode(node.right, rowName, context);
    if (["==", "==="].includes(node.operator)) {
        let result = {};
        result[left] = right;

        return result;
    }
    if (["!==", "!="].includes(node.operator)) {
        let result = {};
        result[left] = { $not: right };
        return result;
    }
    throw new Error("Unkown operator:" + node.operator);
}

function MemberExpression(node, rowName, context, { replace = true } = {}) {
    let obj = interpreteNode(node.object, rowName, context, {
        replace: false,
    });
    let prop = interpreteNode(node.property, rowName, context, {
        replace: false,
    });

    //console.log(replace, obj, prop, rowName);

    if (replace) {
        if (obj.startsWith(rowName)) {
            return `${obj}.${prop}`.substring(rowName.length + 1);
        }
        return getProp(context, `${obj}.${prop}`);
    }

    return `${obj}.${prop}`;
}

function Identifier(node, rowName, context, { replace = true } = {}) {
    if (replace) {
        return context[node.name];
    }
    return node.name;
}

function Literal(node, rowName, context) {
    //console.log(node);
    return node.value;
}

function LogicalExpression(node, rowName, context) {
    let left = interpreteNode(node.left, rowName, context);
    let right = interpreteNode(node.right, rowName, context);

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

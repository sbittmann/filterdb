import * as acorn from "acorn";
import VirtualMaschine from "./VirtualMaschine.js";
import { Readable, Transform } from "stream"
import { tableKey, dbValues } from "./utils.js"

let scripts = {};

export default class CodeInterpreter {
    #code;
    #parsed;
    #validator;
    #context;
    #db;
    #meta;
    #indexKey;

    constructor(code, context, db, meta, indexKey) {
        this.#code = code.toString();
        this.#context = context;
        this.#db = db;
        this.#meta = meta;
        this.#indexKey = indexKey;
        
        this.#validator = new VirtualMaschine(code, context);
    }
    parse() {
        this.#parsed = acorn.parse("let func = " + this.#code, {
            ecmaVersion: 2020,
            sourceType: "script",
        });
        return interpreteStart(this.#parsed, this.#context)
    }

    interprete() {
        let stream;
        try {
            stream = this.interpreteIndex();
        } catch {
            let query = {
                interpreterRows: 0,
                interpreterNeeded: true,
                indexes: {}
            }
            let db = this.#db;
            let dbKey = (id) => tableKey(this.#meta.name, id);
            let validator = this.#validator;

            let recordset = {
                *[Symbol.iterator]() {
                    let range = db.getRange({  
                        start: dbKey(dbValues.LO)
                        ,end: dbKey(dbValues.HI)
                    })
                    for(let row of range) {
                        yield row.value
                    }
                }
            }

            stream = Readable.from(recordset).pipe(new Transform({
                readableObjectMode: true,
                writableObjectMode: true,
                autoDestroy: true,
                transform(row, encoding, cb) {
                    query.interpreterRows++;
                    if(validator.run(row) === true) {
                        this.push(row);
                    }
                    cb();
                }
            }))
            stream.query = query;
        }

    
        return stream
    }

    interpreteIndex() {

        let db = this.#db;
        let dbKey = (id) => tableKey(this.#meta.name, id);;
        let validator = this.#validator
        let code = this.parse();


        let key;
        let value;

        
        
        if(Array.isArray(code)) {
            if (code[0].$return) {
                let values = Object.keys(code[0].$return);
                key = values[0];
                value = code[0].$return[key];
            } else {
                throw new Error("Codeblocks not valid")
            }
        } else {
            key = Object.keys(code)[0];
            value = code[key];
        }

        let result = this.queryCode(key, value);
        result.query.interpreterRows = 0;
        let ret = Readable.from(result.recordset).pipe(
            new Transform({
                readableObjectMode: true,
                writableObjectMode: true,
                autoDestroy: true,
                transform(id, encoding, cb) {
                    let val = db.get(dbKey(id));
                    
                    if(result.query.interpreterNeeded) {
                        result.query.interpreterRows++;
                        if(validator.run(val) === true) {
                            this.push(val);
                        }
                        cb();
                        return;
                    }
                    if(result.recordset.count) {
                        result.query.indexes[key] = result.recordset.count;
                    }
                    this.push(val);
                    cb();
                }
            })
        );
        ret.query = result.query;
        return ret;
    }

    queryCode(key, value) {
        if (!key.startsWith("$")) {
            let indexes = {}
            indexes[key] = -1;
            
            let recordset = this.queryIndex(key, value)
            return {
                recordset,
                query: {
                    indexes,
                    interpreterNeeded: false,
                }
            }
        } else if (key === "$and") {
            let recordsetObj = new Map();
            let query =  {
                interpreterNeeded: false,
                indexes: {}
            }

            let noIndexesCount = 0

            for(let i = 0; i < value.length; i++) {
                let innerKey = Object.keys(value[i])[0];
                let innerValue = value[i][innerKey];

                try {
                    let result = this.queryCode(innerKey, innerValue)
                    query.indexes[innerKey] = 0;
                    if(i - noIndexesCount === 0) {
                        for(let id of result.recordset) {
                            query.indexes[innerKey]++
                            recordsetObj.set(id, 1)
                        }
                        continue;    
                    }
                    for(let id of result.recordset) {
                        query.indexes[innerKey]++
                        if(recordsetObj.has(id)) {
                            let val = recordsetObj.get(id)++
                            recordsetObj.set(id, val)
                        }
                    }
                } catch {
                    noIndexesCount++;
                    query.interpreterNeeded = true;
                }
            }
            let recordset = Array.from(recordsetObj).filter((row) => { return row[1] == value.length - noIndexesCount; }).map(row => row[0])
            return {
                recordset,
                query
            }
        } else if (key === "$or") {
            let recordset = new Set();
            let indexes = {

            }
            for(let i = 0; i < value.length; i++) {
                let innerKey = Object.keys(value[i])[0];
                let innerValue = value[i][innerKey];
                indexes[innerKey] = 0;

                let result = this.queryCode(innerKey, innerValue)

                for(let id of result.recordset) {
                    indexes[innerKey]++
                    recordset.add(id)
                }
            }
            return {
                recordset: [... recordset],
                query: {
                    interpreterNeeded: false,
                    indexes: indexes
                }
            }
        }
        throw new Error("Unkown Query Function")
    }

    queryIndex(key, value, valueTo) {

        if(value === Object(value)) {
            
            throw new Error("Search value could not be a object")
        }

        let from = value;
        let to = valueTo || value;

        if (this.#meta.indexes[key] && this.#meta.indexes[key].build) { 
            let db = this.#db
            let indexKey = this.#indexKey
            
            return {
                *[Symbol.iterator]() {
                    let range = db.getRange({  
                        start: indexKey(key, from, dbValues.LO)
                        ,end: indexKey(key, to, dbValues.HI)
                    })
                    
                    for(let row of range) {
                        this.count++
                        yield row.key.pop()
                    }
                },
                count: 0
            }
            
        }
        throw new Error("IDX" + key + " not avaiable")
    }
}

function interpreteStart(code, context) {
    let name = code.body[0].declarations[0].init.params[0].name;
    let expression = code.body[0].declarations[0].init;
    if (["ArrowFunctionExpression", "FunctionExpression"].includes(expression.type)) { 
        let r = interpreteNode(expression.body, name, context);
        return r
    }
    throw new Error("Not a function");
}



function interpreteNode(node, rowName, context, options = {}) {
    switch (node.type) {
        case "BlockStatement":
            return BlockStatement(node, rowName, context, options);
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

function BlockStatement(node, rowName, context, options) {
    let result = [];
    for (let i = 0; i < node.body.length; i++) {
        let body = node.body[i];
        result.push(interpreteNode(body, rowName, context, options));
    }
    return result;
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
    if ([">="].includes(node.operator)) {
        let result = {};
        result[left] = { $gte: right };
        return result;
    }
    if (["<="].includes(node.operator)) {
        let result = {};
        result[left] = { $lte: right };
        return result;
    }
    if ([">"].includes(node.operator)) {
        let result = {};
        result[left] = { $gt: right };
        return result;
    }
    if (["<"].includes(node.operator)) {
        let result = {};
        result[left] = { $lt: right };
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

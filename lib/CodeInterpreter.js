import * as acorn from "acorn";
import VirtualMaschine from "./VirtualMaschine.js";
import { tableKey, indexKey, dbValues, getProp } from "./utils.js"

let scripts = {};

export default class CodeInterpreter {
    #code;
    #parsed;
    #vm;
    #context;
    #db;
    #meta;

    constructor(code, context, db, meta, virtualDB) {
        this.#code = code;
        this.#context = context;
        this.#db = db;
        this.#meta = meta;
        
        this.#vm = new VirtualMaschine(code, context, virtualDB);
    }
    parse() {
        this.#parsed = acorn.parse("let func = " + this.#code, {
            ecmaVersion: "latest",
            sourceType: "script",
        });
        return interpreteStart(this.#parsed, this.#context)
    }

    interprete() {
        let ret;
        try {
            ret = this.interpreteIndex();
        } catch (e) {
            if(e instanceof ReferenceError) {
                throw e;
            }
        }
        if(!ret) {
            let db = this.#db;
            let dbKey = (id) => tableKey(this.#meta.name, id);
            let vm = this.#vm;

            ret = {
                *[Symbol.iterator]() {
                    let range = db.getRangeData({  
                        start: dbKey(dbValues.LO)
                        ,end: dbKey(dbValues.HI)
                    })
                    try {
                        for(let row of range) {
                            this.query.interpreterRows++;
                            if(vm.run(row.value) === true) {
                                yield row.value
                            }
                        }
                        return;
                    } catch(e) {
                        this.error = e;
                    }
                },
                query: {
                    indexes: {},
                    interpreterNeeded: true,
                    interpreterRows: 0,
                },
            }
        }
        return ret
    }

    interpreteIndex() {

        let db = this.#db;
        let dbKey = (id) => tableKey(this.#meta.name, id);
        let vm = this.#vm
        let code = this.parse();

        let key;
        let value;

        if(Array.isArray(code)) {
            if (code[0].$return) {
                let values = Object.keys(code[0].$return);
                key = values[0];
                value = code[0].$return[key];
            }
        } else {
            key = Object.keys(code)[0];
            value = code[key];
        }

        let result = this.queryCode(key, value);
        result.query.interpreterRows = 0;

        let recordset = {
            *[Symbol.iterator]() {
                try {
                    for(let id of result.recordset) {
                        let val = db.getData(dbKey(id));
                        if(result.recordset.count) {
                            this.query.indexes[key] = result.recordset.count;
                        }
                        if(this.query.interpreterNeeded) {
                            this.query.interpreterRows++;
                            if(vm.run(val) === true) {
                                yield val;
                                continue;
                            }
                        }
                        yield val;
                    }
                } catch(e) {
                    this.error = e
                }
            },
            query: result.query
        }

        return recordset;
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
        } 
        if (key === "$or") {
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
                    indexes: indexes,
                    interpreterNeeded: false,
                }
            }
        }

        let recordsetObj = new Map();
        let query =  {
            indexes: {},
            interpreterNeeded: false,
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
        let recordset = Array.from(recordsetObj).filter((row) => { return row[1] == value.length - noIndexesCount; }).map(row => row[0]);
        return {
            recordset,
            query
        }
    }

    queryIndex(key, value) {
        if (this.#meta.indexes[key] && this.#meta.indexes[key].build) { 
            let db = this.#db
            let idxKey = (indexName, value, ext) => indexKey(this.#meta.name, indexName, value, ext)

            if(value === Object(value)) {
                let conditionKey = Object.keys(value)[0];
                let conditionValue = value[conditionKey];
                if(conditionKey === "$not") {
                    return {
                        *[Symbol.iterator]() {
                            let range1 = db.getRangeIdx({  
                                start: idxKey(key, dbValues.LO)
                                ,end: idxKey(key, conditionValue)
                            })
                            
                            for(let row of range1) {
                                this.count++
                                yield row.value
                            }

                            let range2 = db.getRangeIdx({  
                                start: idxKey(key, conditionValue, dbValues.HI)
                                ,end: idxKey(key, dbValues.HI)
                            })

                            for(let row of range2) {
                                this.count++
                                yield row.value
                            }
                        },
                        count: 0
                    }
                }
                if(conditionKey === "$gte" || conditionKey === "$gt") {
                    return {
                        *[Symbol.iterator]() {
                            
                            let range = db.getRangeIdx({  
                                start: idxKey(key, conditionValue, conditionKey === "$gte"? dbValues.LO : dbValues.HI)
                                ,end: idxKey(key, dbValues.HI)
                            })
                            
                            for(let row of range) {
                                this.count++
                                yield row.value
                            }
                        },
                        count: 0
                    }
                }
                if(conditionKey === "$lte" || conditionKey === "$lt") {
                    return {
                        *[Symbol.iterator]() {
                            let range = db.getRangeIdx({  
                                start: idxKey(key, dbValues.LO)
                                ,end: idxKey(key, conditionValue, conditionKey === "$lte"? dbValues.HI : dbValues.LO)
                            })
                            
                            for(let row of range) {
                                this.count++
                                yield row.value
                            }
                        },
                        count: 0
                    }
                }
            }

            return {
                *[Symbol.iterator]() {
                    let range = db.getValuesIdx(idxKey(key, value))

                    for(let row of range) {
                        this.count++
                        yield row
                    }
                },
                count: 0
            }
        }
        throw new Error("IDX " + key + " not avaiable")
    }
}

function interpreteStart(code, context) {
    let expression = code.body[0].declarations[0].init;
    if (["ArrowFunctionExpression", "FunctionExpression"].includes(expression.type)) { 
        let name = expression.params[0]?.name;
        //console.log(expression.body)
        let r = interpreteNode(expression.body, name, context);
        return r
    }
    throw new ReferenceError("Not a function");
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
        case "ArrayExpression": 
            return ArrayExpression(node, rowName, context, options);
        case "CallExpression":
            return CallExpression(node, rowName, context, options);
        default:
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

    if(node.left.type != "MemberExpression") {
        let oldLeft = left;
        left = right;
        right = oldLeft
    }

    let result = {};
    switch(node.operator) {
        case "==":
        case "===":
            result[left] = right; break;
        case "!=":
        case "!==":
            result[left] = { $not: right }; break;
        case ">=":
            result[left] = { $gte: right }; break;
        case "<=": 
            result[left] = { $lte: right }; break;
        case ">": 
            result[left] = { $gt: right }; break;
        case "<": 
            result[left] = { $lt: right }; break;
    }
    return result
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
        if(context[node.name] == undefined) {
            throw new ReferenceError(node.name + " is not defined");
        }
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

    if(node.operator === "||") {
        return {
            $or: [left, right],
        };
    }
    //&&
    return {
        $and: [left, right],
    }
}

function ArrayExpression(node, rowName, context, options) {
    let ret = [];
    for(let element of node.elements) {
        ret.push(interpreteNode(element, rowName, context))
    }
    return ret;
}

function CallExpression(node, rowName, context, options) {
    let calleeType = node.callee.object.type
    let calleeObject = interpreteNode(node.callee.object, rowName, context);
    let property = node.callee.property.name;
    let arg = interpreteNode(node.arguments[0], rowName, context)

    if(calleeType == "ArrayExpression") {
        if(property == "includes") {
            let ret = []
            for(let element of calleeObject) {
                let val = {}
                val[arg] = element;
                ret.push(val);
            }
            return {
                $or: ret
            };
        }
    }
    throw new TypeError(`${calleeObject}.${property} is not a function`)
}

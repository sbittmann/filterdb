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
    #rowName;

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
        return this.interpreteStart(this.#parsed)
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
                if(code[0].$return === Object(code[0].$return)) {
                    let values = Object.keys(code[0].$return);
                    key = values[0];
                    value = code[0].$return[key];
                } else {
                    key = code[0].$return;
                    value = true;
                }
            }
        } else if(code === Object(code)) {
            key = Object.keys(code)[0];
            value = code[key];
        } else {
            key = code;
            value = true;
        }

        let result = this.queryCode(key, value);
        result.query.code = code;
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

    interpreteStart(code) {
        let expression = code.body[0].declarations[0].init;
        if (["ArrowFunctionExpression", "FunctionExpression"].includes(expression.type)) { 
            this.#rowName = expression.params[0]?.name;
            
            if(expression.expression === true) {
                
                let s = this.interpreteNode(expression.body)
                return s
            }
            let r = this.interpreteNode(expression.body);
            return r
        }
        throw new ReferenceError("Not a function");
    }

    interpreteNode(node, options = {}) {
        switch (node.type) {
            case "BlockStatement":
                return this.interpreteBlockStatement(node, options);
            case "ReturnStatement":
                return this.interpreteReturnStatement(node, options);
            case "BinaryExpression":
                return this.interpreteBinaryExpression(node, options);
            case "MemberExpression":
                return this.interpreteMemberExpression(node, options);
            case "Identifier":
                return this.interpreteIdentifier(node, options);
            case "Literal":
                return this.interpreteLiteral(node, options);
            case "LogicalExpression":
                return this.interpreteLogicalExpression(node, options);
            case "ArrayExpression": 
                return this.interpreteArrayExpression(node, options);
            case "CallExpression":
                return this.interpreteCallExpression(node, options);
            default:
                throw new Error("Unknown node type " + node.type);
        }
    }

    interpreteBlockStatement(node, options) {
        let result = [];
        for (let i = 0; i < node.body.length; i++) {
            let body = node.body[i];
            result.push(this.interpreteNode(body, options));
        }
        return result;
    }

    interpreteReturnStatement(node, options) {
        let argument = this.interpreteNode(node.argument, options);
        return { $return: argument };
    }

    interpreteBinaryExpression(node) {
        let left = this.interpreteNode(node.left, {
            withDbField: true
        });
        let right = this.interpreteNode(node.right, {
            withDbField: true
        });

        let operator = node.operator

        if(right.dbField && !left.dbField) {
            let oldLeft = left;
            left = right;
            right = oldLeft

            switch(operator) {
                case ">=":
                    operator = "<="; break;
                case "<=": 
                    operator = ">="; break;
                case ">": 
                    operator = "<"; break;
                case "<": 
                    operator = ">"; break;
            }
        }

        let result = {};
        
        switch(operator) {
            case "==":
            case "===":
                result[left.value] = right.value; break;
            case "!=":
            case "!==":
                result[left.value] = { $not: right.value }; break;
            case ">=":
                result[left.value] = { $gte: right.value }; break;
            case "<=": 
                result[left.value] = { $lte: right.value }; break;
            case ">": 
                result[left.value] = { $gt: right.value }; break;
            case "<": 
                result[left.value] = { $lt: right.value }; break;
        }
        return result
    }

    interpreteMemberExpression(node, { replace = true, withDbField = false } = {}) {
        let obj = this.interpreteNode(node.object, {
            replace: false,
        });
        let prop = this.interpreteNode(node.property, {
            replace: false,
        });

        if (replace) {
            if (obj.startsWith(this.#rowName)) {
                let val = `${obj}.${prop}`.substring(this.#rowName.length + 1)
                if(withDbField) {
                    return {
                        dbField: true,
                        value: val,
                    }
                }
                return val
                
            }
            
            let val = getProp(this.#context, `${obj}.${prop}`)
            if(withDbField) {
                return {
                    dbField: false,
                    value: val
                }
            }
            
        }

        return `${obj}.${prop}`;
    }

    interpreteIdentifier(node, { replace = true, withDbField = false } = {}) {
        let val = node.name;
        if (replace) {
            if(this.#context[node.name] == undefined) {
                throw new ReferenceError(node.name + " is not defined");
            }
            val = this.#context[node.name];
        }
        if(withDbField) {
            return {
                dbField: false,
                value: val,
            }
        }
        return val
         
    }

    interpreteLiteral(node, {withDbField = false}) {
        let val = node.value
        if(withDbField) {
            return {
                dbField: true,
                value: val,
            }
        }
        return val
    }

    interpreteLogicalExpression(node) {
        let left = this.interpreteNode(node.left, );
        let right = this.interpreteNode(node.right, );

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

    interpreteArrayExpression(node) {
        let ret = [];
        for(let element of node.elements) {
            ret.push(this.interpreteNode(element))
        }
        return ret;
    }

    interpreteCallExpression(node) {
        let calleeType = node.callee.object.type
        let calleeObject = this.interpreteNode(node.callee.object);
        let property = node.callee.property.name;
        let arg = this.interpreteNode(node.arguments[0])
        
        
        if(calleeType == "MemberExpression") {
            if(property == "includes") {
                let r =  this.interpreteMemberExpression(node.callee.object, { withDbField: true})
                if(r.dbField) {
                    let val = {}
                    val[`${r.value}[]`] = arg
                    return val
                }
            }
        } else if(calleeType == "ArrayExpression") {
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
}
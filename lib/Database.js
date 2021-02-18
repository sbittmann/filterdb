import level from "level-rocksdb"
import {v4 as uuidv4} from "uuid"
import CodeParser from "./CodeParser.js"

let tables = {

}

export default class Database {
    table(name) {
        return new Table(name);
    }
}

class Table {
    constructor(name) {
        this.name = name
        
        if(!tables[name]) {
            tables[name] = level('storage/tables/' + name, {
                keyEncoding: 'utf8',
                valueEncoding: 'json'
            });
        }
        this.rocksdb = tables[name];
    }

    async get(id) {
        return await this.rocksdb.get(id);
    }

    async find(func) {
        let cp =  new CodeParser(func);
        let result;
        try {
            let query = cp.parse();
            result = queryscan(this.rocksdb, query);
        } catch {
            result = await fullscan(this.rocksdb, func);
        }
        
        if(result.length > 0) {
            return result[0]
        }
        return null
    }

    async filter(func) {
        let cp =  new CodeParser(func);
        let result;
        try {
            let query = cp.parse();
            result = queryscan(this.rocksdb, query, 1);
        } catch {
            result = await fullscan(this.rocksdb, func, 1);
        }
        return result
    }

    async push(data) {
        let id = data._id
        if(!id) {
            id = uuidv4();
            data._id = id;
        }
        await this.rocksdb.put(id, data);
        return id;
    }

    async remove(id) {
        await this.rocksdb.del(id);
    }
}

async function fullscan(table, func, entries = 0) {
    return await new Promise((resolve, reject) => {
        let stream  = table.createReadStream({
            keys: false
        });
        let result = []
        stream.on('data', (data) => {
            //TODO: use for function call: https://github.com/laverdet/isolated-vm
            if(func(data) === true) {
                result.push(data);
                if(result.length === entries) {
                    stream.destroy()
                    resolve(result);
                }
            }
        });
        stream.on('end', () => {
            resolve(result);
        });
        stream.on('error', (err) => {
            reject(err)
        });
    });
}

async function queryscan(table, query, entries = 0) {
    return []
}
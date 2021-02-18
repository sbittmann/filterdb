import level from "level-rocksdb"

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
            console.log("CREATE / OPEN Table");
            tables[name] = level('storage/tables/' + name);
        }
        this.rocksdb = tables[name];
    }

    get(key) {

    }

    find(func) {

    }

    filter(func) {

    }

    push(data) {

    }

    remove(key) {

    }
}
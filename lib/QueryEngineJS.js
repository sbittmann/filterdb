export default function QueryEngine() {
    return {
        query: (query) => { return null; },
        match: function(obj, query) {
            return query(obj);
        },
        plans: {
            property: (idx, queryParts) => {
                console.log(idx, queryParts)
            },
            pairs: (idx, queryParts) => {
                console.log(idx, queryParts)
            }
        }
    };
}

/*
let cp =  new CodeParser(func);
let result;
try {
    throw new Error("TEST")
    let query = cp.parse();
    result = queryscan(this.db, query, 1);
} catch {
    console.log("SCAN")
    this.db.ReadStream().on('data', (data) => {
        console.log(data);
    })
    result = await fullscan(this.db, func, 1);
}

if(result.length > 0) {
    return result[0]
}
return null
*/

export function interpreteQuery(table, query, entries) {
    for(let i = 0; i < query.length; i++) {
        let sub = query[i];
        switch (sub) {
            case '$return':
                return $return();
        }
    }
}

function $return() {
    
}
export async function fullscan(db, func, entries = 0) {
    console.log("FULLSCAN")
    return await new Promise((resolve, reject) => {
        let stream  = db.createReadStream({
            keys: false
        });
        let result = []
        stream.on('data', (data) => {
            console.log(data);
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
            console.log("END")
            resolve(result);
        });
        stream.on('error', (err) => {
            reject(err)
        });
    });
}

export async function queryscan(table, query, entries = 0) {
    for(let i = 0; i < query.length; i++) {
        let entry = query[i];
        console.log(entry);
    }
    return []
}
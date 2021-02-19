
export default function(db) {
    let put = db.put;
    let del = db.del;

    let pre = []
    let post = []

    db.hooks = {
        pre: (func) => { pre.push(func) },
        post: (func) => { post.push(func) }
    }

    db.put = async function(key, value) {
        let change = {
            type: 'put'
            ,key
            ,value
        }
        for(let i = 0; i < pre.length; i++) {
            await pre[i](change)
        }
        
        return await put.call(db, key, value)
    }

    db.del = async function(key) {
        let change = {
            type: 'put'
            ,key
            ,value
        }
        for(let i = 0; i < pre.length; i++) {
            await pre[i](change)
        }
        
        return await del.call(db, key)
        
    }
}
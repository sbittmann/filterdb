export default function (db) {
    let put = db.put;
    let del = db.del;

    let pre = [];
    let post = [];

    db.hooks = {
        pre: (func) => {
            pre.push(func);
        },
        post: (func) => {
            post.push(func);
        },
    };

    db.put = async function (key, value) {
        return new Promise(async (resolve) => {
            let oldVal;
            try {
                oldVal = await db.get(key);
            } catch {}

            let change = {
                key: key,
                oldVal: oldVal,
                newVal: value,
            };
            for (let i = 0; i < pre.length; i++) {
                await pre[i](change);
            }

            resolve(await put.call(db, key, value));

            for (let i = 0; i < post.length; i++) {
                await post[i](change);
            }
        });
    };

    db.del = function (key) {
        return new Promise(async (resolve) => {
            let change = {
                key: key,
                oldVal: value,
                newVal: undefined,
            };

            for (let i = 0; i < pre.length; i++) {
                await pre[i](change);
            }

            resolve(await del.call(db, key));

            for (let i = 0; i < post.length; i++) {
                await post[i](change);
            }
        });
    };
}

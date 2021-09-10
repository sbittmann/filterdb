

function getProp(obj, prop) {
    if (!obj) {
        return;
    }
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
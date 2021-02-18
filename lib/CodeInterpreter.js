export function interpreteNode(node, rowName) {
    switch (node.type) {        
        case 'ReturnStatement':
            return ReturnStatement(node, rowName);
        case 'BinaryExpression':
            return BinaryExpression(node, rowName);
        case 'MemberExpression':
            return MemberExpression(node, rowName);
        case 'Identifier':
            return Identifier(node, rowName);
        case 'Literal': 
            return Literal(node, rowName);
        case 'LogicalExpression': 
            return LogicalExpression(node, rowName);
        default:
            console.log(node);
            throw new Error("Unknown node type " + node.type);
    }
}

function ReturnStatement(node, rowName) {
    let argument = interpreteNode(node.argument, rowName);
    return { "$return": argument }
}

function BinaryExpression(node, rowName) {
    let left = interpreteNode(node.left, rowName)
    let right = interpreteNode(node.right, rowName)
    if(["==", "==="].includes(node.operator)) {
        let result = {};
        result[left] = right;

        return result
    }
}

function MemberExpression(node, rowName) {
    let obj = interpreteNode(node.object, rowName)
    let prop = interpreteNode(node.property, rowName)

    if(obj === rowName) {
        return prop;
    }

    return `${obj}.${prop}`;
}

function Identifier(node, rowName) {
    return node.name;
}

function Literal(node, rowName) {
    return node.value;
}

function LogicalExpression(node, rowName) {
    let left = interpreteNode(node.left, rowName);
    let right = interpreteNode(node.right, rowName);
    if(node.operator === "&&") {
        return {
            "$and": [left, right]
        }
    }
    if(node.operator === "||") {
        return {
            "$or": [left, right]
        }
    }
    throw new Error("unknown operator: " + node.operator)
}
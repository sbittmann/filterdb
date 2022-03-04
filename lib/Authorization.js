import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function authenticate(user, password, db, secret) {
    let dbUser = await db.users.get(user);
    if (!(await comparePassword(password, dbUser.password))) {
        return false;
    }

    return createToken(dbUser._id, dbUser.groups, secret);
}

export async function createPasswordHash(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

export function verifyToken(token, secret) {
    return jwt.verify(token, secret);
}

export function createToken(user, groups, secret) {
    return jwt.sign(
        {
            user: user,
            groups: groups,
        },
        secret,
    );
}

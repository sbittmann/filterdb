export async function shouldThrow(fn) {
    let thrown = false;
    try {
        await fn();
    } catch {
        thrown = true
    }
    
    if(thrown) {
        return
    }
    throw Error('should Throw');
}
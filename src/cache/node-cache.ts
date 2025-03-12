import NodeCache from "node-cache";
const cache = new NodeCache();

function setValue(key: string, value: any) {
    cache.set(key, value)
}
function getValue(key: string) {
    return cache.get(key)
}

export const nodeCache = {
    setValue,
    getValue
}
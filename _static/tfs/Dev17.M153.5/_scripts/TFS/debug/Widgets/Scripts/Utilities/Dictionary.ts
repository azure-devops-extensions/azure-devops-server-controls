import { toDictionary } from "VSS/Utils/Array";

// Consider moving to "VSS/Utils/Dictionary" when this stabilizes

export const fromArray = toDictionary;

export function shallowCopy<TValue>(dictionary: IDictionaryStringTo<TValue>): IDictionaryStringTo<TValue> {
    let newDictionary = {};
    for (let key in dictionary) {
        newDictionary[key] = dictionary[key];
    }
    return newDictionary;
}

export function toArray<TValue>(dictionary: IDictionaryStringTo<TValue>) : TValue[]  {
    // Note that Object.values is not supported in IE 11
    let values: TValue[] = [];
    for (let key in dictionary) {
        let value = dictionary[key];
        values.push(value);
    }
    return values;
}
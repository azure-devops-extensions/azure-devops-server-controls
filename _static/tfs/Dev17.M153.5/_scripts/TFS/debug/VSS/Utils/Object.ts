/**
 * Describes the behavior to use in a deep merge when the source and target
 * both have the same property which is an array. Either take the source array
 * or combine the two arrays 
 */
export const enum MergeArrayOptions {
    
        /**
         * When a source property is an array, override the target property with
         * the source array.
         */
        replace = 0,
    
        /**
         * When a source property and its target property are both arrays, concatenate
         * the values in the source array into the target array.
         */
        concat = 1
    }
    
    /**
     * Options when performing a deep merge
     */
    export interface IMergeOptions {
    
        /**
         * Describes the behavior to use in a deep merge when the source and target
         * both have the same property which is an array. Either take the source array
         * or combine the two arrays 
         */
        arrayOptions?: MergeArrayOptions;
    
        /**
         * If true, clone all objects including their child/descendant properties when
         * merging values into the new object. Ensures that no properties in the resulting merged
         * object (including sub-properties, recursively) are "===" to any objects in the source.
         */
        deepClone?: boolean;
    }
    
    /**
     * Performs a deep merge of the given source objects into the target. The sources are merged-in left-to-right.
     * So for properties with collisions, the right-most value "wins". Clones all properties and sub-properties
     * recursively so that no objects referenced in the resulting target are "===" to objects in the sources.
     * 
     * Specifically works on standard JSON objects, not classes/functions with property accessors, etc.
     * 
     * @param target The target object to merge values into
     * @param sources Source objects to merge into the target
     * @returns The target parameter
     */
    export function deepMerge(target: any, ...sources: any[]): any {
        return deepMergeWithOptions({ deepClone: true, arrayOptions: MergeArrayOptions.replace }, target, ...sources);
    }
    
    /**
     * Performs a deep merge of the given source objects into the target. The sources are merged-in left-to-right.
     * So for properties with collisions, the right-most value "wins".
     * 
     * Specifically works on standard JSON objects, not classes/functions with property accessors, etc.
     * 
     * @param options Options describing the merge behavior
     * @param target The target object to merge values into
     * @param sources Source objects to merge into the target
     * @returns The target parameter
     */
    export function deepMergeWithOptions(options: IMergeOptions, target: any, ...sources: any[]) {
        
        const isArray = Array.isArray(target);
        const concatArrays = options.arrayOptions === MergeArrayOptions.concat;
        const deepClone = options.deepClone !== false;
        
        for (let source of sources) {
            if (isArray && Array.isArray(source)) {
                if (!concatArrays) {
                    target.length = 0;
                }
                target.push.apply(target, deepClone ? cloneArray(source) : source);
            }
            else {
                mergeObjects(target, source, deepClone, concatArrays);
            }
        }
    
        return target;
    }
    
    /**
     * Make a deep clone of an array.
     * 
     * @param array The array to clone
     */
    function cloneArray(array: any[]): any[] {
        const newArray: any[] = [];
        for (let i = 0, l = array.length; i < l; i++) {
            const value = array[i];
            if (typeof value === "object" && value !== null && !(value instanceof Date)) {
                // Clone values of Object type
                if (Array.isArray(value)) {
                    newArray[i] = cloneArray(value);
                }
                else {
                    newArray[i] = mergeObjects({}, value, true, false);
                }
            }
            else {
                // Non-Object type. Just copy-in the value directly.
                newArray[i] = value;
            }
        }
        return newArray;
    }
    
    /**
     * The internal function to merge two objects
     */
    function mergeObjects(target: any, source: any, deepClone: boolean, concatArrays: boolean): any {
    
        // Iterate through each value in the source that we are copying from
        for (let key in source) {
            const sourceValue = source[key];
            const targetValue = target[key];
    
            if (typeof targetValue === "object" && targetValue !== null && !(targetValue instanceof Date)) {
    
                // The target already has this value, and it is an Object
    
                const targetIsArray = Array.isArray(targetValue);
                if (targetIsArray && Array.isArray(sourceValue)) {
    
                    // The source and target are both arrays
                    if (concatArrays) {
                        let sourceArrayCopy = sourceValue;
                        if (deepClone) {
                            sourceArrayCopy = cloneArray(sourceValue);
                        }
                        target[key] = [...targetValue, ...sourceValue];
                    }
                    else {
                        target[key] = deepClone ? cloneArray(sourceValue) : sourceValue;
                    }
                }
                else if (typeof sourceValue === "object" && sourceValue !== null && !(sourceValue instanceof Date)) {
    
                    // The source and target are both Objects (but not arrays). Merge them.
                    const mergeResult = targetIsArray ? [...targetValue] : { ...targetValue };
                    target[key] = mergeObjects(mergeResult, sourceValue, deepClone, concatArrays);
                }
                else {
                    // The source value is not of type Object. Just override the target value.
                    target[key] = sourceValue;
                }
            }
            else {
    
                // This property is not in the target object yet OR the target value is not an object meaning we want to overwrite it.
                if (deepClone && typeof sourceValue === "object" && sourceValue !== null && !(sourceValue instanceof Date)) {
    
                    // Make a deep copy of the value we are copying into the target
                    if (Array.isArray(sourceValue)) {
                        target[key] = cloneArray(sourceValue);
                    }
                    else {
                        target[key] = mergeObjects({}, sourceValue, deepClone, concatArrays);
                    }
                }
                else {
    
                    // Set the value in the target object
                    target[key] = sourceValue;
                }
            }
        }

        return target;
    }
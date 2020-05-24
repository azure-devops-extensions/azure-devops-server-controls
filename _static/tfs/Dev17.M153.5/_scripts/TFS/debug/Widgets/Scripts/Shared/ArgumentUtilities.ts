/**
 * Guards against undefined, null, empty, whitespace strings. Throws an error if the string doesn't pass.
 * @param value The string to evaluate
 * @param nameOfArgument The variable name to include in the error message for debugging purposes
 */
export function CheckString(value: string, nameOfArgument: string): void | never {
    CheckObject(value, nameOfArgument);

    if (value.trim().length === 0) {
        throw new Error(`String argument was rejected: ${nameOfArgument}`);
    }
}

/**
 * Guards against undefined, null objects. Throws an error if the object doesn't pass.
 * @param value The object to evaluate
 * @param nameOfArgument The variable name to include in the error message for debugging purposes
 */
export function CheckObject(value: any, nameOfArgument: string): void | never {
    if (value == null) {
        throw new Error(`Object argument was rejected: ${nameOfArgument}`);
    }
}

/**
 * Guards against undefined, null arrays and any values within the array being undefined, null,
 * empty, or whitespace.
 * @param strings The strings to evaluate
 * @param nameOfArrayArgument The variable name to include in the error message for debugging purposes
 */
export function CheckStringArray(strings: string[], nameOfArrayArgument: string): void | never {
    try {
        CheckObject(strings, nameOfArrayArgument);
    } catch (e) {
        throw new Error(`String array argument was rejected: ${nameOfArrayArgument}`);
    }

    for (const value of strings) {
        try {
            CheckString(value, "value");
        } catch (e) {
            throw new Error(`A value within the string array argument '${nameOfArrayArgument}' was rejected`);
        }
    }
}

/**
 * Guards against undefined, null arrays and any values within the array being undefined or null.
 * @param objects The objects to evaluate
 * @param nameOfArrayArgument The variable name to include in the error message for debugging purposes
 */
export function CheckObjectArray(objects: any[], nameOfArrayArgument: string): void | never {
    try {
        CheckObject(objects, nameOfArrayArgument);
    } catch (e) {
        throw new Error(`Array argument was rejected: ${nameOfArrayArgument}`);
    }

    for (const value of objects) {
        try {
            CheckObject(value, "value");
        } catch (e) {
            throw new Error(`A value within the array argument '${nameOfArrayArgument}' was rejected`);
        }
    }
}
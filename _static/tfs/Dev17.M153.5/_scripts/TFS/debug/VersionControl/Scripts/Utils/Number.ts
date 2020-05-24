// -----------------------------------------------------------------------------------
// Number utilities that don't belong in the platform (yet) but should be shared in VC
// -----------------------------------------------------------------------------------

/**
 * Same semantics as Number.isInteger
 */
export function isInteger(value: any): boolean {
    if ((<any>Number).isInteger) {
        return (<any>Number).isInteger(value);
    }
    else {
        // Polyfill for Number.isInteger
        // http://www.ecma-international.org/ecma-262/6.0/#sec-number.isinteger
        return typeof value === "number"
            && isFinite(value)
            && toInteger(value) === value;
    }
}

/**
 * Abstract operation "ToInteger" from ECMA-262 for use in polyfills
 * http://www.ecma-international.org/ecma-262/6.0/#sec-tointeger
 */
export function toInteger(value: any): number {
    const num = Number(value);
    if (isNaN(num)) {
        return +0;
    }
    else if (num === 0 || num === Number.POSITIVE_INFINITY || num === Number.NEGATIVE_INFINITY) {
        return num;
    }
    else if (num < 0) {
        return -Math.floor(Math.abs(num));
    }
    else {
        return +Math.floor(Math.abs(num));
    }
}

/**
 * Compare whether or not two numbers differ in less than a given epsilon (default to 1).
 */
export function areSimilar(a: number, b: number, epsilon: number = 1): boolean {
    const diff = a - b;
    return diff < epsilon && diff > -epsilon;
}


/**
* Returns the first element of an array that matches the predicate.
*
* @param array Array used to perform predicate.
* @param predicate The Predicate function.
* @return The first element that matches the predicate.
*/
export function first<T>(array: T[], predicate?: (value: T) => boolean): T {
    if (!array || array.length === 0) {
        return null;
    }

    if (predicate === undefined) {
        return array[0];
    }

    var value: T,
        i: number,
        len = array.length;

    for (i = 0; i < len; i++) {
        value = array[i];
        if (predicate(value) === true) {
            return value;
        }
    }

    return null;
}

export function arrayContains<S, T>(value: S, target: T[], comparer?: (s: S, t: T) => boolean): boolean {
    if (!target) {
        return false;
    }

    for (var i = 0, len = target.length; i < len; i++) {
        if (comparer && comparer(value, target[i])) {
            return true;
        }
    }

    return false;
}

export function arrayEquals<S, T>(source: S[], target: T[], comparer?: (s: S, t: T) => boolean, nullResult: boolean = false, sorted: boolean = false): boolean {
    if (!source || !target) {
        return nullResult;
    }

    if (source.length !== target.length) {
        return false;
    }

    if (!sorted) {
        // TODO: Optimize this as it might result a lot of operation for large arrays.
        for (let i = 0, len = source.length; i < len; i++) {
            if (!arrayContains(source[i], target, comparer)) {
                return false;
            }
        }
    }
    else {
        for (let i = 0, len = source.length; i < len; i++) {
            if (!comparer || !comparer(source[i], target[i])) {
                return false;
            }
        }
    }

    return true;
}

/**
* Compares two arrays for member-wise equality.
*
* @param arrayA First array to compare.
* @param arrayB Other array to compare.
* @return True if both arrays are the same length, and every index has the same value in both arrays. "Same value" in this
*         case means "===" equality. Also true if both arrays are null. Otherwise, returns false.
*/
export function shallowEquals(arrayA: any[], arrayB: any[]): boolean {
    if (arrayA === arrayB) {
        return true;
    }

    if (arrayA == null || arrayB == null || arrayA.length !== arrayB.length) {
        return false;
    }

    for (let i = 0, len = arrayA.length; i < len; ++i) {
        if (arrayA[i] !== arrayB[i]) {
            return false;
        }
    }

    return true;
}

/**
    * @param caseInsensitive 
    */
function hashset(array: any[], caseInsensitive?: boolean): any {
    var result: any = {};
    var i: number;
    var l: number;

    if (caseInsensitive) {
        for (i = 0, l = array.length; i < l; i++) {
            result[array[i].toLocaleUpperCase()] = i;
        }
    }
    else {
        for (i = 0, l = array.length; i < l; i++) {
            result[array[i]] = i;
        }
    }

    return result;
}

/**
    * Take an array of values and convert it to a dictionary/lookup table.
    * @param array Values to convert
    * @param getKey Function to get the key for a given item
    * @param getValue Optional function to get teh value for a given item (defaults to the item itself)
    * @param throwOnDuplicateKeys Optional value indicating to throw an error when duplicate keys are present. Otherwise just overwrite any duplicates
    * @return 
    */
export function toDictionary<TArray, TValue>(
    array: TArray[],
    getKey: (item: TArray, index: number) => string,
    getValue?: (item: TArray, index: number) => TValue,
    throwOnDuplicateKeys?: boolean): IDictionaryStringTo<TValue> {

    var lookup: IDictionaryStringTo<TValue> = {};
    $.each(array || [], (index: number, item: TArray) => {
        var key = getKey(item, index);
        if (key) {
            var value: TValue;
            if (getValue) {
                value = getValue(item, index);
            }
            else {
                value = <any>item;
            }

            if (throwOnDuplicateKeys && lookup[key]) {
                // Debug message, should not be surfaced to customer, no loc needed.
                throw new Error("toDictionary: Duplicate entries for key: " + key);
            }

            lookup[key] = value;
        }
    });
    return lookup;
}

/**
    * @param array 
    * @param value 
    * @param comparer 
    * @return 
    */
export function contains<T>(array: T[], value: T, comparer?: IComparer<any>): boolean {

    if (typeof value === "undefined") {
        return false;
    }

    comparer = comparer || defaultComparer;

    for (var i = 0, l = array.length; i < l; i++) {
        if ((typeof array[i] !== "undefined") && comparer(array[i], value) === 0) {
            return true;
        }
    }

    return false;
}

/**
    * @param array 
    * @param predicate 
    * @return 
    */
export function findIndex<T>(array: T[], predicate: IFunctionPR<T, boolean>): number {

    for (var i = 0, l = array.length; i < l; i++) {
        if (predicate(array[i])) {
            return i;
        }
    }

    return -1;
}

/**
    * @param arrayA 
    * @param arrayB 
    * @param comparer 
    * @return 
    */
export function intersect<T>(arrayA: T[], arrayB: T[], comparer?: IComparer<T>): T[] {

    var result: any[];
    var value: any;

    if (!arrayB) {
        return arrayA;
    }

    if (arrayB.length === 0) {
        return [];
    }

    result = [];

    for (var i = 0, l = arrayA.length; i < l; i++) {
        value = arrayA[i];
        if (contains(arrayB, value, comparer)) {
            result[result.length] = value;
        }
    }

    return result;
}

/**
    * Helper method used to intersect arrays of strings or numbers
    * 
    * @param arrayA 
    * @param arrayB 
    * @param caseInsensitive 
    * @return 
    */
export function intersectPrimitives<T>(arrayA: T[], arrayB: T[], caseInsensitive?: boolean): T[] {

    var hashtable: any;
    var result: any[];
    var i: number;
    var l: number;
    var value: any;

    if (!arrayB) {
        return arrayA;
    }

    if (!arrayA) {
        return arrayB;
    }

    if (arrayB.length === 0 || arrayA.length === 0) {
        return [];
    }

    if (arrayA.length < arrayB.length) {
        hashtable = hashset(arrayA, caseInsensitive);
    }
    else {
        hashtable = hashset(arrayB, caseInsensitive);
        arrayB = arrayA;
    }

    result = [];

    if (caseInsensitive) {
        for (i = 0, l = arrayB.length; i < l; i++) {
            value = arrayB[i];
            if (hashtable.hasOwnProperty(value.toLocaleUpperCase())) {
                result[result.length] = value;
            }
        }
    }
    else {
        for (i = 0, l = arrayB.length; i < l; i++) {
            value = arrayB[i];
            if (hashtable.hasOwnProperty(value)) {
                result[result.length] = value;
            }
        }
    }

    return result;
}

/**
    * @param arrayA 
    * @param arrayB 
    * @param comparer 
    * @return 
    */
export function union<T>(arrayA: T[], arrayB: T[], comparer?: IComparer<T>): T[] {

    var result: any[];

    if (!arrayB || arrayB.length === 0) {
        return arrayA;
    }

    result = arrayA.concat(arrayB);
    uniqueSort(result, comparer);

    return result;
}

/**
    * Sorts and removes duplicate elements
    * 
    * @param array 
    * @param comparer 
    * @return 
    */
export function uniqueSort<T>(array: T[], comparer?: IComparer<T>): T[] {

    comparer = comparer || defaultComparer;

    array.sort(comparer);

    for (var i = 1, l = array.length; i < l; i++) {
        if (comparer(array[i], array[i - 1]) === 0) {
            array.splice(i--, 1);
            l--;
        }
    }

    return array;
}

/**
    * @param array 
    * @param comparer 
    * @return 
    */
export function unique<T>(array: T[], comparer?: IComparer<T>): T[] {

    var result = array.slice(0);
    uniqueSort(result, comparer);

    return result;
}

/**
    * @param arrayA 
    * @param arrayB 
    * @param comparer 
    * @return 
    */
export function subtract<T>(arrayA: T[], arrayB: T[], comparer?: IComparer<T>): T[] {

    var value: any;
    var result: any[];

    if (!arrayB || arrayB.length === 0) {
        return arrayA;
    }

    result = [];

    for (var i = 0, l = arrayA.length; i < l; i++) {
        value = arrayA[i];
        if (!contains(arrayB, value, comparer)) {
            result[result.length] = value;
        }
    }

    return result;
}

/**
    * Reorders an array by moving oldIndex + the "count" next elements to the newIndex in the array
    * 
    * @param array 
    * @param oldIndex The index of the array element to move
    * @param newIndex The index of the array to insert the element at
    * @param count The number of subsequent, contiguous elements to take with the oldIndex in the reorder
    */
export function reorder<T>(array: T[], oldIndex: number, newIndex: number, count: number): T[] {

    var move: any[];

    if (newIndex > oldIndex) {
        if ((newIndex - oldIndex) < count) {
            throw new Error("Array cannot be reordered if newIndex is within the items being moved");
        }

        newIndex -= count;
    }

    move = array.splice(oldIndex, count);

    Array.prototype.splice.apply(array, [newIndex, 0].concat(move));

    return array;
}

interface FlaggedArray<T> extends Array<T> {
    sorted: boolean;
    comparer: IComparer<T>;
}

/**
    * @param array 
    * @param comparer 
    * @return 
    */
export function flagSorted<T>(array: T[], comparer: IComparer<T>) {

    var arr = <FlaggedArray<T>>array;

    arr.sorted = true;
    arr.comparer = comparer;
}

/**
    * @param toArray 
    * @param fromArray 
    * @return 
    */
export function copySortFlag<T>(toArray: T[], fromArray: T[]) {

    var toArr = <FlaggedArray<T>>toArray;
    var fromArr = <FlaggedArray<T>>fromArray;

    toArr.sorted = fromArr.sorted;
    toArr.comparer = fromArr.comparer;
}

/**
    * @param array 
    * @param comparer 
    * @return 
    */
export function isSorted<T>(array: T[], comparer: IComparer<T>): boolean {

    var arr = <FlaggedArray<T>>array;

    return arr.sorted && arr.comparer === comparer;
}

/**
    * @param array 
    * @param comparer 
    * @return 
    */
export function sortIfNotSorted<T>(array: T[], comparer: IComparer<T>): boolean {

    if (!isSorted(array, comparer)) {
        array.sort(comparer);
        flagSorted(array, comparer);

        return true;
    }

    return false;
}

/**
    * @param array 
    * @return 
    */
export function clone<T>(array: T[]): T[] {
    if (array.length === 1) {
        return [array[0]];
    }
    else {
        return Array.apply(null, array);
    }
}

/**
    * @param array 
    * @param item 
    * @return 
    */
export function indexOf<T>(array: T[], item: T): number {
    if (typeof (item) === "undefined") return -1;
    for (var i = 0, length = array.length; i < length; i++) {
        if ((typeof (array[i]) !== "undefined") && (array[i] === item)) {
            return i;
        }
    }
    return -1;
}

/**
    * @param array 
    * @param item 
    */
export function add<T>(array: T[], item: T) {
    array[array.length] = item;
}

/**
    * @param array 
    * @param items 
    */
export function addRange<T>(array: T[], items: T[]) {
    array.push.apply(array, items);
}

/**
    * @param array 
    * @param item 
    * @return 
    */
export function remove<T>(array: T[], item: T): boolean {
    var index = indexOf(array, item);
    if (index >= 0) {
        array.splice(index, 1);
    }
    return (index >= 0);
}

/**
 * Remove items from array that satisfy the predicate.
 * @param array
 * @param predicate
 */
export function removeWhere<T>(array: T[], predicate: (element: T) => boolean, count?: number, startAt: number = 0) {
    const indexesToRemove: number[] = [];
    for (let i = startAt; i < array.length; ++i) {
        if (predicate(array[i])) {
            indexesToRemove.push(i);
            if (indexesToRemove.length === count) {
                break;
            }
        }
    }
    removeAllIndexes(array, indexesToRemove);
}

/**
 * Removes the given index from the array
 * @param array
 * @param index
 * @return boolean false if the index is out of bounds.
 */
export function removeAtIndex<T>(array: T[], index: number): boolean {
    return removeAllIndexes(array, [index]);
}

/**
 * Removes all of the given indexes from array
 * @param array
 * @param indexes
 * @return boolean false if any index is out of bounds
 */
export function removeAllIndexes<T>(array: T[], indexes: number[]): boolean {
    let result = true;
    let sortedIndexes = indexes.slice();
    sortedIndexes.sort((a, b) => Number(a) - Number(b));
    for (let i = sortedIndexes.length - 1; i >= 0; --i) {
        const index = sortedIndexes[i];
        if (index >= array.length || index < 0) {
            result = false;
            continue;
        }
        array.splice(index, 1);
    }
    return result;
}

/**
    * @param array 
    */
export function clear<T>(array: T[]) {
    array.length = 0;
}

function defaultComparer<T>(a: T, b: T): number {
    //weak equality should be enough for default comparer
    /*jslint eqeqeq:false */
    if (a == b) {
        return 0;
    }
    else if (a > b) {
        return 1;
    }
    else {
        return -1;
    }
    /*jslint eqeqeq:true */
}



/**
 * Returns an array which is the sorted intersection of values between two other arrays.
 * This function is optimized to work only with sorted arrays with unique values.
 * @param sortedUniqueArray1 Input array - which must already be sorted and only contain unique values
 * @param sortedUniqueArray2 Input array - which must already be sorted and only contain unique values
 * @param comparer A comparer for values of type T
 * @returns An array that is the intersection of the values from the two input arrays (as determined by the comparer). The result array will be sorted. If there is no intersection, an empty array is returned.
 */
export function intersectUniqueSorted<T>(sortedUniqueArray1: T[], sortedUniqueArray2: T[], comparer?: IComparer<T>): T[] {
    var a1: T[], a2: T[];

    // exit early if possible
    if (!sortedUniqueArray1 || !sortedUniqueArray2 || sortedUniqueArray1.length === 0 || sortedUniqueArray2.length === 0) {
        return [];
    }

    // find the shortest array to iterate through
    if (sortedUniqueArray1.length < sortedUniqueArray2.length) {
        a1 = sortedUniqueArray1;
        a2 = sortedUniqueArray2;
    }
    else {
        a1 = sortedUniqueArray2;
        a2 = sortedUniqueArray1;
    }

    if (!comparer) {
        comparer = (a, b) => a < b ? -1 : a > b ? 1 : 0;
    }

    var min = 0, max = a2.length;
    var results: T[] = [];

    for (let a of a1) {
        // binary search for 'a' in a2 (within the bounds of min-max)
        let comparison: number;
        let i, lo = min, hi = max - 1;

        while (hi >= lo) {
            i = (lo + hi) >> 1; //mid point
            comparison = comparer(a, a2[i]);

            if (comparison < 0) {
                hi = i - 1;
            } else if (comparison > 0) {
                lo = i + 1;
            } else {
                break;
            }
        }

        if (comparison === 0) {
            // found the item 'a' in a2
            results.push(a);
            min = i + 1;
        }
    }

    return results;
}

/**
 * Flattens an array made of arrays, returning a list where inner lists are put together in a single list.
 * It's like Linq.SelectMany.
 */
export function flatten<T>(listOfLists: T[][]): T[] {
    return listOfLists.reduce((flat, sublist) => flat.concat(sublist), []);
}

/** Merges two sorted lists of T into one sorted list of T
* @param listA The first list
* @param listB The second list
* @param comparer The comparer to use
*/
export function mergeSorted<T>(listA: T[], listB: T[], comparer: IComparer<T> = defaultComparer): T[] {
    listA = listA || [];
    listB = listB || [];
    comparer = comparer || defaultComparer;

    const merged: T[] = [];
    let a = 0;
    let b = 0;
    while (a < listA.length || b < listB.length) {
        if (a === listA.length) {
            merged.push(listB[b++]);
        } else if (b === listB.length) {
            merged.push(listA[a++]);
        } else {
            const comparison = comparer(listA[a], listB[b]);
            if (comparison <= 0) {
                merged.push(listA[a++]);
            } else {
                merged.push(listB[b++]);
            }
        }
    }
    return merged;
}


// Standard JS sorting is not stable in all browsers
// adapted from http://en.literateprograms.org/Merge_sort_%28JavaScript%29
export class StableSorter<T> {
    private scratch: T[];
    constructor(private cmpFunc: (a: T, b: T) => number) {
    }

    private msort(array, begin, end) {
        const size = end - begin;
        if (size < 2) return;

        const begin_right = begin + Math.floor(size / 2);

        this.msort(array, begin, begin_right);
        this.msort(array, begin_right, end);
        this.merge(array, begin, begin_right, end);
    }
    private merge_sort(array) {
        this.msort(array, 0, array.length);
    }
    
    private merge(array: T[], begin: number, beginRight: number, end: number): void {
        let i = begin;
        let j = beginRight;

        // merge into scratch array
        let dest = 0;
        while (i < beginRight && j < end) {
            if (this.cmpFunc(array[i], array[j]) <= 0) {
                this.scratch[dest] = array[i];
                i++;
            }
            else {
                this.scratch[dest] = array[j];
                j++;
            }
            dest++;
        }

        // copy leftovers into scratch
        while (i < beginRight) {
            this.scratch[dest] = array[i];
            dest++; i++;
        }
        while (j < end) {
            this.scratch[dest] = array[j];
            dest++; j++;
        }

        // copy out of scratch
        for (i = 0; i < end - begin; i++) {
            array[i + begin] = this.scratch[i];
        }
    }

    /**
     * Returns a copy of array that is sorted using a stable sorting routine
     * @param array
     * @return sorted array
     */
    public sort(array: T[], inPlace: boolean = true) {
        const toSort = inPlace ? array : array.slice(0);
        this.scratch = new Array(array.length);
        this.merge_sort(toSort);
        this.scratch = undefined;
        return toSort;
    }
}

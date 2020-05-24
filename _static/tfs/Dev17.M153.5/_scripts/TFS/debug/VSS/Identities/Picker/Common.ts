/**
 * @exemptedapi
 */
export class FilterByScope {
    public filterByAncestorEntityIds: string[];
    public filterByEntityIds: string[];

    constructor(filterByAncestorEntityIds?: string[], filterByEntityIds?: string[]) {
        this.filterByAncestorEntityIds = filterByAncestorEntityIds || [];
        this.filterByEntityIds = filterByEntityIds || [];
    }

    // Computes the hash for a scope object.
    // Similar to Java's hashcode implementation.
    public static GetHashCode(filterByScope: FilterByScope): number {
        var res = CommonHelpers._hashSeed;

        if (filterByScope == null) {
            return res;
        }

        // Concatenate the sorted versions of both arrays comprising the scope, with a separator in the middle (to avoid collisions).
        var entityIds: string[] = filterByScope.filterByAncestorEntityIds.sort()
            .concat([FilterByScope._hashSeparator], filterByScope.filterByEntityIds.sort());

        // Compute the aggregate hashcode function for all the strings.
        for (let str of entityIds) {
            res = res * CommonHelpers._stringListHashPrime + CommonHelpers.GetStringHashCode(str);
            // Converting to 32-bit number.
            res = res & res;
        }

        return res;
    }

    /**
    * Return true if the filterByScope is not null and the ancestorEntitityIds and entityIds arrays are empty, otherwise false.
    **/
    public static isFilterByScopeEmpty(filterByScope: FilterByScope) {
        return filterByScope
            && filterByScope.filterByAncestorEntityIds.length == 0
            && filterByScope.filterByEntityIds.length == 0;
    
    }

    // Need to ensure that the separator does not occur in entity Ids in order to avoid hash collisions. 
    private static readonly _hashSeparator = "@";
}

/**
 * @exemptedapi
 */
export class CommonHelpers {

    // Computes the hash for a string.
    // Similar to Java's hashcode implementation.
    public static GetStringHashCode(str: string) {
        var res = CommonHelpers._hashSeed

        if (str) {
            str = str.trim().toLowerCase();

            for (var i = 0; i < str.length; i++) {
                res = res * CommonHelpers._stringHashPrime + str.charCodeAt(i);
                // Converting to 32-bit number.
                res = res & res;
            }
        }

        return res;
    }

    public static GetStringListHashCode(strings: string[]) {
        var res = CommonHelpers._hashSeed

        if (strings) {
            // Compute the aggregate hashcode function for all the strings.
            for (let str in strings) {
                res = res * CommonHelpers._stringListHashPrime + CommonHelpers.GetStringHashCode(str);
                // Converting to 32-bit number.
                res = res & res;
            }
        }

        return res;
    }

    public static readonly _hashSeed = 0;
    public static readonly _stringListHashPrime = 31;
    private static readonly _stringHashPrime = 37;
}

export interface IPoint {
    x: number;
    y: number;
}
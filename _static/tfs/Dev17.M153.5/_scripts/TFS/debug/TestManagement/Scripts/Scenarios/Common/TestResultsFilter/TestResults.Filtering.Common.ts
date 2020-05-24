import * as Utils_String from "VSS/Utils/String";
import { instanceOf } from "prop-types";
import * as TestManagementResources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

/**
 * Defines the options that an individual filter provider may accept.
 */
export interface IFilterOptions {
    /**
     * Whether or not to use the 'and' operator on values in the filter.  Only applicable to a subset of filter providers.
     */
    useAndOperator?: boolean;
}

export class FilterValueItem {
    constructor(value: string | number | boolean, displayValue?: string) {
        this.value = value;
        this.displayValue = displayValue;
    }

    value: string | number | boolean;
    displayValue?: string;
}

export type FilterValue = string | number | boolean | FilterValueItem;

/**
 * Defines a filter for a filter provider.  For example, 'values' may contain 'Active' and 'New' for the state filter.
 */
export interface IFilter {

    /**
     * Set of filter values
     */
    values: FilterValue[];

    /**
     * options, if any.
     */
    options?: IFilterOptions;
}

/** Current state of filters in FilterManager */
export type FilterState = IDictionaryStringTo<IFilter>;

export interface IFilterDataSource {

    /**
     * Get all unique values from all items for a given field name
     * @param fieldName Field to get values for
     */
    getFieldValues(fieldName: string): string[] | IPromise<string[]>;

    /**
    * Gets the default filter state
    */
    getInitialFilterState(): FilterState;
    /**
    * Apply selected filters on the data source
    */
    applyFilters(filterState: FilterState);
}

export function areFilterStatesEqual(filterState1: FilterState, filterState2: FilterState): boolean {
    // This handles both null and empty
    if ($.isEmptyObject(filterState1) && $.isEmptyObject(filterState2)) {
        return true;
    } else if ($.isEmptyObject(filterState1) || $.isEmptyObject(filterState2)) {
        return false;
    }

    let keys1 = Object.keys(filterState1).sort();
    let keys2 = Object.keys(filterState2).sort();
    if (!Utils_String.equals(JSON.stringify(keys1), JSON.stringify(keys2))) {
        return false;
    }
    for (let key in filterState1) {
        if (key in filterState2) {
            let values1 = filterState1[key].values.sort(filterValueItemComparator);
        
            let values2 = filterState2[key].values.sort(filterValueItemComparator);

            if (!Utils_String.equals(JSON.stringify(values1), JSON.stringify(values2))) {
                return false;
            }

            let options1 = filterState1[key].options;
            let options2 = filterState2[key].options;
            if (!Utils_String.equals(JSON.stringify(options1), JSON.stringify(options2))) {
                return false;
            }
        }
    }
    return true;
}

export function getDisplayValue(filterValueItem: FilterValueItem): string {
    if (filterValueItem.displayValue === undefined && filterValueItem.value) {
        return filterValueItem.value.toString();
    }
    else if (filterValueItem.displayValue) {
        return filterValueItem.displayValue;
    }

    return TestManagementResources.Unspecified;
}

export function sortFilterState(filterState: FilterState) {
    if (!filterState) {
        return filterState;
    }

    for (let key in filterState) {
        let sortedFilterValues = filterState[key].values.sort(filterValueItemComparator);

        filterState[key].values = sortedFilterValues;
    }
}

function filterValueItemComparator(a: FilterValue, b: FilterValue) {
    return Utils_String.ignoreCaseComparer(getStringFromFilterValue(a), getStringFromFilterValue(b)); 
}

 function getStringFromFilterValue(filterValue: FilterValue): string {
    if (!filterValue) {
        return TestManagementResources.Unspecified;
    }
    else if (filterValue instanceof FilterValueItem) {
        return getDisplayValue(filterValue);
    }
    
    return filterValue.toString();
}
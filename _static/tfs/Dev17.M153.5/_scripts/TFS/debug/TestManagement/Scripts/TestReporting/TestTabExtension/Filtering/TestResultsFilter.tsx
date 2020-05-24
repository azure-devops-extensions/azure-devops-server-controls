import * as Q from "q";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { autobind } from "OfficeFabric/Utilities";
import { Fabric } from "OfficeFabric/Fabric";
import { SelectionMode } from "OfficeFabric/Selection";

import * as VSS from "VSS/VSS";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import { throttledDelegate } from "VSS/Utils/Core";
import { localeIgnoreCaseComparer, equals } from "VSS/Utils/String";
import { first, union } from "VSS/Utils/Array";
import { FilterBar, IFilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import {
    Filter, IFilterState as IVSSUIFilterState, FilterOperatorType, IFilterItemState, FILTER_CHANGE_EVENT, IFilter as IVSSUIFilter
} from "VSSUI/Utilities/Filter";
import { PickListFilterBarItem, IPickListItem } from "VSSUI/PickList";

import { isPromise, makePromise, IOptionalPromise } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import * as TestManagementResources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { IFilterDataSource, IFilter, FilterState, FilterValue, IFilterOptions, FilterValueItem, getDisplayValue } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";

export interface ITestResultsFilterPickListItemResult {
    item: ITestResultsFilterPickListItem;
    promise?: IPromise<ITestResultsFilterPickListItem>;
}

/**
 * Provider for filter values to be shown in filter dropdown
 */
export interface ITestResultsFilterItemProvider {
    /**
     * Returns filter values to be shown in dropdown, either as promise or array
     * @param persistedValues persisted filter values to merge into the list to be
     * shown, in case some of the persisted filter values are no longer in the original data source.
     */
    getItems(persistedValues?: FilterValue[]): IOptionalPromise<ITestResultsFilterItem[]>;

    /**
     * Resolves values to test result filter items
     * Note: the order of the input/output values is stable, though the result might not contain all
     * input values.
     */
    getItemsForValues(values: FilterValue[]): IOptionalPromise<ITestResultsFilterItem[]>;

    /**
     * Get Pick List item from the given item
     */
    getListItem(filterItem: ITestResultsFilterItem): ITestResultsFilterPickListItemResult;
}

/** Default filter value provider to be used if no custom one is set */
export class DataSourceFilterValueProvider implements ITestResultsFilterItemProvider {
    constructor(protected fieldName: string, protected dataSource: IFilterDataSource) {
    }

    getItems(persistedValues?: FilterValue[]): IOptionalPromise<ITestResultsFilterItem[]> {
        const uniqueValues = this.dataSource.getFieldValues(this.fieldName);

        if (isPromise(uniqueValues)) {
            return uniqueValues.then(r => this.transformResults(r, persistedValues));
        } else {
            return this.transformResults(uniqueValues, persistedValues);
        }
    }

    getItemsForValues(values: FilterValue[]): IOptionalPromise<ITestResultsFilterItem[]> {
        return this.transformResults(values);
    }

    getListItem(filterItem: ITestResultsFilterItem): ITestResultsFilterPickListItemResult {
        return {
            item: {
                key: filterItem.key,
                name: filterItem.display,
                value: filterItem.value
            }
        };
    }

    protected transformResults(uniqueValues: FilterValue[], persistedValues?: FilterValue[]): ITestResultsFilterItem[] {
        // copy values array before union
        let values = uniqueValues.slice(0);
        if (persistedValues) {
            persistedValues = persistedValues.filter(v => !!v);
            values = union(values, persistedValues, filterValueComparer);
        }
        return values.map(this.transformResult);
    }

    protected transformResult(result: FilterValue): ITestResultsFilterItem {
        let filterItem: ITestResultsFilterItem;
        if (result instanceof FilterValueItem) {
            let res: FilterValueItem = result;
            filterItem = {
                key: res.value,
                value: res,
                display: getDisplayValue(res)
            } as ITestResultsFilterItem;
        }
        else {
            filterItem = {
                key: result,
                value: result,
                display: (result !== Utils_String.empty) ? result : TestManagementResources.Unspecified
            } as ITestResultsFilterItem;
        }
        return filterItem;
    }
}

/**
 * Enum to represent the type of a filter on the filter bar.
 */
export enum TestResultsFilterFieldType {
    /** Text input */
    Text,

    /** Filter values will be rendered using a list with checkboxes */
    CheckboxList
}

/**
 * Defines a single field on the filter bar.
 */
export interface ITestResultsFilterField {
    displayType: TestResultsFilterFieldType;

    fieldName: string;

    placeholder: string;

    noItemsText?: string;

    /** Placeholder text for the search textbox in the picklist. Defaults to PresentationResources.FilterSearchPlaceholderText */
    searchTextPlaceholder?: string;

    showOrAndOperators?: boolean;

    valueProvider?: ITestResultsFilterItemProvider;
}

export interface ITestResultsFilterItem {
    /** Unique identifier among all items */
    key: string;

    /** String to display in filter dropdown */
    display: string;

    /** Value to filter by if selected */
    value: FilterValue;
}

/**
 * Pick list item for the test result filtering dropdown
 */
export interface ITestResultsFilterPickListItem extends IPickListItem {
    value: string | number | boolean | FilterValueItem;
}

/**
 * Properties required for the TestResultsFilter
 */
export interface ITestResultsFilterProps {
    fields: ITestResultsFilterField[];
    dataSource: IFilterDataSource;

    /** Optional VSS filter object to subscribe to, if not passed (or explicitly set as 'undefined') a new one will be created */
    filter?: IVSSUIFilter;

    /** Optional initial filter state to apply to the filter */
    initialFilterState?: FilterState;

    /** Optional value indicating whether the component should set a default filter state based on the passed in fields. Defaults to true */
    setDefaultFilter?: boolean;

    /** Optional callback to react to filter changes
     * @param filterState Current state of the filter (not only changes)
     */
    filterUpdatedCallback?(filterState: FilterState): void;

    /** Optional callback once the control has been rendered */
    onRenderComplete?: () => void;
}

/**
 * Current filter bar state.
 */
export interface ITestResultsFilterState {
    filter: IVSSUIFilter;
}

/**
 * React based class for filtering test result artifacts.
 */
export class TestResultsFilter extends React.Component<ITestResultsFilterProps, ITestResultsFilterState> {
    public static defaultProps = {
        setDefaultFilter: true
    };

    private _suppressFilterUpdatedEvent: boolean;
    private _updateThrottleDelegate: Function;
    private _filterBar: IFilterBar;
    private _resolveFilterBar = (filterBar: IFilterBar) => { this._filterBar = filterBar; };

    constructor(props: ITestResultsFilterProps, context?: any) {
        super(props, context);

        this._updateThrottleDelegate = throttledDelegate(this, 250, () => {
        });

        // Use passed in filter, or start with a new, empty filter
        const { filter = new Filter() } = this.props;
        this.state = { filter: filter };
    }

    private _subscribeToFilterChangeEvent(filter: IVSSUIFilter) {
        filter.subscribe(this._handleFilterUpdated, FILTER_CHANGE_EVENT);
    }

    private _unsubscribeFromFilterChangeEvent(filter: IVSSUIFilter) {
        filter.unsubscribe(this._handleFilterUpdated, FILTER_CHANGE_EVENT);
    }

    public componentDidMount() {
        const { filter } = this.state;
        const { fields, dataSource, initialFilterState, setDefaultFilter } = this.props;

        // Set default state for the filter
        if (setDefaultFilter) {
            filter.setDefaultState(generateDefaultFilterState(fields));
            filter.reset();
        }

        // Apply the initial state of the filter, if specified
        if (initialFilterState) {
            resolveFilterState(fields, dataSource, initialFilterState).then((resolvedFilterState) => {
                this._subscribeToFilterChangeEvent(filter);
                this.state.filter.setState(resolvedFilterState);
            }, VSS.handleError);
        } else {
            this._subscribeToFilterChangeEvent(filter);
        }

        if (this.props.onRenderComplete) {
            this.props.onRenderComplete();
        }
    }

    public componentWillUnmount() {
        const { filter } = this.state;
        if (filter) {
            this._unsubscribeFromFilterChangeEvent(filter);
        }
    }

    /**
     * Clears all filters in the UI.
     */
    public clearFilters() {
        this._suppressFilterUpdatedEvent = true;
        this.state.filter.reset();
        this._suppressFilterUpdatedEvent = false;
    }

    /**
     * Set focus to the filter bar.
     */
    public focus() {
        if (this._filterBar) {
            this._filterBar.focus();
        }
    }

    public forceUpdate() {
        super.forceUpdate();

        // simply re-rendering doesn’t work if the only thing changing
        // is the state/test result type icons since the props don’t change
        if (this._filterBar) {
            this._filterBar.forceUpdate();
        }
    }

    /**
     * Handles when we should refresh our view.  Asynchronously clears out the cached set of picklist values and causes a render.
     * This is generally called when data changes in the UI, like when the user is editing a test result on the grid, since
     * this can cause the set of allowed values showing up in the filter to change.
     */
    public update() {
        // Update can be called repeatedly on test result change events (like typing in the test result title) so
        // we want to delay re-rendering the control a bit.
        this._updateThrottleDelegate();
    }

    public render(): JSX.Element {
        const { filter } = this.state;
        const { fields } = this.props;

        const filters: JSX.Element[] = fields.map(filterField => {
            if (filterField.displayType === TestResultsFilterFieldType.Text) {
                return <KeywordFilterBarItem
                    key={filterField.fieldName}
                    filter={filter}
                    filterItemKey={filterField.fieldName}
                    placeholder={filterField.placeholder}
                />;
            } else {
                return <PickListFilterBarItem
                    key={filterField.fieldName}
                    filter={filter}
                    filterItemKey={filterField.fieldName}
                    selectionMode={SelectionMode.multiple}
                    getPickListItems={() => this._getItemsToRender(filterField.fieldName)}
                    getListItem={(item: ITestResultsFilterItem) => this._getPickListItem(filterField.fieldName, item)}
                    placeholder={filterField.placeholder}
                    noItemsText={filterField.noItemsText}
                    showOrAndOperators={filterField.showOrAndOperators}
                    showSelectAll={false}
                    isSearchable={true}
                    searchTextPlaceholder={filterField.searchTextPlaceholder || PresentationResources.FilterSearchPlaceholderText}
                />;
            }
        });

        return (
            <FilterBar
                filter={filter}
                onRenderComplete={this.props.onRenderComplete}
                componentRef={this._resolveFilterBar}>
                {filters}
            </FilterBar>
        );
    }

    /**
     * Retrieves the initial set of values to show.  These are just text, during render for the picklist 'getPickListItem' is called
     * which will return the actual data to be rendered.
     * @param fieldName Name of the field to get the unique values for
     */
    protected _getItemsToRender(fieldName: string): ITestResultsFilterItem[] {
        let itemsToRender: ITestResultsFilterItem[] = null;

        const fieldValueProvider = this._getFieldValueProvider(fieldName);
        const values = fieldValueProvider.getItems(this._getCurrentFilterValues(fieldName));

        if (isPromise(values)) {
            // Add temporary "Loading" item, this will be overwritten when the promise is resolved
            itemsToRender = [{
                key: `_${PresentationResources.Loading}`,
                display: PresentationResources.Loading,
                value: ""
            }];

            values
                .then(result => {
                    itemsToRender = result;

                    // Trigger re-render
                    this.forceUpdate();
                })
                .then(null, VSS.handleError);
        } else {
            itemsToRender = values;
        }

        return itemsToRender;
    }

    private _getCurrentFilterValues(fieldName: string): FilterValue[] {
        const filterState = mapToFilterState(this.state.filter.getState());
        if (filterState[fieldName]) {
            return filterState[fieldName].values;
        }
        return undefined;
    }

    /**
     * Called when rendering an item in a picklist.  Depending on the field different icons (etc) are rendered.
     * @param fieldName Name of the field that the value is associated with
     * @param value Value to generate a picklist entry for.
     */
    protected _getPickListItem(fieldName: string, value: ITestResultsFilterItem): ITestResultsFilterPickListItem {
        const valueProvider = this._getFieldValueProvider(fieldName);

        const result = valueProvider.getListItem(value);

        if (result.promise) {
            Q(result.promise)
                .done(() => this.forceUpdate());
        }

        return result.item;
    }

    private _getFieldValueProvider(fieldName: string): ITestResultsFilterItemProvider {
        const field = this._getField(fieldName);

        if (field && field.valueProvider) {
            return field.valueProvider;
        }

        const { dataSource } = this.props;
        return new DataSourceFilterValueProvider(fieldName, dataSource);
    }

    private _getField(fieldName: string): ITestResultsFilterField {
        const { fields } = this.props;
        return first(fields, f => equals(f.fieldName, fieldName, true));
    }

    @autobind
    private _handleFilterUpdated(changedState: IVSSUIFilterState): void {
        if (this.props.filterUpdatedCallback && !this._suppressFilterUpdatedEvent) {
            // changedState is only the last change, we need the full state
            const { filter } = this.state;
            if (filter) {
                const filterState = mapToFilterState(filter.getState());
                this.props.filterUpdatedCallback(filterState);
            }
        }
    }
}

/**
 * To be used to render a stand alone filter wrapped in a fabric element
 */
export function renderFilter(filterProps: ITestResultsFilterProps, container: HTMLElement): TestResultsFilter {
    let testResultsFilter: TestResultsFilter;
    const resolveTestResultsFilter = (component: TestResultsFilter) => {
        testResultsFilter = component;
    };

    ReactDOM.render(<Fabric>
        <TestResultsFilter ref={resolveTestResultsFilter} {...filterProps} />
    </Fabric>, container);

    return testResultsFilter;
}

/**
 * Convert a VSSF filter state to the FilterManager's state
 * @param filter VSSF filter instance
 */
export function mapToFilterState(filterState: IVSSUIFilterState): FilterState {
    const filters: IDictionaryStringTo<IFilter> = {};

    for (const filterKey in filterState) {
        const currentFilter = filterState[filterKey];
        let value: ITestResultsFilterItem | ITestResultsFilterItem[] | string = currentFilter && currentFilter.value;
        if (!!value) {
            if (typeof value === "string") {
                value = [{
                    value
                } as ITestResultsFilterItem];
            } else if (!(value instanceof Array)) {
                value = [value];
            }

            const mappedFilter = {
                values: value.map(v => v.value),
            } as IFilter;

            if (currentFilter.operator === FilterOperatorType.and) {
                mappedFilter.options = {
                    useAndOperator: true
                };
            }

            if (mappedFilter.values && mappedFilter.values.length) {
                filters[filterKey] = mappedFilter;
            }
        }
    }

    return filters;
}

/**
 * Convert FilterManager's state to the VSSF filter state
 * @param filter VSSF filter instance
 */
export function mapFromFilterState(filterState: FilterState): IVSSUIFilterState {
    const vssFilterState: IVSSUIFilterState = {};

    for (const filterKey in filterState) {
        const currentFilter = filterState[filterKey];
        if (currentFilter.values && currentFilter.values.length) {
            const filter: IFilterItemState = {
                value: currentFilter.values.map(v => ({
                    key: v,
                    value: v
                }) as ITestResultsFilterItem)
            };

            if (currentFilter.options && currentFilter.options.useAndOperator) {
                filter.operator = FilterOperatorType.and;
            } else {
                filter.operator = FilterOperatorType.or;
            }

            vssFilterState[filterKey] = filter;
        }
    }

    return vssFilterState;
}

/**
 * Generate default filter state including operators for the given list of fields
 * @param fields Fields to generate default state of
 */
export function generateDefaultFilterState(fields: ITestResultsFilterField[]): IVSSUIFilterState {
    const filterState: IVSSUIFilterState = {};

    for (const field of fields) {
        if (field.showOrAndOperators) {
            filterState[field.fieldName] = {
                value: undefined,
                operator: FilterOperatorType.or
            };
        }
    }

    return filterState;
}

/**
 * Resolve a given filterstate to a VSSUI filter state that can be used to interact with the VSSUI filter
 * @param fields Filter fields that provide filter value providers
 * @param dataSource Filter data source
 * @param filterState Filter state to resolve
 */
export function resolveFilterState(fields: ITestResultsFilterField[], dataSource: IFilterDataSource, filterState: FilterState): IPromise<IVSSUIFilterState> {
    const promises: IPromise<{ field: ITestResultsFilterField; values: ITestResultsFilterItem[] | string; options: IFilterOptions; }>[] = [];

    for (const fieldName in filterState) {
        const filter = filterState[fieldName];
        const field = first(fields, f => f.fieldName === fieldName);

        if (field) {
            if (field.displayType === TestResultsFilterFieldType.Text) {
                if (filter.values && filter.values.length === 1) {
                    promises.push(makePromise({
                        field,
                        values: String(first(filter.values)),
                        options: filter.options
                    }));
                }
            } else {
                const valueProvider = field.valueProvider;
                if (valueProvider) {
                    const result = valueProvider.getItemsForValues(filter.values);
                    promises.push(makePromise(result).then(values => ({
                        field,
                        values,
                        options: filter.options
                    })));
                } else {
                    // Use default value provider
                    const fieldValueProvider = new DataSourceFilterValueProvider(fieldName, dataSource);
                    promises.push(makePromise(fieldValueProvider.getItemsForValues(filter.values)).then(values => ({
                        field,
                        values,
                        options: filter.options
                    })));
                }
            }
        }
    }

    return Q.all(promises).then(results => {
        // Start with the default state so that we get the correct operators and then extend it
        const resolvedFilterState: IVSSUIFilterState = generateDefaultFilterState(fields);

        for (const { field, values, options } of results) {
            let operator: FilterOperatorType = undefined;

            if (field.showOrAndOperators) {
                operator = (options && options.useAndOperator) ? FilterOperatorType.and : FilterOperatorType.or;
            }

            resolvedFilterState[field.fieldName] = {
                value: values,
                operator: operator
            };
        }

        return resolvedFilterState;
    });
}

export const filterValueComparer: IComparer<FilterValue>
    = (a: FilterValue, b: FilterValue): number => {
        if (typeof a === "string" && typeof b === "string") {
            return localeIgnoreCaseComparer(a, b);
        }
        return Utils_Number.defaultComparer(a, b);
    };

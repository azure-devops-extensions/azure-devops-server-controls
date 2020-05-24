import { convertValueToDisplayString } from "VSS/Utils/Core";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { Debug } from "VSS/Diag";
import { IFilterProvider, IFilterDataSource, IFilter } from "WorkItemTracking/Scripts/Filtering/FilterManager";

export class FieldFilterProvider implements IFilterProvider {
    private _fieldName: string;
    protected _filterValueMap: IDictionaryStringTo<boolean>;
    protected _dataProvider: IFilterDataSource;
    protected _filter: IFilter;

    constructor(fieldName: string) {
        this._fieldName = fieldName;
        this._filterValueMap = {};
    }

    public bind(dataProvider: IFilterDataSource) {
        this._dataProvider = dataProvider;
    }

    public setFilter(filter: IFilter) {
        this._filter = filter;
        this._filterValueMap = {};

        if (filter && filter.values && filter.values.length) {
            for (const filterValue of filter.values) {
                const text = convertValueToDisplayString(filterValue);

                this._filterValueMap[text] = true;
            }
        }
    }

    public getFilter(): IFilter {
        return this._filter;
    }

    public clearFilters() {
        this._filterValueMap = {};
    }

    public dataUpdated() {
        // Noop for this provider.
    }

    public getMatchingItems(items: number[]): number[] {
        Debug.assert(this.isFiltering(), "must be filtering before calling getMatchingItems");

        if (items === null) {
            // Null items means process all work items.
            items = this._dataProvider.getIds();
        }

        const matchingIds: number[] = [];

        for (const item of items) {
            const value = this._dataProvider.getValue(item, this._fieldName);
            if (this.matchesFilter(value)) {
                matchingIds.push(item);
            }
        }

        return matchingIds;
    }

    public isFiltering(): boolean {
        return !!this._filterValueMap && Object.keys(this._filterValueMap).length > 0;
    }

    protected matchesFilter(value: any): boolean {
        Debug.assert(this._fieldName !== CoreFieldRefNames.Tags, "Use the TagFilterProvider to filter on tags");

        const text = convertValueToDisplayString(value);

        if (text in this._filterValueMap) {
            return true;
        }

        return false;
    }
}

import { getService as getSettingsService, ISettingsService, SettingsUserScope } from "VSS/Settings/Services";
import { throttledDelegate } from "VSS/Utils/Core";
import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";

const FilterSaveDelayInMs = 1000;

/**
 * Manages the persistence of the filter state.
 */
export class FilterStateManager {
    constructor(private _scopeId: string, private _registryKey: string, private _filterState: FilterState, private _scopeName: string = "Project") { }

    public saveFilter(filters: FilterState): void {
        this._filterState = filters;
        this._saveFilterThrottleDelegate();
    }

    public setFilterState(filters: FilterState): void {
        this._filterState = filters;
    }

    public resetFilter(): void {
        this.saveFilter({});
    }

    public getFilterState(): FilterState {
        return this._filterState;
    }

    private _saveFilterThrottleDelegate = throttledDelegate(this, FilterSaveDelayInMs, () => {
        const settingsClient: ISettingsService = getSettingsService();
        const entries: IDictionaryStringTo<any> = { [this._registryKey]: this._filterState };
        settingsClient.setEntries(entries, SettingsUserScope.Me, this._scopeName, this._scopeId);
    });
}

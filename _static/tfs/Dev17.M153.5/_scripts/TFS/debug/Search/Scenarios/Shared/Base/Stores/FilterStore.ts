import * as _Filter from "SearchUI/Utilities/Filter";
import * as Settings from "VSS/Settings";
import { SettingsStore } from "Search/Scenarios/Shared/Base/Stores/SettingsStore";

export enum FilterType {
    PickList,

    Path,

    Branch
}

export interface FilterItem {
    filterType: FilterType;

    enabled: boolean;

    visible: boolean;
}

export interface FilterStoreState {
    filterItems: {
        [id: string]: FilterItem
    };

    filter: _Filter.Filter;

    filterItemsVisible: boolean;
}

const SearchPageFilterPaneVisibilityKey = "vss-search-platform/FilterPane.IsVisible";

export class FilterStore extends SettingsStore<boolean> {
    protected _state: FilterStoreState = { filterItems: {} } as FilterStoreState;

    constructor(
        private readonly filter: _Filter.Filter,
        settingsService?: Settings.LocalSettingsService) {
        super(SearchPageFilterPaneVisibilityKey, settingsService);

        this._state.filter = filter;
        this._state.filterItemsVisible = this.readSetting(true);
    }

    public get state(): FilterStoreState {
        return this._state;
    }

    public changeFilterPaneVisibility = (visible: boolean) => {
        this._state.filterItemsVisible = visible;
        this.writeSetting(visible);
        this.emitChanged();
    }
}
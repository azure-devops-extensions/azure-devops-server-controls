import * as _SortOptions from "SearchUI/SortOptions";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as Settings from "VSS/Settings";
import { SettingsStore } from "Search/Scenarios/Shared/Base/Stores/SettingsStore";
import { SortOptionsStoreState } from "Search/Scenarios/Shared/Base/Stores/SortOptionsStore";
import { SortOptionChangedPayload } from "Search/Scenarios/Shared/Base/ActionsHub";
import { SearchStartedPayload } from "Search/Scenarios/Shared/Base/ActionsHub";
import { SearchQuery, CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";;
import { SortActionIds } from "Search/Scenarios/Code/Constants";

const SortOptionSettingKey = "vss-search-platform/code/SortOption";

export class SortOptionsStore extends SettingsStore<_SearchSharedContracts.EntitySortOption> {
    private _state: SortOptionsStoreState = {} as SortOptionsStoreState;

    constructor(settingsService?: Settings.LocalSettingsService) {
        super(SortOptionSettingKey, settingsService);
        this._state.sortOption = this.readSetting(this.relevanceSortOption);
    }

    public get state(): SortOptionsStoreState {
        return this._state;
    }

    public changeSortOption = (payload: SortOptionChangedPayload<CodeResult>) => {
        const { sortOption } = payload;

        this._state.sortOption = sortOption;
        this.writeSetting(this._state.sortOption);
        this.emitChanged();
    }

    public updateSortOptionOnSearch = (payload: SearchStartedPayload<SearchQuery>) => {
        if (payload.sortScenario) {
            const { sortOptions } = payload.query;
            this._state.sortOption = sortOptions && sortOptions.length
                ? sortOptions[0]
                : this.relevanceSortOption;

            this.writeSetting(this._state.sortOption);
            this.emitChanged();
        }
    }

    public get availableSortFields(): _SortOptions.SortField[] {
        return [
            { key: SortActionIds.Relevance, name: Resources.RelevanceSortOption },
            { key: SortActionIds.FilePath, name: Resources.FilePathSortOption },
            { key: SortActionIds.FileName, name: Resources.FileNameSortOption }
        ];
    }

    public changeSortOptionVisibility = (isVisible: boolean) => {
        this._state.isVisible = isVisible;
        this.emitChanged();
    }

    private get relevanceSortOption() {
        return {
            field: SortActionIds.Relevance,
            sortOrder: SortActionIds.Descending
        };
    }
}
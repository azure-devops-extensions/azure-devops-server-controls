import * as Diag from "VSS/Diag";
import { Async, autobind } from "OfficeFabric/Utilities";
import { DirectoryPivotType, FilterConstants } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { getService } from "VSS/Service";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { TestPlansHubSettingsService } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/SettingsService";

export const FILTER_THROTTLE_DELAY = 1000;

/**
 * Manages the persistence of an IFilterState.
 */
export class TestPlanFilterStateStorage {
    private _projectId: string;
    private _hubName: string;
    private _pivotName: string;
    private _asyncContext: Async;
    private _throttledSaveFilter: (filterState: IFilterState, serializedFilter: string) => void;

    /**
     * Create a new filter storage manager
     * @param pivotName The current pivot name
     */
    constructor(pivotName: string) {
        this._pivotName = pivotName;

        this._asyncContext = new Async();
        this._throttledSaveFilter = this._asyncContext.throttle(this._saveFilterState, FILTER_THROTTLE_DELAY);
    }

    /**
     * Save a filter state to the server
     * @param filterState The filter state to save
     */
    public saveFilterStateToServer(filterState: IFilterState): void {
        // Note that if  specifying onSaveCallback, we will save the state immediatelly (it is not throttled)
        const { success, serializedFilter } = this._serializeFilter(filterState);

        if (success) {
            this._throttledSaveFilter(filterState, serializedFilter);
        }
    }

    private _serializeFilter(filterState: IFilterState): { success: boolean, serializedFilter: string } {
        let success = true;
        let serializedFilter: string;
        try {
            serializedFilter = JSON.stringify(filterState || {});
        } catch (error) {
            Diag.logError(`TestPlanFilter serialization failed with herror ${error}`);
        }

        return {
            success,
            serializedFilter
        };
    }

    @autobind
    private _saveFilterState(filterState: IFilterState, serializedFilter: string): void {
        getService(TestPlansHubSettingsService)
            .setFilterState(this._pivotName as DirectoryPivotType, serializedFilter);
    }

    private _getComponentName(): string {
        return `${this._hubName}_${this._pivotName}`;
    }
}

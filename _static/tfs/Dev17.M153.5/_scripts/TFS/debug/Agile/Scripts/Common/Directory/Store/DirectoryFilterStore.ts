import { DirectoryActions } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActions";
import { IDirectoryData } from "Agile/Scripts/Common/Directory/DirectoryContracts";
import { DirectoryPivotType } from "Agile/Scripts/Common/DirectoryPivot";
import { IStore, Store } from "VSS/Flux/Store";
import { IFilter, IFilterState } from "VSSUI/Utilities/Filter";
import { mapToFilterState } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { isFilterStateEmpty } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { IViewOptions } from "VSSUI/Utilities/ViewOptions";
import { HubViewOptionKeys } from "VSSUI/Utilities/HubViewState";

export interface IDirectoryFilterStore extends IStore {
    /** The filter for the all directory pivot */
    readonly allFilter: IFilterState;
    /** The filter for the my directory pivot */
    readonly myFilter: IFilterState;
    /** Is the filter data initialized for the all directory pivot */
    readonly isAllFilterInitialized: boolean;
    /** Is the filter data initialized for the my directory pivot */
    readonly isMyFilterInitialized: boolean;

    /**
     * Is the filter active
     * @param filterState The filter to check
     */
    isFilterActive: (filterState: IFilterState) => boolean;

    /**
     * Checks to see if the provided filter is newer than the saved filter
     * @param filterState The new filter
     * @param pivot The active pivot
     */
    shouldUpdateFilter: (filterState: IFilterState, pivot: DirectoryPivotType) => boolean;
}

/**
 * Store which manages the filter state, filter bar, and persistence for directory pages
 */
export class DirectoryFilterStore extends Store implements IDirectoryFilterStore {
    private _actionsHub: DirectoryActions;
    private _hubFilter: IFilter;
    private _hubViewOptions: IViewOptions;
    private _currentPivot: DirectoryPivotType;

    // Data
    private _allFilterState: IFilterState;
    private _allFilterInitialized: boolean;

    private _myFilterState: IFilterState;
    private _myFilterInitialized: boolean;

    public get isAllFilterInitialized(): boolean {
        return this._allFilterInitialized;
    }

    public get isMyFilterInitialized(): boolean {
        return this._myFilterInitialized;
    }

    public get allFilter(): IFilterState {
        return this._allFilterState;
    }

    public get myFilter(): IFilterState {
        return this._myFilterState;
    }

    public isFilterActive(filterState: IFilterState): boolean {
        return !isFilterStateEmpty(mapToFilterState(filterState));
    }

    public shouldUpdateFilter(filterState: IFilterState, pivot: DirectoryPivotType): boolean {
        if (pivot !== this._currentPivot) {
            return false;
        }

        if (pivot === DirectoryPivotType.all) {
            return !this._hubFilter.statesAreEqual(filterState, this._allFilterState);
        } else {
            return !this._hubFilter.statesAreEqual(filterState, this._myFilterState);
        }
    }

    constructor(actionsHub: DirectoryActions, hubFilter: IFilter, hubViewOptions: IViewOptions, initialPivot: DirectoryPivotType) {
        super();
        this._actionsHub = actionsHub;
        this._hubFilter = hubFilter;
        this._hubViewOptions = hubViewOptions;
        this._currentPivot = initialPivot;

        this._myFilterState = {};
        this._allFilterState = {};

        this._allFilterInitialized = false;
        this._myFilterInitialized = false;

        // Register actions
        this._actionsHub.allDataAvailableAction.addListener(this._handleAllDataAvailableAction);
        this._actionsHub.myDataAvailableAction.addListener(this._handleMyDataAvailableAction);
        this._actionsHub.filterChanged.addListener(this._handleOnFilterChanged);
        this._actionsHub.pivotChanged.addListener(this._handlePivotChanged);
    }

    private _handleAllDataAvailableAction = (payload: IDirectoryData): void => {
        const filterState: IFilterState = payload.filterState;
        this._allFilterState = filterState;

        this._allFilterInitialized = true;

        if (this._currentPivot === DirectoryPivotType.all) {
            this._setHubFilterState(this._allFilterState);
            if (this.isFilterActive(filterState)) {
                this._hubViewOptions.setViewOption(HubViewOptionKeys.showFilterBar, true);
            }
        }

        this.emitChanged();
    }

    private _handleMyDataAvailableAction = (payload: IDirectoryData): void => {
        const filterState: IFilterState = payload.filterState;
        this._myFilterState = filterState;

        this._myFilterInitialized = true;

        if (this._currentPivot === DirectoryPivotType.mine) {
            this._setHubFilterState(this._myFilterState);
            if (this.isFilterActive(filterState)) {
                this._hubViewOptions.setViewOption(HubViewOptionKeys.showFilterBar, true);
            }
        }

        this.emitChanged();
    }

    private _handleOnFilterChanged = (filterState: IFilterState): void => {
        const newFilterState = this._hubFilter.getState();
        if (this._currentPivot === DirectoryPivotType.all) {
            this._allFilterState = newFilterState;
        }

        if (this._currentPivot === DirectoryPivotType.mine) {
            this._myFilterState = newFilterState;
        }

        this.emitChanged();
    }

    private _handlePivotChanged = (pivotType: DirectoryPivotType): void => {
        this._currentPivot = pivotType;
        if (pivotType === DirectoryPivotType.all && this._allFilterInitialized) {
            this._setHubFilterState(this._allFilterState);
        }

        if (pivotType === DirectoryPivotType.mine && this._myFilterInitialized) {
            this._setHubFilterState(this._myFilterState);
        }

        this.emitChanged();
    }

    private _setHubFilterState(filterState: IFilterState): void {
        this._hubFilter.setState(filterState);
    }
}
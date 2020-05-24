import { Filter, FILTER_CHANGE_EVENT, IFilter, IFilterItemState, IFilterState } from "VSSUI/Utilities/Filter";
import { HubViewOptionKeys } from "VSSUI/Utilities/HubViewState";
import { IPickListItem } from "VSSUI/PickList";
import { autobind } from "OfficeFabric/Utilities";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import * as Diag from "VSS/Diag";

import {
    TestPlanDirectoryActionsCreator
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/TestPlanDirectoryActionsCreator";
import {
    TestPlanDirectoryViewState
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/TestPlanHubViewState";
import {
    ITestPlanDirectoryFilterBar,
    TestPlanDirectoryFilterBar
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/TestPlanDirectoryFilterBar";
import {
    IDirectoryPivot,
    ITestPlanFilterField,
    DirectoryPivotType,
    Filters,
    TestPlanFilterFieldType,
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { TestPlanFilterStateStorage } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Sources/TestPlanFilterStateStorage";

export class TestPlanFilterManager {

    private _allPivotFilter: IFilter;
    private _allPivotFilterInitialized: boolean;

    private _minePivotFilter: IFilter;
    private _minePivotFilterInitialized: boolean;

    private _currentPivot: DirectoryPivotType;
    private _actionsCreator: TestPlanDirectoryActionsCreator;
    private _hubView: TestPlanDirectoryViewState;

    private _skipOnFilterChanged: boolean;

    private _allFilterStateStorage: TestPlanFilterStateStorage;
    private _mineFilterStateStorage: TestPlanFilterStateStorage;

    private _filterHasChanged: boolean;
    private _nextFilterChangeIsNotFromUser: boolean;

    constructor(
        actionsCreator: TestPlanDirectoryActionsCreator,
        hubViewState: TestPlanDirectoryViewState,
        currentPivot: DirectoryPivotType) {

        this._resetInternalFilters();
        this._initializeInternals(actionsCreator, hubViewState);
        this._currentPivot = currentPivot;
    }

    public getFilter(): IFilter {
        this._hubView.getCurrentUrl();
        return this._hubView.filter;
    }

    public getCurrentPivot(): DirectoryPivotType {
        return this._currentPivot;
    }

    public isFilterOn(activeFilter: IFilter): boolean {
        let isFilterOn: boolean = false;

        for (const filterItem of Filters.Items) {
            const filterItemState: IFilterItemState = activeFilter.getFilterItemState(filterItem.fieldName);
            isFilterOn = isFilterOn || this.isFilterItemStateOn(filterItemState, filterItem.displayType);
        }
        return isFilterOn;
    }

    public isFilterStateOn(filterState: IFilterState): boolean {
        let isFilterStateOn: boolean = false;

        for (const filterItem of Filters.Items) {
            if (filterState.hasOwnProperty(filterItem.fieldName)) {

                isFilterStateOn = isFilterStateOn || this.isFilterItemStateOn(filterState[filterItem.fieldName], filterItem.displayType);

                if (isFilterStateOn) {
                    return isFilterStateOn;
                }
            }
        }
        

        return isFilterStateOn;
    }

    public isPivotFilterInitialized(pivot: DirectoryPivotType): boolean {
        return this._getPivotValue<boolean>(
            pivot,
            "isPivotFilterInitialized",
            () => this._allPivotFilterInitialized,
            () => this._minePivotFilterInitialized);
    }

    public getSelectedFilterItemValue(filter: IFilter, field: ITestPlanFilterField): string[] | string {

        let filterValue: string[] | string = null;

        switch (field.displayType) {
            case TestPlanFilterFieldType.Text:
                const filterTextValue: string = filter.getFilterItemValue(field.fieldName) as string;
                filterValue =  (filterTextValue && filterTextValue.length > 0) ? filterTextValue : null;
                break;
            case TestPlanFilterFieldType.CheckboxList:
                const filterListValue: IPickListItem[] = filter.getFilterItemValue(field.fieldName) as IPickListItem[];
                filterValue = (filterListValue && filterListValue.length > 0) ? filterListValue.map((item) => item.key) : null;
                break;

        }

        return filterValue;
    }

    public getAndResetUserChangedFilter() {
        const filterHasChanged = this.getUserChangedFilter();
        this._filterHasChanged = false;

        return filterHasChanged;
    }

    public getUserChangedFilter(): boolean {
        return this._filterHasChanged;
    }

    public setCurrentPivot(pivot: DirectoryPivotType) {
        this._setSkipOnFilterChanged();
        this._nextFilterChangeIsNotFromUser = true;

        try {
            const newFilterState: IFilterState = this._getPivotValue<IFilterState>(
                pivot,
                "setCurrentPivot",
                () => this._allPivotFilter.getState(),
                () => this._minePivotFilter.getState());

            if (newFilterState) {
                this._currentPivot = pivot;
                this._updateHubViewFilterState(newFilterState);
            }

        } finally {
            this._resetSkipOnFilterChanged();
        }
    }

    public initializePivotFilterState(
        pivot: DirectoryPivotType,
        stringifyFilterState: string): void {

        let newFilterState: IFilterState = null;
        const paramFilterState: IFilterState = this._parseIFilterState(stringifyFilterState);

        if (paramFilterState) {
            newFilterState = paramFilterState;
        }

        if (newFilterState) {
            this._setPivotFilterState(
                pivot,
                newFilterState,
                newFilterState);
        }

        this._setFilterInitialized(pivot);
    }

    /**
     * Updates this class' state by first resetting it to its initial state after
     * the class was instantiated, and then updating it with the parameters provided.
     * @param actionsCreator The new actions creator instance to use in this class.
     * @param hubViewState The new hub view state instance to use in this class.
     * @param currentPivot The new current pivot to use in this class.
     */
    public update(
        actionsCreator: TestPlanDirectoryActionsCreator,
        hubViewState: TestPlanDirectoryViewState,
        currentPivot: DirectoryPivotType) {

        this._resetToUninitializedState();
        this._initializeInternals(actionsCreator, hubViewState);
        this.setCurrentPivot(currentPivot);
    }

    public dispose() {
        this._resetToUninitializedState();
    }

    //
    //  private methods.
    //

    @autobind
    private _onFilterChanged(filterState: IFilterState) {
        //  Putting the logic in a separate method for unit-testing purposes.
        this._onFilterChangedLogic(filterState);
    }

    private _setSkipOnFilterChanged() {
        this._skipOnFilterChanged = true;
    }

    private isFilterItemStateOn(filterItemState: IFilterItemState, displayType: TestPlanFilterFieldType): boolean {
        let isFilterItemStateOn: boolean = false;

        if (filterItemState && filterItemState.value) {

            switch (displayType) {

                case TestPlanFilterFieldType.Text:
                    isFilterItemStateOn = ((filterItemState.value as string).length > 0);
                    break;

                case TestPlanFilterFieldType.CheckboxList:
                    isFilterItemStateOn = (Object.keys(filterItemState.value).length > 0);
                    break;
            }
        }

        return isFilterItemStateOn;
    }

    private _getPivotFilter(pivot: DirectoryPivotType): IFilter {

        return this._getPivotValue<IFilter>(
            pivot,
            "_getPivotFilter",
            () => this._allPivotFilter,
            () => this._minePivotFilter);
    }

    private _getCurrentPivotFilter(): IFilter {
        return this._getPivotFilter(this._currentPivot);
    }

    private _getFilterState(): IFilterState {
        return this._hubView.filter.getState();
    }

    private _initializeInternals(
        actionsCreator: TestPlanDirectoryActionsCreator,
        hubViewState: TestPlanDirectoryViewState): void {
        this._actionsCreator = actionsCreator;
        this._hubView = hubViewState;
        this._hubView.filter.subscribe(this._onFilterChanged, FILTER_CHANGE_EVENT);
        this._allFilterStateStorage = new TestPlanFilterStateStorage(DirectoryPivotType.all);
        this._mineFilterStateStorage = new TestPlanFilterStateStorage(DirectoryPivotType.mine);
    }

    private _resetInternalFilters(): void {
        this._allPivotFilter = new Filter();
        this._allPivotFilterInitialized = false;

        this._minePivotFilter = new Filter();
        this._minePivotFilterInitialized = false;

        this._skipOnFilterChanged = false;

        this._nextFilterChangeIsNotFromUser = false;
        this._filterHasChanged = false;
    }

    private _setPivotFilterState(
        pivot: DirectoryPivotType,
        filterState: IFilterState,
        defaultFilterState?: IFilterState): void {

        const filter: IFilter = this._getPivotFilter(pivot);

        filter.setState(filterState);

        if (defaultFilterState) {
            filter.setDefaultState(defaultFilterState);
        }

        if (pivot === this._currentPivot) {
            //  Need to keep the hub view's filter in sync with the current pivot's filter.
            this._updateHubViewFilterState(filterState);
        }
    }

    private _setFilterInitialized(pivot: DirectoryPivotType) {

        this._doPivotAction(
            pivot,
            "_setFilterInitialized",
            () => {
                this._allPivotFilterInitialized = true;
            },
            () => {
                this._minePivotFilterInitialized = true;
            });
    }

    /**
     * Handles the onFilterChanged event.
     * @param filterState The new filter state.
     */
    private _onFilterChangedLogic(filterState: IFilterState): void {

        const filterInitialized = this._currentPivot === DirectoryPivotType.all ? this._allPivotFilterInitialized : this._minePivotFilterInitialized;

        if (!this._nextFilterChangeIsNotFromUser && filterInitialized) {
            this._filterHasChanged = true;
            if (filterState) {
                TelemetryService.publishEvents(TelemetryService.featureNewTestPlan_FilterClick, {
                    "Tab": this._currentPivot,
                    "FilterKey": Object.keys(filterState)[0]
                });
            }
        } else {
            this._nextFilterChangeIsNotFromUser = false;
        }

        if (this._reactToFilterChanged()) {
            this._saveFilterState();
            this._actionsCreator.filterPivotItems(
                this._currentPivot,
                filterState);
        }
    }

    /**
     *  Returns a value indicating whether or not this class should react to changes on the hub view filter's state.
     *  Reasons to ignore filter state changes:
     *  1. If the filter hasn't been initialized. This avoids overwriting a saved filter's state with an empty one
     *     and filtering items on the store unnecessarily.
     *  2. If requested explicitly by using the _skipOnFilterChanged flag.
     */
    private _reactToFilterChanged(): boolean {
        return (
            this._isFilterInitialized() &&
            !this._skipOnFilterChanged);
    }

    private _resetToUninitializedState() {

        this._resetInternalFilters();

        this._currentPivot = null;
        this._actionsCreator = null;

        if (this._hubView) {
            this._hubView.filter.unsubscribe(this._onFilterChanged);
        }

        this._hubView = null;
        this._allFilterStateStorage = null;
        this._mineFilterStateStorage = null;
    }

    private _updateHubViewFilterState(newFilterState: IFilterState) {
        this._hubView.filter.setState(newFilterState);
        this._hubView.viewOptions.setViewOption(HubViewOptionKeys.showFilterBar, this.isFilterStateOn(newFilterState));
    }

    /**
     *  Returns a value indicating whether or not to persist the filter state for the pivot at the server side.
     */
    private _shouldPersistFilterState(pivot: DirectoryPivotType): boolean {

        const pivotFilter: IFilter = this._getPivotFilter(pivot);
        return pivotFilter.hasChangesToReset();
    }

    private _isFilterInitialized(): boolean {

        return this._getPivotValue<boolean>(
            this._currentPivot,
            "_isFilterInitialized",
            () => this._allPivotFilterInitialized,
            () => this._minePivotFilterInitialized);
    }

    private _saveFilterState(): void {

        const filterStateToSave: IFilterState = this._getFilterState();
        const currentPivot: DirectoryPivotType = this._currentPivot;

        //  Update current pivot's filter state.
        this._getCurrentPivotFilter().setState(filterStateToSave);

        //  Save filter state in registry key.
        this._saveState(currentPivot, filterStateToSave);
    }

    private _saveState(pivot: DirectoryPivotType, state: IFilterState): void {

        if (this._shouldPersistFilterState(pivot)) {
            this._persistFilterState(pivot, state);
        }
    }

    private _persistFilterState(pivot: DirectoryPivotType, state: IFilterState) {
        this._doPivotAction(
            pivot,
            "_persistFilterState",
            () => this._allFilterStateStorage.saveFilterStateToServer(state),
            () => this._mineFilterStateStorage.saveFilterStateToServer(state)
        );
    }

    private _parseIFilterState(stringifyVersion: string): IFilterState {
        let result: IFilterState = null;

        if (stringifyVersion && stringifyVersion.length > 0) {
            try {
                result = JSON.parse(stringifyVersion);
            } catch (error) {
                Diag.logError(`TestPlanFilter parsing failed with error ${error}`);
            }
        }

        return result;
    }

    private _resetSkipOnFilterChanged() {
        this._skipOnFilterChanged = false;
    }

    private _getPivotValue<T>(
        pivot: DirectoryPivotType,
        source: string,
        allPivotAction: () => T,
        minePivotAction: () => T) {

        let result: T = null;

        switch (pivot) {
            case DirectoryPivotType.all:
                result = allPivotAction();
                break;
            case DirectoryPivotType.mine:
                result = minePivotAction();
                break;
        }

        return result;
    }

    private _doPivotAction(
        pivot: DirectoryPivotType,
        source: string,
        allPivotAction: () => void,
        minePivotAction: () => void) {

        switch (pivot) {
            case DirectoryPivotType.all:
                allPivotAction();
                break;
            case DirectoryPivotType.mine:
                minePivotAction();
                break;
        }
    }
}

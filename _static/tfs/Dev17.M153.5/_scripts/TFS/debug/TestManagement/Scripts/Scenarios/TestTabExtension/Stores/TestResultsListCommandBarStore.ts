/// <reference types="jquery" />
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { FilterState } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import {
    TestResultSelectionChange,
    TestResultsGridActionsHub,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsGridActionsHub";
import {
    TestResultsListToolbarActionsHub,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsListToolbarActionsHub";
import { areFilterStatesEqual } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import { FilterHelper } from "TestManagement/Scripts/Scenarios/TestTabExtension/CommonHelper";
import { TestResultsStore } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/TestResultsGridTreeStore";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as TCMPermissionUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.PermissionUtils";
import * as ComponentBase from "VSS/Flux/Component";
import { Store } from "VSS/Flux/Store";
import { delegate } from "VSS/Utils/Core";
import { ITestResultTreeData } from "TestManagement/Scripts/Scenarios/Common/Common";

export interface IToolBarState extends ComponentBase.State {
    groupBy: string;
    disableBug: boolean;
    hasCreateWorkItemPermission: boolean;
    isFilterBarEnabled: boolean;
    filterState: FilterState;
    isFilterApplied: boolean;
    isInProgressView: boolean;
    isReloadButtonEnabled: boolean;
}

export class TestResultsListCommandBarStore extends Store {

    constructor(private _actionsHub: TestResultsGridActionsHub, private _commandListActionHub: TestResultsListToolbarActionsHub, private _testResultsStore: TestResultsStore, private _context?: Common.IViewContextData) {
        super();
        this._isCreateBugPermisionPresent = TCMPermissionUtils.PermissionUtils.hasCreateWorkItemPermission(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId);
        this._state = this._getDefaultState();
        this._state.isInProgressView = _context ? _context.status === Common.ViewContextStatus.InProgress : false;

        // Enabling View more tests button by default for the first time if we are in in-progress view.
        // TODO: Remove this and initialize the TestResultsListCommandBarStore as part of createView in build/release extensions.
        if (this._state.isInProgressView) {
            this._state.isReloadButtonEnabled = true;
        }

        this._actionsHub.onTestResultSelectionChanged.addListener(delegate(this, this._testResultSelected));
        this._actionsHub.onGroupByChanged.addListener(delegate(this, this._updateGroupBy));
        this._actionsHub.filterChanged.addListener(delegate(this, this._onFilterUpdated));
        this._actionsHub.isInProgressView.addListener(delegate(this, this._onInProgressView));
        this._actionsHub.enableReloadButton.addListener(delegate(this, this._enableReloadButton));
        this._commandListActionHub.onToggleFilter.addListener(delegate(this, this._toggleFilterState));
        this._testResultsStore.addChangedListener(delegate(this, this._onTestResultsStoreChange));
    }

    private _onFilterUpdated(filterState: FilterState) {
        this._toggleFilterApplied(filterState);

        // Not doing emit changed as this will rerender the control.
        this._state.filterState = filterState;
    }

    private _toggleFilterApplied(filterState: FilterState) {
        const filterApplied = !this.isFilterStateEmpty(filterState);
        if (filterApplied === this._state.isFilterApplied) {
            return;
        }

        this._state.isFilterApplied = filterApplied;
        this.emitChanged();
    }

    private _toggleFilterState() {
        this._state.isFilterBarEnabled = !this._state.isFilterBarEnabled;
        if (this._context) {
            TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_FilterButtonClicked, { "filterActive": this._state.isFilterBarEnabled });
        }

        this.emitChanged();
    }

    private _onTestResultsStoreChange = (): void => {
        const isInitialFilterState: boolean = areFilterStatesEqual(this._state.filterState, FilterHelper.getInitialFilterState());
        const resultState = this._testResultsStore.getState();
        if (resultState.results.length === 0 && isInitialFilterState && !this._state.isInProgressView) {
            this._state.isFilterBarEnabled = true;
        }
        this._disableBugIfNoTestCaseRow();
        this.emitChanged();
    }

    private _disableBugIfNoTestCaseRow() {
        const resultState = this._testResultsStore.getState();
        let allNotTestCaseRow: boolean = true;
        resultState.selection.getSelection().forEach(selectionObject => {
            const selectionTreeObject: ITestResultTreeData = selectionObject as ITestResultTreeData;
            if (selectionTreeObject.isTestCaseRow) {
                this._state.disableBug = false;
                allNotTestCaseRow = false;
            }
        });
        if (allNotTestCaseRow) {
            this._state.disableBug = true;
        }
    }

    private _onInProgressView(isInProgress: boolean) {
        this._state.isInProgressView = isInProgress;

        this.emitChanged();
    }

    private _testResultSelected(testResultSelected: TestResultSelectionChange) {
        this._state.disableBug = !this._isCreateBugPermisionPresent || !testResultSelected.selection.isTestCaseRow;
        this._disableBugIfNoTestCaseRow();
        this.emitChanged();
    }

    private _enableReloadButton(isReloadButtonEnabled: boolean) {
        this._state.isReloadButtonEnabled = isReloadButtonEnabled;

        this.emitChanged();
    }

    private _updateGroupBy(groupBy: string) {
        this._state.groupBy = groupBy;
        this._state.disableBug = true;

        this.emitChanged();
    }

    // Returning default state. By default filter bar is not shown.
    private _getDefaultState(): IToolBarState {
        return {
            groupBy: Common.TestResultsGroupPivots.Group_By_Test_Run,
            disableBug: !this._isCreateBugPermisionPresent || true,
            hasCreateWorkItemPermission: this._isCreateBugPermisionPresent,
            isFilterBarEnabled: false,
            isFilterApplied: true,
            filterState: FilterHelper.getInitialFilterState(),
            isInProgressView: false,
            isReloadButtonEnabled: false,
        } as IToolBarState;
    }

    private isFilterStateEmpty(filterState: FilterState) {
        for (let filter in filterState) {
            if (filterState.hasOwnProperty(filter)) {
                return false;
            }
        }

        return true;
    }

    public getState() {
        return this._state;
    }

    private _state: IToolBarState;
    private _isCreateBugPermisionPresent = true;
}

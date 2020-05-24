/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/TestTabExtension/ControllerViews/TestResultsListToolbar";

import { CommandBar } from "OfficeFabric/CommandBar";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { IIconProps } from "OfficeFabric/Icon";
import { autobind } from "OfficeFabric/Utilities";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as Q from "q";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { FilterActionHub } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Actions/FilterActionHub";
import { FilterActionsCreator } from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/FilterActionsCreator";
import { TestResultsListToolbarActionCreator } from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsListToolbarActionCreator";
import { TestResultsListViewActionCreator } from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsListViewActionCreator";
import * as CommonHelper from "TestManagement/Scripts/Scenarios/TestTabExtension/CommonHelper";
import { ITestResultsFilterField, TestResultsFilter, TestResultsFilterFieldType } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Components/TestResultsFilter";
import { OutcomeFilterValueProvider } from "TestManagement/Scripts/Scenarios/TestTabExtension/Filtering/OutcomeFilterValueProvider";
import { FilterState } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import { AddWorkItemHelperForList } from "TestManagement/Scripts/Scenarios/TestTabExtension/Helpers/AddWorkItemHelper";
import { ColumnOptionsHelper } from "TestManagement/Scripts/Scenarios/TestTabExtension/Helpers/ColumnOptionsHelper";
import { FilterStore } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/FilterStore";
import { TestResultsStore } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/TestResultsGridTreeStore";
import { IToolBarState, TestResultsListCommandBarStore } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/TestResultsListCommandBarStore";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_Array from "VSS/Utils/Array";
import { delegate } from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { IColumnOptionsPanelDisplayColumn, IColumnOptionsResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { FieldFlags } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { showColumnOptionsPanel } from "WorkItemTracking/Scripts/Queries/Components/ColumnOptions/ColumnOptionsPanel";
import { FieldDefinition, WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";

export interface IToolbarOptions extends ComponentBase.Props {
    testResultsListViewActionCreator: TestResultsListViewActionCreator;
    testResultsToolbarActionCreator: TestResultsListToolbarActionCreator;
    treeStore: TestResultsStore;
    commandBarStore: TestResultsListCommandBarStore;
    context: Common.IViewContextData;
}

export class TestResultsListToolbar extends ComponentBase.Component<IToolbarOptions, IToolBarState> {

    public componentWillMount(): void {
        this._initializeFilterStoreObject();

        this._handleStoreChange();

        this._addWorkItemHelper = new AddWorkItemHelperForList(this.props.treeStore, this.props.context);
    }

    public componentDidMount(): void {
        this.props.commandBarStore.addChangedListener(this._handleStoreChange);
    }

    public componentWillUnmount(): void {
        this.props.commandBarStore.removeChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {
        let commandBarItems: IContextualMenuItem[] = [];
        let commandBarFarItems: IContextualMenuItem[] = [];

        commandBarFarItems.push(this._getGroupByMenuItem());
        commandBarFarItems.push(this._getColumnOptionMenuItem());
        commandBarFarItems.push(this._getFilterToggleButton());

        if (this.state.hasCreateWorkItemPermission) {
            commandBarItems.push(this._addWorkItemHelper.getAddBugCommandBarItem(this.state.disableBug));
            commandBarItems.push(this._addWorkItemHelper.getLinkMenuItem(this.state.disableBug));
        }

        if (LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled() && this.state.isInProgressView) {
            commandBarItems.push(this._getInProgressButton());
        }

        return (
            <div>
                <CommandBar
                    className={"test-result-command-bar"}
                    items={commandBarItems}
                    farItems={commandBarFarItems}>
                </CommandBar>
                <TestResultsFilter 
                    fields={this._getFilterFieldValues()}
                    store={this._filterStore}
                    initialFilterState={this.state.filterState}
                    skipRender={!this.state.isFilterBarEnabled}
                    actionCreator={this._filterActionCreator}
                    filterUpdatedCallback={(filter: FilterState) => this.props.testResultsListViewActionCreator.onFilterChanged(this.props.context.viewContext, filter)}
                />
            </div>
        );
    }


    private _getNameOfGroupBySelectedKey(): string {
        let foundItem = Utils_Array.first(CommonHelper.GroupByPivotHelper.getGroupByOptions(), item => item.key === this.state.groupBy);
        return foundItem ? foundItem.name : Utils_String.empty;
    }

    @autobind
    private _onColumnOptionsClick() {

        let displayColumns = [];
        ColumnOptionsHelper.getAllAvailableColumns(this.props.context.viewContext).map(col => {
            if (this.props.treeStore.getState().columnToRender.indexOf(col.key) > -1) {
                displayColumns.push(col);
            }
        });

        showColumnOptionsPanel({
            displayColumns: displayColumns.map(dc => ({
                fieldRefName: dc.key,
                width: dc.minWidth
            } as IColumnOptionsPanelDisplayColumn)),
            allowSort: false,
            getFieldWidth: delegate(this, this._getColumnWidth),
            getAvailableFields: delegate(this, this._getAvailableColumnsAsFieldDefinitions),
            onOkClick: delegate(this, this._updateGridColumn),
        });
    }

    @autobind
    private _toggleShowFilterBarButton() {
        this.props.testResultsToolbarActionCreator.onToggleFilter();
    }

    @autobind
    private _viewMoreResults() {
        this.props.testResultsListViewActionCreator.onInProgressResults();
        TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_InProgressViewRefreshed, {"count": 1});
    }

    @autobind
    private _getAvailableColumnsAsFieldDefinitions(): IPromise<FieldDefinition[]> {
        const deferred = Q.defer<FieldDefinition[]>();
        const tfsContext = TfsContext.getDefault();
        const projectId = tfsContext.navigation.projectId;
        const store = ProjectCollection.getConnection(tfsContext).getService<WorkItemStore>(WorkItemStore);

        const allFields = ColumnOptionsHelper.getAllAvailableColumns(this.props.context.viewContext).map(af => new FieldDefinition(store, {
            id: af.id,
            name: af.name,
            referenceName: af.key,
            type: null,
            flags: FieldFlags.Queryable,
            usages: null,
            isIdentity: false,
            isHistoryEnabled: false
        }));

        deferred.resolve(allFields);
        return deferred.promise;
    }

    @autobind
    private _updateGridColumn(result: IColumnOptionsResult, dataChanged: boolean) {
        if (dataChanged) {
			this.props.testResultsListViewActionCreator.onColumnOptionsClick(result.display.map(col => col.name));
			TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_ColumnsChanged, {
                "NumberOfColumns": result.display.length,
                "ColumnsAdded": result.added
            });
        }
    }

    @autobind
    private _getColumnWidth(fieldRefName: string): number {
        return 80;
    }

    @autobind
    private _onClickOfGroupByMenuItem(ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem): void {
        const currentState = item.key.toString();
        const oldState = this.state.groupBy;
        if (currentState === oldState) {
            return;
        }

        this.props.testResultsListViewActionCreator.onGroupByChanged(this.props.context, item.key.toString());

        TestTabTelemetryService.getInstance().publishEvent(TestTabTelemetryService.featureTestTab_GroupByClicked, TestTabTelemetryService.dropDownSelected, currentState);
    }

    private _getColumnOptionMenuItem(): IContextualMenuItem {
        return {
            key: "column-options-button",
            name: Resources.ColumnOptionsTitle,
            ariaLabel: Resources.ColumnOptionsTitle,
            iconProps: { iconName: "Repair" },
            ariaDescription: Resources.OpenColumnOptionPanel,
            onClick: this._onColumnOptionsClick
        };
    }

    private _getFilterToggleButton(): IContextualMenuItem {
        return {
            key: "toggle-filter-button",
            iconProps: this._getIconPropsForFilterButton(),
            ariaLabel: this.state.isFilterBarEnabled ? Resources.HideFilterBarTitle : Resources.ShowFilterBarTitle,
            onClick: this._toggleShowFilterBarButton,
            className: this.state.isFilterBarEnabled ? "filter-toggle-buttonon" : null,
            isChecked: this.state.isFilterBarEnabled,
            disabled: LicenseAndFeatureFlagUtils.isFilterInInProgressEnabled() ? false : this.state.isInProgressView
        };
    }

    private _getInProgressButton(): IContextualMenuItem {
        return {
            key: "inprogress-viewmoreresults-button",
            name: Resources.ViewMoreTests,
            iconProps: this._getIconPropsForInProgressButton(),
            ariaLabel: Resources.ViewMoreTests,
            disabled: !this.state.isReloadButtonEnabled,
            onClick: delegate(this, this._viewMoreResults),
            className: "inprogress-button"
        };
    }

    private _getIconPropsForFilterButton(): IIconProps {
        if (this.state.isFilterApplied) {
            return { iconName: "FilterSolid" };
        }

        return { iconName: "Filter" };
    }

    private _getIconPropsForInProgressButton(): IIconProps {
        return { iconName: "Refresh" };
    }

    private _getGroupByMenuItem(): IContextualMenuItem {
        return {
            key: "group-by-result",
            name: this._getNameOfGroupBySelectedKey(),
            disabled: this.state.isInProgressView,
            ariaLabel: Resources.GroupByText,
            iconProps: { iconName: "RowsGroup" },
            subMenuProps: {
                items: CommonHelper.GroupByPivotHelper.getGroupByOptions(),
                onItemClick: this._onClickOfGroupByMenuItem,
            }

        };
    }

    private _getFilterFieldValues(): ITestResultsFilterField[] {
        return [
            {
                displayType: TestResultsFilterFieldType.Text,
                fieldName: Common.FilterByFields.TestCaseName,
                placeholder: Resources.FilterByTestName,
            },
            {
                displayType: TestResultsFilterFieldType.CheckboxList,
                fieldName: Common.FilterByFields.Container,
                placeholder: Resources.FilterByTestFile,
                noItemsText: Resources.FilterNoTestFile
            },
            {
                displayType: TestResultsFilterFieldType.CheckboxList,
                fieldName: Common.FilterByFields.Owner,
                placeholder: Resources.FilterByOwner,
                noItemsText: Resources.FilterNoOwner
            },
            {
                displayType: TestResultsFilterFieldType.CheckboxList,
                fieldName: Common.FilterByFields.Outcome,
                placeholder: Resources.FilterByOutcome,
                valueProvider: new OutcomeFilterValueProvider()
            }
        ];
    }

    private _initializeFilterStoreObject() {
        if (!this._filterActionHub) {
            this._filterActionHub = new FilterActionHub();

            this._filterStore = new FilterStore(this._filterActionHub);
            this._filterActionCreator = new FilterActionsCreator(this._filterActionHub, this.props.context);
        }
    }

    private _handleStoreChange = (): void => {
        this.setState(this.props.commandBarStore.getState());
    }

    private _filterStore: FilterStore;
    private _filterActionCreator: FilterActionsCreator;
    private _filterActionHub: FilterActionHub;
    private _addWorkItemHelper: AddWorkItemHelperForList;
}

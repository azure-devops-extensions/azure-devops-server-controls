import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/TestPlanComponentBase";

import * as DeleteDialogs from "WorkItemTracking/Scripts/TestWorkItemDelete/TFS.TestWorkItemDelete.Dialog";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as TCMTelemetry from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import * as Utils_String from "VSS/Utils/String";
import * as WitOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as WitControls from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls";
import { autobind, getId as getTooltipId, css } from "OfficeFabric/Utilities";
import { Colors } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Colors";
import {
    ColumnActionsMode,
    ConstrainMode,
    DetailsListLayoutMode,
    IColumn,
    SelectionMode
} from "OfficeFabric/DetailsList";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import { DetailsRow, IDetailsRowProps } from "OfficeFabric/DetailsList";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { FavoriteStar } from "Favorites/Controls/FavoriteStar";
import {
    FavoriteState,
    ITestPlanDirectoryListComponentState,
    ITestPlanListBaseComponentProps,
    ITestPlanRow,
    TestPlanPivotColumnKeys,
    IDirectoryRow,
    WorkItemField
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { IdentityHelper, IdentityImageMode, IdentityImageSize } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { IdentityRenderer } from "TFSUI/Identity/IdentityRenderer";
import { Link } from "OfficeFabric/Link";
import { LoadingComponent } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/LoadingComponent";
import { TestPlanDirectoryActionsCreator } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/TestPlanDirectoryActionsCreator";
import { TestPlanDirectoryStore } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Stores/TestPlanDirectoryStore";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { using } from "VSS/VSS";
import { UrlHelper } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { VssDetailsList } from "VSSUI/Components/VssDetailsList/VssDetailsList";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/TestPlanDirectoryView";

export abstract class TestPlanComponentBase<TState extends ITestPlanDirectoryListComponentState>
    extends React.Component<ITestPlanListBaseComponentProps, TState> {

    constructor(props: ITestPlanListBaseComponentProps) {
        super(props);
    }

    protected static CSS_TESTPLAN_DIRECTORY_LIST = "testplan-directory-list";
    protected static CSS_TESTPLAN_DIRECTORY_ROWITEM = "testplan-directory-rowitem";
    protected static CSS_TESTPLAN_DIRECTORY_GROUP_SPACER = "testplan-group-spacer";
    private static CSS_TESTPLAN_DIRECTORY_COLUMN = "testplan-directory-column";
    private static CSS_TESTPLAN_DIRECTORY_COLUMN_HEADER = "testplan-directory-column-header";

    public componentDidMount() {

    }

    public componentDidUpdate() {

    }

    public render(): JSX.Element {

        if (this.state.isLoading) {
            return <LoadingComponent />;
        }
        let items = this.state.items as ITestPlanRow[] | IDirectoryRow[];     
        let filteredItems = this._getFilteredItems(this.state.items);
        
        // Render the view
        return <div className={this._getContainerClassName()}>
            <VssDetailsList
                ariaLabelForGrid={this._getAriaLabelForDetailsList()}
                setKey={this._getDetailsListClassName()} // setKey is required to keep focus on the selected item when the row is re-rendered
                layoutMode={DetailsListLayoutMode.justified}
                constrainMode={ConstrainMode.unconstrained}
                isHeaderVisible={true}
                columns={this.getColumns()}
                className={css(TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_LIST, this._getDetailsListClassName())}
                items={this.state.items}
                onRenderItemColumn={this._onRenderDirectoryItemColumn}
                selectionMode={SelectionMode.single}
                initialFocusedIndex={document.activeElement === document.body ? 0 : -1}
                getKey={(item: ITestPlanRow) => item.title}
                allocateSpaceForActionsButtonWhileHidden={true}
                actionsColumnKey={TestPlanPivotColumnKeys.Title}
                shouldDisplayActions={this._shouldDisplayActions}
                getMenuItems={this._getMenuItems}
                onRenderRow={(props) => this._getRowElement(props)}
            />
            <div className="visually-hidden" aria-live="polite">{ Utils_String.format(Resources.TestResultsMessage, filteredItems.length)}</div>
        </div>;
    }

    private _getFilteredItems(items: any[]) {
        let filteredItems = [];
        if (items && items.length > 0) {
            items.forEach(item => {
                if (!item.isGroupRow) {
                    filteredItems.push(item);
                }
            });
        }
        return filteredItems;
    }

    protected abstract _onRenderDirectoryItemColumn(): JSX.Element;

    protected abstract _getContainerClassName(): string;

    protected abstract _getDetailsListClassName(): string;

    protected abstract _getAriaLabelForDetailsList(): string;

    /**
    * Render the row. Renders the Details row with a key down action so we can control keyboard events. 
    * @param props to render for the row
    */
    protected _getRowElement(props: IDetailsRowProps) {
        return (
            <div >
                <DetailsRow
                    {...props}
                />
            </div>
        );
    }

    /**
     * Get columns for testplan directory page
    */
    protected getColumns(): IColumn[] {
        const columnActionsMode = this._getColumnActionsMode();

        return [
            {
                fieldName: TestPlanPivotColumnKeys.Title,
                key: TestPlanPivotColumnKeys.Title,
                name: Resources.TitleText,
                minWidth: 400,
                maxWidth: 600,
                headerClassName: TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_COLUMN_HEADER,
                className: TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_COLUMN,
                ariaLabel: Resources.TitleText,
                isResizable: true,
                columnActionsMode: columnActionsMode,
                onColumnClick: this._onColumnClick,
                isSorted: Utils_String.equals(this.state.sortedColumn, TestPlanPivotColumnKeys.Title, true),
                isSortedDescending: this.state.isSortedDescending
            },
            {
                fieldName: TestPlanPivotColumnKeys.State,
                key: TestPlanPivotColumnKeys.State,
                name: Resources.StateText,
                isResizable: true,
                minWidth: 200,
                maxWidth: 400,
                headerClassName: TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_COLUMN_HEADER,
                className: TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_COLUMN,
                ariaLabel: Resources.StateText,
                columnActionsMode: columnActionsMode,
                onColumnClick: this._onColumnClick,
                isSorted: Utils_String.equals(this.state.sortedColumn, TestPlanPivotColumnKeys.State, true),
                isSortedDescending: this.state.isSortedDescending
            },
            {
                fieldName: TestPlanPivotColumnKeys.Area,
                key: TestPlanPivotColumnKeys.Area,
                name: Resources.AreaPath,
                isResizable: true,
                minWidth: 200,
                maxWidth: 400,
                headerClassName: TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_COLUMN_HEADER,
                className: TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_COLUMN,
                ariaLabel: Resources.AreaPath,
                columnActionsMode: columnActionsMode,
                onColumnClick: this._onColumnClick,
                isSorted: Utils_String.equals(this.state.sortedColumn, TestPlanPivotColumnKeys.Area, true),
                isSortedDescending: this.state.isSortedDescending
            },
            {
                fieldName: TestPlanPivotColumnKeys.Iteration,
                key: TestPlanPivotColumnKeys.Iteration,
                name: Resources.IterationPathText,
                isResizable: true,
                minWidth: 200,
                maxWidth: 400,
                headerClassName: TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_COLUMN_HEADER,
                className: TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_COLUMN,
                ariaLabel: Resources.IterationPathText,
                columnActionsMode: columnActionsMode,
                onColumnClick: this._onColumnClick,
                isSorted: Utils_String.equals(this.state.sortedColumn, TestPlanPivotColumnKeys.Iteration, true),
                isSortedDescending: this.state.isSortedDescending
            },
            {
                fieldName: TestPlanPivotColumnKeys.AssignedTo,
                key: TestPlanPivotColumnKeys.AssignedTo,
                name: Resources.AssignedTo,
                isResizable: true,
                minWidth: 200,
                maxWidth: 400,
                headerClassName: TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_COLUMN_HEADER,
                className: TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_COLUMN,
                ariaLabel: Resources.AssignedTo,
                columnActionsMode: columnActionsMode,
                onColumnClick: this._onColumnClick,
                isSorted: Utils_String.equals(this.state.sortedColumn, TestPlanPivotColumnKeys.AssignedTo, true),
                isSortedDescending: this.state.isSortedDescending
            }
        ];
    }

    /**
     * Column click handler for sorting
     * @param event
     * @param column
     */
    @autobind
    protected _onColumnClick(event?: React.MouseEvent<HTMLElement>, column?: IColumn): void {
        if (!!column) {
            this.props.actionsCreator.changeColumnSort(column.fieldName);
        }
    }

    /**
     * Render directory cell depending on the column
     * @param item
     * @param index
     * @param column
     */
    @autobind
    protected _onRenderItemColumn(item?: ITestPlanRow, index?: number, column?: IColumn, isGrouped?: boolean): JSX.Element {
        if (!item || !column) {
            return null;
        }

        switch (column.fieldName) {
            case TestPlanPivotColumnKeys.Title:
                return this._getTitleColumnElement(item, index, column, isGrouped);

            case TestPlanPivotColumnKeys.State:
                return this._getStateColumnElement(item, index, column);

            case TestPlanPivotColumnKeys.Area:
                return this._getAreaColumnElement(item, index, column);

            case TestPlanPivotColumnKeys.Iteration:
                return this._getIterationColumnElement(item, index, column);

            case TestPlanPivotColumnKeys.AssignedTo:
                return this._getAssignedToColumnElement(item, index, column);

            default:
                return null;
        }
    }

    /**
    * Default is clickable. Override to change default
    */
    protected _getColumnActionsMode(): ColumnActionsMode {
        return ColumnActionsMode.clickable;
    }

    @autobind
    private _shouldDisplayActions(item: IDirectoryRow): boolean {
        // No context menu for group rows or empty rows
        return !item.isGroupRow
            && item.directoryRow.teamId !== TestPlanDirectoryStore.MY_FAVORITES_EMPTY_CONTENT_ID
            && LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled();
    }

    @autobind
    private _getMenuItems(directoryRow: IDirectoryRow): IContextualMenuItem[] {
        if (directoryRow.isGroupRow) {
            return null;
        }

        const testPlanRow = directoryRow.directoryRow as ITestPlanRow;
        const menuItems: IContextualMenuItem[] = [
            this._createContextMenuItem(testPlanRow, Resources.EditText, this._onEditClick, "bowtie-edit-outline"),
            this._createContextMenuItem(testPlanRow, Resources.DeleteText, this._onDeleteClick, "bowtie-trash")
        ];

        return menuItems;
    }

    @autobind
    private _onEditClick(row: ITestPlanRow): void {
        const planId = Number(row.testPlanId);
        using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls"], (Controls: typeof WitControls) => {
            const options: WitControls.IWorkItemDialogOptions = {
                save: (workItem: WitOM.WorkItem): void => {
                    this._onSave(row, workItem);
                }
            };
            Controls.WorkItemFormDialog.showWorkItemById(planId, TfsContext.getDefault(), options);
        });
    }

    @autobind
    private _onSave(row: ITestPlanRow, patchedPlan: WitOM.WorkItem): void {
        const payload: ITestPlanRow = Object.assign({}, row, { fields: row.fields });
        payload.title = patchedPlan.getFieldValue(WorkItemField.title);
        payload.fields.areaPath = patchedPlan.getFieldValue(WorkItemField.areaPath);
        payload.fields.state = patchedPlan.getFieldValue(WorkItemField.workItemState);
        payload.fields.assignedTo = patchedPlan.getIdentityFieldValue(WorkItemField.assignedTo);
        payload.fields.iterationPath = patchedPlan.getFieldValue(WorkItemField.iterationPath);

        TestPlanDirectoryActionsCreator
            .getInstance()
            .patchPlan(payload);
    }

    @autobind
    private _onDeleteClick(row: ITestPlanRow): void {
        using([
            "WorkItemTracking/Scripts/TestWorkItemDelete/TFS.TestWorkItemDelete.Dialog",
            "TestManagement/Scripts/TFS.TestManagement.Telemetry"
        ], (
            Dialogs: typeof DeleteDialogs,
            Telemetry: typeof TCMTelemetry
        ) => {
                let tfsContext = TfsContext.getDefault();
                const deleteDialog = new Dialogs.TestPlanDeleteConfirmationDialog({projectId: tfsContext.navigation.projectId} as DeleteDialogs.ITestDeleteConfirmationDialogOptions);
                const planId = Number(row.testPlanId);
                deleteDialog.showDialog(planId, "Test Plan", () => { this._onConfirmDelete(planId, deleteDialog, Telemetry); });
            });
    }

    @autobind
    private _onConfirmDelete(testPlanId: number, deleteDialog: DeleteDialogs.TestPlanDeleteConfirmationDialog, telemetry: typeof TCMTelemetry): void {
        const successHandler: { (): void } = () => { this._handleSuccess(testPlanId); };
        deleteDialog.deleteTestWorkItem(telemetry.TelemetryService.testHubPage, telemetry.TelemetryService.areaTestManagement, testPlanId, false, successHandler);
    }

    @autobind
    private _handleSuccess(testPlanId: number): void {
        TestPlanDirectoryActionsCreator
            .getInstance()
            .deletePlan(testPlanId);
    }

    private _createContextMenuItem(testPlanRow: ITestPlanRow, name: string, onClickCallback: ((testPlanRow: ITestPlanRow) => void), iconClass: string): IContextualMenuItem {
        return {
            name: name,
            onClick: () => {
                onClickCallback(testPlanRow);
            },
            key: name,
            iconProps: {
                className: "bowtie-icon " + iconClass
            }
        };
    }

    /**
     * Render title column
     * @param item
     * @param index
     * @param column
     */
    @autobind
    private _getTitleColumnElement(item: ITestPlanRow, index: number, column: IColumn, isGrouped: boolean): JSX.Element {
        // An item is considered as favorite iff it is favorited or the favorite call is in-progress
        const isFavorite = item.favoriteState === FavoriteState.Favorited || item.favoriteState === FavoriteState.Favoriting;

        // If this column is part of a group, it needs to be indented 
        let groupSpacer = isGrouped ? <div className={TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_GROUP_SPACER} /> : null;

        const titleElement = item.isDeleted ? item.title :
            <Link className="testplan-title" href={UrlHelper.getPlanUrl(item.testPlanId)}>
                <span>{item.title}</span>
            </Link>;

        // Title column
        return (<div className={TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_ROWITEM} key={`${item.teamId}.Name`}>
            {groupSpacer}
            <div className="testplan-row-title">
                <TooltipHost
                    overflowMode={TooltipOverflowMode.Parent}
                    content={item.title}
                    hostClassName="flex-tooltip-host">
                    <VssIcon className="testplan-icon" iconName="test-plan" iconType={VssIconType.bowtie} style={{ color: Colors.darkTeal }} />
                    {titleElement}
                </TooltipHost>
            </div>
            <div className={`testplan-row-favorite ${isFavorite ? "favorited" : Utils_String.empty}`}>
                <div
                    className="visually-hidden"
                    aria-live="assertive"
                >
                    {isFavorite ? "On" : "Off"}
                </div>
                <FavoriteStar
                    isFavorite={isFavorite}
                    isDeleted={false}
                    onToggle={() => {
                        if (isFavorite) {
                            this.props.actionsCreator.unfavoriteTeamTestPlan(item);
                        }
                        else {
                            this.props.actionsCreator.favoriteTeamTestPlan(item);
                        }
                    }} />
            </div>
        </div>);

    }

    /**
     * Render state column
     * @param item
     * @param index
     * @param column
     */
    @autobind
    private _getStateColumnElement(item: ITestPlanRow, index: number, column: IColumn): JSX.Element {
        const componentClassName = "testplan-state-cell-component";
        const tooltipId = getTooltipId(componentClassName);

        return <div className={componentClassName}>
            <TooltipHost
                content={item.fields.state}
                directionalHint={DirectionalHint.bottomCenter}
                id={tooltipId}>
                <span>{item.fields.state}</span>
            </TooltipHost>
        </div>;
    }

    /**
     * Render area column
     * @param item
     * @param index
     * @param column
     */
    @autobind
    private _getAreaColumnElement(item: ITestPlanRow, index: number, column: IColumn): JSX.Element {
        const componentClassName = "testplan-area-cell-component";
        const tooltipId = getTooltipId(componentClassName);

        return <div className={componentClassName}>
            <TooltipHost
                content={item.fields.areaPath}
                directionalHint={DirectionalHint.bottomCenter}
                id={tooltipId}>
                <span>{item.fields.areaPath}</span>
            </TooltipHost>
        </div>;
    }

    /**
     * Render iteration column
     * @param item
     * @param index
     * @param column
     */
    @autobind
    private _getIterationColumnElement(item: ITestPlanRow, index: number, column: IColumn): JSX.Element {
        const componentClassName = "testplan-iteration-cell-component";
        const tooltipId = getTooltipId(componentClassName);

        return <div className={componentClassName}>
            <TooltipHost
                content={item.fields.iterationPath}
                directionalHint={DirectionalHint.bottomCenter}
                id={tooltipId}>
                <span>{item.fields.iterationPath}</span>
            </TooltipHost>
        </div>;
    }

    /**
     * Render assignedTo column
     * @param item
     * @param index
     * @param column
     */
    @autobind
    private _getAssignedToColumnElement(item: ITestPlanRow, index: number, column: IColumn): JSX.Element {

        const componentClassName = "testplan-assignedto-cell-component";
        const tooltipId = getTooltipId(componentClassName);
        const isUnassigned = !item.fields.assignedTo || !item.fields.assignedTo.id;
        const identity = IdentityHelper.parseUniquefiedIdentityName(isUnassigned ? Resources.UnassignedTester : item.fields.assignedTo.uniqueName);

        return (<div className={componentClassName}>
            <IdentityRenderer
                displayName={isUnassigned ? Resources.UnassignedTester : item.fields.assignedTo.displayName}
                imageSource={isUnassigned ?
                    IdentityHelper.getIdentityImageUrl(identity, IdentityImageMode.ShowGenericImage, IdentityImageSize.Small) :
                    item.fields.assignedTo.imageUrl}
                tooltip={isUnassigned ? Resources.UnassignedTester : item.fields.assignedTo.uniqueName} />
        </div>);
    }
}
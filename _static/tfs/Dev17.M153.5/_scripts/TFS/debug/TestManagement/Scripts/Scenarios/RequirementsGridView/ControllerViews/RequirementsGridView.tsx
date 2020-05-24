/// <reference types="react" />
import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/RequirementsGridView/ControllerViews/RequirementsGridView";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { DetailsList, DetailsListLayoutMode, IColumn } from "OfficeFabric/DetailsList";
import { Fabric } from "OfficeFabric/Fabric";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind, css } from "OfficeFabric/Utilities";
import { IPopupContextualMenuProps, PopupContextualMenu } from "Presentation/Scripts/TFS/Components/PopupContextualMenu";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as ConfirmationDialog from "TestManagement/Scripts/Scenarios/Common/Components/ConfirmationDialog";
import { RequirementsGridViewActionsCreator } from "TestManagement/Scripts/Scenarios/RequirementsGridView/Actions/RequirementsGridViewActionsCreator";
import { IRequirementsGridViewState, RequirementsGridViewStore } from "TestManagement/Scripts/Scenarios/RequirementsGridView/Stores/RequirementsGridViewStore";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import TCMContracts = require("TFS/TestManagement/Contracts");
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");
import * as ComponentBase from "VSS/Flux/Component";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import VSS = require("VSS/VSS");
import WITControls_LAZY_LOAD = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls");
import { IWorkItemColorsAndIcon } from "TestManagement/Scripts/Scenarios/BugsGridView/Actions/BugsGridViewActionsHub";

export interface IRequirementsGridViewProps extends ComponentBase.Props {
    actionsCreator: RequirementsGridViewActionsCreator;
    store: RequirementsGridViewStore;
    testCaseResult: TCMContracts.TestCaseResult;
}

export function renderGrid(element: HTMLElement, RequirementsGridViewProps: IRequirementsGridViewProps): void {
    ReactDOM.render(<RequirementsGridView { ...RequirementsGridViewProps } />, element);
}

export function unmountGrid(element: HTMLElement): void {
    ReactDOM.unmountComponentAtNode(element);
}

export class RequirementsGridView extends ComponentBase.Component<IRequirementsGridViewProps, IRequirementsGridViewState> {

    private _columns: IColumn[] = [
        {
            key: "requirementId",
            name: Resources.TestPointGridColumnID,
            fieldName: "id",
            minWidth: 20,
            maxWidth: 40,
            isResizable: true,
            isSorted: true,
            isSortedDescending: true,
            onColumnClick: this._onColumnHeaderClick,
            data: "string",
            isPadded: true,
            onRender: (item: WIT_Contracts.WorkItem, index: number) => {
                return (
                    <div>
                        <span>
                            {item.id}
                        </span>
                    </div>
                );
            }
        },
        {
            key: "title",
            name: Resources.WorkItemGridTitleColumnHeader,
            fieldName: "System.Title",
            minWidth: 300,
            maxWidth: 450,
            isResizable: true,
            isSorted: false,
            isSortedDescending: false,
            onColumnClick: this._onColumnHeaderClick,
            data: "string",
            isPadded: true,
            onRender: (item: WIT_Contracts.WorkItem, index: number) => {
                const colorsAndIcon: IWorkItemColorsAndIcon = this._getColorsAndIcon(item);
                return (
                    <div className="workItem-icon-and-name">
                        <div>
                            <span
                                className={css("bowtie-icon bug-symbol-styling", colorsAndIcon.icon)}
                                style={{ color: colorsAndIcon.color }}>
                            </span>
                        </div>
                        <div className="requirement-name">
                            <TooltipHost content={item.fields["System.Title"]}>
                                <span>
                                    <a role="link"
                                        onKeyPress={(event) => this._onItemInvoked(item, event)}
                                        onClick={(event) => this._onItemInvoked(item, event)}>
                                        {item.fields["System.Title"]}
                                    </a>
                                </span>
                            </TooltipHost>
                        </div>
                        {this._createContextMenu(item, index)}
                    </div>
                );
            }
        },
        {
            key: "state",
            name: Resources.ExploratorySessionGridHeader_State,
            fieldName: "System.State",
            minWidth: 80,
            maxWidth: 100,
            isResizable: true,
            isSorted: false,
            isSortedDescending: false,
            onColumnClick: this._onColumnHeaderClick,
            data: "string",
            isPadded: true,
            onRender: (item: WIT_Contracts.WorkItem, index: number) => {
                return (
                    <div>
                        <TooltipHost content={item.fields["System.State"]}>
                                <span>
                                <span className="workitem-state-circle" style={{ backgroundColor: this._getStateColor(item), borderColor: this._getStateColor(item) }}></span>
                                    <span>{item.fields["System.State"]}</span>
                                </span>
                        </TooltipHost>
                    </div>
                );
            }
        },
        {
            key: "assignedTo",
            name: Resources.AssignedTo,
            fieldName: "System.AssignedTo",
            minWidth: 150,
            maxWidth: 200,
            isResizable: true,
            isSorted: false,
            isSortedDescending: false,
            onColumnClick: this._onColumnHeaderClick,
            data: "string",
            isPadded: true,
            onRender: (item: WIT_Contracts.WorkItem, index: number) => {
                const assignedTo: string = item.fields["System.AssignedTo"] ? item.fields["System.AssignedTo"].displayName : Utils_String.empty;
                return (
                    <div>
                        <TooltipHost content={assignedTo}>
                            <span>
                                {assignedTo}
                            </span>
                        </TooltipHost>
                    </div>
                );
            }
        },
        {
            key: "createdDate",
            name: Resources.DateCreated,
            fieldName: "System.CreatedDate",
            minWidth: 125,
            maxWidth: 175,
            isResizable: true,
            isSorted: false,
            isSortedDescending: false,
            onColumnClick: this._onColumnHeaderClick,
            data: "string",
            isPadded: true,
            onRender: (item: WIT_Contracts.WorkItem, index: number) => {
                return (
                    <div>
                        <TooltipHost content={new Date(item.fields["System.CreatedDate"]).toString()}>
                            <span>
                                {Utils_Date.friendly(new Date(item.fields["System.CreatedDate"]))}
                            </span>
                        </TooltipHost>
                    </div>
                );
            }
        },
        {
            key: "lastUpdated",
            name: Resources.LastUpdated,
            fieldName: "System.ChangedDate",
            minWidth: 125,
            maxWidth: 175,
            isResizable: true,
            isSorted: false,
            isSortedDescending: false,
            onColumnClick: this._onColumnHeaderClick,
            data: "string",
            isPadded: true,
            onRender: (item: WIT_Contracts.WorkItem, index: number) => {
                return (
                    <div>
                        <TooltipHost content={new Date(item.fields["System.ChangedDate"]).toString()}>
                            <span>
                                {Utils_Date.friendly(new Date(item.fields["System.ChangedDate"]))}
                            </span>
                        </TooltipHost>
                    </div>
                );
            }
        }
    ];

    private _workItemModified: boolean;

    constructor(props: any) {
        super(props);
        this._workItemModified = false;
    }

    public componentWillMount(): void {
        this.props.actionsCreator.clearState();
        this._handleStoreChange();
        this.props.store.addChangedListener(this._handleStoreChange);
    }

    public componentDidMount(): void {
        this.props.actionsCreator.loadRequirements(this.props.testCaseResult);
        this.props.actionsCreator.initializeColumns(this._columns);
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {
        let { columns, requirements } = this.state;
        return (
            <Fabric className="test-requirements-grid-view">
                <h2 className="requirements-header">
                    {Utils_String.format(Resources.RequirementsLabel, (requirements) ? requirements.length : 0)}
                </h2>
                {
                    this.state.errorMessage ?
                        <TooltipHost content={this.state.errorMessage}>
                            <MessageBar
                                messageBarType={MessageBarType.error}
                                dismissButtonAriaLabel={Resources.ClearErrorMessage}
                                className="preview-attachment-error-bar"
                                isMultiline={false}
                                onDismiss={this._onErrorMessageDismiss}>
                                {this.state.errorMessage}
                            </MessageBar>
                        </TooltipHost>
                        :
                        Utils_String.empty
                }
                {
                    this.state.isLoading &&
                    this._showLoading()
                }
                {
                    this.state.requirements && this.state.requirements.length > 0 ?
                        <DetailsList
                            className="requirements-grid"
                            items={requirements}
                            ariaLabelForGrid={Utils_String.format(Resources.RequirementsLabel, this.state.requirements.length)}
                            ariaLabelForSelectionColumn={Resources.SelectAll}
                            getRowAriaLabel={(item) => item.name}
                            checkButtonAriaLabel={Resources.SelectRow}
                            compact={true}
                            columns={columns}
                            setKey="set"
                            layoutMode={DetailsListLayoutMode.justified}
                            isHeaderVisible={true}
                            selection={this.state.selection}
                            selectionPreservedOnEmptyClick={false}
                            onItemContextMenu={this._onItemContextMenu}
                            onItemInvoked={(item) => this._onItemInvoked(null, item)}
                        />
                        :
                        null
                }
            </Fabric>
        );
    }

    private _showLoading(): JSX.Element {
        return (
            <div className="requirement-view-pane-loading">
                <Spinner
                    ariaLabel={Resources.LoadingRequirementsMessage}
                    className="requirements-grid-view-loading-spinner test-result-loading-spinner-separator"
                    size={SpinnerSize.medium}
                    label={Resources.LoadingRequirementsMessage}
                />
            </div>
        );
    }

    @autobind
    private _onColumnHeaderClick(ev: any, column: IColumn) {
        const { columns, requirements } = this.state;
        let newItems: WIT_Contracts.WorkItem[] = requirements.slice();
        let newColumns: IColumn[] = columns.slice();
        let currentColumn: IColumn = newColumns.filter((currCol: IColumn, idx: number) => {
            return column.key === currCol.key;
        })[0];
        newColumns.forEach((newColumn: IColumn) => {
            if (newColumn === currentColumn) {
                currentColumn.isSortedDescending = !currentColumn.isSortedDescending;
                currentColumn.isSorted = true;
            } else {
                newColumn.isSorted = false;
                newColumn.isSortedDescending = true;
            }
        });
        newItems = this._sortItems(newItems, currentColumn.fieldName, currentColumn.isSortedDescending);
        this.setState({
            columns: newColumns
        });
        this.props.actionsCreator.afterSortRequirements(newItems);
        if (currentColumn.isSortedDescending) {
            announce(Utils_String.format(Resources.AnnounceSortedDesc, currentColumn.fieldName));
        } else {
            announce(Utils_String.format(Resources.AnnounceSortedAsc, currentColumn.fieldName));
        }
    }

    @autobind
    private _sortItems(items: WIT_Contracts.WorkItem[], sortBy: string, descending = false): WIT_Contracts.WorkItem[] {
        TelemetryService.publishEvents(TelemetryService.featureRequirementsGridView_SortOnRequirements, {
            "SortedElement": sortBy
        });
        if (descending) {
            return items.sort((a: WIT_Contracts.WorkItem, b: WIT_Contracts.WorkItem) => {
                if (sortBy === "id") {
                    if (a[sortBy] < b[sortBy]) {
                        return 1;
                    }
                    if (a[sortBy] > b[sortBy]) {
                        return -1;
                    }
                    return 0;
                } else if (sortBy === "System.AssignedTo") {
                    if (!a.fields[sortBy]) {
                        return 1;
                    }
                    if (!b.fields[sortBy]) {
                        return -1;
                    }
                    if (a.fields[sortBy].toString() < b.fields[sortBy].toString()) {
                        return 1;
                    }
                    if (a.fields[sortBy].toString() > b.fields[sortBy].toString()) {
                        return -1;
                    }
                    return 0;
                } else {
                    if (a.fields[sortBy] < b.fields[sortBy]) {
                        return 1;
                    }
                    if (a.fields[sortBy] > b.fields[sortBy]) {
                        return -1;
                    }
                    return 0;
                }
            });
        } else {
            return items.sort((a: WIT_Contracts.WorkItem, b: WIT_Contracts.WorkItem) => {
                if (sortBy === "id") {
                    if (a[sortBy] < b[sortBy]) {
                        return -1;
                    }
                    if (a[sortBy] > b[sortBy]) {
                        return 1;
                    }
                    return 0;
                } else if (sortBy === "System.AssignedTo") {
                    if (!a.fields[sortBy]) {
                        return -1;
                    }
                    if (!b.fields[sortBy]) {
                        return 1;
                    }
                    if (a.fields[sortBy].toString() < b.fields[sortBy].toString()) {
                        return -1;
                    }
                    if (a.fields[sortBy].toString() > b.fields[sortBy].toString()) {
                        return 1;
                    }
                    return 0;
                } else {
                    if (a.fields[sortBy] < b.fields[sortBy]) {
                        return -1;
                    }
                    if (a.fields[sortBy] > b.fields[sortBy]) {
                        return 1;
                    }
                    return 0;
                }
            });
        }
    }

    private _createContextMenu(requirement: WIT_Contracts.WorkItem, index: number): JSX.Element {
        let items: IContextualMenuItem[] = [];

        items.push({
            key: "openRequirement",
            onClick: () => {
                this._openRequirement(requirement);
            },
            iconProps: {
                iconName: "ReplyMirrored"
            },
            name: Resources.OpenInNewTab
        });
        if (this.state.hasPublishTestResultsPermission) {
            items.push({
                key: "deleteLink",
                onClick: () => {
                    this._confirmDeletion();
                },
                iconProps: {
                    iconName: "ChromeClose",
                },
                name: Resources.RemoveLink
            });
        }

        let showContextMenu = false;
        if (this.state.contextMenuOpenIndex === index) {
            showContextMenu = true;
            this.props.actionsCreator.updateContextMenuOpenIndex(-1);
        }

        let contextMenuProps: IPopupContextualMenuProps = {
            className: "context-menu grid-context-menu",
            iconClassName: "bowtie-ellipsis",
            items: items,
            menuClassName: "processes-popup-menu",
            showContextMenu: showContextMenu,
            onClick: (event) => { this._onContextMenuClick(requirement, index, event); },
            onDismiss: this._onDismissContextMenu
        };
        return <PopupContextualMenu {...contextMenuProps} />;
    }

    private _onItemInvoked = (item: WIT_Contracts.WorkItem, event: any): void => {
        if (event.type === "keypress" && event.key === "Enter" || event.type === "click") {
            if (event.ctrlKey) {
                this.props.actionsCreator.openRequirement(item);
                return;
            }
            let options = {
                save: (workItem) => {
                    this._workItemModified = true;
                },

                close: (workItem) => {
                    if (this._workItemModified) {
                        this.props.actionsCreator.updateWorkItem(this.props.testCaseResult, workItem);
                    }
                    this._workItemModified = false;
                }
            };

            VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls", "WorkItemTracking/Scripts/OM/WorkItemManager"],
                (Module: typeof WITControls_LAZY_LOAD) => {
                    Module.WorkItemFormDialog.showWorkItemById(item.id, this.context, options);
                });
            TelemetryService.publishEvents(TelemetryService.featureRequirementsGridView_TestResultViewRequirements, {
                "ViewAction": "Click on Name",
                "Number of items": 1
            });
        }
    }

    private _openRequirement(item: WIT_Contracts.WorkItem): void {
        this.props.actionsCreator.openRequirement(item);
        TelemetryService.publishEvents(TelemetryService.featureRequirementsGridView_TestResultViewRequirements, {
            "ViewAction": "Click on Name",
            "Number of items": this.state.selectionDetails.length
        });
    }

    private _deleteAssociations(): void {
        this.props.actionsCreator.deleteAssociations(this.props.testCaseResult, this.state.selectionDetails);
    }

    private _confirmDeletion(): void {
        ConfirmationDialog.openConfirmationDialog(Resources.DeleteRequirementConfirmationText, () => { this._deleteAssociations(); });
    }

    private _getStateColor(item: WIT_Contracts.WorkItem): string {
        if (this.state.colorsAndIcon){
            for (let i = 0; i < this.state.colorsAndIcon.length; ++i) {
                if (this.state.colorsAndIcon[i].id === item.id) {
                    return this.state.colorsAndIcon[i].stateColor;
                }
            }
        }
        return null;
    }

    private _getColorsAndIcon(item: WIT_Contracts.WorkItem): IWorkItemColorsAndIcon {
        if (this.state.colorsAndIcon) {
            for (let i = 0; i < this.state.colorsAndIcon.length; ++i) {
                if (this.state.colorsAndIcon[i].id === item.id) {
                    return this.state.colorsAndIcon[i];
                }
            }
        } else {
            return ({
                id: item.id,
                color: Utils_String.empty,
                stateColor: Utils_String.empty,
                icon: Utils_String.empty
            });
        }
    }

    private _handleStoreChange = (): void => {
        this.setState(this.props.store.getState());
    }

    @autobind
    private _onContextMenuClick(item?: any, index?: number, ev?: any): void {
        let isIndexInSelected: boolean = false;
        if (this.state.selectionDetails != null) {
            this.state.selectionDetails.forEach((requirement) => {
                if (item.id === requirement.id) {
                    isIndexInSelected = true;
                }
            });
            if (this.state.selectionDetails.length > 1 && isIndexInSelected) {
                ev.preventDefault();
                ev.stopPropagation();
            }
        }
        this.props.actionsCreator.updateContextMenuOpenIndex(index);
        this.forceUpdate();
    }

    @autobind
    private _onDismissContextMenu(): void {
        this.props.actionsCreator.updateContextMenuOpenIndex(-1);
        this.forceUpdate();
    }

    @autobind
    private _onItemContextMenu(item?: any, index?: number, ev?: Event): void {
        $(".requirements-grid-context-menu").eq(index).find(".popup-menu-trigger").click();
    }

    private _onErrorMessageDismiss = () => {
        this.props.actionsCreator.closeErrorMessage();
    }
}

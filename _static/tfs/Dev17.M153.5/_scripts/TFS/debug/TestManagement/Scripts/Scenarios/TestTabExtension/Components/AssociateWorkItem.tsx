/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/TestTabExtension/Components/AssociateWorkItem";

import { DefaultButton, PrimaryButton, IButtonProps } from "OfficeFabric/Button";
import { IDialogContentProps } from "OfficeFabric/components/Dialog/DialogContent.types";
import { DialogFooter } from "OfficeFabric/components/Dialog/DialogFooter";
import {
    CheckboxVisibility,
    ColumnActionsMode,
    ConstrainMode,
    DetailsListLayoutMode,
    IColumn,
    SelectionMode,
} from "OfficeFabric/DetailsList";
import { Dialog } from "OfficeFabric/Dialog";
import { Fabric } from "OfficeFabric/Fabric";
import { Link } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { IModalProps } from "OfficeFabric/Modal";
import { SearchBox } from "OfficeFabric/SearchBox";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind, css } from "OfficeFabric/Utilities";
import { ResponsiveMode } from "OfficeFabric/utilities/decorators/withResponsiveMode";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { ITestResultTreeData } from "TestManagement/Scripts/Scenarios/Common/Common";
import {
    AssociateWITDialogActionsCreator,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/AssociateWITDialogActionsCreator";
import * as QueryRequirementHelper from "TestManagement/Scripts/Scenarios/TestTabExtension/Helpers/QueryWorkItemHelper";
import { TestResultSource } from "TestManagement/Scripts/Scenarios/TestTabExtension/Sources/TestResultSource";
import {
    AssociateWITDialogStore,
    IAssociateWorkItemState,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/AssociateWITDialogStore";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as TestsOM from "TestManagement/Scripts/TFS.TestManagement";
import * as TRACommonControls from "TestManagement/Scripts/TFS.TestManagement.RunsView.Common.Controls";
import * as TMService from "TestManagement/Scripts/TFS.TestManagement.Service";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as Contracts from "TFS/TestManagement/Contracts";
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import Navigation = require("VSS/Controls/Navigation");
import * as Diag from "VSS/Diag";
import * as ComponentBase from "VSS/Flux/Component";
import { delegate } from "VSS/Utils/Core";
import { announce } from "VSS/Utils/Accessibility";
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import { VssDetailsList } from "VSSUI/VssDetailsList";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as WITControls_LAZY_LOAD from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls";
import * as VSS_Service from "VSS/Service";
import { TestManagementMigrationService } from "TestManagement/Scripts/TestManagementMigrationService";

export interface IAssociateWorkItemProps extends ComponentBase.Props {
    header: string;
    searchBoxValue?: string;
    SearchBoxLabelText?: string;
    saveButtonText: string;
    workItemType: QueryRequirementHelper.workItemCategoryType;
    actionCreator: AssociateWITDialogActionsCreator;
    store: AssociateWITDialogStore;
    selectedTestResults: ITestResultTreeData[];
    context: Common.IViewContextData;
    onCloseDialog: () => void;
    onSaveDialog: () => void;
    elementToFocusOnDismiss?: HTMLElement;
}

export function renderDialog(element: Element, associateWorkItemProps: IAssociateWorkItemProps): void {
    ReactDOM.render(<AssociateWorkItemComponent { ...associateWorkItemProps } />, element);
}

export function unmountDialog(element: Element): void {
    ReactDOM.unmountComponentAtNode(element);
}

export class AssociateWorkItemComponent extends ComponentBase.Component<IAssociateWorkItemProps, IAssociateWorkItemState> {

    constructor() {
        super();
        this._showSuggestionMessage = false;
        this._searchBoxValue = null;
        this._source = TestResultSource.getInstance();
        this._columnState = this._getColumnsForDetailsList();
    }

    public componentWillMount(): void {
        this._searchBoxValue = this.props.searchBoxValue ? this.props.searchBoxValue : "";
        this._handleStoreChange();
        this.props.store.addChangedListener(this._handleStoreChange);
    }

    public componentDidMount(): void {

        this._showSuggestionMessage = true;

        if (this.props.workItemType === QueryRequirementHelper.workItemCategoryType.Requirement) {
            this._maxResultCount = 50;
        }
        else if (this.props.workItemType === QueryRequirementHelper.workItemCategoryType.Bug) {
            this._maxResultCount = 25;

            // For bugs we send the initial serach string. In that case dont show suggestion message
            if (this._searchBoxValue)
            {
                this._showSuggestionMessage = false;
            }
        }
        
        this.props.actionCreator.fetchCategoryTypeWorkItems(this._searchBoxValue, this.props.workItemType);
    }

    public componentWillUnmount() {
        this.props.store.removeChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {

        let dialogcontentProps: IDialogContentProps = {
            showCloseButton: true,
            title: this.props.header,
            closeButtonAriaLabel: Resources.CloseText,
            className: "create-associate-bug-dialog-content",
            responsiveMode: ResponsiveMode.large,
        };

        let modalProps: IModalProps = {
            className: "create-associate-bug-dialog",
            containerClassName: "create-associate-bug-dialog-container",
            isBlocking: true
        };

        const isLoading: boolean = this.state.isWorkItemsFetching;

        let element: JSX.Element = null;

        if (isLoading) {
            element = this._getLoadingSpinner();
        } else if (this.state.errorMessage) {
            this._columnState = this._getColumnsForDetailsList();
            element = this._getErrorMessageBar();
        } else {
            element = this._getDetailList();
        }

        const clearSearchButtonProps: IButtonProps = {
            ariaLabel: Resources.ClearSearchMessage
        };

        return (
            <Dialog
                hidden={!this.state.showDialog}
                dialogContentProps={dialogcontentProps}
                modalProps={modalProps}
                elementToFocusOnDismiss={this.props.elementToFocusOnDismiss}
                onDismiss={this._closeDialog}>
                <div className = "workItem-layout">
                    <SearchBox
                        placeholder={this.props.SearchBoxLabelText}
                        value={this._searchBoxValue}
                        onSearch={this._onSearch}
                        onClear={this._onClear}
                        clearButtonProps={clearSearchButtonProps}
                    >
                    </SearchBox>
                    {
                        element
                    }
                </div>
                <DialogFooter>
                    <PrimaryButton
                        onClick={this._onSaveClick}
                        disabled={!this.state.itemSelecled}>
                        {this.props.saveButtonText}
                    </PrimaryButton>
                    <DefaultButton
                        onClick={this._closeDialog}>
                        {Resources.CloseText}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    @autobind
    private _closeDialog() {
        this.setState({ showDialog: false });
        this.props.onCloseDialog();
    }

    @autobind
    private _onSaveClick() {
        const selectedData: WorkItem[] = this.state.selection.getSelection() as WorkItem[];
        const selectedWorkItemId = selectedData[0].id;

        if (this.props.workItemType === QueryRequirementHelper.workItemCategoryType.Requirement) {
            this._AssociateWorkItem(selectedWorkItemId);
        }
        else if (this.props.workItemType === QueryRequirementHelper.workItemCategoryType.Bug) {
            this.setState({ showDialog: false });
            this.props.onSaveDialog();

            this._updateAndShowBug(selectedWorkItemId);
        }

    }

    private async _AssociateWorkItem(workItemId: number) {
        const testResults = this.props.selectedTestResults;
        const resultCount = testResults.length;

        const payload: Contracts.WorkItemToTestLinks[] = await this._constructLinkingPayload(testResults, workItemId);
        Promise
            .all(payload.map(p => this._addWorkItemToTestsLinks(p)))
            .then(() => {
                //Close the dialog if requirement is linked successfully
                this.setState({ showDialog: false });
                this.props.onSaveDialog();

                Diag.logInfo("Work item linked successfully to selected test methods");
            }, (reason: any) => {
                this.props.actionCreator._onGettingError(reason.message);
                Diag.logWarning(Utils_String.format("Couldn't link work items to test methods, error: {0}", reason));
            });

    }

    private async _constructLinkingPayload(testResults: ITestResultTreeData[], workItemId: number) {
        let testMethodsInTfs: Contracts.TestMethod[] = [];
        let testMethodsInTcm: Contracts.TestMethod[] = [];
        const service = VSS_Service.getService(TestManagementMigrationService);
        for (const result of testResults) {
            const testMethod: Contracts.TestMethod = { name: result.testTitle, container: result.storage };
            const isTestRunInTcm = await service.isTestRunInTcm(result.runId);
            if (isTestRunInTcm) {
                testMethodsInTcm.push(testMethod);
            } else {
                testMethodsInTfs.push(testMethod);
            }
        }
        const workItem: Contracts.WorkItemReference = {
            id: workItemId.toString(),
            name: Utils_String.empty,
            type: Utils_String.empty,
            url: Utils_String.empty,
            webUrl: Utils_String.empty
        };
        const workItemToTestLinksInTfs: Contracts.WorkItemToTestLinks = {
            tests: testMethodsInTfs,
            workItem: workItem,
            executedIn: Contracts.Service.Tfs
        };
        const workItemToTestLinksInTcm: Contracts.WorkItemToTestLinks = {
            tests: testMethodsInTcm,
            workItem: workItem,
            executedIn: Contracts.Service.Tcm
        };
        let result: Contracts.WorkItemToTestLinks[] = [];
        if (workItemToTestLinksInTcm.tests.length > 0) {
            result.push(workItemToTestLinksInTcm);
        }
        if (workItemToTestLinksInTfs.tests.length > 0) {
            result.push(workItemToTestLinksInTfs);
        }
        return result;
    }

    private _addWorkItemToTestsLinks(workItemToTestLink: Contracts.WorkItemToTestLinks): IPromise<Contracts.WorkItemToTestLinks> {
        return TMService.ServiceManager.instance().testResultsService().addWorkItemToTestLinks(workItemToTestLink);
    }

    private _updateAndShowBug(selectedWorkItemId: number) {
        let that = this;
        let witStore = TMUtils.WorkItemUtils.getWorkItemStore();

        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls"], (WITControls: typeof WITControls_LAZY_LOAD) => {
            WorkItemManager.get(witStore).beginGetWorkItem(selectedWorkItemId, (workItem) => {
                witStore.beginGetLinkTypes(function () {

                        // Populate work item.
                        that._populateWorkItem(workItem);

                        // Show the work item.
                        WITControls.WorkItemFormDialog.showWorkItem(workItem, null);
                });

            });
        });
    }

    private _populateWorkItem(workItem: WITOM.WorkItem) {
        let selectedResults: Contracts.TestCaseResult[] = [];

        if (this.props.selectedTestResults.length > 0) {
            this._source.getSelectedTestCaseResult(this.props.context, this.props.selectedTestResults[0].runId, this.props.selectedTestResults[0].resultId).then(result => {

                // We are fetching detailed test result for first element only. For rest we are sending only ids.
                selectedResults.push(result);

                for (let i = 1; i < this.props.selectedTestResults.length; i++) {
                    selectedResults.push(AssociateWorkItemComponent._createEmptyTestCaseResultObject(this.props.selectedTestResults[i]));
                }

                TRACommonControls.BugWorkItemHelper.addWorkItemLinks(workItem, selectedResults);
            });
        }
    }

    @autobind
    private _onSearch(searchKey: string) {

        this._searchBoxValue = searchKey;
        searchKey = searchKey.trim();
        if (searchKey !== "") {
            this._showSuggestionMessage = false;
            this.props.actionCreator.fetchCategoryTypeWorkItems(searchKey, this.props.workItemType);
        }
    }

    @autobind
    private _onClear(ev?: any) {
        this._searchBoxValue = "";
        this.props.actionCreator.clearResult();

        this._showSuggestionMessage = true;
        this.props.actionCreator.fetchCategoryTypeWorkItems(this._searchBoxValue, this.props.workItemType);

    }

    private _getDetailList(): JSX.Element {
        if (!this._showSuggestionMessage && this.state.searchTriggered && (this.state.workItems === null || this.state.workItems.length === 0)) {

            this._columnState = this._getColumnsForDetailsList();
            return (this._getNoResultErrorMessageBar());
		}

		if (this.state.workItems && this.state.workItems.length > 0) {
			announce(Utils_String.format(Resources.AnnounceFetchedResults, this.state.workItems.length));
		}

        return (
            <div className="dialog-infobar-and-result-list">
                {
                    !this._showSuggestionMessage && this.state.workItems && this.state.workItems.length >= this._maxResultCount && this._getResultCountInformationMessageBar()
                }
                {
                    this._showSuggestionMessage && this.state.workItems && this.state.workItems.length > 0 && this._getShowSuggestionMessageBar(this.state.workItems.length)
                }
                {
                    this.state.workItems && (this.state.workItems.length > 0) &&
                    <div className="dialog-workitem-list">
                        <VssDetailsList
                            columns={this._columnState}
                            items={this.state.workItems}
                            setKey="set"
                            layoutMode={DetailsListLayoutMode.fixedColumns}
                            ariaLabelForGrid={this._getAriaLabelForGrid() }
                            checkboxVisibility={CheckboxVisibility.hidden}
                            compact={true}
                            isHeaderVisible={true}
                            selectionPreservedOnEmptyClick={true}
                            selectionMode={SelectionMode.single}
                            constrainMode={ConstrainMode.unconstrained}
                            selection={this.state.selection}
                            onActiveItemChanged={(item) => this._onActiveItemChanged(item)}
                            onColumnHeaderClick={this._SortColumn}>
                        </VssDetailsList>
                    </div>
                }
            </div>
        );
    }

    @autobind
    private _getAriaLabelForGrid(): string {
        switch (this.props.workItemType) {
            case QueryRequirementHelper.workItemCategoryType.Bug:
                return Resources.BugsText;
            case QueryRequirementHelper.workItemCategoryType.Requirement:
                return Resources.RequirementText;
        }

        return Resources.WorkItemsText;
    }

    private _getColumnsForDetailsList(): IColumn[] {
        let column: IColumn[] = [
            {
                fieldName: Resources.IdColumnTitle,
                key: "id",
                name: Resources.IdColumnTitle,
                minWidth: 50,
                isResizable: true,
                headerClassName: "dialog-detail-list-column-header",
                className: "dialog-detail-list-column-header",
                columnActionsMode: ColumnActionsMode.clickable,
                isSorted: true,
                isSortedDescending: false,
                onRender: this._onRenderIdColumn,
            },
            {
                fieldName: Resources.WorkItemGridTitleColumnHeader,
                key: "title",
                name: Resources.WorkItemGridTitleColumnHeader,
                minWidth: 200,
                isResizable: true,
                headerClassName: "dialog-detail-list-column-header",
                className: "dialog-detail-list-column-header",
                columnActionsMode: ColumnActionsMode.clickable,
                isSorted: false,
                isSortedDescending: true,
                onRender: this._onRenderTitleColumn,
            },
            {
                fieldName: Resources.QueryColumnNameState,
                key: "state",
                name: Resources.QueryColumnNameState,
                minWidth: 100,
                isResizable: true,
                headerClassName: "dialog-detail-list-column-header",
                className: "dialog-detail-list-column-header",
                columnActionsMode: ColumnActionsMode.clickable,
                isSorted: false,
                isSortedDescending: true,
                onRender: this._onRenderStateColumn,
            },
            {
                fieldName: Resources.AssignedTo,
                key: "assignedTo",
                name: Resources.AssignedTo,
                minWidth: 130,
                isResizable: true,
                headerClassName: "dialog-detail-list-column-header",
                className: "dialog-detail-list-column-header",
                columnActionsMode: ColumnActionsMode.clickable,
                isSorted: false,
                isSortedDescending: true,
                onRender: this._onRenderAssignedToColumn,
            }
        ];

        return column;
    }

    @autobind
    private _onRenderIdColumn(item: WorkItem, index: number, column?: IColumn): JSX.Element {
        let id = item.id;
        let _tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        // Full screen link
        let url: string = _tfsContext.getPublicActionUrl("", "workitems")
            + "#_a=edit&id="
            + id
            + "&"
            + Navigation.FullScreenHelper.FULLSCREEN_HASH_PARAMETER
            + "=true";

        return (
            <Link href={url}
                target={"_blank"}
                className={"artifact-url"}
                rel={"nofollow noopener noreferrer"} >
                {item.id}
            </Link>
        );
    }

    @autobind
    private _onRenderTitleColumn(item: WorkItem, index: number, column?: IColumn): JSX.Element {
        const title = item.fields[WITConstants.CoreFieldRefNames.Title];
        const colorAndIcon = this.state.workItemTypeColorAndIcon[item.fields[WITConstants.CoreFieldRefNames.WorkItemType]];

        return (
            <TooltipHost content={title}>
                <span className={css("bowtie-icon bug-symbol-styling", colorAndIcon.icon)} style={{ color: colorAndIcon.color }}></span>
                <span className="dialog-ellipsis">{title}</span>
            </TooltipHost>
        );
    }

    @autobind
    private _onRenderStateColumn(item: WorkItem, index: number, column?: IColumn): JSX.Element {
        let state = item.fields[WITConstants.CoreFieldRefNames.State];
        let stateColor = this.state.WorkItemsStateColor[state];

        return (
            <div className="work-item-state">
                <span className="state-circle" style={{ color: stateColor, backgroundColor: stateColor }}></span>
                <span className="dialog-ellipsis" >{state}</span>
            </div>
        );
    }

    @autobind
    private _onRenderAssignedToColumn(item: WorkItem, index: number, column?: IColumn): JSX.Element {
        let identity: any;
        let identifier = item.fields[WITConstants.CoreFieldRefNames.AssignedTo];
        if (typeof identifier === "string") {
            identity = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(identifier);
        }
        else {
            identity = identifier;
        }

        let displayname = "";
        let distinctName = "";

        if (identity) {
            displayname = identity.displayName;
            distinctName = TFS_OM_Identities.IdentityHelper.getFriendlyDistinctDisplayName(identity);
            return (
                <TooltipHost content={distinctName}>
                    <span className="dialog-ellipsis">{displayname}</span>
                </TooltipHost>
            );
        }
    }

    @autobind
    private _SortColumn(event: React.MouseEvent<HTMLElement>, column: IColumn) {
        let { workItems } = this.state;

        if (workItems && workItems.length > 0) {
            let isSortedDescending = column.isSortedDescending;
            const columnName = column.fieldName;

            // If we've sorted this column, flip it.
            if (column.isSorted) {
                isSortedDescending = !isSortedDescending;
            }

            // Sort the items.
            workItems = workItems.concat([]).sort((a, b) => {
                return this._performComparison(a, b, columnName, isSortedDescending);
            });

            // Reset the items and columns to match the state.
            this._columnState = this._columnState.map(col => {
                col.isSorted = (col.key === column.key);

                if (col.isSorted) {
                    col.isSortedDescending = isSortedDescending;
                }

                return col;
            });

            this.props.actionCreator.onColumnSorted(workItems);

            if (column.isSorted) {
                if (isSortedDescending) {
                    announce(Utils_String.format(Resources.AnnounceSortedDesc, column.fieldName));
                } else {
                    announce(Utils_String.format(Resources.AnnounceSortedAsc, column.fieldName));
                }
            }
        }
    }

    private _performComparison(row1: WorkItem, row2: WorkItem, columnName: string, isSortedDescending: boolean): number {
        let firstValue: any;
        let secondValue: any;
        let isNumber = false;

        if (columnName === Resources.IdColumnTitle) {
            firstValue = row1.id;
            secondValue = row2.id;
            isNumber = true;
        } else if (columnName === Resources.WorkItemGridTitleColumnHeader) {
            firstValue = row1.fields["System.Title"];
            secondValue = row2.fields["System.Title"];
            isNumber = false;
        } else if (columnName === Resources.QueryColumnNameState) {
            firstValue = row1.fields["System.State"];
            secondValue = row2.fields["System.State"];
            isNumber = false;
        } else if (columnName === Resources.AssignedTo) {
            firstValue = row1.fields["System.AssignedTo"];
            secondValue = row2.fields["System.AssignedTo"];
            isNumber = false;
        }

        if (isNumber) {
            if (isSortedDescending) {
                return firstValue > secondValue ? -1 : 1;
            } else {
                return firstValue > secondValue ? 1 : -1;
            }
        }
        else {
            if (isSortedDescending) {
                return Utils_String.localeIgnoreCaseComparer(secondValue, firstValue);
            } else {
                return Utils_String.localeIgnoreCaseComparer(firstValue, secondValue);
            }
        }
    }

    private _onActiveItemChanged = (item: any, ev?: any): void => {
        this.setState({ itemSelecled: true });
    }

    private _getResultCountInformationMessageBar(): JSX.Element {
        let message = Utils_String.format(Resources.ShowingCountOfTopSearchResults, this._maxResultCount);
        return (
            <Fabric className="dialog-workitem-result-count-info-bar"
                hidden={!this.state.ShowWorkItemCountInfoBar}>
                <MessageBar
                    messageBarType={MessageBarType.info}
                    ariaLabel={message}
                    dismissButtonAriaLabel={Resources.ClearInformationMessage}
                    isMultiline={false}
                    onDismiss={delegate(this, this._onDismissMessageBar)}>
                    {message}
                </MessageBar>
            </Fabric>);
    }

    private _getShowSuggestionMessageBar(count: number): JSX.Element {
        let message = Utils_String.format(Resources.ShowingSuggestionCount, count);
        return (
            <Fabric className="dialog-workitem-result-count-info-bar">
                <MessageBar
                    messageBarType={MessageBarType.info}
                    ariaLabel={message}
                    isMultiline={false}>
                    {message}
                </MessageBar>
            </Fabric>);
    }

    private _getLoadingSpinner(): JSX.Element {
        return (
            <div className="dialog-infobar-and-result-list">
                <Spinner
                    ariaLabel={Resources.FetchingResultText}
                    className="dialog-workitem-loading-spinner"
                    size={SpinnerSize.large}
                    label={Resources.FetchingResultText} />
            </div>
        );
    }

    private _getErrorMessageBar(): JSX.Element {
        return (
            <div className="dialog-infobar-and-result-list">
                <Fabric>
                    <MessageBar
                        messageBarType={MessageBarType.error}
                        ariaLabel={Resources.ErrorMessageLabel}
                        isMultiline={true}>
                        {this.state.errorMessage.toString()}
                    </MessageBar>
                </Fabric>
            </div>
        );
    }

    private _getNoResultErrorMessageBar(): JSX.Element {
        return (
            <div className="dialog-infobar-and-result-list">
                <Fabric>
                    <MessageBar
                        messageBarType={MessageBarType.error}
                        ariaLabel={Resources.NoResultFound}
                        isMultiline={false}>
                        {Resources.NoResultFound}
                    </MessageBar>
                </Fabric>
            </div>
        );
    }

    @autobind
    private _onDismissMessageBar() {
        this.props.actionCreator.closeInfoBar();
    }

    public static _createEmptyTestCaseResultObject(selectedTreeData: ITestResultTreeData) {
        let testRun = {} as Contracts.ShallowReference;
        testRun.id = selectedTreeData.runId.toString();
        let testCase = {} as Contracts.ShallowReference;

        if (selectedTreeData.testcaseObject) {
            testCase = selectedTreeData.testcaseObject;
        }

        if (testCase.name === null) {
            testCase.name = Utils_String.empty;
        }

        let testCaseResult = {} as Contracts.TestCaseResult;
        testCaseResult.testCase = testCase;
        testCaseResult.testRun = testRun;
        testCaseResult.id = selectedTreeData.resultId;
        testCaseResult.testCaseReferenceId = selectedTreeData.testCaseRefId || 0;
        return testCaseResult;
    }

    private _handleStoreChange = (): void => {
        this.setState(this.props.store.getState());
    }

    private _source: TestResultSource;
    private _maxResultCount: number = 25;
    private _showSuggestionMessage: boolean;
    private _searchBoxValue: string;
    private _columnState: IColumn[];
}
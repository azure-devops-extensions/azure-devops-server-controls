/// <reference types="react" />
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { IIconProps } from "OfficeFabric/Icon";
import { autobind, css } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { ITestResultTreeData } from "TestManagement/Scripts/Scenarios/Common/Common";
import {
    ITestResultDetailsViewState,
    TestResultDetailsViewStore,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Stores/TestResultDetailsViewStore";
import {
    AssociateWITDialogActionsCreator,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/AssociateWITDialogActionsCreator";
import {
    AssociateWITDialogActionsHub,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/AssociateWITDialogActionsHub";
import * as AlertTestResultSelection from "TestManagement/Scripts/Scenarios/TestTabExtension/Components/AlertTestResultSelection";
import * as AssociateWorkItem from "TestManagement/Scripts/Scenarios/TestTabExtension/Components/AssociateWorkItem";
import * as QueryRequirementHelper from "TestManagement/Scripts/Scenarios/TestTabExtension/Helpers/QueryWorkItemHelper";
import { TestResultSource } from "TestManagement/Scripts/Scenarios/TestTabExtension/Sources/TestResultSource";
import { AssociateWITDialogStore } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/AssociateWITDialogStore";
import { TestResultsStore } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/TestResultsGridTreeStore";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as TRACommonControls from "TestManagement/Scripts/TFS.TestManagement.RunsView.Common.Controls";
import * as Contracts from "TFS/TestManagement/Contracts";
import * as Utils_String from "VSS/Utils/String";
import { IPivotBarAction } from "VSSUI/PivotBar";

export class AddBugAndWorkItem {
    public static Add_Associated_WorkItem = "related-requirements";
    public static Add_Bug = "Add-bug";
    public static Create_Bug = "create-bug";
    public static Add_To_Existing_Bug = "add-to-existing-bug";
    public static File_Bug_ClassName = "testResultToolbar-fileBug-section";
    public static Add_Associated_WorkItem_ClassName = "testResultToolbar-addWorkItem-section";
}

export class AddWorkItemHelper {

    constructor(protected _context: Common.IViewContextData){
        this._source = TestResultSource.getInstance();
        this._maxAttachmentCount = 50;
    }

    @autobind
    public onAssociateWorkItemClick(selectedTreeDatas: ITestResultTreeData[]) {

        let actionHub = new AssociateWITDialogActionsHub();
        let actionCreator = new AssociateWITDialogActionsCreator(actionHub, this._source);
        let store = new AssociateWITDialogStore(actionHub);

        let props: AssociateWorkItem.IAssociateWorkItemProps = {
            header: Resources.RelatedRequirementDialogTitle,
            saveButtonText: Resources.RequirementDialogOkText,
            SearchBoxLabelText: Resources.SearchWorkItemWatermarkText,
            searchBoxValue: "",
            workItemType: QueryRequirementHelper.workItemCategoryType.Requirement,
            onCloseDialog: this._onCloseDialog,
            onSaveDialog: this._onSaveDialog,
            actionCreator: actionCreator,
            store: store,
            selectedTestResults: selectedTreeDatas,
            context: this._context,
            elementToFocusOnDismiss: this._getAssociatedWorkItemElement()
        };

        this._placeToShowDialogBox = document.createElement("div");
        AssociateWorkItem.renderDialog(this._placeToShowDialogBox, props);
    }

    @autobind
    protected _onCloseDialog() {
        AssociateWorkItem.unmountDialog(this._placeToShowDialogBox);
    }

    @autobind
    protected _onSaveDialog() {
        AssociateWorkItem.unmountDialog(this._placeToShowDialogBox);
    }

    public openCreateBugWindow(selectedTreeDatas: ITestResultTreeData[]) {
        let selectedResults: Contracts.TestCaseResult[] = [];
        let subResultId: number;
        
        this._source.getSelectedTestCaseResult(this._context, selectedTreeDatas[0].runId, selectedTreeDatas[0].resultId).then(result => {
            
            if (selectedTreeDatas[0].subResultId) {
                subResultId = selectedTreeDatas[0].subResultId;
            }
            
            // We are fetching detailed test result for first element only. For rest we are sending only ids.
            selectedResults.push(result);
            
            for (let i = 1; i < selectedTreeDatas.length; i++) {
                selectedResults.push(AssociateWorkItem.AssociateWorkItemComponent._createEmptyTestCaseResultObject(selectedTreeDatas[i]));
            }

            if (selectedResults.length > 0) {
                TRACommonControls.BugWorkItemHelper.createAndShowWorkItem(null, selectedResults, null, subResultId);
            }
            else {
                TRACommonControls.BugWorkItemHelper.createAndShowWorkItem(null, null, null);
            }
        });
    }

    public openAddToExistingBugWindow(selectedTreeDatas: ITestResultTreeData[]) {

        let actionHub = new AssociateWITDialogActionsHub();
        let actionCreator = new AssociateWITDialogActionsCreator(actionHub, this._source);
        let store = new AssociateWITDialogStore(actionHub);

        let props: AssociateWorkItem.IAssociateWorkItemProps = {
            header: Resources.ExistingBugDialogText,
            saveButtonText: Resources.AddToBugButton,
            SearchBoxLabelText: Resources.AddToExistingBugWatermarkText,
            searchBoxValue: selectedTreeDatas && selectedTreeDatas.length === 1 ? selectedTreeDatas[0].test : null,
            workItemType: QueryRequirementHelper.workItemCategoryType.Bug,
            onCloseDialog: this._onCloseDialog,
            onSaveDialog: this._onSaveDialog,
            actionCreator: actionCreator,
            store: store,
            selectedTestResults: selectedTreeDatas,
            context: this._context,
            elementToFocusOnDismiss: this._getFileBugElement()
        };

        this._placeToShowDialogBox = document.createElement("div");
        AssociateWorkItem.renderDialog(this._placeToShowDialogBox, props);
    }

    private _getFileBugElement(): HTMLElement{
        let fileBugElement: HTMLCollectionOf<Element> = document.getElementsByClassName(AddBugAndWorkItem.File_Bug_ClassName);
        if (fileBugElement && fileBugElement.length === 1) {
            return <HTMLElement>fileBugElement[0].firstElementChild;
        }

        return null;
    }

    private _getAssociatedWorkItemElement(): HTMLElement {
        let fileBugElement: HTMLCollectionOf<Element> = document.getElementsByClassName(AddBugAndWorkItem.Add_Associated_WorkItem_ClassName);
        if (fileBugElement && fileBugElement.length === 1) {
            return <HTMLElement>fileBugElement[0];
        }

        return null;
    }

    protected _maxAttachmentCount: number;
    protected _source: TestResultSource;
    protected _placeToShowDialogBox: Element;
}

export class AddWorkItemHelperForDetailPanel extends AddWorkItemHelper{
    constructor(private _testResultDetailsStore: TestResultDetailsViewStore, context: Common.IViewContextData) {
        super(context);
    }

    public getAddBugAction(): IPivotBarAction {
        const createOrAddOperationString: string = Utils_String.format(Resources.CreateOrAddToExistingWorkItemText, Resources.BugCategoryRefName);
        const commandBarItem: IPivotBarAction = {
            key: AddBugAndWorkItem.Add_Bug,
            name: Resources.BugText,
            title: Resources.BugText,
            important: true,
            children: this._getAddBugSubActions(),
            iconProps: { iconName: "FileBug" }
        } as IPivotBarAction;

        return commandBarItem;
    }

    private _getAddBugSubActions(): IPivotBarAction[] {
        let createBugText: string = Utils_String.format(Resources.CreateWorkItemText, Resources.BugCategoryRefName);
        let addBugText: string = Utils_String.format(Resources.AddToExistingBugText, Resources.BugCategoryRefName);
        return [
            {
                key: AddBugAndWorkItem.Create_Bug,
                name: createBugText,
                iconProps: { className: "bowtie-icon-color bowtie-icon bowtie-work-item" },
                onClick: this._onMenuItemClick
            },
            {
                key: AddBugAndWorkItem.Add_To_Existing_Bug,
                name: addBugText,
                iconProps: { className: "bowtie-icon-color bowtie-icon bowtie-link"},
                onClick: this._onMenuItemClick
            }
        ];
    }

    public getLinkAction(): IPivotBarAction {
        return {
            key: AddBugAndWorkItem.Add_Associated_WorkItem,
            important: true,
            name: Resources.LinkText,
            ariaLabel: Resources.LinkText,
            iconProps: { iconName: "Link" },
            onClick: this._onMenuItemClick
        };
    }

    @autobind
    private _onMenuItemClick(ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem): void {

        let selectedTreeData = this._getSelectedTestResults();
        let telemetryFeature: string = null;
        if (item.key === AddBugAndWorkItem.Create_Bug) {
            this.openCreateBugWindow(selectedTreeData);
            telemetryFeature = TestTabTelemetryService.featureTestTab_CreateBugClicked;
        }
        else if (item.key === AddBugAndWorkItem.Add_To_Existing_Bug) {
            this.openAddToExistingBugWindow(selectedTreeData);
            telemetryFeature = TestTabTelemetryService.featureTestTab_AddBugToExistingClicked;
        }
        else if (item.key === AddBugAndWorkItem.Add_Associated_WorkItem) {
            this.onAssociateWorkItemClick(selectedTreeData);
            telemetryFeature = TestTabTelemetryService.featureTestTab_AddTestTaskLinkClicked;
        }

        if (telemetryFeature) {
            TestTabTelemetryService.getInstance().publishDetailsPaneEvent(telemetryFeature, TestTabTelemetryService.eventClicked, item.key);
        }
    }

    private _getSelectedTestResults(): ITestResultTreeData[] {
        let testResultDetailsViewState: ITestResultDetailsViewState = this._testResultDetailsStore.getState();
        let selectedTreeData: ITestResultTreeData = {
            test: testResultDetailsViewState.testResults.test,
            runId: testResultDetailsViewState.testResults.runId,
            resultId: testResultDetailsViewState.testResults.result.id,
            testCaseRefId: testResultDetailsViewState.testResults.result.testCaseReferenceId,
            testTitle: testResultDetailsViewState.testResults.result.automatedTestName,
            storage: testResultDetailsViewState.testResults.result.automatedTestStorage || Utils_String.empty
        } as ITestResultTreeData;
        return [selectedTreeData];
    }
}

export class AddWorkItemHelperForList extends AddWorkItemHelper {

    constructor(private _testResultTreeStore: TestResultsStore, context: Common.IViewContextData) {
        super(context);
    }

    public getAddBugCommandBarItem(IsDisabled: boolean): IContextualMenuItem {
        const createOrAddOperationString: string = Utils_String.format(Resources.CreateOrAddToExistingWorkItemText, Resources.BugCategoryRefName);
        const commandBarItem: IContextualMenuItem = {
            key: AddBugAndWorkItem.Add_Bug,
            name: Resources.BugText,
            ariaLabel: Resources.BugText,
            iconProps: { iconName: "FileBug" },
            disabled: IsDisabled,
            className: AddBugAndWorkItem.File_Bug_ClassName,
            subMenuProps: {
                items: this._getAddBugSubMenus(),
                onItemClick: this._onMenuItemClick,
            }
        } as IContextualMenuItem;

        return commandBarItem;
    }

    private _getAddBugSubMenus() {
        let createBugText: string = Utils_String.format(Resources.CreateWorkItemText, Resources.BugCategoryRefName);
        let addBugText: string = Utils_String.format(Resources.AddToExistingBugText, Resources.BugCategoryRefName);
        return [
            {
                key: AddBugAndWorkItem.Create_Bug,
                name: createBugText,
                iconProps: { className: css("bowtie-icon-color bowtie-icon bowtie-work-item") } as IIconProps,
            },
            {
                key: AddBugAndWorkItem.Add_To_Existing_Bug,
                name: addBugText,
                iconProps: { className: css("bowtie-icon-color bowtie-icon bowtie-link") } as IIconProps
            }
        ];
    }

    public getLinkMenuItem(IsDisabled: boolean): IContextualMenuItem {
        return {
            key: AddBugAndWorkItem.Add_Associated_WorkItem,
            name: Resources.LinkText,
            ariaLabel: Resources.LinkText,
            className: AddBugAndWorkItem.Add_Associated_WorkItem_ClassName,
            iconProps: { iconName: "Link" },
            disabled: IsDisabled,
            onClick: this._onMenuItemClick
        };
    }

    @autobind
    private _onMenuItemClick(ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem): void {

        let selectedTreeDatas = this._getNonGroupSelectedTestResult();

        if (selectedTreeDatas && selectedTreeDatas.length > this._maxAttachmentCount) {
            let props: AlertTestResultSelection.IAlertTestResultSelectionProps = {
                header: Resources.ThresholdTestResultSelectionHeader,
                subText: Resources.MaximumTestLimitErrorMessage,
                onCloseDialog: this._onCloseDialog,
            };

            AlertTestResultSelection.renderDialog(this._placeToShowDialogBox, props);
        }

        let subResultCount: number = 0;
        let resultCount: number = 0;

        selectedTreeDatas.forEach((treeData) => {
            if (treeData.subResultId) {
                subResultCount++;
            } else {
                resultCount++;
            }
        });

        if (subResultCount > 0) {
            TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureResultDetails_AssociateWorkItem, {
                "Method": item.key,
                "ResultCount": resultCount,
                "SubresultCount": subResultCount
            });
        }


        if (selectedTreeDatas && selectedTreeDatas.length > 0) {
            if (item.key === AddBugAndWorkItem.Create_Bug) {
				this.openCreateBugWindow(selectedTreeDatas);
				TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestTab_CreateBugClicked, {
                   "IsMultiSelect": selectedTreeDatas.length > 1
                });
            }
            else if (item.key === AddBugAndWorkItem.Add_To_Existing_Bug) {
				this.openAddToExistingBugWindow(selectedTreeDatas);
				TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestTab_AddBugToExistingClicked, {
                    "IsMultiSelect": selectedTreeDatas.length > 1
                 });
            }
            else if (item.key === AddBugAndWorkItem.Add_Associated_WorkItem) {
				this.onAssociateWorkItemClick(selectedTreeDatas);
				TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureResultDetails_AssociateWorkItem, {
                    "IsMultiSelect": selectedTreeDatas.length > 1
                 });
            }
        }
        else {
            let props: AlertTestResultSelection.IAlertTestResultSelectionProps = {
                header: Resources.NoTestResultsSelected,
                subText: Resources.SelectResultAndTry,
                onCloseDialog: this._onCloseDialog,
            };

            AlertTestResultSelection.renderDialog(this._placeToShowDialogBox, props);
        }
    }

    private _getNonGroupSelectedTestResult(): ITestResultTreeData[] {
        let selectedTreeDatas: ITestResultTreeData[] = this._testResultTreeStore.getState().selection.getSelection() as ITestResultTreeData[];
        let selectedNonGroupTreeData: ITestResultTreeData[] = [];

        if (selectedTreeDatas && selectedTreeDatas.length > 0) {
            selectedTreeDatas.forEach(result => {
                if (result.isTestCaseRow) {
                    selectedNonGroupTreeData.push(result);
                }
            });
        }

        return selectedNonGroupTreeData;
    }
}
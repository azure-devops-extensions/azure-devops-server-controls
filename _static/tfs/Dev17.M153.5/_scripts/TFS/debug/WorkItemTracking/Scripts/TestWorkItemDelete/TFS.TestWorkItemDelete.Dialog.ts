// Copyright (c) Microsoft Corporation.  All rights reserved.

import Q = require("q");
import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import DeleteMenuItemHelper = require("WorkItemTracking/Scripts/MenuItems/DeleteMenuItemCommonHelper");
import Dialogs = require("VSS/Controls/Dialogs");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import TestWorkItemDelete = require("WorkItemTracking/Scripts/TestWorkItemDelete/TFS.TestWorkItemDelete");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_String = require("VSS/Utils/String");
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WITControlsRecycleBin = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin");
import { WorkItemCategoryConstants } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import Events_Action = require("VSS/Events/Action");
import Utils_UI = require("VSS/Utils/UI");
import "VSS/LoaderPlugins/Css!TestWorkItemDelete/TestWorkItemDeleteDialog";

/**
 * CSS class constants
 */
export class ClassConstants {
    public static DeleteWarningMessage = "delete-warning-message";
    public static TestWorkItemDeleteDialogDivider = "test-workitem-delete-dialog-divider";
    public static TestWorkItemDeleteDialogShowDivider = "test-workitem-delete-dialog-show-divider";
    public static TestWorkItemDeleteImplications = "test-workitem-delete-implications";
    public static TestWorkItemDeleteInput = "test-workitem-delete-input";
    public static FetchTestWorkItemDeleteImplicationsControlOverlay = "fetch-implications-control-overlay";
    public static BigStatusImageClass = "big-status-progress";
    public static TestWorkItemDeleteInputLabel = "test-workitem-delete-inputlabel";
	public static TestWorkItemDeleteInputLabelId = "test-workitem-delete-inputllabel-id";
    public static TestWorkItemDeleteInputBox = "test-workitem-delete-inputbox";
    public static TestImplicationNodeLevel1 = "testimplication-node-level1";
    public static TestImplicationNodeLevel2 = "testimplication-node-level2";
    public static TestImplicationNodeLevel = "testimplication-node-level";
    public static TestImplicationLevel1Div = "testimplication-level1-div";
    public static TestImplicationLevel2DivTestCase = "testimplication-level2-div-testcase";
    public static TestImplicationLevel2DivNonTestCase = "testimplication-level2-div-nontestcase";
    public static TestImplicationLevel3DivTestCase = "testimplication-level3-div-testcase";
    public static TestImplicationLevel3DivNonTestCase = "testimplication-level3-div-nontestcase";
    public static TestImplicationLevel4Div = "testimplication-level4-div";
    public static TestImplicationLevel1Text = "testimplication-level1-text";
    public static TestImplicationLevel2Text = "testimplication-level2-text";
    public static TestImplicationLevelText = "testimplication-level-text";
    public static SiblingImpactList = "testimplication-impact-sibling";
    public static TestCaseImpactList = "testimplication-testcase-impact";
    public static TotalImpactList = "testimplication-total-impact";
    public static AnnotatedImpact = "testimplication-annotated-impact";
    public static ImpactAnnotation = "testimplication-impact-annotation";
    public static TestImplicationDottedLineBorder = "testimplication-dottedline-border";
    public static TestImplicationDashedLineBorder = "testimplication-dashedline-border";
    public static TestImplicationAffectedItems = "testimplication-affected-items";
    public static TestImplicationDeleteTestCase = "testimplication-delete-testcase";
    public static TestImplicationDeletedNonTestCase = "testimplication-delete-nontestcase";
    public static TestImplicationDeletedItems = "testimplication-deleted-items";
    public static TestImplicationAffectedItemsBorder = "testimplication-affected-items-border";
    public static TestWorkItemDeleteInputBoxSelector = "." + ClassConstants.TestWorkItemDeleteInputBox;
}

/**
 * options for TestDeleteConfirmationDialog 
 * @interface ITestDeleteConfirmationDialogOptions
 */
export interface ITestDeleteConfirmationDialogOptions extends Dialogs.IConfirmationDialogOptions {
    workItemId?: number;
    workItemType?: string;
    projectId?: string;
}

/**
 * Base confirmation dialog upon test work item delete.
 * @class BaseTestDeleteConfirmationDialog
 */
export class BaseTestDeleteConfirmationDialog extends WITControlsRecycleBin.BaseConfirmationDialog<ITestDeleteConfirmationDialogOptions> {
    public testDeleteImplications: JQuery;
    public testDeleteWorkItemInput: JQuery;
    private _controlOverlay: JQuery;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _inputTextBox: JQuery;
    private _dividerLine: JQuery;
    private static learnMoreLink = "https://go.microsoft.com/fwlink/?LinkId=723407";
    private static testManagementControllerName = "testManagement";
    private static workItemsControllerName = "workitems";

    /**
     * Control Initialize
     */
    public initialize() {
        super.initialize();
        super.updateOkButton(false);
    }

    /**
     * Unbind event before closing dialog
     */
    public onClose() {
        this._statusIndicator = null;
        this._controlOverlay = null;
        // Remove all event handlers from input text box
        if (this._inputTextBox) {
            this._inputTextBox.off();
        }
        super.onClose();
    }

    /**
     * Get the dialog option
     * @param callback
     */
    public getDialogOption(workItemId: number, workItemType: string, callback: () => void, projectId: string) {
        return {
            okCallback: () => {
                if ($.isFunction(callback)) {
                    callback();
                }
            },
            title: WITResources.TestWorkItemDeleteDialogTitle,
            okText: WITResources.TestWorkItemDeleteButtonText,
            workItemId: workItemId,
            workItemType: workItemType,
            projectId: projectId
        };
    }

    /*
     * Get the confirmation message element
     * @return The confirmation message element
     */
    public getConfirmationMessageElement(text: string): JQuery {
        var $confirmationMessage = $("<td>").addClass(ClassConstants.DeleteWarningMessage).html(text);
        $confirmationMessage.append("<br>").append("<br>");

        //placeholder div for divider line
        this._dividerLine = $("<div>").addClass(ClassConstants.TestWorkItemDeleteDialogDivider);
        $confirmationMessage.append(this._dividerLine);
        $confirmationMessage.append("<br>");

        // Show Control busy overlay by default until we fetch implications
        this.showOverlay($confirmationMessage, WITResources.FetchingImplications);

        //place holder for showing implications
        this.testDeleteImplications = $("<div>").addClass(ClassConstants.TestWorkItemDeleteImplications);
        $confirmationMessage.append(this.testDeleteImplications);
        $confirmationMessage.append("<br>");

        //place holder for showing input text box
        this.testDeleteWorkItemInput = $("<div>").addClass(ClassConstants.TestWorkItemDeleteInput);
        $confirmationMessage.append(this.testDeleteWorkItemInput);

        return $confirmationMessage;
    }

    /**
     * Shows an overlay over the entire control with a status indicator on top.
     * @param element Element where spinner appended
     * @param message The text to display next to the spinner
     */
    public showOverlay(element: JQuery, message: string) {
        if (!this._controlOverlay) {
            this._controlOverlay = $("<div />").addClass(ClassConstants.FetchTestWorkItemDeleteImplicationsControlOverlay)
                .appendTo(element);
        }

        var statusOptions = {
            center: true,
            imageClass: ClassConstants.BigStatusImageClass,
            message: message,
            throttleMinTime: 0
        };
        this._statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._controlOverlay, statusOptions);        
        this._statusIndicator.start();

        this._controlOverlay.show();
    }

    /**
     * Hides the overlay
     */
    public hideOverlay() {
        if (this._controlOverlay) {
            this._statusIndicator.complete();
            this._controlOverlay.hide();
            this._controlOverlay.empty();
        }
    }

    /**
     * This method will hide the progress bar and show the input box for the user to enter the work item id
     * @param showDividerLine
     */
    public postQueryingTestImplication(showDividerLine: boolean = true) {
        // Hide the busy control overlay
        this.hideOverlay();

        if (showDividerLine) {
            this._dividerLine
                .addClass(ClassConstants.TestWorkItemDeleteDialogShowDivider);
        }

        //div for input text label
        var inputLableText = Utils_String.format(WITResources.TestWorkItemDeleteDialogInputLabel, this._options.workItemType);
        var $inputTextLabelDiv = $("<div>").addClass(ClassConstants.TestWorkItemDeleteInputLabel);
            
	    var $inputLabelTag = $("<label/>").attr("id", ClassConstants.TestWorkItemDeleteInputLabelId)
		    .append(inputLableText)
            .append("<br>");
		$inputTextLabelDiv.append($inputLabelTag);

        // input text box to take work item id
        this._inputTextBox = $("<input />")
            .attr("type", "text")
            .attr("maxLength", "10") // restricting input box to take more than 10 character (max of int)
			.attr("aria-labelledby", ClassConstants.TestWorkItemDeleteInputLabelId)
            .addClass(ClassConstants.TestWorkItemDeleteInputBox);

        if (this._inputTextBox[0]) {
        this._inputTextBox[0].onkeyup = (e?) => this.updateOkButtonDelegate();
            this._inputTextBox[0].onkeypress = (e?) => this.updateOkButtonDelegate();
        }

        this.testDeleteWorkItemInput
            .append($inputTextLabelDiv)
            .append(this._inputTextBox);

        this._foucsInputBox();
    }

    /**
     * Update the OK button, in the beginning it would be in disabled state
     * Once all test implications fetched and user enter right work item id in
     * input box then enable the OK button
     */
    public updateOkButtonDelegate() {
        var inputText: string = this._inputTextBox.val();
      
        if(inputText.length === this._options.workItemId.toString().length)
        {
            if (inputText === this._options.workItemId.toString()) {
                super.updateOkButton(true);
            }
            else {
                super.updateOkButton(false);
            }
        }
        else
        {
            super.updateOkButton(false);
        } 
    }

    public showDialog(workItemId: number, workItemType:string, callback: () => void) {
    }

    public deleteTestWorkItem(ciLaunchPoint: string, ciSourceName: string, workItemId: number,
        suppressFailureNotification?: boolean, successCallback?: () => void, errorCallback?: (exception: Error) => void) {
    }

    public buildLearnMoreLink(): string {
        var $div = $("<div>");
        var $a = $("<a>")
            .attr("href", BaseTestDeleteConfirmationDialog.learnMoreLink)
            .attr("tabindex", "0")
            .attr("target", "_blank")
            .attr("rel", "noopener noreferrer")
            .text(WITResources.DeleteWorkItemDialogConfirmationTextLearnMoreLink);
        $div.append($a);
        return $div.html();
    }

    /**
     * Render the test implication tree in the dialog
     * @param testImplications test implication for the deleting work item
     * @param workItemRefType Work item reference type
     * @param workItemId work item to be deleted
     */
    public renderTestImplicationElement(testImplications: TestWorkItemDelete.ITestDeleteImplications, workItemRefType: string, workItemId: number) {
        var $level1TextDiv = $("<span>")
            .addClass(ClassConstants.TestImplicationLevel1Text)
            .append(this._getIconSpan("bowtie-tfvc-change-list"))

        var $level2TextDiv = $("<span>")
            .addClass(ClassConstants.TestImplicationLevel2Text)
            .append(this._getIconSpan("bowtie-folder"));

        this._appendLevelTextElementToDiv($level1TextDiv, $level2TextDiv, workItemId, workItemRefType, testImplications);

        var $level1Div = this._getLevel1AndLevel2Div(ClassConstants.TestImplicationLevel1Div, "bowtie-chevron-down", $level1TextDiv);

        var $level1 = $("<li>").addClass(ClassConstants.TestImplicationNodeLevel1)
            .append($level1Div);

        var $level2Div: JQuery, $impactList: JQuery, $level3: JQuery;

        var testResultsCountText: string = this._getCountText(testImplications.TestResultsCount);
        var pointCountText: string = this._getCountText(testImplications.PointCount);
        var level3Text = Utils_String.format(pointCountText + WITResources.Tests);
        var level4Text = Utils_String.format(testResultsCountText + WITResources.TestResults);

        var $level4 = this._getLevel3AndLevel4Node(ClassConstants.TestImplicationLevel4Div, "bowtie-navigate-history", level4Text);

        var $level2 = $("<li>").addClass(ClassConstants.TestImplicationNodeLevel2);

        if (workItemRefType === WorkItemCategoryConstants.TEST_CASE) {
            $level2Div = this._getLevel1AndLevel2Div(ClassConstants.TestImplicationLevel2DivTestCase, "bowtie-chevron-right", $level2TextDiv);

            $level3 = this._getLevel3AndLevel4Node(ClassConstants.TestImplicationLevel3DivTestCase, "bowtie-file", level3Text);

            var $testAndTestResultHistoryImpactList = $("<ul>")
                .addClass(ClassConstants.SiblingImpactList)
                .append($level3)
                .append($level4);

            $impactList = $("<ul>")
                .addClass(ClassConstants.TestCaseImpactList)
                .append($level2)
                .append($testAndTestResultHistoryImpactList);
        }
        else {
            $level2Div = $("<div>")
                .addClass(ClassConstants.TestImplicationLevel2DivNonTestCase)
                .append($("<div>")
                    .append(this._getDottedLine()))
                .append($level2TextDiv);

            $level3 = this._getLevel3AndLevel4Node(ClassConstants.TestImplicationLevel3DivNonTestCase, "bowtie-file", level3Text);

            $impactList = $("<ul>")
                .addClass(ClassConstants.SiblingImpactList)
                .append($level2)
                .append($level3)
                .append($level4);
        }

        $level2 = $level2.append($level2Div);

        var $totalImpactList = $("<ul>")
            .addClass(ClassConstants.TotalImpactList)
            .append($level1)
            .append($impactList);

        var $annotatedImpact = $("<div>")
            .addClass(ClassConstants.AnnotatedImpact)
            .append($totalImpactList);

        this._annotateImpact($annotatedImpact, workItemRefType);

        this.testDeleteImplications
            .append($annotatedImpact);
    }

    private _appendLevelTextElementToDiv(level1Div: JQuery, level2Div: JQuery, workItemId: number,
        workItemRefType: string, testImplications: TestWorkItemDelete.ITestDeleteImplications) {
        var level1Text: string, level2Text: string, level3Text: string, level4Text: string, url: string;
        var level1Element: JQuery, level2Element: JQuery;

        var suiteCountText: string = this._getCountText(testImplications.SuitesCount);

        if (workItemRefType === WorkItemCategoryConstants.TEST_CASE) {
            level1Text = Utils_String.format(suiteCountText + WITResources.TestSuites);
            level2Text = Utils_String.format(this._options.workItemType + WITResources.IdColonText + workItemId);
            level1Element = this._getTextSpan(level1Text);
            url = this._getWorkItemUrl(workItemId);
            level2Element = this._attachOnClickAndKeyPressEvent(level2Text, url);
        }
        else {
            level1Text = Utils_String.format(this._options.workItemType + WITResources.IdColonText + workItemId);
            level2Text = Utils_String.format(suiteCountText + WITResources.ChildTestSuites);
            if (workItemRefType === WorkItemCategoryConstants.TEST_SUITE) {
                url = this._getTestSuiteUrl(testImplications.TestPlanId, workItemId);
            }
            else {
                url = this._getTestSuiteUrl(workItemId);
            }
            level1Element = this._attachOnClickAndKeyPressEvent(level1Text, url);
            level2Element = this._getTextSpan(level2Text);
        }

        level1Div.append(level1Element);
        level2Div.append(level2Element);
    }

    private _attachOnClickAndKeyPressEvent(levelText: string, url: string): JQuery {
        let element = this._getHyperlinkElement(levelText).click(() => {
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                        url: url,
                        target: "_blank"} );
        });
        element.keypress((e: JQueryEventObject) => {
            if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                            url: url,
                            target: "_blank"} );
            }
        });

        return element;
    }

    private _getLevel3AndLevel4Node(nodeClass: string, bowtieIconClass: string, text: string): JQuery {
        var $node = $("<li>").addClass(ClassConstants.TestImplicationNodeLevel)
            .append($("<div>")
                .addClass(nodeClass)
                .append($("<div>")
                    .append(this._getDottedLine()))
                .append(($("<span>")
                    .addClass(ClassConstants.TestImplicationLevelText)
                    .append(this._getIconSpan(bowtieIconClass))
                    .append(this._getTextSpan(text)))));

        return $node;
    }

    private _getLevel1AndLevel2Div(nodeClass: string, bowtieIconClass: string, textDiv: JQuery): JQuery {
        var $node = $("<div>")
            .addClass(nodeClass)
            .append($("<span>")
                .addClass("testimplication-bowtie-icon1 bowtie-icon " + bowtieIconClass))
            .append(textDiv);

        return $node;
    }

    private _getCountText(count: number): string {
        var countText: string = count.toString();
        if (count > 1000) {
            countText = "1000+";
        }

        return countText;
    }

    private _annotateImpact(impactList: JQuery, workItemRefType: string) {
        var impactedItems: JQuery, deletedItems: JQuery;
        var $impactAnnotationDiv = $("<div>")
            .addClass(ClassConstants.ImpactAnnotation);

        if (workItemRefType === WorkItemCategoryConstants.TEST_CASE) {
            impactedItems = this._getAffectedItemsLine();
            deletedItems = this._getDeletedItemsLine(ClassConstants.TestImplicationDeleteTestCase);
            impactList
                .append($impactAnnotationDiv
                    .append(impactedItems)
                    .append(deletedItems));
        }
        else {
            deletedItems = this._getDeletedItemsLine(ClassConstants.TestImplicationDeletedNonTestCase);
            impactList.append($impactAnnotationDiv
                .append(deletedItems));
        }
    }

    private _getIconSpan(bowtieIconClass: string): JQuery {
        return $("<span>")
            .addClass("testimplication-bowtie-icon bowtie-icon " + bowtieIconClass);
    }

    private _getTextSpan(messageText: string): JQuery {
        return $("<span>")
            .addClass("testimplication-text-level")
            .text(messageText);
    }

    private _getHyperlinkElement(text:string): JQuery {
        return $("<a>")
            .attr("tabindex", "0")
            .attr("target", "_blank")
            .attr("rel", "noopener noreferrer")
            .text(text);
    }

    private _getDottedLine(): JQuery {
        return $("<div>")
            .addClass(ClassConstants.TestImplicationDottedLineBorder);
    }

    private _getDashedLine(): JQuery {
        return $("<span>")
            .addClass(ClassConstants.TestImplicationDashedLineBorder);
    }

    private _getDeletedItemsLine(className: string): JQuery {
        return $("<div>")
            .addClass(className)
            .append(this._getDashedLine())
            .append($("<span>")
                .addClass("testimplication-failure-icon bowtie-icon bowtie-status-failure"))
            .append($("<span>")
                .addClass(ClassConstants.TestImplicationDeletedItems)
                .text(WITResources.TestWorkItemDeletedItems));
    }

    private _getAffectedItemsLine(): JQuery {
        return $("<div>")
            .addClass(ClassConstants.TestImplicationAffectedItemsBorder)
            .append(this._getDashedLine())
            .append($("<span>")
                .addClass("testimplication-error-icon bowtie-icon bowtie-status-error"))
            .append($("<span>")
                .addClass(ClassConstants.TestImplicationAffectedItems)
                .text(WITResources.TestWorkItemAffectedItems));
    }

    /**
     * Get the test hub url for the given plan id and suite id
     * @param planId
     * @param suiteId
     */
    private _getTestSuiteUrl(planId: number, suiteId?: number): string {
        var testsUrl: string = "";

        if (planId > 0) {
            var url = TFS_Host_TfsContext.TfsContext.getDefault().getPublicActionUrl("", BaseTestDeleteConfirmationDialog.testManagementControllerName);
            if (suiteId) {
                testsUrl = url + "?" + $.param({ planId: planId, suiteId: suiteId });
            }
            else {
                testsUrl = url + "?" + $.param({ planId: planId });
            }
        }

        return testsUrl;
    }

    /**
     * Get the work item url for the given work item id
     * @param workItemId
     */
    private _getWorkItemUrl(workItemId: number): string {
        var url: string;
        url = TFS_Host_TfsContext.TfsContext.getDefault().getPublicActionUrl("", BaseTestDeleteConfirmationDialog.workItemsControllerName);
        return url + "?" + $.param({ id: workItemId });
    }

    /**
     * Focus input textbox
     */
    private _foucsInputBox() {
        if (this._inputTextBox) {
            this._inputTextBox.focus();
        }
    }
}

/**
 * confirmation dialog upon test plan work item delete.
 * @class TestPlanDeleteConfirmationDialog
 */
export class TestPlanDeleteConfirmationDialog extends BaseTestDeleteConfirmationDialog {
    /*
     * Override the base getConfirmationMessage method
     * @return The confirmation element
     */
    public getConfirmationMessage(): JQuery {
        var planId: number = this._options.workItemId;
        var workItemType: string = this._options.workItemType;
        var message = Utils_String.format(WITResources.TestPlanDeleteConfirmationDialogText, workItemType, planId, this.buildLearnMoreLink());
        var $confirmationMessage = this.getConfirmationMessageElement(message);

        var implicationSucessCallback = (implications: TestWorkItemDelete.ITestDeleteImplications) => {
            this.postQueryingTestImplication();
            if (implications) {
                this.renderTestImplicationElement(implications, WorkItemCategoryConstants.TEST_PLAN, planId);
            }
        }

        TestWorkItemDelete.TestWorkItemDelete.getTestPlanAssociatedTestArtifacts(this._options.workItemId, this._options.projectId)
            .then((implications: TestWorkItemDelete.ITestDeleteImplications) => {
            implicationSucessCallback(implications);
            },
            (error) => {
                VSS.errorHandler.show(error);
            });

        return $confirmationMessage;
    }

    /**
     * show confirmation dialog
     * @param callback callback function for ok button
     */
    public showDialog(workItemId: number, workItemType: string, callback: () => void) {
        Dialogs.show(TestPlanDeleteConfirmationDialog, this.getDialogOption(workItemId, workItemType, callback, this._options.projectId));
    }

    /**
     * Begin request to delete the test plan work item
     * @param ciLaunchPoint
     * @param ciSourceName
     * @param workItemId work item id to be deleted
     * @param suppressFailureNotification
     * @param successCallback
     * @param errorCallback
     */
    public deleteTestWorkItem(ciLaunchPoint: string, ciSourceName: string, workItemId: number,
        suppressFailureNotification?: boolean, successCallback?: () => void, errorCallback?: (exception: Error) => void) {
        TestWorkItemDelete.TestWorkItemDelete.beginDeleteTestWorkItem(ciLaunchPoint, ciSourceName, workItemId,
            WorkItemCategoryConstants.TEST_PLAN, suppressFailureNotification, successCallback, errorCallback, this._options.projectId);
    }
}

/**
 * confirmation dialog upon test suite work item delete.
 * @class TestSuiteDeleteConfirmationDialog
 */
export class TestSuiteDeleteConfirmationDialog extends BaseTestDeleteConfirmationDialog {
    private static testPlanId = 0;
    /*
     * Override the base getConfirmationMessage method
     * @return The confirmation element
     */
    public getConfirmationMessage(): JQuery {
        var suiteId: number = this._options.workItemId;
        var workItemType: string = this._options.workItemType;
        var message = Utils_String.format(WITResources.TestSuiteDeleteConfirmationDialogText, workItemType, suiteId, this.buildLearnMoreLink());
        var $confirmationMessage = this.getConfirmationMessageElement(message);

        var implicationSucessCallback = (implications: TestWorkItemDelete.ITestDeleteImplications) => {
            if (implications && implications.TestPlanId) {
                TestSuiteDeleteConfirmationDialog.testPlanId = implications.TestPlanId;
            }
            this.postQueryingTestImplication();

            if (implications) {
                this.renderTestImplicationElement(implications, WorkItemCategoryConstants.TEST_SUITE, suiteId);
            }
        }

        TestWorkItemDelete.TestWorkItemDelete.getTestSuiteAssociatedTestArtifacts(this._options.workItemId, this._options.projectId)
            .then((implications: TestWorkItemDelete.ITestDeleteImplications) => {
                implicationSucessCallback(implications);
            },
            (error) => {
                VSS.errorHandler.show(error);
            });

        return $confirmationMessage;
    }

    /**
     * show confirmation dialog
     * @param callback callback function for ok button
     */
    public showDialog(workItemId: number, workItemType: string, callback: () => void) {
        Dialogs.show(TestSuiteDeleteConfirmationDialog, this.getDialogOption(workItemId, workItemType, callback, this._options.projectId));
    }

    /**
     * Begin request to delete the test suite work item
     * @param ciLaunchPoint
     * @param ciSourceName
     * @param workItemId work item id to be deleted
     * @param suppressFailureNotification
     * @param successCallback
     * @param errorCallback
     */
    public deleteTestWorkItem(ciLaunchPoint: string, ciSourceName: string, workItemId: number,
        suppressFailureNotification?: boolean, successCallback?: () => void, errorCallback?: (exception: Error) => void) {
        TestWorkItemDelete.TestWorkItemDelete.beginDeleteTestWorkItem(ciLaunchPoint, ciSourceName, workItemId,
            WorkItemCategoryConstants.TEST_SUITE, suppressFailureNotification, successCallback, errorCallback, this._options.projectId, TestSuiteDeleteConfirmationDialog.testPlanId);
    }
}

/**
 * confirmation dialog upon test case work item delete.
 * @class TestCaseDeleteConfirmationDialog
 */
export class TestCaseDeleteConfirmationDialog extends BaseTestDeleteConfirmationDialog {
    /*
     * Override the base getConfirmationMessage method
     * @return The confirmation element
     */
    public getConfirmationMessage(): JQuery {
        var testCaseId: number = this._options.workItemId;
        var workItemType: string = this._options.workItemType;
        var message = Utils_String.format(WITResources.TestCaseDeleteConfirmationDialogText, workItemType, testCaseId, this.buildLearnMoreLink());
        var $confirmationMessage = this.getConfirmationMessageElement(message);

        var implicationSucessCallback = (implications: TestWorkItemDelete.ITestDeleteImplications) => {
            this.postQueryingTestImplication();

            if (implications) {
                this.renderTestImplicationElement(implications, WorkItemCategoryConstants.TEST_CASE, testCaseId);
            }
        }

        TestWorkItemDelete.TestWorkItemDelete.getTestCaseAssociatedTestArtifacts(this._options.workItemId, this._options.projectId)
            .then((implications: TestWorkItemDelete.ITestDeleteImplications) => {
                implicationSucessCallback(implications);
            },
            (error) => {
                VSS.errorHandler.show(error);
            });


        return $confirmationMessage;
    }

    /**
     * show confirmation dialog
     * @param callback callback function for ok button
     */
    public showDialog(workItemId: number, workItemType: string, callback: () => void) {
        Dialogs.show(TestCaseDeleteConfirmationDialog, this.getDialogOption(workItemId, workItemType, callback, this._options.projectId));
    }

    /**
     * Begin request to delete the test case work item id
     * @param ciLaunchPoint
     * @param ciSourceName
     * @param workItemId work item id to be deleted
     * @param suppressFailureNotification
     * @param successCallback
     * @param errorCallback
     */
    public deleteTestWorkItem(ciLaunchPoint: string, ciSourceName: string, workItemId: number,
        suppressFailureNotification?: boolean, successCallback?: () => void, errorCallback?: (exception: Error) => void) {
        TestWorkItemDelete.TestWorkItemDelete.beginDeleteTestWorkItem(ciLaunchPoint, ciSourceName, workItemId,
            WorkItemCategoryConstants.TEST_CASE, suppressFailureNotification, successCallback, errorCallback, this._options.projectId);
    }
}

/**
 * confirmation dialog upon shared parameter work item delete.
 * @class SharedParameterDeleteConfirmationDialog
 */
export class SharedParameterDeleteConfirmationDialog extends BaseTestDeleteConfirmationDialog {
    /*
     * Override the base getConfirmationMessage method
     * @return The confirmation element
     */
    public getConfirmationMessage(): JQuery {
        var sharedParameterId: number = this._options.workItemId;
        var workItemType: string = this._options.workItemType;
        var message = Utils_String.format(WITResources.SharedParameterDeleteConfirmationDialogText, workItemType, sharedParameterId, this.buildLearnMoreLink());
        var $confirmationMessage = this.getConfirmationMessageElement(message);
        this.postQueryingTestImplication(false);
        return $confirmationMessage;
    }

    /**
     * show confirmation dialog
     * @param callback callback function for ok button
     */
    public showDialog(workItemId: number, workItemType: string, callback: () => void) {
        var dialog = Dialogs.show(SharedParameterDeleteConfirmationDialog, this.getDialogOption(workItemId, workItemType, callback, this._options.projectId));
        dialog.setFormFocusDelayed($(ClassConstants.TestWorkItemDeleteInputBoxSelector));
    }

    /**
     * Begin request to delete the test shared parameter work item
     * @param ciLaunchPoint
     * @param ciSourceName
     * @param workItemId work item id to be deleted
     * @param suppressFailureNotification
     * @param successCallback
     * @param errorCallback
     */
    public deleteTestWorkItem(ciLaunchPoint: string, ciSourceName: string, workItemId: number,
        suppressFailureNotification?: boolean, successCallback?: () => void, errorCallback?: (exception: Error) => void) {
        TestWorkItemDelete.TestWorkItemDelete.beginDeleteTestWorkItem(ciLaunchPoint, ciSourceName, workItemId,
            WorkItemCategoryConstants.TEST_SHAREDPARAMETER, suppressFailureNotification, successCallback, errorCallback, this._options.projectId);
    }
}

/**
 * confirmation dialog upon shared step work item delete.
 * @class SharedStepDeleteConfirmationDialog
 */
export class SharedStepDeleteConfirmationDialog extends BaseTestDeleteConfirmationDialog {
    /*
     * Override the base getConfirmationMessage method
     * @return The confirmation element
     */
    public getConfirmationMessage(): JQuery {
        var sharedStepId: number = this._options.workItemId;
        var workItemType: string = this._options.workItemType;
        var message = Utils_String.format(WITResources.SharedStepDeleteConfirmationDialogText, workItemType, sharedStepId, this.buildLearnMoreLink());
        var $confirmationMessage = this.getConfirmationMessageElement(message);
        this.postQueryingTestImplication(false);
        return $confirmationMessage;
    }

    /**
     * show confirmation dialog
     * @param callback callback function for ok button
     */
    public showDialog(workItemId: number, workItemType: string, callback: () => void) {
        var dialog = Dialogs.show(SharedStepDeleteConfirmationDialog, this.getDialogOption(workItemId, workItemType, callback, this._options.projectId));
        dialog.setFormFocusDelayed($(ClassConstants.TestWorkItemDeleteInputBoxSelector));
    }

    /**
     * Begin request to delete the shared step work item
     * @param ciLaunchPoint
     * @param ciSourceName
     * @param workItemId work item id to be deleted
     * @param suppressFailureNotification
     * @param successCallback
     * @param errorCallback
     */
    public deleteTestWorkItem(ciLaunchPoint: string, ciSourceName: string, workItemId: number,
        suppressFailureNotification?: boolean, successCallback?: () => void, errorCallback?: (exception: Error) => void) {
        TestWorkItemDelete.TestWorkItemDelete.beginDeleteTestWorkItem(ciLaunchPoint, ciSourceName, workItemId,
            WorkItemCategoryConstants.TEST_SHAREDSTEP, suppressFailureNotification, successCallback, errorCallback, this._options.projectId);
    }
}

export function getTestWorkItemDeleteConfirmationDialog(workItemType: string, projectId?: string): IPromise<BaseTestDeleteConfirmationDialog> {
    const deferred: Q.Deferred<BaseTestDeleteConfirmationDialog> = Q.defer<BaseTestDeleteConfirmationDialog>();
    DeleteMenuItemHelper.WorkItemCategorization.getAllTestWorkItemTypes(projectId).then((testWorkItemTypes: IDictionaryStringTo<string>) => {
        const workItemReferenceType = testWorkItemTypes[workItemType];
        if (workItemReferenceType) {
            let confirmationDialog: BaseTestDeleteConfirmationDialog;
            switch (workItemReferenceType) {
                case WorkItemCategoryConstants.TEST_PLAN:
                    confirmationDialog = new TestPlanDeleteConfirmationDialog({projectId: projectId} as ITestDeleteConfirmationDialogOptions);
                    break;
                case WorkItemCategoryConstants.TEST_SUITE:
                    confirmationDialog = new TestSuiteDeleteConfirmationDialog({projectId: projectId} as ITestDeleteConfirmationDialogOptions);
                    break;
                case WorkItemCategoryConstants.TEST_CASE:
                    confirmationDialog = new TestCaseDeleteConfirmationDialog({projectId: projectId} as ITestDeleteConfirmationDialogOptions);
                    break;
                case WorkItemCategoryConstants.TEST_SHAREDPARAMETER:
                    confirmationDialog = new SharedParameterDeleteConfirmationDialog({projectId: projectId} as ITestDeleteConfirmationDialogOptions);
                    break;
                case WorkItemCategoryConstants.TEST_SHAREDSTEP:
                    confirmationDialog = new SharedStepDeleteConfirmationDialog({projectId: projectId} as ITestDeleteConfirmationDialogOptions);
                    break;
                default:
                    throw new Error(WITResources.InvalidTestWorkItem);
            }

            deferred.resolve(confirmationDialog);
        }
    },
        (error) => {
            deferred.reject(error);
        });

    return deferred.promise;
}
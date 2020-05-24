//Auto converted from TestManagement/Scripts/TFS.TestManagement.RunsView.Common.Controls.debug.js

/// <reference types="jquery" />

import * as Q from "q";
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import AddToExistingBug_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.AddToExistingBug");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import FileInputDialog_LAZY_LOAD = require("TestManagement/Scripts/Scenarios/Common/Components/FileInputDialog");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import ValueMap = require("TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap");
import { openAlertDialog } from "TestManagement/Scripts/Scenarios/Common/Components/ConfirmationDialog";
import TCMContracts = require("TFS/TestManagement/Contracts");

import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import { FileInputControlResult } from "VSS/Controls/FileInput";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Identities_Picker = require("VSS/Identities/Picker/Controls");
import Identities_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Services = require("VSS/Identities/Picker/Services");
import Performance = require("VSS/Performance");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";
import Utils_Array = require("VSS/Utils/Array");
import VSS = require("VSS/VSS");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WorkItemTrackingControls = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls");
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";
import { TestManagementMigrationService } from "./TestManagementMigrationService";
import { Constants } from "TestManagement/Scripts/TestReporting/Widgets/Traceability.Configuration";
import TestTabConstants = require("TestManagement/Scripts/Scenarios/TestTabExtension/CommonHelper");

let WITUtils = TMUtils.WorkItemUtils;
let LinkingUtilities = Artifacts_Services.LinkingUtilities;
let ExternalLink = WITOM.ExternalLink;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;
let delegate = Utils_Core.delegate;
let TfsContext = TFS_Host_TfsContext.TfsContext;
let TelemetryService = TCMTelemetry.TelemetryService;

export class GotoItemControl extends Controls.BaseControl {

    private _idCombo: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {

        let options = this._options || {},
            $idInput: JQuery,
            $goButton,
            $findButton;

        this._element.addClass("goto-item-control");

        // Add the Id text/combo element
        $idInput = $("<input type='text' />").appendTo(this._element);

        this._idCombo = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, $idInput, {
            mode: "text",
            placeholderText: options.watermarkText,
            ariaAttributes: {
                label: options.watermarkText
            },
        });

        $idInput.keydown(delegate(this, this._onIdComboKeyDown));

        // Add the Go Button
        $goButton = $("<button>").text(Resources.GoButtonText);
        $goButton.click(delegate(this, this._onGoButtonClick));
        this._element.append($goButton);

        // Give space to "Go" button so that it render properly and didnt get hide under left pane divider
        let buttonWidth = $goButton.outerWidth(true);
        this._element.css("margin-right", buttonWidth + "px");
    }

    public isValidId(idText: string): boolean {
        //IdText can be of form 123str where parseInt will give 123.
        let id: any = Utils_String.empty + parseInt(idText);
        return Utils_String.equals(idText, id, true);
    }

    public openItem(id) {
        Diag.Debug.fail("Classes deriving from GotoItemControl must implement 'openItem'");
    }

    public getComboControl() {
        return this._idCombo;
    }

    private _onIdComboKeyDown(e?) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            return this.gotoItem();
        }
    }

    private _onGoButtonClick() {
        return this.gotoItem();
    }

    public gotoItem() {
        let idText: string = this._idCombo.getText().trim();

        if (this.isValidId(idText)) {
            this.openItem(idText);
            this._idCombo.setText(Utils_String.empty);
        }
        else {
            this._idCombo.focus();
        }
    }
}

VSS.initClassPrototype(GotoItemControl, {
    _idCombo: null
});

export class GotoRunControl extends GotoItemControl {

    constructor(options?) {
        super($.extend({
            watermarkText: Resources.GotoRunWatermarkText
        }, options));
    }

    public openItem(id) {
        let params: TMUtils.IParam[] = [{
            parameter: ValueMap.RunExplorerParams.Param_runId,
            value: id
        }];

        window.location.href = TMUtils.UrlHelper.getRunsUrl(ValueMap.RunExplorerViewTabs.RunCharts, params);
    }
}

export class TRAHelper {

    public static ConvertMilliSecondsToReadableFormatForResultSummary(milliSeconds: number): string {
            let hour, minute, second;
            second = Math.floor(milliSeconds / 1000);
            milliSeconds = Math.floor(milliSeconds % 1000);
            minute = Math.floor(second / 60);
            second = second % 60;
            hour = Math.floor(minute / 60);
            minute = minute % 60;

            if (minute < 10) {
                minute = "0" + minute;
            }
            if (second < 10) {
                second = "0" + second;
            }
            let milliSecondsFormat: string = TRAHelper.getMillisecondsFormatForDuration(milliSeconds);

            return Utils_String.format("{0}:{1}:{2}.{3}", hour, minute, second, milliSecondsFormat);
        }

    public static ConvertMilliSecondsToReadableFormatForRunSummary(milliSeconds: number): string {
        let day, hour, minute, second;
        second = Math.floor(milliSeconds / 1000);
        milliSeconds = Math.floor(milliSeconds % 1000);
        minute = Math.floor(second / 60);
        second = second % 60;
        hour = Math.floor(minute / 60);
        minute = minute % 60;
        day = Math.floor(hour / 24);
        hour = hour % 24;

        if (hour < 10) {
            hour = "0" + hour;
        }
        if (minute < 10) {
            minute = "0" + minute;
        }
        if (second < 10) {
            second = "0" + second;
        }
        let sb = new Utils_String.StringBuilder();

        let milliSecondsFormat: string;
        //If day, hour, minute and second is 0, show only milliseconds.
        if (parseInt(day) == 0 && hour == "00" && minute == "00" && second == "00") {
            milliSecondsFormat = TRAHelper.getMillisecondsFormatForDuration(milliSeconds);
            sb.append(Utils_String.format(Resources.RunSummaryStatusDurationMilliseconds, milliSecondsFormat));
        }
        else {
            //Show duration in this order: day hour minute second
            if (parseInt(day) == 1) {
                sb.append(Utils_String.format(Resources.RunSummaryStatusDurationDay, day));
            } else if (parseInt(day) > 1) {
                sb.append(Utils_String.format(Resources.RunSummaryStatusDurationDays, day));
            }

            if (hour != "00") {
                sb.append(Utils_String.format(Resources.RunSummaryStatusDurationHours, hour));
            }

            if (minute != "00") {
                sb.append(Utils_String.format(Resources.RunSummaryStatusDurationMinutes, minute));
            }

            if (second != "00") {
                sb.append(Utils_String.format(Resources.RunSummaryStatusDurationSeconds, second));
            }
        }

        return sb.toString();
    }

    public static getMillisecondsFormatForDuration(milliSeconds: number): string {
        let millisecondsFormat: string;
        if (milliSeconds < 10) {
            millisecondsFormat = "00" + milliSeconds;
        }
        else if (milliSeconds < 100) {
            millisecondsFormat = "0" + milliSeconds;
        }
        else {
            millisecondsFormat = "" + milliSeconds;
        }

        return millisecondsFormat;
    }

    public static getRowValueForSummary(key: string, value: string, defaultValue: string): JQuery {
        let $row: JQuery;
        let $label = $("<label class='summary-item-label' />").text(key);
        RichContentTooltip.addIfOverflow(key, $label);

        if (!Utils_String.equals(value, Utils_String.empty)) {
            let $content = $("<span class='test-run-summary-content' />").text(value);
            RichContentTooltip.addIfOverflow(value, $content);
            $row = $("<div class='summary-item' />").append($label).append($content);
        }
        else {
            let $content = $("<span class='test-run-summary-no-content' />").text(defaultValue);
            RichContentTooltip.addIfOverflow(defaultValue, $content);
            $row = $("<div class='summary-item' />").append($label).append($content);
        }
        return $row;
    }

    public static getRowValueWithLinkForSummary(key: string, value: string, defaultValue: string, link: string): JQuery {
        let $row: JQuery;
        let $label = $("<label class='summary-item-label' />").text(key);
        RichContentTooltip.addIfOverflow(key, $label);

        if (!Utils_String.equals(value, Utils_String.empty) && !Utils_String.equals(link, Utils_String.empty)) {
            let $content = $("<a class='test-run-summary-content'/>").text(value).attr("href", link).attr("target", "_blank").attr("rel", "nofollow noopener noreferrer");
            RichContentTooltip.addIfOverflow(value, $content);
            $row = $("<div class='summary-item' />").append($label).append($content);
        } else {
            let $content = $("<span class='test-run-summary-no-content'/>").text(defaultValue);
            RichContentTooltip.addIfOverflow(defaultValue, $content);
            $row = $("<div class='summary-item' />").append($label).append($content);
        }

        return $row;
    }
    constructor() {
    }
}

export interface ResultAnalysisDialogOptions extends Dialogs.IModalDialogOptions {
    bulkUpdateFlag?: boolean;
    resultIdentifiers?: any[];
    resolutionStateIds?: any[];
    resolutionStateNames?: any[];
    failureTypeNames?: any[];
    failureTypeIds?: any[];
    _disableUpdateCombo?: boolean;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    onOkClick?: Function;
}

/* This comment size should be in sync with TestResultsCommentMaxSize in Tfs\Includes\TestManagement\CommonConstants.cs */
const MAX_RESULT_COMMENT_SIZE = 1000;

export class ResultAnalysisDialog extends Dialogs.ModalDialogO<ResultAnalysisDialogOptions> {
    private _result: any;
    private _resultIdentifiers: any;
    private _bulkUpdateFlag: boolean;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _testResultsManager: any;
    private _resolutionStateIds: number[];
    private _resolutionStateNames: any[];
    private _resolutionStateCombo: any;
    private _failureTypeIds: number[];
    private _failureTypeNames: any[];
    private _failureTypeCombo: any;
    private _analysisOwnerCombo: any;
    private _commentTextArea: any;
    private _identityPickerControl: Identities_Picker.IdentityPickerSearchControl;
    private _identityControlInitialValue: Identities_RestClient.IEntity;
    private _resultFailureTypeIndex: number;
    private _resultResolutionStateIndex: number;
    private _disableUpdateCombo: boolean;
    private _okButtonState: boolean;
    private _initialIdentityExists: boolean; 

    // Consumer Id is designated Id by Identity Picker control team to track all consumers
    // https://vsowiki.com/index.php?title=Common_Identity_Picker#Consumer_IDs
    //
    private static AnalysisOwnerIdentityControl: string = "2f7f8104-a896-4f01-baf1-2e6ce7759bd6";

    constructor(options?) {
        options = $.extend({
            resultIds: [],
            resizable: false,
            minWidth: 600,
            minHeight: 440,
            width: 600,
            height: 440,
            title: Resources.ResultAnalysisDialogTitle
        }, options);
        super(options);
    }

    public initialize() {
        let that = this;
        super.initialize();
        this._addEvents();
        this._bulkUpdateFlag = this._options.bulkUpdateFlag || false;
        this._resultIdentifiers = this._options.resultIdentifiers || [];
        this._resolutionStateIds = this._options.resolutionStateIds || [];
        this._resolutionStateNames = this._options.resolutionStateNames || [];
        this._failureTypeNames = this._options.failureTypeNames || [];
        this._failureTypeIds = this._options.failureTypeIds || [];
        this._disableUpdateCombo = this._options._disableUpdateCombo || false;

        Diag.Debug.assertParamIsObject(this._resultIdentifiers, "_resultIdentifiers");

        this._element.addClass("result-analysis-view");
        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._testResultsManager = Service.getCollectionService(TestsOM.TestResultManager, this._tfsContext.contextData);

        if (this._resultIdentifiers.length === 1 && !this._bulkUpdateFlag) {
            this._updateAnalysisDialogForResult(this._resultIdentifiers[0].testRunId, this._resultIdentifiers[0].testResultId);
        }
        else {
            //decorate the update analysis dialouge with default values since this is a bulk update
            that.decorate(that._resultResolutionStateIndex, that._resultFailureTypeIndex);
        }
    }

    private _updateAnalysisDialogForResult(runId: number, resultId: number) {
        let that = this;
        TMUtils.getTestResultManager().getTestCaseResults(runId, [resultId], (testCaseResultWithActionResults: TestsOM.ITestCaseResultWithActionResultModel) => {

            that._result = TestsOM.TestCaseResult.createTestCaseResultObject(testCaseResultWithActionResults[0].testCaseResult, testCaseResultWithActionResults[0].testActionResultDetails);
            if (that._result) {
                let resultOutcome = that._result.outcome;
                if ((resultOutcome == TCMConstants.TestOutcome.Passed) ||
                    (resultOutcome == TCMConstants.TestOutcome.NotApplicable) ||
                    (resultOutcome == TCMConstants.TestOutcome.Paused)) {
                    that._disableUpdateCombo = true;
                }
                else {
                    //getting index for failure type and resolution type from result to shown in combo box.
                    if (that._failureTypeIds && that._failureTypeIds.length > 0) {
                        for (let index in that._failureTypeIds) {
                            if (that._result.failureType == that._failureTypeIds[index]) {
                                that._resultFailureTypeIndex = Number(index);
                                break;
                            }
                        }
                    }

                    if (that._resolutionStateIds && that._resolutionStateIds.length > 0) {
                        for (let index in that._resolutionStateIds) {
                            if (that._result.resolutionStateId == that._resolutionStateIds[index]) {
                                that._resultResolutionStateIndex = Number(index);
                                break;
                            }
                        }
                    }
                }
            }
            that.decorate(that._resultResolutionStateIndex, that._resultFailureTypeIndex);
        }, (error) => {
                alert(error.message);
            });
    }

    public onOkClick() {
        Diag.logVerbose("ResultAnalysisDialog.onOkClick.enter");
        let that = this, values: IAnalysis = this._getControlValues(), results: any[] = [];

        if (this._bulkUpdateFlag) {
            let runId: number,
                resultIds: number[] = [];

            Diag.logVerbose(Utils_String.format("[ResultAnalysisDialog.onOkClick]: updating analysis for bulk results, count: {0}", (this._resultIdentifiers) ? this._resultIdentifiers.length : 0));

            if (this._resultIdentifiers && this._resultIdentifiers.length > 0) {
                runId = this._resultIdentifiers[0].testRunId;
                for (let i: number = 0; i < this._resultIdentifiers.length; i++) {
                    resultIds.push(this._resultIdentifiers[i].testResultId);
                }
            }

            TMUtils.getTestResultManager().getTestCaseResults(runId, resultIds, (testCaseResultsWithActionResults: TestsOM.ITestCaseResultWithActionResultModel[]) => {

                for (let i: number = 0; i < testCaseResultsWithActionResults.length; i++) {
                    results.push(TestsOM.TestCaseResult.createTestCaseResultObject(testCaseResultsWithActionResults[i].testCaseResult, testCaseResultsWithActionResults[i].testActionResultDetails));
                }
                this._updateTestResultsWithAnalysis(results, values);
            }, (error) => {
                    alert(error.message);
                });

        } else {
            Diag.logVerbose("[ResultAnalysisDialog.onOkClick]: updating analysis for single result.");

            if (this._result) {
                results.push(this._result);
            }
            this._updateTestResultsWithAnalysis(results, values);
        }

        Diag.logVerbose("ResultAnalysisDialog.onOkClick.complete");
    }

    private _updateTestResultsWithAnalysis(results: any[], analysis: IAnalysis) {
        Diag.logTracePoint("[ResultAnalysisDialog._updateTestResultsWithAnalysis]: method called");
        $.each(results, (i, result) => {
            if (result) {
                // whitespace inplace of empty string for reset comment.
                if (analysis.comment == Utils_String.empty && result.comment !== Utils_String.empty) {
                    result.comment = " ";
                } else {
                    result.comment = analysis.comment;
                }

                if (analysis.resolutionStateId >= 0) {
                    result.resolutionStateId = analysis.resolutionStateId;
                }

                if (analysis.failureType >= 0) {
                    result.failureType = analysis.failureType;
                }

                if (analysis.analysisOwner && analysis.analysisOwner.localId) {
                    result.owner = analysis.analysisOwner.localId;
                }

                // Telemetry section
                TelemetryService.publishEvents(TelemetryService.featureTestResultUpdateAnalysis, {
                    "FailureType": analysis.failureType,
                    "ResolutionStateId": analysis.resolutionStateId
                });
            } else {
                Diag.logError(Utils_String.format("[ResultAnalysisDialog._updateTestResultsWithAnalysis]: Error - result object is null at index: {0}", i));
            }
        });

        if (results.length > 0) {
            TMUtils.getTestResultManager().update(results, () => {
                this.close();
                if ($.isFunction(this._options.onOkClick)) {
                    this._options.onOkClick.call(this, analysis);
                }
            }, (error) => {
                    alert(error.message);
                    this.updateOkButton(true);
                });
        } else {
            Diag.logInfo("[ResultAnalysisDialog._updateTestResultsWithAnalysis]: update didn't happen as results length is 0");
        }
    }

    public decorate(initialResolutionIndex, intialFailureTypeIndex) {
        Diag.logVerbose("ResultAnalysisDialog.decorate.enter");

        let $p, identity = Utils_String.empty, $input, updateOkDelegate = delegate(this, this.updateOkButtonState);
        $p = $("<p />").appendTo(this._element);

        /*
        There is bug where when page loads first time then on opening upload dialog bug and selecting combo drop down item,
        then focus goes to Analysis control and it brings identity drop down. This only happen first time when page loads.
        Bug 258956 has info.
        */
        $("<label for='identity-picker_txt' autofocus />").text(Resources.AnalysisOwner).appendTo($p);

        let $identityContainer = $("<div />").addClass("identity-picker-container").appendTo($p);
        this._identityPickerControl = this._createIdentityPickerControl($identityContainer, updateOkDelegate);

        $p = $("<p />").appendTo(this._element);
        $("<label for='failure-type' />").text(Resources.FailureType).appendTo($p);
        $input = $("<input type='text' />").attr("id", "failure-type").appendTo($p);
        this._failureTypeCombo = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, $input, {
            allowEdit: false,
            source: this._failureTypeNames
        });
        if (intialFailureTypeIndex >= 0) {
            this._failureTypeCombo.setSelectedIndex(intialFailureTypeIndex);
        }
        this._failureTypeCombo._bind("change", updateOkDelegate);

        if (this._disableUpdateCombo) {
            this._failureTypeCombo.setEnabled(false);
        }

        $p = $("<p />").appendTo(this._element);
        $("<label for='resolution-state' />").text(Resources.ResolutionState).appendTo($p);
        $input = $("<input type='text' />").attr("id", "resolution-state").appendTo($p);
        this._resolutionStateCombo = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, $input, {
            allowEdit: false,
            source: this._resolutionStateNames
        });
        if (initialResolutionIndex >= 0) {
            this._resolutionStateCombo.setSelectedIndex(initialResolutionIndex);
        }
        this._resolutionStateCombo._bind("change", updateOkDelegate);
        if (this._disableUpdateCombo) {
            this._resolutionStateCombo.setEnabled(false);
        }

        $p = $("<p />").appendTo(this._element);
        $("<label for='comment' />").text(Resources.Comment).appendTo($p);
        let maxCommentLength = MAX_RESULT_COMMENT_SIZE;
        this._commentTextArea = $("<textarea />").attr("id", "comment").attr("maxlength", maxCommentLength).appendTo($p);
        if (this._result) {
            this._commentTextArea.prop("value", this._result.comment + Utils_String.empty);
        }
        this._commentTextArea.bind("change keyup", updateOkDelegate);

        if (LicenseAndFeatureFlagUtils.isRenderMarkDownCommentEnabled()) {
            let markDownInfoClass = "mark-down-info";
            let markDownHref = MARKDOWN_INFO_HREF;
            let $markDownInfoLink = $("<a />").text(Resources.MarkDownSupportedMessage).attr("href", markDownHref)
                .attr("target", "_blank").attr("rel", "nofollow noopener noreferrer");
            let $markDownInfoDiv = $("<div />").addClass(markDownInfoClass).append($markDownInfoLink);
            $markDownInfoDiv.appendTo($p);
        }

        //set opening value for identity box
        if (this._result) {
            if(this._result.ownerName != null){
                identity= this._result.ownerName;
            }
        }

        this._initialIdentityExists = identity ? true : false;
        this._identityPickerControl.setEntities([], [identity]);

        Diag.logVerbose("ResultAnalysisDialog.decorate.complete");
    }

    public getIdentityControl() {
        return this._identityPickerControl;
    }

    public getFailureTypeControl(): Combos.Combo {
        return this._failureTypeCombo;
    }

    public getResolutionStateControl(): Combos.Combo {
        return this._resolutionStateCombo;
    }

    public getCommentTextControl() {
        return this._commentTextArea;
    }

    public getOKButtonState(): boolean {
        return this._okButtonState;
    }

    public updateOkButtonState() {
        Diag.logTracePoint("[ResultAnalysisDialog.updateOkButtonState]: method called");
        let enabled: boolean, values: IAnalysis = this._getControlValues();

        if (this._result) {
            enabled = values.comment !== (Utils_String.empty + this._result.comment) ||
            values.resolutionStateId !== this._result.resolutionStateId ||
            values.failureType !== this._result.failureType;
        }
        else {
            enabled = values.comment !== Utils_String.empty ||
            values.resolutionStateId != this._resolutionStateIds[this._resultResolutionStateIndex] ||
            values.failureType != this._failureTypeIds[this._resultFailureTypeIndex];
        }

        if (this._initialIdentityExists) {
            enabled = enabled || !!(this._identityControlInitialValue &&
                values.analysisOwner &&
                values.analysisOwner.localId !== this._identityControlInitialValue.localId);
        } else {
            enabled = enabled || !!(values.analysisOwner && values.analysisOwner.localId);
        }
        

        this.updateOkButton(enabled);
        this._okButtonState = enabled;
    }

    private _getControlValues(): IAnalysis {
        Diag.logTracePoint("[ResultAnalysisDialog._getControlValues]: method called");
        let resIndex: number, failIndex: number, val: IAnalysis;

        val = {
            analysisOwner: null,
            failureType: -1,
            resolutionStateId: -1,
            comment: Utils_String.empty
        };

        //getting current value from Idenity control
        val.analysisOwner = this._getResolvedEntites();

        //getting current value from failure type combo.
        failIndex = this._failureTypeCombo.getSelectedIndex();
        if (failIndex >= 0) {
            val.failureType = this._failureTypeIds[failIndex];
        }
        else {
            val.failureType = -1;
        }

        //getting current value from resolution state combo
        resIndex = this._resolutionStateCombo.getSelectedIndex();
        if (resIndex >= 0) {
            val.resolutionStateId = this._resolutionStateIds[resIndex];
        }
        else {
            val.resolutionStateId = -1;
        }

        //getting current value from comment section
        val.comment = this._commentTextArea.val();

        return val;
    }

    private _createIdentityPickerControl($container: JQuery, selectionChangedDelegate) {
        let operationScope: Identities_Services.IOperationScope = {
            IMS: true,
            Source: true
        };
        let identityType: Identities_Services.IEntityType = {
            User: true,
            Group: true
        };

        return Controls.create(
            Identities_Picker.IdentityPickerSearchControl,
            $container,
            <Identities_Picker.IIdentityPickerSearchOptions>{
                operationScope: operationScope,
                identityType: identityType,
                multiIdentitySearch: false,
                showMruTriangle: true,
                showContactCard: true,
                showTemporaryDisplayName: true,
                showMru: true,
                loadOnCreate: true,
                highlightResolved: true,
                size: Identities_Picker.IdentityPickerControlSize.Small,
                consumerId: ResultAnalysisDialog.AnalysisOwnerIdentityControl,
                ariaLabel: Resources.AnalysisOwner,
                pageSize: 5,
                callbacks: {
                    onItemSelect: (entity: Identities_RestClient.IEntity) => {
                        selectionChangedDelegate();
                    }
                }
            });
    }

    private _addEvents(): void {
        this._bind(Identities_Picker.IdentityPickerSearchControl.VALID_INPUT_EVENT, (event) => { 
            //getting initial IIdentityReference object
            if (!this._identityControlInitialValue) {
                this._identityControlInitialValue = this._getResolvedEntites();
            }
        });
    }

    private _getResolvedEntites(): Identities_RestClient.IEntity {
        let entities = this._identityPickerControl.getIdentitySearchResult().resolvedEntities;
        if (entities && entities.length === 1) {
            return entities[0];
        }

        return null;
    }
}

interface IAnalysis {
    analysisOwner: Identities_RestClient.IEntity;
    failureType: number;
    resolutionStateId: number;
    comment: any;
}

VSS.initClassPrototype(ResultAnalysisDialog, {
    _result: null,
    _resultIdentifiers: null,
    _bulkUpdateFlag: false,
    _tfsContext: null,
    _testResultsManager: null,
    _resolutionStateIds: null,
    _resolutionStateNames: null,
    _resolutionStateCombo: null,
    _failureTypeIds: null,
    _failureTypeNames: null,
    _failureTypeCombo: null,
    _commentTextArea: null,
    _resultFailureTypeIndex: 0,
    _resultResolutionStateIndex: 0,
    _disableUpdateCombo: false,
    _okButtonState: false
});

export interface RunAnalysisDialogOptions extends Dialogs.IModalDialogOptions {
    run?: TCMContracts.TestRun;
    onOkClick?: Function;
}

const MAX_RUN_COMMENT_SIZE = 1000;
const MARKDOWN_INFO_HREF = "http://go.microsoft.com/fwlink/?LinkId=823918";

export class RunAnalysisDialog extends Dialogs.ModalDialogO<RunAnalysisDialogOptions> {
    private _run: TCMContracts.TestRun;
    private _runId: number;
    private _commentTextArea: JQuery;
    private _okButtonState: boolean;
    constructor(options?) {
        options = $.extend({
            resizable: false,
            minWidth: 600,
            minHeight: 300,
            width: 600,
            height: 300,
            title: Resources.UpdateCommentMenuItem
        }, options);
        super(options);
    }

    public initialize(): void {
        Diag.logVerbose("RunAnalysisDialog.initialize.enter");

        let that = this;
        super.initialize();
        this._element.addClass("update-run-comment-view");
        this._run = this._options.run;
        this._runId = this._run.id;

        that.decorate();

        Diag.logVerbose("RunAnalysisDialog.initialize.complete");
    }

    public decorate(): void {
        Diag.logVerbose("RunAnalysisDialog.decorate.enter");

        let updateOkDelegate = delegate(this, this.updateOkButtonState);
        let commentTextAreaId = "test-run-comment-textarea";
        let commentLabelId = "test-run-comment-label";
        let maxCommentLength = MAX_RUN_COMMENT_SIZE;

        $("<label />", {
            "id": commentLabelId,
            "for": commentTextAreaId,
            "text": Resources.Comment
        }).appendTo(this._element);

        this._commentTextArea = $("<textarea />", {
            "id": commentTextAreaId,
            "maxlength": maxCommentLength
        }).appendTo(this._element);

        if (LicenseAndFeatureFlagUtils.isRenderMarkDownCommentEnabled()) {
            let markDownInfoClass = "mark-down-info";
            let markDownHref = MARKDOWN_INFO_HREF;
            let $markDownInfoLink = $("<a />").text(Resources.MarkDownSupportedMessage).attr("href", markDownHref)
                .attr("target", "_blank").attr("rel", "nofollow noopener noreferrer");
            let $markDownInfoDiv = $("<div />").addClass(markDownInfoClass).append($markDownInfoLink);
            $markDownInfoDiv.appendTo(this._element);
        }

        if (this._run && this._run.comment) {
            this._commentTextArea.prop("value", this._run.comment + Utils_String.empty);
        }
        this._commentTextArea.bind("change keyup", updateOkDelegate);

        Diag.logVerbose("RunAnalysisDialog.decorate.complete");
    }

    public updateOkButtonState(): void {
        Diag.logTracePoint("[RunAnalysisDialog.updateOkButtonState]: method called");

        let currentCommentValue: string = this._getCurrentCommentValue();

        let isEnabled = Utils_String.equals(currentCommentValue, (Utils_String.empty + this._run.comment)) ? false : true;

        this.updateOkButton(isEnabled);
        this._okButtonState = isEnabled;
    }

    public getCommentTextControl() {
        return this._commentTextArea;
    }

    public getOKButtonState(): boolean {
        return this._okButtonState;
    }

    public onOkClick(): void {
        Diag.logVerbose("RunAnalysisDialog.onOkClick.enter");

        let currentCommentValue = this._getCurrentCommentValue();
        this._updateTestRunComment(currentCommentValue);

        Diag.logVerbose("RunAnalysisDialog.onOkClick.complete");
    }

    private _updateTestRunComment(currentCommentValue: string): void {
        Diag.logTracePoint("[RunAnalysisDialog._updateTestRunComment]: method called");

        let testRunUpdateModel = {
            comment: currentCommentValue
        } as TCMContracts.RunUpdateModel;

        TMUtils.getTestRunManager().update2(testRunUpdateModel, this._runId)
            .then((testRun: TCMContracts.TestRun) => {
                this.close();
                if ($.isFunction(this._options.onOkClick)) {
                    this._options.onOkClick();
                }
            },
            (error) => {
                Diag.logWarning(Utils_String.format("[RunAnalysisDialog._updateTestRunComment]: Unable to update comment for runId:{0}. Error:{1}", this._runId, JSON.stringify(error)));
                alert(error.message);
                this.updateOkButton(true);
            });
    }

    private _getCurrentCommentValue(): string {
        return this._commentTextArea.val();
    }
}

VSS.initClassPrototype(RunAnalysisDialog, {
    _run: null,
    _runId: null,
    _commentTextArea: null,
    _okButtonState: false
});

export class RunExplorerDialogs {
    public static updateResultAnalysis(resultIdentifiers, resolutionStateNames, resolutionStateIds, failureTypeNames, failureTypeIds, options?) {
        /// <summary>Display the dialog for editing an alert</summary>
        return Dialogs.show(ResultAnalysisDialog, $.extend({
            resultIdentifiers: resultIdentifiers,
            bulkUpdateFlag: (resultIdentifiers && resultIdentifiers.length > 1) ? true : false,
            resolutionStateNames: resolutionStateNames,
            resolutionStateIds: resolutionStateIds,
            failureTypeNames: failureTypeNames,
            failureTypeIds: failureTypeIds,
        }, options));
    }

    /**
    * Opens up Update run comment dialog box.
    */
    public static updateRunComment(run: TCMContracts.TestRun, options?: RunAnalysisDialogOptions) {
        return Dialogs.show(RunAnalysisDialog, $.extend({
            run: run,
        }, options) as RunAnalysisDialogOptions);
    }

    public static openAddRunAttachmentDialog(run: TCMContracts.TestRun, onFilesAttached: () => void): void {
        VSS.using(["TestManagement/Scripts/Scenarios/Common/Components/FileInputDialog"],
            (FileInputDialog: typeof FileInputDialog_LAZY_LOAD) => {
                FileInputDialog.openFileInputDialog({
                    title: Resources.AddAttachmentDialogTitle,
                    maximumNumberOfFiles: this.max_attachments_upload_count,
                    maximumTotalFileSize: this.max_attachment_upload_size,
                    onOkClick: (files: FileInputControlResult[]) => {
                        let attachmentDetails: TCMContracts.TestAttachmentRequestModel[] = files.map((file: FileInputControlResult) => {
                            return { attachmentType: "GeneralAttachment", comment: Utils_String.empty, fileName: file.name, stream: file.content };
                        });
                        let createAttachmentsPromise: IPromise<TCMContracts.TestAttachmentReference[]> = TMUtils.getTestResultManager().createTestRunAttachments(attachmentDetails, run.id);
                        RunExplorerDialogs._handleAddAttachmentsEvents(createAttachmentsPromise, files, onFilesAttached, TelemetryService.featureAddRunAttachmentOnWeb);
                    }
                });
            });
    }

    public static openAddResultsAttachmentDialog(testResult: TestsOM.TestCaseResultIdentifier, onFilesAttached: () => void): void {
        VSS.using(["TestManagement/Scripts/Scenarios/Common/Components/FileInputDialog"],
            (FileInputDialog: typeof FileInputDialog_LAZY_LOAD) => {
                FileInputDialog.openFileInputDialog({
                    title: Resources.AddAttachmentDialogTitle,
                    maximumNumberOfFiles: this.max_attachments_upload_count,
                    maximumTotalFileSize: this.max_attachment_upload_size,
                    onOkClick: (files: FileInputControlResult[]) => {
                        let attachmentDetails: TCMContracts.TestAttachmentRequestModel[] = files.map((file: FileInputControlResult) => {
                            return { attachmentType: "GeneralAttachment", comment: Utils_String.empty, fileName: file.name, stream: file.content };
                        });
                        let createAttachmentsPromise: IPromise<TCMContracts.TestAttachmentReference[]> = TMUtils.getTestResultManager().createTestResultAttachment(attachmentDetails,
                            testResult.testRunId,
                            testResult.testResultId);
                        RunExplorerDialogs._handleAddAttachmentsEvents(createAttachmentsPromise, files, onFilesAttached, TelemetryService.featureAddResultAttachmentOnWeb);
                    }
                });
            });
    }

    private static _handleAddAttachmentsEvents(createAttachmentsPromise: IPromise<TCMContracts.TestAttachmentReference[]>, files: FileInputControlResult[], onFilesAttached: () => void, ciEvent: string) {
        ProgressAnnouncer.forPromise(createAttachmentsPromise, {
            announceStartMessage: Resources.UploadingAttachmentsAnnounceText,
            announceEndMessage: Utils_String.format(Resources.AddAttachmentsSuccessfulAnnounceText, files.length),
            announceErrorMessage: Resources.AddAttachmentsErrorAnnounceText
        });
        createAttachmentsPromise.then((attachments: TCMContracts.TestAttachmentReference[]) => {
            this._publishAddAttachmentTelemetry(TelemetryService.featureAddRunAttachmentOnWeb, files, "Successful");
            onFilesAttached();
        }).then(undefined, (error) => {
            this._publishAddAttachmentTelemetry(TelemetryService.featureAddRunAttachmentOnWeb, files, "Failed", VSS.getErrorMessage(error));
            openAlertDialog(VSS.getErrorMessage(error));
        });
    }

    private static _publishAddAttachmentTelemetry(ciEvent: string, files: FileInputControlResult[], outcome: string, errorMessage?: string) {
        let totalFileSize: number = 0, fileFormats: string[] = [];
        files.forEach((file: FileInputControlResult) => {
            totalFileSize += file.size;
            fileFormats.push(file.type);
        });

        // Convert to KB
        totalFileSize = Math.round(totalFileSize / 1024);

        // filter the unique fileformats
        fileFormats = fileFormats.filter((value, index, self) => self.indexOf(value) === index);
        TelemetryService.publishEvents(ciEvent, {
            Outcome: outcome,
            Count: files.length,
            SizeKB: totalFileSize,
            Format: fileFormats,
            error: errorMessage
        });
    }

    private static max_attachment_upload_size: number = 100 * 1024 * 1024; /* 100 MB */
    private static max_attachments_upload_count: number = 10;
}

export interface IWorkItemOption {
    save: () => void;
    close: (workItem?: WITOM.WorkItem) => void;
}

export class BugWorkItemHelper {

    public static createAndShowWorkItem(itemIds?: string[], activeTestResults?: TCMContracts.TestCaseResult[], options?: IWorkItemOption, subResultId?: number) {
        let workItemTypeName: string,
            witStore: WITOM.WorkItemStore;

        workItemTypeName = Resources.BugCategoryRefName;
        witStore = WITUtils.getWorkItemStore();

        Diag.Debug.assertIsNotNull(witStore);

        if (Performance.getScenarioManager().getScenarios(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TRA_CreateBug)) {
            Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TRA_CreateBug);
        }

        Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TRA_CreateBug);
        Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TRA_CreateBug_BeginGetProject);

        witStore.beginGetProject(TfsContext.getDefault().navigation.projectId, (project: WITOM.Project) => {

            Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TRA_CreateBug_EndGetProject);
            Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TRA_CreateBug_BeginGetDefaultWorkItemTypeNameForCategory);
            //Get Default work item under BugCategory
            WITUtils.getDefaultWorkItemTypeNameForCategory(TestsOM.WorkItemCategories.Bug, (bugCategoryTypeName) => {
                if (bugCategoryTypeName) {
                    workItemTypeName = bugCategoryTypeName;
                }
                Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TRA_CreateBug_EndGetDefaultWorkItemTypeNameForCategory);
                Diag.logTracePoint("TRARunView.FileBug.DefaultBugCategoryTypeName: " + workItemTypeName);
                Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TRA_CreateBug_BeginGetCreateWorkItem);
                project.beginGetWorkItemType(workItemTypeName, (wit) => {
                    let workItem = WorkItemManager.get(witStore).createWorkItem(wit);  // Create work item.
                    Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TRA_CreateBug_EndCreateWorkItem);
                    Diag.Debug.assertIsNotNull(workItem);
                    witStore.beginGetLinkTypes(() => {
                        BugWorkItemHelper._populateWorkItem(workItem, itemIds, activeTestResults, subResultId);   // Populate work item.
                        BugWorkItemHelper._showWorkItem(workItem, options, null);   // Show the work item.
                        Diag.logTracePoint("TRARunView.FileBug.completed");
                    });
                });
            });
        });
    }

    public static addToExistingBug(testResults?: TCMContracts.TestCaseResult[], workItemOptions?: IWorkItemOption): void {

        let workItemTypeName = Resources.BugCategoryRefName;

        WITUtils.getDefaultWorkItemTypeNameForCategory(TestsOM.WorkItemCategories.Bug, (bugCategoryTypeName) => {

            workItemTypeName = bugCategoryTypeName || workItemTypeName;

            TMUtils.WorkItemUtils.GetTeamSettingsData().then((teamSettingsData: TestsOM.TeamSettingsData) => {
                VSS.using(["TestManagement/Scripts/TFS.TestManagement.AddToExistingBug"], (Module: typeof AddToExistingBug_LAZY_LOAD) => {
                    Dialogs.show(Module.AddToExistingBugDialog, $.extend(
                        {
                            width: Module.AddToExistingBugDialog.DIALOG_WIDTH,
                            height: Module.AddToExistingBugDialog.DIALOG_HEIGHT,
                            minWidth: Module.AddToExistingBugDialog.DIALOG_WIDTH,
                            minHeight: Module.AddToExistingBugDialog.DIALOG_HEIGHT,
                            maxWidth: Module.AddToExistingBugDialog.MAX_DIALOG_WIDTH_RATIO * Module.AddToExistingBugDialog.DIALOG_WIDTH,
                            maxHeight: Module.AddToExistingBugDialog.MAX_DIALOG_HEIGHT_RATIO * Module.AddToExistingBugDialog.DIALOG_HEIGHT,
                            resizable: true,
                            cssClass: "add-to-existing-bug-dialogue",
                            areaPath: teamSettingsData.getDefaultArea(),
                            defaultSearchText: testResults && testResults.length == 1 ? Utils_Array.first(testResults).testCaseTitle : Utils_String.empty,  //If linking only one then default text is test case title.
                            populateWorkItemDelegate: (workItem: WITOM.WorkItem, workItemData, teamSettingsData: TestsOM.TeamSettingsData, isUpdate?: boolean) => { this.addWorkItemLinks(workItem, testResults); },
                            getWorkItemOptions: () => { return workItemOptions; },
                            bugCategoryTypeName: workItemTypeName
                        }));
                });
            }, (error) => {
                //Log error and move on. Will create bug in default project area/iteration path.
                Diag.logError(Utils_String.format("Error occured in fetching default team area/iteration path. Error: {0}", VSS.getErrorMessage(error)));
            });
        });
    }

    public static async addWorkItemLinks(workItem: WITOM.WorkItem, testResults: TCMContracts.TestCaseResult[]): Promise<void> {
        Diag.logVerbose("BugWorkItemHelper._addWorkItemLinks - Called");

        let testCaseIds: number[] = [];
        let testCaseRefMap: IDictionaryStringTo<boolean> = {};
        let testResultsForLink: TCMContracts.TestCaseResult[] = [];
        let testCaseRefsForLink: string[] = [];

        for (let index in testResults) {
            let result: TCMContracts.TestCaseResult = testResults[index];
            let testCaseId: number;
            if (result.testCase && result.testCase.id && (testCaseId = parseInt(result.testCase.id)) > 0) {
                testCaseIds.push(testCaseId);
            }

            // Prepare list of results for which links to be created.
            testResultsForLink.push(result);

            // Add one link for a test case reference
            if (result.testCaseReferenceId > 0) {
                const encodedTestCaseReferenceId = await Service.getService(TestManagementMigrationService)
                    .encodeTestCaseRefId(Number(result.testRun.id), result.testCaseReferenceId);
                if (!testCaseRefMap[encodedTestCaseReferenceId]) {
                    testCaseRefMap[encodedTestCaseReferenceId] = true;
                    testCaseRefsForLink.push(encodedTestCaseReferenceId);
                }
            }
        }

        //Creating result and test case reference links.
        BugWorkItemHelper._addTestResultsLink(workItem, testResultsForLink);
        BugWorkItemHelper._addTestCaseRefLink(workItem, testCaseRefsForLink);

        Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TRA_CreateBug_ResultLinksPopulated);

        // Link test cases to bug when an valid test case is asscoiated with the result. This method takes care of filtering links already exists in workitem.
        TestsOM.WitLinkingHelper.linkTestCasesToBug(workItem, testCaseIds);

        //All results will belong to one build so pick buildId from any result.
        if (testResults && testResults.length > 0 && testResults[0].build) {
            //Creating Build link with workitem
            BugWorkItemHelper._addBuildLink(workItem, parseInt(testResults[0].build.id));
        }

        Diag.logVerbose("BugWorkItemHelper._addWorkItemLinks - Return");
        return Promise.resolve();
    }

    public static populateWorkItemFields(workItem: WITOM.WorkItem, testResults: TCMContracts.TestCaseResult[], subResultId?: number): void {
        Diag.logVerbose("BugWorkItemHelper.populateWorkItemFields - Called");

        //Populate bug title
        BugWorkItemHelper._populateTitle(workItem, testResults);

        //Populate repro step of bug
        BugWorkItemHelper._populateReproSteps(workItem, testResults, subResultId);

        //Populate default Team Area/Iteration Path.
        BugWorkItemHelper._populateAreaIterationPaths(workItem);

        Diag.logVerbose("BugWorkItemHelper.populateWorkItemFields - Return");
    }

    private static _showWorkItem(workItem, options?, preShowFunc?) {
        if ($.isFunction(preShowFunc)) {
            preShowFunc();
        }
        // Show work item.
        WorkItemTrackingControls.WorkItemFormDialog.showWorkItem(workItem, options);
    }

    private static _populateWorkItem(workItem: WITOM.WorkItem, itemIds: any, activeTestResults: TCMContracts.TestCaseResult[], subResultId?: number): void {

        Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TRA_CreateBug_BeginPopulateWorkItem);
        Diag.logVerbose("BugWorkItemHelper._populateWorkItem - Called");

        let runId, resultId, resultIds = [], results = [], testCaseId: number, testCaseIds: number[] = [];

        if (itemIds) {
            $.each(itemIds, function (i, itemId) {
                runId = Number(itemId.split(";")[0]);
                resultIds.push(Number(itemId.split(";")[1]));
            });

            Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TRA_CreateBug_BeginGetTestResults);

            // Fetch testResults using resultIds
            TMUtils.getTestResultManager().getTestCaseResults(runId, resultIds, (testCaseResultsWithActionResults: TestsOM.ITestCaseResultWithActionResultModel[]) => {

                Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TRA_CreateBug_EndGetTestResults);

                for (let i: number = 0; i < testCaseResultsWithActionResults.length; i++) {
                    results.push(TestsOM.TestCaseResult.createTestCaseResultObject(testCaseResultsWithActionResults[i].testCaseResult, testCaseResultsWithActionResults[i].testActionResultDetails));
                }

                $.each(results, function (i, result) {
                    testCaseId = result.testCaseId;
                    resultId = result.testResultId;

                    // Link test case to bug when an valid test case is asscoiated with the result
                    if ((testCaseId) && (testCaseId > 0) && ($.inArray(testCaseId, testCaseIds) == -1)) {
                        testCaseIds.push(testCaseId);
                        TestsOM.WitLinkingHelper.linkTestCaseToBug(workItem, testCaseId);
                    }
                    // Add result link to work item.
                    BugWorkItemHelper._addTestResultLink(workItem, runId, resultId);
                });

                Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TRA_CreateBug_ResultLinksPopulated);
                Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TRA_CreateBug);
            }, (error) => {
                Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TRA_CreateBug);
                alert(error.message);
            });
        }
        else if (activeTestResults) {
            //Add workItem links
            BugWorkItemHelper.addWorkItemLinks(workItem, activeTestResults);

            //Populate workItem fields
            BugWorkItemHelper.populateWorkItemFields(workItem, activeTestResults, subResultId);
        } else {
            //If only workitem need to be created with no result links then populate team area/iteration path
            BugWorkItemHelper._populateAreaIterationPaths(workItem);
        }

        Diag.logVerbose("BugWorkItemHelper._populateWorkItem - return");
    }

    private static _populateTitle(workItem: WITOM.WorkItem, testResults: TCMContracts.TestCaseResult[]): void {
        let title: string = Utils_String.empty;

        switch (testResults.length) {
            case 1:
                if (testResults[0].build) {
                    title = Utils_String.format(Resources.TestResults_CreateBugTitle_WithBuild,
                        testResults[0].testCase.name, testResults[0].outcome, testResults[0].build.name);
                }
                else {
                    title = Utils_String.format(Resources.TestResults_CreateBugTitle_WithoutBuild,
                        testResults[0].testCase.name, testResults[0].outcome);
                }
                break;
            case 2:
                if (testResults[0].build) {
                    title = Utils_String.format(Resources.CreateBugTitleForMultipleResults_OnlyOneOtherTest_WithBuild, testResults[0].testCase.name,
                        testResults.length - 1, testResults[0].build.name);
                }
                else {
                    title = Utils_String.format(Resources.CreateBugTitleForMultipleResults_OnlyOneOtherTest_WithoutBuild, testResults[0].testCase.name,
                        testResults.length - 1);
                }
                break;
            default:
                if (testResults[0].build) {
                    title = Utils_String.format(Resources.CreateBugTitleForMultipleResults_WithBuild,
                        testResults[0].testCase.name, (testResults.length - 1), testResults[0].build.name);
                }
                else {
                    title = Utils_String.format(Resources.CreateBugTitleForMultipleResults_WithoutBuild,
                        testResults[0].testCase.name, (testResults.length - 1));
                }
        }

        TMUtils.WorkItemUtils.setTitle(workItem, title);
    }

    private static _populateAreaIterationPaths(workItem: WITOM.WorkItem): void {
        TMUtils.WorkItemUtils.GetTeamSettingsData().then((teamSettingsData: TestsOM.TeamSettingsData) => {
            TMUtils.WorkItemUtils.setAreaAndIterationPaths(workItem, teamSettingsData.getDefaultArea(), teamSettingsData.getDefaultIteration());
            Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TRA_CreateBug_EndPopulateWorkItem);
            Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TRA_CreateBug);
        }, (error) => {
            Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TRA_CreateBug);
            //Log error and move on. Will create bug in default project area/iteration path.
            Diag.logError(Utils_String.format("Error occurred in fetching default team area/iteration path. Error: {0}", VSS.getErrorMessage(error)));
        });
    }

    private static _populateReproSteps(workItem: WITOM.WorkItem, testResults: TCMContracts.TestCaseResult[], subResultId?: number): void {
        let elem: JQuery = $("<p />");
        let stepsBuilder: Utils_String.StringBuilder = new Utils_String.StringBuilder;

        for (let index: number = 0, len: number = testResults.length; index < len; index++) {
            let result: TCMContracts.TestCaseResult = testResults[index];
            stepsBuilder.append(BugWorkItemHelper._getReproStepData(testResults[index], index, subResultId));
            stepsBuilder.append("<br />");
        }
        elem.append(stepsBuilder.toString());
        TMUtils.WorkItemUtils.setReproSteps(workItem, elem.html());
    }

    private static _getReproStepData(testResult: TCMContracts.TestCaseResult, index: number, subResultId?: number): string {
        let reproStepBuilder: Utils_String.StringBuilder = new Utils_String.StringBuilder();

        if (index === 0) {

            let stackTrace : string,errorMessage : string,computerName : string;
            if(subResultId && testResult.subResults){
                
                let subResult: TCMContracts.TestSubResult = BugWorkItemHelper._getSubResultById(testResult.subResults, subResultId, 1);
                
                if(subResult){
                    stackTrace = subResult.stackTrace;
                    errorMessage = subResult.errorMessage;
                    computerName = subResult.computerName;
                }
                else{
                    stackTrace = testResult.stackTrace;
                    errorMessage = testResult.errorMessage;
                    computerName = testResult.computerName;
                }
            }
            else{
                stackTrace = testResult.stackTrace;
                errorMessage = testResult.errorMessage;
                computerName = testResult.computerName;
            }    

            //Test Name
            reproStepBuilder.append(BugWorkItemHelper._createStep((testResult.automatedTestName ? testResult.automatedTestName : testResult.testCase.name),
                Resources.ResultGridTitle_Test, true));
            //Priority
            reproStepBuilder.append(BugWorkItemHelper._createStep(
                (testResult.priority != null && testResult.priority != 255) ? testResult.priority.toString() : null, Resources.PriorityText));
            //Container
            reproStepBuilder.append(BugWorkItemHelper._createStep(testResult.automatedTestStorage, Resources.TestFileText));
            //Machine
            reproStepBuilder.append(BugWorkItemHelper._createStep(computerName, Resources.MachineLabel));
            //Tested Build
            if (testResult.build) {
                reproStepBuilder.append(BugWorkItemHelper._createStep(testResult.build.name, Resources.TestedBuildText,
                    false, TMUtils.UrlHelper.getBuildSummaryUrl(parseInt(testResult.build.id))));
            } else {
                reproStepBuilder.append(BugWorkItemHelper._createStep(null, Resources.TestedBuildText,
                    false, null));
            }
            
            //Error message
            reproStepBuilder.append(BugWorkItemHelper._createStep(errorMessage, Resources.ErrorMessageLabel, true));
            //StackTrace
            reproStepBuilder.append(BugWorkItemHelper._createStep(stackTrace, Resources.StackTraceLabel, false, null, true));

        }
        return reproStepBuilder.toString();
    }

    private static _getSubResultById(subResults: TCMContracts.TestSubResult[], id: number, depth: number): TCMContracts.TestSubResult {
        let subResult: TCMContracts.TestSubResult;
        if (subResults == null || depth > TestTabConstants.Constants.maxDepthAllowed)  {
            return;
        }
        for (let i = 0; i < subResults.length; ++i) {
            if (subResults[i].id === id) {
                return subResults[i];
            }
        }
        for (let i = 0; i < subResults.length; ++i) {
            if (subResults[i].subResults) {
                subResult = this._getSubResultById(subResults[i].subResults, id, depth + 1);
                if (subResult) {
                    return subResult;
                }
            }
        }
        
        
    }

    private static _createStep(fieldValue: any, fieldName?: string, bold?: boolean, href?: string, appendNewLine?: boolean): string {
        let displayPattern: string;
        let fieldNameElem: JQuery;
        let htmlBreak: string = "<br />";
        let fieldValueElem: JQuery = $("<span />");
        if (fieldValue) {
            if (bold) {
                fieldValueElem.append($("<b />").text(fieldValue));
            } else if (href) {
                fieldValueElem.append($("<a/>").attr("href", href).attr("target", "_blank").attr("rel", "nofollow noopener noreferrer").text(fieldValue));
            } else if (appendNewLine) {
                fieldValueElem.append("<br />").append($("<span />").text(fieldValue));
            }
            else {
                fieldValueElem.append("<span />").text(fieldValue);
            }
        } else {
            //handling for null/empty value
            fieldValueElem.append($("<span />").text(Resources.NotAvailableText).attr("style", "color: " + this.c_greyTextColor));
        }

        if (fieldName) {
            displayPattern = "{0}: {1}{2}";
            fieldNameElem = $("<span />").append($("<span />").text(fieldName).attr("style", "color: " + this.c_greyTextColor));    //This html will be rendered in iframe(repro step section) so using hardcoded color.
            return Utils_String.format(displayPattern, fieldNameElem.html(), fieldValueElem.html(), htmlBreak);
        }
        else {
            //Without FieldName Label; Only Value without html break
            displayPattern = "{0}";
            return Utils_String.format(displayPattern, fieldValueElem.html());
        }
    }

    private static _addTestResultsLink(workItem: WITOM.WorkItem, testResults: TCMContracts.TestCaseResult[]) {

        let testCaseResultsMonikorHashes: IDictionaryStringTo<boolean> = {};

        //Create test results monikors.
        testResults.forEach(r => {
            let testCaseResultMonikor: string = LinkingUtilities.encodeUri({
                tool: Artifacts_Constants.ToolNames.TestManagement,
                type: Artifacts_Constants.ArtifactTypeNames.TcmResult,
                id: Utils_String.format("{0}.{1}", parseInt(r.testRun.id), r.id)
            });

            testCaseResultsMonikorHashes[testCaseResultMonikor] = true;
        });

        //Filter out links which are already added.
        let links: WITOM.Link[] = workItem.getLinks();
        if (links && links.length > 0) {
            links.forEach(l => {
                if (l.getArtifactLinkType() === TCMConstants.WitLinkTypes.TestResult && testCaseResultsMonikorHashes[l.linkData.FilePath]) {
                    testCaseResultsMonikorHashes[l.linkData.FilePath] = false;
                }
            });
        }

        //Add remaining links.
        for (let monikor in testCaseResultsMonikorHashes) {
            if (testCaseResultsMonikorHashes[monikor]) {
                workItem.addLink(ExternalLink.create(workItem, TCMConstants.WitLinkTypes.TestResult, monikor));
            }
        }
    }

    private static _addTestResultLink(workItem: WITOM.WorkItem, runId, resultId) {

        let testCaseResultMonikor: string, externalLink: WITOM.ExternalLink;

        testCaseResultMonikor = LinkingUtilities.encodeUri({
            tool: Artifacts_Constants.ToolNames.TestManagement,
            type: Artifacts_Constants.ArtifactTypeNames.TcmResult,
            id: Utils_String.format("{0}.{1}", runId, resultId)
        });

        externalLink = ExternalLink.create(workItem, TCMConstants.WitLinkTypes.TestResult, testCaseResultMonikor);
        workItem.addLink(externalLink);
    }

    private static _addTestCaseRefLink(workItem: WITOM.WorkItem, testCaseRefIds: string[]) {

        let testCaseRefsMonikorHashes: IDictionaryStringTo<boolean> = {};

        //Create test results monikors.
        testCaseRefIds.forEach(ref => {
            let testCaseRefMonikor: string = LinkingUtilities.encodeUri({
                tool: Artifacts_Constants.ToolNames.TestManagement,
                type: Artifacts_Constants.ArtifactTypeNames.TcmTest,
                id: ref.toString()
            });

            testCaseRefsMonikorHashes[testCaseRefMonikor] = true;
        });

        //Filter out links which are already added.
        let links: WITOM.Link[] = workItem.getLinks();
        if (links && links.length > 0) {
            links.forEach(l => {
                if (l.getArtifactLinkType() === TCMConstants.WitLinkTypes.Test && testCaseRefsMonikorHashes[l.linkData.FilePath]) {
                    testCaseRefsMonikorHashes[l.linkData.FilePath] = false;
                }
            });
        }

        //Add remaining links.
        for (let monikor in testCaseRefsMonikorHashes) {
            if (testCaseRefsMonikorHashes[monikor]) {
                workItem.addLink(ExternalLink.create(workItem, TCMConstants.WitLinkTypes.Test, monikor));
            }
        }
    }

    private static _addBuildLink(workItem: WITOM.WorkItem, buildId: number) {

        let buildUri: string, externalLink: WITOM.ExternalLink;

        buildUri = LinkingUtilities.encodeUri({
            tool: Artifacts_Constants.ToolNames.TeamBuild,
            type: Artifacts_Constants.ArtifactTypeNames.Build,
            id: buildId.toString()
        });

        let links: WITOM.Link[] = workItem.getLinks();
        if (links
            && links.length > 0
            && links.some(l => l.getArtifactLinkType() === RegisteredLinkTypeNames.FoundInBuild && l.linkData.FilePath === buildUri)) {
            //If link already exists then return.
            return;
        }

        externalLink = ExternalLink.create(workItem, RegisteredLinkTypeNames.FoundInBuild, buildUri);
        workItem.addLink(externalLink);
    }

    private static c_greyTextColor: string = "6d6d6d";   //This is same as TFS styles["subtleForegroundColor"]
}

export interface IExpandAllAttributes {
    expandAllControl: string;
    expandAllIcon: string;
    collapseAllIcon: string;
    delay?: number;
}

export interface IAccordionAttributes {
    expandAllClasses: IExpandAllAttributes;
    expandedIcon: string;
    collapseIcon: string;
    visibleHeader: string;
    collapsibleContent: string;
    container: string;
    delay?: number;
    feature?: string;
}

export class AccordionConstants {
    public static ACCORDION_DELAY: number = 400;
}

export class Accordion {

    constructor(classList: IAccordionAttributes, obj: JQuery) {
        this._element = obj;
        this._classList = classList;
        this._initialize();
    }

    private _initialize() {
        this._visibleHeader = $(this._element).find(Utils_String.format(".{0}", this._classList.visibleHeader));
        this._collapsibleContent = $(this._element).find(Utils_String.format(".{0}", this._classList.collapsibleContent));
        this._accordionDelay = this._classList.delay ? this._classList.delay : AccordionConstants.ACCORDION_DELAY;
        this._registerEventsForExpandCollapse();

        if (this._classList.expandAllClasses && this._classList.expandAllClasses.expandAllControl) {
            this._expandAll = $(this._element).find(Utils_String.format(".{0}", this._classList.expandAllClasses.expandAllControl));
            this._expandAllDelay = this._classList.expandAllClasses.delay ? this._classList.expandAllClasses.delay : AccordionConstants.ACCORDION_DELAY;
            this._registerEventForExpandAll();
        }
    }

    //Close all sections with class expandable-section-title.
    public collapseAllAccordions(delay: number, target?: JQuery) {
        this._visibleHeader.removeClass(this._classList.expandedIcon).removeClass("active").addClass(this._classList.collapseIcon);
        this._collapsibleContent.slideUp(delay).removeClass("open");
        this._openAccordionCount = 0;

        this._expandedAllState = false;
        if (target != null) {
            target.removeClass(this._classList.expandAllClasses.collapseAllIcon).addClass(this._classList.expandAllClasses.expandAllIcon);
        }
        //Telemetry section
        if (this._classList.feature && Utils_String.equals(this._classList.feature, "Iterations", true)) {
            TelemetryService.publishEvents(TelemetryService.featureExpandCollapseAllTestIterations, {
                "IterationCount": this._visibleHeader.length,
                "action": "collapse"
            });
        }

    }

    //Expand all sections with class expandable-section-title.
    public expandAllAccordions(delay: number, target?: JQuery) {
        this._visibleHeader.removeClass(this._classList.collapseIcon).addClass("active").addClass(this._classList.expandedIcon);
        this._collapsibleContent.slideDown(delay).addClass("open");
        this._openAccordionCount = this._visibleHeader.length;

        this._expandedAllState = true;
        if (target != null) {
            target.removeClass(this._classList.expandAllClasses.expandAllIcon).addClass(this._classList.expandAllClasses.collapseAllIcon);
        }
        //Telemetry section
        if (this._classList.feature && Utils_String.equals(this._classList.feature, "Iterations", true)) {
            TelemetryService.publishEvents(TelemetryService.featureExpandCollapseAllTestIterations, {
                "IterationCount": this._visibleHeader.length,
                "action": "expand"
            });
        }
    }

    private _registerEventsForExpandCollapse() {
        this._visibleHeader.click((e) => {
            // Grab current anchor value
            let currentAttrValue = $(e.target).attr("href");
            this._collapsibleTarget = Utils_String.format(".{0} #{1}", this._classList.container, currentAttrValue);

            if ($(e.target).is(".active")) {
                $(e.target).attr("aria-expanded", "false");
                $(e.target).attr("aria-label", Resources.ExpandIterationDetailsLabel);
                $(e.target).removeClass("active");
                $(e.target).removeClass(this._classList.expandedIcon).addClass(this._classList.collapseIcon);
                $(this._element).find(this._collapsibleTarget).slideUp(this._accordionDelay).removeClass("open");
                this._openAccordionCount--;
                if (this._expandAll && this._openAccordionCount == 0) {
                    this._expandedAllState = false;
                    this._expandAll.removeClass(this._classList.expandAllClasses.collapseAllIcon).addClass(this._classList.expandAllClasses.expandAllIcon);
                }
                //telemetry section for expandCollapseSingleIteration
                if (this._classList.feature && Utils_String.equals(this._classList.feature, "Iterations", true)) {
                    TelemetryService.publishEvent(TelemetryService.featureExpandCollapseSingleTestIteration, "action", "collapse");
                }
            } else {
                $(e.target).attr("aria-expanded", "true");
                $(e.target).attr("aria-label", Resources.CollapseIterationDetailsLabel);
                // Add active class to section title
                $(e.target).addClass("active");

                // Replace the collapse icon with expanded
                $(e.target).removeClass(this._classList.collapseIcon).addClass(this._classList.expandedIcon);

                // Open up the hidden content panel
                $(this._element).find(this._collapsibleTarget).slideDown(this._accordionDelay).addClass("open");
                this._openAccordionCount++;
                if (this._expandAll && this._openAccordionCount === this._visibleHeader.length) {
                    this._expandedAllState = true;
                    this._expandAll.removeClass(this._classList.expandAllClasses.expandAllIcon).addClass(this._classList.expandAllClasses.collapseAllIcon);
                }
                //Telemetry section for expandCollapseSingleIteration
                if (this._classList.feature && Utils_String.equals(this._classList.feature, "Iterations", true)) {
                    TelemetryService.publishEvent(TelemetryService.featureExpandCollapseSingleTestIteration, "action", "expand");
                }
            }

            e.preventDefault();
            e.stopPropagation();
        });
    }

    private _registerEventForExpandAll() {
        this._expandAll.click((e) => {

            this._toggleExpandCollapse($(e.target));

            e.preventDefault();
            e.stopPropagation();
        });
    }

    //Toggle the global expand-all, collapse-all icons
    private _toggleExpandCollapse(target: JQuery) {
        if (this._expandedAllState) {
            this.collapseAllAccordions(this._expandAllDelay, target);
        }
        else {
            this.expandAllAccordions(this._expandAllDelay, target);
        }
    }

    private _openAccordionCount: number = 0;
    private _accordionDelay: number;
    private _expandAllDelay: number;
    private _expandedAllState: boolean = false;
    private _element: JQuery;
    private _visibleHeader: JQuery;
    private _collapsibleContent: JQuery;
    private _collapsibleTarget: string;
    private _classList: IAccordionAttributes;
    private _expandAll: JQuery;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.RunsView.Common.Controls", exports);

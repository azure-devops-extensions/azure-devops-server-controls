/// <reference types="jquery" />



import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TRACommonControls = require("TestManagement/Scripts/TFS.TestManagement.RunsView.Common.Controls");
import ValueMap = require("TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap");

import Controls = require("VSS/Controls");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Diag = require("VSS/Diag");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

let TelemetryService = TCMTelemetry.TelemetryService;

export interface IterationsViewControlOptions {
    iterations: TestsOM.TestIterationCollection;
    attachments: TestsOM.ITestResultAttachmentModel[];
    isParameterizedTestCase: boolean;
}

export class IterationsView extends Controls.Control<IterationsViewControlOptions> {

    public initializeOptions(options: IterationsViewControlOptions) {
        super.initializeOptions($.extend({ cssClass: "iterations-view" }, options));
        this._iterations = options.iterations;
        this._attachments = options.attachments || [];
        this._isParameterizedTestCase = options.isParameterizedTestCase;
    }

    public initialize() {
        super.initialize();

        if (this._iterations) {
            let iterations: TestsOM.TestIterationResult[] = this._iterations.getItems();

            //Initialize the map
            for (let i = 0, len = this._attachments.length; i < len; i++) {

                let resultAttachment: TestsOM.IResultAttachment = {
                    actionPath: this._attachments[i].actionPath,
                    attachment: this._attachments[i]
                };
                let iterationId = this._attachments[i].iterationId;

                if (!this._attachmentMap[iterationId]) {
                    this._attachmentMap[iterationId] = [];
                }

                this._attachmentMap[this._attachments[i].iterationId].push(resultAttachment);
            }

            this._populateIterationsSection(iterations, this._element);

            let expandAllClasses: TRACommonControls.IExpandAllAttributes = {
                expandAllControl: "expand-all",
                expandAllIcon: "bowtie-icon bowtie-toggle-expand-all",
                collapseAllIcon: "bowtie-icon bowtie-toggle-collapse-all"
            };

            let classList: TRACommonControls.IAccordionAttributes = {
                expandAllClasses: expandAllClasses,
                expandedIcon: "bowtie-icon bowtie-chevron-down",
                collapseIcon: "bowtie-icon bowtie-chevron-right",
                visibleHeader: "accordion-section-title",
                collapsibleContent: "accordion-section-content",
                container: "accordion-section",
                feature: "Iterations"
            };

            this._accordionControl = new TRACommonControls.Accordion(classList, this._element);
        }
    }

    public collapseAll() {
        this._accordionControl.collapseAllAccordions(0, this._element.find(".expand-all"));
    }

    public expandAll() {
        this._accordionControl.expandAllAccordions(0, this._element.find(".expand-all"));
    }

    private _populateIterationsSection(iterations: TestsOM.TestIterationResult[], $container: JQuery) {
        Diag.logVerbose("[IterationsView._populateIterationsSection] - Called");
        let $titleDiv: JQuery, $detailsDiv: JQuery, accordionId: string;

        let $expandAllIconSpan: JQuery = $("<span class='iteration-expand-all-icon bowtie-icon bowtie-toggle-expand-all expand-all' />");

        let $iconAndTitleContainer = $("<div />").addClass(this._testSectionHeader);
        let $iterationsHeaderSpan = $("<span />").text(Resources.DetailsText);
        $iconAndTitleContainer.append($expandAllIconSpan);
        $iconAndTitleContainer.append($iterationsHeaderSpan);
        $iconAndTitleContainer.appendTo($container);

        for (let i = 0, len = iterations.length; i < len; i++) {
            accordionId = Utils_String.format("accordion-{0}", i);

            let $iterationDiv: JQuery = $("<div class='accordion-section'/>");
            this._populateIterationsTitleSection(iterations[i], $iterationDiv, accordionId);

            //Create a child Div to hold all details
            $detailsDiv = $("<div />").attr("id", accordionId).addClass("accordion-section-content iteration-details");

            //Populate the details in child Div
            this._populateIterationsTestStepsSection(iterations[i], $detailsDiv);
            this._populateIterationsCommentsSection(iterations[i], $detailsDiv);
            this._populateAttachmentsSection(iterations[i], $("<div class='iterations-attachment-section hub-no-content-gutter' />").appendTo($detailsDiv));

            //Append the child Div to the title Div
            $detailsDiv.appendTo($iterationDiv);
            $iterationDiv.appendTo($container);
        }
    }

    private _populateIterationsTitleSection(iteration: TestsOM.TestIterationResult, $container: JQuery, titleDivId: string) {
        Diag.logVerbose("[IterationsView._populateIterationsTitleSection] - Called");
        let text: string;

        let $iterationsTitle: JQuery = $("<div class='iteration-title-border'/>");

        let $iterationTitleTable = $("<table />");
        let $iterationTitleLeftSection = $("<td class='iteration-title-left-section'/>");
        let $iterationTitleRightSection = $("<td class='iteration-title-left-section'/>");

        let $chevronContainer: JQuery = $("<span />");
        $chevronContainer.append($("<a class='accordion-section-title icon iteration-chevron bowtie-icon bowtie-chevron-right'/>")
            .attr({ "href": titleDivId, "role": "button", "aria-expanded": "false", "aria-label": Resources.ExpandIterationDetailsLabel }));

        $iterationTitleLeftSection.append($chevronContainer);

        let iconClass: string = ValueMap.TestOutcome.getIconClassName(iteration.outcome);
        $iterationTitleLeftSection.append($("<span class='result-summary-icon bowtie-icon' />").addClass(iconClass));
        text = ValueMap.TestOutcome.getFriendlyName(iteration.outcome).toLowerCase();

        if (this._isParameterizedTestCase) {
            text = Utils_String.format(Resources.IterationTitleFormat, iteration.iterationId, text);
        }
        else {
            text = Utils_String.format(Resources.IterationTitleFormatWhenNoSteps, text);
        }

        $("<span class='iteration-details-title-style'/>").text(text).appendTo($iterationTitleLeftSection);

        let durationReadableFormat = TRACommonControls.TRAHelper.ConvertMilliSecondsToReadableFormatForResultSummary(iteration.duration ? Math.floor(iteration.duration / 10000) : 0) ;
        let dateStartedReadableFormat = Utils_Date.localeFormat(iteration.dateStarted, "G", false);
        text = Utils_String.localeFormat(Resources.IterationStartTimeDurationFormat, dateStartedReadableFormat, durationReadableFormat);

        if (text) {
            $("<span class='iteration-duration-format'/>").text(text).appendTo($iterationTitleRightSection);
        }

        let $iterationTitleRow = $("<tr class='iteration-title-row'/>");
        $iterationTitleRow.append($iterationTitleLeftSection);
        $iterationTitleRow.append($iterationTitleRightSection);

        $iterationTitleTable.append($iterationTitleRow);
        $iterationsTitle.append($iterationTitleTable);
        $iterationsTitle.appendTo($container);
    }

    private _populateIterationsTestStepsSection(iteration: TestsOM.TestIterationResult, $container: JQuery) {
        $("<div />").addClass(this._iterationDetailsSectionHeader).text(Resources.TestStepsTitle).appendTo($container);
        let $testStep: JQuery;
        let actionResults: TestsOM.TestActionResultCollection = iteration.actionResults;
        let testStepResult: any[] = actionResults.getItems();

        if (testStepResult.length === 0) {
            let $noTestStep: JQuery = $("<span class='result-teststeps-noitems'/>").text(Resources.ResultNoTestSteps);
            $noTestStep.appendTo($container);
            return;
        }

        for (let i = 0, len = testStepResult.length; i < len; i++) {
            $testStep = $("<div class='test-step-container'/>").appendTo($container);
            this._populateTestStepResult(testStepResult[i], $testStep);
        }
    }

    private _populateTestStepResult(testStepResult: any, $container: JQuery) {
        Diag.logVerbose("[IterationsView._populateTestStepResult] - Called");

        if (testStepResult instanceof TestsOM.TestStepResult) {
            this._populateSingleTestStepResult(testStepResult, $("<div class='test-step-section' />").appendTo($container));
            //step level attachments
            this._populateTestStepScreenshotSection(testStepResult, $("<div class='test-step-attachment-section hub-no-content-gutter' />").appendTo($container));
        }
        else if (testStepResult instanceof TestsOM.SharedStepResult) {
            let title: string = Utils_String.format("<div><p>{0}</p><div/>", testStepResult.getAction());
            let index: string = Utils_String.format(Resources.StepIndex, testStepResult.indexString);
            let $sharedTestStepSection: JQuery = $("<div class='shared-test-step-section'/>");
            this._createStepTitle(index, title, testStepResult.outcome, $sharedTestStepSection);
            $sharedTestStepSection.appendTo($container);
            this._populateSharedTestStepResult(testStepResult, $("<div class='iterations-shared-steps-section'/>").appendTo($container));
        }
    }

    private _populateSingleTestStepResult(testStepResult: TestsOM.TestStepResult, $container: JQuery) {
        Diag.logVerbose("[IterationsView._populateSingleTestStepResult] - Called");

        if (testStepResult.isTestStepPresent()) {
            this._createStepTitle(Utils_String.format(Resources.StepIndex, testStepResult.indexString), testStepResult.getAction(), testStepResult.outcome, $container);
            this._createStepDetails(testStepResult, $container);
        }

        Diag.logVerbose("[IterationsView._populateSingleTestStepResult] - Exit");
    }

    private _createStepTitle(stepId: string, stepTitle: string, outcome: number, $container: JQuery) {
        Diag.logVerbose("[IterationsView._createStepTitle] - Called");

        stepTitle = "<div><p>" + stepTitle + "</p></div>";

        let stepTitleElement: JQuery = $(stepTitle).find("p").addClass("p-tag-padding");
        let titleElement = $(stepTitleElement);

        //create the title table
        let $titleTable: JQuery = $("<table />");
        let $layoutRow: JQuery = $("<tr/>");

        //create the icon column
        let $iconColumn: JQuery = $("<td class='iteration-details-title-icon-style' />").appendTo($layoutRow);
        let $iconSpan: JQuery = $("<span class='result-summary-icon bowtie-icon' />").addClass(ValueMap.TestOutcome.getIconClassName(outcome));
        RichContentTooltip.add(ValueMap.TestOutcome.getFriendlyName(outcome), $iconSpan);
        $iconColumn.append($iconSpan);

        //create the index column
        let $indexColumn: JQuery = $("<td class='test-step-inline-title test-step-index' />");
        $indexColumn.text(stepId);

        //create the title column
        let $titleColumn: JQuery = $("<td class='test-step-inline-title test-step-title' />").appendTo($layoutRow);
        $titleColumn.append(titleElement);

        //Add all above columns to the row
        $layoutRow.append($iconColumn);
        $layoutRow.append($indexColumn);
        $layoutRow.append($titleColumn);

        //Add row to table and table to container
        $layoutRow.appendTo($titleTable);
        $titleTable.appendTo($container);
    }

    private _createStepDetails(testStepResult: TestsOM.TestStepResult, $container: JQuery) {
        Diag.logVerbose("[IterationsView._createStepDetails] - Called");

        //Create a parent Div for test step details
        let $stepDetailsDiv: JQuery = $("<div class='test-step-detail'/>");

        //create the main table for test step details
        let $layoutTable: JQuery = $("<table class ='test-step-details-table'/>");

        //create a sub-table for parameters
        let $paramTable: JQuery = $("<table class ='test-step-parameters-table'/>");
        let params: TestsOM.TestResultParameter[] = testStepResult.parameters.getItems();
      
        if (params && params.length > 0) {
            for (let i = 0, len = params.length; i < len; i++) {
                if (params[i].actionPath) {
                    let $layoutRow: JQuery = $("<tr />");
                    let column: JQuery = $("<td class='test-step-parameter-name'/>").appendTo($layoutRow);
                    column.text(params[i].parameterName);
                    $("<td class='test-step-parameter-value'/>").appendTo($layoutRow).text(params[i].expected);
                    $paramTable.append($layoutRow);
                }
            }
       
            //create the row for 'Parameters'
            let $layoutRow: JQuery = $("<tr/>");
            let column: JQuery = $("<td class='test-step-details-key'/>").appendTo($layoutRow);
            column.text(Resources.Parameters);
            $("<td />").appendTo($layoutRow).append($paramTable);
            $layoutTable.append($layoutRow);
        }

        //create the row for 'Expected Result'
        let expectedResult: string = testStepResult.getExpectedResult();
        expectedResult = "<div><p>" + expectedResult + "</p></div>";
        if (expectedResult && !Utils_String.equals($(expectedResult).text().trim(), Utils_String.empty)) {
            let $layoutRow = $("<tr class='test-step-expected-result-row' />");
            let column: JQuery = $("<td class='test-step-details-key test-step-expected-result'/>").appendTo($layoutRow);
            column.text(Resources.TestStepsControlExpectedResult);
            $("<td class='test-step-expected-result-value'/>").appendTo($layoutRow).append(expectedResult);
            $layoutTable.append($layoutRow);
        }
     
        //create the row for 'Comment' - which takes errorMessage and shows as comment in UI.
        let comment: string = testStepResult.errorMessage;
        if (comment) {
            let $layoutRow: JQuery = $("<tr class='test-step-comment' />");
            let column: JQuery = $("<td class='test-step-details-key test-step-comment-title'/>").appendTo($layoutRow);
            column.text(Resources.Comment);
            let columnElement: JQuery = $("<p class='p-tag-padding'/>").text(comment);
            $("<td class='test-step-comment-value'/>").appendTo($layoutRow).append(columnElement);
            $layoutTable.append($layoutRow);
        }

        //Append the main table to step details Div
        $layoutTable.appendTo($stepDetailsDiv);

        //Finally, append the step details Div to the container
        $stepDetailsDiv.appendTo($container);

        Diag.logVerbose("[IterationsView._createStepDetails] - Exit");
    }

    private _populateSharedTestStepResult(testStepResult: TestsOM.SharedStepResult, $container: JQuery) {
        Diag.logVerbose("[IterationsView._populateSharedTestStepResult] - Called");
        let testStepResults: TestsOM.TestStepResult[] = testStepResult.actionResults.getItems();
        for (let i = 0, len = testStepResults.length; i < len; i++) {
            let $sharedStepSubStepsContainer: JQuery = $("<div class='step-and-attachment-container shared-step-substeps'/>");
            this._populateSingleTestStepResult(testStepResults[i], $("<div class='test-step-section' />").appendTo($sharedStepSubStepsContainer));
            //step level attachments
            this._populateTestStepScreenshotSection(testStepResults[i], $("<div class='test-step-attachment-section hub-no-content-gutter' />").appendTo($sharedStepSubStepsContainer));
            $sharedStepSubStepsContainer.appendTo($container);
        }
    }

    private _populateTestStepScreenshotSection(testStepResult: TestsOM.TestStepResult, $container: JQuery) {
        Diag.logVerbose("[IterationsView._populateTestStepScreenshotSection] - Called");
        let testStepResultAttachmentHeader: JQuery = $("<div class='test-step-result-attachment-header'>");
        $("<span class='screenshot-title'/>").text(Resources.TestStepAttachmentTitle).appendTo(testStepResultAttachmentHeader);
        let attachments: TestsOM.ITestResultAttachmentModel[] = [];

        if (!this._attachmentMap[testStepResult.iterationId]) {
            return;
        }

        for (let i = 0, len = this._attachmentMap[testStepResult.iterationId].length; i < len; i++) {
            if (Utils_String.equals(this._attachmentMap[testStepResult.iterationId][i].actionPath, testStepResult.actionPath)) {
                attachments.push(this._attachmentMap[testStepResult.iterationId][i].attachment);
            }
        }
        if (attachments.length > 0) {
            testStepResultAttachmentHeader.appendTo($container);
            this._populateTestStepResultAttachmentsSection(attachments, $container);
        }
        Diag.logVerbose("[IterationsView._populateTestStepScreenshotSection] - Exit");
    }

    private _populateIterationsCommentsSection(iteration: TestsOM.TestIterationResult, $container: JQuery) {
        Diag.logVerbose("[IterationsView._populateIterationsCommentsSection] - Called");
        if (iteration.comment) {
            $("<div class='iteration-comment-header'/>").addClass(this._iterationDetailsSectionHeader).text(Resources.CommentsText).appendTo($container);
            $("<div class='iteration-comment'/>").text(iteration.comment).appendTo($container);
        }
    }

    private _populateTestStepResultAttachmentsSection(attachments: TestsOM.ITestResultAttachmentModel[], $container: JQuery) {
        Diag.logVerbose("[IterationsView._populateTestStepResultAttachmentsSection] - Called");

        // Create the main container
        let $stepResultAttachmentsContainer: JQuery = $("<div class ='test-step-result-attachments-container'/>");

        let attachmentInfo: TestsOM.AttachmentInfo[] = [];
        let image_extensions: RegExp = TMUtils.ImageHelper.getImageExtensionRegex();
    
        for (let i = 0, len = attachments.length; i < len; i++) {
            attachmentInfo.push(new TestsOM.AttachmentInfo(attachments[i].id, attachments[i].fileName, attachments[i].size, attachments[i].comment));
        }

        let imageContainer: JQuery = $("<div class='test-step-result-snapshot-container'/>");
        for (let i = 0, len = attachmentInfo.length; i < len; i++) {
            if (image_extensions.test(attachmentInfo[i].getName())) {
                // All the images will be shown after the list of links for non-image attachments.
                this._addTestStepResultAttachment(imageContainer, attachmentInfo[i], "snapshot-attachment", "snapshot-attachment-name", true);
            }
            else {
                this._addTestStepResultAttachment($stepResultAttachmentsContainer, attachmentInfo[i], "test-step-result-attachment-row", "test-step-result-attachment-name", false);
            }
        }

        $container.append($stepResultAttachmentsContainer);
        $container.append(imageContainer);
    }

    private _populateAttachmentsSection(iteration: TestsOM.TestIterationResult, $container: JQuery) {
        Diag.logVerbose("[IterationsView._populateAttachmentsSection] - Called");

        // Create the main table
        let $layoutTable: JQuery = $("<table class ='attachment-table iterations-attachment-table'/>");
        let attachmentHeader: string = this._isParameterizedTestCase ? Resources.IterationAttachmentsHeaderText : Resources.ResultAttachmentsHeaderText;
        $("<div />").addClass(this._iterationDetailsSectionHeader).text(attachmentHeader).appendTo($container);

        let iterationAttachments: TestsOM.AttachmentInfo[] = [];
        let allIterationAttachments: TestsOM.IResultAttachment[] = this._attachmentMap[iteration.iterationId] || [];

        for (let i = 0, len = allIterationAttachments.length; i < len; i++){
            if (Utils_String.equals(allIterationAttachments[i].actionPath, Utils_String.empty)) {
                let attachment: TestsOM.ITestResultAttachmentModel = allIterationAttachments[i].attachment;
                iterationAttachments.push(new TestsOM.AttachmentInfo(attachment.id, attachment.fileName, attachment.size, attachment.comment));
            }
        }

        if (iterationAttachments.length === 0) {
            let $noAttachments: JQuery = $("<span class='result-attachments-noitems'/>").text(Resources.ResultNoAttachments);
            $noAttachments.appendTo($layoutTable);
            $container.append($layoutTable);
            return;
        }

        let $headerRowWithColumns: JQuery = this._addAttachmentColoumnHeadersRow();
        $layoutTable.append($headerRowWithColumns);

        for (let i = 0, len = iterationAttachments.length; i < len; i++) {
            this._addAttachmentRow($layoutTable, iterationAttachments[i]);
        }

        $container.append($layoutTable);
    }

    private _addAttachmentColoumnHeadersRow() {
        let $headerRow: JQuery = $("<tr/>");

        let $coloumnHeader: JQuery = $("<th />").addClass("attachment-header-name");
        $coloumnHeader.append(Resources.AttachmentName);

        $headerRow.append($coloumnHeader);

        $coloumnHeader = $("<th />").addClass("attachment-header-size");
        $coloumnHeader.append(Resources.AttachmentSize);

        $headerRow.append($coloumnHeader);
        return $headerRow;
    }

    private _addTestStepResultAttachment($container: JQuery, attachment: TestsOM.AttachmentInfo, attachmentTypeClass: string, attachmentNameClass: string, attachmentIsSnapshot: boolean = false) {
        let $stepResultAttachment: JQuery = $("<div '/>").addClass(attachmentTypeClass);
        let id: number = attachment.getId();

        let params = {
            attachmentId: id
        };

        let url: string = TMUtils.getTestResultManager().getApiLocation("DownloadAttachment", params);
        let column: JQuery = $("<a />").appendTo($("<div />").addClass(attachmentNameClass).appendTo($stepResultAttachment));
        column.attr("href", url).attr("target", "_blank").attr("rel", "nofollow noopener noreferrer");

        //Telemetry section
        column.click(() => {
            this._onClickTestStepResultAttachment(attachment, attachmentIsSnapshot);
        });
       
        if (!attachmentIsSnapshot) {
            column.text(attachment.getName());
        } else {
            let thumbnail: JQuery = $("<img class='result-step-thumbnail'/>").attr("src", url);
            column.append(thumbnail);
        }

        if (!Utils_String.equals(attachment.getComment(), Utils_String.empty)) {
            if (attachmentIsSnapshot) {
                let attachmentSizeString: string = Utils_String.format(Resources.AttachmentSizeValueInKB, Math.ceil(attachment.getSize() / 1024));
                RichContentTooltip.add(Utils_String.format(Resources.TooltipTitleShortcutFormat, attachment.getComment(), attachmentSizeString), column, { setAriaDescribedBy: true });
            } else {
                RichContentTooltip.add(attachment.getComment(), column, { setAriaDescribedBy: true });
            }
        }

        if (!attachmentIsSnapshot) {
            let attachmentSizeString: string = Utils_String.format(Resources.TestStepResultAttachmentSizeFormat, Math.ceil(attachment.getSize() / 1024));
            let $attachmentSize = $("<span class='test-step-result-attachment-size'/>").appendTo($stepResultAttachment).text(attachmentSizeString);
            RichContentTooltip.addIfOverflow(attachmentSizeString, $attachmentSize);
        }

        $container.append($stepResultAttachment);
    }

    private _addAttachmentRow($layoutTable: JQuery, attachment: TestsOM.AttachmentInfo) {
        let $layoutRow: JQuery = $("<tr class='iteration-attachment-row'/>");
        let id: number = attachment.getId();

        let params = {
            attachmentId: id
        };

        let url: string = TMUtils.getTestResultManager().getApiLocation("DownloadAttachment", params);
        let column: JQuery = $("<a />").appendTo($("<td class='iteration-attachment-name'/>").appendTo($layoutRow));
        column.text(attachment.getName()).attr("href", url).attr("target", "_blank").attr("rel", "nofollow noopener noreferrer");
        if (!Utils_String.equals(attachment.getComment(), Utils_String.empty)) {
            RichContentTooltip.add(attachment.getComment(), column, { setAriaDescribedBy: true });
        }
      
        let attachmentSizeString: string = Utils_String.format(Resources.AttachmentSizeValueInKB, Math.ceil(attachment.getSize() / 1024));
        let $attachmentSize = $("<td class='iteration-attachment-size'/>").appendTo($layoutRow).text(attachmentSizeString);
        RichContentTooltip.addIfOverflow(attachmentSizeString, $attachmentSize);

        $layoutTable.append($layoutRow);

        column.click(() => {
            this._onClickIterationAttachment(attachment);
        });
    }

    private _onClickIterationAttachment(attachment: TestsOM.AttachmentInfo) {
        //Telemetry section for download test iteration attachment
        let fileName: string = attachment.getName();
        let fileNameExtension: string = "null";
        if (fileName.indexOf(".") !== -1) {
            fileNameExtension = fileName.substring(fileName.lastIndexOf("."));
        }
        TelemetryService.publishEvents(TelemetryService.featureDownloadTestIterationAttachment, {
            "FilenameExtension": fileNameExtension,
            "SizeInKB": Math.ceil(attachment.getSize() / 1024)
        });   
    }

    private _onClickTestStepResultAttachment(attachment: TestsOM.AttachmentInfo, attachmentIsSnapshot: boolean) {
        //Telemetry section for download test step attachment
        TelemetryService.publishEvents(TelemetryService.featureDownloadTestStepAttachment, {
            "AttachmentIsSnapshot": attachmentIsSnapshot,
            "SizeInKB": Math.ceil(attachment.getSize() / 1024)
        });
    }

    private _attachmentMap: IDictionaryNumberTo<TestsOM.IResultAttachment[]> = {};
    private _accordionControl: TRACommonControls.Accordion;
    private _attachments: TestsOM.ITestResultAttachmentModel[];
    private _iterations: TestsOM.TestIterationCollection;
    private _testSectionHeader: string = "test-section-header";
    private _isParameterizedTestCase: boolean;
    private _iterationDetailsSectionHeader: string = "iteration-details-section-header";
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.ResultsView.Iterations", exports);


//Auto converted from TestManagement/Scripts/TFS.TestManagement.TestView.debug.js

/// <reference types="jquery" />

import q = require("q");

import AdminSendMail = require("Admin/Scripts/TFS.Admin.SendMail");

import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import ValueMap = require("TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap");

import BuildContracts = require("TFS/Build/Contracts");
import TCMContracts = require("TFS/TestManagement/Contracts");

import CheckboxList = require("VSS/Controls/CheckboxList");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import Notifications = require("VSS/Controls/Notifications");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";

let delegate = Utils_Core.delegate;
let DAUtils = TestsOM.DAUtils;
let HtmlNormalizer = Utils_Html.HtmlNormalizer;
let TelemetryService = TCMTelemetry.TelemetryService;
export let CheckedItems;

export class LongRunningOperationWithProgressMessage extends StatusIndicator.LongRunningOperation {

    constructor(container: any, options?: any) {
        super(container, options);
    }

    public updateWaitMessage(message: string) {
        let waitControl = <StatusIndicator.WaitControl>this.getWaitControl();
        if (waitControl) {
            waitControl.setMessage(message);
        }
    }

    public getCancellableOperation(): Utils_Core.Cancelable {
        let cancellable = new Utils_Core.Cancelable(this);
        cancellable.register(delegate(this, this.cancelOperation));
        return cancellable;
    }
}

export module xmlParsingHelpers {
    export let nodeFormat = "<{0}></{0}>";
}

export class checkboxesNames {
    public static TestPlan = "testPlan";
    public static TestPlanProperties = "testPlan_cb0";
    public static TestPlanHierarchy = "testPlan_cb1";
    public static TestPlanConfigurations = "testPlan_cb2";
    public static TestPlanSettings = "testPlan_cb3";
    public static SuiteOnlyRadio = "suiteOnly";
    public static SuiteAndChildRadio = "suiteAndChild";
    public static TestSuiteProperties = "suiteProperties";
    public static TestCaseSteps = "suiteTestCases";
    public static TestCaseParameters = "testSuite_cb0";
    public static TestCaseLinks = "testSuite_cb1";
    public static TestCaseAutomation = "testSuite_cb2";
    public static LatestTestOutcome = "testSuite_cb3";
}

interface CheckboxListHierarchyOptions extends CheckboxList.ICheckboxListOptions {
    childrens?: any[];
    parentId?: string;
    parentLabel?: string;
    parentContainer?: JQuery;
    uncheckParent?: boolean;
}

class CheckboxListHierarchy extends CheckboxList.CheckboxListO<CheckboxListHierarchyOptions> {
    private _checkedItemCount: number = 0;
    private _$parent: JQuery;

    public initialize(): void {
        super.initialize();
        this._initializeElement();
        this._setParent();
        this.setItems(this._options.childrens);
        this._initializeEvents();
    }

    public setInitialCheckedItemCount(initialCount: any) {

        this._checkedItemCount = initialCount;
    }

    private _updateCheckedItemCount() {
        if (this._$parent.prop("checked")) {
            this._checkedItemCount = this._options.childrens.length;
        }
        else {
            this._checkedItemCount = 0;
        }
    }

    private _setParent(): void {
        //Enable or disable test plan child when Test Plan check box is clicked.
        let that = this,
            $label: JQuery,
            $item: JQuery;

        $label = $("<label />", { "for": this._options.parentId, text: this._options.parentLabel });
        $item = $("<input/>").attr({ type: "checkbox", id: this._options.parentId });

        this._options.parentContainer.append($item).append($label);
        this._$parent = $item;
        this._$parent.click(() => {
			this.setCheckboxProp(this._element.find("input"), this._$parent.prop("checked"));
            this._updateCheckedItemCount();
        });
    }

	private setCheckboxProp(element: JQuery, isChecked: boolean){
	     element.prop("checked", isChecked);
		 element.attr("aria-checked", isChecked.toString());
	}

    private _initializeEvents(): void {
        //Toggle the parent to checked when when first child checked and uncheck the parent when all the childs get unchecked.
        let that = this;

        $(this._element.find("input")).each(function (index) {
            $(this).click(function () {
                if (that._options.uncheckParent) {
                    if ($(this).prop("checked")) {
                        that._checkedItemCount++;
                    }
                    else {
                        that._checkedItemCount--;
                    }
					that.setCheckboxProp(that._$parent, that._checkedItemCount > 0);
                }
                else {
                    if ($(this).prop("checked")) {
					that.setCheckboxProp(that._$parent, true);
                    }
                }
            });
        });
    }
}

export class ExportHtmlDialog extends Dialogs.ModalDialog {

    private _suiteCheckbox: CheckboxListHierarchy;
    private _planCheckbox: CheckboxListHierarchy;
    private _webSettingsService: any;
    private _errorSection: Notifications.MessageAreaControl;
    private _isChildSuitesCountExceededForExportFeature: boolean;

    public initializeOptions(options?: any): void {
        this._isChildSuitesCountExceededForExportFeature = options.isChildSuitesCountExceededForExportFeature;
        super.initializeOptions($.extend({
            cssClass: "export-html",
            position: { my: "center bottom", at: "center", of: window },
            buttons: {
                "ok": {
                    id: HtmlDocumentGenerator.buttonIds.email,
                    text: Resources.Email,
                    click: delegate(this, this.saveExportHtmlSettings)
                },
                "print": {
                    id: HtmlDocumentGenerator.buttonIds.print,
                    text: Resources.Print,
                    click: delegate(this, this.saveExportHtmlSettings)
                },
                "cancel": {
                    id: HtmlDocumentGenerator.buttonIds.cancel,
                    text: Resources.CancelText,
                    click: delegate(this, this.onCancelClick)
                }
            }
        }, options));
    }

    public initialize(): void {
        let $controlElement: JQuery = this.getElement();
        // Setup the error pane.
        this._errorSection = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $controlElement);

        super.initialize();
        this.updatePrintAndEmailButtons(false);
        this._webSettingsService = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService(TFS_WebSettingsService.WebSettingsService);
        this._createCheckboxes();
    }

    public saveExportHtmlSettings(event: any) {
        Diag.logTracePoint("HtmlDocumentGenerator.saveExportHtmlSettings.Start");
        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assert(event.currentTarget, "currentTarget");

        let checkedCheckboxes = [],
            settingKey = this._getExportHtmlSettingsKey(),
            checkedValues: string;

        this._element.find("input").each(function () {
            if ($(this).prop("checked")) {
                checkedCheckboxes.push($(this).prop("id"));
            }
        });

        if (checkedCheckboxes.length > 0) {
            checkedValues = checkedCheckboxes.join("&");
        }
        else {
            checkedValues = null;
        }
        this._webSettingsService.beginWriteSetting(settingKey, checkedValues, TFS_WebSettingsService.WebSettingsScope.User);
        CheckedItems = checkedCheckboxes;
        if (this._isChildSuitesCountExceededForExportFeature) {
            if (this._isCheckboxChecked(checkboxesNames.SuiteAndChildRadio)) {
                let errorMessage = Utils_String.format(Resources.ExportErrorMessage, TCMConstants.ExportHtml.TestSuitesLimit);
                this._errorSection.setError(errorMessage);
                let action = Utils_String.empty;
                if (event && event.currentTarget) {
                    // This will contain the test plan and test suite URL
                    action = event.currentTarget.formAction;
                }
                // Publish the event that export html feature exceeded suites limit
                TelemetryService.publishEvents(TelemetryService.exportHtmlExceedSuitesLimit, { "Action": action });
                return;
            }
        }

        this.setDialogResult(event.currentTarget.id);
        this.onOkClick();
    }

    private _getExportHtmlSettingsKey(): string {
        return "ExportHtmlSettings";
    }

    private _createCheckboxes(): void {
        //Creating all the checkboxes and setting up the layout.    
        this._getExportHtmlSettings();
    }

    private _createItem(itemType: string, itemLabel: string, itemId: string, $container: JQuery): JQuery {
        let $label: JQuery,
            $item: JQuery;

        $label = $("<label />", { "for": itemId, text: itemLabel });
        $item = $("<input/>").attr({ type: itemType, id: itemId });

        if (itemType === "radio") {
            ($item).attr("name", "dataRequired");
        }

        $container.append($item).append($label);
        return $item;
    }

    private _isCheckboxChecked(checkboxName: string) {
        for (let i = 0, checkedCheckboxesCount = CheckedItems.length; i < checkedCheckboxesCount; i++) {
            if (CheckedItems[i] === checkboxName) {
                return true;
            }
        }

        return false;
    }

    private _setLayout(): void {
        //Decorate Basic Layout of Test Suite Parent-Child Checkboxes
        let container = this._element,
            $testPlanDiv: JQuery,
            $testSuiteDiv: JQuery,
            $properties: JQuery,
            $testSuiteOnlyradiobutton: JQuery,
            $testSuiteAndChildradiobutton: JQuery;

        $testPlanDiv = $("<div class='test-plan' />");
        $testPlanDiv.text(Resources.ExportHtmlTestPlanHeading).append($("<div class='test-plan-parent' />")).append($("<div class='test-plan-child' />"));

        $testSuiteDiv = $("<div class='test-suite' />");
        $testSuiteDiv.text(Resources.ExportHtmlTestSuiteHeading).append($("<br/>")).append($("<div class='test-suite-radiobutton' />")).append($("<div class='test-suite-and-child-radiobutton' />")).append($("<div class='test-suite-properties' />"));
        $testSuiteDiv.append($("<div class='test-suite-testcases' />"));
        $testSuiteDiv.append($("<div class='test-suite-child' />"));

        container.append($testPlanDiv).append($testSuiteDiv);

        $properties = this._element.find(".test-suite-properties");
        $testSuiteOnlyradiobutton = this._element.find(".test-suite-radiobutton");
        $testSuiteAndChildradiobutton = this._element.find(".test-suite-and-child-radiobutton");

        this._createItem("checkbox", Resources.ExportHtmlSuitePropertiesLabel, "suiteProperties", $properties);
        this._createItem("radio", Resources.SuiteOnlyRadioButton, "suiteOnly", $testSuiteOnlyradiobutton);
        this._createItem("radio", Resources.SuiteAndChildRadioButton, "suiteAndChild", $testSuiteAndChildradiobutton);

    }

    private _createTestPlanItems(): void {
        //Creating Test Plan Child items and setting Parent.

        let checkBoxNames = [Resources.ExportHtmlTestPlanProperties,
            Resources.ExportHtmlTestPlanHierarchy,
            Resources.ExportHtmlTestPlanConfiguartions,
            Resources.ExportHtmlTestPlanRunSettings],
            $testPlanParent = this._element.find(".test-plan-parent"),
            $testPlanCheckbox: JQuery,
            $divTestPlan = this._element.find(".test-plan-child");

        this._planCheckbox = <CheckboxListHierarchy>Controls.Enhancement.enhance(CheckboxListHierarchy, $divTestPlan, <CheckboxListHierarchyOptions>{
            id: "testPlan",
            uncheckParent: true,
            parentLabel: Resources.ExportHtmlTestPlanLabel,
            parentId: "testPlan",
            parentContainer: $testPlanParent,
            childrens: checkBoxNames
        });

    }

    private _createTestSuiteItems(): void {
        //Creating Test Suite child Items and setting Parent for them.

        let suiteCheckBoxNames = [
            Resources.ExportHtmlTestSuiteParameterData,
            Resources.ExportHtmlTestSuiteAttachments,
            Resources.ExportHtmlTestSuiteAutomation,
            Resources.ExportHtmlLatestTestOutcome
        ];

        let $testCases = this._element.find(".test-suite-testcases"),
            $suiteTestCasesCheckbox: JQuery,
            $divSuitePlan = this._element.find(".test-suite-child");

        this._suiteCheckbox = <CheckboxListHierarchy>Controls.Enhancement.enhance(CheckboxListHierarchy, $divSuitePlan, <CheckboxListHierarchyOptions>{
            id: "testSuite",
            uncheckParent: false,
            parentLabel: Resources.ExportHtmlSuiteTestCasesLabel,
            parentId: "suiteTestCases",
            parentContainer: $testCases,
            childrens: suiteCheckBoxNames
        });
    }

    public updatePrintAndEmailButtons(enabled: boolean) {
        if (this.getElement()) {
            this.getElement().trigger(Dialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { enabled: enabled, button: HtmlDocumentGenerator.buttonIds.print });
            this.getElement().trigger(Dialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { enabled: enabled, button: HtmlDocumentGenerator.buttonIds.email });
        }
    }

	private setCheckboxProp(element: JQuery, isChecked: boolean){
		element.prop("checked", isChecked);
		element.attr("aria-checked", isChecked.toString());

		this._bindCheckBoxChangeEvent(element);
	}

	// Marks aria-checked attribute.
	private _bindCheckBoxChangeEvent($checkBoxItem: JQuery): void {
        $checkBoxItem.change(this, function (e) {
            let checked: boolean;

            checked = $(this).is(":checked") ? true : false;
            $(this).attr("aria-checked", checked.toString());

			// If the checkbox is a radio button set the sibling radio buttons aria-checked as false.
			if ($(this).is(":radio")){
			    let siblingRadioButton = $(this).parent().siblings().find(":radio");
				if (siblingRadioButton){
					siblingRadioButton.attr("aria-checked", (!checked).toString());
				}
			}
        });
    }

    private _getExportHtmlSettings() {
        let that = this,
            settingKey = this._getExportHtmlSettingsKey(),
            checkboxes = [],
            initialCount = 0;

        Diag.logTracePoint("HtmlDocumentGenerator._getExportHtmlSettings.Start");
        this._webSettingsService.beginReadSetting(settingKey, TFS_WebSettingsService.WebSettingsScope.User, (checkedCheckboxes) => {
            // control can be disposed before the callback in case cancel is clicked 
            // while waiting for the ajax call to complete
            // hence checking for _disposed
            if (!that._disposed) {
                if (checkedCheckboxes.value === null || checkedCheckboxes.value === "") {
                    checkboxes = [];
                }
                else {
                    checkboxes = checkedCheckboxes.value.split("&");
                }
                that._setLayout();
                that._createTestPlanItems();
                that._createTestSuiteItems();

                if (checkboxes.length === 0) {
                    $(".export-html input[type=checkbox]").each(function () {
					    that.setCheckboxProp($(this), true);
                    });
                    //when the user clicks the export-html button for first time.
                    that.setCheckboxProp($(".export-html input[type=radio]:first"), true);
					that.setCheckboxProp($(".export-html input[type=radio]:last"), false);
                    that.setCheckboxProp(that._suiteCheckbox._element.find("input"), false);
                    that.setCheckboxProp(that._suiteCheckbox._element.find("input:first"), true);
                    that.setCheckboxProp(that._suiteCheckbox._element.find("input:last"), true);
                }
                else {
                    $.each(checkboxes, function (index, value) {
                        that.setCheckboxProp(that._element.find("#" + value), true);
                    });
                }
                //counting the initial checked item in test-plan
                $.each(that._planCheckbox._element.find("input"), function (index, value) {
                    if ($(this).prop("checked")) {
                        initialCount++;
                    }
                });
                that._planCheckbox.setInitialCheckedItemCount(initialCount);
                that.updatePrintAndEmailButtons(true);
                Diag.logTracePoint("HtmlDocumentGenerator._getExportHtmlSettings.End");
            }
        });
    }
}

export class XmlCreationHelper {

    public addPropertyTag($rootDom: JQuery, name: string, value: string, url: string = ""): JQuery {

        let property = $.parseXML("<property></property>"),
            $property = $(property).find("property");
        $property.attr("name", name).attr("value", value.toString());
        if (url) {
            $property.attr("url", url);
        }
        $rootDom.append($property);
        return $property;
    }

    public appendTags($rootDom: JQuery, tagName: string): JQuery {
        let tag = $.parseXML(Utils_String.format(xmlParsingHelpers.nodeFormat, tagName)),
            $tag = $(tag).find(tagName);
        $rootDom.append($tag);
        return $tag;
    }

    public isCheckboxChecked(checkboxName: string) {
        let checkedCheckboxesCount = CheckedItems.length,
            i: number;
        for (i = 0; i < checkedCheckboxesCount; i++) {
            if (CheckedItems[i] === checkboxName) {
                return true;
            }
        }
        return false;
    }

    public removeHtmlTags(text: string) {
        let originalText: string = text;
        if (!(text === "")) {
            try {
                text = $(text).text();
                if (text === "") {
                    text = originalText;
                }
            }
            catch (e) {
                text = originalText;
            }
        }
        return text;
    }

}

export class SuiteXmlGeneration extends XmlCreationHelper {
    private _suites;
    private _testStepsxml: TestCaseXmlGeneration;
    private _currentPlanId: number;
    private _longRunningOperation: any;
    //TODO: remove these
    private _addSuite: boolean;
    private _addTestCase: boolean;

    constructor(options?: any) {
        /// <param name="options" type="Object">the options for this control</param>
        super();
        this._testStepsxml = new TestCaseXmlGeneration({ columnOptions: options.columnOptions, testPointColumnOptions: options.testPointColumnOptions, plan: options.plan });
        this._currentPlanId = options.plan.plan.id;
        this._addSuite = false;
        this._addTestCase = false;
    }

    public setSuitesData(suites: any) {
        this._suites = suites;
    }

    private _getAllTestCaseIdsToFetch(): number[] {
        let ids: number[] = [], i: number, l: number;
        for (i = 0, l = this._suites.length; i < l; i++) {
            let tcIdsInSuites = this._suites[i].testCaseIds;
            ids = ids.concat(tcIdsInSuites);
        }
        Diag.logVerbose("[HtmlDocumentGenerator._getAllTestCaseIdsToFetch] Fetched " + ids.length + " testcase ids");
        return Utils_Array.unique(ids);
    }

    private _getSuiteIdToAllTestCaseIdsMap(): IDictionaryNumberTo<number[]> {
        let suiteIdToTestCaseIdsMap: IDictionaryNumberTo<number[]> = {};
        let i: number, l: number;
        for (i = 0, l = this._suites.length; i < l; i++) {
            suiteIdToTestCaseIdsMap[this._suites[i].id] = this._suites[i].testCaseIds;
        }
        return suiteIdToTestCaseIdsMap;
    }

    public setLongRunningOperation(longRunningOperation: any): void {
        this._longRunningOperation = longRunningOperation;
        if (this._testStepsxml) {
            this._testStepsxml.setLongRunningOperation(longRunningOperation);
        }
    }

    private _beginPrefetchingTestCaseData(callback: IResultCallback, errorCallback?: IErrorCallback) {
        let idstoFetch: number[];
        let suiteIdToTestCaseIdsMap: IDictionaryNumberTo<number[]>;

        if (this._addTestCase) {
            idstoFetch = this._getAllTestCaseIdsToFetch();
            suiteIdToTestCaseIdsMap = this._getSuiteIdToAllTestCaseIdsMap();
        } else {
            idstoFetch = [];
            suiteIdToTestCaseIdsMap = {};
        }

        this._testStepsxml.beginPrefetchingTestCaseData(suiteIdToTestCaseIdsMap, idstoFetch, callback, errorCallback);
    }

    private _storeRequirementIdsLinkedToSuites(): void {
        let i: number, l: number, suite, ids: number[] = [];
        for (i = 0, l = this._suites.length; i < l; i++) {
            suite = this._suites[i];
            if (suite.type === TCMConstants.TestSuiteType.RequirementTestSuite) {
                ids.push(suite.requirementId);
            }
        }
        this._testStepsxml.storeRequirementIdsToGet(Utils_Array.unique(ids));
    }

    public beginGenerateSuiteXml($rootDom: JQuery, selectedSuite: TestsOM.ITestSuiteModel, callback?: IResultCallback, errorCallback?: IErrorCallback): void {

        let $testSuites: JQuery;

        this._isSuiteAndTestCasesChecked();
        if (this._addSuite) {
            $testSuites = this.appendTags($rootDom, "testSuites");
            this._storeRequirementIdsLinkedToSuites();
            this._beginPrefetchingTestCaseData(() => {
                if (!this._longRunningOperation.isCancelled()) {
                    this.generateSuitesXml(selectedSuite, $testSuites, callback);
                }
            }, errorCallback);

        }
        else {
            callback();
        }
    }

    public generateSuitesXml(selectedSuite: TestsOM.ITestSuiteModel, $testSuites: JQuery, callback: IResultCallback) {
        let i: number, l: number;
        for (i = 0, l = this._suites.length; i < l; i++) {

            //TODO: Remove this hard coding
            if (this._suites[i].title === "<root>") {
                this._suites[i].title = selectedSuite.title;
            }
            this._addSuiteXml($testSuites, this._suites[i]);
        }
        callback();
    }

    private _isSuiteAndTestCasesChecked() {
        if (this.isCheckboxChecked(checkboxesNames.TestCaseSteps) || this.isCheckboxChecked(checkboxesNames.TestCaseParameters) || this.isCheckboxChecked(checkboxesNames.TestCaseLinks) || this.isCheckboxChecked(checkboxesNames.TestCaseAutomation)) {
            this._addTestCase = true;
        }
        if (this.isCheckboxChecked(checkboxesNames.TestSuiteProperties) || this._addTestCase) {
            this._addSuite = true;
        }
    }

    private _addConfiguration($rootDom: JQuery, currentSuite) {
        let $configurations: JQuery,
            $config: JQuery,
            configsCount: number = currentSuite.configurations.length,
            i: number;

        $configurations = this.appendTags($rootDom, "configurations");
        for (i = 0; i < configsCount; i++) {
            $config = this.appendTags($configurations, "configuration");
            $config.attr("value", currentSuite.configurations[i].name);
        }
    }

    private _addSuiteXml($rootDom: JQuery, suite: any): void {
        /// <summary> Add the Suite propereties to rootxml </summary>
        let $testSuiteXml: JQuery,
            $testSuiteProperties: JQuery,
            suitesCount: number = this._suites.length,
            i: number,
            workitems: WITOM.WorkItem[],
            requirementTitle: string,
            $propertiesTag: JQuery,
            $requirementTag: JQuery,
            url: string;

        $testSuiteXml = this.appendTags($rootDom, "testSuite");
        $testSuiteXml.attr("title", suite.title).attr("id", suite.id).attr("url", TMUtils.UrlHelper.getSuiteUrl(this._currentPlanId, suite.id, true));

        if (this.isCheckboxChecked(checkboxesNames.TestSuiteProperties)) {
            $testSuiteProperties = this.appendTags($testSuiteXml, "suiteProperties");
            $propertiesTag = this.appendTags($testSuiteProperties, "properties");
            this.addPropertyTag($propertiesTag, Resources.ExportHtmlSuiteStateHeading, suite.status);
            this.addPropertyTag($propertiesTag, Resources.ExportHtmlSuiteTypeHeading, this._testSuiteType(suite.type));
            if (suite.type === TCMConstants.TestSuiteType.RequirementTestSuite) {
                url = TMUtils.UrlHelper.getWorkItemUrl(suite.requirementId);
                $requirementTag = this.appendTags($testSuiteProperties, "requirement");
                requirementTitle = this._testStepsxml.getLinkedWitTitle(suite.requirementId);
                $requirementTag.attr("id", suite.requirementId.toString())
                    .attr("title", requirementTitle)
                    .attr("url", url);
            }
            this._addConfiguration($testSuiteProperties, suite);
        }
        if (this.isCheckboxChecked(checkboxesNames.TestCaseSteps)) {
            this._testStepsxml.generateTestCaseXml($testSuiteXml, suite.id, suite.testCaseIds);
        }
    }

    private _testSuiteType(suiteTypeId: number): string {
        let suiteType: string;
        switch (suiteTypeId) {
            case TCMConstants.TestSuiteType.DynamicTestSuite:
                suiteType = Resources.ExportHtmlSuiteTypeQuery;
                break;
            case TCMConstants.TestSuiteType.StaticTestSuite:
                suiteType = Resources.ExportHtmlSuiteTypeStatic;
                break;
            case TCMConstants.TestSuiteType.RequirementTestSuite:
                suiteType = Resources.ExportHtmlSuiteTypeRequirement;
                break;
        }
        return suiteType;
    }
}

export class TestCaseIdToTestPointsMap {
    public testCaseId: number;
    public testPoints: TCMContracts.TestPoint[];

    _isTestCaseIdEqual(exceptedTestCaseId: number): boolean {
        if (exceptedTestCaseId === this.testCaseId) {
            return true;
        }
        return false;
    }
}

export class PointPropertyValue {
    public value: string;
    public url: string;
}

export class TestCaseXmlGeneration extends XmlCreationHelper {
    private _testCaseFields: any;
    private _testPointFields: any;
    private _testPointManager: any;
    private _testPointsMap: IDictionaryNumberTo<TCMConstants.TestPointState[]> = {};
    private _testPointsForAllTestCasesOfSuite: IDictionaryNumberTo<TestCaseIdToTestPointsMap[]> = {};
    private _testCaseMap: { [index: number]: TestsOM.TestCase; } = {};
    private _sharedStepCache: { [index: number]: TestsOM.SharedStepWorkItem; } = {};
    private _linkedWorkItemsInfoCache: { [index: number]: any; } = {};
    private _requirementIdsToGet: number[];
    private _longRunningOperation: any;
    private _testPlanManager: TestsOM.TestPlanManager;
    private _planId: number;

    constructor(options?: any) {
        /// <param name="options" type="Object">the options for this control</param>
        super();
        this._planId = options.plan.plan.id;
        this._testCaseFields = options.columnOptions;
        this._testPointFields = options.testPointColumnOptions;
        this._testPlanManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.TestPlanManager>(TestsOM.TestPlanManager);
        this._testPointManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.TestPointManager>(TestsOM.TestPointManager);
    }

    private _beginGetPointsWithLatestTestResults(suiteIdToTestCaseIdsMap: IDictionaryNumberTo<number[]>, errorCallback?: IErrorCallback): IPromise<any> {
        let defered = q.defer();

        if (!this.isCheckboxChecked(checkboxesNames.LatestTestOutcome)) {
            defered.resolve([]);
            return;
        }

        Diag.logTracePoint("HtmlDocumentGenerator._beginGetPointsWithLatestTestResults.Start");
        let numberofSuitesToBeFetched: number = this._getNumberOfSuites(suiteIdToTestCaseIdsMap);

        for (let suiteId in suiteIdToTestCaseIdsMap) {
            if (suiteIdToTestCaseIdsMap.hasOwnProperty(suiteId)) {

                Diag.logTracePoint("HtmlDocumentGenerator.TestPlanManager.getTestResultsForEachTestPointForTestCase.Start");

                this._testPointManager.getTestPointsInSuiteWithResults(this._planId, suiteId, (testPoints: TCMContracts.TestPoint[], suiteId: string) => {
                    Diag.logTracePoint("HtmlDocumentGenerator.TestPlanManager.getTestResultsForEachTestPointForTestCase.End");

                    let testPointsWithLastResults = this._getPointsContainingLastResultDetails(testPoints);
                    this._insertPointsIntoTestPointsMap(suiteId, testPointsWithLastResults, suiteIdToTestCaseIdsMap);

                    numberofSuitesToBeFetched -= 1;
                    if (numberofSuitesToBeFetched === 0) {
                        Diag.logTracePoint("HtmlDocumentGenerator._beginGetPointsWithLatestTestResults.End");
                        defered.resolve([]);
                    }
                }, (error) => { defered.reject(error); });
            }
        }
        return defered.promise;
    }

    private _insertPointsIntoTestPointsMap(suiteId: string,
        testPointsWithLastResults: TCMContracts.TestPoint[],
        suiteIdToTestCaseIdsMap: IDictionaryNumberTo<number[]>) {

        let testCasesInTheSuite = suiteIdToTestCaseIdsMap[suiteId];
        let totalTestCasesInSuite = testCasesInTheSuite.length;
        if (testPointsWithLastResults) {
            for (let i = 0; i < totalTestCasesInSuite; i++) {
                let testCaseId: number = testCasesInTheSuite[i];
                for (let j = 0; j < testPointsWithLastResults.length; j++) {

                    if (Number(testPointsWithLastResults[j].testCase.id) === testCaseId) {
                        this._addTestPointsToTheCorrespondingTestCaseAndSuite([testPointsWithLastResults[j]], Number(suiteId), testCaseId);
                    }

                }
            }
        }
    }

    private _getPointsContainingLastResultDetails(testPointsWithResults: TCMContracts.TestPoint[]): TCMContracts.TestPoint[] {
        let testPointsWithLastResults;
        if (testPointsWithResults) {
            testPointsWithLastResults = testPointsWithResults.filter(point => {
                if (point.lastResultDetails) {
                    return true;
                }
                return false;
            });
        }
        return testPointsWithLastResults;
    }

    private _getNumberOfSuites(suiteIdToTestCaseIdsMap: IDictionaryNumberTo<Number[]>): number {
        let count = 0;
        for (let map in suiteIdToTestCaseIdsMap) {
            if (suiteIdToTestCaseIdsMap.hasOwnProperty(map)) {
                count = count + 1;
            }
        }
        return count;
    }

    private _beginParseAndCacheTestCases(workItems: WITOM.WorkItem[], callback?: (testCases: TestsOM.TestCase[]) => void) {
        let testCases: TestsOM.TestCase[] = [],
            workItemsCount: number = workItems.length,
            testCasesCached: number = 0;

        Diag.logVerbose("[HtmlDocumentGenerator._beginParseAndCacheTestCases] Begin parsing and caching for " + workItemsCount + " testcases.");
        Diag.logTracePoint("HtmlDocumentGenerator._beginParseAndCacheTestCases.Start");

        for (let i = 0; i < workItemsCount; i++) {
            TMUtils.TestCaseUtils.beginParseTestCaseData(workItems[i], 0, (testCase) => {
                testCases.push(testCase);
                this._testCaseMap[testCase.getId()] = testCase;
                testCasesCached++;
                if (testCasesCached === workItemsCount) {
                    Diag.logTracePoint("HtmlDocumentGenerator._beginParseAndCacheTestCases.End");
                    if (callback) {
                        callback(testCases);
                    }
                }
            });
        }
    }

    public setTestCasesData(testcase: TestsOM.TestCase[]) {
        let i: number,
            l: number;
        for (i = 0, l = testcase.length; i < l; i++) {
            this._testCaseMap[testcase[i].getId()] = testcase[i];
        }
    }

    public _addTestPointsToTheCorrespondingTestCaseAndSuite(testPoints: TCMContracts.TestPoint[], suiteId: number, caseId: number) {
        if (! this._testPointsForAllTestCasesOfSuite[suiteId]) {
            this._testPointsForAllTestCasesOfSuite[suiteId] = [];
        } else {
            let maps = this._testPointsForAllTestCasesOfSuite[suiteId];
            let pointsWithSameTestCaseId = maps.filter((map) => map._isTestCaseIdEqual(caseId));
            if (pointsWithSameTestCaseId && pointsWithSameTestCaseId.length > 0) {
                pointsWithSameTestCaseId[0].testPoints = pointsWithSameTestCaseId[0].testPoints.concat(testPoints);
                return;
            }
        }

        let testPointMap = new TestCaseIdToTestPointsMap();
        testPointMap.testCaseId = caseId;
        testPointMap.testPoints = testPoints;
        this._testPointsForAllTestCasesOfSuite[suiteId].push(testPointMap);
    }

    public setLongRunningOperation(longRunningOperation: any): void {
        this._longRunningOperation = longRunningOperation;
    }

    private _getSharedStepIdsToGet(testCases: TestsOM.TestCase[]): number[] {
        let testCase: TestsOM.TestCase,
            i: number,
            l: number,
            j: number,
            sharedStepId: number,
            ids: number[] = [],
            testAction: TestsOM.TestAction;

        for (i = 0, l = testCases.length; i < l; i++) {
            testCase = testCases[i];
            if (testCase.getTestSteps()) {
                for (j = 0; j < testCase.getTestSteps().length; j++) {
                    testAction = testCase.getTestSteps()[j];
                    if (testAction instanceof TestsOM.SharedSteps) {
                        sharedStepId = (<TestsOM.SharedSteps>testAction).ref;
                        ids.push(sharedStepId);
                    }
                }
            }
        }
        Diag.logVerbose("[HtmlDocumentGenerator._getSharedStepIdsToGet] Got " + ids.length + " shared step ids which will be fetched");
        return Utils_Array.unique(ids);
    }

    private _cacheSharedStepWits(wits: TestsOM.SharedStepWorkItem[]): void {
        let i: number, l: number;
        for (i = 0, l = wits.length; i < l; i++) {
            this._sharedStepCache[wits[i].getId()] = wits[i];
        }
    }

    public storeRequirementIdsToGet(ids: number[]): void {
        //this is done for perf reasons. So that we can get linked requirements and test case links info in one go
        this._requirementIdsToGet = ids;
    }

    public getLinkedWitTitle(id: number): string {
        return this._linkedWorkItemsInfoCache[id].title;
    }

    private _getAllLinkedWorkItemIds(testCases: TestsOM.TestCase[]): number[] {
        let testCase: TestsOM.TestCase,
            linkedWitIds: number[] = [],
            allLinks,
            linksCount: number,
            i: number,
            l: number,
            j: number,
            link,
            wit: WITOM.WorkItem;
        if (this.isCheckboxChecked(checkboxesNames.TestCaseLinks) && testCases) {
            Diag.logVerbose("[HtmlDocumentGenerator._getAllLinkedWorkItemIds] Getting all the linked work item ids");
            for (i = 0, l = testCases.length; i < l; i++) {
                allLinks = testCases[i].getWorkItemWrapper().getLinks();
                for (j = 0, linksCount = allLinks.length; j < linksCount; j++) {
                    link = allLinks[j];
                    if (link instanceof WITOM.WorkItemLink) {
                        linkedWitIds.push(link.linkData.ID);
                    }
                }
            }
        }
        return Utils_Array.unique(linkedWitIds.concat(this._requirementIdsToGet));
    }

    private _cacheLinkedWorkItemsInfo(payload: any): void {
        let i: number,
            l: number,
            row,
            id: number;
        for (i = 0, l = payload.rows.length; i < l; i++) {
            id = parseInt(payload.rows[i][0], 10);
            //ToDo: Add type here
            this._linkedWorkItemsInfoCache[id] = { id: payload.rows[i][0], title: payload.rows[i][1], type: payload.rows[i][2] };
        }
    }

    private _checkAndUpdateLongRunningOperation(message: string): boolean {
        if (!this._longRunningOperation.isCancelled()) {
            this._longRunningOperation.updateWaitMessage(message);
            return true;
        }
        return false;
    }

    private _getOptionsForPagingWorkItems(): any {
        let cancelable = new Utils_Core.Cancelable(this),
            options = {
                pageOperationCallback: () => {
                    if (this._longRunningOperation.isCancelled()) {
                        cancelable.cancel();
                    }
                },
                cancelable: cancelable,
                pageSize: 100
            };
        return options;
    }

    public beginPrefetchingTestCaseData(suiteIdToTestCaseIdsMap: IDictionaryNumberTo<number[]>, ids: number[], callback: IResultCallback, errorCallback?: IErrorCallback): void {
        let witStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore),
            testCases: TestsOM.TestCase[],
            sharedStepIds: number[];

        //ToDO:Move fields to class definition
        if (ids && ids.length > 0) {
            if (this._checkAndUpdateLongRunningOperation(Resources.TestCaseDataProgress)) {
                let resultsPromise = this._beginGetPointsWithLatestTestResults(suiteIdToTestCaseIdsMap, errorCallback);
                WorkItemManager.get(witStore).beginGetWorkItems(ids, (workItems: WITOM.WorkItem[]) => {

                    this._beginParseAndCacheTestCases(workItems, (testCases: TestsOM.TestCase[]) => {
                        Diag.logVerbose("[HtmlDocumentGenerator.beginPrefetchingTestCaseData] Parsed and cached all testcases. Now getting the shared steps");
                        sharedStepIds = this._getSharedStepIdsToGet(testCases);

                        if (!this._longRunningOperation.isCancelled()) {
                            TMUtils.TestCaseUtils.beginGetSharedSteps(sharedStepIds, (wits: TestsOM.SharedStepWorkItem[]) => {
                                Diag.logVerbose("[HtmlDocumentGenerator.beginPrefetchingTestCaseData] Got the shared step workitems");
                                this._cacheSharedStepWits(wits);
                                this._beginGetLinkedWorkItems(testCases, resultsPromise, callback, errorCallback);
                            }, errorCallback, this._getOptionsForPagingWorkItems());
                        }
                    });
                }, errorCallback, this._getOptionsForPagingWorkItems());
            }
        }
        else {
            this._beginGetLinkedWorkItems(testCases, null, callback, errorCallback);
        }
    }

    private _beginGetLinkedWorkItems(testCases: TestsOM.TestCase[], resultsPromise: IPromise<any>, callback: IResultCallback, errorCallback?: IErrorCallback) {
        if (this._checkAndUpdateLongRunningOperation(Resources.LinkedWorkItemsDataProgress)) {
            let linkedWitIds = this._getAllLinkedWorkItemIds(testCases),
                fieldsForLinkedWits = [WITConstants.CoreFieldRefNames.Id, WITConstants.CoreFieldRefNames.Title, WITConstants.CoreFieldRefNames.WorkItemType],
                witStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
            if (linkedWitIds.length) {
                //ToDo:This and the above call can happen in parallel
                TMUtils.TestCaseUtils.beginPageWorkItems(linkedWitIds, fieldsForLinkedWits, (payload) => {
                    this._cacheLinkedWorkItemsInfo(payload);
                    this._invokeCallBack(resultsPromise, callback, errorCallback);
                }, errorCallback, this._getOptionsForPagingWorkItems());
            }
            else {
                this._invokeCallBack(resultsPromise, callback, errorCallback);
            }
        }
    }

    private _invokeCallBack(resultsPromise: IPromise<any>, callback: IResultCallback, errorCallback?: IErrorCallback) {
        if (resultsPromise) {
            resultsPromise.then(() => {
                callback();
            }, (error) => { errorCallback(error); });
        } else {
            callback();
        }
    }

    public generateTestCaseXml($rootDom: JQuery, suiteId: number, testCaseIds: number[]): void {
        this._pushTestCasesData($rootDom, suiteId, testCaseIds);
    }

    private _addTestCaseProperties($rootDom: JQuery, workItem: WITOM.WorkItem): void {
        let $propTag = this.appendTags($rootDom, "properties"),
            j: number,
            testcaseFields = this._testCaseFields,
            fieldsCount = testcaseFields.length;

        Diag.logVerbose("[HtmlDocumentGenerator._addTestCaseProperties] Get the testcase fields");

        for (j = 0; j < fieldsCount; j++) {
            if (workItem.getFieldValue(testcaseFields[j].fieldId)) {
                if (testcaseFields[j].name !== WITConstants.CoreFieldRefNames.Id && testcaseFields[j].name !== WITConstants.CoreFieldRefNames.Title) {
                    this.addPropertyTag($propTag, testcaseFields[j].text, workItem.getFriendlyFieldValue(testcaseFields[j].fieldId));
                }
            }
        }
    }

    private _addSharedStepsData($testStepsDom: JQuery, sharedStep: TestsOM.SharedSteps, index: number): void {
        let $testStep = this.appendTags($testStepsDom, "testStep"), i: number, l: number, sharedStepIndex = 1, testAction: TestsOM.TestAction,
            $action = this.appendTags($testStep, "testStepAction"),
            $expected = this.appendTags($testStep, "testStepExpected");

        $testStep.attr("index", index);
        $action.append($(TestsOM.HtmlUtils.wrapInDiv(HtmlNormalizer.normalize(sharedStep.getTitle()))));
        Diag.logVerbose("[HtmlDocumentGenerator._addSharedStepsData] Get the steps from the sharedSteps");

        for (i = 0, l = sharedStep.getTestSteps().length; i < l; i++) {
            testAction = sharedStep.getTestSteps()[i];
            this._addTestStepData($testStepsDom, <TestsOM.TestStep>testAction, i + 1, index);
        }
    }

    private _addTestStepData($stepsTag: JQuery, testStep: TestsOM.TestStep, index: number, sharedStepIndex?: number) {
        let $testStep = this.appendTags($stepsTag, "testStep"),
            indexString = sharedStepIndex ? (sharedStepIndex + "." + index.toString()) : index.toString(),
            $action = this.appendTags($stepsTag, "testStepAction"),
            $expected = this.appendTags($stepsTag, "testStepExpected");

        Diag.logVerbose("[HtmlDocumentGenerator._addTestStepData] Adding test step action, expected and attachments");

        $action.append($(TestsOM.HtmlUtils.wrapInDiv(HtmlNormalizer.normalize(testStep.action))));
        $expected.append($(TestsOM.HtmlUtils.wrapInDiv(HtmlNormalizer.normalize(testStep.expectedResult))));
        $testStep.attr("index", indexString)
            .append($action)
            .append($expected);
        this._addTestStepAttachments($testStep, testStep);
    }

    private _addTestSteps($testCaseTag: JQuery, testCase: TestsOM.TestCase): void {

        let i: number,
            steps = testCase.getTestSteps(),
            l: number,
            $testStepsTag: JQuery,
            $testStep: JQuery,
            index = 0,
            sharedSteps: TestsOM.SharedSteps,
            testAction: TestsOM.TestAction;

        testCase.processTestStepAttachments();

        for (i = 0, l = testCase.getTestSteps().length; i < l; i++) {
            if (i === 0) {
                $testStepsTag = this.appendTags($testCaseTag, "testSteps");
            }

            testAction = testCase.getTestSteps()[i];
            if (testAction instanceof TestsOM.SharedSteps) {
                sharedSteps = <TestsOM.SharedSteps>testAction;
                this._prepareSharedStepDataInTestCase(testCase, sharedSteps);
                this._addSharedStepsData($testStepsTag, sharedSteps, ++index);
            }
            else {
                this._addTestStepData($testStepsTag, <TestsOM.TestStep>testAction, ++index);
            }
        }
    }

    private _prepareSharedStepDataInTestCase(testCase: TestsOM.TestCase, sharedSteps: TestsOM.SharedSteps) {
        let sharedStepId = sharedSteps.ref,
            sharedStepWit = this._sharedStepCache[sharedStepId];
        if (sharedStepWit) {
            sharedSteps.setSharedStepWorkItem(sharedStepWit);
            TMUtils.SharedStepUtils.mergeSharedStepParamDataWithTestCase(testCase, sharedStepWit);
        }
    }

    private _addTestStepAttachments($testStep: JQuery, testStep: TestsOM.TestStep) {
        let $attachment = this.appendTags($testStep, "stepAttachments"),
            $attachmentsContainer = $("<div/>"),
            attachmentList = this._createAttachmentList(testStep.getAttachmentsMetadataList());
        $attachment.append(attachmentList);
    }

    private _createAttachmentList(attachmentsMetadata: TestsOM.TestStepAttachmentMetadata[]): JQuery {
        let i: number,
            l: number,
            attachmentName: string,
            attachmentSize: number,
            attachmentSizeString: string,
            attachmentUri: string,
            $linksDiv = $("<div class='test-step-attachment-links'></div>");

        if (attachmentsMetadata) {
            for (i = 0, l = attachmentsMetadata.length; i < l; i++) {
                attachmentName = attachmentsMetadata[i].getOriginalName();
                attachmentSize = attachmentsMetadata[i].getLength();
                attachmentSizeString = Utils_String.format(Resources.TestStepAttachmentSizeFormat, Math.ceil(attachmentSize / 1024));
                attachmentUri = TFS_Host_TfsContext.TfsContext.getDefault().getHostUrl() + attachmentsMetadata[i].getUri();

                this._addAttachmentLink(attachmentName, attachmentSizeString, attachmentUri, $linksDiv);
            }

        }
        return $linksDiv;
    }

    private _addAttachmentLink(attachmentName: string, attachmentSizeString: string, attachmentUri: string, $linksDivContainer: JQuery) {
        let $attachmentDiv = $("<div class='test-step-attachment'></div>"),
            $temp = $("<a target='_blank' rel='nofollow noopener noreferrer' class='test-step-attachment-name'></a>").text(attachmentName).attr("href", attachmentUri);

        $attachmentDiv.append($temp);
        $temp = $("<span class='test-step-attachment-size'></span>").text(" " + attachmentSizeString);
        $attachmentDiv.append($temp);
        $linksDivContainer.append($attachmentDiv);
    }

    private _addParameters($testCaseTag: JQuery, testCase: TestsOM.TestCase): void {
        let i: number,
            j: number,
            $parametersDataTag: JQuery,
            $parametersTag: JQuery,
            $parameterFieldName: JQuery,
            $parameterDataFieldName: JQuery,
            $sharedParameterDataSetLink: JQuery,
            $sharedParameterMapping: JQuery,
            parameters = testCase.getParameters(),
            parametersCount = parameters.length,
            parametersData = testCase.getData(),
            parametersDataCount = parametersData.length,
            sharedParamDataSetId: number,
            sharedParamUrl: string,
            sharedParamMapping: string,
            paramDataInfo: TestsOM.TestCaseParameterDataInfo,
            sharedParamDefn: TestsOM.SharedParameterDefinition,
            dataValue: string;

        if (parametersCount > 0 || testCase.isUsingSharedParameters()) {
            $parametersTag = this.appendTags($testCaseTag, "parameters");
        }

        if (testCase.isUsingSharedParameters()) {
            Diag.logVerbose("[HtmlDocumentGenerator._addParameters] Adding the shared param dataset refrenced in the testcase");
            sharedParamDataSetId = testCase.getSharedParameterDataSetIdBeingUsed();
            sharedParamUrl = TMUtils.UrlHelper.getSharedParametersUrl(sharedParamDataSetId, true);
            $sharedParameterDataSetLink = this.appendTags($parametersTag, "sharedParameterDataSet");
            $sharedParameterDataSetLink.attr("id", sharedParamDataSetId).attr("title", HtmlNormalizer.normalize(testCase.getSharedParameterDataSetTitle())).attr("url", sharedParamUrl);
        }

        if (parametersCount > 0) {
            if (testCase.isUsingSharedParameters()) {
                Diag.logVerbose("[HtmlDocumentGenerator._addParameters] Adding the shared param dataset mappings in the testcase");
                paramDataInfo = testCase.getParametersDataInfo();
                for (i = 0; i < parametersCount; i++) {
                    sharedParamDefn = <TestsOM.SharedParameterDefinition>paramDataInfo.getParamDefinition(parameters[i]);
                    if (sharedParamDefn) {
                        sharedParamMapping = sharedParamDefn.sharedParameterName;
                    }
                    else {
                        sharedParamMapping = "";
                    }
                    $sharedParameterMapping = this.appendTags($parametersTag, "sharedParameterMapping");
                    $sharedParameterMapping.attr("name", HtmlNormalizer.normalize(sharedParamMapping));
                }

            }
            Diag.logVerbose("[HtmlDocumentGenerator._addParameters] Adding the parameter names");
            for (i = 0; i < parametersCount; i++) {
                $parameterFieldName = this.appendTags($parametersTag, "parameterFieldName");
                $parameterFieldName.attr("name", HtmlNormalizer.normalize(parameters[i]));
            }

            Diag.logVerbose("[HtmlDocumentGenerator._addParameters] Adding the parameter data");
            for (i = 0; i < parametersDataCount; i++) {
                $parametersDataTag = this.appendTags($parametersTag, "parametersData");
                for (j = 0; j < parametersCount; j++) {
                    $parameterDataFieldName = this.appendTags($parametersDataTag, "parameterFieldData");
                    dataValue = parametersData[i][parameters[j]];
                    if (!dataValue) {
                        dataValue = "";
                    }
                    $parameterDataFieldName.attr("name", dataValue);
                }
            }
        }
    }

    private _addLinksData($rootDom: JQuery, workItem: WITOM.WorkItem): void {
        let store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore),
            allLinks = workItem.getLinks(),
            i: number,
            link: any,
            $links: JQuery = null,
            $link: JQuery,
            linksCount = allLinks.length,
            linkedWorkItemId: number,
            linkType: string,
            linkedWorkItemInfo: any,
            url: string;

        if (linksCount > 0) {
            for (i = 0; i < linksCount; i++) {
                link = allLinks[i];
                if (link instanceof WITOM.WorkItemLink) {

                    if (!$links) {
                        $links = this.appendTags($rootDom, "links");
                    }
                    linkedWorkItemId = parseInt(String(link.linkData.ID), 10);
                    linkType = store.findLinkTypeEnd(link.linkData.LinkType).name;
                    linkedWorkItemInfo = this._linkedWorkItemsInfoCache[linkedWorkItemId];
                    if (linkedWorkItemInfo) {
                        url = TMUtils.UrlHelper.getWorkItemUrl(linkedWorkItemId);
                        $link = this.appendTags($links, "link");
                        $link.attr("id", linkedWorkItemInfo.id)
                            .attr("workItemType", linkedWorkItemInfo.type)
                            .attr("title", linkedWorkItemInfo.title)
                            .attr("type", linkType)
                            .attr("url", url);
                    }
                }
            }
        }
    }

    //excludes test step atatchments
    private _getLinksAndAttachmentsForTestCase(testCase: TestsOM.TestCase): WITOM.Link[] {
        let i = 0,
            testSteps = testCase.getTestSteps(),
            length = testSteps.length,
            stepAttachments: WITOM.Link[] = [],
            attachmentFound = false,
            witLinks = testCase.getWorkItemWrapper().getLinks(),
            linksAndAttachmentsCount = witLinks.length,
            linksToProcess: WITOM.Link[] = [];

        for (i = 0; i < length; i++) {
            stepAttachments = stepAttachments.concat(testSteps[i].getAttachments());
        }

        for (i = 0; i < linksAndAttachmentsCount; i++) {
            if (stepAttachments.indexOf(witLinks[i]) === -1) {
                linksToProcess.push(witLinks[i]);
            }
        }

        return linksToProcess;
    }

    private _addLinksAndAttachmentsData($testCaseTag: JQuery, testCase: TestsOM.TestCase): void {
        let $linksAndAttachments: JQuery,
            i: number = 0,
            $testStep: JQuery,
            $links: JQuery = null,
            $link: JQuery,
            $attachments: JQuery = null,
            $attachment: JQuery,
            linksAndAttachments = this._getLinksAndAttachmentsForTestCase(testCase),
            createAttachmentTag: Boolean = true,
            linksAndAttachmentsCount = linksAndAttachments.length,
            attachment: WITOM.Attachment;

        if (linksAndAttachmentsCount > 0) {
            $linksAndAttachments = this.appendTags($testCaseTag, "linksAndAttachments");
            this._addLinksData($linksAndAttachments, testCase.getWorkItemWrapper().getWorkItem());
            for (i = 0; i < linksAndAttachmentsCount; i++) {
                if (linksAndAttachments[i].baseLinkType === "Attachment") {
                    if (createAttachmentTag) {
                        $attachments = this.appendTags($linksAndAttachments, "attachments");
                        createAttachmentTag = false;
                    }
                    attachment = <WITOM.Attachment>linksAndAttachments[i];
                    $attachment = this.appendTags($attachments, "attachment");
                    $attachment.attr("name", HtmlNormalizer.normalize(linksAndAttachments[i].linkData.OriginalName))
                        .attr("size", Math.ceil(linksAndAttachments[i].linkData.Length / 1024).toString() + Resources.DisplayTextKilobyte)
                        .attr("url", TFS_Host_TfsContext.TfsContext.getDefault().getHostUrl() + attachment.getUri(true));
                    $attachment.attr("date", HtmlNormalizer.normalize(linksAndAttachments[i].getAddedDate().toDateString())).attr("comments", HtmlNormalizer.normalize(linksAndAttachments[i].getComment()));
                }
            }
        }
    }

    private _addAutomation($testCaseTag: JQuery, testName: string, testStorage: string, testType: string): void {

        let AutomationTestName: string = testName,
            AutomationTestStorage: string = testStorage,
            AutomationTesttype: string = testType,
            $automationTag: JQuery,
            $propertiesTag: JQuery;

        $automationTag = this.appendTags($testCaseTag, "automation");

        if (AutomationTestName || AutomationTestStorage || AutomationTesttype) {
            $propertiesTag = this.appendTags($automationTag, "properties");
            if (AutomationTestName) {
                this.addPropertyTag($propertiesTag, Resources.AutomatedTestName, HtmlNormalizer.normalize(AutomationTestName));
            }
            if (AutomationTestStorage) {
                this.addPropertyTag($propertiesTag, Resources.AutomatedTestStorage, HtmlNormalizer.normalize(AutomationTestStorage));
            }
            if (AutomationTesttype) {
                this.addPropertyTag($propertiesTag, Resources.AutomatedTestType, HtmlNormalizer.normalize(AutomationTesttype));
            }
        }
    }

    private _addLatestTestOutcome($testCaseTag: JQuery, _resultFieldColumnMap: IDictionaryStringTo<string>, testResultsData: TCMContracts.TestPoint[]): void {

        let i: number,
            $testResultsTag: JQuery;

        if (testResultsData) {
            for (i = 0; i < testResultsData.length; i++) {
                if (i === 0) {
                    $testResultsTag = this.appendTags($testCaseTag, "latestTestOutcomes");
                }
                let testResult = testResultsData[i];
                this._addTestResultData($testResultsTag, _resultFieldColumnMap, testResult, i.toString());
            }
        }
    }

    private _populateResultFieldValuesMap(testPoint: TCMContracts.TestPoint): IDictionaryStringTo<PointPropertyValue> {
        let _resultFieldColumnValueMap: IDictionaryStringTo<PointPropertyValue> = {};
        if (testPoint.configuration !== null) {
            _resultFieldColumnValueMap[TestsOM.LatestTestOutcomeColumnIds.Configuration] = this._initializePointPropertyValue(testPoint.configuration.name);
        }
        if (testPoint.lastResultDetails) {
            if (testPoint.lastResultDetails.runBy) {
                _resultFieldColumnValueMap[TestsOM.LatestTestOutcomeColumnIds.RunBy] = this._initializePointPropertyValue(testPoint.lastResultDetails.runBy.displayName);
            }
            let durationInSeconds = testPoint.lastResultDetails.duration / 10000000;
            let duration: string;
            if (!durationInSeconds) {
                duration = "0";
            } else {
                duration = durationInSeconds.toString();
            }
            _resultFieldColumnValueMap[TestsOM.LatestTestOutcomeColumnIds.Duration] = this._initializePointPropertyValue(duration);
            if (testPoint.lastResultDetails.dateCompleted) {
                let date = new Date(testPoint.lastResultDetails.dateCompleted.toString());
                let localizedDate: string = null;
                if (! isNaN(Date.parse(date.toString()))) {
                    localizedDate = Utils_Date.localeFormat(date, "D");
                }
                _resultFieldColumnValueMap[TestsOM.LatestTestOutcomeColumnIds.ResultDate] = this._initializePointPropertyValue(localizedDate);
            }
        }

        let outcomeUrl = "";
        if (testPoint.lastResult && testPoint.lastTestRun)
        {
            outcomeUrl = this._getRunsUrl(testPoint.lastTestRun.id, testPoint.lastResult.id);
        }
        let outcomeValue = ValueMap.TestOutcome.getFriendlyName(TCMConstants.TestOutcome[testPoint.outcome]);
        _resultFieldColumnValueMap[TestsOM.LatestTestOutcomeColumnIds.Outcome] = this._initializePointPropertyValue(outcomeValue, outcomeUrl);
        _resultFieldColumnValueMap[TestsOM.LatestTestOutcomeColumnIds.BuildNumber] = this._initializePointPropertyValue(testPoint.lastRunBuildNumber);
        if (testPoint.assignedTo) {
            _resultFieldColumnValueMap[TestsOM.LatestTestOutcomeColumnIds.Tester] = this._initializePointPropertyValue(testPoint.assignedTo.displayName);
        }
        return _resultFieldColumnValueMap;
    }

    private _initializePointPropertyValue(value: string, url = ""): PointPropertyValue {
        let property = new PointPropertyValue();
        property.value = value;
        property.url = url;
        return property;
    }

    private _getRunsUrl(runId: string, resultId: string): string {
        //get the public url  passing showPublicUrl as true
        return TMUtils.UrlHelper.getRunsUrl("resultSummary", [
            {
                parameter: "runId",
                value: runId
            },
            {
                parameter: "resultId",
                value: resultId
            }], true);
    }

    private _populateResultFieldsMap(): IDictionaryStringTo<string> {
        let _resultFieldColumnMap: IDictionaryStringTo<string> = {};
        _resultFieldColumnMap[TestsOM.LatestTestOutcomeColumnIds.Configuration] = Resources.TestPointGridColumnConfiguration;
        _resultFieldColumnMap[TestsOM.LatestTestOutcomeColumnIds.RunBy] = Resources.TestResultsPaneRunByColumnHeader;
        _resultFieldColumnMap[TestsOM.LatestTestOutcomeColumnIds.Duration] = Resources.TestResultsPaneDurationColumnHeaderTooltip;
        _resultFieldColumnMap[TestsOM.LatestTestOutcomeColumnIds.Outcome] = Resources.TestPointGridColumnOutcome;
        _resultFieldColumnMap[TestsOM.LatestTestOutcomeColumnIds.ResultDate] = Resources.QueryColumnNameDateCompleted;
        _resultFieldColumnMap[TestsOM.LatestTestOutcomeColumnIds.Tester] = Resources.TesterFilter;
        _resultFieldColumnMap[TestsOM.LatestTestOutcomeColumnIds.BuildNumber] = Resources.BuildNumber;
        return _resultFieldColumnMap;
    }

    private __getTestPointsFromTestPointsMap(testcasesResults: TestCaseIdToTestPointsMap[], testCaseId: number): TCMContracts.TestPoint[] {
        if (testcasesResults) {
            let testpointmaps = testcasesResults.filter((testpointmap) => testpointmap._isTestCaseIdEqual(testCaseId));
            if (testpointmaps) {
                if (testpointmaps[0]) {
                    return testpointmaps[0].testPoints;
                }
            }
        }
        return null;
    }

    private _addTestResultData($testResultsTag: JQuery, _resultFieldColumnMap: any, testResult: TCMContracts.TestPoint, indexString: string): void {
        let $testResultDataTag: JQuery = this.appendTags($testResultsTag, "testResult"),
            $testResultPropertiesTag: JQuery = this.appendTags($testResultDataTag, "properties"),
            testResultFields = this._testPointFields,
            fieldsCount: number = testResultFields.length,
            _resultFieldColumnValueMap: IDictionaryStringTo<PointPropertyValue>,
            j: number;

        _resultFieldColumnValueMap = this._populateResultFieldValuesMap(testResult);
        for (j = 0; j < fieldsCount; j++) {
            if (_resultFieldColumnValueMap.hasOwnProperty(testResultFields[j]) && _resultFieldColumnMap.hasOwnProperty(testResultFields[j])) {
                let fieldColumnText: any = _resultFieldColumnMap[testResultFields[j]];
                let fieldValue: any = _resultFieldColumnValueMap[testResultFields[j]];
                if (!fieldValue) {
                    fieldValue = new PointPropertyValue();
                }
                if (!fieldValue.value) {
                    fieldValue.value = new String();
                }
                this.addPropertyTag($testResultPropertiesTag, fieldColumnText, HtmlNormalizer.normalize(fieldValue.value.toString()), fieldValue.url);
            }
        }
    }

    private _pushTestCasesData($rootDom: JQuery, suiteId: number, testCaseIds: number[]): void {

        let i: number,
            l: number,
            testCase: TestsOM.TestCase,
            $testCaseTag: JQuery,
            $summaryTag: JQuery,
            workItem: WITOM.WorkItem,
            url: string,
            summary: string,
            $testCasesXml: JQuery,
            automationInfo: { testType: string; testStorage: string; testName: string; };

        Diag.logVerbose("HtmlDocumentGenerator._pushTestCasesData");
        if (testCaseIds.length > 0) {
            $testCasesXml = this.appendTags($rootDom, "testCases");
            $testCasesXml.attr("count", testCaseIds.length);
        }
        for (i = 0, l = testCaseIds.length; i < l; i++) {
            if (!this._testCaseMap[testCaseIds[i]]) {
                //error we should ideally never be here
                continue;
            }
            url = TMUtils.UrlHelper.getWorkItemUrl(testCaseIds[i]);
            testCase = this._testCaseMap[testCaseIds[i]];
            workItem = testCase.getWorkItemWrapper().getWorkItem();

            $testCaseTag = this.appendTags($testCasesXml, "testCase");
            $testCasesXml.find($testCaseTag).attr("id", testCase.getId().toString()).attr("title", testCase.getTitle()).attr("url", url);
            //generating properites
            this._addTestCaseProperties($testCaseTag, workItem);
            //generating summary
            summary = workItem.getFieldValue(WITConstants.CoreFieldRefNames.Description);
            if (summary) {
                $summaryTag = this.appendTags($testCaseTag, "summary");
                $summaryTag.append($(TestsOM.HtmlUtils.wrapInDiv(HtmlNormalizer.normalize(summary))));
            }
            //generating teststeps               
            this._addTestSteps($testCaseTag, testCase);
            //genrating parameters
            if (this.isCheckboxChecked(checkboxesNames.TestCaseParameters)) {
                this._addParameters($testCaseTag, testCase);
            }
            //generating Links and attachments
            if (this.isCheckboxChecked(checkboxesNames.TestCaseLinks)) {
                this._addLinksAndAttachmentsData($testCaseTag, testCase);
            }
            //generating Automation
            if (this.isCheckboxChecked(checkboxesNames.TestCaseAutomation)) {
                automationInfo = this.getAutomationFieldValues(workItem);
                this._addAutomation($testCaseTag, automationInfo.testName, automationInfo.testType, automationInfo.testStorage);
            }
            //generating the table for latest test outcome : the latest testresult for each test point will be displayed in table
            if (this.isCheckboxChecked(checkboxesNames.LatestTestOutcome) && suiteId !== null) {
                automationInfo = this.getAutomationFieldValues(workItem);
                let testCasesResults: TestCaseIdToTestPointsMap[] = this._testPointsForAllTestCasesOfSuite[suiteId];
                let testResults: TCMContracts.TestPoint[] = this.__getTestPointsFromTestPointsMap(testCasesResults, testCase.getId());
                let _resultFieldColumnMap: any = this._populateResultFieldsMap();
                this._addLatestTestOutcome($testCaseTag, _resultFieldColumnMap, testResults);

                TelemetryService.publishEvent(TelemetryService.featureExportToHtml, TelemetryService.exportLatestOutcomeChecked, 1);
            }
        }
    }

    public getAutomationFieldValues(workItem: WITOM.WorkItem): { testType: string; testStorage: string; testName: string; } {
        return {
            testName: workItem.getFieldValue(TCMConstants.WorkItemFieldNames.TestName),
            testType: workItem.getFieldValue(TCMConstants.WorkItemFieldNames.TestType),
            testStorage: workItem.getFieldValue(TCMConstants.WorkItemFieldNames.Storage)
        };
    }
}

export class TestPlanXmlGeneration extends XmlCreationHelper {

    private _selectedPlan: any;
    private _planId: number;
    private _rootSuiteId: number;
    private _selectedSuiteId: number;
    private _testPlanManager: TestsOM.TestPlanManager;
    private _suiteHierarchy: any;
    private _suitesData: any;
    private _buildInfo: BuildContracts.Build;

    constructor(options?: any) {
        super();
        this._planId = options.plan.plan.id;
        this._rootSuiteId = options.plan.plan.rootSuiteId;
        this._suiteHierarchy = options.suiteHierarchy;
        this._testPlanManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.TestPlanManager>(TestsOM.TestPlanManager);
    }

    public beginGeneratePlanXml($rootDom: JQuery, callback: IResultCallback, errorCallback?: IErrorCallback) {
        if (this.isCheckboxChecked(checkboxesNames.TestPlan)) {
            Diag.logTracePoint("HtmlDocumentGenerator.beginGeneratePlanXml.GetPlan.Start");
            this._testPlanManager.getPlan(this._planId, (result) => {
                Diag.logTracePoint("HtmlDocumentGenerator.beginGeneratePlanXml.GetPlan.End");
                this._selectedPlan = result;
                if (! this._selectedPlan) {
                    return;
                }
                if (this.isCheckboxChecked(checkboxesNames.TestPlanSettings)) {
                    Diag.logTracePoint("HtmlDocumentGenerator.beginGeneratePlanXml.GetPlanBuildDetails.Start");
                    this._testPlanManager.beginGetPlanBuildDetails(this._selectedPlan, (build: BuildContracts.Build) => {
                        Diag.logTracePoint("HtmlDocumentGenerator.beginGeneratePlanXml.GetPlanBuildDetails.End");
                        this._buildInfo = build;
                        this.generatePlanXml(this._selectedPlan, $rootDom, callback, errorCallback);
                    },
                        errorCallback);
                }
                else {
                    this.generatePlanXml(this._selectedPlan, $rootDom, callback, errorCallback);
                }
            }, errorCallback);
        }
        else {
            callback();
        }
    }

    public generatePlanXml(plan: any, $rootDom: JQuery, callback: IResultCallback, errorCallback?: IErrorCallback) {
        let $testPlanTag = this.appendTags($rootDom, "testPlan");
        $testPlanTag.attr("id", this._selectedPlan.id.toString()).attr("title", this._selectedPlan.name).attr("url", TMUtils.UrlHelper.getPlanUrl(this._selectedPlan.id));
        this._addTestPlanData($testPlanTag, plan, callback, errorCallback);
    }

    public setSuitesData(suites: any) {
        this._suitesData = suites;
    }

    public setSelectedSuitedId(id: number) {
        this._selectedSuiteId = id;
    }

    public setSelectedPlan(plan: any) {
        this._selectedPlan = plan;
    }

    private _addSuiteHierarchy($rootDom: JQuery) {
        let $suiteHierarchyTag = this.appendTags($rootDom, "suiteHierarchy"),
            i: number,
            childrenCount = this._suiteHierarchy.children.length;

        for (i = 0; i < childrenCount; i++) {
            this._addSuite($suiteHierarchyTag, this._suiteHierarchy.children[i]);
        }
    }

    private _addSuite($parentDom: JQuery, currentSuite: any) {
        let $suiteTag = this.appendTags($parentDom, "suite"),
            childrenCount = currentSuite.children.length,
            i: number;

        let suiteTypeEnum = currentSuite.suite.type;
        if (!suiteTypeEnum) {
            let type = currentSuite.suite.suiteType;
            if (!isNaN(parseInt(type))) {
            suiteTypeEnum = parseInt(type);
            }
        }
        let suiteType = TMUtils.TestSuiteUtils.getSuiteTypeString(suiteTypeEnum);

        let suiteTitle = currentSuite.suite.title;
        if (!suiteTitle) {
            suiteTitle = currentSuite.suite.name;
        }
        $suiteTag.attr("id", currentSuite.suite.id)
            .attr("title", suiteTitle)
            .attr("url", TMUtils.UrlHelper.getSuiteUrl(this._planId, currentSuite.suite.id, true))
            .attr("type", suiteType);
        for (i = 0; i < childrenCount; i++) {
            this._addSuite($suiteTag, currentSuite.children[i]);
        }
    }

    private _addTestPlanProperties($rootDom: JQuery) {

        let $propertiesTag = this.appendTags($rootDom, "properties");
        if (this._selectedPlan.area) {
            this.addPropertyTag($propertiesTag, Resources.AreaPath, this._selectedPlan.area.name);
        }
        this.addPropertyTag($propertiesTag, Resources.Iteration, this._selectedPlan.iteration);
        if (this._selectedPlan.owner) {
            this.addPropertyTag($propertiesTag, Resources.Owner, this._selectedPlan.owner.displayName);
        }
        this.addPropertyTag($propertiesTag, Resources.ExportHtmlSuiteStateHeading, this._selectedPlan.state);
        
        if (this._selectedPlan.startDate && !isNaN(Date.parse(this._selectedPlan.startDate.toString()))) {
            this.addPropertyTag($propertiesTag, Resources.StartDate, Utils_Date.localeFormat(this._selectedPlan.startDate, "D", true));
        }
        if (this._selectedPlan.endDate && !isNaN(Date.parse(this._selectedPlan.endDate.toString()))) {
            this.addPropertyTag($propertiesTag, Resources.EndDate, Utils_Date.localeFormat(this._selectedPlan.endDate, "D", true));
        }
    }

    private _addTestPlanDescription($rootDom: JQuery): void {
        let $descriptionTag: JQuery, desc: string;
        if (this._selectedPlan.description) {
            desc = HtmlNormalizer.normalize(this._selectedPlan.description);
            desc = desc.replace(/\n/g, "<br />");
            $descriptionTag = this.appendTags($rootDom, "description");
            $descriptionTag.append($(TestsOM.HtmlUtils.wrapInDiv(desc)));
        }
    }

    private _getAdditionalConfigurationIds(defaultConfigs): number[] {
        let defaultConfigsMap = {},
            additionalConfigsMap = {},
            additionalConfigurationIds: number[] = [],
            i: number,
            j: number,
            id: number,
            suite;

        for (i = 0; i < defaultConfigs.length; i++) {
            defaultConfigsMap[<any>parseInt(defaultConfigs[i].id, 10)] = defaultConfigs[i];
        }
        for (i = 0; i < this._suitesData.length; i++) {
            suite = this._suitesData[i];
            for (j = 0; j < suite.configurations.length; j++) {
                id = suite.configurations[j].id;
                if (!defaultConfigsMap[id] && !additionalConfigsMap[id]) {
                    additionalConfigsMap[id] = suite.configurations[j];
                    additionalConfigurationIds[additionalConfigurationIds.length] = suite.configurations[j].id;
                }
            }
        }

        return additionalConfigurationIds;
    }

    private _addCongfigurations($rootDom: JQuery, callback: IResultCallback, errorCallback: IErrorCallback): void {

        let configMap = {},
            $configurations: JQuery,
            $planConfiguration: JQuery,
            $addtionalConfiguration: JQuery,
            $config: JQuery,
            i: number,
            allconfigIds: number[],
            additionalConfigurationIds: number[],
            rootSuiteConfigIds: number[];

        Diag.logVerbose("[HtmlDocumentGenerator._addCongfigurations] Start getting configurations.");                
        //get the configurations of plan by getting the configurations of root suite
        this._testPlanManager.getTestSuite(this._planId, this._rootSuiteId, (testSuite) => {

            additionalConfigurationIds = this._getAdditionalConfigurationIds(testSuite.defaultConfigurations);
            rootSuiteConfigIds = $.map(testSuite.defaultConfigurations, function (item, index) {
                return parseInt(item.id, 10);
            });
            allconfigIds = Utils_Array.unique(additionalConfigurationIds.concat(rootSuiteConfigIds));

            Diag.logTracePoint("HtmlDocumentGenerator._addCongfigurations.getTestConfigurationsDetail.Start");
            this._testPlanManager.getTestConfigurationsDetail(allconfigIds, this._planId, (configDetails: TestsOM.ITestConfigurationModel[]) => {
                Diag.logTracePoint("HtmlDocumentGenerator._addCongfigurations.getTestConfigurationsDetail.End");
                for (i = 0; i < configDetails.length; i++) {
                    configMap[configDetails[i].id] = configDetails[i];
                }

                $configurations = this.appendTags($rootDom, "configurations");
                $planConfiguration = this.appendTags($configurations, "planConfiguration");
                for (i = 0; i < testSuite.defaultConfigurations.length; i++) {
                    this._appendConfigurationsData($planConfiguration, configMap[testSuite.defaultConfigurations[i].id]);
                }

                if (additionalConfigurationIds.length > 0) {
                    $addtionalConfiguration = this.appendTags($configurations, "additionalConfiguration");
                    for (i = 0; i < additionalConfigurationIds.length; i++) {
                        this._appendConfigurationsData($addtionalConfiguration, configMap[additionalConfigurationIds[i]]);
                    }
                }
                callback();

            }, errorCallback);

        }, errorCallback);
    }

    private _appendConfigurationsData($dom: JQuery, config: TestsOM.ITestConfigurationModel): void {
        let $variable: JQuery,
            $config: JQuery,
            i: number,
            configVariable,
            l: number;

        Diag.logVerbose("[HtmlDocumentGenerator._appendConfigurationsData] Adding configurations data");
        $config = this.appendTags($dom, "configuration");
        $config.attr("value", config.name);
        $config.attr("id", config.id);
        for (i = 0, l = config.variables.length; i < l; i++) {
            configVariable = config.variables[i];
            $variable = this.appendTags($config, "variables");
            $variable.attr("name", configVariable.Name);
            $variable.attr("value", configVariable.Value);
        }

    }

    private _addManualRuns($rootDom: JQuery) {
        let $manualRunsTag = this.appendTags($rootDom, "manualRuns"),
            $propertiesTag = this.appendTags($manualRunsTag, "properties"),
            settingsName: string = Resources.DisplayTextNone,
            envName: string = Resources.DisplayTextNone;

        if (this._selectedPlan.manualTestSettings) {
            Diag.logVerbose("[HtmlDocumentGenerator._addManualRuns] Adding manual test settigs");
            settingsName = this._selectedPlan.manualTestSettings.testSettingsName;
        }
        if (this._selectedPlan.manualTestEnvironment) {
            Diag.logVerbose("[HtmlDocumentGenerator._addManualRuns] Adding manual test environment");
            envName = this._selectedPlan.manualTestEnvironment.environmentName;
        }
        this.addPropertyTag($propertiesTag, Resources.Settings, settingsName);
        this.addPropertyTag($propertiesTag, Resources.Environment, envName);
    }

    private _addAutomatedRuns($rootDom: JQuery) {
        let $AutomatedRunsTag = this.appendTags($rootDom, "automatedRuns"),
            $propertiesTag = this.appendTags($AutomatedRunsTag, "properties"),
            settingsName: string = Resources.DisplayTextNone,
            envName: string = Resources.DisplayTextNone;

        if (this._selectedPlan.automatedTestSettings) {
            Diag.logVerbose("[HtmlDocumentGenerator._addAutomatedRuns] Adding automated test settigs");
            settingsName = this._selectedPlan.automatedTestSettings.testSettingsName;
        }
        if (this._selectedPlan.automatedTestEnvironment) {
            Diag.logVerbose("[HtmlDocumentGenerator._addAutomatedRuns] Adding automated test environment");
            envName = this._selectedPlan.automatedTestEnvironment.environmentName;
        }

        this.addPropertyTag($propertiesTag, Resources.Settings, settingsName);
        this.addPropertyTag($propertiesTag, Resources.Environment, envName);
    }

    private _addBuilds($rootDom: JQuery) {
        let $buildsTag = this.appendTags($rootDom, "builds"),
            $propertiesTag = this.appendTags($buildsTag, "properties"),
            buildDef = Resources.DisplayTextNone,
            buildQuality = Resources.DisplayTextNone,
            buildNumber = Resources.DisplayTextNone;

        Diag.logVerbose("[HtmlDocumentGenerator._addBuilds] Adding builds data");
        if (this._buildInfo && this._buildInfo.definition) {
            Diag.logVerbose("[HtmlDocumentGenerator._addBuilds] Adding build definition");
            buildDef = this._buildInfo.definition.name;
        }
        if (this._buildInfo && this._buildInfo.quality) {
            Diag.logVerbose("[HtmlDocumentGenerator._addBuilds] Adding build quality");
            buildQuality = this._buildInfo.quality;
        }
        if (this._buildInfo && this._buildInfo.buildNumber) {
            Diag.logVerbose("[HtmlDocumentGenerator._addBuilds] Adding build number");
            buildNumber = this._buildInfo.buildNumber;
        }

        this.addPropertyTag($propertiesTag, Resources.Definition, buildDef);
        this.addPropertyTag($propertiesTag, Resources.Quality, buildQuality);
        this.addPropertyTag($propertiesTag, Resources.BuildInUse, buildNumber);
    }

    private _addTestPlanSettings($rootDom: JQuery) {
        let $testPlanSettingsTag = this.appendTags($rootDom, "testPlanSettings");
        this._addManualRuns($testPlanSettingsTag);
        this._addAutomatedRuns($testPlanSettingsTag);
        this._addBuilds($testPlanSettingsTag);
    }

    private _addTestPlanData($rootDom: JQuery, testPlan, callback: IResultCallback, errorCallback: IErrorCallback) {
        Diag.logVerbose("[HtmlDocumentGenerator._addTestPlanData] Start adding testplan data");

        if (this.isCheckboxChecked(checkboxesNames.TestPlanProperties)) {
            Diag.logVerbose("[HtmlDocumentGenerator._addTestPlanData] Adding testplan properties and description");
            this._addTestPlanProperties($rootDom);
            this._addTestPlanDescription($rootDom);
        }
        if (this.isCheckboxChecked(checkboxesNames.TestPlanHierarchy)) {
            Diag.logVerbose("[HtmlDocumentGenerator._addTestPlanData] Adding suite hierarchy");
            this._addSuiteHierarchy($rootDom);
        }

        if (this.isCheckboxChecked(checkboxesNames.TestPlanSettings)) {
            Diag.logVerbose("[HtmlDocumentGenerator._addTestPlanData] Adding test plan settings");
            this._addTestPlanSettings($rootDom);
        }

        if (this.isCheckboxChecked(checkboxesNames.TestPlanConfigurations)) {
            Diag.logVerbose("[HtmlDocumentGenerator._addTestPlanData] Adding configurations");
            this._addCongfigurations($rootDom, callback, errorCallback);
        }
        else {
            callback();
        }

    }
}

export class HtmlDocumentGenerator {
    private _planManager: TestsOM.TestPlanManager;
    private _testCaseField: any;
    private _testPlanId: number;
    private _testPlanName: string;
    private _suitexml: SuiteXmlGeneration;
    private _testPlanXml: TestPlanXmlGeneration;
    private _longRunningOperation: any;
    private _currentCount: number;
    private _totalCount: number;
    private _selectedSuite: TestsOM.ITestSuiteModel;
    private _plan: any;
    private _showError: IArgsFunctionR<any>;
    private static testPointFields = [TestsOM.LatestTestOutcomeColumnIds.Outcome, TestsOM.LatestTestOutcomeColumnIds.Tester, TestsOM.LatestTestOutcomeColumnIds.Configuration, TestsOM.LatestTestOutcomeColumnIds.RunBy, TestsOM.LatestTestOutcomeColumnIds.ResultDate, TestsOM.LatestTestOutcomeColumnIds.Duration, TestsOM.LatestTestOutcomeColumnIds.BuildNumber];
    public static buttonIds = { print: "print", email: "email", cancel: "cancel" };

    constructor(options?: any) {
        /// <param name="options" type="Object">the options for this control</param>
        Diag.logVerbose("[HtmlDocumentGenerator.constructor] Constructing the object for HtmlDocumentGenerator");
        this._testCaseField = options.columnOptions;
        this._plan = options.plan.plan;
        this._suitexml = new SuiteXmlGeneration({ columnOptions: this._testCaseField, testPointColumnOptions: HtmlDocumentGenerator.testPointFields, plan: options.plan });
        this._testPlanXml = new TestPlanXmlGeneration({ plan: options.plan, suiteHierarchy: options.suiteHierarchy });
        this._currentCount = 0;
        this._totalCount = 2;
    }

    public launchExportHtmlDialog(selectedSuite: TestsOM.ITestSuiteModel, isChildSuitesCountExceededForExportFeature: boolean): void {
        DAUtils.trackAction("LaunchExportHtmlOptions", "/SuiteManagement");
        Diag.logVerbose("[HtmlDocumentGenerator.launchExportHtmlDialog] Getting connection");
        this._planManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.TestPlanManager>(TestsOM.TestPlanManager);
        Diag.logVerbose("[HtmlDocumentGenerator.launchExportHtmlDialog] Show export html options for suite id: " + selectedSuite.id + ", title: " + selectedSuite.title);
        this._showExportHtmlOptions(selectedSuite, isChildSuitesCountExceededForExportFeature);
    }

    public setErrorDelegate(errorDelegate: IArgsFunctionR<any>) {
        this._showError = errorDelegate;
    }

    private _displayError(message: string): void {
        /// <summary>shows an error mesage</summary>
        let isAlreadyCancelled = this._longRunningOperation && this._longRunningOperation.isCancelled();
        if (!isAlreadyCancelled) {
            this._showError(message);
            if (this._longRunningOperation) {
                Diag.logVerbose("[HtmlDocumentGenerator._displayError] Cancelling the longRunningOperation");
                this._longRunningOperation.cancelOperation();
            }
        }

    }

    private _checkEmailSettings(): boolean {
        Diag.logVerbose("[HtmlDocumentGenerator._checkEmailSettings] Getting the email settings");
        let mailSettings = TFS_Host_TfsContext.TfsContext.getDefault().configuration.getMailSettings();

        if (!mailSettings) {
            Diag.logVerbose("[HtmlDocumentGenerator._checkEmailSettings] Could not get email settings");
        }

        if (!mailSettings || !mailSettings.enabled) {
            Diag.logVerbose("[HtmlDocumentGenerator._checkEmailSettings] Email is not enabled");
            alert(VSS_Resources_Common.SendMailNotEnabled);
            return false;
        }
        return true;
    }

    private _showExportHtmlOptions(selectedSuite: TestsOM.ITestSuiteModel, isChildSuitesCountExceededForExportFeature: boolean, options?): void {
        let shouldEmail: boolean = true;
        Dialogs.show(ExportHtmlDialog, {
            attachResize: false,
            // Sending width as 510 as text is overflowing while localizing if default length 500 is used.
            width: 510,
            title: Resources.ExportHtml.concat(" ", selectedSuite.title),
            cssClass: "export-html",
            isChildSuitesCountExceededForExportFeature: isChildSuitesCountExceededForExportFeature,
            okCallback: (id: string) => {
                if (id === HtmlDocumentGenerator.buttonIds.print) {
                    shouldEmail = false;
                }
                if (!shouldEmail || this._checkEmailSettings()) {
                    Diag.logTracePoint("HtmlDocumentGenerator._showExportHtmlOptions.GetXsltTemplate.Start");
                    this._planManager.getXsltTemplate((result) => {
                        Diag.logTracePoint("HtmlDocumentGenerator._showExportHtmlOptions.GetXsltTemplate.End");
                        this._beginPrepareDataAndDisplayHtmlInNewWindow(result.xslFileText, selectedSuite, shouldEmail);
                    },
                        (error) => {
                            this._displayError(VSS.getErrorMessage(error));
                        });
                }
            }
        });
    }

    private _callback(xslText: string, rootXml: any, shouldEmail: boolean) {
        if (++this._currentCount === this._totalCount) {
            if (!this._longRunningOperation.isCancelled()) {
                Diag.logVerbose("[HtmlDocumentGenerator._callback] Ending the longRunningOperation");
                this._longRunningOperation.endOperation();
                this._displayResult(xslText, rootXml, shouldEmail);
                Diag.logTracePoint("HtmlDocumentGenerator.ExportHtml.Complete");
            }
        }
    }

    private _setSelectedSuite(suite: TestsOM.ITestSuiteModel) {
        this._selectedSuite = suite;
    }

    private _createAndBeginLongRunningOperation(callback: IResultCallback): void {
        Diag.logVerbose("[HtmlDocumentGenerator._createAndBeginLongRunningOperation] Creating a longRunningOperation");

        this._longRunningOperation = new LongRunningOperationWithProgressMessage(this, {
            cancellable: true,
        });
        Diag.logVerbose("[HtmlDocumentGenerator._createAndBeginLongRunningOperation] Beginning the longRunningOperation");

        this._longRunningOperation.beginOperation(() => {
            callback();
        });
        this._suitexml.setLongRunningOperation(this._longRunningOperation);
    }

    private _beginPrepareDataAndDisplayHtmlInNewWindow(xslText: string, selectedSuite: TestsOM.ITestSuiteModel, shouldEmail: boolean): void {
        /// <summary> Display the provided html in a new browser window </summary>        
        this._createAndBeginLongRunningOperation(() => {
            let rootXml = $.parseXML("<planAndSuites></planAndSuites>"),
                $rootXmlDom: JQuery = $(rootXml).find("planAndSuites");

            this._testPlanXml.setSelectedSuitedId(selectedSuite.id);
            this._setSelectedSuite(selectedSuite);
            this._longRunningOperation.updateWaitMessage(Resources.TestSuiteDataProgress);

            Diag.logTracePoint("HtmlDocumentGenerator._beginPrepareDataAndDisplayHtmlInNewWindow.getSuitesData.Start");
            TMUtils.getTestPlanManager().getTestSuitesData(selectedSuite.id,
                !this._suitexml.isCheckboxChecked(checkboxesNames.SuiteOnlyRadio),
                (suites) => {
                    Diag.logTracePoint("HtmlDocumentGenerator._beginPrepareDataAndDisplayHtmlInNewWindow.getSuitesData.End");
                    if (!this._longRunningOperation.isCancelled()) {
                        this._testPlanXml.setSuitesData(suites);

                        this._suitexml.setSuitesData(suites);
                        Diag.logTracePoint("HtmlDocumentGenerator._beginPrepareDataAndDisplayHtmlInNewWindow.beginGeneratePlanXml.Start");
                        this._testPlanXml.beginGeneratePlanXml($rootXmlDom,
                            () => {
                                Diag.logTracePoint("HtmlDocumentGenerator._beginPrepareDataAndDisplayHtmlInNewWindow.beginGeneratePlanXml.End");
                                this._callback(xslText, rootXml, shouldEmail);
                            },
                            (error) => {
                                this._displayError(VSS.getErrorMessage(error));
                            });

                        Diag.logTracePoint("HtmlDocumentGenerator._beginPrepareDataAndDisplayHtmlInNewWindow.beginGenerateSuiteXml.Start");
                        this._suitexml.beginGenerateSuiteXml($rootXmlDom,
                            selectedSuite,
                            () => {
                                Diag.logTracePoint("HtmlDocumentGenerator._beginPrepareDataAndDisplayHtmlInNewWindow.beginGenerateSuiteXml.End");
                                this._callback(xslText, rootXml, shouldEmail);
                            },
                            (error) => {
                                this._displayError(VSS.getErrorMessage(error));
                            });
                    }
                },
                (error) => {
                    this._displayError(VSS.getErrorMessage(error));
                });
        });
    }

    private _getDocumentTitle(): string {
        if (this._selectedSuite.id === this._plan.rootSuiteId &&
            !this._suitexml.isCheckboxChecked(checkboxesNames.SuiteOnlyRadio)) {
            Diag.logVerbose("[HtmlDocumentGenerator._getDocumentTitle] Getting title in plan title format");
            return Utils_String.format(Resources.TestPlanTitleFormat, Resources.ExportHtmlTestPlanHeading, this._plan.name, this._plan.id.toString());
        }
        else {
            Diag.logVerbose("[HtmlDocumentGenerator._getDocumentTitle] Getting title in suite title format");
            return Utils_String.format(Resources.TestPointsGridSuiteHeader, this._selectedSuite.title, this._selectedSuite.id.toString());
        }
    }

    private _displayResult(xslText: string, xml, shouldEmail?: boolean): void {
        let xslDocument: any,
            resultDocument: any,
            xsltProcessor: any,
            xslt: any,
            xslDoc: any,
            xslProc: any,
            transformedHtml: any;

        Diag.logVerbose("[HtmlDocumentGenerator._displayResult] Parse the xslt string");

        xslDocument = Utils_Core.parseXml(xslText);
        const windowNoActiveX = window;

        // code for IE
        if (window.ActiveXObject || "ActiveXObject" in window) {
            if (typeof (xml.transformNode) !== "undefined") { // IE6, IE7, IE8
                transformedHtml = xml.transformNode(xslDocument);
                resultDocument = transformedHtml;

            }
            else {
                try { // IE9 and greater
                    if (window.ActiveXObject || "ActiveXObject" in window) {
                        xslt = new ActiveXObject("Msxml2.XSLTemplate");
                        xslDoc = new ActiveXObject("Msxml2.FreeThreadedDOMDocument");
                        xslDoc.loadXML(xslText);
                        xslt.stylesheet = xslDoc;
                        xslProc = xslt.createProcessor();
                        xslProc.input = xml;
                        xslProc.transform();
                        transformedHtml = xslProc.output;
                        resultDocument = transformedHtml;
                    }
                }
                catch (e) {
                    alert(Resources.ExportHtmlBrowserIncompatibleError);
                    return null;
                }
            }
        }
        // code for Mozilla, Firefox, Opera, etc.
        else if (document.implementation && document.implementation.createDocument) {
            xsltProcessor = new windowNoActiveX.XSLTProcessor();
            xsltProcessor.importStylesheet(xslDocument);
            transformedHtml = xsltProcessor.transformToDocument(xml);
            resultDocument = transformedHtml.documentElement.outerHTML;
        }

        let parametersXml: string = this._getParametersXml(xml);

        if (shouldEmail) {
            this._prepareEmail(resultDocument, parametersXml);

            //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: ExportToHtml.
            TelemetryService.publishEvent(TelemetryService.featureExportToHtml, TelemetryService.exportSuiteViaMail, 1);
        }
        else {
            this._displayInNewWindowAndPrint(resultDocument);

            TelemetryService.publishEvent(TelemetryService.featureExportToHtml, TelemetryService.exportSuiteViaPrint, 1);
        }
    }

    private _getParametersXml(xml): string {

        let parametersMap = new Array();
        let testCases = $(xml).find("testCase");
        let i: number = 0;
        for (i = 0; i < testCases.length; i++) {
            let testCaseId = testCases[i].id;
            let parameters = $(testCases[i]).find("parameters");

            if (parameters !== undefined && parameters.length > 0) {
                let parametersXml = parameters[0].outerHTML;
                parametersMap.push({ testCaseId, parametersXml });
            }
        }

        let stringifiedParametersXml = Utils_Core.stringifyMSJSON(parametersMap);
        return stringifiedParametersXml;
    }

    private _displayInNewWindowAndPrint(htmlString: string): void {
        Diag.logVerbose("[HtmlDocumentGenerator._displayInNewWindowAndPrint] Open a new browser window");
        let newWindow = window.open("", "", this._getDefaultSettingsForNewWindow());
        if (newWindow) {
            Diag.logVerbose("[HtmlDocumentGenerator._displayInNewWindowAndPrint] Write in new window");
            newWindow.document.write(htmlString);
            newWindow.document.title = this._getDocumentTitle();
            newWindow.document.close();
            newWindow.focus();
            Utils_Core.delay(this, 1000, () => {
                Diag.logVerbose("[HtmlDocumentGenerator._displayInNewWindowAndPrint] Print in the new window");
                newWindow.print();
            });
        }
    }

    private _prepareEmail(bodyContent: string, parametersXml : string) {
        Diag.logVerbose("[HtmlDocumentGenerator._prepareEmail] Open the email dialog");

        AdminSendMail.Dialogs.sendMail(new ExportHtmlSendMailDialog({
            title: this._getDocumentTitle(),
            subject: this._getDocumentTitle(),
            readOnlyBody: bodyContent,
            useIdentityPickerForTo: true,
            selectedPlanId: this._plan.id,
            selectedSuiteId: this._selectedSuite.id,
            parametersXml: parametersXml,
            useCommonIdentityPicker: true
        }), { cssClass: "export-as-html-email-dialogue", height: 800 });
    }

    private _getDefaultSettingsForNewWindow(): string {
        /// <summary> Returns the window settings string required for opening the new window </summary>
        return "location=0,status=0,scrollbars=1,top=0,resizable=yes"
            + ",left=" + (window.screen.availWidth / 6)
            + ",width=" + (window.screen.availWidth / 1.5)
            + ",height=" + (window.screen.availHeight / 1.1);
    }
}

export class ExportHtmlSendMailDialog extends AdminSendMail.SendMailDialogModel
{
    ExportHtmlSendMailDialog(selectedPlanId: number, selectedSuiteId: number) {
        this._planId = selectedPlanId;
        this._suiteId = selectedSuiteId;
    }

    constructor(options?: any) {
        super(options);
        this._planId = options.selectedPlanId;
        this._suiteId = options.selectedSuiteId;
        this._parametersXml = options.parametersXml;
    }

    public getEndPoint(): string {
        return TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("sendExportToHtmlMail", "testManagement", { area: "api", planId: this._planId, suiteId: this._suiteId } as TFS_Host_TfsContext.IRouteData);
    }

    public getMessageParams() {
        return {
            message: Utils_Core.stringifyMSJSON(this.getMessage()),
            parametersXml: this._parametersXml
        };
    }

    private _suiteId: number;
    private _planId: number;
    private _parametersXml: string;
}

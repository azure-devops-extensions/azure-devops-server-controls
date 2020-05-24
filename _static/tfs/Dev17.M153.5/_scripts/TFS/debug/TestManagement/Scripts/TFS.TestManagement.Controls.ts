///<amd-dependency path="jQueryUI/dialog"/>
///<amd-dependency path='VSS/LoaderPlugins/Css!Site' />

/// <reference types="jquery" />

import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Host_UI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import {ShortcutGroupDefinition} from "TfsCommon/Scripts/KeyboardShortcuts";

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import SelectWorkItemView = require("TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView");
import TMOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");


import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import Events_Handlers = require("VSS/Events/Handlers");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Q = require("q");

import { addAttachment } from "WorkItemTracking/Scripts/Utils/Attachments";
import WITGlobalRegistration = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Global.Registration");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import {WorkItemChangeType} from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import {WorkItemManager} from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WorkItemUtility = require("WorkItemTracking/Scripts/Controls/WorkItemForm/Utils");
import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import Panels = require("VSS/Controls/Panels");
import { IInPlaceMaximizableControl } from "WorkItemTracking/Scripts/Form/FormGroup";

let delegate = Utils_Core.delegate;
let HtmlNormalizer = Utils_Html.HtmlNormalizer;
let WITUtils = TMUtils.WorkItemUtils;
let domElem = Utils_UI.domElem;
let DAUtils = TMOM.DAUtils;
let TelemetryService = TCMTelemetry.TelemetryService;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

/**
 * Defines the hub navigation shortcuts for test hub
 */
export class TestHubCommonShortcutGroup extends ShortcutGroupDefinition {

    constructor(allowActionDelgate?: any) {
        super(Resources.HubNavigationShortcutGroupText);
        this.allowAction = allowActionDelgate ? allowActionDelgate : () => { return true; };
        this.registerPageNavigationShortcut(
            "n",
            {
                description: Resources.GotoTestplanHubKeyboardShortcutText,
                action: () => this._performAction(() => {
                    this.navigateToAction("", TestHubCommonShortcutGroup.testManagemnetController);
                }),
                allowPropagation: true
            });
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this.registerPageNavigationShortcut(
                "m",
                {
                    description: Resources.GotoParametersHubKeyboardShortcutText,
                    action: () => this._performAction(() => {
                        this.navigateToAction("sharedParameters", TestHubCommonShortcutGroup.testManagemnetController);
                    }),
                    allowPropagation: true
                });
        }
        this.registerPageNavigationShortcut(
            "r",
            {
                description: Resources.GotoRunsHubKeyboardShortcutText,
                action: () => this._performAction(() => {
                    this.navigateToAction("runs", TestHubCommonShortcutGroup.testManagemnetController);
                }),
                allowPropagation: true
            });
        this.registerPageNavigationShortcut(
            "h",
            {
                description: Resources.GotoMachinesHubKeyboardShortcutText,
                action: () => this._performAction(() => {
                    this.navigateToAction("", TestHubCommonShortcutGroup.machinesController);
                }),
                allowPropagation: true
            });
    }

    private _performAction(action: any) {
        if (this.allowAction && this.allowAction()) {
            action();
        }
    }

    private static testManagemnetController: string = "testManagement";
    private static machinesController: string = "machines";
    private allowAction: any;
}

export class Test_TfsTreeControl {
    private _options: any;
    private _control: Combos.Combo;
    private _parentControl: any;
    private _isDataFetched: boolean;
    private _defaultValue: string;
    private _rootValue: string;

    constructor(parentControl: any, options?: any) {
        let valueChangedDelegate: IEventHandler;

        this._parentControl = parentControl;
        this._options = options;
        this._isDataFetched = false;
        valueChangedDelegate = $.isFunction(this._options.onValueChanged) ? delegate(this, this._options.onValueChanged) : null;
        
        let controlOptions = <Combos.IComboOptions> {
            type: "tree",
            initialLevel: 2,
            sepChar: "\\",
            cssClass: this._options.comboCssClass,
            allowEdit: false,
            change: () => valueChangedDelegate
        };

        let enhancementOptions = <Controls.EnhancementOptions>{
            ariaAttributes: {
                labelledby: this._options.labelId
            }
        };

        this._control = <Combos.Combo>Controls.BaseControl.create(Combos.Combo, this._parentControl, controlOptions, enhancementOptions);

        this._control.getDropButton()
            .attr("tabindex", 0)
            .bind("keyup", delegate(this, this._onDropButtonKeyup));
    }

    public invalidate(dropDownData?: any) {
        if (dropDownData) {
            this._updateUI(dropDownData);
            this._isDataFetched = true;

            if (this._defaultValue) {
                this.setValue(this._defaultValue);
            }
        }
    }

    public getValue() {
        return this._control.getText();
    }

    public setValue(value: string, isDefault?: boolean) {
        if (value) {
            if (isDefault) {
                this._defaultValue = value;
            }

            if (this._isDataFetched) {
                this._control.setText(value);

                if (this._options.onValueChanged) {
                    this._options.onValueChanged(this._control);
                }
            }
        }
    }

    private _onDropButtonKeyup(e?: JQueryEventObject): any {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._control.toggleDropDown();
            return false;
        }
    }

    private _onFocus(e?: JQueryEventObject): any {
        if (this._control){
            this._control.showDropPopup();
        }
    }

    private _updateUI(data: any) {
        let nodes = WorkItemUtility.populateUINodes(data, null, 1);

        this._control.setMode("drop");
        this._control.setSource([nodes]);
        this.setValue(data.text);
    }
}

interface CreateTestArtifactDialogOptions extends Dialogs.IModalDialogOptions {
    owner?: any;
    planCreationHelper?: any;
    waterMarkText?: string;
    onCreate?: Function;
    onSucceeded?: Function;
    onFailed?: Function;
}

class CreateTestArtifactDialog extends Dialogs.ModalDialogO<CreateTestArtifactDialogOptions> {
    private _titleInput: JQuery;
    private _content: JQuery;
    private _watermarkText: string;

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: true,
            okText: Resources.CreateButtonText
        }, options));
    }

    public initialize() {
        super.initialize();

        this._watermarkText = this._options.waterMarkText ? this._options.waterMarkText : Resources.TestArtifactNameDefaultWatermark;
        this._decorate();
    }

    public _decorate() {
        let element = this._element,
            $containerElement: JQuery;

        // create DOM elements
        $containerElement = this._createDOMElements();

        $containerElement.appendTo(this._content);
        element.append(this._content);

        this._titleInput = this._content.find(".test-artifact-name-input");

        // set focus on the artifact name input
        this._titleInput.focus();

        super.updateOkButton(false);
    }

    public _createDOMElements(): JQuery {
        let $table: JQuery;

        this._content = $("<div />").addClass("create-test-artifact-dialog-content");

        // create name input control
        $table = $("<table/>").addClass("create-test-artifact-table");

        //add row for name input
        this._createTitleInput($table);

        return $table;
    }

    public getTitleValue(): string {
        return this._titleInput.val();
    }

    private _createTitleInput($table: JQuery) {
        let $inputText: JQuery = $("<input />")
            .attr("type", "text")
            .attr("id", "test-plan-name-input")
            .addClass("test-artifact-name-input invalid")
            .bind("keyup", () => { this._updateOkButton(); })
            .bind("mouseup", () => { this._onTitleInputMouseUp(); });

        Utils_UI.Watermark($inputText, { watermarkText: this._watermarkText });

        $("<tr/>").addClass("create-test-artifact-name-row")
            .append($("<td/>").append($("<label />").attr("for", "test-plan-name-input").addClass("create-test-artifact-title-cell").text(Resources.TestPlanNameTitle)))
            .append($("<td/>").append($inputText).addClass("create-test-artifact-value-cell"))
            .appendTo($table);
    }

    // this is a work around to handle input X button in IE 10
    private _onTitleInputMouseUp() {
        let oldValue: string = this._titleInput.val();

        if (!oldValue) {
            this._updateOkButton();
        }
        else {

            // When this event is fired after clicking on the clear button
            // the value is not cleared yet. We have to wait for it.
            setTimeout(() => {
                this._updateOkButton();
            }, 1);
        }
    }

    public onClose(e?) {
        this._unloadCreateTestArtifactDialog();
        super.onClose(e);
    }

    public _unloadCreateTestArtifactDialog() {
        this._titleInput = null;
    }

    public _updateOkButton() {
        if (this._titleInput && this._titleInput.val() !== "") {
            this._titleInput.removeClass("invalid");
            super.updateOkButton(true);
        }
        else {
            this._titleInput.addClass("invalid");

            super.updateOkButton(false);
        }
    }

    public onOkClick() {
        this._options.okCallback(this._titleInput.val());

        this.close();
    }
}

VSS.initClassPrototype(CreateTestArtifactDialog, {
    _titleInput: null
});

class CreateSharedStepDialog extends CreateTestArtifactDialog {

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            cssClass: "create-shared-step-dialog",
            title: Resources.CreateSharedStep.toLocaleUpperCase(),
            waterMarkText: Resources.SharedStepNameWatermark
        }, options));
    }
}

class CreateTestPlanDialog extends CreateTestArtifactDialog {

    private _areaPathCombo: Test_TfsTreeControl;
    private _iterationPathCombo: Test_TfsTreeControl;
    private _iterationDatesLabel: JQuery;
    private _isCommitted: boolean;
    private _isAreaPathsDataFetched: boolean;
    private _isIterationsDataFetched: boolean;

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            cssClass: "create-test-plan-dialog",
            title: Resources.CreateTestPlanDialogTitle,
            waterMarkText: Resources.TestPlanNameWatermark
        }, options));
    }

    public onClose(e?) {
        this._unloadCreateTestPlanDialog();

        if (!this._isCommitted) {
            if ($.isFunction(this._options.onSucceeded)) {
                this._options.onSucceeded(null);
            }
        }

        super.onClose(e);
    }

    private _postDOMElementCreation() {        
        //this will initialze the data
        this._fetchAndPopulateIterationsData();
        this._fetchAndPopulateAreaPathsData();

        // fetch the team settings and set default area iteration path
        this._setDefaultValues();
    }

    public onOkClick() {
        let testPlanDetails: TMOM.ITestPlanDetails,
            planDates = this._getPlanDates(),
            convertedStartDate: Date,
            convertedEndDate: Date;

        if (planDates.getStartDate() && planDates.getEndDate()) {
            convertedStartDate = new Date(planDates.getStartDate().getTime() - planDates.getStartDate().getTimezoneOffset() * 60000);
            convertedEndDate = new Date(planDates.getEndDate().getTime() - planDates.getEndDate().getTimezoneOffset() * 60000);
        }

        testPlanDetails = {
            name: super.getTitleValue(),
            areaPath: this._areaPathCombo.getValue(),
            iteration: this._iterationPathCombo.getValue(),
            startDate: convertedStartDate,
            endDate: convertedEndDate,
            owner: this._options.owner
        };

        if ($.isFunction(this._options.onCreate) &&
            $.isFunction(this._options.onSucceeded) &&
            $.isFunction(this._options.onFailed)) {
            this._options.onCreate(testPlanDetails,
                (plan) => {
                    if (plan && this._options.planCreationHelper.areaPathIncludedInTeam(plan.areaPath)) {
                        this._options.onSucceeded(plan, true);
                    }
                    else {
                        this._options.onSucceeded(plan, false);
                    }
                },
                this._options.onFailed);
        }

        //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: TestPlan
        TelemetryService.publishEvent(TelemetryService.featureTestPlan, TelemetryService.createTestPlan, 1);

        this._isCommitted = true;

        this.close();
    }

    private _getPlanDates() {
        let planDates: TMOM.IterationDates;

        planDates = this._options.planCreationHelper.getIterationDates(this._iterationPathCombo.getValue());

        if (!planDates.getStartDate() || !planDates.getEndDate()) {
            let startDate = new Date(),
                endDate = Utils_Date.addDays(startDate, 7);

            planDates = new TMOM.IterationDates(Utils_Date.shiftToUTC(startDate),
                Utils_Date.shiftToUTC(endDate));
        }

        return planDates;
    }

    public _updateOkButton() {
        if (!this._isAreaPathsDataFetched || !this._isIterationsDataFetched) {
            super.updateOkButton(false);
        }
        else {
            super._updateOkButton();
        }
    }

    public _decorate() {
        super._decorate();

        // start initializing the data
        this._postDOMElementCreation();
    }

    public _createDOMElements() {
        let $table = super._createDOMElements();

        //create area / iteration dropdown
        this._createAreaPathCombo($table);
        this._createIterationsCombo($table);

        return $table;
    }

    private _createIterationsCombo($table) {
        let $containerCell = $("<td/>").addClass("create-test-artifact-value-cell create-test-plan-value-cell");
        let labelId = "iteration-path-label";
        $("<tr/>").addClass("create-test-plan-iteration-row")
            .append($("<td/>").append($("<label />").attr("id", labelId).addClass("create-test-artifact-title-cell create-test-plan-title-cell").text(Resources.IterationPathTitle)))
            .append($containerCell)
            .appendTo($table);

        this._iterationPathCombo = new Test_TfsTreeControl($containerCell,
            {
                fieldType: "Iteration Path",
                comboCssClass: "create-test-plan-dialog-combo",
                labelId: labelId,
                onValueChanged: (value) => {
                    this._onSelectedIterationChanged(value);
                }
            });
    }

    private _createAreaPathCombo($table: JQuery) {
        let $containerCell = $("<td/>").addClass("create-test-artifact-value-cell create-test-plan-value-cell");
        let labelId = "area-path-label";
        $("<tr/>").addClass("create-test-plan-area-row")
            .append($("<td/>").append($("<label />").attr("id", labelId).addClass("create-test-artifact-title-cell create-test-plan-title-cell").text(Resources.AreaPathTitle)))
            .append($containerCell)
            .appendTo($table);

        this._areaPathCombo = new Test_TfsTreeControl($containerCell,
            {
                fieldType: "Area Path",
                comboCssClass: "create-test-plan-dialog-combo",
                labelId: labelId
            });
    }

    private _fetchAndPopulateIterationsData() {
        this._options.planCreationHelper.beginGetIterationsData((data) => {
            if ($.isArray(data) && data.length > 0) {
                this._iterationPathCombo.invalidate(data[0]);
                this._isIterationsDataFetched = true;
                this._updateOkButton();
            }
        });
    }

    private _fetchAndPopulateAreaPathsData() {
        let workItemStore = WITUtils.getWorkItemStore();

        this._options.planCreationHelper.beginGetAreaPathsData((data) => {
            this._areaPathCombo.invalidate(data);
            this._isAreaPathsDataFetched = true;
            this._updateOkButton();
        });
    }

    private _onSelectedIterationChanged(e?: any) {
        let iterationDates: TMOM.IterationDates,
            iterationsDateString: string;
      
        this._createIterationDatesLabelElement();

        if (this._iterationDatesLabel) {
            iterationDates = this._options.planCreationHelper.getIterationDates(e.getText());

            if (!iterationDates.getStartDate() ||
                !iterationDates.getEndDate()) {
                // empty any previous dates
                this._iterationDatesLabel.text(Resources.NoIterationDatesSet);
                return;
            }

            iterationsDateString = Utils_String.format(Resources.IterationDurationFormat,
                Utils_Date.localeFormat(iterationDates.getStartDate(), "m", true),
                Utils_Date.localeFormat(iterationDates.getEndDate(), "m", true));

            this._iterationDatesLabel.text(iterationsDateString);
        }
    }

    private _createIterationDatesLabelElement() {
        if (!this._iterationDatesLabel) {
            this._iterationDatesLabel = $("<label />").addClass("create-test-plan-dialog-iteration-dates-label");
            this._element.find(".create-test-artifact-table")
                .append($("<tr/>").append($("<td/>"))
                    .append($("<td/>")
                        .append(this._iterationDatesLabel)
                        .addClass("create-test-plan-iteration-dates-cell")));
        }
    }

    private _setDefaultValues() {
        this._options.planCreationHelper.beginGetTeamSettingsData((teamSettings) => {
            this._iterationPathCombo.setValue(teamSettings.getDefaultIteration(), true);
            this._areaPathCombo.setValue(teamSettings.getDefaultArea(), true);
        });
    }

    private _unloadCreateTestPlanDialog() {
        super._unloadCreateTestArtifactDialog();

        this._areaPathCombo = null;
        this._iterationPathCombo = null;
    }
}

VSS.initClassPrototype(CreateTestPlanDialog, {
    _areaPathCombo: null,
    _iterationPathCombo: null
});


export interface ConfigureTestOutcomeDialogOptions extends Dialogs.IModalDialogOptions {
    enabled: boolean;
    planName: string;
    planId: number;
}

class ConfigureTestOutcomeDialog extends Dialogs.ModalDialogO<ConfigureTestOutcomeDialogOptions> {

    private _planName: string;
    private _planId: number;
    private _initialSetting: boolean;
    private $checkbox: JQuery;

    constructor(options?: ConfigureTestOutcomeDialogOptions) {
        super(options);
        this._planName = options.planName;
        this._planId = options.planId;
        this._initialSetting = options.enabled;
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: true,
            cssClass: "configure-outcome-settings-dialog",
            okText: Resources.ConfigureTestOutcome_OkText,
            cancelText: Resources.ConfigureTestOutcome_CancelText,
            title: Utils_String.format(Resources.ConfigureTestOutcome_Title, options.planName)
        }, options));
    }

    public initialize() {
        super.initialize();

        this._decorate();
    }

    private _decorate() {

	    let checkBoxId: string = "configure-outcome-checkbox-label-id";

        let element = this._element,
            openButton,
            closeButton;
        
		let html = Utils_String.format("<div>{0}</div><div style='margin-top: 10px;margin-bottom: 10px;margin-left: 10px;'><input type='checkbox' style='margin-right: 14px;'/><label for={1} style='display: inline'>{2}</label></div><div><span class='bowtie-icon bowtie-status-info-sm' style='color: #007acc;'></span><span style='margin-left:6px;'>{3}</span></div>", Resources.ConfigureTestOutcome_Description, checkBoxId, Resources.ConfigureTestOutcome_Label, Resources.ConfigureTestOutcome_Info);

        let control = $(html);
        this.$checkbox = control.children("input");
		this.$checkbox.attr("id", checkBoxId);
        this.$checkbox.prop("checked", this._initialSetting);
        this.$checkbox.change((e?: JQueryEventObject) => {
            this._onValueChange();
        });

        element.append(control);
    }

    private _getValue(): boolean {
        if (this.$checkbox) {
            return this.$checkbox.is(":checked");
        }

        return false;
    }

    private _onValueChange(): void {
        this.updateOkButton(this._getValue() !== this._initialSetting);
    }

    public onOkClick(e?: JQueryEventObject): any {
        this.beginSetTestOutcomeSettings(this._getValue());
        this.close();
    }

    public beginSetTestOutcomeSettings(propagateOutcome: boolean): IPromise<any> {
        let key = this._getTestOutcomeSettingsRegistryKey(this._planId);

        return this._beginWriteProjectSettings(key, propagateOutcome ? "true" : "false");
    }

    private _beginWriteProjectSettings(key: string, value: string): IPromise<any> {
        let deferred = Q.defer();

        let webSettings = TFS_OM_Common.ProjectCollection.getConnection(tfsContext)
            .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);

        webSettings.beginWriteSetting(key, value, TFS_WebSettingsService.WebSettingsScope.Project,
            deferred.resolve, deferred.reject);

        return deferred.promise;
    }

    private _getTestOutcomeSettingsRegistryKey(planId: number) {
        return Utils_String.format("MS.VS.TestManagement/TestOutcomeSettings/TestPlan/{0}", planId);
    }
}

VSS.initClassPrototype(ConfigureTestOutcomeDialog, {
    _grid: null,
    _attachments: null
});



export class TestDialogs {

    public static createTestPlan(options?) {
        return Dialogs.Dialog.show<Dialogs.Dialog>(CreateTestPlanDialog, $.extend(options, {
            width: 500,
            height: 230,
            minWidth: 400,
            minHeight: 230,
            cssClass: "create-test-plan-host"
        }));
    }

    public static configureOutcomeSettings(options?) {

        return Dialogs.Dialog.show<Dialogs.Dialog>(ConfigureTestOutcomeDialog, $.extend(options, {
            width: 700,
            height: 230,
            minWidth: 400,
            minHeight: 230,
            cssClass: "configure-outcome-settings-host"
        }));
    }

    constructor() {
    }
}

export class NonVirtualizedListView extends Grids.GridO<any> {

    constructor(options?) {
        super(options);
    }

    public _updateViewport(includeNonDirtyRows?: boolean) {
        /// <param name="includeNonDirtyRows" type="boolean" optional="true" />

        //overriding UI virtualization since test steps and parameters wouldn't be in huge numbers 
        let resultCount = this._count - 1, i, visible = [];
        for (i = 0; i <= resultCount; i++) {
            visible[visible.length] = [i, i];
        }
        this._drawRows(visible, includeNonDirtyRows);
        this._fire("updateViewPortCompleted", {});
    }

    public _drawRows(visible, includeNonDirtyRows){
        super._drawRows(visible, includeNonDirtyRows);

        let lastrow = this._rows[visible.length - 1];
        if (lastrow && lastrow.row){
            $(lastrow.row).attr("role", "button");
        }
    }

    public _onCanvasScroll(e?) {
        let canvas = this._canvas[0];
        this._scrollLeft = canvas.scrollLeft;
        this._scrollTop = canvas.scrollTop;
        if (!this._ignoreScroll) {
            this._layoutHeader();
        }
        return false;
    }

    public _fireChange(sender?: any) {
        super._fireChange($.extend({
            uniqueId: this._uniqueId
        }, sender));
    }

    public _onContainerMouseDown(e?) {
        //do nothing. Override Grids.GridO implementation.
    }

    public _onSelectStart(e?) {
        return true;
    }

    public _shouldSetSelection(rowIndexToSelect: number) {
        let count: number = Object.keys(this._selectedRows).length;

        // if multiple rows are selected OR same row is being reselected
        if (count > 1 || rowIndexToSelect === this.getSelectedRowIndex()) {
            return false;
        }

        return true;
    }

    public _getClickedColumnIndex(e?: JQueryEventObject): number {
        let gridLeft = $(this._canvas).offset().left,
            relativeX = e.pageX - gridLeft,
            i,
            len,
            column;

        //adding the left scrolled distance to get the actual relative distance from grid's left boundary
        relativeX = relativeX + this._canvas.scrollLeft();

        // This part takes the focus to the editable div
        // for each column , we see if relativeX is less than its width
        // if it is less, we are in that column or cell
        // if not, we substract the column width to shift y axis to the start of next cell.
        if (relativeX) {
            for (i = 0, len = this._columns.length; i < len; i++) {
                column = this._columns[i];
                if (column.width && relativeX < column.width) {
                    return i;
                }
                relativeX = relativeX - column.width;
            }
        }
        return -1;

    }

    public getPinAndFocusElementForContextMenu(eventArgs): { pinElement: JQuery; focusElement: JQuery; } {
        let columnIndex = this._getClickedColumnIndex(eventArgs.event),
            rowInfo = eventArgs.rowInfo,
            pinElement: JQuery,
            focusElement: JQuery;
        if (columnIndex === -1) {
            columnIndex = 0;
        }
        pinElement = rowInfo.row.children().eq(columnIndex);
        focusElement = pinElement.children().length > 0 ? pinElement.children().eq(0) : this._canvas;
        return { pinElement: pinElement, focusElement: focusElement };
    }

    public _shouldAttachContextMenuEvents(): boolean {
        return this._options.contextMenu && true;
    }

    public onContextMenu(eventArgs): any {
        /// <returns type="any" />
        this._showContextMenu(eventArgs);
    }

    public _onGridElementFocus(e?, element?) {
        let rowInfo = this._getRowInfoFromEvent(e, ".grid-row");

        this._active = true;

        if (this._shouldSetSelection(rowInfo.rowIndex)) {
            if (rowInfo) {
                this._selectRow(rowInfo.rowIndex, rowInfo.dataIndex, {
                    ctrl: e.ctrlKey,
                    shift: e.shiftKey,
                    rightClick: e.which === 3
                });
            }
        }
    }

    public bind(uniqueId: number) {
        this._uniqueId = uniqueId;
    }

    public getUniqueId(): number {
        return this._uniqueId;
    }

    private _uniqueId: number = 0;
}

export class TestStepList extends NonVirtualizedListView {

    public static enhancementTypeName: string = "tfs.wit.testStepList";
    private _attachmentColumn: any = {
        index: "attachments",
        text: Resources.AttachmentsHeaderText,
        canSortBy: false,
        width: 200
    };
    private _idColumn: any = {
        index: "stepId",
        text: Resources.TestStepsControlSteps,
        canSortBy: false,
        width: 40
    };
    private _actionColumn: any = {
        index: "action",
        text: Resources.TestStepsControlAction,
        canSortBy: false,
        width: 500
    };
    private _expectedResultColumn: any = {
        index: "expectedResult",
        text: Resources.TestStepsControlExpectedResult,
        canSortBy: false,
        width: 300
    };

    private _lastFocusedCellElement: HTMLDivElement;
    private _isSharedStepWorkItem: boolean;
    private _readOnlyDelegate: () => void;

    public hasContentChanged: boolean;
    public currentCellContents: any;
    public editTimer: any;

    constructor(options?) {
        /// <summary>Creates new Test Step Grid Control</summary>

        super(options);
        this._cellMinWidth = 25;
        this.hasContentChanged = false;
        this._isSharedStepWorkItem = false;
        this._readOnlyDelegate = options.readOnlyDelegate;
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />
        let contextMenu: any;
        contextMenu = {
            items: delegate(this, this._getContextMenuItems),
            updateCommandStates: delegate(this, this._updateContextMenuCommandStates),
            executeAction: delegate(this, this._onContextMenuItemClick)
        };

        let initalCoulmns = this._getInitialColumns();

        super.initializeOptions($.extend({
            sharedMeasurements: false,
            cssClass: "test-steps-list",
            allowMoveColumns: false,
            allowMultiSelect: true,
            gutter: false,
            keepSelection: true,
            contextMenu: contextMenu,
            columns: initalCoulmns
        }, options));
    }

    public _getaddNewStepRow() {
        let lastRowText = Utils_String.format("<DIV><p>{0}</p></DIV>", Resources.TestStepListAddNewStepText);
        // the magic number -1 here is the id of last step which is a dummy step
        // We will identify the summy step using this id. 
        return TMOM.TestStep.createStep(-1, "ActionStep", lastRowText, "<DIV></DIV>");
    }

    public setIsSharedStepWorkItem(value: boolean) {
        this._isSharedStepWorkItem = value;
    }

    public setSource(steps, editAction?: any) {

        let columns = [this._idColumn, this._actionColumn, this._expectedResultColumn, this._attachmentColumn];

        this._options.columns = columns;

        steps = $.extend(true, [], steps);
        steps.push(this._getaddNewStepRow());

        this._unbind("updateViewPortCompleted");

        if (editAction === TestStepsControl.TestStepCommands.CMD_ADDSTEP) {
            // register for the event updateviewportCompleted
            // We need to set focus on the action cell of newly added step in the handler.
            this._bind("updateViewPortCompleted", delegate(this, this._onAddTestStepCompleted));
        }
        else if (editAction === TestStepsControl.TestStepCommands.CMD_DELETE) {
            // this is the delete step case, on update view port need to get the selected row into view.
            this._bind("updateViewPortCompleted", delegate(this, this._onDeleteTestStepCompleted));
        }
        else if (editAction === TestStepsControl.TestStepCommands.CMD_INSERTSTEP) {
            // this is the insert step case, on update view port need to get the selected row into view and focus on editable div.
            this._bind("updateViewPortCompleted", delegate(this, this._onInsertTestStepCompleted));
        }
        else { // In case of refresh or save, fous needs to be explicitly set on body of the document.
            this._bind("updateViewPortCompleted", delegate(this, this._onUpdateViewPortCompleted));
        }

        this._options.source = steps;
        this.initializeDataSource();
    }

    public getSelectedItem() {
        return this._dataSource[this._selectedIndex];
    }

    public getColumnValue(dataIndex: number, columnIndex: number, columnOrder?: number): any {
        /// <param name="dataIndex" type="int">The index for the row data in the data source</param>
        /// <param name="columnIndex" type="int">The index of the column's data in the row's data array</param>
        /// <param name="columnOrder" type="int" optional="true">The index of the column in the grid's column array. This is the current visible order of the column</param>
        /// <returns type="any" />

        let step = this._dataSource[dataIndex];
        return this._options.stepValueProvider(step, columnIndex, columnOrder);
    }

    public _tryFinishColumnSizing(cancel) {
        this.notifyCellChanged();
        super._tryFinishColumnSizing(cancel);
    }

    public _getRowIntoView(rowIndex: number, force?: boolean): boolean {
        /// <param name="rowIndex" type="number" />
        /// <param name="force" type="boolean" optional="true" />
        /// <returns type="boolean" />

        let rowTop, rowHeight, result = false;

        if (rowIndex < 0 || rowIndex >= this._count) {
            return false;
        }
        // get the Y cordinate of selected row correponding to he canvas
        // This gives the Y corresponding to current scroll position. 
        // A negative top means the row is partially or fully hidden above the visible canvas
        rowTop = $(this._rows[rowIndex].row).position().top;
        if (rowTop <= 0) {
            this._canvas[0].scrollTop += rowTop;
            result = true;
        } else {
            result = this._alignRowBottom(rowIndex);
        }

        return result;
    }

    public layout() {
        this.notifyCellChanged();
        super.layout();
        this.getSelectedRowIntoView(true);
    }

    private _isReadOnly(){
        if (!$.isFunction(this._readOnlyDelegate)){
            return false;
        }
        return this._readOnlyDelegate();
    }

    private _alignRowBottom(rowIndex: number): boolean {
        let rowTop = $(this._rows[rowIndex].row).position().top,
            rowHeight = $(this._rows[rowIndex].row).height(),
            result = false;

        // in this case row is partially or fully hidden below the visible canvas
        if (rowTop + rowHeight > this._canvasHeight) {
            // if this is the last row, we can set the bottom this row's bottom
            // magic number 2 is to avoid some padding that is not account in rowHeight
            if (rowIndex === this._count - 1) {
                this._canvas[0].scrollTop += (rowTop + rowHeight + 2 - this._canvasHeight);
                result = true;
            }
            // if this is any other row than the last row, set the bottom to begining of next row. 
            // we could set to rowTop + rowHeight also, but the padding issue above will cause some lag. 
            else if (rowIndex < this._count - 1) {
                this._canvas[0].scrollTop += ($(this._rows[rowIndex + 1].row).position().top - this._canvasHeight);
                result = true;
            }
        }

        return result;
    }

    public updateRows(indices: number[]) {
        let i,
            len = indices.length;
        for (i = 0; i < len; i++) {
            this._updateRow(this._rows[indices[i]], indices[i], indices[i], null, null);
        }
    }

    public updateSource(source: any[]) {
        let options = this._options;
        options.source = source;
        this._dataSource = source;
    }

    public _onRowMouseDown(e?: JQueryEventObject): any {
        /// <param name="e" type="JQueryEvent" />
        /// <returns type="any" />

        super._onRowMouseDown(e);
        // We shift the Y axis to the X coordinate of grid
        // and calculate the x coordinate of mouse down relative to this as relativeX
        let index,
            ithGridCell,
            editableDiv,
            rowInfo = this._getRowInfoFromEvent(e, ".grid-row"),
            columnIndex = rowInfo ? this._getClickedColumnIndex(e) : 0;

        if (rowInfo) {
            if (columnIndex === 0 || columnIndex === 3) {
                Utils_UI.tryFocus(this._canvas, 10);
                e.preventDefault();
            }
            else if (columnIndex !== -1) {
                ithGridCell = $(rowInfo.row.children()[columnIndex]);
                //check if no scrollbar because if scrollbar is present, there is text in whole of the cell and we dont need to do this.
                //Bug #907236
                if (ithGridCell[0].scrollHeight === ithGridCell[0].clientHeight) {
                    editableDiv = $((ithGridCell).children()[0]);
                    if (editableDiv.length > 0) {
                        Utils_UI.tryFocus(editableDiv, 10);
                    }
                    else {
                        e.preventDefault();
                    }
                }
            }
        }
    }

    public handleSharedStep(rowInfo, cell, value) {
        cell.addClass("shared-test-step");
        cell.addClass("test-steps-multiline");
        RichContentTooltip.add(Utils_String.format(Resources.SharedStepToolTip, value), cell);
        cell.attr("unselectable", "on");

        //handler for opening shared step
        rowInfo.row.bind("keydown", (e) => {
            if (e.which && e.which === Utils_UI.KeyCode.ENTER) {
                if (e.shiftKey) {
                    this._handleEnterKeyWithShift(e);
                }
                else {
                    this._handleEnterKey(e);
                }
            }
            else {
                return this.handleShortCutKeys(e);
            }
        }).bind("click", delegate(this, this._onSharedStepClicked));

        this._bindFocusEventToGridElement(rowInfo.row);
    }

    private _getInitialColumns() {
        let columns = [
            {
                index: "stepId",
                text: Resources.TestStepsControlSteps,
                canSortBy: false,
                width: 30
            },
            {
                index: "action",
                text: Resources.TestStepsControlAction,
                canSortBy: false,
                width: 500
            },
            {
                index: "expectedResult",
                text: Resources.TestStepsControlExpectedResult,
                canSortBy: false,
                width: 300
            },
            {
                index: "attachments",
                text: Resources.AttachmentsHeaderText,
                canSortBy: false,
                width: 200
            }
        ];
        return columns;
    }

    private _onSharedStepClicked(e?: JQueryEventObject) {
        if (navigator.appName === "Microsoft Internet Explorer") {
            this.focus(10);
        }
    }

    public textFormattingChanged() {
        if(this.hasContentChanged === false) { return; }
        if (this._lastFocusedCellElement.contentEditable === "true") {
            this.delayExecute("updateTestSteps", 500, true, () => {
                this._onCellChanged({ "target": this._lastFocusedCellElement, "type": "textformat" });
            });
        }
    }

    private _onAddTestStepCompleted(e?) {
        let selectedIndex = this.getSelectedRowIndex(), editableDiv,
            $element: JQuery;

        this.getSelectedRowIntoView(true);

        // if selected row is the newly added step, select the action cell.
        if (this.getSelectedRowIndex() === this._count - 2) {
            this._focusActionCellAndSetCaretPosition(e);
        }
        this._unbind("updateViewPortCompleted");
        Diag.logTracePoint("TestStepGrid.AddNewTestStep.Complete");
    }

    private _focusActionCellAndSetCaretPosition(e?: JQueryEventObject) {
        let editableDiv = this._focusActionCell(this.getSelectedRowIndex()),
            $element: JQuery;

        //This is required for setting private grid properties _focusStateData which decides the next action item in the row
        this._onEscapeKey(e);
        this._onRightKey(e);

        //passing the cursor position to be set to satisfy the behaviour for add teststep one should not need to enter, direct typing should be accepted 
        if (editableDiv) {
            $element = editableDiv.children().eq(0).children().eq(0);

            if ($element) {
                // we need to pass raw DOM object here. So passing $element[0]
                TMUtils.setCaretPosition($element[0], $.trim(editableDiv.text()).length);
            }
        }
    }

    private _getContextMenuItems(): any {
        /// <summary>gets context menu items list</summary>
        /// <returns type="Object">new list of context menu items</returns>
        return <any[]>[{ rank: 5, id: TestStepsControl.TestStepCommands.CMD_INSERTSTEP, text: Resources.InsertStepAuthoring, title: Resources.InsertStepAuthoringTooltip, icon: "bowtie-icon bowtie-step-insert", showIcon: true, showText: true },
            { rank: 6, id: TestStepsControl.TestStepCommands.CMD_INSERTSHAREDSTEPS, text: Resources.InsertSharedSteps, icon: "bowtie-icon bowtie-step-shared-insert", showIcon: true, showText: true },
            { rank: 7, id: TestStepsControl.TestStepCommands.CMD_CREATESHAREDSTEP, text: Resources.CreateSharedStep, icon: "bowtie-icon bowtie-step-shared-add", showIcon: true, showText: true },
            { rank: 8, separator: true },
            { rank: 9, id: TestStepsControl.TestStepCommands.CMD_MOVEUP, text: Resources.MoveStepUp, icon: "bowtie-icon bowtie-sort-ascending", showIcon: true, showText: true },
            { rank: 10, id: TestStepsControl.TestStepCommands.CMD_MOVEDOWN, text: Resources.MoveStepDown, icon: "bowtie-icon bowtie-sort-descending", showIcon: true, showText: true },
            { rank: 11, id: TestStepsControl.TestStepCommands.CMD_DELETE, text: Resources.DeleteStep, icon: "bowtie-icon bowtie-edit-delete", showIcon: true, showText: true },
            { rank: 12, separator: true },
            { rank: 13, id: TestStepsControl.TestStepCommands.CMD_ADDATTACHMENT, text: Resources.AddAttachmentDialogTitle, icon: "bowtie-icon bowtie-attach", showIcon: true, showText: true }];
    }

    private _updateContextMenuCommandStates(menu: any) {
        /// <summary>updates context menu items list</summary>
        /// <param name="menu" type="Object">the menu to update</param>
        let testStep = this.getSelectedItem(),
            index = this.getSelectedRowIndex();

        menu.updateCommandStates([{
            id: TestStepsControl.TestStepCommands.CMD_MOVEUP,
            disabled: index <= 0 || index >= this._count - 1 || this._areMultipleStepsSelected() || this._isReadOnly()
        }
        ]);

        menu.updateCommandStates([{
            id: TestStepsControl.TestStepCommands.CMD_MOVEDOWN,
            disabled: index >= this._count - 2 || this._areMultipleStepsSelected() || this._isReadOnly()
        }
        ]);

        menu.updateCommandStates([{
            id: TestStepsControl.TestStepCommands.CMD_ADDATTACHMENT,
            disabled: testStep instanceof TMOM.SharedSteps || index >= this._count - 1 || this._areMultipleStepsSelected() || this._isReadOnly()
        }
        ]);

        menu.updateCommandStates([{
            id: TestStepsControl.TestStepCommands.CMD_INSERTSHAREDSTEPS,
            disabled: this._isSharedStepWorkItem || this._areMultipleStepsSelected() || this._isReadOnly()
        }
        ]);
        menu.updateCommandStates([
            {
                id: TestStepsControl.TestStepCommands.CMD_CREATESHAREDSTEP,
                disabled: !this._canCreateSharedStep() || this._isReadOnly()
            }
        ]);

        menu.updateCommandStates([{
            id: TestStepsControl.TestStepCommands.CMD_DELETE,
            disabled: index >= this._count - 1 || this._areMultipleStepsSelected() || this._isReadOnly()
        }
        ]);

        menu.updateCommandStates([{
            id: TestStepsControl.TestStepCommands.CMD_INSERTSTEP,
            disabled: this._areMultipleStepsSelected() || this._isReadOnly()
        }
        ]);
    }

    private _onContextMenuItemClick(e?: any) {
        /// <summary>executes upon executing a right click command from the context menu</summary>
        /// <param name="e" type="Object">event related info</param>
        let command = e.get_commandName(),
            rowIndex = this.getSelectedRowIndex();
        if (command === TestStepsControl.TestStepCommands.CMD_INSERTSTEP ||
            command === TestStepsControl.TestStepCommands.CMD_DELETE ||
            command === TestStepsControl.TestStepCommands.CMD_MOVEUP ||
            command === TestStepsControl.TestStepCommands.CMD_MOVEDOWN ||
            command === TestStepsControl.TestStepCommands.CMD_ADDATTACHMENT ||
            command === TestStepsControl.TestStepCommands.CMD_INSERTSHAREDSTEPS) {
            this._fireChange({
                rowIndex: rowIndex,
                changeType: command
            });
        }
        else if (command === TestStepsControl.TestStepCommands.CMD_CREATESHAREDSTEP) {
            this._fireChange({
                selectedRowIndexes: this._getSelectedRowsArray(),
                changeType: command
            });
        }
    }

    private _focusActionCell(rowIndex: number): JQuery {
        if (rowIndex >= 0 && rowIndex < this._count - 1) {
            return this._tryFocusActionCell(rowIndex);
        }
        return null;
    }

    private _tryFocusActionCell(rowIndex: number, force?: boolean): JQuery {
        let actionColumnIndex = this._columns.indexOf(this._actionColumn),
            gridCell = this.getRowInfo(rowIndex).row.find(".grid-cell").eq(actionColumnIndex),
            editableDiv = (gridCell).find("div").eq(0);
        if (editableDiv && (editableDiv.attr("contenteditable") === "true" || force)) {
            Utils_UI.tryFocus(editableDiv, 10);
        }
        return editableDiv;
    }

    private _focusSharedStepRow(rowIndex: number) {
        if (rowIndex >= 0 && rowIndex < this._count - 1) {
            Utils_UI.tryFocus(this.getRowInfo(rowIndex).row, 10);
        }
    }

    private _onInsertTestStepCompleted(e?) {
        let selectedIndex = this.getSelectedRowIndex();

        this.getSelectedRowIntoView(true);
        this._focusActionCell(selectedIndex);
        this._unbind("updateViewPortCompleted");
        Diag.logTracePoint("TestStepGrid.InsertNewTestStep.Complete");
    }

    private _onDeleteTestStepCompleted(e?) {
        this.getSelectedRowIntoView(true);
        this._unbind("updateViewPortCompleted");
        Diag.logTracePoint("TestStepGrid.DeleteTestStepUI.Complete");
    }

    private _onUpdateViewPortCompleted(e?) {
        // Seeting the focus on the the grid-focus element explicityly because of a bug in IE8, in which the focus went to grid-canvas and user could write text over there.
        // Bug 923196:WebAccess : IE8 : After saving a test step control goes out of the grid and allows user to enter text
        if (this.hasContentChanged) {

            // We need to bring the focus to the grid only on those scenarios when we are working on the grid, have made some changes and then we want to save/refresh. 
            // This is not needed when the test case is loaded in a work item form. This code was causing focus to shift to test steps grid when the test case loaded in
            // the work item pane. 
            this.focus(10);
            this.hasContentChanged = false;
        }
        this._unbind("updateViewPortCompleted");
    }

    public _updateRow(rowInfo, rowIndex, dataIndex, expandedState, level) {
        let row,
            rowElem,
            indentIndex,
            i,
            l,
            columns,
            column,
            cellValue$;

        indentIndex = this._indentIndex;
        row = rowInfo.row;
        row.empty();
        rowElem = row[0];

        // 8px is added at the end to accomodate margin that we add for test steps.
        rowElem.style.width = isNaN(this._contentSize.width) ? "" : (this._contentSize.width + 8) + "px";
        columns = this._columns;
        for (i = 0, l = columns.length; i < l; i++) {
            column = columns[i];
            if (column.hidden) {
                continue;
            }
            cellValue$ = column.getCellContents.apply(this, [rowInfo, dataIndex, expandedState, level, column, indentIndex, i]);
            if (cellValue$) {
                rowElem.appendChild(cellValue$[0]);
            }
        }

        this._updateRowSelectionStyle(rowInfo, this._selectedRows, this._selectedIndex);
    }

    public _onGridElementFocus(e?, element?) {
        super._onGridElementFocus(e, element);
        this._lastFocusedCellElement = element;
    }

    private _onCellChanged(e?) {
        let $cell, cellInfo, newData, stepCell, rowIndex, columnIndex, stepId, isEmptyInputText, inputText, testStep;

        $cell = $(e.target).closest(".grid-cell");
        cellInfo = $cell.data("cell-info");
        if (e && e.target && e.target === this._lastFocusedCellElement) {
            //so that calling notifyCellChanged multiple times dont result into anything if we have taken into account the blur of that cell 
            this._lastFocusedCellElement = null;
        }

        // cellInfo can be null only in case when Dom is refreshed and keyup event was called before that
        if (cellInfo) {
            newData = $(e.target).html();
            // Get the cell-info for the DIV which got blurred.
            rowIndex = cellInfo.rowInfo.dataIndex;
            columnIndex = cellInfo.columnInfo;
            stepId = cellInfo.stepId;
            isEmptyInputText = false;
            inputText = $(e.target).text();
            //Only on the blur of the cell, the style of the row should be updated to inactive. In case this function got called from keyup or paste, we do not want to make the row inactive.
            if (e.type === "blur") {
                this._onBlur();
            }

            //In case there has been no change in the text entered by the user compared to the source of the step list, 
            //we do not need to flush the change to the server.
            if (!this._hasCellContentChanged(e)) {
                return;
            }

            // Check whether the text entered by user is empty or just whitespaces.
            // Also deleting the non breaking space - U+00A0 to check whether the user has entered any text.
            inputText = inputText.replace(/^\s+/, "").replace(/\s+$/, "").replace(/^\xa0+/, "").replace(/\xa0+$/, "");
            if (inputText === "") {
                isEmptyInputText = true;
            }

            this._fireChange({
                rowIndex: rowIndex,
                columnIndex: columnIndex,
                newData: newData,
                stepId: stepId,
                changeType: TestStepsControl.TestStepCommands.CMD_EDIT,
                isEmptyInputText: isEmptyInputText
            });

            this.hasContentChanged = true;
        }
    }

    public notifyCellChanged() {
        if (this._lastFocusedCellElement && this._lastFocusedCellElement.contentEditable === "true") {
            this._onCellChanged({ "target": this._lastFocusedCellElement });
        }
    }

    private _hasCellContentChanged(e?) {
        let $cell = $(e.target).closest(".grid-cell"),
            cellInfo = $cell.data("cell-info"),
            rowIndex = cellInfo.rowInfo.dataIndex,
            columnIndex = cellInfo.columnInfo;
        if (this._options.source[rowIndex][columnIndex] === "<DIV>" + $(e.target).html() + "<\/DIV>") {
            return false;
        }

        return true;
    }

    private _onLastRowClicked(e?) {
        let rowIndex = this._dataSource.length - 1;
        this._fireChange({
            rowIndex: rowIndex,
            charCode: e.type !== "click" ? e.which : null,
            changeType: TestStepsControl.TestStepCommands.CMD_ADDSTEP
        });
    }

    private _focusSelectedElement() {
        //this is supposed to be called only after popup of attachment and shared close
        //As such if the current selection is shared step we focus it
        //else we focus the attachment column in the current row
        let index = this.getSelectedRowIndex(),
            $selectedRow,
            $attachmentElement,
            $attachmentColumn,
            step,
            attachmentcolumnIndex = $.inArray(this._attachmentColumn, this._columns);
        step = this._dataSource[index];
        $selectedRow = this._rows[index].row;

        if (step && step.ref) {// for shared steps
            Utils_UI.tryFocus($selectedRow, 10);
        }
        else {
            $attachmentColumn = $selectedRow.children().eq(attachmentcolumnIndex);
            if ($attachmentColumn) {
                $attachmentElement = $attachmentColumn.find("a").first();
                if ($attachmentElement.length > 0) {
                    Utils_UI.tryFocus($attachmentElement, 10);
                }
                else {
                    // Focus on the test step row.
                    this._focusActionCell(index);
                }
            }
        }
    }

    private _bindFocusEventToGridElement(element) {
        $(element).bind("focus", (e) => {
            this._onGridElementFocus(e, element);
        });
    }

    public _drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
        let attachmentCount, cellinfo,
            $cellContent,
            cell = super._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder),
            step = this._dataSource[dataIndex],
            isLastRow = (dataIndex === this._dataSource.length - 1),
            stepCell = { stepId: step.id, column: column.index },
            $attachmentContent: JQuery,
            value;
        if (column.index === "stepId") {
            cell.attr("title", null);
        }
        else if (column.index === "action" && step && step.ref) {
            value = this.getColumnText(dataIndex, column, columnOrder);
            this.handleSharedStep(rowInfo, cell, value);
        }
        else if (column.index === "action" && step) {
            this._addHtmlContentToCell(cell, step.action, isLastRow, step.hasActionError(), step.isFormatted);
        }
        else if (column.index === "expectedResult" && step && !step.ref) {
            this._addHtmlContentToCell(cell, step.expectedResult, isLastRow, step.hasExpectedResultError(), step.isFormatted);
        }
        else if (column.index === "attachments") {
            attachmentCount = step.getAttachmentCount();
            if (attachmentCount > 0) {
                //remove the non-breaking space added
                cell.text("");
                $attachmentContent = this._createAttachmentContent(step, column.width);
                cell.append($attachmentContent);
                this._bindFocusEventToGridElement($attachmentContent);
            }
        }
        
        // Update the source for the step list for action and expectedResult column with what is being displayed to the user.
        // While drawing the cells for these columns we do some customizations(like adding nbsp and empty p tags) so we need to update the source back.
        if (step && (column.index === "action" || (column.index === "expectedResult" && !step.ref))) {
            this._dataSource[dataIndex][column.index] = "<DIV>" + $(cell.children()[0]).html() + "</DIV>";
        }
        cellinfo = { rowInfo: rowInfo, columnInfo: column.index, stepId: step.id };
        // Add cell-info as it is needed while saving the edits done in the cells.
        cell.data("cell-info", cellinfo);
        cell.addClass("propagate-keydown-event");
        cell.attr("role", "gridcell");
        return cell;
    }

    private _createAttachmentContent(testStep: TMOM.TestStep, columnWidth: number): JQuery {
        let i: number = 0,
            attachment: WITOM.Attachment,
            stepAttachments: WITOM.Attachment[] = testStep.getAttachments(),
            attachmentCount: number = stepAttachments.length,
            $attachmentContent: JQuery,
            attachmentSizeText: string,
            attachmentText: string,
            attachmentColumnWidth: number = Math.round(columnWidth) || 20,
            deleteAttachmentArgs: any = {},
            $tr: JQuery,
            $attachmentLink: JQuery,
            $deleteIcon: JQuery;

        $attachmentContent = $("<table />").addClass("attachment-content");
        $attachmentContent.css("width", attachmentColumnWidth);
        for (i = 0; i < attachmentCount; i++) {

            attachment = stepAttachments[i];
            attachmentSizeText = Utils_String.format(Resources.TestStepAttachmentSizeFormat, Math.ceil(attachment.getLength() / 1024));
            attachmentText = Utils_String.format("{0} {1}", attachment.getName(), attachmentSizeText);
            $attachmentLink = $("<a />").attr("tabindex", 0)
                .addClass("attachment-column-text")
                .text(attachmentText)
                .bind("click keydown", delegate(this, this._onAttachmentClick, attachment));
            RichContentTooltip.addIfOverflow(attachmentText, $attachmentLink);

            deleteAttachmentArgs = { "attachment": attachment, "testStep": testStep };
            $deleteIcon = $("<span />").addClass("bowtie-icon bowtie-edit-delete attachment-delete-icon")
                .attr("aria-label", WITResources.DeleteAttachment)
                .attr("tabindex", 0)
                .bind("click keydown", delegate(this, this._onAttachmentDeleteClick, deleteAttachmentArgs));
            RichContentTooltip.add(WITResources.DeleteAttachment, $deleteIcon);

            if ($deleteIcon) {
                attachmentColumnWidth = attachmentColumnWidth - 24;
            }

            $tr = $("<tr />").append($("<td />").append($attachmentLink).css("width", attachmentColumnWidth));
            if ($deleteIcon) {
                $tr.append($("<td />").append($deleteIcon));
            }

            $attachmentContent.append($tr);
        }
        return $attachmentContent;
    }

    public _layoutContentSpacer() {
        let width = 0,
            i,
            l,
            columns = this._columns,
            scrollTop, scrollLeft;

        for (i = 0, l = columns.length; i < l; i++) {
            if (columns[i].hidden) {
                continue;
            }
            width += (columns[i].width || 20) + this._cellOffset;
        }

        this._ignoreScroll = true;
        try {
            scrollTop = Math.max(0, this._scrollTop);

            if (scrollTop !== this._scrollTop) {
                this._scrollTop = scrollTop;
                this._canvas[0].scrollTop = scrollTop;
            }

            scrollLeft = Math.max(0, Math.min(this._scrollLeft, width - this._canvasWidth));

            if (scrollLeft !== this._scrollLeft) {
                this._scrollLeft = scrollLeft;
                this._canvas[0].scrollLeft = scrollLeft;
            }
        } finally {
            this._ignoreScroll = false;
        }

        this._contentSize.width = width;
    }

    private _onAttachmentDeleteClick(e: JQueryEventObject, args: any): void {
        if ((e.type === "keydown" && e.which === Utils_UI.KeyCode.ENTER) ||
            e.type === "click") {
            let testStep: TMOM.TestStep = args.testStep,
                attachment: WITOM.Attachment = args.attachment,
                rowInfo: any,
                isItemRemoved: boolean;
            if (testStep && attachment) {
                isItemRemoved = testStep.deleteAttachment(attachment);
            }
            if (isItemRemoved) {
                rowInfo = this._getRowInfoFromEvent(e, ".grid-row");
                if (rowInfo) {
                    this._updateRow(rowInfo, rowInfo.rowIndex, rowInfo.dataIndex, null, null);
                }

                this._focusSelectedElement();
            }
        } else if (e.type === "keydown" && e.which === Utils_UI.KeyCode.TAB) {
            this._onCellTabKey(e);
        }
    }

    private _onAttachmentClick(e: JQueryEventObject, attachment: WITOM.Attachment): any {
        /// <param name="e" type="JQueryEvent" optional="true"/>
        /// <returns type="any" />
        if ((e.type === "keydown" && e.which === Utils_UI.KeyCode.ENTER) ||
            e.type === "click") {
            if (attachment) {
                attachment.open();
            }
        } else if (e.type === "keydown" && e.which === Utils_UI.KeyCode.TAB) {
            this._onCellTabKey(e);
        }
    }

    private _bindEventsToCell(cell, cellData, isLastRow) {
        if (isLastRow) {
            
            cell.addClass("test-steps-lastrow");
            // this is action cell , bind enter key press event.
            // last cell content is added in our program, so cellData for expected cell column will be empty.
            if (!this._isReadOnly()) {
               $(cell).bind("click", delegate(this, this._onLastRowClicked));
               if (cellData !== "") {
                  $(cell).bind("keypress", delegate(this, this._fireLastRowClickedIfNeeded));
               }
            }
        }
        else {
            // Bind blur event with the contentEditable DIV present in the Action cell.
            $(cell.children()[0]).bind("blur", (e) => {
                if (this._lastFocusedCellElement) {
                    this.cancelDelayedFunction("updateTestSteps");
                    this._onCellChanged(e);
                }

            });

            // to handle bold/italic/underline functionality in IE/EDGE
            $(cell.children()[0]).bind("mousedown", function (e) {
                if (!e.ctrlKey && !e.shiftKey) {
                    e.stopPropagation();
                    $(e.currentTarget).focus(10);
                }
            });

            $(cell.children()[0]).bind("keydown", (e: JQueryEventObject) => {
                return this._onCellKeyDown(e);
            }).bind("keypress", (e: JQueryEventObject) => {
                return this.handleKeyPress(e);
            });
        }

        if (cell.children()[0]) {
            this._bindFocusEventToGridElement(cell.children()[0]);
        }
    }

    // Firefox raises key press event even on TAB
    // So we need to check the keycode before calling onLastRowClicked
    private _fireLastRowClickedIfNeeded(e?: JQueryEventObject) {
        if (e.keyCode !== Utils_UI.KeyCode.TAB) {
            this.layout();
            this._onLastRowClicked(e);
        }
    }

    private handleKeyPress(e?: JQueryEventObject) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER &&
            !e.shiftKey && !e.ctrlKey && !e.altKey) {
            this._handleEnterKey(e);
        }
    }

    private _onCellKeyDown(e?: JQueryEventObject) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER && e.shiftKey) {
            this._handleEnterKeyWithShift(e);
        }
        else if (e.keyCode === Utils_UI.KeyCode.TAB) {
            this._onCellTabKey(e);
        }
        else if (e.keyCode === Utils_UI.KeyCode.UP) {
            // We don't want the focus to go to the header
            if (this._selectedIndex === 0) {
                e.preventDefault();
                e.stopPropagation();
            }
        } else if (e.keyCode !== Utils_UI.KeyCode.ESCAPE && e.keyCode !== Utils_UI.KeyCode.DOWN){
            this.handleShortCutKeys(e);
        }
    }

    public _onCellTabKey(e?: JQueryEventObject) {
        if (e.shiftKey) {
            this._onLeftKey(e);
        } else {
            this._onRightKey(e);
        }
        e.preventDefault();
        e.stopPropagation();
    }

    private handleShortCutKeys(e?: JQueryEventObject) {

        if (e.altKey && e.keyCode === 80) {//Alt + P
            this._fireChange({
                rowIndex: this.getSelectedRowIndex(),
                changeType: TestStepsControl.TestStepCommands.CMD_INSERTSTEP
            });
            e.stopPropagation();
        }
        else if (Utils_UI.KeyUtils.isExclusivelyCtrl(e) && (String.fromCharCode(e.keyCode).toLowerCase() === "s")) { // Ctrl +S, Focus out the current cell.
            this.notifyCellChanged();
        } else {
            e.stopPropagation();
        }
    }

    private _handleEnterKeyWithShift(e?: JQueryEventObject): any {
        let rowInfo: any;
        if (this._dataSource[this.getSelectedRowIndex()].actionType === TMOM.TestActionTypes.SharedSteps) {
            this._onOpenSharedStep();
        }
        else {
            Utils_UI.HtmlInsertionUtils.pasteHtmlAtCaret("<br />");

            //bring the new line into view
            this._alignRowBottom(this.getSelectedRowIndex());
        }

        e.stopPropagation();
        e.preventDefault();
    }

    private _handleEnterKey(e?: JQueryEventObject): any {
        if (!e.shiftKey && !e.ctrlKey && !e.altKey && !this._isReadOnly()) {
            if (this.getSelectedRowIndex() === this._count - 1) {
                this._onLastRowClicked(e);
            }
            else if (this.getSelectedRowIndex() === this._count - 2) {
                this._onCellChanged(e);
                this._onLastRowClicked(e);
            }
            else {
                this.setSelectedRowIndex(this.getSelectedRowIndex() + 1);

                // in case newly selected step is shared step set focus on that row
                if (this._dataSource[this.getSelectedRowIndex()].actionType === TMOM.TestActionTypes.SharedSteps) {
                    this._focusSharedStepRow(this.getSelectedRowIndex());
                }
                else {
                    this._focusActionCellAndSetCaretPosition(e);
                }
            }

            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _onTabSharedStepInLastRow(e?: JQueryEventObject) {
        this._onCellChanged(e);
        this.setSelectedRowIndex(this.getSelectedRowIndex() + 1);
        this._tryFocusActionCell(this.getSelectedRowIndex(), true);
        e.stopPropagation();
        e.preventDefault();
    }

    public _onKeyDown(e?: JQueryEventObject): any {
        /// <param name="e" type="JQueryEvent" />
        /// <returns type="any" />

        if (e.keyCode === Utils_UI.KeyCode.ENTER && e.shiftKey) {
            this._handleEnterKeyWithShift(e);
        }
        else if (e.keyCode === Utils_UI.KeyCode.ENTER && !e.shiftKey && !e.ctrlKey && !e.altKey) {
            this._handleEnterKey(e);
        } else if (e.keyCode === Utils_UI.KeyCode.UP) {
            // We don't want the focus to go to the header
            if (this._selectedIndex !== 0) {
                super._onKeyDown(e);
            }
        }
        else {
            this.handleShortCutKeys(e);
            super._onKeyDown(e);
        }
    }

    private _onOpenSharedStep() {
        let testStep = this.getSelectedItem();

        if (testStep && testStep.ref) {
            Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
                id: testStep.ref,
                tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
                options: {
                    close: (workItem) => {
                        this._focusSelectedElement();
                    }
                }
            }, null));
        }
    }

    private _addHtmlContentToCell(cell, data, isLastRow, hasErrors, isFormatted) {
        let innerHtml = /^<DIV>([\S\s]*?)<\/DIV>$/.exec(data),
            cellData,
            modifiedHtml,
            lines,
            $normalizedHtml,
            celltext,
            isContentEditable = true;

        if (isContentEditable) {
            isContentEditable = !this._isReadOnly();
        }

        if (innerHtml !== null) {
            cellData = innerHtml[1];
        }
        else {
            cellData = data;
        }

        if (!isFormatted) {
            // This is not formatted. That means these are test steps created from Dev10 SP1. Ensure
            // that we show test steps with new line properly by replacing newlines with break.
            cellData = cellData.replace(/\r\n/g, "<br />");
            cellData = cellData.replace(/\n/g, "<br />");
        }

        $normalizedHtml = $("<div>" + HtmlNormalizer.normalize(cellData) + "</div>");

        lines = $normalizedHtml.find("p");
        // If there are no p tags then put one because without any p tag some browsers add divs instead of p tags for newlines.
        if (lines.length === 0) {
            if ($normalizedHtml.text().trim().length === 0) {
                celltext = "&nbsp;";
            }
            else {
                celltext = $normalizedHtml.html();
            }
            $normalizedHtml.html("<p>" + celltext + "</p>");
        }
        //replace empty  <p> tags with line breaks as each p tag corresponds to a new line and empty p tag do not cause line break
        else {
            lines.each(function () {
                if ($(this).text().trim().length === 0) {
                    $(this).html("&nbsp;");
                }
            });
        }

        //added margin and removed  padding from the container's style because there's a bug with IE which doesnt render padding inside 
        //overflowing divs properly 
        //refer: stackoverflow.com/questions/10722367/bottom-padding-not-working-on-overflow-element-in-non-chrome-browsers
        //and : stackoverflow.com/questions/6749734/ie9-div-padding-issue
        //bug no 894586

        // set explicit tabindex for action column because otherwise the grid control doesn't treat them as actionable items
        modifiedHtml = Utils_String.format("<DIV class=\"propagate-keydown-event\" contenteditable=\"{0}\" tabindex=\"{1}\" STYLE=\"margin:4px;word-wrap:break-word;white-space:pre-wrap;\">{2}</DIV>", (isContentEditable && !isLastRow), 0, $normalizedHtml.html());

        cell.html(modifiedHtml);

        // bind the events to the cell
        this._bindEventsToCell(cell, cellData, isLastRow);

        //Update the styles and tooltip for the cell
        cell.addClass("test-steps-multiline");
    }

    public restoreCellData(rowIndex: number, column: string) {
        // Resets the html of the cell from the OM.
        let index = this.getSelectedRowIndex(),
            $row: JQuery,
            $editableDiv: JQuery,
            $column: JQuery,
            step: TMOM.TestStep,
            columnIndex: number,
            htmlString: string;

        step = this._dataSource[rowIndex];
        $row = this._rows[rowIndex].row;
        if (column === "action") {
            columnIndex = $.inArray(this._actionColumn, this._columns);
            htmlString = HtmlNormalizer.normalize(step.action);
        }
        else if (column === "expectedResult") {
            columnIndex = $.inArray(this._expectedResultColumn, this._columns);
            htmlString = HtmlNormalizer.normalize(step.expectedResult);
        }
        $column = $row.children().eq(columnIndex);
        if ($column) {
            $editableDiv = $column.children().eq(0);
            if ($editableDiv) {
                $editableDiv.html(htmlString);
            }
        }
    }

    private _getSelectedRowsArray(): number[] {
        let selectedRowIndexArray: number[] = [],
            property: any,
            selectedRows = this._selectedRows,
            i = 0;

        for (property in selectedRows) {
            if (selectedRows.hasOwnProperty(property)) {
                selectedRowIndexArray[i] = selectedRows[property];
                i++;
            }
        }

        return selectedRowIndexArray;
    }

    private _canCreateSharedStep(): boolean {
        let selectedRowIndexArray: number[] = this._getSelectedRowsArray();

        return (!this._selectedStepsContainSharedStep() &&
            this._isStepsSelectionContiguous() &&
            !this._isSharedStepWorkItem &&
            (selectedRowIndexArray.length > 1 || selectedRowIndexArray[0] < this._count - 1));
    }

    private _areMultipleStepsSelected(): boolean {
        return this._getSelectedRowsArray().length > 1;
    }

    private _selectedStepsContainSharedStep(): boolean {
        let i: number,
            selectedRowIndexArray: number[] = this._getSelectedRowsArray(),
            selectedRowCount: number = selectedRowIndexArray.length;

        for (i = 0; i < selectedRowCount; i++) {
            if (this._dataSource[selectedRowIndexArray[i]].actionType === TMOM.TestActionTypes.SharedSteps) {
                return true;
            }
        }

        return false;
    }

    private _isStepsSelectionContiguous(): boolean {
        let rowIndex: number,
            selectedRowIndexArray: number[] = this._getSelectedRowsArray(),
            i: number = 0,
            selectedRowsCount: number = selectedRowIndexArray.length;

        if (selectedRowsCount > 0) {
            //sorting in ascending order
            selectedRowIndexArray.sort((a, b) => {
                return a - b;
            });
            rowIndex = selectedRowIndexArray[0];

            for (i = 0; i < selectedRowsCount; i++) {
                if (selectedRowIndexArray[i] !== rowIndex) {
                    return false;
                }

                rowIndex++;
            }
        }

        return true;
    }
}

VSS.initClassPrototype(TestStepList, {
    currentCellContents: null,
    editTimer: null
});

VSS.classExtend(TestStepList, TFS_Host_TfsContext.TfsContext.ControlExtensions);

export class SharedParamMappingCombo extends Combos.Combo {
    public onShowDropPopup: () => void;
    public onHideDropPopup: () => void;

    public hideDropPopup(): any {
        super.hideDropPopup();
        if (this.onHideDropPopup) {
            this.onHideDropPopup();
        }
    }

    public toggleDropDown() {
        super.toggleDropDown();
        if (this.getBehavior().isDropVisible()) {
            if (this.onShowDropPopup) {
                this.onShowDropPopup();
            }
        }
        else {
            if (this.onHideDropPopup) {
                this.onHideDropPopup();
            }
        }
    }
}

export class TestParameterList extends NonVirtualizedListView {

    public testCase: TMOM.TestCase = null;
    public static enhancementTypeName: string = "tfs.wit.testParameterList";
    private _hasLastRowChanged: boolean = false;
    private _parameters: string[];
    private _lastFocusedHeaderElement: HTMLElement = null;
    private _lastFocusedCell: HTMLElement = null;
    private _isSharedStepWorkItem: boolean = false;
    private _$sharedParameterWorkItemHyperlink: JQuery;
    private _$sharedParamDataSetParamNames: JQuery;
    private _sharedParameterCreationHelper: TMUtils.SharedParameterCreationHelper;
    private _$linksForTestCaseHavingSharedParams: JQuery;
    private _$linksForTestCaseHavingLocalParams: JQuery;
    private _$sharedParamHyperlinksContainer: JQuery;
    private _readOnlyDelegate: () => void;

    constructor(options?) {
        /// <summary>Creates new Test Step Paramter Control</summary>

        super(options);

	    this._readOnlyDelegate = options.readOnlyDelegate;
    }

    public setSelectedSharedParameter(sharedParameterModel: TMOM.ISharedParameterDataSetModel) {
        this.testCase.changeSharedParameterDataSetLinks(sharedParameterModel.id);
        this._setTestcaseParameterDataField(sharedParameterModel, this.testCase.getParameters(), () => {
            if (this.onChangeSharedParameter) {
                this.onChangeSharedParameter();
            }
        });
    }

    public onRenameParameter: (oldParamName: string, newParamName: string, uniqueId: number) => void;

    public onDeleteParameter: (paramName: string) => void;

    public canDeleteParameter: (paramName: string) => boolean;

    public canRenameParameter: (paramName: string) => boolean;

    public doesParamNameExist: (paramName: string) => boolean;

    public onChangeSharedParameter: () => void;

    public onChangeSharedParameterMappings: () => void;

    public _onHeaderDblClick(e?: JQueryEventObject): any {
        if (this._isReadOnly()) {
            return;
        }

        // On double clicking the header, show a text area where the parameter name can be renamed.
        if (!$(e.target).hasClass("editable-param-name")) {
            let $headerTitleDiv: JQuery = $(e.target).closest(".grid-header-column div.title"),
                text: string = $headerTitleDiv.text(),
                $editableSection: JQuery = $(e.target).parent().find(".editable-param-name");

            if (this.canRenameParameter && this.canRenameParameter(text)) {
                // Hide the div showing the param name.
                $headerTitleDiv.hide();

                // Lazy creation for the editable box for the param name editing
                if ($editableSection.length <= 0) {
                    $headerTitleDiv.before("<input type='text' class='editable-param-name title'>");
                }

                $editableSection = $(e.target).parent().find(".editable-param-name");
                this._lastFocusedHeaderElement = $editableSection[0];

                $editableSection.prop("value", text)
                    .show()
                    .focus()
                    .removeClass("parameter-name-invalid")
                    .bind("blur", (e) => { this._onEditableHeaderBlur(e); })
                    .bind("keyup", (e) => { this._onEditableHeaderKeyUp(e); })
                    .bind("keydown", (e) => { this._onEditableHeaderKeyDown(e); });

                TMUtils.setTextSelection($editableSection[0], 0, text.length);
            }
        }
    }

    public _onHeaderClick(e?: JQueryEventObject): any {
        //do nothing. Override Grid.ListView's _onHeaderClick

    }

    public _onParamsComboBlur(e: JQueryEventObject): any {
        let $combo = $(e.target).closest(".combo");

        if ($combo.length > 0 && $combo.hasClass("invalid")) {
            if (this.onChangeSharedParameter) {
                this.onChangeSharedParameter();
            }
        }
    }

    public _drawHeaderCellValue(column: any): JQuery {
        let cell = super._drawHeaderCellValue(column),
            $cellElement = $("<div/>"),
            paramsCombo: any,
            parameters: string[],
            selectedParamMapping: string,
            maxLength: number,
            sharedParamDataSet: TMOM.SharedParameterDataSet = null;

        // TODO: For the on-premise projects which have not enabled the Shared Parameters, we need to handle here.
        if (!this._isSharedStepWorkItem) {
            if (this.testCase) {
                sharedParamDataSet = this.testCase.getSharedParameterBeingUsed();
            }
            if (sharedParamDataSet) {
                paramsCombo = <SharedParamMappingCombo>Controls.BaseControl.createIn(SharedParamMappingCombo, $cellElement, {
                    change: (sender) => {
                        this._parameterMappingChanged(sender, column.index);
                        //Hack for IE where the dropdowns become transparent and both the dropdown and the background are visible.                
                        if (Utils_UI.BrowserCheckUtils.isIE()) {
                            $(".shared-parameter.test-parameter-list .grid-canvas").css("overflow", "auto");
                        }
                    }
                });
                this._bind(paramsCombo._input, "blur", delegate(this, this._onParamsComboBlur));
                //Hack for IE where the dropdowns become transparent and both the dropdown and the background are visible.
                if (Utils_UI.BrowserCheckUtils.isIE()) {
                    paramsCombo.onShowDropPopup = () => { $(".shared-parameter.test-parameter-list .grid-canvas").css("overflow", "hidden"); };
                    paramsCombo.onHideDropPopup = () => { $(".shared-parameter.test-parameter-list .grid-canvas").css("overflow", "auto"); };
                }
                maxLength = WITOM.WorkItem.MAX_TITLE_LENGTH;
                $("input", paramsCombo.getElement()).attr("maxlength", maxLength);

                parameters = Utils_Array.clone(sharedParamDataSet.getParameters());

                while (Utils_Array.remove(parameters, "")) { }
                paramsCombo.setSource(parameters);
                selectedParamMapping = this.testCase.getParametersDataInfo().getParameterNameMappings()[column.index];
                if (!Utils_Array.contains(parameters, selectedParamMapping, Utils_String.localeIgnoreCaseComparer)) {
                    selectedParamMapping = "";
                }
                paramsCombo.setText(selectedParamMapping);

                $cellElement.append(cell);
                return $cellElement;
            }
        }
        return cell;
    }

    public flushUI() {
        if (this._lastFocusedHeaderElement) {
            this._onEditableHeaderBlur({ "target": this._lastFocusedHeaderElement });
        }

        if (this._lastFocusedCell) {
            this._onEndCellEdit({ "target": this._lastFocusedCell });
        }
    }

    public layout() {
        // After the rows and header has been drawn, create a delete button for each column header which will appear only on hover.
        let i: number,
            $headers: JQuery,
            length: number,
            paramName: string,
            $paramDeleteIcon: JQuery,
            $gridHeader: JQuery,
            deleteParamArgs: any = {};

        if (this._lastFocusedHeaderElement) {
            this._onEditableHeaderBlur({ "target": this._lastFocusedHeaderElement });
        }
        if (this._lastFocusedCell) {
            this._onEndCellEdit({ "target": this._lastFocusedCell });
        }
        super.layout();

        $gridHeader = this._element.find(".grid-header");
        $gridHeader.css("-moz-user-focus", "inherit");
        $headers = this._element.find(".grid-header-column");
        length = $headers.length;
        for (i = 0; i < length; i++) {
            paramName = $($headers[i]).find(".title").text();
            deleteParamArgs = { paramName: paramName };
            if (this.canDeleteParameter && this.canDeleteParameter(paramName) && !this._isReadOnly()) {
                $paramDeleteIcon = $("<span class = \"bowtie-icon bowtie-edit-delete parameter-delete-icon\" title =" + Resources.DeleteParameter + "></span>");
                $paramDeleteIcon.bind("click", delegate(this, this._onParameterDeleteClick, deleteParamArgs));
                $($headers[i]).find("div.title").append($paramDeleteIcon);
            }
        }
        this.updateReadWriteMode();
    }

    public updateReadWriteMode() {
        if (this._isReadOnly() || (this.testCase && this.testCase.isUsingSharedParameters())) {
            $(this._element.find(".parameter-grid-cell")).attr("readonly", "true");
        }
        else {
            $(this._element.find(".parameter-grid-cell")).removeAttr("readonly");
        }
    }

    private _openSharedParameterCreateDialog(options?: any) {
        Dialogs.show(SharedParameterCreateDialog, {
            okCallback: (title: string) => {
                Diag.logTracePoint("TestManagement.SharedParameterCreateDialog.Start");
                let length: number = this._dataSource.length;
                if (length > 0 && TMUtils.ParametersHelper.isEmptyRow(this._dataSource[length - 1], this._parameters)) {
                    this._dataSource.splice((length - 1), 1);
                }
                let projectId = this._getProjectId();
                this._sharedParameterCreationHelper = new TMUtils.SharedParameterCreationHelper(projectId);
                this._sharedParameterCreationHelper.createSharedParameter(title, this._parameters, this._dataSource, this.testCase,
                    Utils_String.empty,
                    (workItem: WITOM.WorkItem) => {
                        Diag.logTracePoint("TestManagement.CreateSharedParameterDataSet.Complete");
                        this._updateLocalParameterToSharedAfterConvert(workItem);
                        Diag.logTracePoint("TestManagement.SharedParameterCreateDialog.Complete");
                    },
                    (error) => {
                        alert(VSS.getErrorMessage(error));
                    });
            }
        });
    }

    private _isReadOnly(){
        if (!$.isFunction(this._readOnlyDelegate)){
            return false;
        }
        return this._readOnlyDelegate();
    }

    private _getProjectId(): string{
        let projectId: string;
        if (this.testCase){
            projectId = this.testCase.getProjectId();
        }
        else{
            projectId = TMUtils.ProjectUtil.getProjectIdFromContext();
        }
        return projectId;
    }

    private _updateLocalParameterToSharedAfterConvert(workItem: WITOM.WorkItem) {
        let sharedParameter: TMOM.ISharedParameterDataSetModel = new TMOM.ISharedParameterDataSetModel,
            parameterXmlString: string = workItem.getFieldValue(TCMConstants.WorkItemFieldNames.Parameters);
        sharedParameter.id = workItem.id;
        sharedParameter.title = workItem.getTitle();
        if (parameterXmlString) {
            sharedParameter.sharedParameterDataSet = TMUtils.ParametersHelper.parseSharedParameterDataSet($($.parseXML(workItem.getFieldValue(TCMConstants.WorkItemFieldNames.Parameters))));
        }
        this.setSelectedSharedParameter(sharedParameter);
    }

    private _openSharedParameterSearchDialog(options?: any) {
        Dialogs.show(SharedParameterSearchDialog, {
            okCallback: (sharedParameter: TMOM.ISharedParameterDataSetModel) => {
                this.setSelectedSharedParameter(sharedParameter);
            },
            projectId: this._getProjectId()
        });
    }

    private _updateSharedParameterUI(sharedParamDataSet: TMOM.SharedParameterDataSet) {
        let parameters: string[],
            paramNames: string[],
            workitemHyperlinkText: string,
            paramNamesString: string,
            sharedParamId: number,
            sharedParamUrl: string;

        if (this._$sharedParamHyperlinksContainer && this._$sharedParamHyperlinksContainer.length > 0) {
            this._$sharedParamHyperlinksContainer.show();
        }
        else {
            this._prependSharedParameterHyperlinks(this._element);
        }
        this._updateSharedParamHyperlinks((sharedParamDataSet !== null && sharedParamDataSet !== undefined));
        if (sharedParamDataSet) {
            parameters = Utils_Array.clone(sharedParamDataSet.getParameters());
            while (Utils_Array.remove(parameters, "")) { }
            paramNames = $.map(parameters, function (val, i) {
                if (val !== "") {
                    return "@" + val;
                }
            });
            paramNamesString = paramNames.join(" ");
            this._$sharedParamDataSetParamNames.text(paramNamesString);
            sharedParamId = this.testCase.getSharedParameterDataSetIdBeingUsed();
            workitemHyperlinkText = Utils_String.format(Resources.SharedParamaterUsedInTestCaseTitle, sharedParamId.toString(), this.testCase.getSharedParameterDataSetTitle());

            let query: string = Utils_String.format("Select [{0}] FROM WorkItems where {1} = '{2}'",
                WITConstants.CoreFieldRefNames.TeamProject,
                WITConstants.CoreFieldRefNames.Id,
                sharedParamId);

            TMUtils.WorkItemUtils.beginQuery(query, (data) => {
                let projectName: string;
                if (data.payload && data.payload.rows.length > 0) {
                    let index: number = $.inArray(WITConstants.CoreFieldRefNames.TeamProject, data.payload.columns);
                    projectName = data.payload.rows[0][index];
                    sharedParamUrl = TMUtils.UrlHelper.getSharedParametersUrl(sharedParamId, false, projectName);
                }
                else {
                    sharedParamUrl = TMUtils.UrlHelper.getSharedParametersUrl(sharedParamId, false);
                }

                this._$sharedParameterWorkItemHyperlink.text(workitemHyperlinkText).attr("href", sharedParamUrl);
            }, () => {}, this._getProjectId());
        }
    }

    private _hideSharedParameterUI() {
        if (this._$sharedParamHyperlinksContainer && this._$sharedParamHyperlinksContainer.length > 0) {
            this._$sharedParamHyperlinksContainer.hide();
        }
    }

    private _showAddSharedParameterWarning(): boolean {
        let length: number = this._dataSource.length;
        if (this._parameters.length === 0 || length === 0) {
            return false;
        }
        // If there is only one empty row in param grid
        if (length === 1 && TMUtils.ParametersHelper.isEmptyRow(this._dataSource[0], this._parameters)) {
            return false;
        }
        return true;
    }

    private _prependSharedParameterHyperlinks($paramGridContainer: JQuery) {
        let $div: JQuery = $(domElem("div", "shared-param-hyperlinks-container")),
            $paramGridParent = $paramGridContainer.parent();

        $div.append($("<a class='add-shared-param-hyperlink'>").text(Resources.AddFromSharedParameter).attr("tabIndex", "0").attr("role", "button")
            .bind("click keydown", delegate(this, this._onAddSharedParameterClick)))

            .append($("<a target='_blank' rel='nofollow noopener noreferrer' class='shared-param-workitem-hyperlink'>").attr("tabIndex", "0"))
            .append($("<span class='shared-param-paramnames'></span>"))
            .append($("<span class='separator'></span>"))

            .append($("<a class='change-shared-param-hyperlink'>").text(Resources.ChangeSharedParameter).attr("tabIndex", "0").attr("role", "button")
                .bind("click keydown", delegate(this, this._onChangeSharedParameterClick)))

            .append($("<a class='remove-shared-param-hyperlink'>").text(Resources.RemoveSharedParameter).attr("tabIndex", "0").attr("role", "button")
                .bind("click keydown", delegate(this, this._onRemoveSharedParameterClick)))

            .append($("<a class='convert-to-shared-param-hyperlink'>").text(Resources.ConvertToSharedParameter).attr("tabIndex", "0").attr("role", "button")
                .bind("click keydown", delegate(this, this._onConvertSharedParameterClick)));

        if (this._isReadOnly()){
            $div.addClass("disable-links");
        }
        $paramGridContainer.before($div);
        
        this._$sharedParamHyperlinksContainer = $paramGridParent.find(".shared-param-hyperlinks-container");
        this._$sharedParameterWorkItemHyperlink = $paramGridParent.find(".shared-param-workitem-hyperlink");
        this._$sharedParamDataSetParamNames = $paramGridParent.find(".shared-param-paramnames");
        this._$linksForTestCaseHavingSharedParams = $([$paramGridParent.find(".change-shared-param-hyperlink")[0], $paramGridParent.find(".remove-shared-param-hyperlink")[0], $paramGridParent.find(".shared-param-workitem-hyperlink")[0], $paramGridParent.find(".shared-param-paramnames")[0]]);
        this._$linksForTestCaseHavingLocalParams = $([$paramGridParent.find(".add-shared-param-hyperlink")[0], $paramGridParent.find(".convert-to-shared-param-hyperlink")[0]]);
    }

    private _updateSharedParamHyperlinks(testCaseHasSharedParam: boolean) {
        let $paramGridParent: JQuery = this._element.parent();
        if (!testCaseHasSharedParam) {
            this._element.removeClass("shared-parameter");
            this._$linksForTestCaseHavingLocalParams.css("display", "inline-block");
            this._$linksForTestCaseHavingSharedParams.css("display", "none");
        }
        else {
            this._element.addClass("shared-parameter");
            this._$linksForTestCaseHavingLocalParams.css("display", "none");
            this._$linksForTestCaseHavingSharedParams.css("display", "inline-block");
        }
    }

    private _onAddSharedParameterClick(e: JQueryEventObject) {
        if (TMUtils.isClickOrEnterKeyDownEvent(e) && !this._isReadOnly()) {
            if (!this._showAddSharedParameterWarning() || confirm(Resources.AddSharedParameterWarning)) {
                this._openSharedParameterSearchDialog();
            }
            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _onChangeSharedParameterClick(e: JQueryEventObject) {
        if (TMUtils.isClickOrEnterKeyDownEvent(e)) {
            this._openSharedParameterSearchDialog();
            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _onRemoveSharedParameterClick(e: JQueryEventObject) {
        if (TMUtils.isClickOrEnterKeyDownEvent(e)) {
            if (confirm(Resources.RemoveSharedParameterWarning)) {
                this._removeSharedParameter();
            }
            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _onConvertSharedParameterClick(e: JQueryEventObject) {
        if (TMUtils.isClickOrEnterKeyDownEvent(e) && !this._isReadOnly()) {
            this._openSharedParameterCreateDialog();
            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _removeSharedParameter(): void {
        // Copy the shared parameter mapped data to local parameter data of the testcase.
        // The object model for the testcase parameter data is already populated with the data, we just need to save it in xml format in presave.
        this.testCase.removeSharedParameterDataSet();
        if (this.onChangeSharedParameter) {
            this.onChangeSharedParameter();
        }
    }

    private _onParameterDeleteClick(e: JQueryEventObject, args: any) {
        let paramName: string = args.paramName;
        if (this.onDeleteParameter) {
            this.onDeleteParameter(paramName);
        }
    }

    public setIsSharedStepWorkItem(value: boolean) {
        let data: any[] = [];

        this._isSharedStepWorkItem = value;
        if (this._options.source.length > 0) {
            data = [this._options.source[0]];
        }
        this.setSource(this._parameters, data);
    }

    public initialize() {
        super.initialize();
    }
    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />
        let contextMenu: any;
        contextMenu = {
            items: delegate(this, this._getContextMenuItems),
            updateCommandStates: delegate(this, this._updateContextMenuCommandStates),
            executeAction: delegate(this, this._onContextMenuItemClick)
        };

        super.initializeOptions($.extend({
            sharedMeasurements: false,
            cssClass: "test-parameter-list",
            allowMoveColumns: false,
            contextMenu: contextMenu,
            allowMultiSelect: true,
            columns: []
        }, options));
    }

    private _getContextMenuItems(): any {
        /// <summary>gets context menu items list</summary>
        /// <returns type="Object">new list off context menu items</returns>
        return <any[]>[{ rank: 1, id: TestStepsControl.TestStepCommands.CMD_DELETEITERATION, text: Resources.DeleteIteration, icon: "bowtie-icon bowtie-edit-delete", showIcon: true, showText: true, disabled: this._isReadOnly() }];
    }

    private _onContextMenuItemClick(e?: any) {
        /// <summary>executes upon executing a right click command from the context menu</summary>
        /// <param name="e" type="Object">event related info</param>
        let command = e.get_commandName();

        if (command === TestStepsControl.TestStepCommands.CMD_DELETEITERATION) {
            this._handleDeleteIterations(this.getSelectedDataIndices());
        }
    }

    private _handleDeleteIterations(rowIndices: number[]) {
        let data: any[] = this._options.source.slice(),
            index: number,
            newData: any[] = [],
            i: number,
            j = 0,
            minRowIndex: number = Math.min.apply(Math, rowIndices),
            dataIndexToFocus: number = -Infinity,
            isLastRowSelected: boolean = false,
            len: number;

        DAUtils.trackAction("DeleteIteration", "/Authoring");

        //Remove last row from consideration for now
        index = Utils_Array.indexOf(rowIndices, data.length - 1);
        if (index >= 0) {
            isLastRowSelected = true;
            rowIndices.splice(index, 1);
        }

        for (i = 0, len = data.length; i < len; i++) {
            if (!Utils_Array.contains(rowIndices, i)) {
                if (i < minRowIndex && i > dataIndexToFocus) {
                    dataIndexToFocus = i;
                }
                newData[j++] = data[i];
            }
        }

        if (!this._hasLastRowChanged || isLastRowSelected) {
            newData.splice(newData.length - 1, 1);
        }
        if (dataIndexToFocus === -Infinity) {
            dataIndexToFocus = 0;
        }
        this._fireChange({ newData: newData });
        this.setSource(this._parameters, newData, { dataIndex: dataIndexToFocus, columnIndex: 0, focus: true });
    }

    private _updateContextMenuCommandStates(menu: any) {
        let index = this.getSelectedRowIndex(),
            data: any[] = this._options.source;

        menu.updateCommandStates([{
            id: TestStepsControl.TestStepCommands.CMD_DELETEITERATION,
            disabled: (this.testCase && this.testCase.isUsingSharedParameters()) || (this.getSelectedDataIndices().length > 1 ? false : (index === data.length - 1)) || this._isReadOnly()
        }]);
    }

    private _onEditableHeaderBlur(e) {
        //On the focus out of the editable header column, make the header non-editable and commit the change to the parameter name.
        let $headerColumn = $(e.target).closest(".grid-header-column"),
            $editableSection = $headerColumn.find(".editable-param-name"),
            $paramNameHeaderDiv = $headerColumn.find("div.title"),
            newParamName = $editableSection.prop("value"),
            oldParamName = $paramNameHeaderDiv.text(),
            deleteParamArgs: any = {},
            $paramDeleteIcon: JQuery;

        $editableSection.unbind("blur");
        $editableSection.hide();
        $paramNameHeaderDiv.show();
        this._lastFocusedHeaderElement = null;

        if (Utils_String.localeIgnoreCaseComparer(oldParamName, newParamName) !== 0) {
            if (TMOM.ParameterCommonUtils.isValidParameterString(newParamName) && this.doesParamNameExist && !this.doesParamNameExist(newParamName)) {
                deleteParamArgs = { paramName: newParamName };
                $paramDeleteIcon = $paramNameHeaderDiv.children();
                $paramNameHeaderDiv.text(newParamName);
                $paramNameHeaderDiv.append($paramDeleteIcon);
                // Re-bind the delete icon with the new param name in the deleteParamArgs
                $paramDeleteIcon.unbind("click");
                $paramDeleteIcon.bind("click", delegate(this, this._onParameterDeleteClick, deleteParamArgs));
                if (this.onRenameParameter) {
                    this.onRenameParameter(oldParamName, newParamName, this.getUniqueId());
                }
            }
        }
    }

    private _onEditableHeaderKeyUp(e) {
        let $editableSection = $(e.target).parent().find(".editable-param-name"),
            $paramNameHeaderDiv = $(e.target).parent().find("div.title"),
            newParamName = $editableSection.prop("value"),
            oldParamName = $paramNameHeaderDiv.text();

        if (e.which && e.which === Utils_UI.KeyCode.ENTER) {
            this._onEditableHeaderBlur(e);
        }
        else {
            if ((Utils_String.localeIgnoreCaseComparer(oldParamName, newParamName) === 0) ||
                (TMOM.ParameterCommonUtils.isValidParameterString(newParamName) && this.doesParamNameExist && !this.doesParamNameExist(newParamName))) {
                $editableSection.removeClass("parameter-name-invalid");
            }
            else {
                $editableSection.addClass("parameter-name-invalid");
            }
        }
    }

    private _onEditableHeaderKeyDown(e) {
        if (e.which && e.which === Utils_UI.KeyCode.ENTER) {
            //In case the testcase is shown in dialog we need to stop propagation of the enter keydown from input elements as it is used by the dialog to trigger save
            e.preventDefault();
            e.stopPropagation();
        }
        if (Utils_UI.KeyUtils.isExclusivelyCtrl(e) && (String.fromCharCode(e.keyCode).toLowerCase() === "s")) { // Ctrl +S, Focus out the current cell
            if (this._lastFocusedHeaderElement) {
                this._onEditableHeaderBlur({ "target": this._lastFocusedHeaderElement });
            }
        }
    }

    public setSource(parameters, data, addTestStepCompletedArgs?) {
        let i,
            columns = [],
            column,
            sharedParamDataSet: TMOM.SharedParameterDataSet = null,
            projectId = this._getProjectId();
        

        //As the _isSharedStepWorkItem is set in the callback of getting the workitem type, setSource could have been called before "_isSharedStepWorkItem" is set properly.
        //So, we must hide the UI first incase it has been shown before the field is set. After the field is set , setSource is called again and now the UI is shown appropriately depending on whether it is a shared workitem.
        this._hideSharedParameterUI();
        if (!this._isSharedStepWorkItem) {
            if (this.testCase) {
                sharedParamDataSet = this.testCase.getSharedParameterBeingUsed();
            }
            this._updateSharedParameterUI(sharedParamDataSet);
        }

        // the columns are dynamic, so need to create them here
        for (i = 0; i < parameters.length; i++) {
            column = {
                index: parameters[i],
                text: parameters[i],
                canSortBy: false,
                getCellContents: delegate(this, this._getCellContents),
                width: 125
            };
            columns.push(column);
        }
        this._unbind("updateViewPortCompleted");

        if (addTestStepCompletedArgs) {
            // register for the event updateviewportCompleted
            this._bind("updateViewPortCompleted", delegate(this, this._onAddTestStep, addTestStepCompletedArgs));
        }

        this._hasLastRowChanged = false;
        if (this.testCase && !this.testCase.isUsingSharedParameters()) {
            if (!this._isSharedStepWorkItem || data.length === 0) {
                this._addRows(1, data, parameters);
            }
        }
        this._parameters = parameters;
        this._options.columns = columns;
        this._options.source = data;
        this.initializeDataSource();
    }

    // Updates the data source without grid redraw
    public updateDataSourceWithoutRedraw(source?: any[]) {
        this._dataSource = source || [];
        this._count = this._dataSource.length;
    }

    private _addRows(rowCount: number, data: any[], parameters: string[]) {
        let i: number,
            j: number,
            dataLength = data.length,
            parameterCount = parameters.length;

        for (i = 0; i < rowCount; i++) {
            data[dataLength] = {};
            for (j = 0; j < parameterCount; j++) {
                data[dataLength][parameters[j]] = "";
            }
            dataLength++;
        }
    }

    public _getCellContents(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
        let columnText: string,
            cellInfo: any,
            width: any = Math.round(column.width) || 20,
            $textBox: JQuery;

        columnText = super.getColumnText(dataIndex, column, columnOrder);
        cellInfo = { text: column.text, dataIndex: dataIndex, columnIndex: this.getColumns().indexOf(column) };

        $textBox = $(domElem("input")).attr("type", "text");
        $textBox.addClass("parameter-grid-cell")
            .val(columnText)
            .css("width", (isNaN(width) ? width : width + "px"))
            .data("cell-info", cellInfo)
            .bind("keydown", delegate(this, this._onKeyDown))
            .bind("input propertychange", delegate(this, this._onCellChanged))
            .bind("blur", delegate(this, this._onEndCellEdit))
            .bind("focus", delegate(this, this._onGridElementFocus))
            .bind("mousedown", <any>((event, element) => {
                event.stopPropagation();
                // there was cursor blinking on mousedown even after readonly property on IE.
                let attr = $(this._element.find(".parameter-grid-cell")).attr("readonly");
                if (attr === "readonly") {
                    event.preventDefault();
                }
            }));
        if (this._isReadOnly()) {
	        $textBox.attr("readonly", "true");
        }
        return $textBox;
    }

    public _onGridElementFocus(e?, element?) {
        super._onGridElementFocus(e, element);
        this._lastFocusedCell = this._getCellFromEvent(e, ".parameter-grid-cell")[0];
    }

    public _onContainerResize(e?: JQueryEventObject): any {
        if (this._lastFocusedCell) {
            this._onEndCellEdit({ "target": this._lastFocusedCell });
        }
        super._onContainerResize(e);
    }

    public _updateRow(rowInfo, rowIndex, dataIndex, expandedState, level) {
        let row,
            rowElem,
            indentIndex,
            i,
            l,
            columns,
            column,
            cellValue$;
            
       indentIndex = this._indentIndex;
        row = rowInfo.row;
        row.empty();
        rowElem = row[0];

        rowElem.style.width = isNaN(this._contentSize.width) ? "" : (this._contentSize.width + 2) + "px";
        columns = this._columns;
        for (i = 0, l = columns.length; i < l; i++) {
            column = columns[i];
            if (column.hidden) {
                continue;
            }
            cellValue$ = column.getCellContents.apply(this, [rowInfo, dataIndex, expandedState, level, column, indentIndex, i]);
            if (cellValue$) {
                rowElem.appendChild(cellValue$[0]);
            }
        }

        this._updateRowSelectionStyle(rowInfo, this._selectedRows, this._selectedIndex);
    }

    public _onKeyDown(e?) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._onEnterKey(e);
        }
        else if (e.keyCode === Utils_UI.KeyCode.TAB && !e.shiftKey) {
            this._onTabKey(e);
        }
        else if (e.keyCode === Utils_UI.KeyCode.UP) {
            this._onUpKey(e);
        }
        else if (e.keyCode === Utils_UI.KeyCode.DOWN) {
            this._onDownKey(e);
        }
        else if (Utils_UI.KeyUtils.isExclusivelyCtrl(e) && (String.fromCharCode(e.keyCode).toLowerCase() === "s")) { // Ctrl +S, Focus out the current cell
            if (this._lastFocusedCell) {
                this._onEndCellEdit({ "target": this._lastFocusedCell });
            }
        }
    }

    private _onCellChanged(e: JQueryEventObject) {
        let data: any[] = this._options.source.slice(),
            $cell = this._getCellFromEvent(e, ".parameter-grid-cell"),
            cellInfo = $cell.data("cell-info"),
            dataIndex: number = cellInfo.dataIndex,
            columnIndex: number = cellInfo.columnIndex,
            columnText: string = cellInfo.text,
            hasLastRowChanged: boolean = (dataIndex === data.length - 1);

        this._hasLastRowChanged = this._hasLastRowChanged || hasLastRowChanged;
    }

    private _onEndCellEdit(e) {
        if (!(this.testCase && this.testCase.isUsingSharedParameters())) {

            let data: any[] = this._options.source.slice(),
                $cell = this._getCellFromEvent(e, ".parameter-grid-cell"),
                cellInfo = $cell.data("cell-info"),
                columnIndex: number = cellInfo.columnIndex,
                columnText: string = cellInfo.text,
                dataIndex: number = cellInfo.dataIndex;

            // If the event is fired on the test case that is bound earlier after the binding has changed for the new
            // test case data, there is a possibility that data[dataIndex] is out of synch. 
            if (data[dataIndex]) {

                data[dataIndex][columnText] = $cell.val();
                this._lastFocusedCell = null;

                if (!this._hasLastRowChanged) {
                    data.splice(data.length - 1, 1);
                }
                this._fireChange({ newData: data });
            }
        }
    }

    private _getCellFromEvent(e?: JQueryEventObject, selector?: string): JQuery {
        return $(e.target).closest(selector);
    }

    private _onAddTestStep(e, updateViewPortArgs, addTestStepCompletedArgs) {
        let $element: JQuery;
        this.setSelectedRowIndex(addTestStepCompletedArgs.dataIndex);
        this.getSelectedRowIntoView(true);
        if (addTestStepCompletedArgs.focus) {
            this._focusCell(addTestStepCompletedArgs.dataIndex, addTestStepCompletedArgs.columnIndex);
        }
        Diag.logTracePoint("ParametersList.addTestStepCompleted");
        this._unbind("updateViewPortCompleted");
    }

    private _focusCell(dataIndex: number, columnIndex: number) {
        let rowInfo: any,
            $gridRow: JQuery,
            $gridCell: JQuery;

        rowInfo = this.getRowInfo(dataIndex);
        if (rowInfo) {
            $gridRow = $(rowInfo.row);
            $gridCell = $($gridRow.find(".parameter-grid-cell")[columnIndex]);
            if ($gridCell.length === 1) {
                $gridCell.focus();
            }
        }
    }

    public _onEnterKey(e?: JQueryEventObject, bounds?): any {
        let $cell = this._getCellFromEvent(e, ".parameter-grid-cell"),
            data: any[] = this._options.source,
            cellInfo: any,
            columnText: string,
            dataIndex: number;

        if (!this._isSharedStepWorkItem) {
            if ($cell.length === 1) {
                cellInfo = $cell.data("cell-info");
                if (this._hasNextRow($cell)) {
                    this._focusCell(cellInfo.dataIndex + 1, cellInfo.columnIndex);
                }
                else {
                    columnText = cellInfo.text;
                    dataIndex = cellInfo.dataIndex;
                    data[dataIndex][columnText] = $cell.val();
                    this.setSource(this._parameters, data, { text: cellInfo.text, dataIndex: cellInfo.dataIndex + 1, columnIndex: "0", focus: true });
                    this.focus();
                }
            }
        }

        e.preventDefault();
        e.stopPropagation();
    }

    public _onUpKey(e?: JQueryEventObject) {
        let $cell = this._getCellFromEvent(e, ".parameter-grid-cell"),
            data: any = this._options.source,
            cellInfo = $cell.data("cell-info");

        if (this._hasPrevRow($cell)) {
            this._focusCell(cellInfo.dataIndex - 1, cellInfo.columnIndex);
        }
    }

    public _onDownKey(e?: JQueryEventObject) {
        let $cell = this._getCellFromEvent(e, ".parameter-grid-cell"),
            data: any = this._options.source,
            cellInfo = $cell.data("cell-info");

        if (this._hasNextRow($cell)) {
            this._focusCell(cellInfo.dataIndex + 1, cellInfo.columnIndex);
        }
    }

    public _onTabKey(e?: JQueryEventObject) {
        let $cell = this._getCellFromEvent(e, ".parameter-grid-cell"),
            data: any = this._options.source,
            cellInfo = $cell.data("cell-info"),
            columnIndex: number = cellInfo.columnIndex,
            dataIndex: number = cellInfo.dataIndex,
            columnText: string = cellInfo.text;
        if (!this._isSharedStepWorkItem) {
            if (!this._hasNextRow($cell) && !this._hasNextCell($cell)) {
                if ($cell.val() !== "") {
                    data[dataIndex][columnText] = $cell.val();
                    dataIndex = dataIndex + 1;
                    columnIndex = 0;
                    this.setSource(this._parameters, data, { dataIndex: dataIndex, columnIndex: columnIndex, focus: true });
                    this.focus();
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        }
    }

    private _hasNextCell($cell: JQuery): boolean {
        let $nextCell: JQuery;
        $nextCell = $cell.next(".parameter-grid-cell");
        return $nextCell.length === 1;
    }

    private _hasPrevCell($cell: JQuery): boolean {
        let $prevCell: JQuery;
        $prevCell = $cell.prev(".parameter-grid-cell");
        return $prevCell.length === 1;
    }

    private _hasNextRow($cell: JQuery): boolean {
        let $nextRow: JQuery;
        $nextRow = $cell.parent(".grid-row").next(".grid-row");
        return $nextRow.length === 1;
    }

    private _hasPrevRow($cell: JQuery): boolean {
        let $prevRow: JQuery;
        $prevRow = $cell.parent(".grid-row").prev(".grid-row");
        return $prevRow.length === 1;
    }

    private _parameterMappingChanged(sender: any, paramName: string) {
        let sharedParameter: TMOM.SharedParameterDataSet,
            selectedParameterName: string = sender.getText(),
            paramNames: string[] = [];

        if (this.testCase && (sharedParameter = this.testCase.getSharedParameterBeingUsed())) {
            paramNames = sharedParameter.getParameters();

            if (selectedParameterName === "" || Utils_Array.contains(paramNames, selectedParameterName, Utils_String.localeIgnoreCaseComparer)) {
                sender.setInvalid(false);
                this.testCase.getParametersDataInfo().setParameterMapping(paramName, selectedParameterName);
                this.testCase.setIsDirty(true);
                this._populateTestCaseDataFromDataInfo();
            }
            else {
                sender.setInvalid(true);
            }
        }
    }

    private _populateTestCaseDataFromDataInfo() {
        TMUtils.ParametersHelper.populateTestCaseDataFromParamDataInfo(this.testCase.getParametersDataInfo(), this.testCase, this.testCase.getSharedParameters()[0], this.testCase.getSharedParameterDataSetTitle());
        if (this.onChangeSharedParameterMappings) {
            this.onChangeSharedParameterMappings();
        }
    }

    private _setTestcaseParameterDataField(sharedParameterModel: TMOM.ISharedParameterDataSetModel, sharedParamNames: string[], callback?: () => void) {
        let paramNames: string[] = this.testCase.getParameters(),
            paramNamesLength: number = paramNames.length,
            i: number,
            sharedMap: TMOM.SharedParameterDefinition,
            parameterDataInfo: TMOM.TestCaseParameterDataInfo,
            parameterMap: TMOM.SharedParameterDefinition[] = [],
            paramNamesInSharedParamDataSet: string[] = sharedParameterModel.sharedParameterDataSet.getParameters();

        if (sharedParamNames.length !== paramNamesLength) {
            return;
        }

        //Auto-mapping between the testcase and sharedParam param names. If the name does not exist in Shared apram dataset, then the mapping should be left empty
        for (i = 0; i < paramNamesLength; i++) {
            if (!Utils_Array.contains(paramNamesInSharedParamDataSet, sharedParamNames[i], Utils_String.localeIgnoreCaseComparer)) {
                sharedParamNames[i] = "";
            }
            sharedMap = new TMOM.SharedParameterDefinition(paramNames[i], sharedParamNames[i], sharedParameterModel.id);
            parameterMap.push(sharedMap);
        }

        parameterDataInfo = new TMOM.TestCaseParameterDataInfo(parameterMap, [sharedParameterModel.id], TMOM.SharedParameterRowsMappingType.MapAllRows);
        this.testCase.setIsDirty(true);
        TMUtils.ParametersHelper.beginPopulateTestCaseDataFromParamDataInfo(parameterDataInfo, this.testCase, callback);
    }

}

VSS.classExtend(TestParameterList, TFS_Host_TfsContext.TfsContext.ControlExtensions);

export class TestStepsControl extends WorkItemControl implements IInPlaceMaximizableControl {

    private _control: any;
    private _parameterspanel: any;
    private _stepsField: any;
    public testCase: TMOM.TestCase;
    private _parametersField: any;
    private _parametersDataField: any;
    private _stepsList: any;
    private _parametersList: any;
    private _workItemCache: any;
    private _steps: any[];
    private _parameters: any[];
    private _attachments: any;
    private _onWorkItemChanged: any;
    private _menuBar: any;
    private _parametersLocationInFetchedItem: number;
    private _isSharedStepWorkItem: boolean;
    private _sharedStepCreationHelper: TMUtils.SharedStepCreationHelper;
    private _showingParamDeleteWarning: boolean;
    private _onSharedStepChangedDelegate: (sender, args) => void;
    private _store: WITOM.WorkItemStore;
    private _encodedParams: TFS_Core_Utils.Dictionary<string>;
    private _currentWorkItemId: number = 0;
    private _isFullScreen: boolean = false;

    private _parameterCollapsedTestStepGridHeightOffsetWhenMaximized: number = 35;
    private _parameterCollapsedTestStepGridHeightOffsetWhenNormal: number = 70;
    private _parameterExpandedTestStepGridHeightOffsetWhenMaximized: number = 200;
    private _parameterExpandedTestStepGridHeightOffsetWhenNormal: number = 235;
    private _testStepGridMinimumHeight: number = 250;
    private _testStepControlHeaderHeight: number = 80; // This incudes height of Title and menubar
    private _fontStyleCommands;


    public static TestStepCommands = {
        CMD_DELETE: "delete-step",
        CMD_MOVEUP: "move-step-up",
        CMD_INSERTSTEP: "insert-step",
        CMD_CREATESHAREDSTEP: "create-shared-step",
        CMD_INSERTSHAREDSTEPS: "insert-shared-steps",
        CMD_MOVEDOWN: "move-step-down",
        CMD_EDIT: "step-edit",
        CMD_ADDSTEP: "add-new-step",
        CMD_ADDATTACHMENT: "add-attachment",
        CMD_INSERTPARAMETER: "insert-parameter",
        CMD_DELETEITERATION: "delete-iteration",
        CMD_EDITPARAMDATA: "edit-param-data",
        CMD_RENAMEPARAMETER: "rename-parameter"
    };


    constructor(container, options?, workItemType?) {
        super(container, options, workItemType);
        this._isSharedStepWorkItem = false;
        this._showingParamDeleteWarning = false;
        this._onSharedStepChangedDelegate = delegate(this, this._onSharedStepWorkItemChanged);
        this._encodedParams = new TFS_Core_Utils.Dictionary<string>();
    }

    public maximizeInPlace(top: number) {
        this._isFullScreen = true;
        this._setTestStepGridHeight();
    }

    public restoreInPlace() {
        this._isFullScreen = false;
        this._setTestStepGridHeight();
    }

    public invalidate(flushing) {

        if (!this._flushing && this._workItem) {
            let $stepsXml = $(Utils_Core.parseXml(this._stepsField.getValue())),
                $steps,
                i,
                links,
                link;

            this._steps = [];
            this._parameters = [];
            this._attachments = [];

            //find the attachments
            links = this._workItem.getLinks();
            for (i = 0; i < links.length; i++) {
                link = links[i];

                if (link instanceof WITOM.Attachment) {
                    this._attachments.push(link);
                }
            }

            $steps = $stepsXml.find("steps");
            this.readSteps($steps, this, true);

            $steps.remove();
            $stepsXml.remove();

            //load the shared test steps
            Diag.logTracePoint("TestStepsControl.loadSteps.start");
            this._fetch(this._steps, delegate(this, this._onStepsLoaded));
            
        }
    }

    public readSteps($steps, stepsControl, reset?: boolean, shouldNewStepRow?: boolean) {
        let i; // lastRowText, lastRow;
        // if steps are to be read in case of this._stepsXmlDom modification
        // we must empty the datasource. Else , if it is a recursive call from 
        // readSharedSteps, previous values must be preserved.
        if (reset) {
            this._steps = [];
        }

        this._steps = TMOM.TestBase.parseTestSteps($steps);

        this.testCase.setTestSteps(this._steps);

        for (i = 0; i < this._steps.length; i++) {
            if (!this._steps[i].ref) {
                this._steps[i].processTestAttachments(stepsControl._attachments);
            }
        }

        // finally add an extra row that should not be an actual step.
        // This row should never get saved as a workitem step.
        // This row should only be used to trigger a click to add another row.
        if (shouldNewStepRow) {
            this._steps.push(this._stepsList._getaddNewStepRow());
        }
        // Content should be localized
        if (reset) {
            //set index for each step except the last one.
            if (this._steps && this._steps.length > 0) {
                for (i = 0; i < this._steps.length; i++) {
                    this._steps[i].setIndex(i + 1);
                }
            }
        }
    }

    public readParameters(callback?: () => void) {
        let $parametersXml = $(Utils_Core.parseXml(this._parametersField.getValue())),
            $parameterData: JQuery,
            parameterData: any[] = [],
            parametersXmlString: string,
            i: number;
        
        // first read the parameters for the selected test case
        this._parameters = TMOM.ParameterCommonUtils.parseParameters($parametersXml);
        this.testCase.setParameters(this._parameters);
        //reset the sharedStepParameters set previously.
        this.testCase.setSharedStepParameters([]);

        //now read parameters for each shared test step included in this test case
        for (i = 0; i < this._steps.length; i++) {
            if (this._steps[i].actionType === TMOM.TestActionTypes.SharedSteps && this._workItemCache[this._steps[i].ref]) {
                parametersXmlString = this._workItemCache[this._steps[i].ref][this._parametersLocationInFetchedItem];
                if (parametersXmlString) {
                    $parametersXml = $(Utils_Core.parseXml(parametersXmlString));
                    this.testCase.mergeSharedStepParameters(TMOM.ParameterCommonUtils.parseParameters($parametersXml));
                    $parametersXml.remove();
                }
            }
        }

        //now read in the parameter data
        if (!this._parametersDataField || !TMUtils.ParametersHelper.beginPopulateTestCaseDataFromJson(this.testCase, this._parametersDataField.getValue(), callback)) {
            // Param data field is not json type. It means its xml type
            Diag.logVerbose("TestStepsControl.readParameters: Reading parameter data field which is of xml format");
            if (this._parametersDataField) {
                $parameterData = $(Utils_Core.parseXml(this._parametersDataField.getValue()));
            }
            else if (this._isSharedStepWorkItem) {
                $parameterData = $parametersXml;
            }
            TMUtils.ParametersHelper.setTestCaseParametersDataFromXml(this.testCase, $parameterData, this._isSharedStepWorkItem);
            $parametersXml.remove();
            if (callback) {
                callback();
            }
        }
    }

    private _confirmParamsDelete(paramsToBeDeleted: string[]): boolean {
        let confirmed: boolean,
            message: string = Resources.ConfirmParameterDeletion;

        if (this._showingParamDeleteWarning) { // Return false if the param warning is already being shown
            return false;
        }

        this._showingParamDeleteWarning = true;

        if (this.testCase.isUsingSharedParameters()) {
            message = Resources.ConfirmParameterDeletionForTcUsingSharedParameters;
        }
        confirmed = TMUtils.ParametersHelper.confirmParamsDelete(paramsToBeDeleted,
            this.testCase,
            message,
            true);

        this._showingParamDeleteWarning = false;

        return confirmed;
    }

    public bind(workItem) {

        let i: number,
            len: number,
            title = workItem.getField(WITConstants.CoreFieldRefNames.Title).getValue(),
            parametersData,
            parametersXml: string,
            $parametersXml: JQuery,
            parameterDataRow: any,
            parametersDataXml: string;

        if (this._stepsList) {
            this._stepsList.notifyCellChanged();
        }

        if (this._parametersList) {
            this._parametersList.flushUI();
        }

        if (workItem) {
            Diag.logVerbose("[bind]Setting current work item id to " + workItem.id);
            this._currentWorkItemId = workItem.id;

            this._stepsField = workItem.getField(TCMConstants.WorkItemFieldNames.Actions);
            this._parametersField = workItem.getField(TCMConstants.WorkItemFieldNames.Parameters);
            this._parametersDataField = workItem.getField(TCMConstants.WorkItemFieldNames.DataField);
            parametersXml = this._parametersField.getValue();
            $parametersXml = $(Utils_Core.parseXml(parametersXml)),
            parametersDataXml = this._parametersDataField ? this._parametersDataField.getValue() : "";
            this._parameters = TMOM.ParameterCommonUtils.parseParameters($(Utils_Core.parseXml(parametersXml || "")));
            parametersData = TMUtils.ParametersHelper.parseParametersData($(Utils_Core.parseXml(parametersDataXml || "")), this._parameters);
            this.testCase = new TMOM.TestCase(workItem.Id,
                workItem.revision,
                title,
                [],
                this._parameters,
                parametersData,
                parametersDataXml,
                undefined, undefined, undefined, workItem.project);
            this._parametersList.testCase = this.testCase;
            this.testCase.paramDeleteEvent = delegate(this, this._handleParameterDeletion);
            this.testCase.setWorkItemWrapper(new TMOM.WorkItemWrapper(workItem));
            this._workItemCache = {};
        }
        this._encodedParams.clear();

        super.bind(workItem);

        if (this._workItem) {
            this._onWorkItemChanged = (sender, args) => {
                if (args.change === WorkItemChangeType.Refresh) {
                    this._workItemCache = {};
                    this.invalidate(workItem);
                }
                else if (args.change === WorkItemChangeType.Reset) {
                    this.invalidate(workItem);
                }
                else if (args.change === WorkItemChangeType.Saved) {
                    this._handleSharedStepParamChanges();
                }
            };

            workItem.attachWorkItemChanged(this._onWorkItemChanged);
            WorkItemManager.get(this._store).attachWorkItemChanged(this._onSharedStepChangedDelegate);
            let projectId: string = this.testCase ? this.testCase.getProjectId() : TMUtils.ProjectUtil.getProjectIdFromContext();
            TMUtils.WorkItemUtils.getAllWorkItemTypeNamesForCategory(TMOM.WorkItemCategories.SharedStep, (workItemTypeNames: string[]) => {
                if (Utils_Array.contains(workItemTypeNames, workItem.workItemType.name, Utils_String.ignoreCaseComparer)) {
                    this._isSharedStepWorkItem = true;
                    this.testCase.getSharedStepParametersData().setParameterXml(parametersXml);
                    this._menuBar.updateCommandStates([
                        {
                            id: TestStepsControl.TestStepCommands.CMD_INSERTSHAREDSTEPS,
                            disabled: true
                        },
                        {
                            id: TestStepsControl.TestStepCommands.CMD_CREATESHAREDSTEP,
                            disabled: true
                        }
                    ]);
                    parameterDataRow = TMOM.ParameterCommonUtils.getParametersDataRow($parametersXml);
                    this._stepsList.setIsSharedStepWorkItem(true);
                    this.testCase.setData([parameterDataRow], true);
                    this._parametersList.setIsSharedStepWorkItem(true);
                }
            }, undefined, projectId);
        }

        if (workItem) {
            // Calling it asynchronously to ensure the focus out on the previously bound work item are called and processed.
            Utils_Core.delay(this, 100, () => {
                if (this._stepsList) {
                    this._stepsList.bind(workItem.id);
                    Diag.logVerbose("[bind]Binding step list with id " + workItem.id);
                }

                if (this._parametersList) {
                    this._parametersList.bind(workItem.id);
                    Diag.logVerbose("[bind]Binding parameter list with id " + workItem.id);
                }
            });
        }

        if (this._fontStyleCommands) {

            let updateState = [];

            // Add text format buttons.
            for (let index = 0; index < this._fontStyleCommands.length; index++) {
                let command = this._fontStyleCommands[index];
                updateState.push({
                    id: command.name + "-command",
                    disabled: this.isReadOnly()
                });
            }

            this._menuBar.updateCommandStates(updateState);
        }
    }

    public cleanUp() {
        if (this._onWorkItemChanged) {
            if (this._workItem) {
                this._workItem.detachWorkItemChanged(this._onWorkItemChanged);
            }
            delete this._onWorkItemChanged;
        }

        WorkItemManager.get(this._store).detachWorkItemChanged(this._onSharedStepChangedDelegate);
        this._encodedParams.clear();
        super.cleanUp();
    }

    public onEditActions(e?: any) {
        ///<param name="e" type="any" optional="true" />
        this._onEditActions(e);
    }

    public flush(e?: any) {
        ///<param name="e" type="any" optional="true" />
        let field = this._stepsField;

        if (field) {
            try {
                this._flushing = true;

                //this will flush changes to the workitem
                this.testCase.preSave(this._isSharedStepWorkItem, this._encodedParams);

            }
            finally {
                this._flushing = false;
            }
        }

    }

    private _handleParameterDeletion(paramsToBeDeleted: string[], testCase: TMOM.TestBase): boolean {
        let parametersDeleted: boolean = this._confirmParamsDelete(paramsToBeDeleted);

        if (parametersDeleted) {
            TMUtils.ParametersHelper.deleteParametersData(paramsToBeDeleted,
                this.testCase,
                this._isSharedStepWorkItem);
        }

        return parametersDeleted;
    }

    private _handleSharedStepParamChanges() {
        if (this._isSharedStepWorkItem) {
            try {
                let parameterFieldValue: string = this.testCase.getSharedStepParametersData().getParameterXml(),
                    sharedStepData: any = { "data": this.testCase.getData(true) },
                    $parametersXml: JQuery,
                    sharedStepParams: string[] = [];

                if (parameterFieldValue) {
                    $parametersXml = $(Utils_Core.parseXml(parameterFieldValue));
                    sharedStepParams = TMOM.ParameterCommonUtils.parseParameters($parametersXml);
                }
                TMUtils.ParametersHelper.beginUpdateParameterDataInLinkedTestCases(this.testCase.getSharedStepParametersData(), sharedStepParams, this._workItem.id, delegate(this, this._onLinkedTestCasesUpdated, sharedStepData));
            }
            catch (ex) {
                this.testCase.getSharedStepParametersData().clearCommandQueue();
            }
        }
    }

    private _onLinkedTestCasesUpdated(sharedStepData: any) {
        this.testCase.getSharedStepParametersData().clearCommandQueue();
        this.testCase.setData(sharedStepData["data"], true);
    }

    public getPageColumns() {
        let requiredColumns = [
            "System.Id",
            "System.Title",
            "System.WorkItemType",
            "System.TeamProject",
            "Microsoft.VSTS.TCM.Parameters"];

        return requiredColumns;
    }

    public _init() {
        let $toolbar: JQuery;
        super._init();

        this._store = Service.getCollectionService(WITOM.WorkItemStore);
        this._workItemCache = {};
        this._control = $("<div />")
            .addClass("test-steps-control")
            .appendTo(this._container);
        let headerDiv = $("<div />")
            .addClass("test-steps-control-header")
            .appendTo(this._control);
        $("<span />").appendTo(headerDiv).text(Utils_String.format(Resources.LoadingTestSteps, " ")).addClass("test-steps-loading");

        this._fontStyleCommands = [{ name: "bold", text: VSS_Resources_Platform.EditorBold },
            { name: "italic", text: VSS_Resources_Platform.EditorItalic },
            { name: "underline", text: VSS_Resources_Platform.EditorUnderline }];

        $toolbar = $("<div />").addClass("toolbar").appendTo(this._control);

        this._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $toolbar, {
            items: this._createToolbarMenuItems(this._fontStyleCommands),
            executeAction: delegate(this, this._onMenubarItemClick),
        });

        this._control.find(".icon").attr("unselectable", "on");

        this._updateInsertParamButton();
        
        //Create the steps grid
        this._stepsList = <TestStepList>Controls.BaseControl.createIn(TestStepList, this._control, {
            tfsContext: (<any>this._options).tfsContext,
            width: "100%",
            height: "250px",
            stepDetailProvider: delegate(this, this._fetch),
            stepValueProvider: delegate(this, this._getStepValue),
            change: delegate(this, this.onEditActions),
            readOnlyDelegate: delegate(this, this.isReadOnly)
        });

        //create the collapsable parameters panel
        this._createCollapsableParametersPanel();

        this._control.bind("openRowDetail", delegate(this, this._onOpenSharedTestSteps));
        this._control.bind("deletekey", delegate(this, this._onDeleteKeyPressed));
        this._stepsList._bind("selectionchanged", delegate(this, this._onTestStepsSelectionChange));

        // to handle bold/italic/underline functionality in IE/EDGE
        this._control.bind("mousedown", function (e) {
            e.stopPropagation();
            e.preventDefault();
        });

        this._parametersList.onRenameParameter = (oldParamName: string, newParamName: string, uniqueId: number) => {
            this._handleParameterRename(oldParamName, newParamName, uniqueId);
        };
        this._parametersList.onDeleteParameter = (paramName: string) => {
            if (this._confirmParamsDelete([paramName])) {
                this._handleParameterDelete(paramName);
            }
        };
        this._parametersList.canRenameParameter = (paramName: string) => {
            return this.canEditParameter(paramName);
        };
        this._parametersList.canDeleteParameter = (paramName: string) => {
            return this.canEditParameter(paramName);
        };
        this._parametersList.doesParamNameExist = (paramName: string) => {
            return this._doesParamNameExist(paramName);
        };
        this._parametersList.onChangeSharedParameter = () => {
            this.flush();
            this._refreshParametersGrid();
        };
        this._parametersList.onChangeSharedParameterMappings = () => {
            this.flush();
            this._parametersList.updateDataSourceWithoutRedraw(this.testCase.getData(this._isSharedStepWorkItem).slice(0));
            // Draw just the rows and not the headers
            this._parametersList._updateViewport(true);
            this._parametersList.updateReadWriteMode();
        };

        this._fieldEvents = [TCMConstants.WorkItemFieldNames.Actions, TCMConstants.WorkItemFieldNames.Parameters, TCMConstants.WorkItemFieldNames.DataField];
    }

    private _handleParameterRename(oldParamName: string, newParamName: string, uniqueId: number) {

        Diag.logVerbose("[_handleParameterRename]uniqueId = " + uniqueId + " currentWorkItemId = " + this._currentWorkItemId);
        if (uniqueId !== this._currentWorkItemId) {
            return;
        }

        DAUtils.trackAction("RenameParameter", "/Authoring");
        this.testCase.renameParameter(oldParamName, newParamName);
        //TODO: In steps control, we create a test case object irrespective of whether the workItem is a testcase or a shared step workitem
        //Refactor this so that we don't rely on this hack
        if (this._isSharedStepWorkItem) {
            this.testCase.getSharedStepParametersData().renameParam(oldParamName, newParamName);
        }
        // Both the test steps grid and parameters grid UI needs to be refreshed
        this._flushAndRefreshTestStepsGrid(this._stepsList._selectedIndex, TestStepsControl.TestStepCommands.CMD_RENAMEPARAMETER);
        this._refreshParametersGrid();
    }

    private _createCollapsableParametersPanel() {

        let collapsiblePanelOptions = {
            cssClass: "parameter-collapsible-section",
            collapsed: false,
            headingLevel: 3,
            iconCollapseCss: "bowtie-icon bowtie-chevron-down",
            iconExpandCss: "bowtie-icon bowtie-chevron-up",
            onToggleCallback: delegate(this, this._setTestStepGridHeight)
        };

        this._parameterspanel = <Panels.CollapsiblePanel>Controls.BaseControl.createIn(Panels.CollapsiblePanel, this._control, collapsiblePanelOptions);

        this._parameterspanel.appendHeader(Resources.TestStepsControlParameterValuesTitle);
        this._parameterspanel.appendContent(delegate(this, this._createParameterListGrid));
    }

    private _setTestStepGridHeight() {
        let testStepListControl = this._control.find(".test-steps-list");
        let height: string = "";
        let isParametersExpanded = this._parameterspanel && this._parameterspanel.isExpanded();
      
        height = this._getTestStepListHeight(isParametersExpanded);
        testStepListControl.css("height", height);
    }

    private _getTestStepListHeight(isParametersExpanded: boolean) {
        let testStepListControl = this._control.find(".test-steps-list");
        let formBody = testStepListControl.closest(".form-body");
        let height: any;

        if (formBody && formBody.length > 0) {
            //Get Height of workitemform
            height = formBody[0].offsetHeight;

            //Removing height of Heading and menubar
            height = height - this._testStepControlHeaderHeight;

            //Get the offset to subtract from height
            let offset = this._getTestStepGridHeightOffset(isParametersExpanded);
            height = height - offset;
        }

        //Set the minimum height of grid to be 250
        if (!height || height < this._testStepGridMinimumHeight) {
            height = this._testStepGridMinimumHeight;
        }

        return height + "px";
    }

    private _getTestStepGridHeightOffset(isParametersExpanded): number {
        let offset: number = 0;

        if (isParametersExpanded) {
            if (this._isFullScreen) {
                offset = this._parameterExpandedTestStepGridHeightOffsetWhenMaximized;
            } else {
                //We are setting more offset here to show glimse of Discussion
                offset = this._parameterExpandedTestStepGridHeightOffsetWhenNormal;
            }
        } else {
            if (this._isFullScreen) {
                offset = this._parameterCollapsedTestStepGridHeightOffsetWhenMaximized;
            }
            else {
               //We are setting more offset here to show glimse of Discussion
                offset = this._parameterCollapsedTestStepGridHeightOffsetWhenNormal;
            }
        }

        return offset;
    }

    private _createParameterListGrid() {

        let paramListDiv = $("<div />");

        $("<span />").appendTo(paramListDiv).text(Utils_String.format(Resources.LoadingTestSteps, " ")).addClass("test-steps-loading");

        this._parametersList = <TestParameterList>Controls.BaseControl.createIn(TestParameterList, paramListDiv, {
            tfsContext: (<any>this._options).tfsContext,
            testCase: this.testCase,
            gutter: false,
            width: "100%",
            height: "145px",
            change: delegate(this, this._onParamGridChanged),
            readOnlyDelegate: delegate(this, this.isReadOnly)
        });

        return paramListDiv;
    }

    private _doesParamNameExist(paramName: string): boolean {
        if (Utils_Array.contains(this.testCase.getParameters(), paramName, Utils_String.localeIgnoreCaseComparer)) {
            return true;
        }
        return false;
    }

    private _onParamGridChanged(e) {
        Diag.logVerbose("[_onParamGridChanged]e.uniqueId = " + e.uniqueId + " currentWorkItemId = " + this._currentWorkItemId);
        if (e.newData && e.uniqueId === this._currentWorkItemId) {
            this.testCase.setData(e.newData, this._isSharedStepWorkItem);
            this.testCase.setIsDirty(true);
            this.flush();
        }
    }

    private _handleParameterDelete(paramName: string) {
        DAUtils.trackAction("DeleteParameter", "/Authoring");
        this.testCase.deleteParameter(paramName);
        if (this._isSharedStepWorkItem) {
            this.testCase.getSharedStepParametersData().deleteParam(paramName);
        }
        // Both the test steps grid and parameters grid UI needs to be refreshed
        this._flushAndRefreshTestStepsGrid(this._stepsList._selectedIndex);
        this._refreshParametersGrid();
    }

    private canEditParameter(paramName: string) {
        return !this.testCase.isSharedStepParameter(paramName);
    }

    private _updateInsertParamButton() {
        let $insertParamMenuItem;
        $insertParamMenuItem = this._control.find(".menu-item[command='insert-parameter']");
        this._makeMenuItemUnselectable($insertParamMenuItem, "icon bowtie-icon bowtie-parameter", "insert-parameter-command", Resources.InsertParameter);
    }

    private _makeMenuItemUnselectable($menuItem: JQuery, buttonClassName: string, containerClassName: string, title: string) {
        let $tempMenu: JQuery;

        $menuItem.attr("unselectable", "on");
        $menuItem.find(".icon").attr("unselectable", "on");
        $menuItem.find(".text").attr("unselectable", "on");
    }

    private _createToolbarMenuItems(fontStyleCommands) {
        let index,
            command,
            toolbarMenuItems = [];

        toolbarMenuItems.push({
            id: TestStepsControl.TestStepCommands.CMD_INSERTSTEP,
            title: Resources.InsertStepAuthoringTooltip,
            showText: false,
            icon: "bowtie-icon bowtie-step-insert"
        });

        toolbarMenuItems.push({
            id: TestStepsControl.TestStepCommands.CMD_INSERTSHAREDSTEPS,
            title: Resources.InsertSharedSteps,
            showText: false,
            icon: "bowtie-icon bowtie-step-shared-insert"
        });

        toolbarMenuItems.push({
            id: TestStepsControl.TestStepCommands.CMD_CREATESHAREDSTEP,
            title: Resources.CreateSharedStep,
            showText: false,
            icon: "bowtie-icon bowtie-step-shared-add"
        });

        toolbarMenuItems.push(
            {
                separator: true
            });

        toolbarMenuItems.push({
            id: TestStepsControl.TestStepCommands.CMD_MOVEUP,
            title: Resources.MoveStepUp,
            showText: false,
            icon: "bowtie-icon bowtie-sort-ascending"
        });

        toolbarMenuItems.push({
            id: TestStepsControl.TestStepCommands.CMD_MOVEDOWN,
            title: Resources.MoveStepDown,
            showText: false,
            icon: "bowtie-icon bowtie-sort-descending"
        });

        toolbarMenuItems.push({
            id: TestStepsControl.TestStepCommands.CMD_DELETE,
            title: Resources.DeleteStep,
            showText: false,
            icon: "bowtie-icon bowtie-edit-delete"
        });

        toolbarMenuItems.push(
            {
                separator: true
            });

        toolbarMenuItems.push({
            id: TestStepsControl.TestStepCommands.CMD_INSERTPARAMETER,
            title: Resources.InsertParameter,
            showText: false,
            icon: "bowtie-icon bowtie-parameter"
        });

        toolbarMenuItems.push({
            id: TestStepsControl.TestStepCommands.CMD_ADDATTACHMENT,
            title: Resources.AddAttachmentDialogTitle,
            showText: false,
            icon: "bowtie-icon bowtie-attach"
        });

        if (fontStyleCommands) {

            // Add a separator.
            toolbarMenuItems.push(
                {
                    separator: true
                });

            // Add text format buttons.
            for (index = 0; index < fontStyleCommands.length; index++) {
                command = fontStyleCommands[index];
                toolbarMenuItems.push({
                    id: command.name + "-command",
                    title: command.text,
                    showText: false,
                    icon: "bowtie-icon bowtie-format-" + command.name,
                    disabled: this.isReadOnly()
                });
            }
        }

        return toolbarMenuItems;
    }

    private _onTestStepsSelectionChange(sender, e?) {
        let testStep = this._stepsList.getSelectedItem(),
            steps = this.testCase.getTestSteps(),
            numSteps = steps.length,
            disabled = !(e.selectedIndex <= numSteps - 1 && e.selectedIndex >= 0);

        this._menuBar.updateCommandStates([
            {
                id: TestStepsControl.TestStepCommands.CMD_INSERTSTEP,
                disabled: this._stepsList._areMultipleStepsSelected() || this.isReadOnly()
            },
            {
                id: TestStepsControl.TestStepCommands.CMD_DELETE,
                disabled: disabled || this._stepsList._areMultipleStepsSelected() || this.isReadOnly()
            },
            {
                id: TestStepsControl.TestStepCommands.CMD_MOVEUP,
                disabled: e.selectedIndex <= 0 || disabled || this._stepsList._areMultipleStepsSelected() || this.isReadOnly()
            },
            {
                id: TestStepsControl.TestStepCommands.CMD_MOVEDOWN,
                disabled: e.selectedIndex >= numSteps - 1 || disabled || this._stepsList._areMultipleStepsSelected() || this.isReadOnly()
            },
            {
                id: TestStepsControl.TestStepCommands.CMD_INSERTSHAREDSTEPS,
                disabled: this._isSharedStepWorkItem || this._stepsList._areMultipleStepsSelected() || this.isReadOnly()
            },
            {
                id: TestStepsControl.TestStepCommands.CMD_CREATESHAREDSTEP,
                disabled: disabled || !this._stepsList._canCreateSharedStep() || this.isReadOnly()
            },
            {
                id: TestStepsControl.TestStepCommands.CMD_ADDATTACHMENT,
                disabled: disabled || (testStep instanceof TMOM.SharedSteps) || this._stepsList._areMultipleStepsSelected() || this.isReadOnly()
            },
            {
                id: TestStepsControl.TestStepCommands.CMD_INSERTPARAMETER,
                disabled: disabled || (testStep instanceof TMOM.SharedSteps) || this._stepsList._areMultipleStepsSelected() || this.isReadOnly()
            }
        ]);
    }

    private _onMenubarItemClick(e?) {
        let command = e.get_commandName(),
            commandId = command.replace("-command", ""),
            rowIndex: number,
            success: boolean;

        if (commandId === "bold" || commandId === "italic" || commandId === "underline") {
            DAUtils.trackAction("FormatStep", "/Authoring", { command: commandId });
            if (this._isCurrentSelectionInEditableTestStep()) {
                success = document.execCommand(commandId);
                if (success) {
                    this._stepsList.textFormattingChanged();
                }
            }
        }
        else if (commandId === TestStepsControl.TestStepCommands.CMD_INSERTPARAMETER) {
            if (this._isCurrentSelectionInEditableTestStep()) {
                this._insertParameter();
            }
        }
        else if (commandId === TestStepsControl.TestStepCommands.CMD_CREATESHAREDSTEP) {
            if (this._stepsList._canCreateSharedStep()) {
                this._stepsList._fireChange({
                    selectedRowIndexes: this._stepsList._getSelectedRowsArray(),
                    changeType: command
                });
            }
        }
        else {
            rowIndex = this._stepsList.getSelectedRowIndex();
            this._stepsList._fireChange({
                rowIndex: rowIndex,
                changeType: command
            });
        }
    }

    private _isCurrentSelectionInEditableTestStep() {

        try {
            let selection: Selection,
                range: Range,
                $cell: JQuery,
                $editableDiv: JQuery;
            if (window.getSelection) {
                selection = window.getSelection();
                if (selection) {
                    range = selection.getRangeAt(0);
                    if (range && range.startContainer) {
                        $cell = $(range.startContainer).closest(".test-steps-multiline");
                        if ($cell && $cell.children().length > 0) {
                            $editableDiv = $cell.children().first();
                            if ($editableDiv.attr("contenteditable") === "true") {
                                // Bug 1192576:CEV:[Mozilla] On click of Insert parameter in the Jquery dialog window . The text generated is not selected and hence on typing directly cannot change the para
                                // Need to explicilty set the focus on the current cell because in Mozilla, the focus is shifted to the ui-dialog when the testcase is opened in dialog.
                                Utils_UI.tryFocus($editableDiv, 10);
                                return true;
                            }
                        }
                    }
                }
                return false;
            }
            return true; // In case of IE8 return true.
        }
        catch (ex) { //An exception is thrown by range.getRangeAt in case the element is not visible on the screen
            if (!(ex instanceof DOMException)) {
                throw ex;
            }
        }
    }

    private _insertParameter() {
        DAUtils.trackAction("InsertParameter", "/Authoring");
        let paramPlaceholder = " @" + this._getUniqueParameterName() + " ";
        TMUtils.insertAndSelectTextAtCurrentCaretPosition(paramPlaceholder);
    }

    private _getUniqueParameterName() {
        let paramPlaceholder = Resources.ParameterPlaceholderName,
            count = 1,
            paramName: string;

        while (Utils_Array.contains(this.testCase.getParameters(), paramPlaceholder + count, Utils_String.localeIgnoreCaseComparer)) {
            count++;
        }
        paramName = paramPlaceholder + count;

        return paramName;
    }

    private _refreshParametersGrid() {
        let testSteps = this.testCase.getTestSteps();
        let parameterNames = this._getParametersForTestSteps(testSteps);
        this._encodedParams = TMOM.ParameterCommonUtils.updateEncodedParameters(parameterNames);
        this._parametersList.setSource(parameterNames, this.testCase.getData(this._isSharedStepWorkItem).slice(0));
    }

    private _getParametersForTestSteps(testSteps: TMOM.TestAction[]) {
        let testStepParameters = [];
        let uniqueParameters = [];
        //For each test step get the parameters
        $.each(testSteps, (index: number, testStep: any) => {
            if (testStep instanceof TMOM.TestStep) {
                testStepParameters = testStepParameters.concat(this._getTestStepParameters(testStep));
            }
            else {
                testStepParameters = testStepParameters.concat(this._getSharedStepParameter(testStep));
            }
        });

        //Remove Duplicates
        let actualParameterNames: string[] = this.testCase.getParameters().slice(0);
        let that = this;
        $.each(testStepParameters, function (i, paramName) {
            if (!Utils_Array.contains(uniqueParameters, paramName, Utils_String.localeIgnoreCaseComparer)) {
                //This need to be done since parameters value data is indexed on param which was created before.
                //This is needed in same parameter name but different case scenario
                let index = that._getIndexOfParamInParameterList(actualParameterNames, paramName);
                if (index >= 0) {
                    uniqueParameters.push(actualParameterNames[index]);
                }
            }
        });

        return uniqueParameters;
    }

    private _getIndexOfParamInParameterList(parameterList: string[], paramName: string): number{
        let index: number = -1;
        if (parameterList && parameterList.length > 0) {
            for (let i: number = 0; i < parameterList.length; i++) {
                if (Utils_String.ignoreCaseComparer(parameterList[i], paramName) === 0) {
                    index = i;
                    break;
                }
            }
        }
        return index;
    }

    private _getSharedStepParameter(sharedStep: TMOM.SharedSteps) {
        let parameters = [];
        if (sharedStep && this._workItemCache && this._workItemCache[sharedStep.ref]) {
            let parametersXmlString = this._workItemCache[sharedStep.ref][this._parametersLocationInFetchedItem];
            if (parametersXmlString) {
                let $parametersXml = $(Utils_Core.parseXml(parametersXmlString));
                parameters = TMOM.ParameterCommonUtils.parseParameters($parametersXml);
                $parametersXml.remove();
            }
        }
        return parameters;
    }

    private _getTestStepParameters(testStep: TMOM.TestStep) {
        let parameters = [];
        if (testStep) {
            let actionParams = testStep.getActionParameters();
            let expectedResultParmas = testStep.getExpectedParameters();

            if (actionParams && actionParams.length > 0) {
                //We cannot show actionParams directly as there order may be different from one in the view
                parameters = parameters.concat(TMOM.ParameterCommonUtils.getParameters(testStep.action));
            }
            if (expectedResultParmas && expectedResultParmas.length > 0) {
                //We cannot show expectedResultParmas directly as there order may be different from one in the view
                parameters = parameters.concat(TMOM.ParameterCommonUtils.getParameters(testStep.expectedResult));
            }
        }
        return parameters;
    }

    private _onDeleteKeyPressed(sender, eventArgs) {
        let testStep = this._stepsList.getSelectedItem(),
            rowIndex = this._stepsList.getSelectedRowIndex();
        if (rowIndex >= 0 && rowIndex <= this._steps.length - 1 && testStep) {
            // delete this row. 
            this._onTeststepDelete();
        }
    }

    private _onTeststepDelete() {
        let rowIndex = this._stepsList.getSelectedRowIndex(), isDelete = true;
        this._stepsList._fireChange({
            rowIndex: rowIndex,
            changeType: TestStepsControl.TestStepCommands.CMD_DELETE
        });
    }

    private _onStepsLoaded() {
        this._control.find(".test-steps-loading").hide();
        // now create the steps grid
        this._stepsList.setSource(this.testCase.getTestSteps());

        //now read in the parameters and refresh the grid
        this.readParameters(() => {
            let parameterNames: string[] = this.testCase.getParameters().slice(0);
            if (parameterNames && parameterNames.length > 0) {
                this._parameterspanel.expand();
            }
            else {
                this._parameterspanel.collapse();
            }
            this._refreshParametersGrid();
        });

        Diag.logTracePoint("TestStepsControl._onStepsLoaded.complete");
    }

    private _removeTestStep(e?) {
        Diag.logTracePoint("TestStepGrid.DeleteTestStepUI.Start");
        let step = this.testCase.getTestSteps()[e.rowIndex],
            stepId = step.id,
            isSharedStep = false,
            indexToSelect: number,
            numSteps: number,
            stepRemoved: boolean;

        DAUtils.trackAction("DeleteStep", "/Authoring");
        isSharedStep = step instanceof TMOM.SharedSteps;
        stepRemoved = this.testCase.removeStep(stepId, 0);

        if (stepRemoved) {
            numSteps = this.testCase.getTestSteps().length;

            // now select the same index, if possible.
            if (e.rowIndex <= numSteps - 1) {
                indexToSelect = e.rowIndex;
            }
            //if we delete the last row, keep the last row selected
            else if (e.rowIndex === numSteps && numSteps > 0) {
                indexToSelect = numSteps - 1;
            }
            else {
                // in all other cases, selceted the first row.
                indexToSelect = 0;
            }

            this._flushAndRefreshTestStepsGrid(indexToSelect, TestStepsControl.TestStepCommands.CMD_DELETE, true);

            if (isSharedStep) {
                //Read in the parameters again if the deleted step was a shared step. This is because we do not maintain refCount for the sharedStep params.
                this.readParameters(() => {
                    this._onSharedStepDeleted(<TMOM.SharedSteps>step);
                    this._refreshParametersGrid();
                });
            }

            this._refreshParametersGrid();
        }
    }

    private _onSharedStepDeleted(step: TMOM.SharedSteps) {
        let parametersXmlString: string,
            $parametersXml: JQuery,
            conflictingParams: string[],
            i: number,
            len: number,
            parameters: string[];

        if (step) {
            parametersXmlString = this._workItemCache[step.ref][this._parametersLocationInFetchedItem];
            if (parametersXmlString) {
                $parametersXml = $(Utils_Core.parseXml(parametersXmlString));
                parameters = TMOM.ParameterCommonUtils.parseParameters($parametersXml);
                conflictingParams = Utils_Array.intersect(this.testCase.getParameters(), parameters, Utils_String.localeIgnoreCaseComparer);
                for (i = 0, len = parameters.length; i < len; i++) {
                    if (!TMUtils.ParametersHelper._isParamConflicting(parameters[i], this.testCase.getParameters())) {
                        if (this.testCase.isUsingSharedParameters()) {
                            this.testCase.getParametersDataInfo().deleteParameter(parameters[i]);
                        }
                        this.testCase.getParametersData().deleteParameter(parameters[i]);
                    }
                }
                this.flush();
            }

            if (this.testCase.getNumberOfSharedStepsWithId(step.ref) === 0) {
                // If all the shared steps have been removed from the test case remove it from the cache.
                this._workItemCache[step.ref] = null;
            }
        }
    }

    private _flushAndRefreshTestStepsGrid(selectRowIndex: number, editAction?: string, handleEscape?: boolean) {
        let testSteps = this.testCase.getTestSteps();

        // Get focus out of edit mode.
        if (handleEscape){
            this._stepsList._onEscapeKey();
        }
        this.flush();
        this._stepsList.setSource(testSteps, editAction);
        this._stepsList.setSelectedRowIndex(selectRowIndex);

        if (editAction !== TestStepsControl.TestStepCommands.CMD_ADDSTEP && editAction !== TestStepsControl.TestStepCommands.CMD_RENAMEPARAMETER) {
            this._stepsList.focus(10);
        }
    }

    private _addNewStep(e?) {
        Diag.logTracePoint("TestStepGrid.AddNewTestStep.Start");

        let testSteps,
            enteredChar = "",
            newTestStep: TMOM.TestStep;

        this.testCase.addNewStep();
        testSteps = this.testCase.getTestSteps();
        newTestStep = testSteps[testSteps.length - 1];

        if (e.charCode && ((e.charCode >= 48 && e.charCode <= 90) || (e.charCode >= 97 && e.charCode <= 122)))//consider only alphanumeric keys
        {
            enteredChar = String.fromCharCode(e.charCode);
        }

        newTestStep.setAction("<div><p>" + enteredChar + "</p></div>");

        this._flushAndRefreshTestStepsGrid(testSteps.length - 1, TestStepsControl.TestStepCommands.CMD_ADDSTEP);
    }

    private _isSharedStep($step: JQuery): boolean {
        return $step.attr("ref") ? true : false;
    }

    private _moveStep(rowIndex: number, indexChange: number) {

        if (indexChange > 0) {
            DAUtils.trackAction("MoveDown", "/Authoring");
        }
        else {
            DAUtils.trackAction("MoveUp", "/Authoring");
        }

        this.testCase.swapTestSteps(rowIndex, rowIndex + indexChange, 0);

        let sourceRowIndex = rowIndex,
            targetRowIndex = rowIndex + indexChange;

        this._stepsList.hasContentChanged = true;

        this._flushAndRefreshTestStepsGrid(targetRowIndex, null, true);
        this._refreshParametersGrid();
    }

    private _getStepId(rowIndex: number): number {
        return this.testCase.getTestSteps()[rowIndex] ? this.testCase.getTestSteps()[rowIndex].id : -1;
    }

    private _getStep(rowIndex: number): TMOM.TestAction {
        return this.testCase.getTestSteps()[rowIndex] ? this.testCase.getTestSteps()[rowIndex] : null;
    }

    private _insertStep(e?) {
        let stepId = this._getStepId(e.rowIndex);
        DAUtils.trackAction("InsertStep", "/Authoring");
        this.testCase.insertStep(stepId, 0);
        this._flushAndRefreshTestStepsGrid(e.rowIndex, TestStepsControl.TestStepCommands.CMD_INSERTSTEP);
    }

    private _createSharedStep(e?) {
        let steps: TMOM.TestStep[] = [],
            selectedStepsCount: number = e.selectedRowIndexes.length,
            i: number;

        // filter out the last step with watermark
        // That step gets selected with Ctrl + A
        for (i = 0; i < selectedStepsCount; i++) {
            if (e.selectedRowIndexes[i] >= 0 && e.selectedRowIndexes[i] <= this._stepsList._count - 2) {
                steps[i] = <TMOM.TestStep>(this._getStep(e.selectedRowIndexes[i]));
            }
        }

        this._showCreateSharedStepDialog(steps);
    }

    private _showCreateSharedStepDialog(steps: TMOM.TestStep[]) {
        return Dialogs.Dialog.show(CreateSharedStepDialog, {
            width: 450,
            height: 150,
            okCallback: (title: string) => {
                DAUtils.trackAction("CreateSharedStep", "/Authoring", { stepCount: steps.length });
                this._sharedStepCreationHelper = new TMUtils.SharedStepCreationHelper(this._workItem.project);
                this._sharedStepCreationHelper.createSharedStep(title, steps, this.testCase, (sharedStep: TMOM.SharedStepWorkItem) => {
                    this._onSharedStepWorkItemCreateSuccess(sharedStep, steps);
                },
                    (error) => {
                        alert(VSS.getErrorMessage(error));
                    });
            }
        });
    }

    private _onSharedStepWorkItemCreateSuccess(sharedStep: TMOM.SharedStepWorkItem, steps: TMOM.TestStep[]) {
        let i: number,
            numSteps: number = steps.length,
            index: number;

        // sort the steps array by index
        steps.sort((a, b) => {
            return a.index - b.index;
        });

        index = this.testCase.getIndexForActionId(steps[0].id);

        // insert shared step
        this._insertSharedStepsAtIndex(index, sharedStep.getId(), steps);
    }

    private _insertSharedStepsAtIndex(index: number, sharedStepId: number, steps: TMOM.TestStep[]) {
        let sharedStepIds: number[] = [];
        DAUtils.trackAction("InsertSharedSteps", "/Authoring");
        sharedStepIds.push(sharedStepId);
        this.testCase.insertSharedStepsAtIndex(index, sharedStepIds, steps);

        this.flush();
        this.invalidate(false);
        this._stepsList.setSelectedRowIndex(index);
        this._stepsList.focus(10);
    }

    private _insertSharedSteps(e?) {
        let stepId = this._getStepId(e.rowIndex);
        this._showInsertSharedStepsDialog(stepId);
    }

    private _showInsertSharedStepsDialog(stepId: number) {       
        return Dialogs.Dialog.show(SelectWorkItemView.SelectWorkItemsDialog, {
            width: 800,
            height: 600,
            attachResize: true,
            okText: Resources.InsertSharedSteps,
            okCallback: (sharedStepIds: number[]) => {
                this._processSharedSteps(stepId, sharedStepIds);
            },
            title: Resources.InsertSharedSteps.toLocaleUpperCase(),
            workItemCategories: [TMOM.WorkItemCategories.SharedStep],
            hideQueryType: true,
            persistenceId: SelectWorkItemView.PersistenceIds.INSERT_SHARED_STEPS_ID,
            projectId: (this._workItem && this._workItem.project) ? this._workItem.project.guid : undefined
        });
    }

    private _processSharedSteps(stepId: number, sharedStepIds: number[]) {
        let i = 0, len = 0, id = 0;
        if (sharedStepIds.length > 0) {
            this._beginCheckForConflictingParameters(sharedStepIds,
                (sharedStepCache: any) => {
                    if (sharedStepCache) {
                        // Add these elements to the existing shared steps cache.
                        for (i = 0, len = sharedStepIds.length; i < len; i++) {
                            id = sharedStepIds[i];
                            if (sharedStepCache[id]) {
                                this._workItemCache[id] = sharedStepCache[id];
                            }
                        }
                    }

                    this.testCase.insertSharedSteps(stepId, sharedStepIds);
                    this.flush();
                    this.invalidate(false);
                    this._stepsList.focus(10);
                },
                (error) => {
                    alert(VSS.getErrorMessage(error));
                });
        }
    }

    private _beginCheckForConflictingParameters(sharedStepIds: number[], callback: IResultCallback, errorCallback: IErrorCallback) {
        let store = Service.getCollectionService(WITOM.WorkItemStore),
            sharedStepCache = {},
            i = 0,
            len = sharedStepIds.length,
            sharedStepsToFetch: number[] = [];

        // First filter out shared steps that are already there in the test case. This way we do not provide any
        // conflicting error messages when the user tries to add the same shared step twice to the same test case.
        for (i = 0; i < len; i++) {
            if (!this._workItemCache[sharedStepIds[i]]) {
                sharedStepsToFetch.push(sharedStepIds[i]);
            }
        }

        if (sharedStepsToFetch.length > 0) {
            store.beginPageWorkItems(sharedStepsToFetch, this.getPageColumns(),
                (payload: any) => {
                    let conflictingParameters: string[] = [],
                        conflictingParameterMessage: string;

                    this._buildWorkItemCache(payload, sharedStepCache);
                    conflictingParameters = this._tryGetConflictingParameters(sharedStepsToFetch, sharedStepCache);
                    if (conflictingParameters.length === 0) {
                        if (callback) {
                            callback(sharedStepCache);
                        }
                    }
                    else {
                        conflictingParameterMessage = this._getConflictingParameterMessage(conflictingParameters);
                        if (confirm(conflictingParameterMessage)) {
                            callback(sharedStepCache);
                        }
                    }

                }, errorCallback);
        }
        else {
            if (callback) {
                callback(null);
            }
        }
    }

    private _getConflictingParameterMessage(conflictingParameters: string[]): string {
        return Resources.ConflictingParametersCheckMessagePreText + "\r\n" + conflictingParameters.join("\n") + "\r\n" + Resources.ConflictingParametersCheckMessagePostText;
    }

    private _tryGetConflictingParameters(sharedStepsToFetch: number[], sharedStepCache: any): string[] {
        let i = 0, j = 0, sharedParamLen = 0,
            len = sharedStepsToFetch.length,
            mergeParamNames = this.testCase.getParameters(),
            conflictingParameters: string[] = [],
            uniqueSharedStepParams: string[] = [],
            uniqueSharedStepParamsCount: number = 0,
            sharedStepParams: string[] = [],
            sharedStepId: number,
            sharedStepPayload: any;

        for (i = 0; i < len; i++) {
            sharedStepId = sharedStepsToFetch[i];
            sharedStepPayload = sharedStepCache[sharedStepId];
            sharedStepParams = this._getSharedStepParams(sharedStepPayload);
            if (sharedStepParams.length > 0) {
                for (j = 0, sharedParamLen = sharedStepParams.length; j < sharedParamLen; j++) {
                    if (Utils_Array.contains(mergeParamNames, sharedStepParams[j], Utils_String.localeIgnoreCaseComparer)) {
                        if (!Utils_Array.contains(conflictingParameters, sharedStepParams[j], Utils_String.localeIgnoreCaseComparer)) {
                            conflictingParameters.push(sharedStepParams[j]);
                        }
                    }
                    else {
                        uniqueSharedStepParamsCount++;
                        uniqueSharedStepParams.push(sharedStepParams[j]);
                        mergeParamNames.push(sharedStepParams[j]);
                    }
                }
                if (uniqueSharedStepParamsCount > 0 && this.testCase.isUsingSharedParameters()) {
                    this._autoMapSharedStepParameters(uniqueSharedStepParams);
                }
            }
        }

        return conflictingParameters;
    }

    private _autoMapSharedStepParameters(paramsToAutoMap: string[]) {
        let paramDataInfo: TMOM.TestCaseParameterDataInfo,
            i: number,
            count: number = paramsToAutoMap.length;

        if (this.testCase.isUsingSharedParameters()) {
            paramDataInfo = this.testCase.getParametersDataInfo();
            for (i = 0; i < count; i++) {
                paramDataInfo.autoMapIfParamNotExistsAlready(paramsToAutoMap[i]);
            }
        }
    }

    private _getSharedStepParams(sharedStepPayload: any): string[] {
        let parametersXmlString = sharedStepPayload[this._parametersLocationInFetchedItem],
            $parametersXml: JQuery;

        if (parametersXmlString) {
            $parametersXml = $(Utils_Core.parseXml(parametersXmlString));
            return TMOM.ParameterCommonUtils.parseParameters($parametersXml);
        }
        else {
            return [];
        }
    }

    private _editExistingStep(e: any) {
        let $text, $step, stepType, lines, stepId = e.stepId,
            changeCommitted = false,
            hasCellChanged = false,
            htmlString: string,
            step = this._stepsList._dataSource[e.rowIndex];

        Diag.logVerbose("[_editExistingStep]e.uniqueId = " + e.uniqueId + " currentWorkItemId = " + this._currentWorkItemId);
        if (e.uniqueId !== this._currentWorkItemId) {
            return;
        }

        $text = $("<DIV>" + e.newData + "<\/DIV>");
        lines = $text.find("p");
        lines.each(function () {
            if ($(this).text().trim().length === 0) {
                $(this).html("&nbsp;");
            }
        });
        htmlString = $text.html();
        if (e.columnIndex === "action" && step.action !== htmlString) {
            hasCellChanged = true;
            changeCommitted = this.testCase.setAction(stepId, 0, htmlString);
        }
        else if (e.columnIndex === "expectedResult" && step.expectedResult !== htmlString) {
            hasCellChanged = true;
            changeCommitted = this.testCase.setExpectedResult(stepId, 0, htmlString);
        }
        if (hasCellChanged) {
            if (!changeCommitted) {
                // If the change is not committed to the model successfully, we need to bring back the original step in the UI.
                this._stepsList.restoreCellData(e.rowIndex, e.columnIndex);
            }
            else {
                if (this.testCase.isUsingSharedParameters()) {
                    this._parametersList._populateTestCaseDataFromDataInfo();
                }
                this._refreshParametersGrid();
                this.flush();
            }
        }
    }

    private _onEditActions(e?) {
        if (!e.changeType) {
            return;
        }

        switch (e.changeType) {
            case TestStepsControl.TestStepCommands.CMD_DELETE:
                // if this is a delete call, remove the selected row.
                this._removeTestStep(e);
                break;

            case TestStepsControl.TestStepCommands.CMD_MOVEUP:
                this._moveStep(e.rowIndex, -1);
                break;
            case TestStepsControl.TestStepCommands.CMD_MOVEDOWN:
                this._moveStep(e.rowIndex, 1);
                break;

            case TestStepsControl.TestStepCommands.CMD_ADDSTEP:
                this._addNewStep(e);
                break;

            case TestStepsControl.TestStepCommands.CMD_INSERTSTEP:
                this._insertStep(e);
                break;

            case TestStepsControl.TestStepCommands.CMD_INSERTSHAREDSTEPS:
                this._insertSharedSteps(e);
                break;

            case TestStepsControl.TestStepCommands.CMD_CREATESHAREDSTEP:
                this._createSharedStep(e);
                break;

            case TestStepsControl.TestStepCommands.CMD_EDIT:
                this._editExistingStep(e);
                break;
            case TestStepsControl.TestStepCommands.CMD_ADDATTACHMENT:
                this._addAttachment(e);
                break;
            default:
                return;
        }
    }

    private _addAttachment(e?: any): void {
        addAttachment(this._workItem, {
            showComments: true,
            successCallback: delegate(this, this._onFileAttached)
        });
    }

    private _onFileAttached(showUserInterface: boolean, attachedFile: any): void {
        let witAttachment: WITOM.Attachment,
            selectedIndex: number = this._stepsList.getSelectedRowIndex(),
            testStep: TMOM.TestStep = this._stepsList.getSelectedItem();

        DAUtils.trackAction("AddAttachment", "/Authoring");

        if (attachedFile) {
            witAttachment = this._getWorkItemAttachment(attachedFile.Id);
            if (witAttachment && testStep) {
                witAttachment.linkData.Comment = Utils_String.format("[TestStep={0}]:", testStep.id) + witAttachment.linkData.Comment;
                testStep.addAttachment(witAttachment);
                this._stepsList.updateRows([selectedIndex]);
            }
        }
    }

    private _getWorkItemAttachment(attachmentId: string): WITOM.Attachment {
        let attachment: WITOM.Attachment,
            workItemLinks: WITOM.Link[] = this._workItem.getLinks(),
            linkData: any,
            attachmentIndex: number;

        attachmentIndex = Utils_Array.findIndex(workItemLinks, (attachment) => {
            linkData = attachment.linkData;
            if (linkData.FilePath && (linkData.FilePath === attachmentId)) {
                return true;
            }
            return false;
        });
        if (attachmentIndex >= 0) {
            return <WITOM.Attachment>workItemLinks[attachmentIndex];
        }
        return null;
    }

    private _onOpenSharedTestSteps(sender, eventArgs) {
        if ($(eventArgs.event.target).parents(".test-steps-list").length > 0) {
            this._stepsList._onOpenSharedStep();
        }
    }

    private _fetch(steps, callback) {
        let self = this,
            store: WITOM.WorkItemStore,
            workItemIds = [],
            i;
        if (!this._store) {
            this._store = Service.getCollectionService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        }
        store = this._store;
        function finalize() {
            if ($.isFunction(callback)) {
                callback();
            }
        }

        if (steps && steps.length > 0) {
            for (i = 0; i < steps.length; i++) {
                if (steps[i].actionType === TMOM.TestActionTypes.SharedSteps && !this._workItemCache[steps[i].ref]) {
                    workItemIds.push(steps[i].ref);
                }
            }

            if (workItemIds && workItemIds.length > 0) {
                store.beginPageWorkItems(workItemIds, this.getPageColumns(), function (payload) {
                    self._buildWorkItemCache(payload, self._workItemCache);
                    finalize();
                }, $.noop);
            }
            else {
                finalize();
            }
        }
        else {
            finalize();
        }

    }

    //Updates the parameters field in the workitem cache for shared step changes
    private _onSharedStepWorkItemChanged(sender, workItemArgs) {
        if (workItemArgs.change === WorkItemChangeType.Saved) {
            let workItemIds: string[] = Object.keys(this._workItemCache),
                index: number,
                i: number;

            index = Utils_Array.indexOf(workItemIds, workItemArgs.workItem.id.toString());
            if (index >= 0) {
                this._workItemCache[workItemArgs.workItem.id.toString()][this._parametersLocationInFetchedItem] = workItemArgs.workItem.getField(TCMConstants.WorkItemFieldNames.Parameters).getValue();
                this.readParameters(() => {
                    this._refreshParametersGrid();
                });
            }
        }
    }

    private _buildWorkItemCache(payload: any, workItemCache: any) {
        let i, len,
            row,
            idIndex = $.inArray("System.Id", payload.columns);

        for (i = 0, len = payload.rows.length; i < len; i++) {
            row = payload.rows[i];

            // Caching work item data on key id
            workItemCache[row[idIndex]] = row;
        }
        workItemCache.columns = payload.columns;
    }

    private _getStepValue(step, columnIndex, columnOrder) {
        switch (columnIndex) {
            case "stepId":
                // Last row "Click here to add a step" should not have step Id. 
                // Hence we should return empty string for the last row.
                // Last dummy row corresponding to "click to add a new step" has id = -1
                if (step.id === -1) {
                    return Utils_String.empty;
                }
                else {
                    return Utils_String.format("{0}.", step.index);
                }
            case "action":
                //if it is a shared step then look up value in wit cache
                if (step.ref) {
                    if (this._workItemCache && this._workItemCache[step.ref]) {
                        return this._workItemCache[step.ref][1];
                    }
                    else {
                        return "";
                    }
                } else {
                    return step.action;
                }
            case "expectedResult":
                if (step.expectedResult) {
                    return step.expectedResult;
                }
                else {
                    return "";
                }
            default:
                return "";
        }
    }
}

VSS.initClassPrototype(TestStepsControl, {
    _control: null,
    _stepsField: null,
    _parametersField: null,
    _parametersDataField: null,
    _stepsList: null,
    _parametersList: null,
    _workItemCache: null,
    _steps: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _parameters: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _attachments: null,
    _onWorkItemChanged: null,
    _menuBar: null,
    _parametersLocationInFetchedItem: 4
});

export class SharedParameterWorkItemsSearchAdapter extends WITGlobalRegistration.WorkItemsSearchAdapter {
    public onSearchCompleted: (sharedParameterModels: TMOM.ISharedParameterDataSetModel[]) => void;
    private _projectId: string;

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions(options);
        this._projectId = options ? options.projectId : undefined;
    }

    public _enhance(element: JQuery): void {
        let searchBox = <TFS_Host_UI.SearchBox>Controls.Enhancement.enhance(TFS_Host_UI.SearchBox, element, { notEnableHotKey: true });
        searchBox.setAdapter(this);
    }

    public getWatermarkText(): string {
        return Resources.SearchSharedParameter;
    }

    public hasDropdown(): boolean {
        return false;
    }

    public getDropdownMenuItems(contextInfo: any, callback: IResultCallback, errorCallback: IErrorCallback): void {
        //empty for now.
        let menuItems = [];
        callback([]);
    }

    public performSearch(searchText: string): void {
        this._search(this._getSearchQuery(searchText));
    }

    public getAllSharedParameters(): void {
        this._search(this._getAllSharedParametersSearchQuery());
    }

    private _search(query: string): void {
        let parameterSets: TMOM.ISharedParameterDataSetModel[];

        TMUtils.WorkItemUtils.beginQuery(query, (data) => {
            parameterSets = TMUtils.ParametersHelper.parseSharedParameterPayload(data.payload);
            this.onSearchCompleted(parameterSets);
        }, () => {}, this._projectId);
    }

    private _getAllSharedParametersSearchQuery(): string {
        return Utils_String.format("Select [{0}], [{1}], [{2}], [{3}] FROM WorkItems where [System.TeamProject] = @project AND {4} in GROUP '{5}'",
            WITConstants.CoreFieldRefNames.Id,
            WITConstants.CoreFieldRefNames.Title,
            WITConstants.CoreFieldRefNames.AssignedTo,
            TCMConstants.WorkItemFieldNames.Parameters,
            WITConstants.CoreFieldRefNames.WorkItemType,
            TMOM.WorkItemCategories.ParameterSet);

    }

    private _getSearchQuery(searchText: string): string {
        return Utils_String.format("Select [{0}], [{1}], [{2}], [{3}] FROM WorkItems where [System.TeamProject] = @project AND {4} in GROUP '{5}' AND ([{6}] Contains '{7}' Or [{8}] Contains '{9}')",
            WITConstants.CoreFieldRefNames.Id,
            WITConstants.CoreFieldRefNames.Title,
            WITConstants.CoreFieldRefNames.AssignedTo,
            TCMConstants.WorkItemFieldNames.Parameters,
            WITConstants.CoreFieldRefNames.WorkItemType,
            TMOM.WorkItemCategories.ParameterSet,
            WITConstants.CoreFieldRefNames.Title,
            searchText,
            WITConstants.CoreFieldRefNames.Description,
            searchText);
    }
}

class SharedParameterSearchDialog extends Dialogs.ModalDialog {

    private _sharedParameterGrid: any;
    private _sharedParameterGridOptions: any;
    private _searchAdapter: any;
    private _projectId: string;
    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: true,
            minWidth: 400,
            minHeight: 400,
            width: 600,
            height: 500,
            title: Resources.InsertSharedParameter
        }, options));
        this._projectId = options ? options.projectId : undefined;
    }

    public initialize() {
        super.initialize();
        this._decorate();
        this._updateGrid([]);
        this._searchAdapter.getAllSharedParameters();
    }

    public onOkClick() {
        let sharedParameter = this._getSelectedSharedParameter();
        if (sharedParameter) {
            if (this._options.okCallback) {
                this._options.okCallback(sharedParameter);
            }
        }
        this.close();
    }

    private onKeyDown(e?) {
        e.stopPropagation();
    }   
    
    private _decorate() {
        let element = this._element,
            $gridContainer = $("<div class='shared-parameter-search-results-grid'></div>"),
            $searchBoxContainer = $("<div class='shared-parameter-search-box'></div>");

        element.append($searchBoxContainer)
            .append($gridContainer);
        
        this._searchAdapter = <SharedParameterWorkItemsSearchAdapter>Controls.Enhancement.enhance(SharedParameterWorkItemsSearchAdapter, $searchBoxContainer, {projectId: this._projectId});
        $searchBoxContainer.find(".search-text").keydown(delegate(this, this.onKeyDown));
        this._searchAdapter.onSearchCompleted = (sharedParameterModels: TMOM.ISharedParameterDataSetModel[]) => {
            this._updateGrid(sharedParameterModels);
        };
        
        this._sharedParameterGridOptions = {
            allowMultiSelect: false,
            width: "100%",
            height: "100%",
            columns: [
                {
                    index: "id",
                    text: Resources.TestPointGridColumnID,
                    width: 40
                },
                {
                    index: "title",
                    text: Resources.TestPointGridColumnTitle,
                    width: 200
                },
                {
                    index: "assignedTo",
                    text: Resources.AssignedTo,
                    width: 100
                },
                {
                    index: "sharedParameterDataSet",
                    text: Resources.Parameters,
                    width: 300,
                    getColumnValue: (dataIndex: number, columnIndex: number, columnOrder?: number) => {
                        let paramNames = this._sharedParameterGrid._dataSource[dataIndex][columnIndex].getParameters();
                        paramNames = $.map(paramNames, function (val, i) {
                            if (val !== "") {
                                return "@" + val;
                            }
                        });
                        return paramNames.join();
                    }
                }]
        };
        this._sharedParameterGrid = <SharedParameterSearchResultsGrid>Controls.BaseControl.createIn(SharedParameterSearchResultsGrid, $gridContainer, this._sharedParameterGridOptions);
        this._sharedParameterGrid.onRowDoubleClickHandler = () => { this.onOkClick(); };
        this._sharedParameterGrid.onEnterKeyHandler = () => { this.onOkClick(); };
    }

    private _updateGrid(sharedParameters: TMOM.ISharedParameterDataSetModel[]) {

        this._sharedParameterGrid.setDataSource(sharedParameters, null, this._sharedParameterGridOptions.columns, null);
        if (sharedParameters.length > 0) {
            this._sharedParameterGrid._selectRow(0);
            this.updateOkButton(true);
        }
        else {
            this.updateOkButton(false);
        }
    }

    private _getSelectedSharedParameter(): TMOM.ISharedParameterDataSetModel {
        let selectedDataIndex = this._sharedParameterGrid._selectedRows[this._sharedParameterGrid._selectedIndex];
        return this._sharedParameterGrid._dataSource[selectedDataIndex];
    }

}

class SharedParameterSearchResultsGrid extends Grids.Grid {

    public onRowDoubleClickHandler: () => void;
    public onEnterKeyHandler: () => void;

    public onRowDoubleClick(eventArgs): any {
        if (this.onRowDoubleClickHandler) {
            this.onRowDoubleClickHandler();
        }
    }

    public onEnterKey(eventArgs): any {
        if (this.onEnterKeyHandler) {
            this.onEnterKeyHandler();
        }
    }

    public setDataSource(source?: any, expandStates?: any[], columns?: any, sortOrder?: any, selectedIndex?: number, suppressRedraw?: boolean) {
        this._customizeColumns(columns);
        super.setDataSource(source, expandStates, columns, sortOrder, selectedIndex, suppressRedraw);
    }

    private _customizeColumns(columns) {
        $.each(columns, (index: number, item: any) => {
            if (Utils_String.ignoreCaseComparer(item.index, "id") === 0) {
                item["comparer"] = function (column, order, item1, item2) {
                    return item1[column.index] - item2[column.index];
                };
            }
        });
    }
}

class SharedParameterCreateDialog extends CreateTestArtifactDialog {
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "create-shared-param-dialog",
            title: Resources.CreateSharedParameter.toLocaleUpperCase(),
            waterMarkText: Resources.SharedParameterNameWatermark
        }, options));
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.Controls", exports);

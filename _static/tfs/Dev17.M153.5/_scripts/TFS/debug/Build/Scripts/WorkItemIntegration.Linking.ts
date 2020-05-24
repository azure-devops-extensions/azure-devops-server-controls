///<amd-dependency path="jQueryUI/button"/>
/// <reference types="jquery" />

import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import BuildsTab = require("Build/Scripts/Explorer.BuildsTab");
import CompletedBuilds = require("Build/Scripts/Explorer.CompletedBuildsTab");
import SourceProviderManager = require("Build/Scripts/SourceProviderManager");

import CustomerIntelligenceConstants = require("Build.Common/Scripts/Common/CustomerIntelligence");
import BuildClientServices = require("Build.Common/Scripts/Api2.2/ClientServices");
import BuildCommonResources = require("Build.Common/Scripts/Resources/TFS.Resources.Build.Common");
import { BuildReason } from "Build.Common/Scripts/BuildReason";
import { BuildResult } from "Build.Common/Scripts/BuildResult";
import { BuildStatus } from "Build.Common/Scripts/BuildStatus";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import Build_Client = require("TFS/Build/RestClient");
import BuildContracts = require("TFS/Build/Contracts");

import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Events_Action = require("VSS/Events/Action");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import VSS_Service = require("VSS/Service");

import WorkItemTracking_Linking = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking");
import { ExternalLinkValidator } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.LinkValidator";
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";
import { LinkForm } from "WorkItemTracking/Scripts/LinkForm";

import "VSS/LoaderPlugins/Css!Build/WorkItemIntegration.Linking";

var domElem = Utils_UI.domElem;
var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var delegate = Utils_Core.delegate;

export abstract class BuildLinkFormBase extends LinkForm {

    public $buildNumber: any;
    private build: BuildContracts.Build;

    constructor(options?: any) {
        super(options);
        this._validator = new ExternalLinkValidator(options);
    }

    public initialize() {
        super.initialize();
        this.build = null;

        var $containerTable: JQuery,
            $buildNumberCell: JQuery,
            $browseButtonCell: JQuery,
            $browseButton: JQuery;

        super.initialize();

        $containerTable = $("<table class='vc-link-container' cellspacing=1 cellpadding=0><tr></tr></table>").appendTo(this._element);

        $buildNumberCell = $("<td class='changeset-container'></td>").appendTo($containerTable);
        $buildNumberCell.append(LinkForm.createTitleElement(BuildResources.WorkItemTitleBuildNumber, "cs-id"));

        this.$buildNumber = $("<input>").attr("type", "text").addClass("textbox").addClass("changeset-id-cell").attr("id", "cs-id").appendTo($buildNumberCell);
        this._bind(this.$buildNumber, "keyup change", delegate(this, this._onBuildChange));

        $browseButtonCell = $("<td class='changeset-browse-container'></td>").appendTo($containerTable);
        // Creating button for changeset picker
        $browseButton = $("<button id='cs-find'>...</button>").addClass("changeset-browse-button").button().appendTo($browseButtonCell);
        this._bind($browseButton, "click", delegate(this, this._onBrowseClick));
        this._bind($browseButton, "keydown", delegate(this, this._onKeyBoardOpen));

        // Adding comment field
        this._createComment();

        this.fireLinkFormValidationEvent(false);

    }

    public getBuildNumber() {
        return $.trim(this.$buildNumber.val());
    }


    public abstract getLinkTypeName();

    public getDuplicateMessage() {
        return BuildResources.LinksControlDuplicateBuild;
    }

    public _onValidId(buildId: number) {
        // No-op if this form has been disposed since the asynchronous calls were made.
        if (this.isDisposed()) {
            return;
        }

        // Constructing the external link uri
        var artifactUri = this._constructUri(buildId);

        // Checking to see whether the external link already exists or not
        if (!this._validator.isDuplicate(artifactUri)) {

            // Valid link. Firing this event will close the dialog
            this._fire("resultReady", [{
                linkType: this.getLinkTypeName(),
                comment: this.getComment(),
                links: [{ artifactUri: artifactUri }]
            }]);

            let executedEvent = new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.BuildCommonCustomerIntelligenceArea.BUILDCOMMON,
                CustomerIntelligenceConstants.CustomerIntelligenceBuildLinking.OPEN_LINKED_BUILD, {
                    "buildLinkType": this.getLinkTypeName(),
                });
            Telemetry.publishEvent(executedEvent);
            return false;
        }
        else {
            alert(this.getDuplicateMessage());
        }
    }

    public _constructUri(buildId: number): string {
        return Artifacts_Services.LinkingUtilities.encodeUri({
            tool: Artifacts_Constants.ToolNames.TeamBuild,
            type: Artifacts_Constants.ArtifactTypeNames.Build,
            id: "" + buildId
        });
    }

    private _onBuildChange(e?) {
        var buildNumber = this.getBuildNumber();

        if (!buildNumber) {
            this.fireLinkFormValidationEvent(false);
        }
        else {
            this.fireLinkFormValidationEvent(true);
        }
    }



    public getLinkResult() {
        var result,
            buildNumber = this.getBuildNumber();

        if (!buildNumber.length) {
            // If no build number specified, display warning message
            alert(BuildResources.WorkItemNoBuildNumber);
        }
        // if specific build has been selected and the build number hasn't been changed afterwards, use that
        else if (this.build && Utils_String.defaultComparer(this.build.buildNumber, buildNumber) === 0) {
            this._onValidId(this.build.id);
        }
        else {
            var client = Build_Client.getClient();
            return client.getBuilds(tfsContext.navigation.project,
                undefined,
                undefined,
                buildNumber)
                .then((result: BuildContracts.Build[]) => {
                    if (result.length === 1) {
                        this._onValidId(result[0].id);
                    }
                    else {
                        alert(Utils_String.format(BuildResources.WorkItemBadBuildNumber, this.getBuildNumber()));
                    }
                });
        }
        // Returning undefined will cause dialog not to close. "resultReady" event will be fired later on by _onValidId
        // handler if the item is not a duplicate.
    }

    private _onKeyBoardOpen(keyboardEvent: JQueryKeyEventObject) {
        // Allow only ENTER key alone to open the dialog.
        if (keyboardEvent.keyCode === Utils_UI.KeyCode.ENTER) {
            this._launchBuildPicker();
        }
    }

    private _onBrowseClick(mouseEvent: JQueryMouseEventObject) {
        this._launchBuildPicker();
    }

    private _launchBuildPicker() {
        var model = new BuildPickerDialogModel(tfsContext, (build: BuildContracts.Build) => {
            this.build = build;
            this.$buildNumber.val(build.buildNumber);
            this._onBuildChange();
        });
        var dialog = Dialogs.show(BuildPickerDialog, model);
    }
}

export class BuildLinkForm extends BuildLinkFormBase {
    public getLinkTypeName() {
        return RegisteredLinkTypeNames.Build;
    }
}

export class FoundInBuildLinkForm extends BuildLinkFormBase {
    public getLinkTypeName() {
        return RegisteredLinkTypeNames.FoundInBuild;
    }
}

export class IntegratedInBuildLinkForm extends BuildLinkFormBase {
    public getLinkTypeName() {
        return RegisteredLinkTypeNames.IntegratedInBuild;
    }
}

VSS.initClassPrototype(BuildLinkForm, {
    $buildNumber: null
});

VSS.initClassPrototype(FoundInBuildLinkForm, {
    $buildNumber: null
});

VSS.initClassPrototype(IntegratedInBuildLinkForm, {
    $buildNumber: null
});

export class BuildPickerDialogModel {
    public tfsContext: TFS_Host_TfsContext.TfsContext;
    public okCallback: (build: BuildContracts.Build) => void;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, okCallback?: (build: BuildContracts.Build) => void) {
        this.tfsContext = tfsContext;
        this.okCallback = okCallback;
    }
}

// show with Dialogs.show(QueueDefinitionDialog, model)
export class BuildPickerDialog extends Dialogs.ModalDialog {
    private _model: BuildPickerDialogModel;
    private _buildClient: BuildClientServices.BuildClientService;

    public $buildNumber: JQuery;
    public $definition: JQuery;
    public $buildsGrid: JQuery;
    public $moreBuildsMessage: JQuery;

    private _definitionCombo: Combos.Combo;
    private _resultCombo: Combos.Combo;
    private _$findButton: JQuery;
    private _fromCombo: Combos.ComboO<Combos.IDateTimeComboOptions>;
    private _toCombo: Combos.ComboO<Combos.IDateTimeComboOptions>;
    private _rangeCombo: Combos.Combo;
    private _buildsGrid: CompletedBuildsGridLight;

    private _allDefinitions: BuildContracts.DefinitionReference[];
    private _filteredDefinitions: BuildContracts.DefinitionReference[];
    private _definitionNames: string[];
    private _maxBuildsToShow: number = 50;

    private static _AriaDescribedById = "WIT_FIND_BUILDS_DESCRIPTION_ID";

    constructor(model: BuildPickerDialogModel) {
        super(model);

        this._model = model;
    }

    public initialize() {
        super.initialize();
        this._buildClient = TFS_OM_Common.ProjectCollection.getConnection(this._model.tfsContext).getService<BuildClientServices.BuildClientService>(BuildClientServices.BuildClientService);

        this._initializeDomElements();

        // jquery adds aria-describedby by default and assigns it to the dialog content
        // the problem with that in our scenario is, since we used label for's everywhere, it would just combine all of that and place that as "description"
        // so when the dialog opens in addition to reading the dialog title, it would also ready out all elements in the dialog
        // In our case, that's not what we want and it causes confusion to the user
        // so instead, let's just set our own text that describes the dialog a bit
        // hence, setting the right aria-description for the dialog
        // this._element corresponds to ui-dialog-content, accessing parent would give us ui-dialog for which jquery UI injects aria-describedby to be the ID of the ui-dialog-content
        this._element.parent().attr("aria-describedby", BuildPickerDialog._AriaDescribedById);

        this._allDefinitions = [];
        this._filteredDefinitions = [];
        this._definitionNames = [];

        this._buildClient.beginGetDefinitions().then((value) => {
            this._allDefinitions = value;
            this._filterDefinitions();
        });

        // filter the definitions to show when the dropdown is opened        
        this._definitionCombo.getDropButton().on("mousedown", () => this._filterDefinitions());

    }

    public getDefinitionName(): string {
        return $.trim(this._definitionCombo.getText());
    }

    public getBuildNumber(): string {
        return $.trim(this.$buildNumber.val());
    }

    public getResult(): BuildContracts.BuildResult {
        return this._getEnumFromResultDisplay($.trim(this._resultCombo.getText()));
    }

    public getCompletedFrom(): Date {
        return this._fromCombo.getBehavior<Combos.ComboDateBehavior>().getSelectedDate();
    }

    public getCompletedTo(): Date {
        return this._toCombo.getBehavior<Combos.ComboDateBehavior>().getSelectedDate();
    }

    public getTitle(): string {
        return BuildResources.WorkItemBuildPickerTitle;
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            resizable: false,
            width: 740,
            buttons: {
                "ok": {
                    id: "ok",
                    text: VSS_Resources_Platform.ModalDialogOkButton,
                    click: delegate(this, this.onOkClick)
                },
                "cancel": {
                    id: "cancel",
                    text: VSS_Resources_Platform.ModalDialogCancelButton,
                    click: delegate(this, this.close),
                }
            }
        }, options));
    }

    public onOkClick() {
        if (!this._buildsGrid || this._buildsGrid.getSelectedRowIndex() < 0) {
            alert(BuildResources.WorkItemBuildPickerNoBuildSelected);
        }
        else {
            this.updateOkButton(false);
            this._model.okCallback(this.getDialogResult());
            this.close();
        }
    }

    public dispose() {
        super.dispose();
    }

    // returns build
    public getDialogResult() {
        return this._buildsGrid.getRowData(this._buildsGrid.getSelectedRowIndex());
    }

    private _onFindClick(e?: JQueryEventObject) {
        // use this client so we can pass buildNumber as a filter      
        var client = VSS_Service.getClient(Build_Client.BuildHttpClient2_3);

        // pass undefined if field not filled out
        var definitionId;
        var definitionName = this.getDefinitionName();
        if (definitionName) {
            var defs = this._allDefinitions.filter((def, index) => {
                return Utils_String.localeIgnoreCaseComparer(def.name, definitionName) === 0;
            });
            if (defs.length > 0) {
                definitionId = defs[0].id;
            }
        }

        // pass undefined if field not filled out
        var buildNumber;
        var displayedBuildNumber = this.getBuildNumber();
        if (displayedBuildNumber) {
            buildNumber = displayedBuildNumber;
        }

        // pass undefined if field not filled out
        var minFinishTime;
        var fromTime = this.getCompletedFrom();
        if (fromTime) {
            minFinishTime = fromTime;
        }

        // pass undefined if field not filled out
        var maxFinishTime;
        var toTime = this.getCompletedTo();
        if (toTime) {
            maxFinishTime = toTime;
        }

        return client.getBuilds(tfsContext.navigation.project,
            [definitionId],
            undefined,
            this.getBuildNumber(),
            minFinishTime,
            maxFinishTime,
            undefined,
            undefined,
            undefined,
            this.getResult(),
            undefined,
            undefined,
            undefined,
            this._maxBuildsToShow)
            .then((result: BuildContracts.Build[]) => {
                if (!this._buildsGrid) {
                    this._initializeGrid();
                }

                this._buildsGrid._updateGridSource(result);
                if (result.length >= this._maxBuildsToShow) {
                    this.$moreBuildsMessage.show();
                }
                else {
                    this.$moreBuildsMessage.hide();
                }
            });
    }

    private _initializeDomElements(): void {
        var $containerTable: JQuery,
            $containerRow: JQuery,
            $buildNumberCell: JQuery,
            $browseButtonCell: JQuery,
            $browseButton: JQuery,
            $rangeFrom: JQuery,
            $rangeTo: JQuery,
            controlId = this.getId();


        $("<p></p>").text(BuildResources.WITFindBuildsAriaDescription)
            .addClass("visually-hidden")
            .attr("id", BuildPickerDialog._AriaDescribedById)
            .appendTo(this._element);

        $containerTable = $("<table class='vc-link-container build-wit-link-container' cellspacing=1 cellpadding=0></table>").appendTo(this._element);
        $containerRow = $("<tr class='filter-row' valign='bottom' />").appendTo($containerTable);

        // build number textbox
        $buildNumberCell = $("<td class='build-filter'></td>").attr("colspan", 2).appendTo($containerRow);
        $buildNumberCell.append(LinkForm.createTitleElement(BuildResources.WorkItemTitleBuildNumber, "build-number"));
        this.$buildNumber = $("<input>").attr("type", "text").addClass("textbox").addClass("build-number-cell").attr("id", "build-number").appendTo($buildNumberCell);

        // build definition combo
        var $filterCell = $("<td class='build-filter'></td>").css("padding-left", "10px").attr("colspan", 2).appendTo($containerRow);
        $filterCell.append(LinkForm.createTitleElement(BuildResources.WorkItemDefinitionText, "definition" + controlId));
        this._createDefinitionSelector($filterCell, controlId);

        $containerRow = $("<tr class='filter-row' valign='bottom' />").appendTo($containerTable);

        // result combo
        $filterCell = $("<td class='build-filter'></td>").css("width", "25%").appendTo($containerRow);
        $filterCell.append(LinkForm.createTitleElement(BuildResources.WorkItemResultText, "result" + controlId));
        this._createResultSelector($filterCell, controlId);

        // from date range combo
        $filterCell = $(domElem("td")).css("width", "25%").css("padding-left", "10px").appendTo($containerRow);
        $(domElem("label")).attr("for", "from" + controlId + "_txt").text(BuildResources.WorkItemFromText).appendTo($filterCell);
        $rangeFrom = $(domElem("div", "from")).appendTo($filterCell);
        this._fromCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $rangeFrom, { cssClass: "from-combo", id: "from" + controlId });

        this._fromCombo._options.dateTimeFormat = "G";
        this._fromCombo.setType("date-time");
        this._fromCombo.setMode("drop");

        // to date range combo
        $filterCell = $(domElem("td")).css("width", "25%").css("padding-left", "10px").appendTo($containerRow);
        $(domElem("label")).attr("for", "to" + controlId + "_txt").text(BuildResources.WorkItemToText).appendTo($filterCell);
        $rangeTo = $(domElem("div", "to")).appendTo($filterCell);
        this._toCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $rangeTo, { cssClass: "to-combo", id: "to" + controlId });

        this._toCombo._options.dateTimeFormat = "G";
        this._toCombo._options.defaultTimeOfDay = (24 * 60 * 60 * 1000) - 1; // Set Initial time value of To combo to 11:59:59.999 PM
        this._toCombo.setType("date-time");
        this._toCombo.setMode("drop");

        // find button
        $filterCell = $(domElem("td")).css("width", "1%").css("padding-left", "10px").appendTo($containerRow);
        this._$findButton = $(domElem("button", "find")).text(BuildResources.WorkItemFindText).css("height", "20px").appendTo($filterCell);
        this._$findButton.click(delegate(this, this._onFindClick));

        // grid
        $containerRow = $("<tr class='filter-row' valign='bottom' />").appendTo($containerTable);
        $filterCell = $(domElem("td")).attr("colspan", 4).appendTo($containerRow);
        this.$buildsGrid = $("<div class='build-picker-completed-build-grid' valign='bottom'/>").css("height", "200px").css("padding-top", 10).appendTo($filterCell);

        // more builds message
        $containerRow = $("<tr class='filter-row' valign='bottom' />").appendTo($containerTable);
        $filterCell = $(domElem("td")).attr("colspan", 4).appendTo($containerRow);
        this.$moreBuildsMessage = $("<label>" + BuildResources.WorkItemMoreBuildsMessage + "</label>").appendTo($filterCell); // to do : resources
        this.$moreBuildsMessage.hide();

        this.updateOkButton(true);
    }

    private _initializeGrid() {
        this._buildsGrid = new CompletedBuildsGridLight();
        this._buildsGrid.enhance(this.$buildsGrid);
        this._buildsGrid._updateSource([]);
    }

    private _createDefinitionSelector($container: JQuery, controlId: string) {
        var $definitionInput = $(domElem("input", "definition"))
            .attr("id", "definition" + controlId)
            .appendTo($container)
            .val("");

        this._definitionCombo = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, $definitionInput, {
            cssClass: "definition-combo",
            allowEdit: true,
            source: []
        });

        $("<span class = \"icon icon-search\"/>").appendTo(this._definitionCombo.getElement().find("div.drop"));
        this._definitionCombo.getElement().find("div.drop.bowtie-chevron-down-light").removeClass("bowtie-chevron-down-light");
    }

    private _createResultSelector($container: JQuery, controlId: string) {
        var $resultInput = $(domElem("input", "result"))
            .attr("id", "result" + controlId)
            .appendTo($container)
            .val("");

        this._resultCombo = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, $resultInput, {
            cssClass: "result-combo",
            allowEdit: false,
            source: [
                BuildResources.WorkItemResultAllText,
                BuildResult.getDisplayText(BuildContracts.BuildResult.Succeeded),
                BuildResult.getDisplayText(BuildContracts.BuildResult.PartiallySucceeded),
                BuildResult.getDisplayText(BuildContracts.BuildResult.Failed),
                BuildResult.getDisplayText(BuildContracts.BuildResult.Canceled)
            ]
        });

        this._resultCombo.setSelectedIndex(0);
    }

    private _getEnumFromResultDisplay(display: string): BuildContracts.BuildResult {
        switch (display) {
            case BuildCommonResources.BuildResultSucceeded:
                return BuildContracts.BuildResult.Succeeded;
            case BuildCommonResources.BuildResultPartiallySucceeded:
                return BuildContracts.BuildResult.PartiallySucceeded;
            case BuildCommonResources.BuildResultFailed:
                return BuildContracts.BuildResult.Failed;
            case BuildCommonResources.BuildResultCanceled:
                return BuildContracts.BuildResult.Canceled;
            default: // show all
                return BuildContracts.BuildResult.Succeeded +
                    BuildContracts.BuildResult.PartiallySucceeded +
                    BuildContracts.BuildResult.Failed +
                    BuildContracts.BuildResult.Canceled;
        }
    }

    private _filterDefinitions(): void {
        if (this._allDefinitions && this._allDefinitions.length > 0) {
            this._filteredDefinitions = [];
            this._definitionNames = [];

            var nameFilter = this.getDefinitionName().toLocaleLowerCase().trim();

            this._allDefinitions.forEach((def, index) => {
                if (Utils_String.localeIgnoreCaseComparer(nameFilter, Utils_String.empty) === 0 ||
                    def.name.toLocaleLowerCase().indexOf(nameFilter) >= 0) {
                    this._filteredDefinitions.push(def);
                    this._definitionNames.push(def.name);
                }
            });

            this._definitionCombo.setSource(this._definitionNames);
        }
    }
}

export class CompletedBuildsGridLight extends CompletedBuilds.CompletedBuildsGrid {

    constructor(options?: Grids.IGridOptions) {
        super(options);
    }

    initializeOptions(options?) {
        super.initializeOptions($.extend({
            allowMultiSelect: false,
            openRowDetail: (index: number) => {
                this.viewBuildInNewTab(this.getRowData(index));
            },
        }, options));
    }

    _getInitialColumns(): Grids.IGridColumn[] {
        return [
            {
                index: "reasonText",
                width: BuildsTab.ICON_CELL_WIDTH,
                canSortBy: true,
                getHeaderCellContents: (column: Grids.IGridColumn): JQuery => {
                    return this._createGridIconCell(column, "header", "reason", BuildResources.BuildReasonText);
                },
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var buildRow = <CompletedBuilds.CompletedBuildGridRow>this._dataSource[dataIndex];
                    return this._createGridIconCell2(column, buildRow.reasonStyles, buildRow.reasonText);
                }
            }, {
                index: "statusText",
                width: BuildsTab.ICON_CELL_WIDTH,
                canSortBy: true,
                getHeaderCellContents: (column: Grids.IGridColumn): JQuery => {
                    var cell = $("<span class='icon icon-tfs-build-status-header' />");
                    cell.append($("<div/>").text(BuildResources.BuildStatusText).addClass("title hidden"));
                    return cell;
                },
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var buildRow = <CompletedBuilds.CompletedBuildGridRow>this._dataSource[dataIndex];
                    if (!buildRow.isMoreLink) {
                        return this._createGridIconCell(column, buildRow.statusName, "status", buildRow.statusText);
                    }
                }
            }, {
                index: "buildNumber",
                text: BuildResources.CompletedBuildNameColumn,
                width: 175,
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var buildRow = <CompletedBuilds.CompletedBuildGridRow>this._dataSource[dataIndex];
                    if (!buildRow.isMoreLink) {
                        return <JQuery>(<any>this)._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
                    }
                    else {
                        return this._createGridCell(column)
                            .append($(domElem("a"))
                                .text(BuildResources.MoreBuildsLinkText)
                                .on("click", () => {
                                    this._options.getMoreBuilds();
                                }));
                    }
                }
            }, {
                index: "definitionText",
                text: BuildResources.CompletedBuildDefinitionColumn,
                width: 175
            }, {
                index: "sourceBranchText",
                text: BuildResources.CompletedBuildSourceBranchColumn,
                width: 120
            }, {
                index: "finishTime",
                text: BuildResources.CompletedBuildDateColumn,
                width: 120,
                comparer: (column, order, buildRow1: CompletedBuilds.CompletedBuildGridRow, buildRow2: CompletedBuilds.CompletedBuildGridRow): number => {
                    if (buildRow1.finishTime instanceof Date && buildRow2.finishTime instanceof Date) {
                        return buildRow1.finishTime.getTime() - buildRow2.finishTime.getTime();
                    }

                    return 0;
                },
                getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder): JQuery => {
                    var finishTime = this._dataSource[dataIndex][column.index];
                    if (finishTime instanceof Date) {
                        return this._createGridDateCell(column, finishTime);
                    }
                    else {
                        // There might be cases where the finish time of a completed build might be empty.
                        // Displaying empty cell in this case.
                        return this._createGridCell(column);
                    }
                }
            }];
    }

    _getContextMenuItems(args?: any): Menus.IMenuItemSpec[] {
        var result: Menus.IMenuItemSpec[] = [];
        var build = <CompletedBuilds.CompletedBuildGridRow>args.item;

        if (build.isMoreLink) {
            return;
        }

        // open build in new tab
        result.push({
            rank: 15, id: "open-build", text: BuildResources.OpenInNewTab, icon: "icon-open",
            action: () => {
                this.viewBuildInNewTab(build);
            }
        });

        return result;
    }

    _updateGridSource(builds: BuildContracts.Build[]): void {
        let sourceProvider = new SourceProviderManager.SourceProviderManager();
        let moreThan50Builds = builds.length >= 50;

        super._updateSource($.map(builds, (build: BuildContracts.Build) => {
            let statusName = "",
                statusText = "";

            // Extract status name and text
            switch (build.status) {
                case BuildContracts.BuildStatus.Completed:
                    statusName = BuildResult.getTextClassName(build.result);
                    statusText = BuildResult.getDisplayText(build.result);
                    break;
                case BuildContracts.BuildStatus.InProgress:
                    statusName = "inprogress";
                    statusText = BuildStatus.getDisplayText(build.status, build.result);
                    break;
                default:
                    statusName = "queued";
                    statusText = BuildStatus.getDisplayText(build.status, build.result);
                    break;
            }

            return <CompletedBuilds.CompletedBuildGridRow>$.extend(build, {
                retain: build.keepForever,
                reasonStyles: BuildReason.getStyles(build.reason),
                reasonText: BuildReason.getName(build.reason, true),
                statusName: statusName,
                statusText: statusText,
                definitionText: build.definition ? build.definition.name : "",
                isMoreLink: !build.id,
                sourceBranchText: sourceProvider.getSourceBranch(build),
                getSourceVersionGridCell: () => { return sourceProvider.getSourceVersionGridCell(build); }
            });
        }));
    }

    public viewBuildInNewTab(build: BuildContracts.Build) {
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
            target: "_blank",
            url: build._links.web.href
        });
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("WorkItemIntegration.Linking", exports);

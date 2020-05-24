/// <amd-dependency path="jQueryUI/button"/>

import Q = require("q");
import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import VSS = require("VSS/VSS");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Service = require("VSS/Service");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Utils_UI = require("VSS/Utils/UI");
import WITCommonResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.Common");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Telemetry = require("VSS/Telemetry/Services");
import QueryCombo = require("WorkItemTracking/SharedScripts/QueryCombo");
import QueryResultGrid = require("WorkItemTracking/Scripts/Controls/Query/QueryResultGrid");
import WorkItemsProvider = require("WorkItemTracking/Scripts/Controls/WorkItemsProvider");
import CustomerIntelligenceConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import { QueryItem, QueryDefinition } from "WorkItemTracking/Scripts/OM/QueryItem";
import { QueryAdapter } from "WorkItemTracking/Scripts/OM/QueryAdapter";
import { LinkQueryMode } from "WorkItemTracking/Scripts/OM/QueryConstants";
import { IClause, IFilter } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

const getErrorMessage = VSS.getErrorMessage;
const TfsContext = TFS_Host_TfsContext.TfsContext;
const delegate = Utils_Core.delegate;

export interface WorkItemFinderDialogOptions extends Dialogs.IModalDialogOptions {
    workItem?: WITOM.WorkItem;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

export class WorkItemFinderDialog extends Dialogs.ModalDialogO<WorkItemFinderDialogOptions> {

    public static enhancementTypeName: string = "WorkItemFinderDialog";

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    public _projectName: string;
    public _store: WITOM.WorkItemStore;
    private _projectNames: string[];
    private _queryResultsProviders: any;

    public _project: WITOM.Project;
    public _lastStatusOfFindButton: boolean;  // Will get use when switch between radio button
    public _grid: QueryResultGrid.QueryResultGrid;
    public $statusContainer: JQuery;
    public $resultStatusContainer: JQuery;
    public $listContainer: JQuery;
    public $findButton: JQuery;
    public $selectAllButton: JQuery;
    public $unselectAllButton: JQuery;
    public $resetButton: JQuery;
    public $queriesBox: JQuery;
    public $witTypesBox: JQuery;
    public $projectBox: JQuery;
    public $queries: QueryCombo.QueryCombo;
    public $projects: Combos.Combo;
    public $witTypes: Combos.Combo;
    public $ids: JQuery;
    public $titleContains: JQuery;
    public $queryRadioButton: JQuery;
    public $idRadioButton: JQuery;
    public $titleRadioButton: JQuery;
    public $queryMethodRow: JQuery;
    public $queryResultGrid: JQuery;

    constructor(options?: WorkItemFinderDialogOptions) {
        super(options);

        const tfsContext = this._options.tfsContext;
        Diag.Debug.assert(tfsContext !== null && typeof (tfsContext) !== "undefined", "tfs context is expected.");
        this._tfsContext = tfsContext;
    }

    public initializeOptions(options?: WorkItemFinderDialogOptions) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            buttons: {
                "ok": {
                    id: "workitemFinderOk",
                    text: (options && options.okText) || VSS_Resources_Platform.ModalDialogOkButton,
                    click: delegate(this, this.onOkClick),
                    disabled: "disabled"
                },
                "cancel": {
                    id: "workitemFinderCancel",
                    text: (options && options.cancelText) || VSS_Resources_Platform.ModalDialogCancelButton,
                    click: delegate(this, this.onCancelClick)
                }
            }
        }, options));
    }

    public updateFindButton(enabled?: boolean) {
        /// <param name="enabled" type="boolean" optional="true" />

        this.$findButton.button("option", "disabled", enabled === false);
    }

    public updateOkButtonForWorkitemDialog(enabled: boolean) {
        this.updateButtonForWorkitemDialog(enabled, "workitemFinderOk");
    }

    public updateButtonForWorkitemDialog(enabled: boolean, _button: string) {
        if (this.getElement()) {
            this.getElement().trigger(Dialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { enabled: enabled === true, button: _button });
        }
    }

    public changeFindButtonStateAndUpdateStyle(inputBoxElement: JQuery) {
        if (inputBoxElement.val().trim() === "") {
            this.updateFindButton(false);
        } else {
            this.updateFindButton(true);
        }
    }

    public updateFindButtonAndStyleForIDs() {
        this.changeFindButtonStateAndUpdateStyle(this.$ids);
    }

    public updateFindButtonAndStyleForTitle() {
        this.changeFindButtonStateAndUpdateStyle(this.$titleContains);
    }

    public updateFindButtonOnProjectChange() {
        this._lastStatusOfFindButton = false;
        this._disableInputField();
    }

    /**
     * Set status text
     * @param text
     * @param isError (Optional)
     */
    public setStatusText(text: string, isError?: boolean) {
        if (isError === true) {
            this.$statusContainer.empty().addClass("error").text(text);
            RichContentTooltip.addIfOverflow(text, this.$statusContainer);
        } else {
            this.$statusContainer.empty().removeClass("error");
            $("<label>").text(text).appendTo(this.$statusContainer);
        }
    }

    public showError(error) {
        this.setStatusText(getErrorMessage(error), true);
        this.$listContainer.hide();
        // Clear result status container text
        this.$resultStatusContainer.text("");

        this.changeButtonState(this.$unselectAllButton, false);
        this.changeButtonState(this.$selectAllButton, false);

        // Disable "OK" button
        this.updateOkButtonForWorkitemDialog(false);
    }

    public clearError() {
        this.setStatusText(Resources.WorkItemIDListString, false);
        this.$listContainer.show();
    }

    public onLoadCompleted(content) {
        super.onLoadCompleted(content);

        // Initializing QueryResultsProvider cache
        this._queryResultsProviders = {};

        // Getting the store
        this._store = TFS_OM_Common.ProjectCollection.getConnection(this._tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);

        // Getting current project name from navigation
        this._projectName = this._tfsContext.navigation.project || "";

        this._decorate();

        // Pin the workitem , so that it isn't removed from cache by the cleanup thread(cleanCache).
        WorkItemManager.get(this._store).pin(this._options.workItem);
    }

    public _initializeInputFields() {
        // For the first time when page will get loaded
        this.$ids.attr("disabled", "disabled");
        this.$titleContains.attr("disabled", "disabled");
        if (this.$witTypes) {
            this.$witTypes.setEnabled(false);
        }
        this.$witTypesBox.attr("disabled", "disabled");
    }

    public _disableInputField() {
        if (this.$queryRadioButton.is(":checked")) {
            this.$queries.setEnabled(true);
            this.$queriesBox.removeAttr("disabled");

            this.$ids.attr("disabled", "disabled");
            this.$titleContains.attr("disabled", "disabled");
            this.$witTypes.setEnabled(false);
            this.$witTypesBox.attr("disabled", "disabled");

            // Updating "Find" button
            this.updateFindButton(this._lastStatusOfFindButton);
        } else if (this.$idRadioButton.is(":checked")) {
            this.$ids.removeAttr("disabled");

            this.$queries.setEnabled(false);
            this.$queriesBox.attr("disabled", "disabled");
            this.$titleContains.attr("disabled", "disabled");
            this.$witTypes.setEnabled(false);
            this.$witTypesBox.attr("disabled", "disabled");

            // Updating "Find" button
            this.updateFindButtonAndStyleForIDs();
        } else {  // "Title-contains" radio button is checked
            this.$titleContains.removeAttr("disabled");
            this.$witTypes.setEnabled(true);
            this.$witTypesBox.removeAttr("disabled");

            this.$queries.setEnabled(false);
            this.$queriesBox.attr("disabled", "disabled");

            this.$ids.attr("disabled", "disabled");

            // Updating "Find" button
            this.updateFindButtonAndStyleForTitle();
        }

        this._resetButtonsAndResultGrid();
        // Clear result status container text
        this.$resultStatusContainer.text("");
    }

    public _selectAll() {
        this._grid.selectAll();
        this._grid.getSelectedRowIntoView();
        this._grid.focus();
        this.changeButtonState(this.$unselectAllButton, true);
        this.updateOkButtonForWorkitemDialog(true);
    }

    // To un-select any item from result grid.
    public _unselectAll() {
        this._grid._clearSelection();
        this._grid.focus();
        // After un-select disable "Unselect All" and "OK" button.
        this.changeButtonState(this.$unselectAllButton, false);
        this.updateOkButtonForWorkitemDialog(false);
    }

    public _resetButtonsAndResultGrid() {
        // Clear result and updating _count variable to handle re-sizing issue.
        this._grid._cleanUpRows();
        this._grid._count = 0;
        this.$queryResultGrid.hide();

        // Clear any error state
        this.clearError();

        // Disable "Select All" and "Unselect All" button
        this.changeButtonState(this.$unselectAllButton, false);
        this.changeButtonState(this.$selectAllButton, false);

        // Disable "OK" button
        this.updateOkButtonForWorkitemDialog(false);

    }

    public _reset() {
        // To reset "query" input box (it will not change query input box, if project is "Any project")
        if (this.$projects.getText() != Resources.WorkItemFinderAnyProject) {
            this.$queries.setText("");
            if (!this.$queryRadioButton.is(":checked")) {
                this.$queries.setEnabled(false);
            }
        }

        // To clear IDs input box
        this.$ids.val("");

        // To clear Title-contains input box
        this.$titleContains.val("");

        // To reset "work item type" input box
        this.$witTypes.setText(Resources.WorkItemFinderAllWorkItemTypes);

        // Disable "Find" Button
        this.updateFindButton(false);
        this._lastStatusOfFindButton = false;

        // Clear result status container text
        this.$resultStatusContainer.text("");

        this._resetButtonsAndResultGrid();
    }

    public changeButtonState(buttonElement: JQuery, newState: boolean) {
        buttonElement.button("option", "disabled", newState ? "" : "disabled");
    }

    public enableDisableQueryMethod(projectName: string) {
        if (projectName === Resources.WorkItemFinderAnyProject) {
            if (this.$queryRadioButton.is(":checked")) {
                this.$idRadioButton.prop("checked", true);
                this.$ids.removeAttr("disabled");
                this.updateFindButtonAndStyleForIDs();
                this.$queriesBox.attr("disabled", "disabled");
            }

            this.$queryRadioButton.prop("disabled", true);
            this.$queries.setText("");
            this.$queries.setEnabled(false);
            this.$queryMethodRow.addClass("blur-query-method-box");
        } else {
            this.$queryRadioButton.prop("disabled", false);
            this.$queryMethodRow.removeClass("blur-query-method-box");
        }

    }

    public onQueryChanged() {
        const state = !!this.$queries.getSelectedItem();
        this.updateFindButton(state);
        this._lastStatusOfFindButton = state;
    }

    public onSelectedWorkItemChanged(e?, id?) {
        const value: boolean = this._grid.getSelectedWorkItemIds().length > 0;
        this.updateOkButtonForWorkitemDialog(value);
        this.changeButtonState(this.$unselectAllButton, value);
    }

    public onClose(e?) {
        /// <summary>Performs necessary cleanup</summary>

        // Finally, unpin the workitem.
        if (this._store) {
            WorkItemManager.get(this._store).unpin(this._options.workItem);
        }

        this._queryResultsProviders = null;
        delete this._queryResultsProviders;

        super.onClose(e);
    }

    public onDialogResize(e?) {
        /// <summary>Forces QueryResultGrid to redraw itself whenever dialog is resized</summary>
        this._grid._onContainerResize(e);
    }

    public getDialogResult(): number[] {
        /// <summary>Returns the work item ids</summary>
        /// <returns type="Array" />
        return this._grid.getSelectedWorkItemIds();
    }

    private _onEnterKeyDown(e?: JQueryEventObject) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            if (!this.$findButton.is(":disabled") && this._element.siblings(".ui-dialog-buttonpane").find("#workitemFinderOk").is(":disabled")) {
                this._onFindButtonClick();
            }
        }
    }

    private _enterKeyOnFindButton(e?: JQueryEventObject) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._onFindButtonClick();
        }
    }

    private _onFindButtonClick() {
        // Clear result and updating _count variable to handle re-sizing issue.
        this._grid._cleanUpRows();
        this._grid._count = 0;
        this.$resultStatusContainer.text(Resources.WorkItemFinderQueryInProgress);

        this._runQuery();
    }

    private _enterKeyOnResetButton(e?: JQueryEventObject) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._reset();
        }
    }

    private _enterKeyOnSelectAllButton(e?: JQueryEventObject) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._selectAll();
        }
    }

    private _enterKeyOnUnselectAllButton(e?: JQueryEventObject) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._unselectAll();
        }
    }

    private _decorate() {
        // Setting the title of the dialog.
        this.setTitle(this._options.title || Resources.WorkItemFinderDialogTitle);

        // Populating project container
        const $projectContainer = this._element.find("div.project-container");
        const $projectLabel = $("<label>").append(Resources.WorkItemFinderProject).appendTo($projectContainer);
        this.$projectBox = $("<input>").addClass("project").attr({ type: "text", id: "project", name: "project" }).appendTo($projectContainer);
        $projectLabel.attr("for", "project");

        // Filter Container
        const $filterTypeContainer = this._element.find("div.filter-type-container");

        $("<label>").append(Resources.WorkItemMethodSelectionText).appendTo($filterTypeContainer);

        // Populate filters
        this._populateQueryFilter($filterTypeContainer);
        this._populateIdsFilter($filterTypeContainer);
        this._populateTitleAndTypeFilter($filterTypeContainer);

        // Find button
        this.$findButton = $("<button>")
            .text(Resources.WorkItemFinderFindButtonText).button()
            .addClass("work-item-find-button")
            .click(delegate(this, this._onFindButtonClick))
            .appendTo($filterTypeContainer);

        // Getting references to containers
        this.$statusContainer = this._element.find("div.status-container");
        this.$listContainer = this._element.find("div.list-container");
        this.$resultStatusContainer = this._element.find("div.result-status-container");

        // Instantiating query results grid if it is not created and enhanced already
        this.$queryResultGrid = this._element.find("div.query-result-grid").attr("aria-label", Resources.WorkItemFinder_AriaLabel_FindResultsGrid);
        this._grid = <QueryResultGrid.QueryResultGrid>Controls.Enhancement.enhance(QueryResultGrid.QueryResultGrid, this.$queryResultGrid);
        $.extend(this._grid._options, {
            dontDeleteCache: true,

            // When true, QueryResultGrid ID column value is displayed as link to individual work item.
            // We don’t want individual columns to be in tab order instead allow navigation via arrow keys.
            // Set it to false so that ID column is not in tab order.
            displayIdWithLinks: false,

            // Do not show context menu on the picker dialog
            showContextMenu: false
        });

        // Do not allow the query grid within the dialog to open the work item form
        this._grid.setTitleInteraction(false, false);

        Diag.Debug.assert(this._grid ? true : false, "Unable to find QueryResultsGrid control.");

        // Attaching to work item changed event of Grid
        this._grid._bind("selectedWorkItemChanged", delegate(this, this.onSelectedWorkItemChanged));

        // Initializing
        this._lastStatusOfFindButton = false;

        // Initializing status container
        this.setStatusText(Resources.WorkItemIDListString);

        // Initializing radio buttons

        this.$queryMethodRow = this._element.find("tr.query-method-row");

        // Initializing "Select All" button
        this.$selectAllButton = this._element.find("button.select-all").button().click(delegate(this, this._selectAll));

        // Initializing "Unselect All" button
        this.$unselectAllButton = this._element.find("button.unselect-all").button().click(delegate(this, this._unselectAll));

        // If multi-select is disable then don't show "Select All" and "Unselect All" button
        if (!this._grid._options.allowMultiSelect) {
            this.$selectAllButton.addClass("hide");
            this.$unselectAllButton.addClass("hide");
        }

        // Initially "Select All" and "Unselect All" button will be disabled
        this.changeButtonState(this.$unselectAllButton, false);
        this.changeButtonState(this.$selectAllButton, false);

        // Initializing Reset button
        this.$resetButton = this._element.find("button.reset").button().click(delegate(this, this._reset));

        // Binding
        this._bindEnterKey();

        // Initializing Project combo
        this._populateProjects().then(() => {
            // To disable input fields associated with radio buttons
            this._initializeInputFields();
            this.$projectBox.focus();
        });
    }

    private _populateQueryFilter($container: JQuery): void {
        const shouldUseFavorites = FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessWorkItemTrackingFindWiUseFavorites);

        // Container to hold radio button and combo
        const $queryFiltersContainer = $("<div>").addClass("radio-filter-container query-filter-container").appendTo($container);

        // Radio button and label
        const $checkboxContainer = $("<span>").appendTo($queryFiltersContainer);
        this.$queryRadioButton = $("<input>")
            .addClass("radio-input")
            .attr({ type: "radio", name: "method", id: "query-button", value: "query-button", checked: true })
            .change(delegate(this, this._disableInputField))
            .appendTo($checkboxContainer);
        const queryLabel = shouldUseFavorites ? Resources.WorkItemFinderFavorites : Resources.WorkItemFinderQuery;
        $("<label>").addClass("radio-label").text(queryLabel).attr("for", "query-button").appendTo($checkboxContainer);

        // Create combo box
        this.$queriesBox = $("<input>").attr({ type: "text", id: "query", name: "query" });
        $("<span>").addClass("filter-input").append(this.$queriesBox).appendTo($queryFiltersContainer);
        const selectionMode = shouldUseFavorites ? QueryCombo.QuerySelectionMode.Favorites : QueryCombo.QuerySelectionMode.QueryDefinitions;

        // Initializing Query combo
        this.$queries = <QueryCombo.QueryCombo>Controls.Enhancement.enhance(
            QueryCombo.QueryCombo,
            this.$queriesBox,
            $.extend({
                    allowEdit: false,
                    sepChar: QueryItem.DEFAULT_PATH_SEPARATOR,
                    change: delegate(this, this.onQueryChanged)
                },
                <QueryCombo.IQueryComboOptions>{
                    selectionMode,
                    allowSelfReferentialSelection: false,
                    watermark: shouldUseFavorites ? Resources.WorkItemFinderSelectFavoriteText : Resources.WorkItemFinderSelectQueryText,
                }
        ));
        this.$queries.beginInitialize(() => undefined, (error) => {
            this.showError(error);
        });
    }

    private _populateIdsFilter($container: JQuery): void {
        // Container to hold radio button and textbox
        const $idsFiltersContainer = $("<div>").addClass("radio-filter-container").appendTo($container);

        // Radio button and label
        const $checkboxContainer = $("<span>").appendTo($idsFiltersContainer);
        this.$idRadioButton = $("<input>")
            .addClass("radio-input")
            .attr({ type: "radio", name: "method", id: "id", value: "id" })
            .appendTo($checkboxContainer);
        this.$idRadioButton.change(delegate(this, this._disableInputField));
        $("<label>").addClass("radio-label").text(Resources.WorkItemFinderIds).attr("for", "id").appendTo($checkboxContainer);

        // Initializing ids input textbox
        this.$ids = $("<input>")
            .addClass("textbox")
            .attr({ "type": "text", "id": "ids", "name": "Ids" })
            .attr("aria-label", Resources.WorkItemFinderIds)
            .keyup(delegate(this, this.updateFindButtonAndStyleForIDs));
        $("<span>").addClass("filter-input").append(this.$ids).appendTo($idsFiltersContainer);
    }

    private _populateTitleAndTypeFilter($container: JQuery): void {
        // Container to hold radio button, title textbox and types combo box
        const $titleAndTypeFiltersContainer = $("<div>").addClass("title-and-type-filter-container").appendTo($container);

        // Individual containers to hold title and types rows
        const $titleContainsContainer = $("<div>").addClass("radio-filter-container").appendTo($titleAndTypeFiltersContainer);
        const $typeContainer = $("<div>").addClass("radio-filter-container type-container").appendTo($titleAndTypeFiltersContainer);

        // Radio button and label
        const $radioAndLabelContainer = $("<span>").appendTo($titleContainsContainer);
        this.$titleRadioButton = $("<input>")
            .addClass("radio-input")
            .attr({ type: "radio", name: "method", id: "title", value: "title", "aria-label": Resources.WorkItemFinderTitleContainsAndType })
            .appendTo($radioAndLabelContainer)
            .change(delegate(this, this._disableInputField));
        $("<label>").addClass("radio-label").text(Resources.WorkItemFinderTitleContains).appendTo($radioAndLabelContainer);

        // Textbox for title input
        this.$titleContains = $("<input>")
            .addClass("textbox")
            .attr({ "type": "text", "id": "title-contains", "name": "title-contains" })
            .attr("aria-label", Resources.WorkItemFinderTitleContains)
            .keyup(delegate(this, this.updateFindButtonAndStyleForTitle));
        $("<span>").addClass("filter-input").append(this.$titleContains).appendTo($titleContainsContainer);

        // Types label
        const $labelContainer = $("<span>").appendTo($typeContainer);
        $("<label>").addClass("radio-label type-label").text(Resources.WorkItemFinderTypes).appendTo($labelContainer);

        // Combo box for workItemTypes
        this.$witTypesBox = $("<input>").attr({ "type": "text", "id": "type", "name": "type" });
        this.$witTypesBox.attr("aria-label", Resources.WorkItemFinderWorkItemTypes);
        $("<span>").addClass("filter-input").append(this.$witTypesBox).appendTo($typeContainer);
    }

    private _bindEnterKey() {
        this._bind(this.$findButton, "keydown", delegate(this, this._enterKeyOnFindButton));
        this._bind(this._element.find("div.filter-container"), "keydown", delegate(this, this._onEnterKeyDown));
        this._bind(this.$resetButton, "keydown", delegate(this, this._enterKeyOnResetButton));
        this._bind(this.$selectAllButton, "keydown", delegate(this, this._enterKeyOnSelectAllButton));
        this._bind(this.$unselectAllButton, "keydown", delegate(this, this._enterKeyOnUnselectAllButton));
    }

    public _populateWITTypes(projectName: string) {
        let types = [Resources.WorkItemFinderAllWorkItemTypes];

        if (projectName != Resources.WorkItemFinderAnyProject) {
            types = types.concat(this._project.workItemTypeNames);
        }

        this.$witTypes.setSource(types);
        this.$witTypes.setText(types[0]);
    }

    public _populateProjects(): IPromise<void> {
        const defer = Q.defer<void>();

        const failed = delegate(this, this.showError);
        const projectName = this._projectName || "";

        this._store.beginGetProjects((projects: WITOM.Project[]) => {
            const projectNames = [Resources.WorkItemFinderAnyProject];

            $.map(projects, function (prj) {
                projectNames.push(prj.name);
            });

            this._projectNames = projectNames;
            this.$projects = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, this.$projectBox, {
                allowEdit: false,
                source: projectNames,
                indexChanged: (ind) => {
                    this._populateQueries(this._projectNames[ind]);
                    this._populateWITTypes(this._projectNames[ind]);
                    this._resetButtonsAndResultGrid();
                    this.enableDisableQueryMethod(this._projectNames[ind]);
                    // Clear result status container text
                    this.$resultStatusContainer.text("");
                }
            });

            this.$projects.setText(projectName);

            if (projectName.length) {
                this.$witTypes = <Combos.Combo>Controls.Enhancement.enhance(Combos.Combo, this.$witTypesBox, {
                    allowEdit: false
                });

                this._populateQueries(projectName, true);
                this._populateWITTypes(this._project.name);
            }

            defer.resolve(null);
        }, failed);

        return defer.promise;
    }

    private _populateQueries(projectName: string, initializing?: boolean) {
        const failed = delegate(this, this.showError);
        this._projectName = projectName;

        if (projectName != Resources.WorkItemFinderAnyProject) {
            this._store.beginGetProject(projectName, (project: WITOM.Project) => {

                this._project = project;

                this.$queries.beginSetProject(this._project, () => {
                    this.$queries.setText("");
                    this.updateFindButtonOnProjectChange();
                }, (error) => {
                    this.showError(error);
                });
            }, failed);
        }
    }

    private _getQueryResultsProvider(query: QueryDefinition) {
        let queryResultsProvider;
        const providers = this._queryResultsProviders;
        const key = this._project.name + ";" + (query.path ? query.path(true) : query.name);

        queryResultsProvider = providers[key];
        if (!queryResultsProvider) {
            queryResultsProvider = new WorkItemsProvider.QueryResultsProvider(query, { skipPersistingColumnResize: true, errorCallback: delegate(this, this.showError) });
            providers[key] = queryResultsProvider;
        }

        return queryResultsProvider;
    }

    private _generateClause(_logicalOperator: string, _fieldName: string
        , _operator: string, _value: string): IClause {
        return <IClause>({
            logicalOperator: _logicalOperator,
            fieldName: _fieldName,
            operator: _operator,
            value: _value
        });
    }

    private _generateProjectClause(searchProject: string) {
        if (!searchProject) {
            return null;
        }

        return this._generateClause(
            WITCommonResources.WiqlOperators_And,
            WITConstants.CoreFieldRefNames.AreaPath,
            WITCommonResources.WiqlOperators_Under,
            searchProject);
    }

    private _generateIDsClause(searchIDs: string) {
        if (!searchIDs) {
            return null;
        }

        return this._generateClause(
            WITCommonResources.WiqlOperators_And,
            WITConstants.CoreFieldRefNames.Id,
            WITCommonResources.WiqlOperators_In,
            searchIDs);
    }

    private _generateTitleClause(searchTitle: string) {
        if (!searchTitle) {
            return null;
        }

        return this._generateClause(
            WITCommonResources.WiqlOperators_And,
            WITConstants.CoreFieldRefNames.Title,
            WITCommonResources.WiqlOperators_Contains,
            searchTitle);
    }

    private _generateWITTypeClause(searchType: string) {
        if (!searchType) {
            return null;
        }

        return this._generateClause(
            WITCommonResources.WiqlOperators_And,
            WITConstants.CoreFieldRefNames.WorkItemType,
            WITCommonResources.WiqlOperators_EqualTo,
            searchType);
    }

    private _getQueryItem(successCallback, errorCallback) {
        const isSearchByQuery: boolean = this.$queryRadioButton.is(":checked");
        const isSearchByTitle: boolean = this.$titleRadioButton.is(":checked");
        const isSearchByIDs: boolean = this.$idRadioButton.is(":checked");

        let searchMethodForTelemetry: string;

        const searchTitle: string = this.$titleContains.val();
        const searchWITType: string = this.$witTypes.getText();
        const searchIDs: string = this.$ids.val();
        const searchInProject: string = this._projectName;

        if (isSearchByQuery) {
            searchMethodForTelemetry = "Query";

            successCallback(this.$queries.getBehavior().getDataSource().getItem(this.$queries.getBehavior().getSelectedIndex(), true));
        } else if (isSearchByTitle || isSearchByIDs) {
            let query: string;
            let queryName: string;

            const columns: string[] = [WITConstants.CoreFieldRefNames.Id,
                WITConstants.CoreFieldRefNames.Title,
                WITConstants.CoreFieldRefNames.State,
                WITConstants.CoreFieldRefNames.AreaPath,
                WITConstants.CoreFieldRefNames.IterationPath,
                WITConstants.CoreFieldRefNames.Tags];

            const clauses: IClause[] = [];

            if (searchInProject != Resources.WorkItemFinderAnyProject) {
                clauses.push(this._generateProjectClause(searchInProject));
            }

            if (isSearchByIDs) {
                searchMethodForTelemetry = "ID";

                queryName = "Search By IDs";

                clauses.push(this._generateIDsClause(searchIDs));
            } else if (isSearchByTitle) {
                searchMethodForTelemetry = "Title";

                queryName = "Search By Title";

                clauses.push(this._generateTitleClause(searchTitle));
                if (searchWITType != Resources.WorkItemFinderAllWorkItemTypes) {
                    clauses.push(this._generateWITTypeClause(searchWITType));
                }
            }

            const filter: IFilter = {
                clauses: clauses,
                groups: []
            };

            const editinfo = {
                mode: LinkQueryMode.WorkItems,
                treeLinkTypes: "",
                linkTypes: "",
                sourceFilter: filter,
                treeTargetFilter: {},
                linkTargetFilter: {}
            };

            const queryAdapter: any = (<Service.VssConnection>this._project.store.tfsConnection).getService<QueryAdapter>(QueryAdapter);
            queryAdapter.beginGenerateWiql(editinfo, columns, [], (wiql: string) => {
                query = wiql;

                // Ensure a unique query name to avoid QueryResultsProvider caching in _getQueryResultsProvider()
                queryName = queryName + Math.random();

                successCallback({
                    tag: { custom: false },
                    isCustom: true,
                    isIDTitleSearch: true,
                    searchMethodForTelemetry,
                    name: queryName,
                    queryText: query
                });
            }, errorCallback);
        } else {
            errorCallback(Resources.InvalidErrorParameter);
        }

        // To collect telemetry data about which method is getting used for search
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING, CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_WORK_ITEM_FINDER, { "method": searchMethodForTelemetry }));
    }

    private _runQuery() {

        const displayQueryResults = (query: QueryItem) => {
            const resultsProvider = this._getQueryResultsProvider(query as QueryDefinition);

            this.updateFindButton(false);
            this.$listContainer.show();

            this._grid.beginShowResults(resultsProvider, () => {
                this.$queryResultGrid.show();
                this.updateFindButton();
                this.clearError();
                this.$resultStatusContainer.text(Utils_String.format(Resources.WorkItemFinderResultStatusString, this._grid._count));
                // Enable "Select ALL" button if result count is greater than 0
                if (this._grid._count) {
                    this.changeButtonState(this.$selectAllButton, true);
                } else {
                    this.changeButtonState(this.$selectAllButton, false);
                }

            });
        };

        const processQueryItem = (item: any) => {
            let query: QueryItem;
            if (item.isIDTitleSearch) {
                query = $.extend({ project: this._project }, item);
            } else {
                query = this.$queries.getSelectedItem();
            }
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_WORK_ITEM_FINDER,
                {
                    "event": "runQuery",
                    "usingFavorites": FeatureAvailabilityService.isFeatureEnabled(
                        ServerConstants.FeatureAvailabilityFlags.WebAccessWorkItemTrackingFindWiUseFavorites
                    ),
                    "searchMethod": item.searchMethodForTelemetry || "Query",
                })
            );

            displayQueryResults(query);
        };

        this._getQueryItem(processQueryItem, delegate(this, this.showError));
    }
}

VSS.initClassPrototype(WorkItemFinderDialog, {
    $statusContainer: null,
    $resultStatusContainer: null,
    $listContainer: null,
    $findButton: null,
    $selectAllButton: null,
    $unselectAllButton: null,
    $resetButton: null,
    $queries: null,
    $witTypes: null,
    $ids: null,
    $titleContains: null,
    $projects: null,
    $queryRadioButton: null,
    $idRadioButton: null,
    $titleRadioButton: null,
    $queryMethodRow: null,
    _tfsContext: null,
    _projectName: null,
    _store: null,
    _project: null,
    _projectNames: null,
    _customQuery: null,
    _defaultQuery: null,
    _queryResultsProviders: null,
    _grid: null
});

VSS.classExtend(WorkItemFinderDialog, TfsContext.ControlExtensions);

export class WITQueryDialogs {

    public static findWorkItem(options?: any) {
        /// <summary>Displays work item finder dialog to select work item ids</summary>
        /// <param name="options" type="Object">Following options are supported:
        ///
        ///     - title: Sets the title of the dialog (default => 'Find Work Item')
        ///     - query: Specifies the initial query to be run for the dialog.
        ///              - To specify a WIQL, specify => query: {wiql: "SELECT [System.Id] FROM WorkItems", name: "My Query Name"}
        ///              - To specify an existing query, specify => query: {path: "My Query/My Work Items"}
        ///     - allowMultiSelect: Sets whether multiple work item selection is allowed or not (default => true)
        ///     - showContextMenu: Sets whether to display context menu or not (default => false)
        ///     - width: Sets the width of the dialog (default => 600, min-width => 400)
        ///     - height: Sets the height of the dialog (default => 450, min-height=> 300)
        /// </param>

        return Dialogs.show(WorkItemFinderDialog, $.extend({
            dialogClass: "find-work-item",
            url: TfsContext.getDefault().getActionUrl("findWorkItem", "wit", { area: "api", includeLanguage: true }),
            urlParams: {
                showContextMenu: options && options.showContextMenu === true,
                allowMultiSelect: options && options.allowMultiSelect !== false
            },
            minWidth: 600,
            minHeight: 750,
            useBowtieStyle: true,
            bowtieVersion: 2,
            resizable: true
        }, options));
    }
}

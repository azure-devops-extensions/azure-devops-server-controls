//Auto converted from TestManagement/Scripts/TFS.TestManagement.RunsView.Controls.Queries.debug.js

/// <reference types="jquery" />

import q = require("q");

import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import {ShortcutGroupDefinition} from "TfsCommon/Scripts/KeyboardShortcuts";

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TFSOMQueries = require("TestManagement/Scripts/TFS.TestManagement.RunsView.OM.Queries");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TRACommonControls = require("TestManagement/Scripts/TFS.TestManagement.RunsView.Common.Controls");
import ValueMap = require("TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap");
import TcmService = require("TestManagement/Scripts/TFS.TestManagement.Service");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");

import TCMContracts = require("TFS/TestManagement/Contracts");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Filters = require("VSS/Controls/Filters");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Performance = require("VSS/Performance");
import Service = require("VSS/Service");
import Splitter = require("VSS/Controls/Splitter");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import TreeView = require("VSS/Controls/TreeView");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

let delegate = Utils_Core.delegate;
let TfsContext = TFS_Host_TfsContext.TfsContext;
let domElem = Utils_UI.domElem;

let TelemetryService = TCMTelemetry.TelemetryService;

export interface QueryFilterOptions extends Filters.IFilterControlOptions {
    itemType?: string;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

export class QueryFilter extends Filters.FilterControlO<QueryFilterOptions> {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _queryManager: TFSOMQueries.QueryManager;
    private _itemType: string;
    private _query: TFSOMQueries.QueryItem;

    constructor(options?) {
	    // TODO:BUG 937329: Need to remove this once framework team set this property by default.
        if (options) {
            options.useArrowKeysForNavigation = true;
        }

        super($.extend({
            coreCssClass: "query-filter"
        }, options));
    }

    public initialize() {
        super.initialize();
        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._queryManager = Service.getCollectionService(TFSOMQueries.QueryManager, this._tfsContext.contextData);
        this._itemType = this._options.itemType || null;
    }

    public setQuery(query) {
        Diag.logTracePoint("QueryFilter.setQuery.start");

        this._query = query;
        if (!this._itemType && query && query.itemType) {
            this._itemType = query.itemType;
        }
        this.setFilter(query ? query.filter : null);

        Diag.logTracePoint("QueryFilter.setQuery.complete");
    }

    public getQuery() {
        return this._query;
    }

    public _getDefaultClause() {
        return { logicalOperator: Resources.QueryAnd, fieldName: "", operator: Resources.QueryEqualTo, value: "", index: 0 };
    }

    public _updateAndOrControl(andOrControl, clause) {
        Diag.logTracePoint("QueryFilter._updateAndOrControl.start");
        andOrControl.setText(clause.logicalOperator);
        andOrControl.setSource([Resources.QueryAnd, Resources.QueryOr]);
        Diag.logTracePoint("QueryFilter._updateAndOrControl.complete");
    }

    public _updateFieldControl(fieldControl, clause) {
        Diag.logTracePoint("QueryFilter._updateFieldControl.start");
        let that = this;
        fieldControl.setText(clause.fieldName);

        this._getQueryableFieldNames(function (fieldNames) {
            if (!fieldControl._disposed) {
                fieldControl.setSource(fieldNames);
                fieldControl.setMode(fieldNames.length > 0 ? ValueMap.TestQueryConstants.QUERYEDITOR_CONTROLMODE_DROP :
                    ValueMap.TestQueryConstants.QUERYEDITOR_CONTROLMODE_TEXT);
            }
        });
        Diag.logTracePoint("QueryFilter._updateFieldControl.complete");
    }

    public _updateOperatorControl(operatorControl: any, clause: any, updateClause?: boolean) {
        Diag.logTracePoint("QueryFilter._updateOperatorControl.start");
        let that = this, asynch = true;

        function setSource(operators) {
            let field;

            operators = operators || [];

            if (operators.length) {
                operatorControl.setSource(operators);
                operatorControl.setMode(ValueMap.TestQueryConstants.QUERYEDITOR_CONTROLMODE_DROP);
            }
            else {
                operatorControl.setSource([]);
                operatorControl.setMode(ValueMap.TestQueryConstants.QUERYEDITOR_CONTROLMODE_TEXT);
            }

            if (updateClause) {
                if (clause.operator) {
                    if (!QueryFilter.contains(operators, clause.operator, true)) {
                        clause.operator = "";
                        clause.value = "";
                    }
                }

                if (!clause.operator && operators.length) {
                    clause.operator = operators[0];
                }
            }

            operatorControl.setText(clause.operator || "");
        }

        if (clause.fieldName) {

            this._getQueryFieldByName(clause.fieldName, (field) => {
                asynch = false;

                if (!operatorControl._disposed) {
                    setSource(field ? field.operators : [Resources.QueryEqualTo]);
                }
            }, (error) => {
                Diag.logError(Utils_String.format("[QueryFilter:_updateOperatorControl]: Error occurred in querying field name: {0}", error.message));
                });

            if (asynch) {
                setSource([Resources.QueryEqualTo]);
            }
        }
        else {
            setSource([Resources.QueryEqualTo]);
        }
        Diag.logTracePoint("QueryFilter._updateOperatorControl.complete");
    }

    public _updateValueControl(valueControl: any, clause: any) {
        Diag.logTracePoint("QueryFilter._updateValueControl.start");
        let that = this, fieldValues;
        valueControl.setText(clause.value);
        this._updateValueControlEnablement(valueControl, clause);

        function setDropdownItems(values) {
            if (values && values.length > 0) {
                valueControl.setType(ValueMap.TestQueryConstants.QUERYEDITOR_CONTROLTYPE_LIST);
                valueControl.setMode(ValueMap.TestQueryConstants.QUERYEDITOR_CONTROLMODE_DROP);
                valueControl.setSource(values);
            }
            else {
                valueControl.setType(ValueMap.TestQueryConstants.QUERYEDITOR_CONTROLTYPE_LIST);
                valueControl.setMode(ValueMap.TestQueryConstants.QUERYEDITOR_CONTROLMODE_TEXT);
                valueControl.setSource([]);
            }
        }

        if (clause.fieldName && clause.operator) {

            this._getQueryFieldByName(clause.fieldName, (field) => {
                fieldValues = field ? field.values : [];
                if (!valueControl._disposed) {
                    setDropdownItems(fieldValues);
                }
            }, (error) => {
                Diag.logError(Utils_String.format("[QueryFilter:_updateValueControl]: Error occurred in querying field name: {0}", error.message));
                });
        }
        Diag.logTracePoint("QueryFilter._updateValueControl.complete");
    }

    public _validateClause(clauseInfo) {
        Diag.logTracePoint("QueryFilter._validateClause.start");
        let field, clause = clauseInfo.clause, that = this;

        if (!clause.fieldName || !clause.operator) {
            clauseInfo.fieldNameControl.setInvalid(false);
            clauseInfo.operatorControl.setInvalid(false);
        }
        else {
            this._getQueryFieldByName(clause.fieldName, (field) => {
                if (field) {
                    clauseInfo.fieldNameControl.setInvalid(false);
                    if (field.operators && QueryFilter.contains(field.operators, clause.operator)) {
                        clauseInfo.operatorControl.setInvalid(false);
                    }
                    else {
                        clauseInfo.operatorControl.setInvalid(true);
                    }
                }
                else {
                    clauseInfo.fieldNameControl.setInvalid(true);
                    clauseInfo.operatorControl.setInvalid(false);
                }
            }, (error) => {
                Diag.logError(Utils_String.format("[QueryFilter:_validateClause]: Error occurred in querying field name: {0}", error.message));
                });
        }
        Diag.logTracePoint("QueryFilter._validateClause.complete");
    }

    public _handleFieldNameChanged(clauseInfo: any, oldValue: string) {
        Diag.logTracePoint("QueryFilter._handleFieldNameChanged.start");
        let that = this, clause = clauseInfo.clause;

        this._getQueryFieldByName(clause.fieldName, (currentField) => {
            // If the new field value is not a known/valid field, then don't touch the operator or value
            if (currentField) {
                that._getQueryFieldByName(oldValue, (prevField) => {
                    if (!currentField || !prevField || currentField.type !== prevField.type) {
                        clause.operator = "";
                        clause.value = "";
                        that._updateOperatorControl(clauseInfo.operatorControl, clause, true);
                    }
                    else {
                        that._updateOperatorControl(clauseInfo.operatorControl, clause, true);
                    }

                    that._updateValueControl(clauseInfo.valueControl, clause);
                }, (error) => {
                        Diag.logError(Utils_String.format("[QueryFilter:_handleFieldNameChanged]: Error occurred in querying field name: {0}", error.message));
                    });
            }
        }, (error) => {
                Diag.logError(Utils_String.format("[QueryFilter:_handleFieldNameChanged]: Error occurred in querying field name: {0}", error.message));
            });
        Diag.logTracePoint("QueryFilter._handleFieldNameChanged.complete");
    }

    public _handleOperatorChanged(clauseInfo: any, oldValue: string) {
        this._updateValueControlEnablement(clauseInfo.valueControl, clauseInfo.clause);
    }

    public _updateValueControlEnablement(valueControl, clause) {
        if (!clause.fieldName || !clause.operator) {
            valueControl.setEnabled(false);
        }
        else {
            valueControl.setEnabled(true);
        }
    }

    public _setDirty() {
    }

    private _getQueryFieldByName(fieldName, callback, errorCallback?) {
        this._queryManager.getQueryField(this._itemType, fieldName, callback, errorCallback);
    }

    private _getQueryableFieldNames(callback, errorCallback?) {
        this._queryManager.getQueryableFieldNames(this._itemType, callback, errorCallback);
    }

    public static contains(array, value, caseInsensitive?: boolean) {
        /// <param name="caseInsensitive" type="boolean" optional="true" />

        if (!caseInsensitive) {
            return $.inArray(value, array) >= 0;
        }
        else {
            let hashtable = QueryFilter.hashset(array, true);
            return hashtable.hasOwnProperty(value.toLocaleUpperCase());
        }
    }

    public static hashset(array, caseInsensitive?: boolean) {
        /// <param name="caseInsensitive" type="boolean" optional="true" />
        let result = {}, i, l;

        if (caseInsensitive) {
            if (array.__hashSetCaseInsensitive) {
                return array.__hashSetCaseInsensitive;
            }

            for (i = 0, l = array.length; i < l; i++) {
                result[array[i].toLocaleUpperCase()] = i;
            }

            array.__hashSetCaseInsensitive = result;
        }
        else {
            if (array.__hashSet) {
                return array.__hashSet;
            }

            for (i = 0, l = array.length; i < l; i++) {
                result[array[i]] = i;
            }

            array.__hashSet = result;
        }

        return result;
    }
}

VSS.initClassPrototype(QueryFilter, {
    _tfsContext: null,
    _queryManager: null,
    _itemType: null,
    _query: null
});

export class QueryEditor extends Controls.BaseControl {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _query: TFSOMQueries.QueryItem;
    private _splitter: Splitter.Splitter;
    private _filter: QueryFilter;
    private  _grid: any;
    private _toolbarHost: any;
    private _toolbar: any;
    private _testRunSummaryShortcutGroup: TestRunSummaryShortcutGroup;
    private _queryEdiorShortcutGroup: QueryEditorShortcutGroup;

    constructor(options?) {
        super($.extend({
            coreCssClass: "test-query-editor",
            resultsGridType: null
        }, options));
        if (this._options.name === "resultQueryEditor") {
            this._testRunSummaryShortcutGroup = new TestRunSummaryShortcutGroup(this);
        }
        this._queryEdiorShortcutGroup = new QueryEditorShortcutGroup(this);
    }

    public setQuery(query) {
        Diag.logTracePoint("QueryEditor.setQuery.start");
        this._query = query;
        this._toolbar.updateMenuItemStates();
        this._filter.setQuery(query);
        this._grid.setQuery(query);

        if (query) {
            // Automatically run queries unless they are new and not yet modified
            if (query.skipAutoExecuteOnEdit !== true) {
                this.runQuery();
            }
        }
        Diag.logTracePoint("QueryEditor.setQuery.complete");
    }

    public runQuery() {
        this._grid.runQuery();
    }

    public getQuery() {
        return this._query;
    }

    public getFilter() {
        return this._filter;
    }

    public getGrid() {
        return this._grid;
    }

    public _createElement() {
        Diag.logTracePoint("QueryEditor._createElement.start");
        let that = this;

        super._createElement();

        this._element.addClass("query-editor-view");
        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();

        let $queryResultToolbar = $("<div class='toolbar'></div>");
        this._toolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $queryResultToolbar, {
            cssClass: "query-editor-toolbar",
            items: this._createToolbarItems(),
            executeAction: delegate(this, this._onToolbarItemClick),
            getCommandState: delegate(this, this._getToolbarItemCommandState)
        });

        this._element.append($queryResultToolbar);

        this._splitter = <Splitter.Splitter>Controls.BaseControl.createIn(Splitter.Splitter, this._element, { cssClass: "content", fixedSide: "left", splitWidth: "350px", handleBarWidth: "5px" });
        this._splitter.leftPane.addClass("query-editor-filter-view");
        this._splitter.rightPane.addClass("hub-no-content-gutter");

        this._filter = this._createFilter(this._splitter.leftPane, { tfsContext: this._tfsContext });
        this._grid = this._createGrid(this._splitter.rightPane, { tfsContext: this._tfsContext, resultId: this._options.resultId });
        this._grid._element.addClass("query-editor-results-grid");

        if (!this._grid._options.contextMenu) {
            this._splitter.leftPane.addClass("hub-no-content-gutter");
        }

        $(window).bind("query-dirty-state-changed", function () {
            that._toolbar.updateMenuItemStates();
        });
        Diag.logTracePoint("QueryEditor._createElement.complete");
    }

    private _createToolbarItems() {
        let that = this, items = [];

        items.push({ id: "run-query", showText: false, title: Resources.RunQuery, icon: "bowtie-icon bowtie-play-fill" });

        return items;
    }

    private _onToolbarItemClick(e?) {
        Diag.logTracePoint("QueryEditor._onToolbarItemClick.called");
        let command = e.get_commandName(),
            args = e.get_commandArgument();

        // Checking to see if the command we can handle is executed
        switch (command) {
            case "run-query":
                this.runQuery();
                break;
        }
    }

    private _getToolbarItemCommandState(command) {
        if (!this._query) {
            // No query - all commands disabled
            return Menus.MenuItemState.Disabled;
        }
    }

    private _createFilter($container, options?) {
        return <QueryFilter>Controls.BaseControl.createIn(QueryFilter, $container, options);
    }

    private _createGrid($container, options?) {
        let resultsGridType = this._options.resultsGridType || QueryResultsGrid;

        return Controls.BaseControl.createIn(resultsGridType, $container, options);
    }
}

VSS.initClassPrototype(QueryEditor, {
    _tfsContext: null,
    _query: null,
    _splitter: null,
    _filter: null,
    _grid: null,
    _toolbarHost: null,
    _toolbar: null
});

export class QueryView extends Controls.BaseControl {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _query: any;
    protected _toolbar: any;
    private  _grid: any; // Set as any because gridType is sent in options

    constructor(options?) {
        super($.extend({
            resultsGridType: null
        }, options));
    }

    public initialize() {
        let that = this;

        super.initialize();
        this._element.addClass("query-results-view");

        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();

        this._populateControls();

        this.bind();
    }

    public _populateControls() {
        this._grid = this._createGrid(this._element, { tfsContext: this._tfsContext, noSort: this._options.noSort, resultId: this._options.resultId });
        this._grid._element.addClass("query-results-view-grid");
    }

    private _createGrid($container, options?) {
        Diag.logVerbose("[QueryResultsView._createGrid] - Called");
        let gridType = this._options.resultsGridType;
        return Controls.BaseControl.createIn(gridType, $container, options);
    }

    public setQuery(query) {
        Diag.logVerbose("[QueryResultsView.setQuery] - Called");
        this._query = query;
        this._grid.setQuery(query);
        this._grid.runQuery();
    }

    public getQuery() {
        return this._query;
    }

    public getGrid() {
        return this._grid;
    }

    public getToolbar() {
        return this._toolbar;
    }

    public bind() {
        if (this._grid) {
            this._grid._unbind("queryComplete", delegate(this, this.onQueryComplete));
        }

        this._grid._bind("queryComplete", delegate(this, this.onQueryComplete));
    }

    public unbind() {
        if (this._grid) {
            this._grid._unbind("queryComplete", delegate(this, this.onQueryComplete));
        }
    }

    public dispose() {
        this.unbind();
    }

    public onQueryComplete() {
    }
}

VSS.initClassPrototype(QueryView, {
    _tfsContext: null,
    _queryManager: null,
    _grid: null,
    _query: null
});

export class QueryResultsView extends QueryView {

    private _testResultsToolbarShortcutGroup: TestResultsToolbarShortcutGroup;
    private _testRunSummaryShortcutGroup: TestRunSummaryShortcutGroup;
    constructor(options?) {
        super($.extend({
            resultsGridType: QueryResultsGrid
        }, options));
    }

    public initialize() {
        super.initialize();
        this._testResultsToolbarShortcutGroup = new TestResultsToolbarShortcutGroup(this);
        this._testRunSummaryShortcutGroup = new TestRunSummaryShortcutGroup(this);
    }

    public _populateControls() {
        this._toolbar = this._createToolbar(this._element);

        //create grid after creating toolbar to preserve tab order.
        super._populateControls();
        this.getGrid()._bind("updateGridView", delegate(this, this.updateToolbarState));
    }

    public _createToolbarItems() {
        let items = [];
        items.push({ id: "refresh-query", showText: false, title: Resources.RefreshQuery, icon: "bowtie-icon bowtie-navigate-refresh" });
        items.push({ separator: true });

        let createBugText = Utils_String.format(Resources.CreateWorkItemText, Resources.BugCategoryRefName);
        items.push({ id: "create-bug", text: createBugText, showText: true, icon: "bowtie-icon bowtie-file-bug" });

        items.push({ separator: true });
        items.push({ id: "update-analysis", text: Resources.UpdateAnalysisMenuItem, showText: true, icon: "bowtie-icon bowtie-edit" });

        return items;
    }

    public _onToolbarItemClick(e?) {
        let command = e.get_commandName(),
            args = e.get_commandArgument();

        this._handleToolbarItemClick(command, args);
    }

    public _createToolbar($container, options?) {
        Diag.logVerbose("[QueryResultsView._createToolbar] - Called");
        let toolbarItems = this._createToolbarItems();
        let $toolbar = $("<div class='toolbar'></div>");
        let toolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $toolbar, {
            cssClass: "query-results-view-toolbar",
            items: toolbarItems,
            executeAction: delegate(this, this._onToolbarItemClick),
            getCommandState: delegate(this, this._getToolbarItemCommandState)
        });
        $container.append($toolbar);
        return toolbar;
    }

    public _handleToolbarItemClick(command: any, args?: any) {
        switch (command) {
            case "refresh-query":
                this.getGrid().runQuery();
                break;

            case "create-bug":
                this.getGrid()._onCreateBugClicked();
                break;

            case "update-analysis":
                this.getGrid()._onUpdateAnalysisClicked();
                break;
        }
    }

    public onQueryComplete() {
        Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.LoadTestResultsForARun);
    }

    private _getToolbarItemCommandState(command) {
        switch (command) {
            case "create-bug":
            case "update-analysis":
                let grid = this.getGrid();
                if (grid && grid.itemIds.length <= 0) {
                    return Menus.MenuItemState.Disabled;
                }
                break;
        }
    }

    public updateToolbarState(e?: JQueryEventObject): void {
        let commandState: boolean = true;
        let grid = this.getGrid();
        if (grid && grid.itemIds.length <= 0) {
            commandState = true;
        }
        else {
            commandState = false;
        }

        this._toolbar.updateCommandStates(
            <Menus.ICommand[]>[
                {
                    id: "create-bug",
                    disabled: commandState
                },
                {
                    id: "update-analysis",
                    disabled: commandState
                }]
            );
    }
}

VSS.initClassPrototype(QueryResultsView, {

});

export class QueryRunView extends QueryView {

    constructor(options?) {
        super($.extend({
            resultsGridType: QueryRunsGrid
        }, options));
    }

    public initialize() {

        super.initialize();

    }

    public _populateControls() {
        this._toolbar = this._createToolbar(this._element);

        //create grid after creating toolbar to preserve tab order.
        super._populateControls();
    }

    public _createToolbarItems() {
        let items = [];
        items.push({ id: "refresh-query", text: Resources.RefreshQuery, showText: false, title: Resources.RefreshQuery, icon: "bowtie-icon bowtie-navigate-refresh" });

        return items;
    }

    public _onToolbarItemClick(e?) {
        let command = e.get_commandName(),
            args = e.get_commandArgument();

        this._handleToolbarItemClick(command, args);
    }

    public _createToolbar($container, options?) {
        Diag.logVerbose("[QueryRunView._createToolbar] - Called");
        let toolbarItems = this._createToolbarItems();
        let $toolbar = $("<div class='toolbar'></div>");
        let toolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $toolbar, {
            cssClass: "query-results-view-toolbar",
            items: toolbarItems,
            executeAction: delegate(this, this._onToolbarItemClick)
        });
        $container.append($toolbar);
        return toolbar;
    }

    public _handleToolbarItemClick(command: any, args?: any) {
        switch (command) {
            case "refresh-query":
                this.getGrid().runQuery();
                break;

        }
    }

    public onQueryComplete() {
        Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.LoadRunsHub);
    }
}

VSS.initClassPrototype(QueryRunView, {

});

export class QueryGrid extends Grids.GridO<any> {

    public itemIds: any;
    private _query: any;
    private _itemData: any;
    private _itemIdsNeededHash: { [name: string] : boolean; };
    private _queryManager: any;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _titleById: any;

    private _fetching: boolean;

    constructor(options?) {
        super($.extend({
            noSort: false,
            autoSort: false
        }, options));

        this.itemIds = [];
        this._itemData = {};
        this._titleById = {};
        this._itemIdsNeededHash = {};
    }

    public initialize() {
        super.initialize();
        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._queryManager = Service.getCollectionService(TFSOMQueries.QueryManager, this._tfsContext.contextData);
    }

    public runQuery() : IPromise<{}> {
        var deferred = q.defer<{}>();
        Diag.logVerbose("[QueryGrid.runQuery] - Called");
        let that = this, query = this._query;

        this._clearResults();

        if (query) {
            this._setStatusText(Resources.QueryingStatusText);
            this._fire("queryStarting");

            this._executeResultStoreQuery(query);
        }

        return deferred.promise;
    }

    public getItemId(index) {
        return this.itemIds[index];
    }

    public getSelectedItemIds() {
        let that = this, selectedItemIds = [], indices = this.getSelectedDataIndices();
        $.each(indices, function (i, index) {
            selectedItemIds.push(that.itemIds[index]);
        });
        return selectedItemIds;
    }

    public initializeDataModel(resultModel) {
        if (resultModel.itemIds) {
            this.itemIds = resultModel.itemIds;
        }
        else {
            this.itemIds = [];
        }

        this._options.source = this.itemIds;

        this._itemData = {};
        this._processDataRows(resultModel.dataRows);
    }

    public _processDataRow(dataRow) {
        this._itemData[dataRow.id] = dataRow.data;
        this._titleById[dataRow.id] = dataRow.title;
        delete this._itemIdsNeededHash[dataRow.id];
    }

    public _setGridColumns(columnInfo) {
        this._options.columns = columnInfo.columns;
        this._options.sortOrder = columnInfo.sortOrder;
    }

    public _createGridIconCell(column: any, iconCss: string, cellCss: string, title: string, isPartiallySucceeded?: boolean) {
        let $div: JQuery = $(domElem("div", "grid-cell")),
            $stateElement: JQuery,
            stateText: string,
            $stateTextElement: JQuery,
            width: any = Math.round(column.width) || 20;

        $div.css("width", (isNaN(width) ? width : width + "px"));
        $div.attr("role", "grid-cell");

        stateText = title;
        $stateTextElement = $(domElem("span", "outcome-text"));
        $stateTextElement.text(stateText)
            .addClass("run-state-column-text")
            .css("max-width", $div.css("width"));

        $stateElement = $(domElem("div", "outcome-container"));
        $stateElement.addClass("testpoint-outcome-shade bowtie-icon icon")
            .addClass(iconCss);

        if (isPartiallySucceeded) {
            $stateElement.attr("aria-label", Resources.PartiallySucceededText);
        }

        $div.attr("title", stateText)
            .append($stateElement).append($stateTextElement);
        return $div;
    }

    public selectionChanged(selectedIndex, selectedCount, selectedRows) {
        if (this.itemIds.length > 0) {
            this._statusUpdate();
        }
    }

    //Called by QueryResultInfoBar
    public getQueryTitle() {
        return this._query ? this._query.name : "";
    }

    //Called by QueryResultInfoBar
    public getStatusText() {
        return Utils_String.format(Resources.QueryRunsStatusText, this._count, this._selectionCount);
    }

    public setQuery(query) {
        Diag.logVerbose("[QueryGrid._processDataRows] - Called");
        this._query = query;
        this._setGridColumns(query);
        this._clearResults();
        this._setStatusText(Resources.QuerySetStatus);
    }

    public getQuery() {
        return this._query;
    }

    public onSort(sortOrder: any, sortColumns?: any): any {
        let sortFields = [];

        if (this._query) {
            this._query.setSortColumns(this._convertToSortColumns(sortOrder, sortColumns));
            this._setGridColumns(this._query);
            this.runQuery();
        }
    }

    public _onColumnResize(column) {
        super._onColumnResize(column);
        if (this._query) {
            $.each(this._query.getDisplayColumns(), function (i, col) {
                if (col.name === column.text) {
                    col.width = parseInt(column.width);
                    return false;
                }
            });
        }
    }

    public getColumnValue(dataIndex: number, columnIndex: number, columnOrder?: number): any {
        /// <param name="dataIndex" type="int">The index for the row data in the data source</param>
        /// <param name="columnIndex" type="int">The index of the column's data in the row's data array</param>
        /// <param name="columnOrder" type="int" optional="true">The index of the column in the grid's column array. This is the current visible order of the column</param>
        /// <returns type="any" />

        let itemId, column, data;

        itemId = this.itemIds[dataIndex];
        if (itemId) {
            data = this._itemData[itemId];
            if (data) {
                return data[columnIndex];
            }
        }

        return "";
    }

    public _onColumnMove(sourceIndex, targetIndex) {
        let columns, newColumns;

        super._onColumnMove(sourceIndex, targetIndex);

        if (this._query) {

            columns = this._query.getDisplayColumns();
            newColumns = [];

            $.each(this._columns, function (i, gridColumn) {
                $.each(columns, function (j, displayColumn) {
                    if (displayColumn.name === gridColumn.text) {
                        newColumns.push(displayColumn);
                        return false;
                    }
                });
            });

            this._query.setDisplayColumns(newColumns);
        }
    }

    private _executeResultStoreQuery(query) {
        this._executeQuery(query, (resultModel) => {
            this._updateModel(resultModel);
        }, (error) => {
            this._fire("queryError");
            this._statusUpdate(error);
        });
    }

    private _updateModel(resultModel: any): void {
        this._updateDataModel(resultModel);

        //triger event to update queryview properties/toolbar
        this._fire("updateGridView");

        if (resultModel.error) {
            this._fire("queryError");
            this._statusUpdate(resultModel.error);
        }
        else {
            this._fire("queryComplete");
            this._statusUpdate();
        }
    }

   private addRows(range, rows: number[]) {
        let i, count = range.length;
        for (i = 0; i < count; i++) {
            rows.push(range[i][1]);
        }
    }

    //Called by grid framework when scrolled up or down. VisibleRange is the visible viewport range
    //aboveRange and belowRange is the range above and below the current viewport
    public cacheRows(aboveRange: any[], visibleRange: any[], belowRange: any[]) {
        Diag.logTracePoint("QueryGrid.cacheRows.called");
        let that = this, itemsNeeded = false, rows = [];

        this.addRows(aboveRange, rows);
        this.addRows(visibleRange, rows);
        this.addRows(belowRange, rows);

        //Clear this dictionary with every call to cacheRows.
        this._itemIdsNeededHash = {};

        $.each(rows, (i, row) => {
            let id = that.itemIds[row];
            if (!that._itemData[id]) {
                that._itemIdsNeededHash[id] = true;
                itemsNeeded = true;
            }
        });

        if (itemsNeeded) {
            this.delayExecute("pageDataRows", ValueMap.TestQueryConstants.PAGINATION_DELAY, true, () => {
                this._pageItems();
            });
        }
        Diag.logTracePoint("QueryGrid.cacheRows.exit");
    }

    private _getItemData(itemIds, displayColumns, callback) {
        Diag.logTracePoint("[QueryGrid._getItemData.Called");
        this._queryManager.getQueryData(this._query.itemType, itemIds, displayColumns, callback);
    }

    private _setStatusText(statusText) {
        this._fire("statusUpdate", [statusText, false]);
    }

    private _clearResults() {
        this.itemIds = [];
        this._itemData = {};
        this._itemIdsNeededHash = {};
        this.setDataSource([], null, this._options.columns);
    }

    private _updateDataModel(resultModel) {
        Diag.logVerbose("[QueryGrid._updateDataModel] - Entry");
        this.initializeDataModel(resultModel);
        this.initializeDataSource();
        Diag.logVerbose("[QueryGrid._updateDataModel] - Exit");
    }

    private _processDataRows(dataRows) {
        Diag.logVerbose("[QueryGrid._processDataRows] - Called");
        let that = this;
        if (dataRows) {
            $.each(dataRows, function (i, dataRow) {
                that._processDataRow(dataRow);
            });
        }
    }

    private _executeQuery(query, callback, errorCallback?) {
        Diag.logTracePoint("[QueryGrid._executeQuery.Called");
        this._queryManager.executeQuery(query, {}, callback, errorCallback);
    }

    private _statusUpdate(error?: any) {
        this._fire("statusUpdate", [error || this.getStatusText(), error ? true : false]);
    }

    private _convertToSortColumns(sortOrder, columns) {
        Diag.logTracePoint("[QueryGrid._convertToSortColumns.Called");
        let sortColumns = [], sortColumn;
        if (sortOrder && columns) {
            $.each(sortOrder, function (i, sortOrderItem) {
                let matchingCol = null;
                $.each(columns, function (j, col) {
                    if ((typeof sortOrderItem.index === "undefined" && col.text === sortOrderItem.text) ||
                        (typeof sortOrderItem.index !== "undefined" && col.index === sortOrderItem.index)) {
                        matchingCol = col;
                        return false;
                    }
                });

                if (matchingCol) {
                    sortColumn = { name: matchingCol.text };
                    sortColumn.order = (sortOrderItem && sortOrderItem.order) ? sortOrderItem.order : "asc";
                    sortColumns.push(sortColumn);
                }
            });
        }
        return sortColumns;
    }

    private _pageItems() {
        Diag.logTracePoint("[QueryGrid._pageItems.Called");
        let that = this, idsToFetch = [], query = this._query;

        if (query && !this._fetching) {
            $.each(this._itemIdsNeededHash, function (dataIndex, itemId) {
                idsToFetch.push(dataIndex);
                //Stop the loop when the idsTofetch exceeds payload size.
                return idsToFetch.length < that._options.payloadSize;
            });

            if (idsToFetch.length > 0) {
                this._fetching = true;
                this._getItemData(idsToFetch, query.getDisplayColumns(), function (dataRows) {
                    that._fetching = false;
                    that._processDataRows(dataRows);
                    that.redraw();
                    that._pageItems();
                });
            }
        }
    }
}

VSS.initClassPrototype(QueryGrid, {
    itemIds: null,
    _itemData: null,
    _itemIdsNeededHash: null,
    _fetching: false,
    _query: null,
    _tfsContext: null,
    _queryManager: null,
    _titleById: null

});

export class QueryRunsGrid extends QueryGrid {

    private _statesById: any;
    private _partialPassById: IDictionaryNumberTo<boolean>;
    private static passPercentIndex = 6;    // using a const as number of columns are fixed as of today and Pass rate is always at 6th index

    constructor(options?) {
        super(options);
        this._statesById = {};
        this._partialPassById = {};
    }

    public initialize() {
        Diag.logVerbose("[QueryRunsGrid.initialize] - Called");
        super.initialize();
    }

    public _processDataRow(dataRow) {
        super._processDataRow(dataRow);
        this._statesById[dataRow.id] = dataRow.state;
        this._partialPassById[dataRow.id] = (parseInt(dataRow.data[QueryRunsGrid.passPercentIndex]) !== 100) ? true : false;
    }

    private _getGridColumnsFromQuery(query) {
        let columns = [], sortOrder = [], columnMap = {}, allowsSort = this._options.noSort !== true;

        if (query) {
            $.each(query.getDisplayColumns(), function (i, displayColumn) {
                let column;
                if (displayColumn.name === Resources.QueryColumnNameState) {
                    column = {
                        index: i,
                        text: displayColumn.name,
                        width: displayColumn.width || 26,
                        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                            let state = this._statesById[this.itemIds[dataIndex]];
                            let isPartiallySucceeded = this._partialPassById[this.itemIds[dataIndex]];
                            let isCompleted = (state === ValueMap.TestRunState.Completed);
                            let iconClassName = ValueMap.TestRunState.getIconClassName(state, isPartiallySucceeded);
                            return this._createGridIconCell(column, iconClassName, "test-grid-icon-cell", ValueMap.TestRunState.getFriendlyName(state), isPartiallySucceeded && isCompleted);
                        }
                    };
                }
                else {
                    column = {
                        index: i,
                        text: displayColumn.name,
                        width: displayColumn.width,
                        canSortBy: allowsSort && displayColumn.unSortable !== true
                    };
                }
                columns.push(column);
                columnMap[displayColumn.name] = i;
            });
            $.each(query.getSortColumns(), function (i, sortColumn) {
                sortOrder.push({
                    index: columnMap[sortColumn.name],
                    order: sortColumn.order
                });
            });
        }

        return {
            columns: columns,
            sortOrder: sortOrder
        };
    }

    public _setGridColumns(query) {
        let columnInfo = this._getGridColumnsFromQuery(query);
        super._setGridColumns(columnInfo);
    }

    //Called by QueryResultInfoBar
    public getStatusText() {
        return Utils_String.format(Resources.QueryRunsStatusText, this._count, this._selectionCount);
    }

    public onOpenRowDetail(eventArgs) {
        let itemId, url;
        if (eventArgs.dataIndex >= 0) {
            //itemId is the run id.
            itemId = super.getItemId(eventArgs.dataIndex);
            if (itemId) {
                let viewName = ValueMap.RunExplorerViewTabs.RunCharts;
                //Do not trigger the RecentRunUpdated event here. It will be triggered in the
                //navigation route when new node gets added in the tree for this run.
                this._fire("navigationRequested", { state: { runId: itemId }, viewName: viewName });
            }
        }
        return false;
    }
}

VSS.initClassPrototype(QueryRunsGrid, {
    _statesById: null
});

export class QueryResultsGrid extends QueryGrid {

    private _outcomesById: any;
    private _workItemSaved: boolean;
    private _resolutionStateIds: any[];
    private _resolutionStateNames: any[];
    private _failureTypeIds: any[];
    private _failureTypeNames: any[];

    constructor(options?) {
        super($.extend({
            noSort: false
        }, options));
        this._outcomesById = {};
    }

    public initialize() {
        Diag.logVerbose("[QueryResultsGrid.initialize] - Entry");
        super.initialize();
    }

    public _processDataRow(dataRow) {
        super._processDataRow(dataRow);
        this._outcomesById[dataRow.id] = dataRow.outcome;
    }

    private _getGridColumnsFromQuery(query) {
        let columns = [], sortOrder = [], columnMap = {}, allowsSort = this._options.noSort !== true;

        if (query) {
            $.each(query.getDisplayColumns(), function (i, displayColumn) {
                let column;
                if (displayColumn.name === Resources.QueryColumnNameOutcome) {
                    column = {
                        index: i,
                        text: displayColumn.name,
                        width: displayColumn.width || 26,
                        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                            let outcome = this._outcomesById[this.itemIds[dataIndex]];
                            return this._createGridIconCell(column, ValueMap.TestOutcome.getIconClassName(outcome), "test-grid-icon-cell", ValueMap.TestOutcome.getFriendlyName(outcome));
                        }

                    };
                }
                else {
                    column = {
                        index: i,
                        text: displayColumn.name,
                        width: displayColumn.width,
                        canSortBy: allowsSort && displayColumn.unSortable !== true
                    };
                }
                columns.push(column);
                columnMap[displayColumn.name] = i;
            });
            $.each(query.getSortColumns(), function (i, sortColumn) {
                sortOrder.push({
                    index: columnMap[sortColumn.name],
                    order: sortColumn.order
                });
            });
        }

        return {
            columns: columns,
            sortOrder: sortOrder
        };
    }

    public getSelectedOutcomeItemIds() {
        let that = this, selectedOutcomeItemIds = [], indices = this.getSelectedItemIds();
        $.each(indices, function (i, index) {
            selectedOutcomeItemIds.push(that._outcomesById[index]);
        });
        return selectedOutcomeItemIds;
    }

    public _setGridColumns(query) {
        let columnInfo = this._getGridColumnsFromQuery(query);
        super._setGridColumns(columnInfo);
    }

    public initializeDataModel(resultModel) {
        super.initializeDataModel(resultModel);

        this._fire("ResultsOrderChanged", [this.itemIds]);

        // Set the result row in the grid which matches the specified resultId
        if (this._options.resultId) {
            for (let i = 0; i < this.itemIds.length; i++) {
                if (this.itemIds[i].split(";")[1] === this._options.resultId) {
                    this._options.keepSelection = true;
                    this.setSelectedRowIndex(i);
                }
            }
        }
    }

    private _onCreateBugClicked() {

        Diag.logTracePoint("[QueryResultsGrid._onCreateBugClicked.Start");
        let options, that = this, itemIds = this.getSelectedItemIds();
        options = {
            save: () => {
                this._workItemSaved = true;
            },
            close: () => {
                if (this._workItemSaved) {
                    that.runQuery();
                    this._workItemSaved = false;

                    // Telemetry section - Logging telemetry event after bug is create and bug window is closed.
                    TelemetryService.publishEvent(TelemetryService.featureTestResultCreateBug, TelemetryService.eventBugCreated, 1);
                }
            }
        };
        TRACommonControls.BugWorkItemHelper.createAndShowWorkItem(itemIds, null, options);

        Diag.logTracePoint("[QueryResultsGrid._onCreateBugClicked.End");
    }

    private _onUpdateAnalysisClicked() {

        Diag.logTracePoint("[QueryResultsGrid._onUpdateAnalysisClicked.Start");
        let that = this, itemIds = this.getSelectedItemIds();
        let outcomeIds = this.getSelectedOutcomeItemIds(), disableUpdateCombo = false;
        if ($.inArray(TCMConstants.TestOutcome.Passed, outcomeIds) !== -1 || ($.inArray(TCMConstants.TestOutcome.NotApplicable, outcomeIds) !== -1) || ($.inArray(TCMConstants.TestOutcome.Paused, outcomeIds) !== -1)) {
            disableUpdateCombo = true;
        }
        this._resolutionStateIds = [];
        this._resolutionStateNames = [];
        this._failureTypeIds = [];
        this._failureTypeNames = [];
        TMUtils.getTestResultManager().getTestFailureStates(function (states) {
            $.each(states, function (i, state) {
                let index = parseInt(i);
                that._failureTypeIds[index] = state.id;
                that._failureTypeNames[index] = state.name;

            });

            TMUtils.getTestResultManager().getTestResolutionStates(function (states) {
                that._resolutionStateIds[0] = 0;
                that._resolutionStateNames[0] = Resources.ResolutionStateNone;

                $.each(states, function (i, state) {
                    let index = parseInt(i) + 1;
                    that._resolutionStateIds[index] = state.id;
                    that._resolutionStateNames[index] = state.name;

                });

                let resultIdentifiers: any[] = [];
                if (itemIds && itemIds.length > 0) {
                    for (let index in itemIds) {
                        let identifier: any[] = ("" + itemIds[index]).split(";");
                        if (identifier.length === 2) {
                            resultIdentifiers.push({ testRunId: Number(identifier[0]), testResultId: Number(identifier[1]) });
                        }
                    }
                }

                TRACommonControls.RunExplorerDialogs.updateResultAnalysis(resultIdentifiers, that._resolutionStateNames, that._resolutionStateIds, that._failureTypeNames, that._failureTypeIds, {
                    _disableUpdateCombo: disableUpdateCombo,
                    onOkClick: function () {
                        that.runQuery();
                    }
                });
            });

        });
        Diag.logTracePoint("[QueryResultsGrid._onUpdateAnalysisClicked.End");
    }

    //Called by QueryResultInfoBar
    public getStatusText() {
        return Utils_String.format(Resources.QueryResultsStatusText, this._count, this._selectionCount);
    }

    public onOpenRowDetail(eventArgs) {
        let itemId, url;
        if (eventArgs.dataIndex >= 0) {
            itemId = super.getItemId(eventArgs.dataIndex);
            if (itemId) {
                let viewName = ValueMap.RunExplorerViewTabs.ResultSummary;
                let runId = itemId.split(";")[0];
                let resultId = itemId.split(";")[1];
                this._fire("navigationRequested", { state: { runId: runId, resultId: resultId }, viewName: viewName });
            }
        }
        return false;
    }
}

VSS.initClassPrototype(QueryResultsGrid, {
    _outcomesById: null,
    _resolutionStateIds: null,
    _resolutionStateNames: null,
    _failureTypeIds: null,
    _failureTypeNames: null
});

export class QueryResultInfoBar extends Controls.BaseControl {

    private static _typeName: string = "tfs.querycontrols.QueryResultInfoBar";

    private _grid: any;
    private _$elementsContainer: any;
    private _statusIndicator: any;
    private _$titleElement: any;
    private _$statusElement: any;
    private _updateDelegate: any;
    private _customTitle: any;

    constructor(options?) {
        super($.extend({
            coreCssClass: "query-result-grid-info",
            showQueryTitle: false
        }, options));

        this._updateDelegate = delegate(this, this._update);
    }

    public initialize() {
        super.initialize();
    }

    public dispose() {
        this.unbind();
        super.dispose();
    }

    public bind(grid, customTitle) {
        let $parentContainer, $statusAndTitleCell;

        if (this._grid) {
            this._grid._unbind("statusUpdate", this._updateDelegate);
        }

        this._grid = grid;
        this._customTitle = customTitle;
        this._grid._bind("statusUpdate", this._updateDelegate);

        $parentContainer = $("<table cellpadding='0' />").appendTo(this._element);
        this._$elementsContainer = $("<tr />").appendTo($parentContainer);

        $statusAndTitleCell = $("<td class='query-title' />").appendTo(this._$elementsContainer);
        this._statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, $statusAndTitleCell, {
            eventTarget: grid.getElement(),
            statusStartEvent: "queryStarting",
            statusCompleteEvent: "queryComplete",
            statusErrorEvent: "queryError"
        });
        this._$titleElement = $("<span />").appendTo($statusAndTitleCell);

        this._$statusElement = $("<span />").appendTo($("<td class='query-status' />").appendTo(this._$elementsContainer));

        this._update(this._grid, this._grid.getStatusText(), null);
    }

    public unbind() {
        if (this._grid) {
            this._grid._unbind("statusUpdate", this._updateDelegate);
            this._grid = null;
        }

        this._$titleElement.text("");
        this._$statusElement.text("");
        this._element.toggleClass("invalid", false);
    }

    private _update(sender, status, statusIsError) {
        Diag.logVerbose("[QueryResultsInfoBar._update] - Called");
        let messageText, message = status, name = null, $countElement, showTitle;
        this._element.toggleClass("invalid", statusIsError === true);

        if (statusIsError) {
            message = status instanceof Error ? VSS.getErrorMessage(status) : status;
        }

        showTitle = this._options.showQueryTitle && !statusIsError;
        if (showTitle && (this._grid || this._customTitle)) {
            name = this._customTitle || ($.isFunction(this._grid.getQueryTitle) ? this._grid.getQueryTitle() : "");
            this._$titleElement.text(name);
        }
        else {
            this._$titleElement.empty();
        }

        this._$statusElement.text(message);
        this._$elementsContainer.toggleClass("no-title", !showTitle);
    }

    public setQueryTitle(title: string) {
        this._customTitle = title;
        this._$titleElement.text(title);
    }
}

VSS.initClassPrototype(QueryResultInfoBar, {
    _grid: null,
    _$elementsContainer: null,
    _statusIndicator: null,
    _$titleElement: null,
    _$statusElement: null,
    _updateDelegate: null,
    _customTitle: null
});

export interface QueryExplorerTreeOptions extends TreeView.ITreeOptions {
    tfsContext: TFS_Host_TfsContext.TfsContext;
}

export class QueryExplorerTree extends TreeView.TreeViewO<QueryExplorerTreeOptions> {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    public _hierarchy: any;

    constructor(options?) {
        super($.extend({
            cssClass: "testmanagement-runsexplorertree"
        }, options));
        /* ToDo: Add the context menu callback when click on pop up later when my query folder an team folder comes.*/
    }

    public initialize() {
        Diag.logVerbose("[QueryExplorerTree.initialize] - Called");
        let that = this;
        super.initialize();
        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._element.bind("selectionchanged", delegate(this, this._onSelectedNodeChanged));
    }

    public setHierarchy(hierarchy) {
        Diag.logVerbose("[QueryExplorerTree.setHierarchy] - Called");
        this._hierarchy = hierarchy;
        this.rootNode.clear();
        this._populate(this.rootNode);
        this._draw();
    }

    public _updateNode(li: JQuery, node: TreeView.TreeNode, level: number) {
        let divNodeContent, $icon;

        divNodeContent = super._updateNode(li, node, level);
        return divNodeContent;
    }

    public onItemClick(treeNode, nodeElement, e?) {
        let result, $target;

        $target = $(e.target);
        result = super.onItemClick(treeNode, nodeElement, e);

        if (treeNode && treeNode.folder) {
            e.preventDefault();
        }

        return result;
    }

    public getNodeByType(itemType, data) {
        let currentSelection, node = null;

        currentSelection = this.getSelectedNode();
        if (currentSelection && currentSelection.itemType === itemType && currentSelection.data === data) {
            return currentSelection;
        }

        Utils_UI.walkTree.call(this.rootNode, function (treeNode) {
            if (treeNode.itemType === itemType && treeNode.data === data) {
                node = treeNode;
            }
        });

        return node;
    }

    public getNodeById(runId) {
        let node;
        Utils_UI.walkTree.call(this.rootNode, function (treeNode) {
            let id = treeNode.data.id;
            if (id === runId) {
                node = treeNode;
            }
        });
        return node;
    }

    public setSelectedNodeByType(itemType, data, supressNodeChangeEvent) {
        let currentSelection = this.getSelectedNode(),
            nodeToSelect = this.getNodeByType(itemType, data);
        if (currentSelection !== nodeToSelect) {
            this.setSelectedNode(nodeToSelect, supressNodeChangeEvent);
        }
    }

    public setSelectedNodeById(runId, supressNodeChangeEvent?: boolean) {
        let currentSelection = this.getSelectedNode(),
            nodeToSelect = this.getNodeById(runId);
        if (currentSelection !== nodeToSelect) {
            this.setSelectedNode(nodeToSelect, supressNodeChangeEvent);
        }
    }

    public setSelectedNode(node, suppressChangeEvent?: boolean) {
        super.setSelectedNode(node);
    }

    private _addQueryNode(parentNode, queryItem, drawTopSeparator, quantity, expandIfChildren) {
        let type, node, that = this;
        if (queryItem instanceof TFSOMQueries.QueryFolder) {
            node = this._addDataNode(parentNode, queryItem.name, drawTopSeparator, queryItem.itemType, false, queryItem, quantity);
            node.folder = true;
            if (expandIfChildren && queryItem.children && queryItem.children.length > 0) {
                node.expanded = true;
            }
        }
        else {
            node = this._addDataNode(parentNode, queryItem.name, drawTopSeparator, queryItem.itemType, true, queryItem, quantity);
        }
        this._updateQueryNode(node, queryItem);
    }

    private _updateQueryNode(node, queryItem) {
        let that = this;
        if (queryItem instanceof TFSOMQueries.QueryFolder) {
            node.clear();
            $.each(queryItem.children, function (i, child) {
                that._addQueryNode(node, child, false, null, null);
            });
        }
    }

    private _addDataNode(parentNode, name, drawTopSeparator, itemType, isQuery, data, quantity) {
        let node: any = this._addNode(parentNode, name, drawTopSeparator);
        node.itemType = itemType;
        if (node.itemType === ValueMap.TestQueryableItemTypes.TestRun) {
            node.config.css = "top-separator-none";
        }

        node.isQuery = isQuery;
        node.data = data;
        return node;
    }

    private _addNode(parentNode, name, drawTopSeparator) {
        let node = TreeView.TreeNode.create(name);
        node.title = name;
        parentNode.add(node);

        if (drawTopSeparator) {
            node.config.css = "top-separator";
        }

        return node;
    }

    private _populate(rootNode) {
        let firstFolderFound = false;

        if (this._hierarchy) {
            rootNode.data = this._hierarchy;
            $.each(this._hierarchy.children, (i, child) => {
                let drawSeparator = false;

                // Use a separator above the first folder found in the hierarchy
                // if child queries are present above it
                if (!firstFolderFound && child instanceof TFSOMQueries.QueryFolder) {
                    firstFolderFound = true;
                    drawSeparator = i > 0;
                }


                if (child.id === ValueMap.TestQueryConstants.EXPLORATORY_SESSIONS_QUERY_ID) {
                    // Adding the exploratory session option of the left pane
                    this._addQueryNode(rootNode, child, true, null, true);
                }else if (child.id !== ValueMap.TestQueryConstants.RUNS_TITLE_QUERY_ID) {
                    // Don't add Run title query on the Left pane.
                    // The below code adds the recentlty used queries to the left pane
                    this._addQueryNode(rootNode, child, drawSeparator, null, true);
                }
            });
        }
    }

    private _onSelectedNodeChanged(e?) {
        let arg = this._getSelectedNodeChangedArg(this.getSelectedNode());
        this._fire("selectedQueryExplorerNodeChanged", arg);
    }

    private _getSelectedNodeChangedArg(selectedNode) {
        let selectedNodeChangedArg;

        selectedNodeChangedArg = {};

        if (selectedNode) {
            selectedNodeChangedArg.itemType = selectedNode.itemType;
            selectedNodeChangedArg.isQuery = selectedNode.isQuery;
            selectedNodeChangedArg.data = selectedNode.data;
        }

        return selectedNodeChangedArg;
    }
}

VSS.initClassPrototype(QueryExplorerTree, {
    _tfsContext: null,
    _hierarchy: null
});

export class TestRunSummaryShortcutGroup extends ShortcutGroupDefinition {

    constructor(private view: any) {
        super(Resources.RunSummaryShortcutGroupName);
        this.shortcutManager.removeShortcutGroup(Resources.TestRunsShortcutGroupName);
        this.shortcutManager.removeShortcutGroup(Resources.TestResultsShortcutGroupName);

        this.registerPageNavigationShortcut(
            "1",
            {
                description: Resources.TestRunLevelSummaryText,
                action: () =>
                    this.navigateToUrl(TMUtils.UrlHelper.getRunsUrl(TestRunSummaryShortcutGroup.runChartsAction, [{
                        parameter: "runId",
                        value: view._options.runId
                    }
                    ])),

                allowPropagation: true
            });
        this.registerPageNavigationShortcut(
            "2",
            {
                description: Resources.TestResults,
                action: () =>
                    this.navigateToUrl(TMUtils.UrlHelper.getRunsUrl(TestRunSummaryShortcutGroup.resultQueryAction, [{
                        parameter: "runId",
                        value: view._options.runId
                    }
                    ])),

                allowPropagation: true
            });
        this.registerPageNavigationShortcut(
            "3",
            {
                description: Resources.FilterShortcutText,
                action: () =>
                    this.navigateToUrl(TMUtils.UrlHelper.getRunsUrl(TestRunSummaryShortcutGroup.resultQueryEditorAction, [{
                        parameter: "runId",
                        value: view._options.runId
                    }
                    ])),

                allowPropagation: true
            });
    }
    private static runChartsAction: string = "runCharts";
    private static resultQueryAction: string = "resultQuery";
    private static resultQueryEditorAction: string = "resultQueryEditor";
}

export class TestResultsToolbarShortcutGroup extends ShortcutGroupDefinition {

    constructor(private view: QueryResultsView) {
        super(Resources.TestResultsToolbarShortcutGroupName);
        this.shortcutManager.removeShortcutGroup(Resources.TestResultsShortcutGroupName);
        this.shortcutManager.removeShortcutGroup(Resources.TestRunsShortcutGroupName);
        this.registerShortcut(
            "a",
            {
                description: Resources.UpdateAnalysisMenuItem,
                action: () => this.view._handleToolbarItemClick("update-analysis"),
            });
        this.registerShortcut(
            "f",
            {
                description: Resources.Refresh,
                action: () => this.view._handleToolbarItemClick("refresh-query"),
            });
        this.registerShortcut(
            "c b",
            {
                description: Resources.CreateBugShortcut,
                action: () => this.view._handleToolbarItemClick("create-bug"),
            });
    }
}
export class QueryEditorShortcutGroup extends ShortcutGroupDefinition {

    constructor(private view: QueryEditor) {
        super(Resources.QueriesShortcutGroupName);
        this.shortcutManager.removeShortcutGroup(Resources.TestResultsToolbarShortcutGroupName);
        this.registerShortcut(
            "e",
            {
                description: Resources.RunQuery,
                action: () => this.view.runQuery(),
                allowPropagation: true
            });
    }
}
VSS.classExtend(QueryExplorerTree, TfsContext.ControlExtensions);

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.RunsView.Controls.Queries", exports);

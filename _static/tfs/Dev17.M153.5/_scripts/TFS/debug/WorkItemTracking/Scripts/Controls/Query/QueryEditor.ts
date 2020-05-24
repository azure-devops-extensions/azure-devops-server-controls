import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import CheckboxList = require("VSS/Controls/CheckboxList");
import Diag = require("VSS/Diag");
import Navigation = require("VSS/Controls/Navigation");
import Splitter = require("VSS/Controls/Splitter");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { resizeSplitter } from "WorkItemTracking/Scripts/Utils/SplitterUtils";
import { QueryType } from "TFS/WorkItemTracking/Contracts";
import { getLocalService } from "VSS/Service";
import { LocalSettingsScope, LocalSettingsService } from "VSS/Settings";
import { QueryFilter } from "WorkItemTracking/Scripts/Controls/Query/QueryFilter";
import { QueryResultInfoBar } from "WorkItemTracking/Scripts/Controls/Query/QueryResultInfoBar";
import { QueryResultsProvider, WorkItemsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { QueryAdapter } from "WorkItemTracking/Scripts/OM/QueryAdapter";
import { LinkQueryMode } from "WorkItemTracking/Scripts/OM/QueryConstants";
import { IEditInfo, IQueryParamsExtras, IQueryResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { IWorkItemLinkTypeEnd } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { WorkItemViewActions } from "WorkItemTracking/Scripts/Utils/WorkItemViewActions";
import Service = require("VSS/Service");
import Events_Services = require("VSS/Events/Services");
import WITCommonResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.Common");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Telemetry = require("VSS/Telemetry/Services");
import QueryResultGrid = require("WorkItemTracking/Scripts/Controls/Query/QueryResultGrid");
import CustomerIntelligenceConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");


const delegate = Utils_Core.delegate;
export interface IQueryTypeItem {
    id: "flat" | "link" | "tree";
    value: "flat" | "link" | "tree";
    text: string;
    icon: string;
    selected?: boolean;
    disabled?: boolean;
}

const WORKITEMPANE_HEIGHT_KEY = "queryEditorWorkItemPaneHeight";
const WORKITEMPANE_MINIMUM_BOTTOM = 100;
const WORKITEMPANE_MINIMUM_TOP_NQE = 325;

export class QueryEditor extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.wit.queryEditor";

    private _queryProvider: QueryResultsProvider;
    private _queryAdapter: QueryAdapter;
    private _queryType: Navigation.PivotFilter;
    private _queryTypeItems: IQueryTypeItem[];
    private _splitter: Splitter.Splitter;
    private _filters: JQuery;
    private _grid: QueryResultGrid.QueryResultGrid;
    private _gridInfoBar: QueryResultInfoBar;
    private _sourceFilter: QueryFilter;
    private _linkFilter: QueryFilter;
    private _treeFilter: QueryFilter;
    private _linkFiltersHost: JQuery;
    private _treeFiltersHost: JQuery;
    private _resizeDelegate = () => { this._handleResize(); };
    private _saveSplitterSizeDelegate = () => { this.saveSplitterSize(); };
    private _linkFiltersLinkTypesAny: JQuery;
    private _linkFiltersLinkTypesSelected: JQuery;
    private _linkFilterModeCombo: Combos.Combo;
    private _treeFilterModeCombo: Combos.Combo;
    private _linkFiltersLinkTypes: CheckboxList.CheckboxList;
    private _treeFiltersLinkTypesCombo: Combos.Combo;
    private _treeFiltersLinkTypesIndexToName: IDictionaryNumberTo<string>; // translate index of link type to LTE name. Eg: 0->Parent
    private _treeFiltersLinkTypesNameToIndex: IDictionaryStringTo<number>;
    private _model: IQueryResult;
    private _refreshDelegate: () => void;
    private _queryAcrossProjectsCheckboxControl: JQuery;
    private _queryAcrossProjectsCheckboxLabel: JQuery;
    private _queriesHubContext: IQueriesHubContext;
    private _focusFirstFieldOnRefresh: boolean;
    private _avoidGettingResults: boolean;
    private _shouldConvertCurrentIterations: boolean;
    private _localSettingsService: LocalSettingsService;

    constructor(options?) {
        super(options);
        this._refreshDelegate = delegate(this, this._refresh);
        this._treeFiltersLinkTypesIndexToName = {};
        this._treeFiltersLinkTypesNameToIndex = {};
        this._localSettingsService = getLocalService<LocalSettingsService>(LocalSettingsService);
    }

    public setFocusOnRefresh() {
        this._focusFirstFieldOnRefresh = true;
    }

    public getResultsGrid(): QueryResultGrid.QueryResultGrid {
        return this._grid;
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "query-editor",
            infoBar: true
        }, options));

        this._queriesHubContext = options.queriesHubContext;
    }

    public dispose() {
        this._unbind(this._splitter.leftPane, "keydown", this._onKeyDown);

        this._splitter._unbind("changed", this._saveSplitterSizeDelegate);

        $(window).off("resize", this._resizeDelegate);

        if (this._queryProvider) {
            this._queryProvider.detachEvent(WorkItemsProvider.EVENT_REFRESH_REQUIRED, this._refreshDelegate);
            this._queryProvider.detachEvent(QueryResultsProvider.EVENT_QUERY_RESULTS_MODEL_CHANGED, this._refreshDelegate);

            this._queryProvider = null;
        }

        this.detachNavigatorEvents();

        super.dispose();
    }

    public setProvider(queryProvider: QueryResultsProvider, callback: IResultCallback, errorCallback?: IErrorCallback, extras?: IQueryParamsExtras) {
        // clear all previous handler events
        if (this._queryProvider) {
            this._queryProvider.clearEvents();
        }
        this._shouldConvertCurrentIterations = true;

        this._queryProvider = queryProvider;
        this._queryProvider.attachEvent(WorkItemsProvider.EVENT_REFRESH_REQUIRED, this._refreshDelegate);
        this._queryProvider.attachEvent(QueryResultsProvider.EVENT_QUERY_RESULTS_MODEL_CHANGED, this._refreshDelegate);

        this._queryAdapter = (<Service.VssConnection>queryProvider.project.store.tfsConnection).getService<QueryAdapter>(QueryAdapter);

        if (extras && extras.skipRefresh) {
            return;
        }
        this._refresh(callback, errorCallback, extras, true);
    }

    public getProvider() {
        return this._queryProvider;
    }

    public detachNavigatorEvents() {
        this._grid.detachNavigatorEvents();
    }

    public attachNavigatorEvents() {
        this._grid.attachNavigatorEvents();
    }

    public scrollIntoView(force: boolean) {
        this._grid.getSelectedRowIntoView(force);
    }

    public saveQuery() {
        this._grid.saveQuery();
    }

    public setIsCopiedFromUrl(isCopied: boolean) {
        if (this._queryProvider && this._queryProvider.queryDefinition) {
            this._queryProvider.queryDefinition.customQuery = isCopied;
        }
    }

    public runQuery() {
        if (this.isDisposed()) {
            return;
        }
        this.getResultsGrid().showLoadingIndicator();       
        this._queryProvider.invalidateResults();   
        this.setProvider(this._queryProvider, () => {
            Diag.logTracePoint("QueryEditor.runQuery.complete");
            this.getResultsGrid().hideLoadingIndicator();
        }, () => {
            this.getResultsGrid().hideLoadingIndicator();
        });
    }

    public revert() {
        // Reverting edit info without firing query model changed event. Since setprovider will automatically call refresh
        this._queryProvider.revertEditInfo(false);
        Events_Services.getService().fire(WorkItemViewActions.WORKITEM_VIEW_INFO_CHANGE, null, "");

        this.setProvider(this._queryProvider, function () {
            Diag.logTracePoint("QueryEditor.revert.complete");
        });
    }

    // for unit test
    public getLinkFilterModeCombo(): Combos.Combo {
        return this._linkFilterModeCombo;
    }

    // for unit test
    public getTreeFilterModeCombo(): Combos.Combo {
        return this._treeFilterModeCombo;
    }

    private _resizeSplitter = (): void => {
        resizeSplitter(this._splitter, this._getSplitterMaxSize(), this._getSplitterMinSize());
        this.saveSplitterSize();
    }

    private _handleResize() {
        // Only update splitter if control is visible
        if (this.isVisible()) {
            this._resizeSplitter();
        }
    }

    public _createElement() {
        const that = this;
        const id = Controls.getId();

        super._createElement();

        this._splitter = this._createSplitter();
        this._splitter._bind("changed", this._saveSplitterSizeDelegate);

        $(window).resize(this._resizeDelegate);

        this._createQueryOptionsHost();

        this._splitter.leftPane.attr("tabindex", "-1");

        this._filters = $("<div />").addClass("filters").appendTo(this._splitter.leftPane);

        let $fieldSet = this._createFieldSetHeader(Resources.QueryEditorSourceFilterGroupingText, "source");

        this._sourceFilter = <QueryFilter>Controls.BaseControl.createIn(QueryFilter, $fieldSet, { cssClass: "source-filter", tfsContext: this._options.tfsContext });

        this._filters.append($fieldSet);

        this._linkFiltersHost = $("<div />").addClass("link").hide();

        $fieldSet = this._createFieldSetHeader(Resources.FiltersForLinkedWorkItems, "link");

        this._linkFilter = <QueryFilter>Controls.BaseControl.createIn(QueryFilter, $fieldSet, { cssClass: "link-filter", tfsContext: this._options.tfsContext });

        this._linkFiltersHost.append($fieldSet);

        const $queryModeHost = $("<div />").addClass("query-mode").appendTo(this._linkFiltersHost);

        const queryModeControlId = id + "_queryMode";
        $("<label />").text(Resources.QueryEditorQueryModeLabel || "").attr("for", id + "_queryMode").appendTo($queryModeHost);

        this._linkFilterModeCombo = <Combos.Combo>Controls.BaseControl.createIn<Combos.IComboOptions>(Combos.Combo, $queryModeHost, {
            id: queryModeControlId,
            value: Resources.QueryEditorQueryModeMustHave,
            mode: "drop",
            allowEdit: false,
            source: [
                Resources.QueryEditorQueryModeMustHave,
                Resources.QueryEditorQueryModeMayHave,
                Resources.QueryEditorQueryModeDoesNotContain
            ],
            indexChanged: () => { this._updateQueryMode(); }
        });

        const $linkTypesHost = $("<div />").addClass("link-types").appendTo(this._linkFiltersHost);

        $("<label />").text(Resources.QueryEditorLinkTypeLabel || "").attr("for", id + "_linkTypes").appendTo($linkTypesHost);
        $linkTypesHost.append($("<br />"));

        this._linkFiltersLinkTypesAny = $("<input/>")
            .attr({
                "type": "radio",
                "name": "link-types-radio",
                "id": id + "_linkTypesAny"
            })
            .click(() => {
                this._linkFiltersLinkTypes.enableElement(false);
                this._linkFilterLinkTypeChanged("");
            })
            .appendTo($linkTypesHost);

        $("<label />").text(Resources.ReturnLinksOfAnyType).attr("for", id + "_linkTypesAny").appendTo($linkTypesHost);
        $linkTypesHost.append($("<br />"));

        this._linkFiltersLinkTypesSelected = $("<input/>")
            .attr({
                "type": "radio",
                "name": "link-types-radio",
                "id": id + "_linkTypesSelected"
            })
            .click(() => {
                this._linkFiltersLinkTypes.enableElement(true);
                this._linkFilterLinkTypeChanged(that._linkFiltersLinkTypes.getCheckedValues().join(","));
            })
            .appendTo($linkTypesHost);

        $("<label />").text(Resources.ReturnSelectedLinkTypes).attr("for", id + "_linkTypesSelected").appendTo($linkTypesHost);
        this._linkFiltersLinkTypes = <CheckboxList.CheckboxList>Controls.BaseControl.createIn<CheckboxList.ICheckboxListOptions>(CheckboxList.CheckboxList, $linkTypesHost, {
            id: id + "_linkTypes",
            cssClass: "link-types",
            useArrowKeysForNavigation: true,
            change: function () {
                that._linkFilterLinkTypeChanged(that._linkFiltersLinkTypes.getCheckedValues().join(","));
            }
        });

        this._filters.append(this._linkFiltersHost);

        this._treeFiltersHost = $("<div />").addClass("tree").hide();

        $fieldSet = this._createFieldSetHeader(Resources.QueryEditorTargetFilterGroupingText, "tree");

        this._treeFilter = <QueryFilter>Controls.BaseControl.createIn(QueryFilter, $fieldSet, { cssClass: "tree-filter", tfsContext: this._options.tfsContext });

        this._treeFiltersHost.append($fieldSet);

        const $treeQueryModeHost = $("<div />").addClass("query-mode").appendTo(this._treeFiltersHost);

        const treeQueryModeControlId = id + "_treeQueryMode";
        $("<label />").text(Resources.QueryEditorQueryModeLabel || "").attr("for", treeQueryModeControlId).appendTo($treeQueryModeHost);
        this._treeFilterModeCombo = <Combos.Combo>Controls.BaseControl.createIn<Combos.IComboOptions>(Combos.Combo, $treeQueryModeHost, {
            id: treeQueryModeControlId,
            value: Resources.QueryEditorQueryMatchTopLevelItems,
            mode: "drop",
            allowEdit: false,
            source: [
                Resources.QueryEditorQueryMatchTopLevelItems,
                Resources.QueryEditorQueryMatchLinkedItems
            ],
            indexChanged: () => { this._updateQueryMode(); }
        });

        const $treeLinkTypesHost = $("<div />").addClass("link-types").appendTo(this._treeFiltersHost);
        const treeTypeControlId = id + "_treeType";
        $("<label />").text(Resources.QueryEditorTreeTypeLabel || "").attr("for", treeTypeControlId).appendTo($treeLinkTypesHost);

        this._treeFiltersLinkTypesCombo = <Combos.Combo>Controls.BaseControl.createIn<Combos.IComboOptions>(Combos.Combo, $treeLinkTypesHost, {
            id: treeTypeControlId,
            mode: "drop",
            allowEdit: false,
            indexChanged: (index: number) => { this._updateTreeLinkType(index); }
        });

        this._filters.append(this._treeFiltersHost);

        if (this._options.infoBar === true) {
            this._gridInfoBar = <QueryResultInfoBar>Controls.BaseControl.createIn(
                QueryResultInfoBar, this._splitter.rightPane, { cssClass: "work-item-list-info", tfsContext: this._options.tfsContext, queriesHubContext: this._queriesHubContext });
        } else {
            this._gridInfoBar = <QueryResultInfoBar>this._options.infoBar;
        }

        this._grid = this._createQueryResultGrid(this._splitter.rightPane);
        this._grid.setInitialSelectedWorkItemId(this._options.initialSelectedWorkItemId);
        this._grid.setNavigator(this._options.workItemsNavigator);

        if (this._gridInfoBar) {
            this._gridInfoBar.bind(this._grid);
        }

        this._bind(this._splitter.leftPane, "keydown", this._onKeyDown);

        Diag.logTracePoint("QueryEditor._createElement.complete");
    }

    private _onKeyDown = (keyEventObject: JQueryKeyEventObject) => {
        // Mod+S event to trigger query save
        if (Utils_UI.KeyUtils.isExclusivelyCommandOrMetaKeyBasedOnPlatform(keyEventObject) && keyEventObject.keyCode === Utils_UI.KeyCode.S) {
            if (this._queryProvider.isDirty()) {
                this.saveQuery();
            }
            return false;
        }
    }

    public showElement() {
        /// <summary>Overrides BaseControl's showElement</summary>
        super.showElement();
        // A window resize might have happened, so resize splitter
        this._resizeSplitter();
        this._splitter.attachResize(true);
    }

    public hideElement() {
        /// <summary>Overrides BaseControl's hideElement</summary>
        this._splitter.detachResize();
        super.hideElement();
    }

    public isDirty(): boolean {
        return this._queryProvider ? this._queryProvider.isDirty() : false;
    }

    public getQueryType(): Navigation.PivotFilter {
        return this._queryType;
    }

    public getQueryTypeItems(): IQueryTypeItem[] {
        return this._queryTypeItems;
    }

    public getQueryAcrossProjectsCheckboxControl(): JQuery {
        return this._queryAcrossProjectsCheckboxControl;
    }

    public _createSplitter(): Splitter.Splitter {
        return <Splitter.Splitter>Controls.BaseControl.createIn(Splitter.Splitter, this._element, {
            cssClass: "content",
            initialSize: this.getInitialSplitterSize(),
            maxWidth: this._getSplitterMaxSize(),
            minWidth: this._getSplitterMinSize(),
            fixedSide: "right",
            splitWidth: "350px",
            handleBarWidth: "5px"
        });
    }

    public _createQueryOptionsHost(): JQuery {
        const $queryOptionsHost = $("<div />").addClass("query-options").appendTo(this._splitter.leftPane);

        if (!this._options.hideQueryType) {
            const $queryTypeHost = $("<div />").addClass("query-type").appendTo($queryOptionsHost);

            const queryTypeLabelId = "query-type-label";
            $("<span />").addClass(queryTypeLabelId).attr("id", queryTypeLabelId).text(Resources.QueryEditorQueryTypeLabel).appendTo($queryTypeHost);

            this._queryTypeItems = this._createQueryTypeItems();
            this._queryType = <Navigation.PivotFilter>Controls.BaseControl.createIn<Navigation.IPivotFilterOptions>(Navigation.PivotFilter, $queryTypeHost, {
                behavior: "dropdown",
                items: this._queryTypeItems,
                ariaAttributes: {
                    labelledby: "query-type-label"
                },
                change: () => {
                    this._updateQueryMode();
                    return false;
                },

            });
        }

        const $queryAcrossProjectHost = $("<div />").addClass("query-across-project-selector").appendTo($queryOptionsHost);
        this._createQueryAcrossProjectsCheckbox($queryAcrossProjectHost);

        return $queryOptionsHost;
    }

    private getInitialSplitterSize(): number | undefined {
        const storedSize: string | undefined = this._localSettingsService
            .read(WORKITEMPANE_HEIGHT_KEY, undefined, LocalSettingsScope.Global);
        if (!storedSize) {
            return undefined;
        } else {
            return parseInt(storedSize);
        }
    }

    private _getSplitterMaxSize(): number {
        const documentHeight = $(document).height();
        return documentHeight - WORKITEMPANE_MINIMUM_TOP_NQE;
    }

    private _getSplitterMinSize(): number {
        return WORKITEMPANE_MINIMUM_BOTTOM;
    }

    private saveSplitterSize(): void {
        this._localSettingsService.write(WORKITEMPANE_HEIGHT_KEY, "" + this._splitter.getFixedSidePixels(),
            LocalSettingsScope.Global);
    }

    private _queryAcrossProjects(): boolean {
        if (this._queryAcrossProjectsCheckboxControl) {
            return this._queryAcrossProjectsCheckboxControl.prop("checked");
        }

        return true;
    }

    private _createQueryAcrossProjectsCheckbox($host: JQuery) {
        const id = `${Controls.getId()}_queryAcrossProjectCheckbox`;

        this._queryAcrossProjectsCheckboxLabel = $("<label />")
            .addClass("query-across-project-label")
            .attr("for", id)
            .text(Resources.QueryAcrossProjects);

        this._queryAcrossProjectsCheckboxLabel.appendTo($host);

        this._queryAcrossProjectsCheckboxControl = $("<input type='checkbox' />")
            .addClass("query-across-project-checkbox")
            .attr("id", id)
            .appendTo($host)
            .bind("change", () => {
                this._queryAcrossProjectsChanged();
            });
    }

    private _queryAcrossProjectsChanged() {
        const editInfo = this._getEditInfo();
        const queryAcrossProjects = this._queryAcrossProjects();

        editInfo.teamProject = queryAcrossProjects ? null : this._queryProvider.project.name;

        this._queryProvider.setDirty(true);
        // Refresh the grid, allowed values need to be updated.
        this._updateFilters(this._model);

        this._publishSelectedProjectTelemetry(queryAcrossProjects);
    }

    private _publishSelectedProjectTelemetry(queryAcrossProjects: boolean) {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
            CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_QUERYACROSSPROJECTS,
            {
                "checked": queryAcrossProjects
            }));
    }

    public _createFieldSetHeader(legendText: string, className: string): JQuery {
        const $fieldSet = $("<fieldset />").addClass(className);
        $("<legend />").text(legendText || "").appendTo($fieldSet);
        return $fieldSet;
    }

    public _createQueryTypeItems(): IQueryTypeItem[] {
        const queryTypeItems = [];
        queryTypeItems.push({ id: "flat", value: "flat", text: Resources.QueryEditorQueryTypeSimple, icon: "query-type-text bowtie-icon bowtie-view-list", selected: true, disabled: false });
        if (this._options.tfsContext.standardAccessMode === true) {
            queryTypeItems.push({ id: "link", value: "link", text: Resources.QueryEditorQueryTypeLink, icon: "query-type-text bowtie-icon bowtie-view-list-group", disabled: false });
            queryTypeItems.push({ id: "tree", value: "tree", text: Resources.QueryEditorQueryTypeTree, icon: "query-type-text bowtie-icon bowtie-view-list-tree", disabled: false });
        }

        return queryTypeItems;
    }

    public _createQueryResultGrid($containerElement: JQuery): QueryResultGrid.QueryResultGrid {
        return <QueryResultGrid.QueryResultGrid>Controls.BaseControl.createIn(QueryResultGrid.QueryResultGrid, $containerElement, {
            cssClass: "work-item-list",
            tfsContext: this._options.tfsContext,
            queriesHubContext: this._queriesHubContext,
            useZeroDataView: true
        });
    }

    public _getGrid(): QueryResultGrid.QueryResultGrid {
        return this._grid;
    }

    public _getModel(): IQueryResult {
        return this._model;
    }

    public _getEditInfo(): IEditInfo {
        return this._model.editInfo;
    }

    public getSourceFilter(): QueryFilter {
        return this._sourceFilter;
    }

    private _refresh(callback: IResultCallback, errorCallback?: IErrorCallback, extras?: IQueryParamsExtras, trySetFocus?: boolean) {
        // Skipping executing this method since the method can be called again by EVENT_QUERY_RESULTS_MODEL_CHANGED event, which is triggered by this method
        if (!this._avoidGettingResults) {
            // Adding a null check for the navigator before setting the provider
            const navigator = this._grid.getWorkItemsNavigator();
            if (navigator) {
                navigator.setProvider(this._queryProvider);
            }

            const onProjectsLoad = (model: IQueryResult) => {

                // Bail out if provider is not set, since that means we navigated mid-request
                if (!this._queryProvider) {
                    return;
                }

                this._updateFilters(model);
                this._updateQueryTypes();
                this._updateQueryAcrossProject(model.editInfo);

                if (extras && extras.statusText) {
                    this._grid.setStatusText(extras.statusText);
                }

                this._grid.beginShowResults(this._queryProvider, () => {
                    if ($.isFunction(callback)) {
                        callback.call(this);
                    }
                    // Grid may have changed the model (force query upgrades)
                    this._updateFilters(model);

                    // _refresh will be called twice when run query, we need set focus on 2nd one with trySetFocus flag
                    if (this._focusFirstFieldOnRefresh && trySetFocus) {
                        // Focus on first field input of first clause in the active filter (flat/tree/link)
                        $("fieldset:visible td.field input:first", this._filters).focus();
                        this._focusFirstFieldOnRefresh = false;
                    }
                }, errorCallback, extras);
            };

            const setModel = (model: IQueryResult) => {
                this._queryAdapter.beginEnsureFields(() => {
                    this._queryAdapter.beginGetRecursiveLinkTypes(() => {
                        this._queryAdapter.beginGetOneHopLinkTypes(() => {
                            const scopedProjectId = this._getScopedProjectId(model.editInfo);
                            if (scopedProjectId) {
                                this._queryAdapter.store.beginGetProject(scopedProjectId, () => {
                                    onProjectsLoad(model);
                                }, errorCallback);
                            } else {
                                this._queryAdapter.store.beginGetProjects(() => {
                                    onProjectsLoad(model);
                                }, errorCallback);
                            }
                        }, errorCallback);
                    }, errorCallback);
                }, errorCallback);
            };

            $(this._grid).trigger("queryResultsStarting");
            this._avoidGettingResults = true;
            this._queryProvider.beginGetResults((model: IQueryResult) => {
                $(this._grid).trigger("queryResultsComplete");
                setModel(model);
                this._avoidGettingResults = false;
            }, (error) => {
                $(this._grid).trigger("queryResultsError", error);
                this._queriesHubContext.actionsCreator.showErrorMessageForTriageView(error && error.message);
                this._avoidGettingResults = false;
            },
                extras && extras.runQuery);
        }
    }

    private _updateQueryAcrossProject(editInfo: IEditInfo) {
        if (this._queryAcrossProjectsCheckboxControl) {
            this._queryAcrossProjectsCheckboxControl.prop("checked", !this._isProjectScoped(editInfo));
        }
    }

    public _isProjectScoped(editInfo: IEditInfo): boolean {
        // only if the team project is the @project macro
        // or is the same as the current project do we want to uncheck the
        // checkbox, which then binds the query to the current project.
        let scoped = false;
        if (editInfo.teamProject) {
            if (this._queryAdapter.isProjectMacro(editInfo.teamProject, false) ||
                Utils_String.localeIgnoreCaseComparer(editInfo.teamProject, this._queryProvider.project.name) === 0) {
                scoped = true;
            }
        }

        return scoped;
    }

    private _getScopedProjectId(editInfo: IEditInfo): string {
        // only if the team project is the @project macro
        // or is the same as the current project do we want to uncheck the
        // checkbox, which then binds the query to the current project.
        if (editInfo.teamProject) {
            if (this._queryAdapter.isProjectMacro(editInfo.teamProject, false)) {
                return this._options.tfsContext.navigation.projectId;
            } else {
                return editInfo.teamProject;
            }
        }

        return null;
    }

    private _updateQueryTypes() {
        if (this._queryType && this._queryTypeItems) {
            this._queryType.updateItems(this._queryTypeItems);
        }
    }

    // This is public because it is called from derived class. It has "_" to distinguish from a class interface member.
    public _updateQueryMode() {
        const editInfo = this._getEditInfo();

        const oldMode = editInfo.mode;
        if (!this._queryType) {
            return;
        }

        switch (this._queryType.getSelectedItem().value) {
            case "link":
                editInfo.mode = this._getLinkFilterMode();
                break;
            case "tree":
                editInfo.mode = this._getTreeFilterMode();
                break;
            default:
                editInfo.mode = LinkQueryMode.WorkItems;
                break;
        }

        this._updateUI();

        if (editInfo.mode !== oldMode) {
            this._queryProvider.setDirty(true);
            this._queryProvider.queryDefinition.queryType = QueryType[LinkQueryMode.getQueryType(editInfo.mode)];
            this._queriesHubContext.triageViewActionCreator.updateProvider(this._queryProvider);
        }
    }

    private _updateFilters(model: IQueryResult) {
        this._model = model;

        let workItemTypeField;
        const editInfo = this._getEditInfo();

        workItemTypeField = this._queryProvider.project.store.getFieldDefinition(WITConstants.CoreField.WorkItemType);

        editInfo.sourceFilter = model.editInfo.sourceFilter || { clauses: [{ logicalOperator: WITCommonResources.WiqlOperators_And, fieldName: "", operator: WITCommonResources.WiqlOperators_EqualTo, value: "", index: 0, originalIndex: 0 }], groups: [] };
        editInfo.treeTargetFilter = model.editInfo.treeTargetFilter || { clauses: [{ logicalOperator: WITCommonResources.WiqlOperators_And, fieldName: workItemTypeField.name, operator: WITCommonResources.WiqlOperators_EqualTo, value: WITCommonResources.WiqlOperators_Any, index: 0, originalIndex: 0 }], groups: [] };
        editInfo.linkTargetFilter = model.editInfo.linkTargetFilter || { clauses: [{ logicalOperator: WITCommonResources.WiqlOperators_And, fieldName: workItemTypeField.name, operator: WITCommonResources.WiqlOperators_EqualTo, value: WITCommonResources.WiqlOperators_Any, index: 0, originalIndex: 0 }], groups: [] };

        const project: WITOM.Project = this._getSelectedProject(this._getEditInfo());

        this._sourceFilter.setParameters(this._queryProvider, editInfo.sourceFilter, project);
        this._treeFilter.setParameters(this._queryProvider, editInfo.treeTargetFilter, project);
        this._linkFilter.setParameters(this._queryProvider, editInfo.linkTargetFilter, project);

        this._updateLinkFilterMode(LinkQueryMode.LinksMustContain);
        this._populateOneHopLinkTypes();

        if (editInfo.linkTypes) {
            this._linkFiltersLinkTypesSelected.prop("checked", true);
            this._linkFiltersLinkTypes.enableElement(true);
            this._linkFiltersLinkTypes.setCheckedValues($.map(editInfo.linkTypes.split(","), function (v: string) { return $.trim(v); }));
        } else {
            this._linkFiltersLinkTypesAny.prop("checked", true);
            this._linkFiltersLinkTypes.setCheckedValues([]);
            this._linkFiltersLinkTypes.enableElement(false);
        }

        this._updateTreeFilterMode(LinkQueryMode.LinksRecursive);
        this._populateTreeLinkTypes();

        if (editInfo.treeLinkTypes) {
            this._treeFiltersLinkTypesCombo.setSelectedIndex(this._treeFiltersLinkTypesNameToIndex[editInfo.treeLinkTypes]);
        } else {
            editInfo.treeLinkTypes = this._treeFiltersLinkTypesIndexToName[this._treeFiltersLinkTypesCombo.getSelectedIndex()];
        }

        if (this._queryType) {
            if (LinkQueryMode.isTreeQuery(editInfo.mode)) {
                this._queryType.setSelectedItem(this._queryTypeItems[2], false);
            } else if (LinkQueryMode.isLinkQuery(editInfo.mode)) {
                this._queryType.setSelectedItem(this._queryTypeItems[1], false);
            } else {
                this._queryType.setSelectedItem(this._queryTypeItems[0], false);
            }
        }

        this._updateUI();

        const queryType = QueryType[LinkQueryMode.getQueryType(editInfo.mode)];
        // new queries do not initially have a type, so to prevent firing unnecessary provider
        // update actions when editing an existing query, only fire if the type is different.
        if (this._queryProvider.queryDefinition.queryType !== queryType) {
            this._queryProvider.queryDefinition.queryType = queryType;
            this._queriesHubContext.triageViewActionCreator.updateProvider(this._queryProvider);
        }
    }

    public _getSelectedProject(editInfo: IEditInfo): WITOM.Project {
        let currentProject = null;

        if (editInfo.teamProject) {
            if (!this._queryAdapter.isProjectMacro(editInfo.teamProject, false)) {
                if (this._queryAdapter.store.hasProject(editInfo.teamProject)) {
                    currentProject = this._queryAdapter.store.getProject(editInfo.teamProject);
                } else {
                    // Case where project name in the query doesn't exist in the work item store
                    // (may have been deleted, may be a typo in the wiql, user may not have access to it, etc)
                    currentProject = null;
                }

            } else {
                // Use the default project.
                currentProject = this._queryProvider.project;
            }
        }

        return currentProject;
    }

    private _updateUI() {
        const editInfo: IEditInfo = this._getEditInfo();

        if (LinkQueryMode.isTreeQuery(editInfo.mode)) {
            this._linkFiltersHost.hide();
            this._updateTreeFilterMode(editInfo.mode);
            this._treeFiltersHost.show();
        } else if (LinkQueryMode.isLinkQuery(editInfo.mode)) {
            this._treeFiltersHost.hide();
            this._updateLinkFilterMode(editInfo.mode);
            this._linkFiltersHost.show();
        } else {
            this._treeFiltersHost.hide();
            this._linkFiltersHost.hide();
        }
    }

    private _updateLinkFilterMode(mode: number) {
        Diag.Debug.assert(mode >= LinkQueryMode.LinksMustContain && mode <= LinkQueryMode.LinksDoesNotContain, "Invalid link filter mode");
        this._linkFilterModeCombo.setSelectedIndex(mode - LinkQueryMode.LinksMustContain);
    }

    private _getLinkFilterMode(): number {
        let mode: number;
        switch (this._linkFilterModeCombo.getValue<string>()) {
            case Resources.QueryEditorQueryModeMustHave: mode = LinkQueryMode.LinksMustContain; break;
            case Resources.QueryEditorQueryModeMayHave: mode = LinkQueryMode.LinksMayContain; break;
            case Resources.QueryEditorQueryModeDoesNotContain: mode = LinkQueryMode.LinksDoesNotContain; break;
            default: Diag.Debug.fail("Unexpected link filter mode text");
        }
        return mode;
    }

    private _updateTreeFilterMode(mode: number) {
        Diag.Debug.assert(mode >= LinkQueryMode.LinksRecursive && mode <= LinkQueryMode.LinksRecursiveReturnMatchingChildren, "Invalid tree filter mode");
        this._treeFilterModeCombo.setSelectedIndex(mode - LinkQueryMode.LinksRecursive);
    }

    private _getTreeFilterMode(): number {
        let mode: number;
        switch (this._treeFilterModeCombo.getValue<string>()) {
            case Resources.QueryEditorQueryMatchTopLevelItems: mode = LinkQueryMode.LinksRecursive; break;
            case Resources.QueryEditorQueryMatchLinkedItems: mode = LinkQueryMode.LinksRecursiveReturnMatchingChildren; break;
            default: Diag.Debug.fail("Unexpected tree filter mode text");
        }
        return mode;
    }

    private _populateTreeLinkTypes() {
        this._queryAdapter.beginGetRecursiveLinkTypes((linkTypeEnds: IWorkItemLinkTypeEnd[]) => {
            const source: string[] = [];
            $.each(linkTypeEnds, (i: number, lte: IWorkItemLinkTypeEnd) => {
                this._treeFiltersLinkTypesIndexToName[i] = lte.name;
                this._treeFiltersLinkTypesNameToIndex[lte.name] = i;
                source.push(Utils_String.format("{0}/{1}", lte.oppositeEnd.name, lte.name));
            });
            this._treeFiltersLinkTypesCombo.setSource(source);
            this._treeFiltersLinkTypesCombo.setSelectedIndex(0);
        });
    }

    private _populateOneHopLinkTypes() {
        const that = this;
        this._queryAdapter.beginGetOneHopLinkTypes(function (linkTypeEnds: IWorkItemLinkTypeEnd[]) {
            const linkTypes = $.map(linkTypeEnds, function (lte: IWorkItemLinkTypeEnd) { return lte.name; });
            linkTypes.sort(Utils_String.localeIgnoreCaseComparer);
            that._linkFiltersLinkTypes.setItems(linkTypes);
        });
    }

    private _updateTreeLinkType(index: number) {
        const editInfo: IEditInfo = this._getEditInfo();

        const oldValue = editInfo.treeLinkTypes;
        editInfo.treeLinkTypes = this._treeFiltersLinkTypesIndexToName[index];

        if (oldValue !== editInfo.treeLinkTypes) {
            this._queryProvider.setDirty(true);
        }
    }

    private _linkFilterLinkTypeChanged(linkTypes: string) {
        const editInfo: IEditInfo = this._getEditInfo();
        const oldValue = editInfo.linkTypes;
        editInfo.linkTypes = linkTypes;

        if (oldValue !== linkTypes) {
            this._queryProvider.setDirty(true);
        }
    }
}

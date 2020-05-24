
/// <reference types="jquery" />





import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import Menus = require("VSS/Controls/Menus");
import Splitter = require("VSS/Controls/Splitter");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import KeyboardShortcuts = require("VSS/Controls/KeyboardShortcuts");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import {LinkQueryMode} from "WorkItemTracking/Scripts/OM/QueryConstants";
import QueryEditor = require("WorkItemTracking/SharedScripts/QueryEditor");
import QueryResultGrid = require("WorkItemTracking/Scripts/Controls/Query/QueryResultGrid");
import QueryResultToolbar = require("WorkItemTracking/SharedScripts/QueryResultToolbar");
import WorkItemsProvider = require("WorkItemTracking/Scripts/Controls/WorkItemsProvider");
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { IQueryResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import Events_Services = require("VSS/Events/Services");
import { QueryResultMenuBar } from "WorkItemTracking/SharedScripts/QueryResultMenuBar";

let TfsContext = TFS_Host_TfsContext.TfsContext;
let delegate = Utils_Core.delegate;
let TestCaseCategoryUtils = TMUtils.TestCaseCategoryUtils;
let WITUtils = TMUtils.WorkItemUtils;
import {QueryDefinition} from "WorkItemTracking/Scripts/OM/QueryItem";

export class PersistenceIds {
    public static INSERT_SHARED_STEPS_ID: string = "2A00D61E-ED97-40F0-8FF8-33EC553C03E9";
    public static ADD_TEST_CASES_ID: string = "775465CC-CF1A-4A3B-8446-CEFB0AE48347";
    public static ADD_REQUIREMENTS_ID: string = "1F0CE07F-BB51-403D-B129-53542977878A";
    public static CREATE_QUERY_BASED_SUITE_ID: string = "7ACADA08-9875-4480-958F-EBF9D5B1452F";
    public static SELECT_TEST_PLANS_ID: string = "650231A3-0620-4D36-ABBF-3B48EEB5316A";
}

export class SimpleQueryResultGrid extends QueryResultGrid.QueryResultGrid {

    public _onRowDoubleClick(e?: JQueryEventObject) {
        if (super.getSelectedWorkItemIds().length > 0) {
            if (this.closed) {
                this.closed();
            }
        }
    }

    public _onEnterKey(e?: JQueryEventObject, bounds?): any {
        // Do nothing.
    }

    public isDirty(checkKnown): boolean {
        return false;
    }

    public updateDataModel(queryResultsModel) {
        super.updateDataModel(queryResultsModel);
        if (queryResultsModel.error && this.onError) {
            this.onError(queryResultsModel.error);
        }
    }

    public closed: () => void;
    public onError: (error) => void;
}

export class SimpleQueryResultToolbar extends QueryResultToolbar {

    public runQuery: () => void;

    // Over-ridden functions
    public _createMenuBar($containerElement: JQuery): QueryResultMenuBar {
        let menuBar: QueryResultMenuBar;
        menuBar = <QueryResultMenuBar>Controls.BaseControl.createIn(QueryResultMenuBar, $containerElement, {
            items: this._createMenubarItems(),
            executeAction: delegate(this, this._onMenubarItemClick)
        });
        return menuBar;
    }

    public _createMenubarItems() {
        let items = [],
            that = this;

        function getActionArgs() {
            return that._onGetMenuItemActionArguments(this);
        }

        items.push({ id: "run-query-simple", text: WITResources.RunQuery, showText: true, icon: "bowtie-icon bowtie-media-play-fill" });

        if (this._options.supportWorkItemOpen) {
            items.push({ id: "open-work-item", title: WITResources.Open, showText: false, icon: "bowtie-icon bowtie-arrow-open", "arguments": getActionArgs });
        }

        return items;
    }

    public _onMenubarItemClick(e?) {
        let command = e.get_commandName();
        if (command === "run-query-simple") {
            if (this.runQuery) {
                this.runQuery();
            }

            return;
        }

        if (this._getGrid()) {
            return this._getGrid().executeCommand(e);
        }
    }
}

class SimpleQueryEditorSplitter extends Splitter.Splitter {

    public resize(newSize, suppressFireResize?: boolean, useAnimation?: boolean) {
        super.resize(newSize, true, false);
        if (this.resized) {
            this.resized();
        }
    }

    public resized: () => void;
}

// The strings in query mode should match the property names io QuerySetting class.
class QueryModes {
    public static Flat: string = "flat";
    public static Link: string = "link";
    public static Tree: string = "tree";
}

class QuerySetting {
    public flat: string;
    public link: string;
    public tree: string;
    public defaultMode: string = QueryModes.Flat;
}

export class QuerySettingsHelper {

    constructor(category: string, areaPath: string, serverSettingString: string) {
        this._localSettings = new QuerySetting();
        this._serverSettings = new QuerySetting();
        this._createDefaultQueries(category, areaPath);
        this._populateServerSettings(serverSettingString);
    }

    public getQueryText(mode: string): string {
        return this._localSettings[mode] || this._serverSettings[mode] || this._defaultSettings[mode];
    }

    public setQueryText(mode: string, queryText: string): void {
        this._localSettings[mode] = queryText;
    }

    public getServerSettingString(): string {
        let setting = new QuerySetting(),
            flatQuery = this.getQueryText(QueryModes.Flat),
            linkQuery = this.getQueryText(QueryModes.Link),
            treeQuery = this.getQueryText(QueryModes.Tree);

        setting.flat = (flatQuery !== this._defaultSettings.flat) ? flatQuery : "";
        setting.link = (linkQuery !== this._defaultSettings.link) ? linkQuery : "";
        setting.tree = (treeQuery !== this._defaultSettings.tree) ? treeQuery : "";
        setting.defaultMode = this._currentMode || QueryModes.Flat;
        return Utils_Core.stringifyMSJSON(setting);
    }

    public setCurrentQueryMode(mode: string): void {
        this._currentMode = mode;
    }

    public getCurrentQueryMode(): string {
        return this._currentMode || QueryModes.Flat;
    }

    public getDefaultSettingString(): string {
        let setting = new QuerySetting();

        setting.flat = "";
        setting.link = "";
        setting.tree = "";
        setting.defaultMode = QueryModes.Flat;
        return Utils_Core.stringifyMSJSON(setting);
    }

    public getDefaultQueryText(mode: string): string {
        return this._defaultSettings[mode];
    }

    private _createDefaultQueries(category: string, areaPath: string): void {
        let defaultFlatQuery = this._getDefaultFlatQuery(category, areaPath),
            defaultTreeQuery = this._getDefaultTreeQuery(category, areaPath),
            defaultLinkQuery = this._getDefaultLinkQuery(category, areaPath);

        this._defaultSettings = new QuerySetting();
        this._defaultSettings.flat = defaultFlatQuery;
        this._defaultSettings.link = defaultLinkQuery;
        this._defaultSettings.tree = defaultTreeQuery;
    }

    private _getDefaultFlatQuery(category: string, areaPath: string): string {
        let areaCondition = areaPath ? Utils_String.format(this.c_flatQueryAreaPathClause, WITUtils.EscapeWiqlFieldValue(areaPath)) : "";
        return this.c_select + " " + this.c_flatQueryWhere + " " + Utils_String.format(this.c_flatQueryConditionClause, category, areaCondition);
    }

    private _getDefaultLinkQuery(category: string, areaPath: string): string {
        let areaCondition = areaPath ? Utils_String.format(this.c_linkAndTreeQueryAreaPathConditionClause, WITUtils.EscapeWiqlFieldValue(areaPath)) : "";
        return this.c_select + " " + this.c_linkAndTreeQueryWhere + " " +
            Utils_String.format(this.c_linkAndTreeQuerySourceConditionClause, areaCondition) + " AND " +
            Utils_String.format(this.c_linkAndTreeQueryTargetConditionClause, category) + " AND " +
            this.c_linkQueryLinkClause + " " +
            this.c_linkQueryModeClause;
    }

    private _getDefaultTreeQuery(category: string, areaPath: string): string {
        let areaCondition = areaPath ? Utils_String.format(this.c_linkAndTreeQueryAreaPathConditionClause, WITUtils.EscapeWiqlFieldValue(areaPath)) : "";
        return this.c_select + " " + this.c_linkAndTreeQueryWhere + " " +
            Utils_String.format(this.c_linkAndTreeQuerySourceConditionClause, areaCondition) + " AND " +
            Utils_String.format(this.c_linkAndTreeQueryTargetConditionClause, category) + " AND " +
            this.c_treeQueryLinkClause + " " +
            this.c_treeQueryModeClause;
    }

    private _populateServerSettings(serverSettingString: string): void {
        try {
            this._serverSettings = serverSettingString ? Utils_Core.parseMSJSON(serverSettingString, false) : new QuerySetting();           
            if (!this._serverSettings) {
                this._serverSettings = new QuerySetting();
                this._currentMode = QueryModes.Flat;
            }
            else {
                this._currentMode = this._serverSettings.defaultMode || QueryModes.Flat;
            }
        }
        catch (e) {
            // If there is any issue with server setting, do not block user.
            this._serverSettings = new QuerySetting();
            this._currentMode = QueryModes.Flat;
        }
    }

    private _serverSettings: QuerySetting;
    private _localSettings: QuerySetting;
    private _defaultSettings: QuerySetting;
    private _category: string;
    private _currentMode: string;

    private c_select: string = "SELECT [System.Id],[System.WorkItemType],[System.Title],[Microsoft.VSTS.Common.Priority],[System.AssignedTo],[System.AreaPath] FROM ";
    private c_flatQueryWhere: string = "WorkItems WHERE";
    private c_linkAndTreeQueryWhere: string = "WorkItemLinks WHERE";
    private c_flatQueryConditionClause: string = "([System.TeamProject] = @project AND [System.WorkItemType] IN GROUP '{0}' {1})";
    private c_flatQueryAreaPathClause: string = " AND [System.AreaPath] UNDER '{0}'";
    private c_linkAndTreeQuerySourceConditionClause: string = "([Source].[System.TeamProject]= @project AND [Source].[System.WorkItemType] <> '' {0})";
    private c_linkAndTreeQueryAreaPathConditionClause: string = " AND [Source].[System.AreaPath] UNDER '{0}'";
    private c_linkAndTreeQueryTargetConditionClause: string = "([Target].[System.TeamProject] = @project AND [Target].[System.WorkItemType] IN GROUP '{0}')";
    private c_linkQueryLinkClause: string = "([System.Links.LinkType] <> '')";
    private c_treeQueryLinkClause: string = "([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward')";
    private c_linkQueryModeClause: string = "mode(maycontain)";
    private c_treeQueryModeClause: string = "mode(recursive)";
}

export class SimpleQueryEditor extends QueryEditor.QueryEditor {

    public initialize() {
        let grid: QueryResultGrid.QueryResultGrid,
            $suiteInputSection: JQuery;

        super.initialize();

        grid = this._getGrid();
        grid._bind("selectionchanged", delegate(this, this._onSelectedWorkItemChanged));
        this._bind(grid, "queryResultsError", (e, error) => {
            if (this.onError) {
                this.onError(error);
            }
        }, true);

        Events_Services.getService().attachEvent("query-provider-dirty-state-changed", () => {
            let provider = super.getProvider();
            if (provider && provider.isDirty()) {
                this._isDirty = true;
            }
            else {
                this._isDirty = false;
            }
        });

        this._element.find(".content").css("top", 40);
    }

    public onWorkItemSelectionChanged: (numWorkItemsSelected: number) => void;
    public closed: () => void;
    public onError: (exception) => void;

    public onContainerResize(e?: JQueryEventObject): any {
        let grid = this._getGrid();
        //there is a possible race conditon where the grid is not yet initialized but the splitter resize is triggered
        //only if the grid is not null try resizing it
        if (grid) {
            grid._onContainerResize(e);
        }
    }

    public beginGetSelectedWorkItemPageData(callback: (workItemPageData: QueryResultGrid.IWorkItemPageData) => void) {
        let grid = this._getGrid();
        grid.beginPageSelectedWorkItems(() => {
            if (callback) {
                callback(grid.getSelectedWorkItemPageData());
            }
        },
            (error) => {
                if (this.onError) {
                    this.onError(error);
                }
            });
    }

    public getStatusText(): string {
        let grid = this._getGrid();
        return grid.getStatusText();
    }

    public setProject(project: WITOM.Project): void {
        this._project = project;
    }

    public setQuerySettingsHelper(querySettingsHelper: QuerySettingsHelper): void {
        this._querySettingsHelper = querySettingsHelper;
    }

    public setQueryText(queryText: string, mode?: number): void {
        let queryModeString: string;

        if (!mode && super._getModel()) {
            mode = super._getModel().editInfo.mode;
        }

        if (mode && this._isDirty) {
            queryModeString = this._getQueryModeString(mode);
            this._querySettingsHelper.setQueryText(queryModeString, queryText);
            this._isDirty = false;
        }
    }

    public _updateQueryMode() {
        let queryProvider = super.getProvider(),
            model = super._getModel(),
            queryText: string,
            queryData,
            queryDefinition: QueryDefinition,
            prevMode = model.editInfo.mode,
            prevModeString = this._getQueryModeString(prevMode),
            currentModeString: string;

        queryProvider.beginGetQueryText((prevQueryText: string) => {
            super._updateQueryMode();
            currentModeString = this._getQueryModeString(model.editInfo.mode);
            if (prevModeString !== currentModeString) {
                this.setQueryText(prevQueryText, prevMode);
                this._querySettingsHelper.setCurrentQueryMode(currentModeString);
                queryText = this._querySettingsHelper.getQueryText(currentModeString);
                queryData = {
                    query: queryText,
                    folder: false,
                    newQueryId: "1",
                    id: queryProvider.getId()
                };

                queryDefinition = new QueryDefinition(this._project, queryData);
                queryProvider.reset(queryDefinition, true);
                this.setProvider(queryProvider, null, (error) => {
                    if (this.onError) {
                        this.onError(error);
                    }
                }, { runQuery: false, skipRefresh: false });
            }
        });
    }

    private _getQueryModeString(mode: number): string {
        if (LinkQueryMode.isTreeQuery(mode)) {
            return QueryModes.Tree;
        }
        else if (LinkQueryMode.isLinkQuery(mode)) {
            return QueryModes.Link;
        }
        else {
            return QueryModes.Flat;
        }
    }

    private _onSelectedWorkItemChanged(e?: JQueryEventObject, id?: number) {
        let grid = this._getGrid();
        if (this.onWorkItemSelectionChanged) {
            this.onWorkItemSelectionChanged(grid.getSelectedWorkItemIds().length);
        }
    }

    public _createSplitter(): Splitter.Splitter {
        let splitter = <SimpleQueryEditorSplitter>Controls.BaseControl.createIn(SimpleQueryEditorSplitter, this._element, { cssClass: "content", fixedSide: "left", splitWidth: "550px", handleBarWidth: "5px" });
        splitter.resized = () => {
            this.onContainerResize();
        };

        return splitter;
    }

    public _createToolbarHost(): JQuery {
        return $("<div />");
    }

    public _createMenuBar($containerElement: JQuery): Menus.MenuBar {
        // Create a dummy menu bar. We are creating a dummy to avoid any if checks.
        let menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $containerElement, {
            items: this._createMenubarItems()
        });

        return menuBar;
    }

    public _createResultGridToolbar($containerElement): SimpleQueryResultToolbar {
        let queryResultToolbar = <SimpleQueryResultToolbar>Controls.BaseControl.createIn(SimpleQueryResultToolbar,
            $containerElement,
            {
                cssClass: "work-item-list-toolbar",
                tfsContext: this._options.tfsContext,
                hideFilter: true,
                supportWorkItemOpen: this._options.supportWorkItemOpen
            });
        queryResultToolbar.runQuery = () => {
            this.runQuery();
        };

        return queryResultToolbar;
    }

    public _createQueryResultGrid($containerElement): QueryResultGrid.QueryResultGrid {
        let simpleQueryResultGrid = <SimpleQueryResultGrid>Controls.BaseControl.createIn(SimpleQueryResultGrid, $containerElement, { cssClass: "work-item-list", tfsContext: this._options.tfsContext, showContextMenu: false });
        simpleQueryResultGrid.closed = () => {
            if (this.closed) {
                this.closed();
            }
        };

        simpleQueryResultGrid.onError = (error) => {
            if (this.onError) {
                this.onError(error);
            }
        };

        return simpleQueryResultGrid;
    }

    public _createMenubarItems(): Menus.IMenuItemSpec[] {
        return [];
    }

    public _createFieldSetHeader(legendText: string, className: string): JQuery {
        let $fieldSet: JQuery;
        if (this._options.hideQueryType) {
            $fieldSet = super._createFieldSetHeader("", className);
        }
        else {
            $fieldSet = super._createFieldSetHeader(legendText, className);
        }

        return $fieldSet;
    }

    private _project: WITOM.Project;
    private _querySettingsHelper: QuerySettingsHelper;
    protected _isDirty: boolean = false;
}

export interface SelectWorkItemsDialogOptions extends Dialogs.IModalDialogOptions {
    workItemCategories?: string[];
    areaPath?: string;
    queryText?: string;
    persistenceId?: string;
    hideQueryType?: boolean;
    supportWorkItemOpen?: boolean;
    newSuiteMode?: boolean;
    callback?: Function;
    removeQueryOptions?: boolean;
    projectId?: string;
}

export class BaseSelectWorkItemsDialog extends Dialogs.ModalDialogO<SelectWorkItemsDialogOptions> {

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "select-workitems-dialog"
        }, options));
        this._projectId = options.projectId;
    }

    public initialize(callback?: IResultCallback) {

        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault(),
            queryData;

        super.initialize();
        this._workItemCategories = this._options.workItemCategories;
        this._decorate();

        this._store = TMUtils.WorkItemUtils.getWorkItemStore();
        this._webSettingsService = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);
        let projectId = this._getProjectId();
        this._store.beginGetProject(projectId, (project: WITOM.Project) => {
            this._project = project;
            this._beginGetQueryText(project.guid, (queryText: string) => {
                this.updateQueryEditor(queryText, project, callback);
            }, (error) => {
                this._handleError(error);
            });
        }, (error) => {
            this._handleError(error);
        });

        if (this._options.removeQueryOptions) {
            // Removing Query option div, by default Dialog will contain multiple Query type options
            // and Query across project checkbox, which is not required for Filter test plan dialog
            this._removeQueryOption();
        }
    }

    public updateQueryEditor(queryText: string, project: WITOM.Project, callback?: IResultCallback): void {
        // Create query item definition
        let queryData = {
            query: queryText,
            folder: false,
            newQueryId: "1",
            id: this._options.persistenceId
        };

        this._beginGetProvider(queryData, (provider: WorkItemsProvider.QueryResultsProvider) => {

            this._provider = provider;

            this._simpleQueryEditor.setProvider(provider, null, (error) => {
                this._handleError(error);
            }, { runQuery: false });
            this._simpleQueryEditor.setProject(project);
            if (callback) {
                callback();
            }
        });
    }

    public onDialogResize(e?: JQueryEventObject): any {
        this._simpleQueryEditor.onContainerResize(e);
    }

    public onClose(e?: JQueryEventObject): any {
        // Work item dialog register Queries shortcut group while creating Query Editor, 
        // unregistering that while closing the workitem dialog so that it doesn't show up in Test hub
        this.removeQueriesShortcut();
        super.onClose(e);
    }

    public onCancelClick(e?: JQueryEventObject): any {
        // Work item dialog register Queries shortcut group while creating Query Editor, 
        // unregistering that while cancelling the workitem dialog so that it doesn't show up in Test hub
        this.removeQueriesShortcut();
        super.onClose(e);
    }

    private _beginGetProvider(queryItemData, callback: (resultProvider: WorkItemsProvider.QueryResultsProvider) => void): void {

        let queryDefinition: QueryDefinition,
            queryResultsProvider: WorkItemsProvider.QueryResultsProvider;

        if (queryItemData) {
            queryDefinition = new QueryDefinition(this._project, queryItemData);
            queryResultsProvider = WorkItemsProvider.QueryResultsProvider.get(queryDefinition, null, false, true);
            if (callback) {
                callback(queryResultsProvider);
            }
        }
    }

    public processResult(): void {
        let callback = this._options.okCallback;
        this._simpleQueryEditor.beginGetSelectedWorkItemPageData((workItemPageData: QueryResultGrid.IWorkItemPageData) => {
            if (workItemPageData) {

                this._beginFilterWorkItems(workItemPageData, (filteredWorkItemIds: number[]) => {

                    if (filteredWorkItemIds.length > 0) {
                        if ($.isFunction(callback)) {
                            callback.call(this, filteredWorkItemIds);
                        }

                        this.close();
                    }
                    else {
                        this._updateStatus(Utils_String.format(Resources.ErrorSelectingWorkItemsForCategory, this._getCategoryRefName()), true);
                    }
                });
            }
        });
    }

    public _decorate(): void {
        let element: JQuery = this._element;
        element.append($("<div class='simple-query-editor' />"));
        this._simpleQueryEditor = this._createQueryEditor(element.find("div.simple-query-editor"));

        this._simpleQueryEditor.closed = () => {
            this.processResult();
        };

        this._simpleQueryEditor.onError = (error) => {
            this._handleError(error);
        };
    }

    public _getQueryEditor(): SimpleQueryEditor {
        return this._simpleQueryEditor;
    }

    public _getCachedProvider(): WorkItemsProvider.QueryResultsProvider {
        return this._provider;
    }

    public _getCategoryRefName(): string {
        return this._workItemCategories[0];
    }

    public _getProject(): WITOM.Project {
        return this._project;
    }

    public _handleError(error) {
        this._updateStatus(VSS.getErrorMessage(error), true);
        alert(Utils_String.format(Resources.WIQLQueryError, VSS.getErrorMessage(error)));
        this._resetDone = true;
    }

    public _beginSaveQueryText(projectGuid: string, queryText: string, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        let settingKey = this._getSettingKey(projectGuid);
        this._webSettingsService.beginWriteSetting(settingKey, queryText, TFS_WebSettingsService.WebSettingsScope.User, callback, errorCallback);
    }

    public _beginGetQueryText(projectGuid: string, callback: IResultCallback, errorCallback?: IErrorCallback) {
        let settingKey = this._getSettingKey(projectGuid);
        this._webSettingsService.beginReadSetting(settingKey, TFS_WebSettingsService.WebSettingsScope.User, callback, errorCallback);
    }

    protected _getSettingKey(projectGuid: string): string {
        return "/TestManagement" + "/" + projectGuid + "/SelectWorkItemView" + "/" + this._options.persistenceId;
    }

    private _getProjectId(): string{      
        return TMUtils.ProjectUtil.validateAndGetProjectId(this._projectId);
    }

    private _beginFilterWorkItems(workItemPageData: QueryResultGrid.IWorkItemPageData, callback: (filteredWorkItems: number[]) => void) {
        let filteredItems: number[];
        if (this._workItemTypesForCategory.length > 0) {
            filteredItems = this._filterWorkItems(workItemPageData, this._workItemTypesForCategory);
            if (callback) {
                callback(filteredItems);
            }
        }
        else {
            WITUtils.getAllWorkItemTypeNamesForCategoryForAllProjects(this._workItemCategories, (workItemTypeNames: string[]) => {
                this._workItemTypesForCategory = workItemTypeNames;
                filteredItems = this._filterWorkItems(workItemPageData, this._workItemTypesForCategory);
                if (callback) {
                    callback(filteredItems);
                }
            }, this._getProjectId());
        }
    }

    private _filterWorkItems(workItemPageData: QueryResultGrid.IWorkItemPageData, witTypeNames: string[]): number[] {
        let i = 0,
            len = workItemPageData.pageData.length,
            typeNameIndex = TestsOM.WorkItemPageDataUtils.getWitFieldIndex(WITConstants.CoreFieldRefNames.WorkItemType, workItemPageData.pageColumns),
            idIndex = TestsOM.WorkItemPageDataUtils.getWitFieldIndex(WITConstants.CoreFieldRefNames.Id, workItemPageData.pageColumns),
            pageRow: any,
            filteredWorkItemIds: number[] = [],
            typeName: string,
            id: number;

        // Assumption: The field "System.WorkItemType" should be present in page data. We do not support column options currently.
        // When we do support column options and the "System.WorkItemType" is removed by user, we need to find out a way to get the same.
        Diag.Debug.assert(typeNameIndex >= 0);
        Diag.Debug.assert(idIndex >= 0);

        for (i = 0; i < len; i++) {
            pageRow = workItemPageData.pageData[i];
            typeName = pageRow[typeNameIndex];
            id = parseInt(pageRow[idIndex], 10);
            if (Utils_Array.contains(witTypeNames, typeName, Utils_String.localeIgnoreCaseComparer) &&
                !Utils_Array.contains(filteredWorkItemIds, id)) {
                filteredWorkItemIds.push(id);
            }
        }

        return filteredWorkItemIds;
    }

    public _createQueryEditor($element: JQuery): SimpleQueryEditor {
        let queryEditor = <SimpleQueryEditor>Controls.BaseControl.createIn(SimpleQueryEditor, $element, {
            infoBar: false,
            showContextMenu: false,
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            hideQueryType: this._options.hideQueryType,
            supportWorkItemOpen: this._options.supportWorkItemOpen
        });

        queryEditor.onWorkItemSelectionChanged = (numWorkItems: number) => {
            this.updateOkButton(numWorkItems > 0);
            this._updateStatus(this._simpleQueryEditor.getStatusText());
        };

        return queryEditor;
    }

    public _updateStatus(statusText: string, isError?: boolean) {
        if (!this._$statusDiv) {
            this._$statusDiv = $("<div>").addClass("simple-query-editor-status");
            let $parentDiv: JQuery = $(".select-workitems-dialog").parent().find(".ui-dialog-buttonpane");
            if ($parentDiv) {
                let $buttonSet = $parentDiv.find(".ui-dialog-buttonset");
                $buttonSet.css("display", "inline-block");
                $parentDiv.append(this._$statusDiv);
            }
        }

        if (isError) {
            this._$statusDiv.addClass("invalid");
        }
        else {
            this._$statusDiv.removeClass("invalid");
        }

        if (statusText) {
            this._$statusDiv.text(statusText);
            this._$statusDiv.attr("title", statusText);
        }
        else {
            this._$statusDiv.text("");
        }
    }

    private removeQueriesShortcut() {
        let shortcutManager = KeyboardShortcuts.ShortcutManager.getInstance();
        if (shortcutManager) {
            shortcutManager.removeShortcutGroup(WITResources.KeyboardShortcutGroup_Queries);
        }
    }

    private _removeQueryOption() {
        this._element.find(".query-options").remove();
    }

    protected _resetDone: boolean;
    private _simpleQueryEditor: SimpleQueryEditor;
    private _store: WITOM.WorkItemStore;
    private _grid: QueryResultGrid.QueryResultGrid;
    private _workItemCategories: string[];
    private _workItemTypesForCategory: string[] = [];
    private _$statusDiv: JQuery;
    private _webSettingsService: TFS_WebSettingsService.WebSettingsService;
    private _project: WITOM.Project;
    private _projectId: string;
    private _provider: WorkItemsProvider.QueryResultsProvider;
}

export class SelectWorkItemsDialog extends BaseSelectWorkItemsDialog {

    public initialize() {

        super.initialize(() => {
            this._getQueryEditor().setQuerySettingsHelper(this._querySettingsHelper);
        });
        this._areaPath = this._options.areaPath;

        this._bind("keydown", (e: JQueryEventObject) => {
            // This is just an undocumented way to clear query setting. To be used for testing.
            // Pressing Ctrl + Alt + x clears the selection saved on the server.
            if (e.altKey && e.ctrlKey && e.which === 88) {
                this._beginSaveQueryText(this._getProject().guid, this._querySettingsHelper.getQueryText(QueryModes.Flat));
                this._resetDone = true;
            }
        });
    }

    public onClose(e?: JQueryEventObject, callback?: IResultCallback): any {
        let provider = this._getCachedProvider();
        if (!this._resetDone && provider) {
            provider.beginGetQueryText((queryText: string) => {
                let settingsString: string;
                this._getQueryEditor().setQueryText(queryText);
                settingsString = this._querySettingsHelper.getServerSettingString();
                if ($.trim(settingsString) !== "") {
                    this._beginSaveQueryText(this._getProject().guid, settingsString, () => {
                        super.onClose(e);
                        if (callback) {
                            callback();
                        }
                    },
                        () => {
                            super.onClose(e);
                        });
                } else {
                    super.onClose(e);
                }
            },
                () => {
                    super.onClose(e);
                });
        } else {
            super.onClose(e);
        }
    }

    public _beginGetQueryText(projectGuid: string, callback: IResultCallback, errorCallback?: IErrorCallback) {
        super._beginGetQueryText(projectGuid, (querySetting) => {
            this._createQuerySettingsHelper(querySetting.value);
            if (callback) {
                let queryMode = this._querySettingsHelper.getCurrentQueryMode();
                callback(this._querySettingsHelper.getQueryText(queryMode));
            }
        }, errorCallback);
    }

    public _createQuerySettingsHelper(serverSettingString: string): void {
        if (!this._querySettingsHelper) {
            this._querySettingsHelper = new QuerySettingsHelper(this._getCategoryRefName(), this._areaPath, serverSettingString);
        }
    }

    public _handleError(error) {
        // throw error and save default query in registry
        super._handleError(error);
        this._beginSaveQueryText(this._getProject().guid, this._querySettingsHelper.getDefaultSettingString());
        // update editor with default query
        this.updateQueryEditor(this._querySettingsHelper.getDefaultQueryText(this._querySettingsHelper.getCurrentQueryMode()), this._getProject());
    }

    private _querySettingsHelper: QuerySettingsHelper;
    private _areaPath: string;
}

class CreateQueryBasedSuiteEditor extends SimpleQueryEditor {

    public initialize() {
        let $suiteInputSection: JQuery;
        super.initialize();

        if (this._options.newSuiteMode) {
            $suiteInputSection = this._createSuiteInputSection();
            this._element.find(".leftPane").prepend($suiteInputSection);
        }
    }

    public getSuiteName(): string {
        if (this._$suiteNameInput) {
            return this._$suiteNameInput.val();
        }
        else {
            return "";
        }
    }

    public _createQueryResultGrid($containerElement): QueryResultGrid.QueryResultGrid {
        let queryResultsGrid = <SimpleQueryResultGrid>super._createQueryResultGrid($containerElement);
        queryResultsGrid.closed = null;
        return queryResultsGrid;
    }

    public onQueryNameChanged: (newName: string) => void;

    private _createSuiteInputSection(): JQuery {
        let $table = $("<table/>").addClass("suite-name-input-table"),
            $tr: JQuery,
            $label: JQuery,
            $labelId = "suite-name-input-id";

        // Construct DOM.

        // Label.
        $label = $("<label />").text(Resources.TestPlanNameTitle).addClass("suite-name-input-label").attr("id", $labelId);

        // Text box.
        this._$suiteNameInput = $("<input />").attr("type", "text")
            .addClass("suite-name-input")
            .attr("aria-labelledby", $labelId)
            .val(Resources.NewQueryBasedSuiteDefaultName);

        // Table row.
        $tr = $("<tr/>").append($("<td/>").append($label))
            .append($("<td/>").append(this._$suiteNameInput).addClass("suite-name-input-cell"));

        $table.append($tr);

        // Initialize events.
        this._bind(this._$suiteNameInput, "blur input change", () => {
            let queryName = this._$suiteNameInput.val();
            if ($.trim(queryName) === "") {
                this._$suiteNameInput.addClass("invalid");
            }
            else {
                this._$suiteNameInput.removeClass("invalid");
            }

            if (this.onQueryNameChanged) {
                this.onQueryNameChanged(queryName);
            }
        });

        return $table;
    }

    private _$suiteNameInput: JQuery;
}

export class CreateQueryBasedSuiteDialog extends SelectWorkItemsDialog {

    public initialize() {
        super.initialize();
        this._element.addClass("create-query-based-suite");
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            defaultButton: false
        }, options));
    }

    public processResult(): void {
        let callback = this._options.okCallback,
            provider = super._getCachedProvider();

        provider.beginGetQueryText((queryText: string) => {
            let error = this._checkForErrorsInQuery(queryText);
            if ($.trim(error) !== "") {
                super._updateStatus(error, true);
                return;
            }

            WITUtils.beginValidateQueryContainsCategory(queryText, super._getCategoryRefName(), () => {
                if (callback) {
                    callback($.trim(this._queryEditor.getSuiteName()), queryText);
                }

                this.close();
            },
                (error) => {
                    this._updateStatus(VSS.getErrorMessage(error), true);
                });
        },
            (error) => {
                this._updateStatus(VSS.getErrorMessage(error), true);
            });
    }

    public _beginGetQueryText(projectGuid: string, callback: IResultCallback, errorCallback?: IErrorCallback) {
        if (this._options.newSuiteMode) {
            super._beginGetQueryText(projectGuid, callback, errorCallback);
        }
        else {
            super._createQuerySettingsHelper(null);
            if (callback) {
                callback(this._options.queryText);
            }
        }
    }

    public _beginSaveQueryText(projectGuid: string, queryText: string, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        if (this._options.newSuiteMode) {
            super._beginSaveQueryText(projectGuid, queryText, callback, errorCallback);
        }
        else {
            if (callback) {
                callback();
            }
        }
    }

    private _checkForErrorsInQuery(queryText: string): string {
        let errorString = "";
        if (this._queryContainsAtMe(queryText)) {
            errorString = Resources.QueryCannotContainMe;
        }

        return errorString;
    }

    private _queryContainsAtMe(queryText: string) {

        // This logic is exactly same as whatever is used in MTM.
        let trimmedQueryText = $.trim(queryText).toLowerCase(),
            index = trimmedQueryText.indexOf("@me"),
            trailingChar = queryText[index + 3];

        if (index > -1) {
            if (index === trimmedQueryText.length - 3) {
                return true;
            }

            if (trailingChar === " " || trailingChar === "'") {
                return true;
            }
        }

        return false;
    }

    public _createQueryEditor($element: JQuery): SimpleQueryEditor {
        this._queryEditor = <CreateQueryBasedSuiteEditor>Controls.BaseControl.createIn(CreateQueryBasedSuiteEditor, $element, {
            infoBar: false,
            showContextMenu: false,
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            hideQueryType: this._options.hideQueryType,
            supportWorkItemOpen: this._options.supportWorkItemOpen,
            newSuiteMode: this._options.newSuiteMode
        });

        this._queryEditor.onWorkItemSelectionChanged = (numWorkItems: number) => {
            super._updateStatus(this._queryEditor.getStatusText());
        };

        if (this._options.newSuiteMode) {
            this._queryEditor.onQueryNameChanged = (newName: string) => {
                if ($.trim(newName) === "") {
                    super._updateStatus(Resources.SuiteNameCannotBeEmpty, true);
                    this.updateOkButton(false);
                }
                else {
                    super._updateStatus(this._queryEditor.getStatusText());
                    this.updateOkButton(true);
                }
            };
        }

        this.updateOkButton(true);
        return this._queryEditor;
    }

    private _queryEditor: CreateQueryBasedSuiteEditor;
}

export class TestPlansResultGrid extends SimpleQueryResultGrid {
    public updateDataModel(queryResultsModel) {
        if (queryResultsModel && !!queryResultsModel.targetIds) {
            if (queryResultsModel.targetIds.length > 0) {
                let testPlanManager = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<TestsOM.TestPlanManager>(TestsOM.TestPlanManager);
                testPlanManager.fetchTcmPlanIds(queryResultsModel.targetIds,
                    (tcmPlanIds) => {
                        // set the targetIds to TCM Plan Ids; This removes all test plans deleted in TCM
                        this._updateGridDataModel(queryResultsModel, tcmPlanIds);
                    },
                    (error) => {
                        if (this.onError) {
                            this.onError(error);
                        }
                    }
                );
            }
            else {
                //Simply updating when no Ids returned with empty array.
                this._updateGridDataModel(queryResultsModel, []);
            }
        }
    }

    private _updateGridDataModel(queryResultsModel: IQueryResult, targetIds: number[]): void {
        queryResultsModel.targetIds = targetIds;
        super.updateDataModel(queryResultsModel);
    }
}

export class TestPlansFilterEditor extends SimpleQueryEditor {
    public initialize() {
        super.initialize();
    }

    public _createQueryResultGrid($containerElement): QueryResultGrid.QueryResultGrid {
        let queryResultsGrid = <TestPlansResultGrid>Controls.BaseControl.createIn(TestPlansResultGrid, $containerElement, { cssClass: "work-item-list", tfsContext: this._options.tfsContext, showContextMenu: false });

        queryResultsGrid.closed = null;
        return queryResultsGrid;
    }

    public setQueryTextHelper(queryTextHelper: QueryTextHelper): void {
        this._queryTextHelper = queryTextHelper;
    }

    public setQueryText(queryText: string): void {
        if (this._isDirty) {
            this._queryTextHelper.setQueryText(queryText);
            this._isDirty = false;
        }
    }

    private _queryTextHelper: QueryTextHelper;
}

export class QueryTextHelper {

    constructor(serverQuery?: string) {
        if (serverQuery) {
            this._serverQuery = serverQuery;
        }
        this._defaultQuery = TestsOM.TestPlanSelectionHelper.getDefaultQuery();
    }

    public getQueryText(): string {
        return this._localQuery || this._serverQuery || this._defaultQuery;
    }

    public setQueryText(queryText: string): void {
        this._localQuery = queryText;
    }

    public getDefaultQuery(): string {
        return this._defaultQuery;
    }

    private _serverQuery: string;
    private _localQuery: string;
    private _defaultQuery: string;
}

export class SelectTestPlanDialog extends BaseSelectWorkItemsDialog {
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            removeQueryOptions: true
        }, options));
    }

    public initialize() {
        super.initialize(() => {
            if (this._queryEditor) {
                this._queryEditor.setQueryTextHelper(this._queryTextHelper);
            }
        });
    }

    public _createQueryEditor($element: JQuery): TestPlansFilterEditor {
        this._queryEditor = <TestPlansFilterEditor>Controls.BaseControl.createIn(TestPlansFilterEditor, $element, {
            infoBar: false,
            showContextMenu: false,
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            hideQueryType: this._options.hideQueryType,
            supportWorkItemOpen: this._options.supportWorkItemOpen
        });

        this._element.find(".splitter").css("top", 10);

        this._queryEditor.onWorkItemSelectionChanged = () => {
            this._updateStatus(this._queryEditor.getStatusText());
        };

        this.updateOkButton(true);
        return this._queryEditor;

    }

    public _beginGetQueryText(projectGuid: string, callback: IResultCallback, errorCallback?: IErrorCallback) {
        let testPlanManager = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<TestsOM.TestPlanManager>(TestsOM.TestPlanManager);
        testPlanManager.getConvertedFilteredTestPlanQueryFromRegistry(TestsOM.TestPlanSelectionHelper.getDefaultQuery(), (queryText) => {
            this._createQueryTextHelper(queryText);
            if (callback) {
                callback(this._queryTextHelper.getQueryText());
            }
        }, errorCallback);
    }

    private _createQueryTextHelper(serverQueryString: string): void {
        if (!this._queryTextHelper) {
            this._queryTextHelper = new QueryTextHelper(serverQueryString);
        }
    }

    protected _queryEditor: TestPlansFilterEditor;
    protected _queryTextHelper: QueryTextHelper;
}

export class FilterTestPlansDialog extends SelectTestPlanDialog {

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            buttons: this._getButtons(),
            open: function () {
                $(this).siblings(".ui-dialog-buttonpane").find("button:eq(1)").focus();
            },
        }, options));
    }

    public processResult(): void {
        let provider = super._getCachedProvider();
        if (provider) {
            provider.beginGetQueryText((queryText: string) => {
                WITUtils.beginValidateQueryContainsCategory(queryText, super._getCategoryRefName(), () => {
                    this.close();
                },
                    (error) => {
                        this._updateStatus(Utils_String.format(Resources.ErrorFilteringTestPlansCategory, this._getCategoryRefName()), true);
                    });
            },
                (error) => {
                    this._updateStatus(VSS.getErrorMessage(error), true);
                });
        }
    }

    public onClose(e?: JQueryEventObject): any {
        //Check if dialog is closing through Escape key or closing through x button on top
        let provider = this._getCachedProvider();
        if (provider && e && !e.cancelable) {
            provider.beginGetQueryText((queryText: string) => {
                if (this._queryEditor) {
                    this._queryEditor.setQueryText(queryText);
                }
                super.onClose(e);
                let callback = this._options.okCallback;
                if (callback) {
                    callback(queryText);
                }
            },
                () => {
                    super.onClose(e);
                });
        } else {
            super.onClose(e);
        }
    }


    private _onResetButtonClicked(): void {
        let callback = this._options.callback;
        let project = this._getProject();
        if (!this._queryTextHelper) {
            this._queryTextHelper = new QueryTextHelper();
        }
        let defaultQuery = this._queryTextHelper.getDefaultQuery();
        this.updateQueryEditor(defaultQuery, project);
        if (callback) {
            callback();
        }
    }

    protected _getSettingKey(projectGuid: string) {
        return TestsOM.TestPlanSelectionHelper.getTestPlanSelectionSettingKey();
    }

    private _getButtons(): any {
        /// <summary>Gets the buttons of the dialog.</summary>
        this._buttons = [
            {
                id: "reset-button",
                text: Resources.Reset,
                click: Utils_Core.delegate(this, this._onResetButtonClicked)
            },
            {
                id: "ok-button",
                text: Resources.OkText,
                click: Utils_Core.delegate(this, this.processResult)
            },
            {
                id: "cancel-button",
                text: Resources.CancelText,
                click: Utils_Core.delegate(this, this.onCancelClick)
            }];
        return this._buttons;
    }
    
    private _buttons: any[];
}

VSS.tfsModuleLoaded("TFS.TestManagement.SelectWorkItemView", exports);



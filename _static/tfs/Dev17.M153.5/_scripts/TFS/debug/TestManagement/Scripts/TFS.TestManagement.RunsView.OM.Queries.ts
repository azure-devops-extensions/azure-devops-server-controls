//Auto converted from TestManagement/Scripts/TFS.TestManagement.RunsView.OM.Queries.debug.js

/// <reference types="jquery" />



import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ValueMap = require("TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap");

import Diag = require("VSS/Diag");
import Locations = require("VSS/Locations");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

let delegate = Utils_Core.delegate;
let queueRequest = VSS.queueRequest;
let TfsContext = TFS_Host_TfsContext.TfsContext;

export class QueryItem {

    public id: string;
    public name: string;
    public parent: any;
    public parentId: string;
    public queryManager: any;
    public parentHierarchy: any;

    constructor(itemData) {
        if (itemData) {
            this.id = itemData.id;
            this.name = itemData.name;
            this.parentId = itemData.parentId;
            this.queryManager = itemData.queryManager;
            this.parentHierarchy = itemData.parentHierarchy;
        }
    }

    //caller: RunExplorerView/_onSelectedRunsTreeItemChanged()
    public path(includeRoot, separator) {
        return Utils_UI.calculateTreePath.call(this, includeRoot, separator || "/", "name", "root");
    }
}

VSS.initClassPrototype(QueryItem, {
    id: null,
    name: null,
    parent: null,
    parentId: null,
    queryManager: null,
    parentHierarchy: null
});

export class QueryDefinition extends QueryItem {

    public filter: any;
    public itemType: any;
    public columns: any;

    constructor(itemData) {
        super(itemData);

        let hierarchy;

        if (itemData) {
            this.itemType = itemData.itemType;
            this.filter = itemData.filter;
            this.columns = itemData.columns;
        }
    }

    public setDisplayColumns(columns) {
        this.columns.displayColumns = columns;
    }

    public setSortColumns(sortColumns) {
        this.columns.sortColumns = sortColumns;
    }

    public getDisplayColumns() {
        return this.columns.displayColumns;
    }

    public getDisplayColumn(index) {
        return this.columns.displayColumns[index];
    }

    public getSortColumns() {
        return this.columns.sortColumns;
    }
}

VSS.initClassPrototype(QueryDefinition, {
    filter: null,
    itemType: null,
    columns: null
});

export class QueryFolder extends QueryItem {

    public children: any;
    public itemType: any;
    public columns: any;
    public filter: any;

    constructor(itemData) {
        super(itemData);
        this.children = [];

        if (itemData) {
            this.itemType = itemData.itemType;
            if (itemData.columns) {
                this.columns = itemData.columns;
            }
            if (itemData.filter) {
                this.filter = itemData.filter;
            }
        }
    }

    public add(queryItem, isNewlyCreatedItem) {
        this.children.push(queryItem);
        queryItem.parent = this;
    }

    public findByPath(path) {
        return Utils_UI.findTreeNode.call(this, path, "/", Utils_String.localeIgnoreCaseComparer, "name");
    }

    public clear() {
        this.children = [];
    }
}

VSS.initClassPrototype(QueryFolder, {
    children: null,
    itemType: null
});

export class QueryHierarchy extends QueryFolder {

    public root: boolean;
    public all: any;
    public mapIdToNode: any;
    public itemTypes: any;

    constructor(queryManager, itemTypes) {
        super({
            name: (queryManager._tfsContext || TfsContext.getDefault()).navigation.project,
            queryManager: queryManager
        });

        let that = this;

        this.itemTypes = itemTypes || [];
    }

    private load(model) {
        Diag.logVerbose("[QueryHierarchy.load] - Called");
        let that = this, all = [], id, item, parent, mapIdNode = {};

        $.each(model.queries, function (i, query) {
            let item;
            if (query.isFolder === true) {
                item = new QueryFolder(query);
            }
            else {
                item = new QueryDefinition(query);
            }

            if (item) {
                all.push({ itemId: item.id, node: item });
                mapIdNode[(item.id + "").toUpperCase()] = item;
            }
        });

        this.clear();

        //make items tree
        for (id in all) {
            item = all[id].node;
            parent = mapIdNode[("" + item.parentId).toUpperCase()];

            if (parent) {
                parent.add(item);
            }
            else {
                this.add(item, false);
            }
        }

        this.all = all;
        this.mapIdToNode = mapIdNode;
        $(window).trigger("query-hierarchy-loaded", this);
    }

    public findQueryById(id) {
        return this.mapIdToNode[(id + "").toUpperCase()];
            }

    public createDefaultTestResultTypeQuery(currentRunId, currentRunTitle) {
        //get recent result root folder query.
        let folderQuery = this.findQueryById(ValueMap.TestQueryConstants.RECENT_RESULT_ROOT_QUERY_ID);
        let query = {
                      columns: folderQuery.columns,
                      filter: folderQuery.filter, 
                      id: currentRunId,
                      itemType: ValueMap.TestQueryableItemTypes.TestResult,
                      name: Utils_String.format(Resources.RunFormat, currentRunId, currentRunTitle),
                      parentId: null
                    }; 
        return new QueryDefinition(query);
    }

    public beginRefresh(recentRunsQuery: any[], callback, errorCallback?) {
        Diag.logVerbose("[QueryHierarchy.beginRefresh] - Called");
        this._getQueryHierarchyModel(hierarchyModel => {
            if (recentRunsQuery != null) {
                for (let i = 0; i < recentRunsQuery.length; i++) {
                    hierarchyModel.queries.push(recentRunsQuery[i]);
                }
            }
            if (this.itemTypes.some(item => item === ValueMap.TestQueryableItemTypes.ExploratorySession)){
                hierarchyModel.queries.push(this.createDefaultTestSessionTypeQuery());
            }
            this.load(hierarchyModel);
            $(window).trigger("query-hierarchy-refreshed", this);
            if ($.isFunction(callback)) {
                callback.call(this);
            }
        }, errorCallback);
    }

    private _getQueryHierarchyModel(callback, errorCallback?) {
        this.queryManager._getQueryHierarchyModel(this.itemTypes, callback, errorCallback);
    }

    private createDefaultTestSessionTypeQuery() {
        let query = {
            id: ValueMap.TestQueryConstants.EXPLORATORY_SESSIONS_QUERY_ID,
            itemType: ValueMap.TestQueryableItemTypes.ExploratorySession,
            name: Resources.RecentSessions,
            parentId: null
        };
        return new QueryDefinition(query);
    }
}

VSS.initClassPrototype(QueryHierarchy, {
    root: true,
    all: null,
    itemTypes: null
});

export class QueryManager extends Service.VssService {

    public static getPostJsonStringForQueries(queries) {

        let queryStrings = [];

        $.each(queries, function (i, query) {
            let queryForPost = {
                id: query.id,
                name: query.name,
                itemType: query.itemType,
                isFolder: query instanceof QueryFolder,
                parentId: query.parentId,
                filter: query.filter,
                columns: query.columns
            };
            queryStrings.push(Utils_Core.stringifyMSJSON(queryForPost));
        });
        return queryStrings;
    }

    private _hierarchies: any;
    private _queryFields: any;
    private _queryFieldNames: any;

    constructor() {
        super();
        this._hierarchies = {};
        this._queryFields = {};
        this._queryFieldNames = {};
    }

    public getApiLocation(action) {
        return Locations.urlHelper.getMvcUrl({
            webContext: this.getWebContext(),
            action: action || "",
            controller: "TestQueries",
            area: "api"
        });
    }

    // Caller: RunExplorerView/_ensureQueryHierarchy()
    public getQueryHierarchy(itemTypes, context, callback, errorCallback?) {
        let hierarchy, key = itemTypes.sort().join("_");
        queueRequest(this, this._hierarchies, key, callback, errorCallback, function (succeeded, failed) {
            hierarchy = new QueryHierarchy(this, itemTypes);
            hierarchy.beginRefresh(context, function () {
                succeeded(hierarchy);
            }, errorCallback);
        });
    }

    public getQueryableFieldNames(queryType, callback, errorCallback?) {
        queueRequest(this, this._queryFieldNames, queryType, callback, errorCallback,
            function (succeeded, failed) {
                this._ajaxJson("GetQueryableFieldNames", { queryType: queryType }, function (names) {
                    succeeded(names);
                }, failed);
            }
            );
    }

    public getQueryField(queryType, fieldName, callback, errorCallback?) {
        if (!this._queryFields[queryType]) {
            this._queryFields[queryType] = {};
        }
        queueRequest(this, this._queryFields[queryType], fieldName, callback, errorCallback,
            function (succeeded, failed) {
                this._ajaxJson("GetQueryField", { queryType: queryType, fieldName: fieldName }, function (result) {
                    succeeded(result.field);
                }, failed);
            }
            );
    }

    public executeQuery(query, options?, callback?, errorCallback?) {
        this._ajaxPost("ExecuteQuery", $.extend(options, { queryJson: QueryManager.getPostJsonStringForQueries([query])[0] }), callback, errorCallback);
    }

    private _getQueryHierarchyModel(itemTypes, callback, errorCallback?) {
        this._ajaxJson("GetQueryHierarchy", { itemTypes: itemTypes }, callback, errorCallback);
    }

    public getQueryData(queryType, itemIds, displayColumns, callback, errorCallback?) {
        this._ajaxPost("GetQueryData", { queryType: queryType, itemIds: itemIds, displayColumns: Utils_Core.stringifyMSJSON(displayColumns) }, callback, errorCallback);
    }

    private _ajaxJson(method, requestParams, callback, errorCallback?) {
        Ajax.getMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback);
    }

    private _ajaxPost(method, requestParams, callback, errorCallback?) {
        Ajax.postMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback);
    }
}

VSS.initClassPrototype(QueryManager, {
    _hierarchies: null,
    _queryFields: null,
    _queryFieldNames: null
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.RunsView.OM.Queries", exports);

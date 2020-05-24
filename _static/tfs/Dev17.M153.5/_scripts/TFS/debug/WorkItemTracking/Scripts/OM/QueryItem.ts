import { Project } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import TFS_Wit_Contracts = require("TFS/WorkItemTracking/Contracts");
import Utils_UI = require("VSS/Utils/UI");
import { getDirectoryName } from "VSS/Utils/File";
import WITWebApi = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.WebApi");

// Aligns to server data from ToJson of Microsoft.TeamFoundation.Server.WebAccess.WorkItemTracking.QueryItem
// ~\WebAccess\workitemtracking\Serializers\JsonExtensions.cs
export namespace QueryItemFactory {
    /**
     * Converts a QueryItem to an object that satisfies the QueryHierarchyItem interface (a REST contract)
     * Used for delivering a REST-compatible object to a VSTS extension's callback.
     * @param item QueryItem
     * @return QueryHierarchyItem
     */
    export function queryItemToQueryHierarchyItem(item: QueryItem | QueryDefinition): TFS_Wit_Contracts.QueryHierarchyItem {
        const wiql: string = (<QueryDefinition>item).queryText || undefined;
        const hierarchyItem = <TFS_Wit_Contracts.QueryHierarchyItem>{
            id: item.id,
            name: item.name,
            isPublic: !item.personal,
            wiql: wiql,
            path: item.storedPath
        };
        return hierarchyItem;
    }
}

export class QueryItem {
    public static EVENT_CREATED = "query-item-created";
    public static EVENT_MOVED = "query-item-moved";
    public static EVENT_RENAMED = "query-item-renamed";
    public static EVENT_REMOVED = "query-item-removed";
    public static EVENT_SAVED = "query-item-saved";
    public static DEFAULT_PATH_SEPARATOR = "/";

    public storedPath: string;
    public parentPath: string;
    public id: string;
    public newQueryId: string;
    public name: string;
    public parent: QueryItem;
    public parentId: string;
    public personal: boolean;
    public project: Project;
    public isDirty: boolean;
    public sortModifier: number;
    public sortPrefix: number;
    public queryType: string;
    public lastSaveFailure: TfsError;
    public isInvalidSyntax?: boolean;

    constructor(project: Project, itemData: WITWebApi.IQueryHierarchyItem | TFS_Wit_Contracts.QueryHierarchyItem) {
        this.project = project;

        if (itemData) {
            this.updateFromData(itemData);
        }
    }

    public updateFromData(itemData: WITWebApi.IQueryHierarchyItem | TFS_Wit_Contracts.QueryHierarchyItem) {
        this.id = itemData.id;
        this.name = itemData.name;
        this.storedPath = itemData.path;
        this.parentPath = getDirectoryName(itemData.path);
        this.personal = !itemData.isPublic;

        if ($.isNumeric(itemData.queryType)) {
            this.queryType = TFS_Wit_Contracts.QueryType[itemData.queryType];
        } else {
            this.queryType = <string>itemData.queryType;
        }
    }

    public path(includeRoot: boolean = false, separator?: string) {
        /// <summary>Calculates a path from the root of the query hierarchy and returns it</summary>
        /// <param name="includeRoot" type="boolean" optional="true">If true name of root will be included in path</param>
        /// <param name="separator" type="boolean" optional="true">Separator to separate path segments</param>

        return Utils_UI.calculateTreePath.call(this, includeRoot, separator || QueryItem.DEFAULT_PATH_SEPARATOR, "name", "root");
    }
}

export class QueryDefinition extends QueryItem {

    public static DEFAULT_NEW_QUERY_WIQL: string = "SELECT [System.Id], [System.WorkItemType], [System.Title], [System.AssignedTo], [System.State], [System.Tags] FROM Workitems WHERE [System.TeamProject] = @project AND [System.WorkItemType]<>'' AND [System.State]<>''";
    public static ASSIGNED_TO_ME_ID: string = "A2108D31-086C-4FB0-AFDA-097E4CC46DF4";
    public static FOLLOWED_WORKITEMS_ID: string = "202230E0-821E-401D-96D1-24A7202330D0";
    public static SEARCH_RESULTS_ID: string = "2CBF5136-1AE5-4948-B59A-36F526D9AC73";
    public static CUSTOM_WIQL_QUERY_ID: string = "08E20883-D56C-4461-88EB-CE77C0C7936D";
    public static RECYCLE_BIN_QUERY_ID: string = "2650C586-0DE4-4156-BA0E-14BCFB664CCA";
    private _originalQueryText: string;
    public queryText: string;
    public specialQuery: boolean;
    public customQuery: boolean;
    public tempQueryId: string;

    public static defaultNewQueryWiql() {
        return QueryDefinition.DEFAULT_NEW_QUERY_WIQL;
    }

    public static isMyWorkItems(query: QueryDefinition): boolean {
        if (!query.id) {
            return false;
        }

        return query.id.toUpperCase() === QueryDefinition.ASSIGNED_TO_ME_ID;
    }

    public static isSearchResults(query: QueryDefinition): boolean {
        if (!query.id) {
            return false;
        }

        return query.id.toUpperCase() === QueryDefinition.SEARCH_RESULTS_ID;
    }

    public static isCustomWiqlQuery(query: QueryDefinition): boolean {
        if (!query.id) {
            return false;
        }

        return query.id.toUpperCase() === QueryDefinition.CUSTOM_WIQL_QUERY_ID;
    }

    /**
     * checks if the given query is a recycle bin query
     *
     * @param query query item to check
     * @return true if it's a recycle bin query. returns false otherwise
     */
    public static isRecycleBinQuery(query: QueryItem): boolean {
        if (!query.id) {
            return false;
        }

        // query.id can be null in case of temp queries (for eg. in Work item finder dialog)
        return query.id && query.id.toUpperCase() === QueryDefinition.RECYCLE_BIN_QUERY_ID;
    }

    public static isCustomizableSpecialQuery(query: QueryDefinition): boolean {
        /// <summary>Returns a value indicating whether the query can be customized, i.e., column options be changed
        /// or clauses modified.</summary>

        return query.specialQuery && (QueryDefinition.isMyWorkItems(query) ||
            QueryDefinition.isRecycleBinQuery(query));
    }

    public static isSpecialQueryId(id: string): boolean {
        /// <summary>Determine whether the given id refers to a special query</summary>
        /// <param name="id" type="string">Id to check</param>

        const upperId = id.toUpperCase();

        return (upperId === QueryDefinition.ASSIGNED_TO_ME_ID
            || upperId === QueryDefinition.SEARCH_RESULTS_ID
            || upperId === QueryDefinition.CUSTOM_WIQL_QUERY_ID
            || upperId === QueryDefinition.FOLLOWED_WORKITEMS_ID
            || upperId === QueryDefinition.RECYCLE_BIN_QUERY_ID);
    }

    constructor(project: Project, itemData?: WITWebApi.IQueryHierarchyItem | TFS_Wit_Contracts.QueryHierarchyItem) {
        super(project, itemData);

        if (itemData) {
            this.queryText = itemData.wiql || (<any>itemData).query;
        }
    }

    public setQuery(wiql: string) {
        if (this.queryText !== wiql) {
            this._originalQueryText = this.queryText;
            this.queryText = wiql;
            this.isDirty = true;
        }
    }

    public path(includeRoot: boolean = false, separator?: string) {
        /// <summary>Calculates a path from the root of the query hierarchy and returns it</summary>
        /// <param name="includeRoot" type="boolean" optional="true">If true name of root will be included in path</param>
        /// <param name="separator" type="boolean" optional="true">Separator to separate path segments</param>

        if (this.parent) {
            return super.path(includeRoot, separator);
        } else {
            return this.storedPath;
        }
    }
}
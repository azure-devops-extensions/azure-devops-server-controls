import * as AdminSendMail_Async from "Admin/Scripts/TFS.Admin.SendMail";
import { ArtifactFilter, NotificationSubscription, SubscriptionQuery, SubscriptionQueryCondition } from "Notifications/Contracts";
import * as NotificationsRestClient from "Notifications/RestClient";
import { ArtifactSubscription, FollowsService } from "Notifications/Services";
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import { WorkItemStateCellRenderer } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateCellRenderer";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as Q from "q";
import * as TFS_Wit_Contracts from "TFS/WorkItemTracking/Contracts";
import { QueryType } from "TFS/WorkItemTracking/Contracts";
import * as WitUIContracts from "TFS/WorkItemTracking/UIContracts";
import * as TfsCommon_Shortcuts from "TfsCommon/Scripts/KeyboardShortcuts";
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";
import * as Artifacts_Constants from "VSS/Artifacts/Constants";
import * as Controls from "VSS/Controls";
import * as Dialogs from "VSS/Controls/Dialogs";
import * as Grids from "VSS/Controls/Grids";
import * as Menus from "VSS/Controls/Menus";
import * as Navigation from "VSS/Controls/Navigation";
import * as Notifications from "VSS/Controls/Notifications";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import * as Diag from "VSS/Diag";
import * as VSSError from "VSS/Error";
import * as Events_Services from "VSS/Events/Services";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { EDisplayControlType, EntityFactory, IdentityDisplayControl, IdentityPickerControlSize, IIdentityDisplayOptions } from "VSS/Identities/Picker/Controls";
import "VSS/LoaderPlugins/Css!Controls/Query/QueryResultGrid";
import * as Performance from "VSS/Performance";
import * as VSS_Resources_Common from "VSS/Resources/VSS.Resources.Common";
import * as Service from "VSS/Service";
import * as Telemetry from "VSS/Telemetry/Services";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Clipboard from "VSS/Utils/Clipboard";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_Date from "VSS/Utils/Date";
import { HtmlNormalizer } from "VSS/Utils/Html";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";
import * as VSS from "VSS/VSS";
import { LoadingSpinnerOverlay } from "WorkItemTracking/Scripts/Controls/WorkItemForm/LoadingSpinnerOverlay";
import * as WorkItemsNavigator from "WorkItemTracking/Scripts/Controls/WorkItemsNavigator";
import { QueryResultsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import * as CIConstants from "WorkItemTracking/Scripts/CustomerIntelligence";
import * as CustomerIntelligenceConstants from "WorkItemTracking/Scripts/CustomerIntelligence";
import * as EmailWorkItemsModel_Async from "WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems";
import { FilterManager, IFilterDataSource } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import * as DeleteMenuItemHelper from "WorkItemTracking/Scripts/MenuItems/DeleteMenuItemCommonHelper";
import { QueryAdapter } from "WorkItemTracking/Scripts/OM/QueryAdapter";
import { LinkQueryMode } from "WorkItemTracking/Scripts/OM/QueryConstants";
import { QueryDefinition, QueryItemFactory } from "WorkItemTracking/Scripts/OM/QueryItem";
import { IClause, IColumnOptionsPanelDisplayColumn, IColumnOptionsPanelSortColumn, IColumnOptionsResult, IEditInfo, IFilter, IQueryDisplayColumn, IQueryParamsExtras, IQueryResult, IQueryResultPayload, IQueryResultsTreeData, IQuerySortColumn } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { WiqlOperators } from "WorkItemTracking/Scripts/OM/WiqlOperators";
import { Exceptions, PageSizes, WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { renderZeroDataQueryResult, unmountZeroDataComponent } from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/TriageHubZeroDataUtils";
import { IQueryCommandContributionContext } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { RecycleBinTelemetryConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as WITCommonResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.Common";
import * as TestWorkItemDeleteDialog_Async from "WorkItemTracking/Scripts/TestWorkItemDelete/TFS.TestWorkItemDelete.Dialog";
import * as TFS_UI_Tags from "WorkItemTracking/Scripts/TFS.UI.Tags";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as WorkItemTrackingControlsAccessories from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.Accessories";
import * as WITControlsBulkEdit_Async from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit";
import * as WITControlsRecycleBinDialogShim from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin.DialogShim";
import { QueryResultsGridEvents } from "WorkItemTracking/Scripts/Utils/Events";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";
import { TempQueryUtils } from "WorkItemTracking/Scripts/Utils/TempQueryUtils";
import { useWITDialogs } from "WorkItemTracking/Scripts/Utils/UseWitDialog";
import { isBulkUnfollowEnabled, isVisualizeFollowsEnabled } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { WorkItemActions } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";
import { WorkItemHtmlTableFormatter } from "WorkItemTracking/Scripts/Utils/WorkItemHtmlTableFormatter";
import { WorkItemPermissionDataHelper } from "WorkItemTracking/Scripts/Utils/WorkItemPermissionDataHelper";
import { WorkItemViewActions } from "WorkItemTracking/Scripts/Utils/WorkItemViewActions";
import { CommandEventArgs } from "VSS/Events/Handlers";

const handleError = VSS.handleError;
const getErrorMessage = VSS.getErrorMessage;
const TfsContext = TFS_Host_TfsContext.TfsContext;
const delegate = Utils_Core.delegate;
const domElem = Utils_UI.domElem;
const eventSvc = Events_Services.getService();

export interface IWorkItemPageData {
    pageData: any[];
    pageColumns: string[];
}


export interface IQueryResultGridContextMenuArguments {
    /** Current TFS context */
    tfsContext: TFS_Host_TfsContext.TfsContext;

    /** Selected work item id */
    id: number;

    /** Array of selected work item ids */
    selectedWorkItems: number[];

    /** Dictionary of projects to work item types that the selected work items are in. 
     * This comes with a caveat that the availability depends on the page data.
     * If all work items are paged in, this will be available, else, this will be an empty array. 
     */
    selectedWorkItemProjectTypeMapping?: IDictionaryStringTo<string[]>;
}

export interface IProcessedQueryResultsGridTreeData extends IQueryResultsTreeData {
    parentToChildWorkItemIds: IDictionaryNumberTo<number[]>;
}

export interface ISortField {
    name: string;
    asc: boolean;
    fieldIndex?: number;
    comparer(value1: any, value2: any): number;
}

export interface IBulkWorkItemUpdateError {
    name: string,
    results: {
        error?: Error
        workItem: { id: number }
    }[];
}

export interface IQueryResultWithOptions extends IQueryResult {
    keepSelection?: boolean;
    allowSort?: boolean;
}

/**
 * If the error contains a bulk error exception generate the message html.
 * @param error
 * @param dirtyWorkItemCount
 */
export function getBulkSaveErrorMessageHtml(error: IBulkWorkItemUpdateError, dirtyWorkItemCount: number): JQuery {
    if (error && error.name === Exceptions.WorkItemBulkSaveException) {
        let errorHeader, errorBody = $("<div/>");
        $.each(error.results, function (i, result) {
            if (result.error) {
                errorBody.append($("<div/>").append(
                    $("<div/>").text(Utils_String.format(Resources.TriageViewWorkItemSaveError, result.workItem.id))
                ).append(
                    $("<div/>").text(getErrorMessage(result.error))
                ));
            }
        });

        if (errorBody.children().length > 0) {
            if (dirtyWorkItemCount === errorBody.children().length) {
                errorHeader = $("<div/>").append(
                    $("<div/>").text(Utils_String.format(Resources.FailedToSaveNWorkItems, errorBody.children().length))
                ).append($("<br>"));
            }
            else {
                const successfullySaved = dirtyWorkItemCount - errorBody.children().length;
                errorHeader = $("<div/>").append(
                    $("<div/>").text(Utils_String.format(Resources.SucessfullySavedNWisButFailedToSave, successfullySaved, errorBody.children().length))
                ).append(
                    $("<br>")
                ).append(
                    $("<div/>").text(Resources.FollowingWisCouldNotBeSaved)
                ).append($("<br>"));
            }

            errorBody.append($("<br>")).append($("<div/>").text(Resources.CorrectWisAndTryAgain));
            return $("<div/>").append(errorHeader).append(errorBody);
        }
    }
    return null;
}

export class QueryResultGrid extends Grids.GridO<any> implements IFilterDataSource {
    private _loadingOverlay: LoadingSpinnerOverlay;
    private _isShowingExpandCollapseColumns: boolean = false;

    public static COPY_QUERY_URL_DAYS_TO_EXPIRE = 90;
    public static MAX_WORKITEMS_LOCALSORT = 400;
    public static CHANGE_WORK_ITEM_TYPE_ID = "change-work-item-type";

    public static enhancementTypeName: string = "tfs.wit.queryresultgrid";
    private static _gridMessageClass = "grid-message-area";
    private static _gridHasMessageFlag = "has-grid-message-area";
    private static _showAllItemsLink = "showAllItemsLinkId";
    private static _showFilteredItemsLink = "showFilteredItemsLinkId";
    private static _copyQueryUrlExpirationMessage = "<br><br><b>" + Utils_String.format(Resources.CopyQueryURLExpirationMessage, QueryResultGrid.COPY_QUERY_URL_DAYS_TO_EXPIRE) + "</b>";
    private static LOCAL_SORT_FEATURE = "WebAccess.WIT.QueryResults.LocalSort";
    private static DATASOURCE_NAME = "QueryResultGrid";

    public static COMMAND_ID_EMAIL_QUERY_RESULT: string = "email-query-result";
    public static COMMAND_ID_EMAIL_SELECTION: string = "email-selection";
    public static COMMAND_ID_RESTORE: string = "restore-work-item";
    public static COMMAND_ID_DESTROY: string = "destroy-work-item";
    public static COMMAND_ID_UNFOLLOW: string = "unfollow-work-item";
    private static FILTER_PAGE_SIZE: number = 1000;
    public static readonly EXPAND_COLUMN_NAME = "expand-column";
    public static readonly COLLAPSE_COLUMN_NAME = "collapse-column";

    public static calculateExpandStates(sourceArray: number[], targetArray: number[], stateArray: number[], sourceId: number, index: number, count: number, isRowCollapsed?: (id: number) => boolean) {
        /// <summary>Calculates the expand states based on the source and target array.</summary>
        /// <param name="sourceAray" type="number[]">Array of parent ids</param>
        /// <param name="targetArray" type="number[]">Array of target ids</param>
        /// <param name="stateArray" type="number[]">Array of expand states.</param>
        /// <param name="sourceId" type="number">Used in recursive calls to this method.</param>
        /// <param name="index" type="number">Used in recursive calls to this method.</param>
        /// <param name="count" type="number">Count of items to process.</param>
        /// <param name="isRowCollapsed" type="Function">Helper to determine if a row is collapsed.</param>

        let result = 0;
        let prevTgt = 0;
        let rootCount = 0;
        let src;
        let tgt;
        let childCount;
        while (index < count) {
            stateArray[index] = 0;

            src = sourceArray[index];
            tgt = targetArray[index];

            if (src === sourceId) {
                result++;
                index++;
                rootCount++;
            }
            else if (src === prevTgt) {
                childCount = QueryResultGrid.calculateExpandStates(sourceArray, targetArray, stateArray, prevTgt, index, count, isRowCollapsed);
                stateArray[index - 1] = ((isRowCollapsed && isRowCollapsed(src)) ? -1 : 1) * childCount.total;
                result += childCount.total;
                index += childCount.total;
            }
            else {
                break;
            }

            prevTgt = tgt;
        }

        return { total: result, root: rootCount };
    }

    // Show notification dialog for IE.
    private static showCopyQueryUrlNotificationDialog(isExpired: boolean) {
        Dialogs.show(Dialogs.CopyContentDialog,
            {
                dialogLabel: Resources.CopyQueryURLNotifyMessage,
                dialogLabelExtend: isExpired ? QueryResultGrid._copyQueryUrlExpirationMessage : null,
                excludeTextPanel: true,
                width: 400,
                height: 200
            });
    }

    public static copyQueryUrl(tfsContext: TFS_Host_TfsContext.TfsContext, tempQueryId: string): void {
        const url = tfsContext.getPublicActionUrl("", "queries", { tempQueryId: tempQueryId } as TFS_Host_TfsContext.IRouteData);
        Utils_Clipboard.copyToClipboard(url, {
            copyDialogOptions: {
                dialogLabelExtend: QueryResultGrid._copyQueryUrlExpirationMessage
            },
            showCopyDialog: (<any>window).clipboardData === undefined
        });
        if ((<any>window).clipboardData !== undefined) {
            QueryResultGrid.showCopyQueryUrlNotificationDialog(true);
        }
    }

    private _projectName: string;
    private _linkTypesFetched: boolean;
    private _fetchingLinkTypes: boolean;
    private _saving: boolean;
    private _lastVisibleRange: any;
    private _workItemsInLastVisibleRange: { [index: number]: [{ rowIndex: number; dataIndex: number; }] };
    private _workItemsProvider: QueryResultsProvider;
    private _workItemsProviderVersion: number;
    private _workItemsNavigator: WorkItemsNavigator.WorkItemsNavigator;
    private _navigateNextDelegate: Function;
    private _navigatePreviousDelegate: Function;
    private _refreshDelegate: Function;
    private _workItemChangedDelegate: Function;
    private _enableCopyQueryCommand: boolean = true;
    private _filterApplied: boolean;
    private _filterManager: FilterManager;
    private _unfilteredWorkItems: number[]; // array holding unfiltered workitem ids.
    private _unfilteredExpandStates: number[];
    private _unfilteredIsLinkQuery: boolean;
    private _unfilteredIsTreeQuery: boolean;
    private _emptyQueryResults: boolean;
    private _managedWorkItems: { [id: string]: boolean };
    private _pendingManaged: { [id: string]: boolean };
    private _dirtyWorkItems: { [id: string]: boolean };
    private _validWorkItems: { [id: string]: boolean };
    private _parentWorkItemIds: number[]; // array of parents work item ids.
    protected _workItems: number[]; // array of active workitem ids.
    private _workItemsNeeded: number[];
    private _workItemsFailedToFetch: number[]; // work items failed to read in pageWorkItems possibly due to deletion or permission issue
    private _links: number[]; // array of link ids.
    protected _displayColumns: IQueryDisplayColumn[];
    protected _displayColumnsMap: { [columnFieldName: string]: number };
    private _sortColumns: IQuerySortColumn[];
    private _rootCount: number;
    private _allowSort: boolean;
    private _pageColumns: string[];
    private _pageColumnMap: IDictionaryStringTo<number>;
    private _pageData: IDictionaryStringTo<any[]>;
    private _store: WITOM.WorkItemStore;
    private _fetching: boolean;
    private _isLinkQuery: boolean;
    private _isTreeQuery: boolean;
    private _messageArea: Notifications.MessageAreaControl;
    private _textFilterMessageArea: Notifications.MessageAreaControl;
    private _tabBehaviorDelegate: (e?: JQueryEventObject) => boolean;
    private _hasMoreResults: boolean;
    private _queriesHubContext: IQueriesHubContext;
    private _workItemTypeIconCells: JQuery[] = []; // Arrary of cells has react component children. They need to be unmounted expcitly.
    private _allowSingleClickOpen: boolean;
    private _allowInteractionWithTitle: boolean;
    private _zeroDataElement: JQuery;
    private _zeroDataComponentMounted: boolean;
    private _isNewQueryInZeroDataComponent: boolean;
    private _useZeroDataView: boolean;
    private _initialSelectedWorkItemId: number;
    private _previousProviderId: string;

    /** Function being called by the StatusIndicator */
    public queryResultsStarting: Function;

    /** Function being called by the StatusIndicator */
    public queryResultsComplete: Function;

    /** Optional callback to call before opening work items. Allows callers to setup dependencies, for example */
    private _beforeOpenWorkItemCallback: () => IPromise<void>;

    constructor(options?) {
        super(options);

        this._refreshDelegate = delegate(this, this.refresh);
        this._workItemChangedDelegate = delegate(this, this.workItemChanged);
        this._navigateNextDelegate = delegate(this, this._onNavigateNext);
        this._navigatePreviousDelegate = delegate(this, this._onNavigatePrevious);

        this._workItemsNeeded = [];
        this._workItemsFailedToFetch = [];
        this._links = [];
        this._displayColumns = [];
        this._displayColumnsMap = {};
        this._sortColumns = [];
        this._rootCount = 0;
        this._pageColumns = [];
        this._pageColumnMap = {};
        this._pageData = {};
        this._workItems = [];
        this._sortColumns = [];
        this._parentWorkItemIds = [];
        this._workItemsInLastVisibleRange = {};
        this._managedWorkItems = {};
        this._pendingManaged = null;
        this._dirtyWorkItems = {};
        this._validWorkItems = {};

        this._createFilterManager();

        Navigation.FullScreenHelper.attachFullScreenCI(this._fullScreenCIDelegate);
    }

    public dispose() {
        super.dispose();
        this._queriesHubContext = null;
        this._dirtyWorkItems = null;
        this._validWorkItems = null;
    }

    public getStore(): WITOM.WorkItemStore {
        return this._store;
    }

    public getSortColumns(): IQuerySortColumn[] {
        return this._sortColumns;
    }

    /**
     * Retrieves all of the data paged in to the results grid from the server, indexed by work item id.
     */
    public getPageData(): IDictionaryNumberTo<any[]> {
        return this._pageData;
    }

    /**
     * Gets a mapping from reference name to an index into the page data.
     */
    public getColumnMap(): IDictionaryStringTo<number> {
        return this._pageColumnMap;
    }

    /**
     * Gets a mapping from reference name to an index into the page data for visible columns only.
     */
    public getVisibleColumnMap(): IDictionaryStringTo<number> {
        // _displayColumn map does not map to column index in the page data, it's just the index in the grid
        // so we translate the keys of the display column map and use the indexes from the page column map.
        const displayColumnMap: IDictionaryStringTo<number> = {};

        for (const columnName in this._displayColumnsMap) {
            displayColumnMap[columnName] = this._pageColumnMap[columnName];
        }

        return displayColumnMap;
    }

    /**
     * Get list of visible reference field names
     */
    public getVisibleColumns(): string[] {
        return this._displayColumns.map(c => c.name);
    }

    /**
     * Used for filter telemetry, overriden by clients of the grid so we can distinguish who is using it
     */
    public getDataSourceName() {
        return QueryResultGrid.DATASOURCE_NAME;
    }

    /**
     * Retrieve the total number of items, including items that are not yet paged.
     */
    public getItemCount(): number {
        return this.getUnfilteredWorkItemIds().length;
    }

    /**
     * Gets the data for a single work item.
     * @param id workItemId of the work item to retrieve data for.
     */
    public getValue(id: number, fieldName: string): any {
        const pageData = this._pageData[id];
        const pageColumnIndex = this._pageColumnMap[fieldName];
        if (pageColumnIndex >= 0) {
            return pageData[pageColumnIndex];
        }

        return null;
    }

    public getUniqueValues(fieldName: string): string[] | IPromise<string[]> {
        const pageColumnIndex = this._pageColumnMap[fieldName];
        const isTagsField = fieldName === WITConstants.CoreFieldRefNames.Tags;

        const values: IDictionaryStringTo<boolean> = {};

        if (pageColumnIndex >= 0) {
            for (const idx of Object.keys(this._pageData)) {
                const value = this._pageData[idx][pageColumnIndex];
                if (value) {
                    if (isTagsField) {
                        const tags = TagUtils.splitAndTrimTags(value);
                        for (const tag of tags) {
                            values[tag] = true;
                        }
                    } else {
                        values[value] = true;
                    }
                }
            }
        }

        return Utils_Array.uniqueSort(Object.keys(values), Utils_String.localeIgnoreCaseComparer);
    }

    /**
     * Retrieves the set of work item ids that have been paged in.  This does NOT include
     * work item ids for work items that are part of the query results but have not been paged.
     */
    public getIds(): number[] {
        const ids: number[] = [];
        const keys = Object.keys(this._pageData);

        keys.forEach((idStr: string) => {
            ids.push(+idStr);
        });

        return ids;
    }

    /**
     * Gets the set of columns to page
     */
    public getPageColumns(): string[] {
        return this._pageColumns;
    }

    /**
     * Gets the query provider for the grid
     */
    public getProvider(): QueryResultsProvider {
        return this._workItemsProvider;
    }

    /**
     * Gets setting whether initial selection is enabled
     */
    public getInitialSelectionSetting(): boolean {
        return this._options.initialSelection;
    }

    /**
     * Sets whether initial selection is enabled
     *
     * @param initialSelection
     */
    public setInitialSelectionSetting(initialSelection?: boolean): void {
        this._options.initialSelection = initialSelection;
    }

    /**
     * Sets the initial selected index.    
     */
    public selectInitialRow() {
        if (this._initialSelectedWorkItemId != null && this._initialSelectedWorkItemId > 0 && Array.isArray(this._workItems)) {
            this.setSelectedWorkItemId(this._initialSelectedWorkItemId);

            //reset initial selection so that next redraw of grid doesnt set this index as selected again
            this._initialSelectedWorkItemId = null;
        }
        else {
            super.selectInitialRow();
        }
    }

    /**
     * Sets initial work item id to be selected in the grid
     *
     * @param workItemId
     */
    public setInitialSelectedWorkItemId(workItemId: number) {
        this._initialSelectedWorkItemId = workItemId;
    }

    /**
     * Sets callback the will be called before opening any work item.
     * Work item will be opened once returned promise resolves
     * @param callback Calllback to return promise
     */
    public setBeforeOpenWorkItemCallback(callback?: () => IPromise<void>): void {
        this._beforeOpenWorkItemCallback = callback;
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        this._queriesHubContext = options.queriesHubContext;
        this._useZeroDataView = options.useZeroDataView;

        const showContextMenu = options.showContextMenu !== false;
        let contextMenuOptions;

        // Define 'getActionArgs' helper to be executed in the context of a menuItem
        const that = this;
        function getActionArgs() {
            return that._onGetMenuItemActionArguments(this);
        }

        if (showContextMenu) {
            const contextMenuItems: Menus.IMenuItemSpec[] = [
                { rank: 20, id: "use-as-a-template", text: Resources.UseWorkItemAsATemplate, title: "", "arguments": getActionArgs, groupId: "create" },
                { rank: 30, id: "create-copy", text: Resources.CreateCopyOfWorkItem, title: "", icon: "bowtie-icon bowtie-edit-copy", "arguments": getActionArgs, groupId: "create" },
                { rank: 62, id: "copy-selection-html", text: Resources.CopySelectedWorkItemsAsHtml, title: "", icon: "bowtie-icon bowtie-copy-to-clipboard", "arguments": getActionArgs, groupId: "export" }];

            const processInheritanceEnabled = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebaccessProcessHierarchy);
            const isChangeWorkItemTypeEnabled = processInheritanceEnabled || FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WorkItemTrackingChangeWorkItemType);
            const isMoveWorkItemEnabled = processInheritanceEnabled || FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WorkItemTrackingMove);
            const isBulkUnfollowsEnabled = isBulkUnfollowEnabled(options.tfsContext);

            if (!options.readOnlyMode) {
                contextMenuItems.push({ rank: 10, id: "bulk-edit-workitems", text: Resources.BulkEditSelectedWorkItems, title: "", icon: "bowtie-icon bowtie-edit-outline", groupId: "modify" });

                if (isChangeWorkItemTypeEnabled) {
                    contextMenuItems.push({ rank: 11, id: QueryResultGrid.CHANGE_WORK_ITEM_TYPE_ID, text: Resources.ChangeType, icon: "bowtie-icon bowtie-switch", "arguments": getActionArgs, groupId: "modify" });
                }

                if (isMoveWorkItemEnabled) {
                    contextMenuItems.push({ rank: 12, id: "move-work-items", text: Resources.MoveWorkItemTitle, title: "", icon: "bowtie-icon bowtie-work-item-move", "arguments": getActionArgs, groupId: "modify" });
                }

                if (isBulkUnfollowsEnabled) {
                    contextMenuItems.push({ rank: 13, id: QueryResultGrid.COMMAND_ID_UNFOLLOW, text: Resources.BulkUnfollowWorkItems, title: "", icon: "bowtie-icon bowtie-watch-eye-off", "arguments": getActionArgs, groupId: "modify" });
                }

                if (options.tfsContext.standardAccessMode === true) {
                    contextMenuItems.push({ rank: 40, id: "link-to-new", text: Resources.LinkSelectedItemsToNewWorkItem, title: "", icon: "bowtie-icon bowtie-work-item", "arguments": getActionArgs, groupId: "link" });
                    contextMenuItems.push({ rank: 50, id: "link-to-existing", text: Resources.LinkToExistingItem, title: "", icon: "bowtie-icon bowtie-link", "arguments": getActionArgs, groupId: "link" });
                }
            }

            contextMenuItems.push({ rank: 71, id: QueryResultGrid.COMMAND_ID_EMAIL_SELECTION, text: Resources.EmailSelectedWorkItems, title: "", icon: "bowtie-icon bowtie-mail-message", "arguments": getActionArgs, groupId: "export" });

            contextMenuOptions = {
                executeAction: delegate(this, this.executeCommand),
                updateCommandStates: delegate(this, this._updateCommandStates),
                "arguments": delegate(this, this._getDefaultActionArguments),
                items: contextMenuItems,
                contributionIds: ["ms.vss-work-web.query-result-work-item-menu", "ms.vss-work-web.work-item-context-menu"],
                getContributionContext: this._getContributionContextFunc().bind(this),
                suppressInitContributions: true,
            };
        }

        super.initializeOptions($.extend({
            gutter: {
                contextMenu: showContextMenu
            },
            autoSort: false, // Disable the grid sorting capabilities, query results are sorted by the server 
            sourceArea: RecycleBinTelemetryConstants.UNKNOWN,
            contextMenu: contextMenuOptions
        }, options));
    }

    private _getContributionContextFunc() {
        return (): WitUIContracts.QueryResultWorkItemContext => {
            const selectedIndices = this.getSelectedDataIndices();
            let hideDelete = false;
            // Only top 200 items will be paged at the beginning, so passing ids specifically, alongwith the rows
            const ids = selectedIndices.map(selectedWorkItemId => this.getWorkItemIdAtDataIndex(selectedWorkItemId));

            // If *any* workItems is newly created, disable the delete command from context menu
            if (ids.some((id) => +id < 1)) {
                hideDelete = true;
            }
            const rows = ids.map(id => this._pageData[id]);
            const context = <WitUIContracts.QueryResultWorkItemContext>{
                columns: Object.keys(this._pageColumnMap),
                rows: rows,
                ids: ids,
                workItemIds: ids,
                workItemTypeNames: this.getSelectedWorkItemTypes(),
                workItemProjects: this.getSelectedWorkItemProjectNameMapping(),
                query: QueryItemFactory.queryItemToQueryHierarchyItem(this._workItemsProvider.queryDefinition),
                hideDelete: hideDelete || QueryResultsProvider.isRecycleBinQueryResultsProvider(this._workItemsProvider),
                tfsContext: this._options.tfsContext
            };
            return context;
        };
    }

    public _enhance(element: JQuery) {
        /// <param name="element" type="JQuery" />

        element.empty();

        super._enhance(element);
    }

    public getWorkItemsNavigator() {
        return this._workItemsNavigator;
    }

    public attachTabBehavior(tabBehaviorDelegate: (e?: JQueryEventObject) => boolean) {
        this._tabBehaviorDelegate = tabBehaviorDelegate;
    }

    public _onTabKey(e?: JQueryEventObject) {
        if (this._tabBehaviorDelegate) {
            return this._tabBehaviorDelegate(e);
        }
    }

    public _onKeyDown(e: JQueryKeyEventObject) {

        if (Utils_UI.KeyUtils.isExclusivelyCommandOrMetaKeyBasedOnPlatform(e) && (e.keyCode === Utils_UI.KeyCode.S)) {
            if (this.isDirty(true)) {
                this.saveWorkitems();
            }
            return false;
        }

        if (e.keyCode === Utils_UI.KeyCode.DELETE) {

            const selectedWorkItemIds = this.getSelectedWorkItemIds();
            if (!selectedWorkItemIds || selectedWorkItemIds.length < 1 || selectedWorkItemIds.some((id) => +id < 1)) {
                // No valid items to be deleted (or some invalid ones).
                return false;
            }

            const workItemNavigator = this.getWorkItemsNavigator();
            const ciSourceAction = RecycleBinTelemetryConstants.DELETE_KEY;
            const ciSourceAreaName = this._options.sourceArea;
            const tfsContext = this._options.tfsContext;
            let readWorkItems = this._options.readWorkItems;
            const dataPopulated = WorkItemPermissionDataHelper.isPopulated();

            if (workItemNavigator) {
                // If in the RecycleBin we want to destroy the item, not delete 
                const workItemNavigatorProvider = workItemNavigator.getProvider();
                const isRecycleBinProvider = QueryResultsProvider.isRecycleBinQueryResultsProvider(workItemNavigatorProvider);

                if (isRecycleBinProvider) {
                    if (!dataPopulated || WorkItemPermissionDataHelper.hasWorkItemDestroyPermission()) {
                        WITControlsRecycleBinDialogShim.showDestroyConfirmationDialog(
                            tfsContext,
                            ciSourceAction,
                            ciSourceAreaName,
                            selectedWorkItemIds,
                            (exception: Error) => {
                                eventSvc.fire(WorkItemViewActions.WORKITEM_VIEW_MESSAGE_CHANGE,
                                    this,
                                    {
                                        message: exception.message,
                                        messageType: Notifications.MessageAreaType.Error
                                    });
                            });
                    }
                    return false;
                }
            }

            // Ensure that the item selected is deletable
            if (!dataPopulated || WorkItemPermissionDataHelper.hasWorkItemDeletePermission()) {
                    readWorkItems = true;
                    DeleteMenuItemHelper.WorkItemCategorization.getAllTestWorkItemTypes().then((testWorkItemTypes: IDictionaryStringTo<string>) => {
                        const workItemId = selectedWorkItemIds[0];
                        const workItemType = this.getWorkItemTypeNameById(workItemId)
                        if (selectedWorkItemIds.length === 1 && this._isTestWorkItem(Object.keys(testWorkItemTypes), workItemType)) {
                            // Allow deletion of test work item only when user has destroy permission as well
                            if (WorkItemPermissionDataHelper.hasWorkItemDestroyPermission()) {
                                VSS.using(["WorkItemTracking/Scripts/TestWorkItemDelete/TFS.TestWorkItemDelete.Dialog"], (dialog: typeof TestWorkItemDeleteDialog_Async) => {
                                    dialog.getTestWorkItemDeleteConfirmationDialog(workItemType).then((testWorkItemDeleteDialog) => {
                                        testWorkItemDeleteDialog.showDialog(workItemId, workItemType, () => {
                                            testWorkItemDeleteDialog.deleteTestWorkItem(
                                                ciSourceAction,
                                                ciSourceAreaName,
                                                workItemId,
                                                false);
                                        });
                                    });
                                });
                            }
                        }
                        else {
                            WITControlsRecycleBinDialogShim.showDeleteConfirmationDialog(
                                tfsContext,
                                ciSourceAction,
                                ciSourceAreaName,
                                selectedWorkItemIds,
                                readWorkItems,
                                Object.keys(testWorkItemTypes));
                        }
                    });
            }
            return false;
        }

        return super._onKeyDown(e);
    }

    private _isTestWorkItem(testWorkItemTypes: string[], workItemType: string): boolean {
        return testWorkItemTypes.indexOf(workItemType) > -1;
    }

    public copySelectedItems(formatterType?: new (grid: Grids.Grid, options?: any) => Grids.ITableFormatter, copyAsHtml?: boolean, options?: any) {
        // override for Ctrl+C so that it defaults to CopyAsHtml

        // if the only selected item is a fake row, then don't show the copy dialog
        const selectedIds = this.getSelectedWorkItemIds();
        if (selectedIds.length === 1 && !this.isRealWorkItem(selectedIds[0])) {
            return;
        }

        super.copySelectedItems(formatterType ? formatterType : QueryResultHtmlTableFormatter, typeof copyAsHtml === "undefined" ? true : copyAsHtml, options);
    }
    private _updateSoftCapMessage(queryResultModel: IQueryResult) {
        if (queryResultModel.hasMoreResult) {
            this._showSoftCapMessage();
        } else {
            this._clearSoftCapMessage();
        }
    }

    private _showSoftCapMessage() {
        if (!this._messageArea) {
            // Create message area.
            this._messageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this.getElement(), {
                closeable: false,
                message: {
                    type: Notifications.MessageAreaType.Info
                },
                prepend: true
            });

            this._messageArea._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_COMPLETE, () => {
                // Resize the grid when the status message changes as it can grow and shrink.
                this._resize();
            });

            // Suppress context menu right clicking on the message area.
            this._messageArea._element.bind("contextmenu", (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
        }

        // Create the message info.
        const $div = $("<div>");
        $div.addClass(QueryResultGrid._gridMessageClass);
        const isRecycleBinProvider = QueryResultsProvider.isRecycleBinQueryResultsProvider(this._workItemsProvider);
        const message = `<span>${Utils_String.format(Resources.ShowMoreWorkItemsMessage,
            this._count,
            isRecycleBinProvider ? Resources.DeleteWorkItemsToSeeMore : `<a id=${QueryResultGrid._showAllItemsLink} role='button' href=#>${Resources.ShowMoreWorkItemsLinkMessage}</a>`)}</span>`;
        $div.append($(message));

        this._messageArea.setMessage({
            header: $div
        }, Notifications.MessageAreaType.Info);

        this._softCapLinkOnClick($(".query-editor #" + QueryResultGrid._showAllItemsLink));
        this._softCapLinkOnClick($(".triage-view #" + QueryResultGrid._showAllItemsLink));

        this.getElement().addClass(QueryResultGrid._gridHasMessageFlag);

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
            CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_QUERY_SOFTCAP_LINK,
            { "Action": "Create" }
        ));
    }

    private _softCapLinkOnClick(link: JQuery) {
        link.click((e) => {
            if (e) {
                e.preventDefault();
            }
            // Set bypassSoftCap flag to true because the user has clicked the link to get all work items.
            this._workItemsProvider.bypassSoftCap = true;
            this._refreshResults();
            this._clearSoftCapMessage();

            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_QUERY_SOFTCAP_LINK,
                { "Action": "Click" }
            ));
        });
    }

    private _clearSoftCapMessage() {
        if (this._messageArea) {
            this._messageArea.clear();
        }
        this._resize();
    }

    private _clearFilterMessage() {
        if (this._textFilterMessageArea) {
            this._textFilterMessageArea.clear();

            if (this._messageArea) {
                this._messageArea.showElement();
                this.getElement().addClass(QueryResultGrid._gridHasMessageFlag);
            }
        }
        this._resize();
    }


    private _showFilterMessage(filteredItems: number, totalItems: number, nextIncrement: number) {
        /// <summary> Shows a message indicating current status of text filtering on grid along with a link to trigger search increment </summary>
        /// <param name="filteredItems" type="number"> The number of work items on which the text filter has been applied </param>
        /// <param name="totalItems" type="number" optional="true"> Total number of workitems on which filter can be applied </param>
        /// <param name="nextIncrement" type="number" optional="true"> The next set of items which will be included in text filtering on triggering search increment. </param>

        Diag.Debug.assert(nextIncrement > 0, "Should only be visible if there are more items to filter");

        // hide the softcap message before we show the incremental text filter message
        if (this._messageArea) {
            this._messageArea.hideElement();
        }

        if (!this._textFilterMessageArea) {
            // Create message area
            this._textFilterMessageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this.getElement(), {
                closeable: false,
                message: {
                    type: Notifications.MessageAreaType.Info
                },
                prepend: true
            });

            this._textFilterMessageArea._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_COMPLETE, () => {
                // Resize the grid when the status message changes as it can grow and shrink.
                this._resize();
            });

            // Suppress context menu right clicking on the message area.
            this._textFilterMessageArea._element.bind("contextmenu", (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
        }

        const nextItemsMessage: string = Utils_String.format(Resources.TextFilterNextItemsMessage, nextIncrement);
        // Create the message info.
        const $msgInfoContainer = $(domElem("div", QueryResultGrid._gridMessageClass));

        const message = "<span>" + Utils_String.format(Resources.TextFilterResultCountMessage, filteredItems, totalItems, "<a id=" + QueryResultGrid._showFilteredItemsLink + " href=#>" + nextItemsMessage + "</a>") + "</span>";
        $(message).appendTo($msgInfoContainer);

        this._textFilterMessageArea.setMessage({
            header: $msgInfoContainer
        }, Notifications.MessageAreaType.Info);

        const $link = $("#" + QueryResultGrid._showFilteredItemsLink);

        $link.click((e) => {
            if (e) {
                e.preventDefault();
            }

            Q(this._pageNextSetOfWorkItems(QueryResultGrid.FILTER_PAGE_SIZE)).done(() => {
                this._applyFilter();
            });
        });

        this.getElement().addClass(QueryResultGrid._gridHasMessageFlag);
    }

    private _updateFilterMessage() {
        if (this._filterApplied) {
            // Get the count of paged in items and the count of available work items.
            const pagedItems = Object.keys(this._pageData).length;
            const uniqueItems = this._getUniqueUnfilteredIds();

            const nextIncrement = Math.min(QueryResultGrid.FILTER_PAGE_SIZE, uniqueItems.length - pagedItems);

            if (nextIncrement > 0) {
                this._showFilterMessage(pagedItems, uniqueItems.length, nextIncrement);
            }
            else {
                this._clearFilterMessage();
            }
        }
        else {
            this._clearFilterMessage();
        }
    }

    private _getUniqueUnfilteredIds(): number[] {
        const allItems = this.getUnfilteredWorkItemIds();

        if (this._unfilteredIsLinkQuery) {
            const idMap: IDictionaryNumberTo<boolean> = {};

            const uniqueItems = allItems.filter((value: number) => {
                if (!idMap[value]) {
                    idMap[value] = true;
                    return true;
                }
                return false;
            });

            return uniqueItems;
        }

        return allItems;
    }

    private _resize() {
        if (
            !this.isDisposed() &&
            !$(".triage-view ." + QueryResultGrid._gridMessageClass).height() &&
            !$(".query-editor ." + QueryResultGrid._gridMessageClass).height()
        ) {
            // Only resize when the message area has been cleared.
            this.getElement().removeClass(QueryResultGrid._gridHasMessageFlag);
        }
    }

    private _fullScreenCIDelegate = (sender, ciDataArgs) => {
        ciDataArgs.workItemCount = this._count;
    };

    public getProjectName(): string {
        return this._projectName;
    }

    public isDirty(checkKnown): boolean {
        let managed = this._managedWorkItems, id, workItem, manager = WorkItemManager.get(this._store);

        if (!checkKnown) {
            return this._getDirtyWorkItems().length > 0;
        }
        else {
            for (id in managed) {
                if (managed[id] === true) {
                    workItem = manager.getWorkItem(id);
                    if (workItem) {
                        if (workItem.isDirty()) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    public processDataSource(datasource: IQueryResultsTreeData, deleteOriginal: boolean) {
        /// <summary>Process the datasource arrays and delete them if needed</summary>
        let expandResult, unsortedFilteredIds: number[];
        this._parentWorkItemIds = undefined;


        if (datasource.sourceIds) {
            this._parentWorkItemIds = datasource.sourceIds;
        }

        if (datasource.linkIds) {
            this._links = datasource.linkIds;
        }
        else {
            this._links = [];
        }

        if (datasource.targetIds) {
            if (this._filterApplied) {
                // Filter is applied, so cache the targetIds for later
                this._unfilteredWorkItems = datasource.targetIds;
                unsortedFilteredIds = this._filterManager.filter();
                this._workItems = this._sortAndRemoveDuplicates(unsortedFilteredIds, datasource.targetIds);
            } else {
                this._workItems = datasource.targetIds;
            }
        }
        else {
            this._workItems = [];
        }

        this._workItemsFailedToFetch = [];

        this._options.source = this._workItems;

        if (this._parentWorkItemIds) {

            expandResult = this.processExpandedStates(datasource);

            if (this._filterApplied) {
                // Cache the calculated expandStates and null out the value
                this._unfilteredExpandStates = this._options.expandStates;
                this._options.expandStates = null;
            }

            this._rootCount = expandResult.root;
        }
        else {
            this._options.expandStates = null;
            this._rootCount = this.getUnfilteredWorkItemIds().length;
        }

        if (deleteOriginal) {
            delete datasource.sourceIds;
            delete datasource.linkIds;
            delete datasource.targetIds;
        }
    }

    protected processExpandedStates(datasource: IQueryResultsTreeData): any {
        this._options.expandStates = [];
        return QueryResultGrid.calculateExpandStates(datasource.sourceIds, this.getUnfilteredWorkItemIds(), this._options.expandStates, 0, 0, datasource.sourceIds.length);
    }

    public initialize() {
        this._store = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        this._projectName = this._options.tfsContext.navigation.project;

        WorkItemManager.get(this._store).attachWorkItemChanged(this._workItemChangedDelegate);

        this.initializeDataModel(this._options);
        delete this._options.payload;

        super.initialize();

        const callback = this._options.resultGridPostInitializeCallback;
        if (callback && $.isFunction(callback)) {
            callback.call(this, this);
        }
    }

    protected _cleanUpCells() {
        // Clean up work item type icon react component
        if (this._workItemTypeIconCells && this._workItemTypeIconCells.length) {
            for (const cell of this._workItemTypeIconCells) {
                if (cell && cell.length) {
                    const container = cell.find(".grid-cell-contents-container")[0] || cell[0];
                    WorkItemTypeIconControl.unmountWorkItemTypeIcon(container);
                }
            }
        }

        this._workItemTypeIconCells = [];
    }

    public _cleanUpRows() {
        this._cleanUpCells();
        super._cleanUpRows();
    }

    public _dispose() {
        if (this._workItemsProvider) {
            this._workItemsProvider = null;
        }

        if (this._store) {
            WorkItemManager.get(this._store).detachWorkItemChanged(this._workItemChangedDelegate);
            this._store = null;
        }

        this.setNavigator(null);
        this._cleanUpCells();
        this._unbindFilterManagerEvents();
        Navigation.FullScreenHelper.detachFullScreenCI(this._fullScreenCIDelegate);
        this.queryResultsStarting = null;
        this.queryResultsComplete = null;
        this._tabBehaviorDelegate = null;
        if (this._useZeroDataView && this._zeroDataElement) {
            unmountZeroDataComponent(this._zeroDataElement[0]);
            this._zeroDataComponentMounted = false;
            this._isNewQueryInZeroDataComponent = false;
        }
        super._dispose();
    }

    public getWorkItemTypeNameByIndex(dataIndex: number): string {
        return this.getWorkItemTypeNameById(this._workItems[dataIndex]);
    }

    public getWorkItemTypeNameById(workitemId: number): string {
        return this._getWorkItemFieldValueFromPageData(workitemId, WITConstants.CoreFieldRefNames.WorkItemType);
    }

    protected getWorkItemStateById(workitemId: number): string {
        return this._getWorkItemFieldValueFromPageData(workitemId, WITConstants.CoreFieldRefNames.State);
    }

    protected getWorkItemProjectNameById(workitemId: number): string {
        return this._getWorkItemFieldValueFromPageData(workitemId, WITConstants.CoreFieldRefNames.TeamProject);
    }

    private _getWorkItemStateColorCell(dataIndex: number, stateValue: string): JQuery {
        const workItemId = this._workItems[dataIndex];
        const projectName = this.getWorkItemProjectNameById(workItemId);
        const typeName = this.getWorkItemTypeNameById(workItemId);

        if (!projectName) {
            VSSError.publishErrorToTelemetry({
                name: "ProjectNameNotPagedException",
                message: "Project name must be paged in to get workitem state color"
            });
            return null;
        }

        return WorkItemStateCellRenderer.getAutoUpdatingColorCell(projectName, typeName, stateValue);
    }

    protected _isIndentedHeaderColumn(column: any) {
        if (this._isLinkOrTreeQuery()) {
            return column.name === WITConstants.CoreFieldRefNames.Title;
        }
        else {
            return false;
        }
    }

    protected isWorkItemSaving(id: number): boolean {
        // Allow override in product backlog grid so that we can react accordingly
        return false;
    }

    protected isUnparentedRow(id: number): boolean {
        // Allow override in product backlog grid so that we can react accordingly
        return false;
    }

    protected renderWorkItemTypeColorAndIcon($gridCell: JQuery, projectName: string, workItemId: number, workItemTypeName: string, dataIndex: number): void {
        WorkItemTypeIconControl.renderWorkItemTypeIcon(
            $gridCell[0],
            workItemTypeName,
            projectName,
            {
                suppressTooltip: true
            } as WorkItemTypeIconControl.IIconAccessibilityOptions);
    }

    public getFieldColumns(): Grids.IGridColumn[] {
        return (this._columns || []).filter(c => c.name !== QueryResultGrid.EXPAND_COLUMN_NAME && c.name !== QueryResultGrid.COLLAPSE_COLUMN_NAME);
    }

    public initializeDataModel(queryResultsModel: IQueryResultWithOptions) {
        let i, l, column, sortColumn, sortOrder = [], tagCellRenderer, titleCellRenderer, identityCellRenderer, stateColorCellrenderer;
        this.processDataSource(queryResultsModel, false);

        this._allowSort = queryResultsModel.allowSort !== false;
        this._hasMoreResults = queryResultsModel.hasMoreResult;
        this._displayColumns = [];
        this._displayColumnsMap = {};

        if (queryResultsModel.columns) {

            tagCellRenderer = (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) => {
                // "this" is the grid instance
                return TFS_UI_Tags.TagUtilities.renderTagCellContents(this, dataIndex, column, columnOrder);
            };

            titleCellRenderer = (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) => {

                // Have the grid generate the cell as normal.
                const $gridCell: JQuery = this._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
                const id: number = this.getWorkItemIdAtDataIndex(dataIndex);

                // Empty the cell first and back-up current content
                const titleText = $gridCell.text();
                const $treeIcon = $gridCell.find(".grid-tree-icon").detach();
                $gridCell.empty();

                // Fix indent as text indent does not work properly for non-text content
                if (columnOrder === indentIndex && level > 0) {
                    const indent = $gridCell.css("text-indent");

                    $gridCell.css("text-indent", 0);
                    $gridCell.css("padding-left", indent);
                }

                // Work item type icon/color
                const workItemTypeName = this.getWorkItemTypeNameById(id);
                const projectName = this.getWorkItemProjectNameById(id);

                this.renderWorkItemTypeColorAndIcon($gridCell, projectName, id, workItemTypeName, dataIndex);
                this._workItemTypeIconCells.push($gridCell);

                // Work item title 
                let $titleElement;
                if (!this.isUnparentedRow(id) && this._allowInteractionWithTitle
                    && FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAgileBacklogOneClickOpen)) {
                    // Make the title a link to allow single click open
                    const tfsContext = this._options.tfsContext;
                    const href = tfsContext.getActionUrl(
                        id > 0 ? "edit" : "create",
                        "workitems",
                        {
                            project: tfsContext.navigation.project,
                            team: tfsContext.navigation.team,
                            parameters: [id > 0 ? id : this.getWorkItemTypeNameById(id)]
                        });
                    $titleElement = $(`<a class="work-item-title-link" href='${href}'/>`).text(titleText);

                    $titleElement.click((e: JQueryEventObject) => {
                        const BUTTON_MIDDLE_MOUSE = 1;
                        const WHICH_MIDDLE_MOUSE = 2;
                        const modifierKeyPressed = e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.which === WHICH_MIDDLE_MOUSE || e.button === BUTTON_MIDDLE_MOUSE;

                        if (!modifierKeyPressed) {
                            e.preventDefault();

                            // Open row item detail only when single click on title is enabled. 
                            // When single click is diabled (i.e. triage view) do not open detail. 
                            if (this._allowSingleClickOpen) {
                                this.onOpenRowDetail({ dataIndex: dataIndex });
                            }
                        }
                    });

                    $titleElement.contextmenu((e: JQueryEventObject) => {
                        // Stop the event from bubbling up so that the grid context menu does not get triggered
                        e.stopPropagation();
                    });

                }
                else {
                    // Title has no interaction
                    $titleElement = $("<span/>").text(titleText);
                }

                $gridCell.append($titleElement);

                // Re-render tree control
                $gridCell.append($treeIcon);

                return $gridCell;
            };

            stateColorCellrenderer = (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) => {
                // for some reason, using jquery width directly does not correctly set width, so use css instead
                const $gridCell = $("<div/>").addClass("grid-cell").css("width", (column.width || 20) + "px");
                const stateValue = this.getColumnText(dataIndex, column, columnOrder);

                if (stateValue) {
                    $gridCell.append(this._getWorkItemStateColorCell(dataIndex, stateValue));
                }
                return $gridCell;
            };

            identityCellRenderer = (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) => {
                const $gridCell: JQuery = this._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
                if ($gridCell) {
                    $gridCell.empty();
                    $gridCell.addClass("identity-grid-cell");

                    const value = this.getColumnText(dataIndex, column, columnOrder);
                    const identity = WITIdentityHelpers.parseUniquefiedIdentityName(value);
                    if (identity) {
                        const options: IIdentityDisplayOptions = {
                            item: identity,
                            size: IdentityPickerControlSize.Small,
                            displayType: EDisplayControlType.TextOnly,
                            turnOffHover: true,
                        } as IIdentityDisplayOptions;

                        Controls.create(IdentityDisplayControl, $gridCell, options);

                        // for groups we don't want the guid showing up in the tooltip
                        const friendlyDistinctDisplayName = WITIdentityHelpers.getFriendlyDistinctDisplayName(value, identity);
                        const isNonIdentityValue = EntityFactory.isStringEntityId(identity.entityId);
                        const showOnOverflow = isNonIdentityValue || Utils_String.localeIgnoreCaseComparer(value, friendlyDistinctDisplayName) !== 0;
                        $gridCell.data("tooltip-text", friendlyDistinctDisplayName);
                        $gridCell.data("tooltip-show-on-overflow", showOnOverflow);
                    }
                }

                return $gridCell;
            };

            const idRenderer = (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) => {
                const $gridCell = this._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);

                if ($gridCell) {
                    const value = this.getColumnText(dataIndex, column, columnOrder);
                    // Full screen link
                    const url: string = this._options.tfsContext.getPublicActionUrl("", "workitems")
                        + "#_a=edit&id="
                        + value
                        + "&"
                        + Navigation.FullScreenHelper.FULLSCREEN_HASH_PARAMETER
                        + "=true"

                    $gridCell.empty();

                    const $link = $("<a/>")
                        .attr({
                            "href": url,
                            "target": "_blank"
                        })
                        .text(value);
                    RichContentTooltip.addIfOverflow(value, $link);
                    $gridCell.append($link);
                }
                return $gridCell;
            };

            const areEqualStrings = (a: string, b: string): boolean => {
                return Utils_String.ignoreCaseComparer(a, b) === 0;
            };

            for (i = 0, l = queryResultsModel.columns.length; i < l; i++) {
                // Clone the column for grid, so that modifications do not affect
                // queryResultsModel. This is important for column move.
                column = $.extend({}, queryResultsModel.columns[i]);
                column.index = i;

                if (!this._allowSort) {
                    column.canSortBy = false;
                }

                if (areEqualStrings(column.name, WITConstants.CoreFieldRefNames.Id) && this._options.displayIdWithLinks) {
                    column.getCellContents = idRenderer;
                }

                else if (areEqualStrings(column.name, WITConstants.CoreFieldRefNames.Tags)) {
                    column.canSortBy = false;
                    column.getCellContents = tagCellRenderer;
                }

                else if (areEqualStrings(column.name, WITConstants.CoreFieldRefNames.Title)) {
                    column.getCellContents = titleCellRenderer;
                }
                else if (column.isIdentity) {
                    column.getCellContents = identityCellRenderer;
                }
                else if (areEqualStrings(column.name, WITConstants.CoreFieldRefNames.State)) {
                    column.getCellContents = stateColorCellrenderer;
                }

                this._displayColumns[i] = column;
                this._displayColumnsMap[column.name] = i;
            }
        }

        this._pageColumns = [];
        this._pageColumnMap = {};

        if (queryResultsModel.pageColumns) {
            for (i = 0, l = queryResultsModel.pageColumns.length; i < l; i++) {
                this._pageColumns.push(queryResultsModel.pageColumns[i]);
                this._pageColumnMap[queryResultsModel.pageColumns[i]] = i;
            }
        }

        this._sortColumns = [];
        if (queryResultsModel.sortColumns) {
            for (i = 0, l = queryResultsModel.sortColumns.length; i < l; i++) {
                sortColumn = queryResultsModel.sortColumns[i];
                this._sortColumns.push(sortColumn);
                if (sortColumn.name in this._displayColumnsMap) {
                    sortOrder.push({ index: this._displayColumnsMap[sortColumn.name], order: sortColumn.descending ? "desc" : "asc" });
                }
            }
        }

        this._options.sortOrder = sortOrder;

        this._options.keepSelection = queryResultsModel.keepSelection === true;

        if (this._filterApplied) {
            // Filter is applied, so cache the query type
            this._unfilteredIsLinkQuery = queryResultsModel.isLinkQuery;
            this._unfilteredIsTreeQuery = queryResultsModel.isTreeQuery;

            // And then make it flat
            this._isLinkQuery = false;
            this._isTreeQuery = false;
        } else {
            this._isLinkQuery = queryResultsModel.isLinkQuery;
            this._isTreeQuery = queryResultsModel.isTreeQuery;
        }

        let expandCollapseColumn: Grids.IGridColumn[] = [];
        if (this._queriesHubContext && this._isLinkOrTreeQuery()) {
            this._isShowingExpandCollapseColumns = true;
            expandCollapseColumn = [
                {
                    name: QueryResultGrid.EXPAND_COLUMN_NAME,
                    index: this._displayColumns.length,
                    width: 20,
                    canSortBy: false,
                    canMove: false,
                    fieldId: null,
                    fixed: true,
                    tooltip: VSS_Resources_Common.ExpandAllToolTip,
                    onHeaderClick: () => this.executeCommand("expand-all-nodes", false),
                    headerContainerCss: "expand-collapse-icons-header",
                    getHeaderCellContents: (column: Grids.IGridColumn): JQuery => {
                        const cell = $("<span>").addClass("expand-icon bowtie-icon bowtie-toggle-expand");
                        RichContentTooltip.add(VSS_Resources_Common.ExpandAllToolTip, cell);
                        return cell;
                    }
                },
                {
                    name: QueryResultGrid.COLLAPSE_COLUMN_NAME,
                    index: this._displayColumns.length + 1,
                    width: 20,
                    canSortBy: false,
                    canMove: false,
                    fieldId: null,
                    fixed: true,
                    tooltip: VSS_Resources_Common.CollapseAllToolTip,
                    headerContainerCss: "expand-collapse-icons-header",
                    onHeaderClick: () => this.executeCommand("collapse-all-nodes", false),
                    getHeaderCellContents: (column: Grids.IGridColumn): JQuery => {
                        const cell = $("<span/>").addClass("collapse-icon bowtie-icon bowtie-toggle-collapse");
                        RichContentTooltip.add(VSS_Resources_Common.CollapseAllToolTip, cell);
                        return cell;
                    }
                }
            ];
        } else {
            this._isShowingExpandCollapseColumns = false;
        }

        this._options.columns = expandCollapseColumn.concat(this._displayColumns);

        this._emptyQueryResults = this._getEmptyQueryStatus();

        this._pageData = {};
        // Dont delete the cache if the result model has not changed
        this.buildCache(queryResultsModel.payload, queryResultsModel.isCachedData);

        this.initializeDirtyWatch();

        this._fetching = false;
        this.cancelDelayedFunction("updateWorkItemCache");
        this.cancelDelayedFunction("pageWorkItems");
    }

    public updateDataModel(queryResultsModel: IQueryResult) {

        this.initializeDataModel(queryResultsModel);
        this.initializeDataSource();
        this._updateSoftCapMessage(queryResultsModel);
        if (queryResultsModel.error) {
            this._statusUpdate(queryResultsModel.error);
        }

        if (this._filterManager.isActive()) {
            this._pageFirstThousand();
        }

        eventSvc.fire(QueryResultsGridEvents.RESULTS_MODEL_CHANGED, this, this._workItems && this._workItems.length);
    }

    public setTitleInteraction(allowInteractionWithTitle: boolean, allowSingleClickOpen: boolean) {
        this._allowInteractionWithTitle = allowInteractionWithTitle;
        this._allowSingleClickOpen = allowSingleClickOpen;
    }

    /**
     * Override base grid's layout function to show/hide zero data component after the render completes
     */
    public layout() {
        super.layout();
        this._updateZeroDataComponent();
        this._fire("queryResultsRendered");
    }

    public setNavigator(navigator) {
        if (this._workItemsNavigator !== navigator) {
            this.detachNavigatorEvents();

            this._workItemsNavigator = navigator;
            this.attachNavigatorEvents();
        }
    }

    /**
     * Sets the query context and zero data options to query result grid, zero data behavior works only with new query experience
     * @param queriesHubContext - Query Context
     * @param useZeroDataView - If true, shows the zero data view in query result grid
     */
    public setNewQueryContextOptions(queriesHubContext: IQueriesHubContext, useZeroDataView: boolean): void {
        this._queriesHubContext = queriesHubContext;
        this._useZeroDataView = useZeroDataView;
    }

    public detachNavigatorEvents() {
        if (this._workItemsNavigator) {
            this._workItemsNavigator.detachEvent(WorkItemsNavigator.WorkItemsNavigator.EVENT_NAVIGATE_NEXT, this._navigateNextDelegate);
            this._workItemsNavigator.detachEvent(WorkItemsNavigator.WorkItemsNavigator.EVENT_NAVIGATE_PREVIOUS, this._navigatePreviousDelegate);
        }
    }

    public attachNavigatorEvents() {
        if (this._workItemsNavigator) {
            // try to detach first to prevent attaching multiple times
            this.detachNavigatorEvents();
            this._workItemsNavigator.attachEvent(WorkItemsNavigator.WorkItemsNavigator.EVENT_NAVIGATE_NEXT, this._navigateNextDelegate);
            this._workItemsNavigator.attachEvent(WorkItemsNavigator.WorkItemsNavigator.EVENT_NAVIGATE_PREVIOUS, this._navigatePreviousDelegate);
        }
    }

    // Check for use of empty @CurrentIteration macro and notify the user if so
    private _checkForEmptyCurrentIteration = (workItemsProvider: QueryResultsProvider, queryResultModel: IQueryResult): void => {
        // If there was an error, do not show info
        if (queryResultModel.error) {
            return;
        }

        const currId = workItemsProvider.getId();
        if (currId === this._previousProviderId) {
            return;
        }
        this._previousProviderId = currId;

        if (!FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.CurrentIterationRequireTeamParameter)) {
            return;
        }

        const editInfo = queryResultModel.editInfo;
        const store = this.getStore();

        if (editInfo && store) {
            const { sourceFilter, treeTargetFilter, linkTargetFilter } = editInfo;
            const curIter = WITCommonResources.WiqlOperators_MacroCurrentIteration;
            const emptyCurIterRegex = new RegExp(`(@${curIter})(?!\\()`, "gi");
            for (const filter of [sourceFilter, treeTargetFilter, linkTargetFilter]) {
                if (!filter || !filter.clauses || filter.clauses.length === 0) {
                    continue;
                }
                for (const clause of filter.clauses) {
                    const field = store.getFieldDefinition(clause.fieldName);
                    if (!field || field.referenceName !== WITConstants.CoreFieldRefNames.IterationPath) {
                        continue;
                    }

                    if (clause.value.match(emptyCurIterRegex)) {
                        eventSvc.fire(WorkItemViewActions.WORKITEM_VIEW_INFO_CHANGE, null, Resources.DefaultingCurrentIterationTeam);
                        break;
                    }
                }
            }
        }
    }

    public beginShowResults(workItemsProvider: QueryResultsProvider, callback?: IResultCallback, errorCallback?: IErrorCallback, extras?: IQueryParamsExtras) {
        /// <summary> Start showing query results in the grid </summary>
        /// <param name="workItemsProvider" type="Object"> The provider to retrieve query results from. </param>
        /// <param name="callback" type="IResultCallback" optional="true"> Method to call on successful retrieval of query results. </param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true"> Method to call if an error occurred during retrieval of query results. </param>
        /// <param name="extras" type="any" optional="true">
        ///    runQuery: If true then query needs to be ran to retrieve the results.
        ///    keepSelection: If true the current selection will be maintained.
        ///    statusText: Optional text to be displayed while the provider is retrieving the results.
        /// </param>
        Diag.Debug.assertParamIsObject(workItemsProvider, "workItemsProvider");


        let update = true;

        if (this._workItemsProvider !== workItemsProvider) {
            this._workItemsProvider = workItemsProvider;
        }
        else {
            if (extras && extras.keepSelection) {
                update = !this._workItemsProvider.resultsValid || this._workItemsProviderVersion !== this._workItemsProvider.getVersion();
            }
        }

        if (extras && extras.statusText) {
            this.setStatusText(extras.statusText);
        }

        $(this).trigger("queryResultsStarting");

        this.showLoadingIndicator();

        workItemsProvider.beginGetResults(
            (queryResultModel: IQueryResult) => {
                this._checkForEmptyCurrentIteration(workItemsProvider, queryResultModel);

                if (!this._workItemsProvider) {
                    // disposed, just exit since there is nothing actionable
                    // with this result.
                    return;
                }

                this._workItemsProviderVersion = this._workItemsProvider.getVersion();

                if (this._queriesHubContext) {
                    if (!this._workItemsProvider.queryDefinition.queryType) {
                        // nqe requires the query type to be set which is not populated for oqe.
                        this._workItemsProvider.queryDefinition.queryType = QueryType[LinkQueryMode.getQueryType(queryResultModel.editInfo.mode)];
                        this._queriesHubContext.triageViewActionCreator.updateProvider(this._workItemsProvider);
                    }
                }
                if (update) {
                    this.updateDataModel(queryResultModel);
                } else {
                    this.layout();
                    this._statusUpdate(queryResultModel.error);
                }

                $(this).trigger("queryResultsComplete");
                this.hideLoadingIndicator();

                if ($.isFunction(callback)) {
                    callback.call(this, queryResultModel);
                }
            }, (error) => {
                if ($.isFunction(errorCallback)) {
                    errorCallback.call(this, error);
                }
                $(this).trigger("queryResultsError", error);
                this.hideLoadingIndicator();
            },
            extras && extras.runQuery,
            extras
        );
    }

    public _createContextMenu(rowInfo: any, menuOptions: any): Menus.PopupMenu {
        /// <summary>Creates the context menu options. This function is intended to be overriden by derived objects.</summary>
        /// <param name="rowInfo" type="Object">The information about the row with context</param>
        /// <param name="menuOptions" type="Object">The menu information. See _createContextPopupMenuControl</param>
        /// <returns type="Menus.PopupMenu" />
        if (QueryResultsProvider.isRecycleBinQueryResultsProvider(this._workItemsProvider)) {
            return this._createRecycleBinContextMenu(rowInfo, menuOptions);
        }
        else {
            WorkItemTrackingControlsAccessories.CommonContextMenuItems.contributeQueryResultGrid(menuOptions, {
                tfsContext: this._options.tfsContext,
                enableTeamActions: true, // this._options.tfsContext.currentUserHasTeamPermission,
                container: this._element,
            });

            if (menuOptions.contextInfo) {
                menuOptions.contextInfo.item = { "workItemId": menuOptions.contextInfo.item };
            }

            this._updateContextMenuTitles(menuOptions.items);
            return super._createContextMenu(rowInfo, menuOptions);
        }
    }

    private _updateZeroDataComponent() {
        if (this._useZeroDataView && this._workItemsProvider && this._workItemsProvider.queryResultsModel) {
            this._zeroDataElement = this._zeroDataElement || $("<div>").appendTo(this._element);
            const { payload } = this._workItemsProvider.queryResultsModel;

            // Check for payload to see if any data prompt to render.
            // Previously was checking this._count for the grid which is always 0 for the first cicyle and causes flickerying.
            if (payload && payload.rows && payload.rows.length > 0) {
                unmountZeroDataComponent(this._zeroDataElement[0]);
                this._zeroDataComponentMounted = false;
                this._isNewQueryInZeroDataComponent = false;
            } else {
                // if it is a new query, we show a different message
                const isNewQuery = this._getEmptyQueryStatus();
                if (!this._zeroDataComponentMounted || this._isNewQueryInZeroDataComponent !== isNewQuery) {
                    renderZeroDataQueryResult(this._zeroDataElement[0], isNewQuery);
                    this._zeroDataComponentMounted = true;
                    this._isNewQueryInZeroDataComponent = isNewQuery;
                }
            }
        }
    }

    private _getEmptyQueryStatus(): boolean {
        return this._workItemsProvider && this._workItemsProvider.queryResultsModel && this._workItemsProvider.queryResultsModel.queryRan === false;
    }

    // We need to update title of context menu if it's disabled or enabled, to show different message.
    private _updateContextMenuTitles(menuItems) {
        const queryAcrossProjects = this._isQueryAcrossProject();
        for (let i = 0; i < menuItems.length; i++) {
            const menuItem = menuItems[i];
            if (menuItem.id === QueryResultGrid.CHANGE_WORK_ITEM_TYPE_ID) {
                if (!queryAcrossProjects) {
                    menuItem.title = "";
                }
                else {
                    menuItem.title = Resources.ChangeTypeTooltipDisabled;
                }
                break;
            }
        }
    }

    private _isQueryAcrossProject(): boolean {
        return !(this._workItemsProvider
            && this._workItemsProvider.queryResultsModel
            && this._workItemsProvider.queryResultsModel.editInfo
            && this._workItemsProvider.queryResultsModel.editInfo.teamProject);
    }

    private _createRecycleBinContextMenu(rowInfo: any, menuOptions: any): Menus.PopupMenu {
        const dataPopulated = WorkItemPermissionDataHelper.isPopulated();
        const hideDelete = !(dataPopulated && WorkItemPermissionDataHelper.hasWorkItemDeletePermission());
        const hideDestroy = !(dataPopulated && WorkItemPermissionDataHelper.hasWorkItemDestroyPermission());

        if (hideDelete && hideDestroy) {
            return null;
        }
        const that = this;
        function getActionArgs() {
            return that._onGetMenuItemActionArguments(this);
        }

        menuOptions.contributionIds = ["ms.vss-work-web.recycle-bin-context-menu"];
        menuOptions.items = [
            {
                id: QueryResultGrid.COMMAND_ID_DESTROY,
                text: Resources.DestroyWorkItemDeleteButtonText,
                icon: "bowtie-icon bowtie-edit-delete",
                "arguments": getActionArgs
            },
            {
                id: QueryResultGrid.COMMAND_ID_RESTORE,
                text: Resources.RestoreWorkItemDeleteButtonText,
                icon: "bowtie-icon bowtie-recycle-bin-restore",
                "arguments": getActionArgs
            }];

        if (menuOptions.contextInfo) {
            menuOptions.contextInfo.item = { "workItemId": menuOptions.contextInfo.item };
        }

        return super._createContextMenu(rowInfo, menuOptions);
    }

    /*
     * Get the arguments based on the actionId.
     * @param action The action id.
     * @param sourceType the source type where this action comes from, optional
     * @returns The arguments.
     */
    public getActionArguments(action: string, sourceType?: string): any {
        let that = this,
            workItemId;
        if (action === WorkItemActions.ACTION_WORKITEM_OPEN || action === WorkItemActions.ACTION_WORKITEM_OPEN_IN_NEW_TAB) {
            workItemId = this.getSelectedWorkItemId();
            if (workItemId > 0) {
                return {
                    id: this.getSelectedWorkItemId(),
                    tfsContext: this._options.tfsContext,
                    triage: true
                };
            } else {
                // Opening an unsaved new work item
                return {
                    id: this.getSelectedWorkItemId(),
                    workItemTypeName: WorkItemManager.get(this._store).getWorkItem(workItemId).workItemType.name
                };
            }
        } else if (action === "link-to-new" || action === "link-to-existing") {
            return {
                baseId: this.getSelectedWorkItemId(),
                selectedIds: this.getSelectedWorkItemIds(),
                tfsContext: this._options.tfsContext
            };
        } else if (action === "create-copy" || action === "use-as-a-template") {
            return {
                workItemId: this.getSelectedWorkItemId(),
                tfsContext: this._options.tfsContext
            };
        } else if (action === "copy-selection-html") {
            return {
                grid: this,
                tfsContext: this._options.tfsContext
            };
        } else if (action === "column-options") {
            let project = this._workItemsProvider.queryResultsModel && this._workItemsProvider.queryResultsModel.editInfo && this._workItemsProvider.queryResultsModel.editInfo.teamProject;
            if (project && Utils_String.equals(project, WiqlOperators.MacroProject, true)) {
                project = this._options.tfsContext.navigation.project;
            }

            return {
                sortColumns: this._sortColumns.map(c => {
                    return {
                        fieldRefName: c.name,
                        descending: c.descending
                    } as IColumnOptionsPanelSortColumn;
                }),
                allowSort: this._allowSort,
                displayColumns: this.getFieldColumns().map(c => {
                    return {
                        fieldRefName: c.name,
                        width: c.width
                    } as IColumnOptionsPanelDisplayColumn;
                }),
                project: project,
                onOkClick: (result: IColumnOptionsResult, dataChanged: boolean) => {
                    if (dataChanged) {
                        Utils_Core.delay(this, 0, () => {
                            this.onColumnChange(result.display, result.sort, result.added, result.removed);
                        });
                    }
                }
            };
        } else if (action === QueryResultGrid.COMMAND_ID_EMAIL_SELECTION) {
            return {
                queryResultsProvider: this._workItemsProvider,
                selectedWorkItems: this.getSelectedWorkItemIds(),
                tfsContext: this._options.tfsContext
            };

        } else if (action === QueryResultGrid.COMMAND_ID_UNFOLLOW) {
            return {
                queryResultsProvider: this._workItemsProvider,
                selectedWorkItems: this.getSelectedWorkItemIds(),
                tfsContext: this._options.tfsContext
            };
        } else if (action === QueryResultGrid.COMMAND_ID_DESTROY || action === QueryResultGrid.COMMAND_ID_RESTORE) {
            return {
                sourceType: sourceType,
                selectedIds: this.getSelectedWorkItemIds(),
                tfsContext: this._options.tfsContext,
                grid: this
            };
        }
    }

    public getCommandStates(): Menus.ICommand[] {
        const currentSelectedCount = this._selectionCount;
        const isSpecialQuery = this._workItemsProvider &&
            this._workItemsProvider.queryDefinition &&
            QueryDefinition.isSpecialQueryId(this._workItemsProvider.queryDefinition.id);
        const isRecycleBinProvider = QueryResultsProvider.isRecycleBinQueryResultsProvider(this._workItemsProvider);
        const shouldShowExpandCollapseAll = this._isLinkOrTreeQuery() && !isRecycleBinProvider;

        const dataPopulated = WorkItemPermissionDataHelper.isPopulated();
        const hideDelete = !(dataPopulated && WorkItemPermissionDataHelper.hasWorkItemDeletePermission());
        const hideDestroy = !(dataPopulated && WorkItemPermissionDataHelper.hasWorkItemDestroyPermission());

        const queryAcrossProjects = this._isQueryAcrossProject();

        return <Menus.ICommand[]>[
            {
                id: "save-work-items",
                hidden: isRecycleBinProvider,
                disabled: !this.isDirty(true)
            },
            {
                id: "save-query",
                disabled: !(this._workItemsProvider && this._workItemsProvider.isSaveable && this._workItemsProvider.isSaveable())
            },
            {
                id: "copy-selection-html",
                hidden: isRecycleBinProvider,
            },
            {
                id: "refresh-work-items",
                disabled: false
            },
            {
                id: "link-to-new",
                hidden: isRecycleBinProvider,
                disabled: currentSelectedCount === 0
            },
            {
                id: "link-to-existing",
                hidden: isRecycleBinProvider,
                disabled: currentSelectedCount === 0
            },
            {
                id: "change-work-item-type",
                hidden: isRecycleBinProvider,
                disabled: queryAcrossProjects
            },
            {
                id: "move-work-items",
                hidden: isRecycleBinProvider,
            },
            {
                id: "create-copy",
                hidden: isRecycleBinProvider,
                disabled: currentSelectedCount !== 1
            },
            {
                id: "use-as-a-template",
                hidden: isRecycleBinProvider,
                disabled: currentSelectedCount !== 1
            },
            {
                id: "open-work-item",
                hidden: isRecycleBinProvider,
                disabled: currentSelectedCount !== 1
            },
            {
                id: "open-work-item-in-new-tab",
                hidden: isRecycleBinProvider,
                disabled: currentSelectedCount !== 1
            },
            {
                id: "bulk-edit-workitems",
                hidden: isRecycleBinProvider,
                disabled: currentSelectedCount === 0
            },
            {
                id: "expand-all-nodes",
                hidden: !shouldShowExpandCollapseAll,
                disabled: this._count === 0 || this._filterApplied === true
            },
            {
                id: "collapse-all-nodes",
                hidden: !shouldShowExpandCollapseAll,
                disabled: this._count === 0 || this._filterApplied === true
            },
            {
                id: QueryResultGrid.COMMAND_ID_EMAIL_SELECTION,
                hidden: isRecycleBinProvider,
                disabled: currentSelectedCount === 0
            },
            {
                id: QueryResultGrid.COMMAND_ID_EMAIL_QUERY_RESULT,
                hidden: isRecycleBinProvider,
                disabled: currentSelectedCount === 0
            },
            {
                id: "share-link",
                hidden: isSpecialQuery || isRecycleBinProvider,
                disabled: !this._enableCopyQueryCommand
            },
            {
                id: QueryResultGrid.COMMAND_ID_DESTROY,
                hidden: hideDestroy || !isRecycleBinProvider,
                disabled: currentSelectedCount === 0
            },
            {
                id: QueryResultGrid.COMMAND_ID_RESTORE,
                hidden: hideDelete || !isRecycleBinProvider,
                disabled: currentSelectedCount === 0
            },
            {
                id: "create-branch-menu",
                hidden: isRecycleBinProvider,
                disabled: currentSelectedCount === 0
            }
        ];
    }

    public executeCommand(command, fromContextMenu: boolean = true) {
        command = typeof command === "string" ? command : command.get_commandName();

        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                `${WorkItemTrackingControlsAccessories.CommonContextMenuItems.QUERIES_COMMAND_FEATURE_NAME}.${command}`,
                {
                    "numSelectedItems": this.getSelectedWorkItemIds().length,
                    "source": fromContextMenu ? "contextMenu" : "toolBar"  // whether the command is executed from context menu or queries toolbar
                }));

        // Checking to see if the command we can handle is executed
        switch (command) {
            case "view-as-report":
                return false;
            case "add-to-favorites":
                return false;
            case "save-query":
                this.saveQuery();
                return false;
            case "save-work-items":
                this.saveWorkitems();
                return false;
            case "refresh-work-items":
                this.refresh();
                return false;
            case "expand-all-nodes":
                this.expandAll();
                return false;
            case "collapse-all-nodes":
                this.collapseAll();
                return false;

            case "change-work-item-type":
                useWITDialogs().then(WITDialogs => WITDialogs.changeWorkItemType({
                    workItemIds: this.getSelectedWorkItemIds(),
                    tfsContext: this._options.tfsContext,
                    container: this._element
                }));
                return false;

            case "move-work-items":
                useWITDialogs().then(WITDialogs => WITDialogs.moveWorkItem({
                    workItemIds: this.getSelectedWorkItemIds(),
                    tfsContext: this._options.tfsContext,
                    container: this._element,
                    moveAcrossProjects: this._isQueryAcrossProject()
                }));
                return false;

            case QueryResultGrid.COMMAND_ID_EMAIL_QUERY_RESULT:
                this.emailResults();
                return false;

            case "share-link":
                this.shareLink();
                return false;
        }
    }

    public emailResults() {
        Diag.logTracePoint("SendMail.SendEmailQueryButtonClicked");

        if (this._workItemsProvider.isDirty()) {
            const alertText = Utils_String.format(Resources.ErrorEmailUnsavedQuery, this._workItemsProvider.queryDefinition.path());
            Dialogs.MessageDialog.showMessageDialog(alertText, {
                title: Resources.ErrorSendingEmail,
                buttons: [Dialogs.MessageDialog.buttons.ok]
            });
        } else {
            const queryDefinition = this._workItemsProvider.queryDefinition;
            const queryText = queryDefinition.queryText || this._workItemsProvider.originalQuery;

            VSS.requireModules(["Admin/Scripts/TFS.Admin.SendMail", "WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems"]).spread(
                (AdminSendMail: typeof AdminSendMail_Async, EmailWorkItems: typeof EmailWorkItemsModel_Async) => {
                    AdminSendMail.Dialogs.sendMail(new EmailWorkItems.EmailWorkItemsDialogModel({
                        queryResultsAdapter: {
                            queryId: queryDefinition.id,
                            queryName: queryDefinition.name,
                            queryText: queryText,
                            fields: this._workItemsProvider.getColumns(),
                            sortFields: this._workItemsProvider.getSortColumns(),
                            project: queryDefinition.project,
                            workItemStore: queryDefinition.project.store
                        }
                    }));
                });
        }
    }

    public getQueryContributionContext(): IQueryCommandContributionContext {
        const wids: number[] = this.getSelectedWorkItemIds();
        let query: TFS_Wit_Contracts.QueryHierarchyItem;
        let queryText: string;

        if (this._workItemsProvider) {
            const queryDef = this._workItemsProvider.queryDefinition;
            if (queryDef && queryDef.id) {
                query = QueryItemFactory.queryItemToQueryHierarchyItem(queryDef);
            }

            if (this._workItemsProvider.queryResultsModel) {
                queryText = this._workItemsProvider.queryResultsModel.wiql;
            }
        }

        return {
            query: query,
            queryText: queryText,
            workItemIds: wids
        }
    }

    public shareLink() {
        const workItemsProvider = this._workItemsProvider;

        const errorCallback = ((error) => {
            setCopyQueryURLButton(true);
            if (error && error.serverError && Utils_String.localeIgnoreCaseComparer(error.serverError.typeKey, "TemporaryDataTooLargeException") === 0) {
                error.message = Resources.CopyQueryURLDataTooLargeException;
            }
            this._statusUpdate(getErrorMessage(error));
        });
        const successCallback = (tempQueryId: string) => {
            QueryResultGrid.copyQueryUrl(this._options.tfsContext, tempQueryId);
            if (!workItemsProvider.isDirty()) {
                workItemsProvider.queryDefinition.tempQueryId = tempQueryId;
            }
            setCopyQueryURLButton(true);
        };

        const setCopyQueryURLButton = ((state: boolean) => {
            this._enableCopyQueryCommand = state;
            this._fire("commandStatusChanged");
        });

        if (!workItemsProvider.isDirty()
            && workItemsProvider.queryDefinition.tempQueryId) {
            QueryResultGrid.copyQueryUrl(this._options.tfsContext, workItemsProvider.queryDefinition.tempQueryId);
        } else {
            setCopyQueryURLButton(false);
            const queryType = workItemsProvider.queryDefinition.queryType;
            workItemsProvider.beginGetQueryText((wiql: string) => {
                TempQueryUtils.beginCreateTemporaryQueryId(this._options.tfsContext, wiql, queryType).then(successCallback, errorCallback);
            }, errorCallback);
        }
    }

    public restoreWorkItems(source: string = RecycleBinTelemetryConstants.TOOLBAR, errorCallback: (exception: Error) => void = (exception) => { this._statusUpdate(getErrorMessage(exception)) }) {
        WITControlsRecycleBinDialogShim.showRestoreConfirmationDialog(
            this._options.tfsContext,
            source,
            RecycleBinTelemetryConstants.WORK_ITEMS_VIEW_SOURCE,
            this.getSelectedWorkItemIds(),
            errorCallback);
    }

    public destroyWorkItems(source: string = RecycleBinTelemetryConstants.TOOLBAR, errorCallback: (exception: Error) => void = (exception) => { this._statusUpdate(getErrorMessage(exception)) }) {
        WITControlsRecycleBinDialogShim.showDestroyConfirmationDialog(
            this._options.tfsContext,
            source,
            RecycleBinTelemetryConstants.WORK_ITEMS_VIEW_SOURCE,
            this.getSelectedWorkItemIds(),
            errorCallback);
    }

    public getSelectedWorkItemId() {
        const index = this.getSelectedDataIndex();

        if (index >= 0) {
            return this._workItems[index];
        }

        return 0;
    }

    public getSelectedWorkItemIds(): number[] {
        let i, len,
            ids = [],
            workItems = this._workItems,
            indices = this.getSelectedDataIndices();

        for (i = 0, len = indices.length; i < len; i++) {
            ids.push(workItems[indices[i]]);
        }

        return ids;
    }

    public getSelectedWorkItemPageData(): IWorkItemPageData {
        let selectedWorkItemIds = this.getSelectedWorkItemIds(),
            i = 0,
            len = selectedWorkItemIds.length,
            pageData = [],
            workItemId: number;

        for (i = 0; i < len; i++) {
            workItemId = selectedWorkItemIds[i];
            pageData.push(this._pageData[workItemId]);
        }

        return {
            pageData: pageData,
            pageColumns: this._pageColumns
        };
    }

    /**
     * Selects and scrolls to the row in the grid associated with the given work item id.  Optionally, parent rows can be expanded.
     * @param workItemId The work item Id that should be selected.
     * @param expandNodes (Optional) True will expand any parent nodes necessary to show the row.
     * @param delayScroll (Optional) True will execute the scrolling at the end of the execution stack to ensure the grid has the updated height.
     */
    public setSelectedWorkItemId(workItemId: number, expandNodes?: boolean, delayScroll?: boolean) {
        let workItemDataIndex: number;

        if (this._workItems.length > 0) {

            Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

            workItemDataIndex = $.inArray(workItemId, this._workItems);

            if (workItemDataIndex >= 0) {
                this.setSelectedDataIndex(workItemDataIndex, expandNodes);
            }

            if (delayScroll) {
                // Executing at the end of the execution stack so that the grid will have the correct height rather than the old height.
                Utils_Core.delay(this, 0, function () {
                    this.getSelectedRowIntoView();
                });
            } else {
                this.getSelectedRowIntoView();
            }
        }
    }

    public selectedIndexChanged(selectedRowIndex, selectedDataIndex) {
        let workitemId;

        super.selectedIndexChanged(selectedRowIndex, selectedDataIndex);

        workitemId = this._workItems[selectedDataIndex];
        this._fire("selectedWorkItemChanged", [workitemId || 0]);
    }

    public selectionChanged(selectedIndex, selectedCount, selectedRows) {
        if (this._workItemsNavigator) {
            this._workItemsNavigator.update(this._expandedCount, this.getSelectedRowIndex(), this.getSelectedWorkItemId());
        }
        this._statusUpdate();
    }

    public getStatusText() {
        let statusText;

        if (this._emptyQueryResults) {
            statusText = Resources.QueryResultsNewQueryGridStatusText;
        }
        else if (this._count === 0) {
            statusText = this._workItemsProvider ? Resources.QueryResultsGridStatusNoResultsText : "";
        }
        else if (this._isLinkQuery) {
            statusText = Utils_String.format(Resources.QueryResultsGridLinkQueryStatusTextFormat, this._count, this._rootCount, this._count - this._rootCount, this._selectionCount);
        }
        else {
            statusText = Utils_String.format(Resources.QueryResultsGridStatusTextFormat, this._count, this._selectionCount);
        }

        return statusText;
    }

    /**
     * Primary text is used in NQE to show on the top of the two line status
     */
    public getPrimaryStatusText() {
        if (this._emptyQueryResults) {
            return "";
        } else if (this._count === 0) {
            return "";
        } else if (this._count === 1) {
            return Utils_String.format(Resources.WorkItemRemainingArtifactsDisplayStringSingular, this._count);
        } else {
            return Utils_String.format(Resources.WorkItemRemainingArtifactsDisplayStringPlural, this._count);
        }
    }

    /**
     * Secondary text is used in NQE to show on the bottom of the two line status
     */
    public getSecondaryStatusText() {
        if (this._emptyQueryResults || this._count === 0) {
            return "";
        } else if (this._isLinkQuery) {
            return Utils_String.format(Resources.QueryResultsGridLinkQueryStatusSecondaryTextFormat, this._rootCount, this._count - this._rootCount, this._selectionCount);
        }
        else {
            return Utils_String.format(Resources.QueryResultsGridNumSelectedSecondaryTextFormat, this._selectionCount);
        }
    }

    public setStatusText(statusText) {
        this._fire("statusUpdate", [statusText, false]);
    }

    public onOpenRowDetail(eventArgs) {
        if (QueryResultsProvider.isRecycleBinQueryResultsProvider(this._workItemsProvider) || !this._allowInteractionWithTitle) {
            // Disable when work items are deleted or when interaction with the grid is block (i.e. Linked Work Item Control)
            return false;
        }

        // There might be no items in the grid. We need to check this.
        if (eventArgs.dataIndex >= 0) {
            const workItemId = this._workItems[eventArgs.dataIndex];

            if (this._beforeOpenWorkItemCallback) {
                // Allow user to do work before
                this._beforeOpenWorkItemCallback()
                    .then(() => this._executeOpenWorkItemCommand(workItemId))
                    .then(null, VSS.handleError);
            } else {
                this._executeOpenWorkItemCommand(workItemId);
            }
        }

        // Event was handled
        return false;
    }

    protected _executeOpenWorkItemCommand(workItemId: number): void {
        const commandArgs = {
            id: workItemId,
            triage: true,
            tfsContext: this._options.tfsContext,
            options: {
                close: () => {
                    this.focus(1);
                    this.onOpenWorkItemClosed();
                }
            }
        };

        if (this._queriesHubContext) {
            this._queriesHubContext.navigationActionsCreator.navigateToWorkItem(workItemId, true);
        } else {
            if (workItemId > 0) {
                Menus.menuManager.executeCommand(new CommandEventArgs(WorkItemActions.ACTION_WORKITEM_OPEN, commandArgs, null));
            } else {
                commandArgs["workItemTypeName"] = WorkItemManager.get(this._store).getWorkItem(workItemId).workItemType.name;
                Menus.menuManager.executeCommand(new CommandEventArgs("new-work-item", commandArgs, null));
            }
        }
    }

    protected onOpenWorkItemClosed(): void { }

    /**
     * Refreshes the grid by re-running the query or using the same model
     * @param skipInvalidateResults Optional boolean If true we will use the same results for re-redering, Otherwiser it will run the query again
     */
    public refresh(skipInvalidateResults?: boolean) {
        this._refreshResults(null, null, skipInvalidateResults);
    }

    public onColumnChange(columns, sortColumns, added: string[], removed: string[]) {
        if (this._workItemsProvider && this._workItemsProvider.queryDefinition) {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_CHANGE_QUERY_COLUMNS,
                {
                    "queryDefinitionId": this._workItemsProvider.queryDefinition.id,
                    "addedColumns": added.join(),
                    "removedColumns": removed.join()
                }));
        }

        this._refreshResults(columns, sortColumns);
    }

    public onSort(sortOrder: any, sortColumns?: any): any {
        /// <param name="sortOrder" type="any" />
        /// <param name="sortColumns" type="any" optional="true" />
        /// <returns type="any" />

        const sortFields: ISortField[] = [];

        $.each(sortColumns, function (i, v) {
            sortFields.push(<ISortField>{
                name: v.name,
                asc: sortOrder[i].order === "asc"
            });
        });
        this._options.sortOrder = sortOrder;

        let executeServerSort: boolean = false;
        try {
            executeServerSort = !this._tryLocalSort(sortFields);
        } catch (e) {
            Diag.logError(e);
            VSSError.publishErrorToTelemetry({
                name: "UnexpectedExceptionDuringLocalSort",
                message: getErrorMessage(e)
            });

            executeServerSort = true;
        }

        if (executeServerSort) {
            this._refreshResults(<IQueryDisplayColumn[]>this.getFieldColumns(), sortFields);
        }
    }

    /**
     * Tries to sort the data locally
     */
    private _tryLocalSort(sortFields: ISortField[]): boolean {
        if (!this._workItemsProvider) {
            return false;
        }
        let numberOfPagedWorkItems = 0;
        let numberOfWorkItemsToSort = 0;

        if (this._pageData) {
            numberOfPagedWorkItems = Object.keys(this._pageData).length;
        }
        if (this._filterApplied) {
            numberOfWorkItemsToSort = this._unfilteredWorkItems.length;
        }
        else {
            numberOfWorkItemsToSort = this._workItems.length;
        }


        const workitemStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);

        if (!Boolean(workitemStore.fieldMap)) {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                QueryResultGrid.LOCAL_SORT_FEATURE, {
                    pagedWorkItemCount: numberOfPagedWorkItems,
                    workItemCount: numberOfWorkItemsToSort,
                    gridIsFiltered: this._filterApplied,
                    fieldsNotAvailable: true
                }));
            return false;
        }

        if (this._hasMoreResults || numberOfWorkItemsToSort > QueryResultGrid.MAX_WORKITEMS_LOCALSORT) {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                QueryResultGrid.LOCAL_SORT_FEATURE,
                {
                    workItemsToSort: numberOfWorkItemsToSort,
                    gridIsFiltered: this._filterApplied,
                    tooManyItemsToSort: true
                }));
            return false;
        }

        // We do not have all the rows locally
        if (numberOfPagedWorkItems !== numberOfWorkItemsToSort) {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                QueryResultGrid.LOCAL_SORT_FEATURE, {
                    pagedWorkItemCount: numberOfPagedWorkItems,
                    workItemCount: numberOfWorkItemsToSort,
                    gridIsFiltered: this._filterApplied,
                    notAllItemsPaged: true
                }));
            return false;
        }

        const sortStart = Date.now();
        // Set the sortOrder, fieldIndex and comparer
        const sortOrder: { index: number, order: string }[] = [];

        for (let i = 0, l = sortFields.length; i < l; i++) {
            const field = sortFields[i];
            if (field.name in this._displayColumnsMap) {
                sortOrder.push({ index: this._displayColumnsMap[field.name], order: field.asc ? "asc" : "desc" });
            }
            const fieldDefinition = workitemStore.getFieldDefinition(field.name);
            const fieldIndex = this._pageColumnMap[field.name];
            field.fieldIndex = fieldIndex;
            if (typeof fieldIndex === "number") {
                if (WITOM.Field.isNumericField(fieldDefinition.type)) {
                    field.comparer = Utils_Number.defaultComparer;
                } else if (fieldDefinition.type === WITConstants.FieldType.DateTime) {
                    field.comparer = QueryResultGrid._dateComparer;
                } else {
                    field.comparer = Utils_String.localeIgnoreCaseComparer;
                }
            }
        }

        // Build a map for source to target ids
        const sourceToTargetLinks: IDictionaryNumberTo<number[]> = QueryResultGrid.calculateParentToChildWorkItemIds(this._parentWorkItemIds, this.getUnfilteredWorkItemIds());

        // Sort the workitems
        const roots = Object.keys(sourceToTargetLinks);
        for (let i = 0; i < roots.length; i++) {
            const workItemIds = sourceToTargetLinks[roots[i]];
            sourceToTargetLinks[roots[i]] = this._sortWorkItems(workItemIds, sortFields);
        }

        // Recalculate sourceIds, targetIds and linkIds.
        const queryResultGridTreeData: IProcessedQueryResultsGridTreeData = <IProcessedQueryResultsGridTreeData>{
            sourceIds: [],
            targetIds: [],
            linkIds: [],
            parentToChildWorkItemIds: sourceToTargetLinks
        };
        QueryResultGrid.calculateSourceTargetsAndLinks(queryResultGridTreeData, 0);
        const sortEnd = Date.now();
        // Update the data in workItemProvider
        if (sortFields) {
            this._workItemsProvider.setSortColumns($.map(sortFields, function (sc) { return { name: sc.name, descending: !sc.asc }; }));
        }

        this._workItemsProvider.beginGetResults((queryResultsModel: IQueryResult) => {
            queryResultsModel.sourceIds = queryResultGridTreeData.sourceIds;
            queryResultsModel.targetIds = queryResultGridTreeData.targetIds;
            queryResultsModel.linkIds = queryResultGridTreeData.linkIds;

            this._workItemsProvider._updateModel(queryResultsModel);

            const oldValue = this._options.dontDeleteCache;
            this._options.dontDeleteCache = true;
            try {
                this.updateDataModel(queryResultsModel);
            } catch (e) {
                this._options.dontDeleteCache = oldValue;
                throw e;
            }

            if (this._filterApplied) {
                this.filterWorkItems(this.getFilterManager().filter());
                this._updateFilterMessage();
            }
            const updateDataEnd = Date.now();
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                QueryResultGrid.LOCAL_SORT_FEATURE, {
                    workItemsToSort: numberOfWorkItemsToSort,
                    columnsSorted: sortFields.length,
                    sortTime: sortEnd - sortStart,
                    refreshTime: updateDataEnd - sortEnd,
                    totalTime: updateDataEnd - sortStart
                }));
        });
        return true;
    }

    /**
     * This comparer was created because in the past WebPlatform was providing a
     * Utils_Date.compare function that was using reverse order than Utils_String.compare* and Utils_Number.compare*
     * creating this custom comparer to mimic server side sort
     * WebPlatform has now the defaultComparer which already mimics the server side sort
     * @param date1 Date object to compare
     * @param date2 Date object to compare
     * @return
     */
    public static _dateComparer(date1: Date, date2: Date): number {
        return Utils_Date.defaultComparer(date1, date2);
    }

    /**
     * Updates the linkIds, sourceIds and targetIds based on the parent to child map
     * @param data - IProcessedQueryResultsGridTreeData with parentToChildWorkItemIds filled in
     */
    public static calculateSourceTargetsAndLinks(data: IProcessedQueryResultsGridTreeData, parent: number): void {
        if (data.parentToChildWorkItemIds) {
            const children = data.parentToChildWorkItemIds[parent];
            if (children) {
                children.forEach((c: number) => {
                    data.sourceIds.push(parent);
                    data.targetIds.push(c);
                    data.linkIds.push(parent === 0 ? 0 : 2);
                    QueryResultGrid.calculateSourceTargetsAndLinks(data, c);
                });
            }
        }
    }

    /**
     * Calculates parent to child work item ids map
     * @param sourceIds - Array of source ids
     * @param targetIds - Array of target ids
     * @returns a map of source to targets
     */
    public static calculateParentToChildWorkItemIds(sourceIds: number[], targetIds: number[]): IDictionaryNumberTo<number[]> {
        const result: IDictionaryNumberTo<number[]> = {};
        if (!sourceIds || sourceIds.length === 0) {
            result[0] = targetIds || [];
            return result;
        }

        Diag.Debug.assertIsArray(targetIds, "TargetIds must be an array.");
        Diag.Debug.assert(sourceIds.length === targetIds.length, "Source and targets do not have same length");

        for (let i = 0; i < sourceIds.length; i++) {
            const parent = sourceIds[i];
            const child = targetIds[i];
            if (!result[parent]) {
                result[parent] = [];
            }
            result[parent].push(child);
        }

        return result;
    }

    private _sortWorkItems(workItemIds: number[], sortFields: ISortField[]): number[] {

        // Adding ID field at the end so we always sort by atleast id field
        const fieldsToSortOn: ISortField[] = jQuery.extend(true, [], sortFields);
        const idFieldIndex = this._pageColumnMap[WITConstants.CoreFieldRefNames.Id];
        if (typeof idFieldIndex === "number") {
            fieldsToSortOn.splice(fieldsToSortOn.length, 0, <ISortField>{
                asc: true,
                name: WITConstants.CoreFieldRefNames.Id,
                comparer: Utils_Number.defaultComparer,
                fieldIndex: idFieldIndex
            });
        }

        return workItemIds.sort((a: number, b: number) => {
            const first = this._pageData[a];
            const second = this._pageData[b];
            let result = 0;
            for (let i = 0; i < fieldsToSortOn.length; i++) {
                const field = fieldsToSortOn[i];
                const fieldIndex = field.fieldIndex;
                if (typeof fieldIndex === "number") {
                    result = QueryResultGrid.fieldValueComparer(field.comparer, first[fieldIndex], second[fieldIndex]);
                    if (result !== 0) {
                        if (!field.asc) {
                            result = result * -1;
                        }
                        return result;
                    }
                }
            }
            return result;
        });
    }

    /**
     * Gets the list of work item ids that failed to read in PageWorkItems call. This can happen if work items don't exist due to delete or destroy
     * @param workItemIds - array of work item ids passed to PageWorkItems call
     * @param payload - payload of PageWorkItems response 
     * @returns array of unpaged work item ids
     */
    private _getUnpagedWorkItems(workItemIds: number[], payload): number[] {
        let unpagedItems: number[] = [];
        if (payload) {
            let idIndex: number;
            if (payload.columns) // Special queries like "Unsaved work items" will not have payload columns
            {
                idIndex = $.inArray(WITConstants.CoreFieldRefNames.Id, payload.columns);
                Diag.Debug.assert(idIndex !== -1, "id field '" + WITConstants.CoreFieldRefNames.Id + "' was not found in payload.columns.");
            }

            let pagedItems = [];
            if (payload.rows && payload.rows.length > 0) {
                if (payload.rows.length === workItemIds.length) {
                    return unpagedItems;
                }

                pagedItems = $.map(payload.rows, (row => { return row[idIndex] }));
            }

            unpagedItems = Utils_Array.subtract(workItemIds, pagedItems);
        }

        return unpagedItems;
    }

    /**
     * Mimics server comparer where it treats nulls/empty string as infinity.
     * @param - originalComparer - The clientComparer to use when values are not null
     * @param - value1 - The first value
     * @param - value2 - The second value
     * @returns - 0 if both values are equal, -1 when first Value is smaller than second , 1 when second value is smaller than first
     */
    public static fieldValueComparer(clientComparer: (value1: any, value2: any) => number, value1: any, value2: any): number {
        Diag.Debug.assert(!!clientComparer, "Original comparer should be specified.");

        const firstValueIsEmpty: boolean = (value1 === null || value1 === "" || value1 === undefined);
        const secondValueIsEmpty: boolean = (value2 === null || value2 === "" || value2 === undefined);
        if (firstValueIsEmpty && secondValueIsEmpty) {
            return 0;
        }
        else if (firstValueIsEmpty) {
            return 1;
        }
        else if (secondValueIsEmpty) {
            return -1;
        }

        return clientComparer(value1, value2);
    }

    public _onColumnResize(column) {
        super._onColumnResize(column);
        if (this._workItemsProvider) {
            this._workItemsProvider.setColumnWidth(column.name, column.width);
            this._workItemsProviderVersion = this._workItemsProvider.getVersion();
        }
    }

    public _onColumnMove(sourceIndex, targetIndex) {
        super._onColumnMove(sourceIndex, targetIndex);
        if (this._workItemsProvider) {
            this._workItemsProvider.setColumns(<IQueryDisplayColumn[]>this.getFieldColumns());
        }
    }

    /**
     * @param dataIndex index for the row data in the data source
     * @param columnIndex index of the column's data in the row's data array
     * @param columnOrder index of the column in the grid's column array. This is the current visible order of the column
     */
    public getColumnValue(dataIndex: number, columnIndex: number, columnOrder?: number): any {
        let workitemId: number, linkId, workItem, fieldIndex, column;

        column = this._displayColumns[columnIndex];

        if (column == null) {
            return "";
        }

        if (column.fieldId === WITConstants.CoreField.LinkType) {
            linkId = this._links[dataIndex];

            if (!linkId) {
                return "";
            }
            else if (this._ensureLinkTypesFetched()) {
                return this._store.findLinkTypeEnd(linkId).name;
            }
            else {
                return "";
            }
        }
        else {
            workitemId = this._workItems[dataIndex];

            if (column.fieldId === WITConstants.CoreField.Id) {
                if (workitemId > 0) {
                    return workitemId;
                }
                else {
                    return "(" + (-workitemId) + ")";
                }
            }
            else {
                workItem = this._pageData[workitemId];

                if (!workItem) {
                    return "";
                }

                fieldIndex = this._pageColumnMap[column.name];

                if (typeof fieldIndex === "number") {
                    let fieldValue = WITOM.Field.convertValueToDisplayString(workItem[fieldIndex]);
                    if ((column.fieldType === WITConstants.FieldType.Html || column.fieldType === WITConstants.FieldType.History)) {
                        fieldValue = HtmlNormalizer.convertToPlainText(fieldValue);
                        return Utils_String.decodeHtmlSpecialChars(fieldValue)
                    }
                    else {
                        return fieldValue;
                    }

                }
            }
        }

        return "";
    }

    public buildCache(payload: IQueryResultPayload, dontDeleteCache?: boolean): void {
        let i, l,
            row,
            id,
            idIndex,
            workItem: WITOM.WorkItem,
            wiManager = WorkItemManager.get(this._store);
        let revIndex, revision;

        if (payload) {
            if (payload.columns) // Special queries like "Unsaved work items" will not have payload columns
            {
                idIndex = payload.columns.indexOf(WITConstants.CoreFieldRefNames.Id);
                Diag.Debug.assert(idIndex !== -1, "id field '" + WITConstants.CoreFieldRefNames.Id + "' was not found in payload.columns.");
                revIndex = payload.columns.indexOf(WITConstants.CoreFieldRefNames.Rev);
                Diag.Debug.assert(revIndex !== -1, "revision field '" + WITConstants.CoreFieldRefNames.Rev + "' was not found in payload.columns.");
            }

            for (i = 0, l = payload.rows.length; i < l; i++) {
                row = payload.rows[i];
                id = row[idIndex || 0];
                revision = row[revIndex || 0];
                this._updatePageData(id, row);

                // update latest data that we have in the work item manager cache
                workItem = wiManager.getWorkItem(id);
                if (workItem) {
                    // If the workitem revision from manager is greater than query model revision, then we update the row.
                    // This can happen in NQE when workitem is updated by double clicking the grid
                    if (workItem.isDirty() || workItem.revision > revision) {
                        this._updatePageRow(workItem);
                    }
                    else if (!dontDeleteCache && !this._options.dontDeleteCache) {
                        // If the revision of the workitem is changed then we will unpin the workitem so the workitemmanager cache is invalidated
                        if (workItem.revision !== revision) {
                            wiManager.unpin(workItem);
                        }
                        wiManager.invalidateCache([id]);
                    }
                }
            }

            if (this._filterManager) {
                this._filterManager.dataUpdated();
            }
        }
    }

    /**
     * Gets a unique set of selected work item type names
     * If there are unpaged work items, the page data returns an empty string
     * If there are unpaged work items, we do not do any scoping around the Fields retrieved 
     * for the bulk edit dialog
     */
    public getSelectedWorkItemTypes(): string[] {
        const workItemTypes: IDictionaryStringTo<boolean> = {};

        for (const workItemId of this.getSelectedWorkItemIds()) {
            const type = this.getWorkItemTypeNameById(workItemId);
            if (!type || type === "") {
                // Handle unpaged
                return [];
            }
            workItemTypes[type] = true;
        }
        return Object.keys(workItemTypes);
    }

    public getSelectedWorkItemProjectNameMapping(): IDictionaryNumberTo<string> {
        const projectNameMapping: IDictionaryNumberTo<string> = {};

        for (const workItemId of this.getSelectedWorkItemIds()) {
            const projectName = this.getWorkItemProjectNameById(workItemId);
            if (!projectName) {
                //Handling unpaged
                projectNameMapping[workItemId] = null;
            }
            else {
                projectNameMapping[workItemId] = projectName;
            }
        }

        return projectNameMapping;
    }

    public getSelectedWorkItemProjectTypeMapping(): IDictionaryStringTo<string[]> {
        const projectToTypeMapping: IDictionaryStringTo<string[]> = {};

        for (const workItemId of this.getSelectedWorkItemIds()) {
            const project = this.getWorkItemProjectNameById(workItemId);
            if (!project) {
                continue;
            }

            const type = this.getWorkItemTypeNameById(workItemId);
            if (!type) {
                continue;
            }

            if (!$.isArray(projectToTypeMapping[project])) {
                projectToTypeMapping[project] = [];
            }

            projectToTypeMapping[project].push(type);
        }

        return projectToTypeMapping;
    }

    /** Update single row in pageData
     * @param id Id of work item
     * @param row Page data row
     */
    protected _updatePageData(id: number, row: any) {
        // Slice the payload data to make sure we are not building pageData cache based on the same object reference
        this._pageData[id] = row.slice(0);
    }

    public _changeWorkItemIdInLastVisibleRange(oldId: number, newId: number) {
        const data = this._workItemsInLastVisibleRange[oldId];
        if (data) {
            this._workItemsInLastVisibleRange[newId] = data;
            delete this._workItemsInLastVisibleRange[oldId];
        }
    }

    public cacheRows(aboveRange, visibleRange, belowRange) {
        this._lastVisibleRange = visibleRange;
        this._workItemsInLastVisibleRange = {};
        $.each(visibleRange, (index, element) => {
            const id = this._workItems[element[1]];
            // For links query same workitem can be at different index, so storing all the index of the workitem
            if (this._workItemsInLastVisibleRange[id]) {
                this._workItemsInLastVisibleRange[id].push({ rowIndex: element[0], dataIndex: element[1] })
            }
            else {
                this._workItemsInLastVisibleRange[id] = [{ rowIndex: element[0], dataIndex: element[1] }];
            }

        });

        // no need to delay grid's row updates it is going to be async anyways
        this.delayExecute("updateWorkItemCache", 0, true, () => {
            this._updateWorkItemCache(aboveRange, visibleRange, belowRange);
        });
    }

    public _pageWorkItems(operationCompleteCallback?: (...args: any[]) => any, dontRedraw?: boolean) {
        /// <summary>Pages necessary work items</summary>
        /// <param name="operationCompleteCallback" type="Function"></param>
        /// <param name="dontRedraw" type="Boolean" optional="true">Dont redraw the grid. Introduced for copy all scenario where we dont want to incur the redraw cost since nothing changes</param>

        if (!this._fetching) {
            const workitems = [];
            const workItemsHash = {};
            const queryResultsProvider = QueryResultsProvider.isRecycleBinQueryResultsProvider(this._workItemsProvider);
            const optionalRequestParams = {};
            if (queryResultsProvider) {
                $.extend(optionalRequestParams, { isDeleted: true });
            }

            while (this._workItemsNeeded.length > 0 && workitems.length < PageSizes.QUERY) {
                const id = this._workItemsNeeded.pop();

                if (id && !(id in this._pageData) && !(id in workItemsHash)) {
                    workitems[workitems.length] = id;
                    workItemsHash[id] = true;
                }
            }

            this._workItemsNeeded = [];

            if (workitems.length > 0) {
                this._fetching = true;

                this._store.beginPageWorkItems(workitems, this._pageColumns, (pagingData) => {
                    if (!this.isDisposed()) {
                        if (this._fetching) {
                            this._fetching = false;

                            const unpagedItems = this._getUnpagedWorkItems(workitems, pagingData);
                            if (unpagedItems.length > 0) {
                                if (isVisualizeFollowsEnabled(this._store.getTfsContext())) {
                                    this.removeWorkItems(unpagedItems);
                                }
                                this._workItemsFailedToFetch = Utils_Array.union(this._workItemsFailedToFetch, unpagedItems);
                            }

                            this.buildCache(pagingData);
                            if (!dontRedraw) {
                                this.redraw();
                            }
                        }
                    }

                    if ($.isFunction(operationCompleteCallback)) {
                        operationCompleteCallback();
                    }
                }, () => { }, <any[]>optionalRequestParams);
            }
            else if ($.isFunction(operationCompleteCallback)) {
                operationCompleteCallback();
            }
        }
    }

    public workItemChanged(sender: any, args?: any) {
        /// <summary>Handles in-memory work item change events</summary>
        /// <param name="sender" type="Object">The sender</param>
        /// <param name="args" type="Object">Event arguments that include:
        /// {
        ///     change: <string> The type of change that is occurring on the work item
        ///     workItem: <Object> The work item that has changed
        /// }
        /// </param>
        Diag.Debug.assertParamIsObject(args, "args");

        Diag.Debug.assert(args.workItem, "workItem should be passed with work item changed arguments");
        Diag.Debug.assert(args.change, "change type should be passed with work item changed arguments");

        if (args.change === WorkItemChangeType.PreSave || args.change === WorkItemChangeType.Saving) {
            return;
        }

        const workItem: WITOM.WorkItem = args.workItem;

        let columnsUpdated: { [id: number]: boolean };
        if (args.change === WorkItemChangeType.FieldChange) {
            // If a field has been changed, we only update the columns which contain changed
            // values
            columnsUpdated = {};
        }

        const id = workItem.getUniqueId();
        const pageDataUpdated: boolean = this._updatePageRow(workItem, columnsUpdated);
        const workItemChanged: boolean = this._didWorkItemChange(workItem);

        // The page data can be updated on Open if a newer revision of the workitem is retrieved from the server,
        // however if the page data remains unchanged on Open, there is no need to update the visible row.
        // The grid should also be updated if a non-column change (e.g. repro steps) flips the dirty state.
        if (pageDataUpdated || (args.change !== WorkItemChangeType.Opened && workItemChanged)) {
            const rowInfo = this._workItemsInLastVisibleRange[id];
            if (rowInfo) {
                // Updating all the rows for a particular id.
                for (const row of rowInfo) {
                    this.updateRow(row.rowIndex, row.dataIndex, columnsUpdated);
                }
            }

            this._updateDirtyStatus([id]);

            if (this._filterManager && args.change === WorkItemChangeType.FieldChange) {
                this._filterManager.dataUpdated();
            }
        }
    }

    private _didWorkItemChange(workItem: WITOM.WorkItem): boolean {
        const dirty = workItem.isDirty();
        const valid = workItem.isValid();
        const changed = this._dirtyWorkItems[workItem.id] !== dirty || this._validWorkItems[workItem.id] !== valid;
        this._dirtyWorkItems[workItem.id] = dirty;
        this._validWorkItems[workItem.id] = valid;

        return changed;
    }

    public initializeDirtyWatch() {
        this._managedWorkItems = {};
        this._pendingManaged = null;
        this._dirtyWorkItems = {};
        this._validWorkItems = {};
        this._pendManagedWorkItemIds($.map(WorkItemManager.get(this._store).getManagedWorkItems(), function (wi: WITOM.WorkItem) {
            return wi.getUniqueId();
        }));
    }

    public getWorkItemIds() {
        return this._workItems.slice(0);
    }

    public isRealWorkItem(id: number): boolean {
        return true;
    }

    public getUnfilteredWorkItemIds(): number[] {
        //// <summary>Returns the workitems for the grid prior to filtering.  If no filter is applied, returns all the work item ids in the grid.</summary>
        const unfiltered = (this._filterApplied) ? this._unfilteredWorkItems : this._workItems;
        return unfiltered.slice(0);
    }

    public getUnfilteredExpandStates(): number[] {
        /// <summary>Returns the expand states for the grid prior to filtering.  If no filter is applied, returns the current expandStates</summary>
        if (this._filterApplied) {
            return this._unfilteredExpandStates;
        } else {
            return this._options.expandStates;
        }
    }

    public setUnfilteredExpandStates(expandStates: number[]) {
        /// <summary>Updates the expand states for the grid in the unfiltered state. If the grid is filtered, it won't affect the grid but update the cached unfiltered state instead.</summary>
        /// <param name="expandStates" type="Array">The expand states desired once the filter is removed.</param>
        if (this._filterApplied) {
            this._unfilteredExpandStates = expandStates;
        } else {
            this._options.expandStates = expandStates;
        }
    }

    public saveQuery() {
        this._workItemsProvider.invalidateResults();
        this._workItemsProvider.beginSave(null, (e) => { this._statusUpdate(e); });
    }

    public saveWorkitems(errorCallback?) {
        let dirtyWorkItems = [], that = this;

        if (!this._saving) {
            dirtyWorkItems = this._getDirtyWorkItems();

            if (dirtyWorkItems.length > 0) {
                this._saving = true;
                $(this).trigger("savingWorkItems");
                const workItemSavePerfScenario: Performance.IScenarioDescriptor = PerfScenarioManager.startScenario(
                    CIConstants.WITPerformanceScenario.WORKITEM_BULKSAVE,
                    false);
                workItemSavePerfScenario.addData({ "PathName": "QueryGridBulkSave" });
                workItemSavePerfScenario.addData({ "DirtyWorkItemsCount": dirtyWorkItems.length });

                this._store.beginSaveWorkItemsBatch(dirtyWorkItems, function () {
                    if (workItemSavePerfScenario) {
                        workItemSavePerfScenario.addSplitTiming(
                            CIConstants.PerformanceEvents.WORKITEM_SAVE_COMPLETE);
                    }

                    that._saving = false;
                    that.redraw();
                    $(that).trigger("workItemsSaved");
                    Diag.logTracePoint("QueryResultGrid.saveWorkItems.success");
                    if (workItemSavePerfScenario) {
                        workItemSavePerfScenario.end();
                    }
                },
                    function (error) {
                        if (workItemSavePerfScenario) {
                            workItemSavePerfScenario.abort();
                        }
                        that._saving = false;
                        that.redraw();

                        const errorHtml = getBulkSaveErrorMessageHtml(error, dirtyWorkItems.length);
                        if (errorHtml) {
                            Dialogs.MessageDialog.showMessageDialog(errorHtml, {
                                title: Resources.TriageViewSaveErrorTitle,
                                buttons: [Dialogs.MessageDialog.buttons.ok]
                            });
                        }
                        else {
                            handleError(error, errorCallback, that);
                        }
                        $(that).trigger("workItemsSaveError");
                    });
            }
        }
    }

    public beginPageSelectedWorkItems(operationCompleteCallback: (...args: any[]) => any, errorCallback?: IErrorCallback, dontRedraw?: boolean) {
        /// <summary>Ensures thatthe work items in the selection are paged down to the client and available.</summary>
        /// <param name="itemsAvailableCallback" type="IResultCallback">A callback function invoked when the operation has completed without error.</param>
        /// <param name="errorCallback" type="IErrorCallback">A callback function invoked when an error has occurred during the operation.</param>
        /// <param name="dontRedraw" type="Boolean" optional="true">Dont redraw the grid. Introduced for copy all scenario where we dont want to incur the redraw cost since nothing changes</param>

        let maxNumberOfPages: number;
        let totalPagesReceived: number;
        let grid: QueryResultGrid;
        const selectedWorkItemIds = this.getSelectedWorkItemIds();

        function handlePageWorkItemsComplete() {
            let pageBeginIndex;

            if (this._cancelable && this._cancelable.canceled) {
                if ($.isFunction(operationCompleteCallback)) {
                    operationCompleteCallback();
                }

                return;
            }

            totalPagesReceived += 1;

            if (totalPagesReceived < maxNumberOfPages) {
                pageBeginIndex = totalPagesReceived * PageSizes.QUERY;

                grid._workItemsNeeded = selectedWorkItemIds.slice(pageBeginIndex, pageBeginIndex + PageSizes.QUERY);
                grid._pageWorkItems(delegate(grid, handlePageWorkItemsComplete), dontRedraw);
            }
            else if ((totalPagesReceived >= maxNumberOfPages) && ($.isFunction(operationCompleteCallback))) {
                Diag.logTracePoint("TFS.WorkItemTracking.Controls.Query.beginPageSelectedWorkItems.complete");
                operationCompleteCallback();
            }
        }

        Diag.logTracePoint("TFS.WorkItemTracking.Controls.Query.beginPageSelectedWorkItems.start");

        if (selectedWorkItemIds && selectedWorkItemIds.length > 0) {

            // If we have more than one page, we need to page in all pages in sequence
            // waiting for the last one to complete either successfully or not.  Once the final
            // page has been paged in, this function may invoke the specified callback if supplied.

            maxNumberOfPages = Math.ceil(selectedWorkItemIds.length / PageSizes.QUERY);
            totalPagesReceived = 0;
            grid = this;

            // TODO [ryanvog]: Do we need to preserve the work item needed cache here?
            grid._workItemsNeeded = selectedWorkItemIds.slice(0, PageSizes.QUERY - 1);
            grid._pageWorkItems(delegate(grid, handlePageWorkItemsComplete), dontRedraw);
        }
        else {
            Diag.logTracePoint("TFS.WorkItemTracking.Controls.Query.beginPageSelectedWorkItems.complete");
            operationCompleteCallback();
        }
    }

    public getWorkItemIdAtDataIndex(dataIndex: number): number {
        /// <summary>Gets the ID of the work item at the provided data index.</summary>
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        return this._workItems[dataIndex];
    }

    private _createFilterManager() {
        Diag.Debug.assert(this._filterManager === null, "Filter manager should not be re-initialized");

        this._filterManager = new FilterManager(this);

        this._bindFilterManagerEvents();
    }

    private _onFilterChanged = () => {
        this._applyFilter();
    };

    private _onUnfilter = () => {
        this.restoreUnfilteredState();
    };

    private _onFilterActivated = () => {
        this._pageFirstThousand();
    };

    private _bindFilterManagerEvents() {
        Diag.Debug.assertIsNotNull(this._filterManager, "Filter Manager should not be null while binding events");
        this._filterManager.attachEvent(FilterManager.EVENT_FILTER_CHANGED, this._onFilterChanged);
        this._filterManager.attachEvent(FilterManager.EVENT_FILTER_CLEARED, this._onUnfilter);
        this._filterManager.attachEvent(FilterManager.EVENT_FILTER_DEACTIVATED, this._onUnfilter);
        this._filterManager.attachEvent(FilterManager.EVENT_FILTER_ACTIVATED, this._onFilterActivated);
    }

    private _unbindFilterManagerEvents() {
        if (this._filterManager) {
            this._filterManager.detachEvent(FilterManager.EVENT_FILTER_CHANGED, this._onFilterChanged);
            this._filterManager.detachEvent(FilterManager.EVENT_FILTER_CLEARED, this._onUnfilter);
            this._filterManager.detachEvent(FilterManager.EVENT_FILTER_DEACTIVATED, this._onUnfilter);
            this._filterManager.detachEvent(FilterManager.EVENT_FILTER_ACTIVATED, this._onFilterActivated);
        }
    }

    /**
     * Sets the given work item ids as filtered work items
     * @param - ids - filtered list of work items
     * @param - force? - Weather to force filter if the Grid is already filtered
     */
    public filterWorkItems(ids: number[], force?: boolean): void {
        Diag.Debug.assertParamIsArray(ids, "ids");

        const previouslySelectedWorkItemId: number = this.getSelectedWorkItemId();

        if (this._filterApplied === false || force) {
            // save the old source (if it hasn't been saved already)
            if (this._unfilteredWorkItems === null) {
                this._unfilteredWorkItems = this.getWorkItemIds();
            }
            if (this._unfilteredExpandStates === null) {
                this._unfilteredExpandStates = this._options.expandStates;
            }

            // save the old query type (if it hasn't been saved already)
            if (this._unfilteredIsLinkQuery === null) {
                this._unfilteredIsLinkQuery = this._isLinkQuery;
            }
            if (this._unfilteredIsTreeQuery === null) {
                this._unfilteredIsTreeQuery = this._isTreeQuery;
            }
        }

        // persist the column order
        this._options.columns = this._columns;

        ids = this._sortAndRemoveDuplicates(ids, this._unfilteredWorkItems);

        // overwrite the workitems
        this._options.source = ids;
        this._workItems = ids;

        // overwrite the expand states. this makes everything flat
        this._options.expandStates = null;

        // overwrite the query type
        this._isLinkQuery = false;
        this._isTreeQuery = false;

        // Set the 
        this._filterApplied = true;

        this.initializeDataSource();

        this.setSelectedWorkItemId(previouslySelectedWorkItemId, true, true);

        this._updateFilterMessage();

        Diag.logTracePoint("Grid.filteringComplete");

        if (this._queriesHubContext) {
            this._queriesHubContext.triageViewActionCreator.applyFilters(ids, this._filterManager.getFilters());
        }

    }

    /**
     * Removes the given work item ids from the grid and set selection.
     * @param workItemIds array of work item ids to remove.
     */
    public removeWorkItems(workItemIds: number[]) {
        const previouslySelectedIndex = this.getSelectedDataIndex();
        const provider = this._workItemsProvider;
        if (provider) {
            // remove work item from datasource.
            for (let i = 0; i < workItemIds.length; i++) {
                const idToRemove = workItemIds[i];
                provider.removeWorkItem(idToRemove);
            }

            // update datasource of grid view.
            const queryResultsModel = provider.queryResultsModel;
            this.processDataSource(queryResultsModel, false);
            this.initializeDataSource();

        }
        this.setRowSelection(previouslySelectedIndex);
    }

    /**
     * Set row selection
     *
     * @param selectionIndex - Index to set selection.
     */
    public setRowSelection(selectionIndex: number) {
        if (selectionIndex >= this.getLastRowDataIndex()) {
            selectionIndex = this.getLastRowDataIndex() - 1;
        }
        if (selectionIndex >= 0) {
            this.setSelectedDataIndex(selectionIndex);
            this.getSelectedRowIntoView();
        }
    }

    public restoreUnfilteredState(suppressRedraw: boolean = false) {
        /// <summary>Returns the grid to its unfiltered state.</summary>
        let previouslySelectedWorkItemId: number;

        if (this._filterApplied === true && this._unfilteredWorkItems) {

            if (!suppressRedraw) {
                // Only need to get this when we're actually going to draw
                previouslySelectedWorkItemId = this.getSelectedWorkItemId();
            }

            this._reinstateUnfilteredData();
            this._clearCachedFilterValues();

            // persist the column order
            this._options.columns = this._columns;

            this.initializeDataSource(suppressRedraw);

            if (!suppressRedraw) {
                // When we're supressing redraw we dont want the grid to scroll to the selected workitem
                this.setSelectedWorkItemId(previouslySelectedWorkItemId, true, true);
            }

            Diag.logTracePoint("QueryResultGrid.restoreUnfilteredStateComplete");
        }

        this._updateFilterMessage();
    }

    public isFiltered() {
        return this._filterApplied;
    }

    private _onNavigateNext() {
        let rowIndex = this.getSelectedRowIndex();
        if (rowIndex < this._count - 1) {
            rowIndex++;
            this.setSelectedRowIndex(rowIndex);
            this.getSelectedRowIntoView();
            // The grid loses its focus when navigating to next/prev items. So focusing back to the grid.
            this.focus();
        }
    }

    private _onNavigatePrevious() {
        let rowIndex = this.getSelectedRowIndex();
        if (rowIndex > 0) {
            rowIndex--;
            this.setSelectedRowIndex(rowIndex);
            this.getSelectedRowIntoView();
            // The grid loses its focus when navigating to next/prev items. So focusing back to the grid.
            this.focus();
        }
    }

    private _onGetMenuItemActionArguments(menuItem: Menus.MenuItem) {
        return this.getActionArguments(menuItem.getAction(), QueryResultGrid.enhancementTypeName);
    }

    private _updateCommandStates(menu) {
        /// <summary>Updates the state of all the commands used on the context menu, returning
        /// those which should be disabled. </summary>
        /// <return>An array of command ids designed to be disabled.</return>

        menu.updateCommandStates(this.getCommandStates());
    }

    // protected method used by ProductBacklog
    protected _getDefaultActionArguments(contextInfo): IQueryResultGridContextMenuArguments {
        return {
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            id: this._workItems[contextInfo.rowInfo.dataIndex],
            selectedWorkItems: this.getSelectedWorkItemIds(),
            selectedWorkItemProjectTypeMapping: this.getSelectedWorkItemProjectTypeMapping()
        };
    }

    public _determineIndentIndex() {
        // If the query type is tree or one-hop query add the indent index to title
        if (this._isLinkOrTreeQuery()) {
            let i, l, columns = this.getFieldColumns(), displayColumns = this._displayColumns;

            this._indentIndex = this._isShowingExpandCollapseColumns ? 2 : 0;  // start with 2 because the 1st 2 columns are expand and collapse buttons
            for (i = 0, l = columns.length; i < l; i++) {
                if (displayColumns[columns[i].index].name === WITConstants.CoreFieldRefNames.Title) {
                    this._indentIndex += i;
                    break;
                }
            }

        }
        else {
            // Setting the indent index to -1 to override the default value "0". We dont want to indent the first column.
            this._indentIndex = -1;
        }
    }

    public _statusUpdate(error?: any) {
        // Skipping firing status update event when there is no statusText
        // This can happen if there is no workitemsprovider
        const statusText = error || this.getStatusText();
        const primaryStatusText = this.getPrimaryStatusText();
        const secondaryStatusText = this.getSecondaryStatusText();
        if (statusText !== Utils_String.empty) {
            this._fire("statusUpdate", [statusText, error ? true : false, primaryStatusText, secondaryStatusText]);
        }
    }

    public showLoadingIndicator() {
        if (!this._loadingOverlay) {
            this._loadingOverlay = new LoadingSpinnerOverlay(this._element[0]);
        }

        this._loadingOverlay.show(100, Resources.LoadingQueryResults);
    }

    public hideLoadingIndicator() {
        // The grid refreshes the view async (after delay = 0), so we need to hide the loading indicator after that
        if (this._loadingOverlay) {
            this._loadingOverlay.hide(0);
        }
    }

    private _refreshResults(columns?: IQueryDisplayColumn[], sortFields?: ISortField[], skipInvalidateResults?: boolean) {
        if (this._workItemsProvider) {
            if (columns) {
                this._workItemsProvider.setColumns(columns);
            }

            if (sortFields) {
                this._workItemsProvider.setSortColumns($.map(sortFields, function (sc) { return { name: sc.name, descending: !sc.asc }; }));
            }

            const errorCallback = (error) => {
                $(this).trigger("queryResultsError");
                this._statusUpdate(error);
                this.hideLoadingIndicator();
            };

            if (!skipInvalidateResults) {
                this._workItemsProvider.invalidateResults();
            }

            this.setStatusText(Resources.QueryingStatusText);
            this.showLoadingIndicator();

            $(this).trigger("queryResultsStarting", [skipInvalidateResults]);
            this._workItemsProvider.beginGetResults((queryResultsModel) => {
                if (!this._workItemsProvider) {
                    // disposed, just exit since there is nothing actionable
                    // with this result.
                    return;
                }

                this._workItemsProviderVersion = this._workItemsProvider.getVersion();

                this.updateDataModel(queryResultsModel);
                this.hideLoadingIndicator();

                $(this).trigger("queryResultsComplete", [skipInvalidateResults]);
            }, errorCallback, null);
        }
    }

    private _ensureLinkTypesFetched() {
        let grid = this, async = false;
        if (!this._linkTypesFetched && !this._fetchingLinkTypes) {
            this._fetchingLinkTypes = true;

            this._store.beginGetLinkTypes(function () {
                grid._fetchingLinkTypes = false;
                grid._linkTypesFetched = true;
                if (async) {
                    grid.redraw();
                }
            },
                function (err) {
                    grid._fetchingLinkTypes = false;
                    grid._linkTypesFetched = true;

                    handleError(err, null, grid);
                });
        }

        async = true;

        return this._linkTypesFetched;
    }

    private _isLinkOrTreeQuery(): boolean {
        const filtersAppliedToLinkOrTreeQuery = this._filterApplied && (this._unfilteredIsLinkQuery || this._unfilteredIsTreeQuery);
        return (this._isLinkQuery || this._isTreeQuery || filtersAppliedToLinkOrTreeQuery);
    }

    private _updatePageRow(workItem: WITOM.WorkItem, changedColumnsSet?: { [id: number]: boolean }): boolean {
        /// <summary>Unconditionally updates a row with current work item information</summary>
        /// <param name="workItem" type="WorkItem">The work item that we want to update in the grid</param>
        /// <param name="changedColumnsSet" type="HashSet" optional="true">If given, indices of changed columns will be added to it</param>
        /// <returns>True if an existing field value does not match what was stored in the page data, False otherwise</returns>
        Diag.Debug.assertParamIsObject(workItem, "workItem");

        let id, i, l, pageColumns, field: WITOM.Field, fieldValue, updated = false;

        id = workItem.getUniqueId();

        const row = this._pageData[id];

        if (row) {
            pageColumns = this._pageColumns;

            for (i = 0, l = pageColumns.length; i < l; i++) {
                field = workItem.getField(pageColumns[i]);

                if (field) {
                    if (field.fieldDefinition.id === WITConstants.CoreField.Id) {
                        row[i] = workItem.getUniqueId();
                    }
                    else {
                        fieldValue = field.getValue();
                        if ((!updated || changedColumnsSet)
                            && Utils_String.defaultComparer(row[i], fieldValue) !== 0) {
                            updated = true;

                            if (changedColumnsSet) {
                                // Not all _pageColumns might be visible in the grid, therefore we look up the correct
                                // index into the _displayColumns array by the field name
                                const pageColumnName = pageColumns[i];
                                const columnIdx = this._displayColumnsMap[pageColumnName];

                                // Record column index
                                changedColumnsSet[columnIdx] = true;
                            }
                        }
                        row[i] = fieldValue;
                    }
                }
                else {
                    row[i] = null;
                    updated = true;
                }
            }

            // If the row is updated, then update the query result model to make sure the data stays consistent with the workitem manager
            if (updated && this._workItemsProvider && this._workItemsProvider instanceof QueryResultsProvider) {
                this._workItemsProvider.updateQueryResultModelPayloadRow(id, row);
            }
        }
        return updated;
    }

    private _updateWorkItemCache(aboveRange: number[][], visibleRange, belowRange) {
        const pager = new QueryResultGridPager(PageSizes.QUERY - this._workItemsNeeded.length,
            this._pageData,
            this._workItems,
            (i: number) => Math.abs(this._getExpandState(i)),
            (i: number) => this._getExpandState(i) < 0);

        const neededItems: number[] = pager.getItemsNeededToPage(
            aboveRange.map((v: number[]) => v[1]),
            visibleRange.map((v: number[]) => v[1]),
            belowRange.map((v: number[]) => v[1]));

        this._workItemsNeeded = this._workItemsNeeded.concat(neededItems);

        // remove work items that couldn't read so that we don't end up requesting forever
        this._workItemsNeeded = Utils_Array.subtract(this._workItemsNeeded, this._workItemsFailedToFetch);

        if (this._workItemsNeeded.length > 0) {
            this.delayExecute("pageWorkItems", 100, true, () => {
                this._pageWorkItems();
            });
        }
    }

    private _dirtyStatusChanged(checkAll?: any) {
        /// <param name="checkAll" type="any" optional="true" />

        this._fire("dirty-status-changed", [checkAll]);
    }

    private _updateDirtyStatus(ids) {
        let fireDirtyStatus, isInterested, i, l, idsToPend = [], id;

        if (!this._managedWorkItems) {
            this._managedWorkItems = {};
        }

        for (i = 0, l = ids.length; i < l; i++) {
            id = ids[i];
            isInterested = this._managedWorkItems[id];

            if (isInterested === true) {
                fireDirtyStatus = true;
            }
            else if (isInterested !== false) {
                idsToPend.push(id);
            }
        }

        if (idsToPend.length > 0) {
            this._pendManagedWorkItemIds(idsToPend);
        }

        if (fireDirtyStatus) {
            this._dirtyStatusChanged();
        }
    }

    private _pendManagedWorkItemIds(ids) {
        let i, l;

        if (ids.length > 0) {
            if (!this._pendingManaged) {
                this._pendingManaged = {};
            }

            for (i = 0, l = ids.length; i < l; i++) {
                this._pendingManaged[ids[i]] = true;
            }

            this.delayExecute("pendManagedWorkItemIds", 250, false, this._checkInterested);
        }
    }

    private _checkInterested() {
        /// <summary>Check through the pendingManaged ids and add them to the managedWorkItems if they are relevant
        ///     to the grid's unfiltered contents.</summary>
        let list = this._pendingManaged,
            managed = this._managedWorkItems,
            workItems = this.getUnfilteredWorkItemIds(),
            count = 0,
            id, i, l;

        for (id in list) {
            if (list.hasOwnProperty(id)) {
                managed[id] = false;
                count++;
            }
        }

        for (i = 0, l = workItems.length; i < l && count > 0; i++) {
            id = workItems[i];
            if (id in list) {
                managed[id] = true;
                count--;
            }
        }

        this._pendingManaged = null;
        this._dirtyStatusChanged();
    }

    public _updateRow(rowInfo, rowIndex, dataIndex, expandedState, level, changedColumns?: { [id: number]: boolean }) {
        super._updateRow(rowInfo, rowIndex, dataIndex, expandedState, level, changedColumns);

        const workItem = WorkItemManager.get(this._store).getWorkItem(this._workItems[dataIndex]);
        const $row = rowInfo.row;
        const $gutterRow = rowInfo.gutterRow;

        if ($row.hasClass("dirty-workitem-row")) {
            $row.removeClass("dirty-workitem-row");
        }

        if ($row.hasClass("invalid-workitem-row")) {
            $row.removeClass("invalid-workitem-row");
        }

        if ($gutterRow && $gutterRow.hasClass("invalid-workitem-row")) {
            $gutterRow.removeClass("invalid-workitem-row");
        }

        if (workItem && workItem.isDirty()) {
            $row.addClass("dirty-workitem-row");

            // If the work item is invalid or has an error associated with it, show the work item as invalid.
            if (!workItem.isValid() || workItem.hasError()) {
                $row.addClass("invalid-workitem-row");
                if ($gutterRow) {
                    $gutterRow.addClass("invalid-workitem-row");
                }
            }
        }
    }

    private _getDirtyWorkItems(): WITOM.WorkItem[] {
        const workItemIds = this.getUnfilteredWorkItemIds();
        const workItemsHash = {};
        const dirtyWorkItems: WITOM.WorkItem[] = [];
        const workItemManager = WorkItemManager.get(this._store);

        for (const workItemId of workItemIds) {
            const workItem = workItemManager.getWorkItem(workItemId);
            if (workItem) {
                const id = workItem.getUniqueId();
                if (workItem.isDirty() && !(id in workItemsHash)) {
                    workItemsHash[id] = true;
                    dirtyWorkItems.push(workItem);
                }
            }
        }

        return dirtyWorkItems;
    }

    public _beginEnsureSelectionIsAvailable(itemsAvailableCallback?: (...args: any[]) => any, errorCallback?: IErrorCallback) {
        /// <summary>OVERRIDE: Ensures that all selected items have been downloaded and paged correctly.</summary>
        /// <param name="itemsAvailableCallback" type="IResultCallback">A callback function invoked when all selected items are available on the client.</param>
        /// <param name="errorCallback" type="IErrorCallback">A callback function invoked when an error has occurred during the process of making the selection available.</param>

        this.beginPageSelectedWorkItems(itemsAvailableCallback, errorCallback, true /* dontRedraw */);
    }

    private _sortAndRemoveDuplicates(filteredIds: number[], originalIds: number[]): number[] {
        /// <summary>Sorts the filteredIds based on the order of the originalIds, maintaining order and removing duplicates.</summary>
        /// <param name="filteredIds" type="Array" innerType="number">An array of work item ids that the target should match.</param>
        /// <param name="originalIds" type="Array" innerType="number">An array of work item ids that should be filtered down.</param>
        /// <returns>The ordered array of unique workItems.  The items in the array match that items in the target parameter.</returns>

        let sortedItems: number[] = [];
        let filteredIdsHash: any = {};
        let idsAdded: any = {};

        // build lookup table
        $.each(filteredIds, function (i, filteredId) {
            filteredIdsHash[filteredId] = true;
        });

        // Go through the original ids in order and keep them if they are part of the filtered set
        sortedItems = $.map(originalIds, function (workItemId, i) {
            if (filteredIdsHash[workItemId] && !idsAdded[workItemId]) {
                idsAdded[workItemId] = true;
                return workItemId;
            }
        });

        return sortedItems;
    }

    private _clearCachedFilterValues() {
        /// <summary>Clears the unfiltered values that were cached when filters were applied.</summary>

        // Clear filter values
        this._unfilteredWorkItems = null;
        this._unfilteredExpandStates = null;
        this._unfilteredIsLinkQuery = null;
        this._unfilteredIsTreeQuery = null;

        this._filterApplied = false;
    }

    private _reinstateUnfilteredData() {
        /// <summary>Reinstates the unfiltered values that were cached when filters were applied.</summary>

        // revert the workitems back to the unfiltered state
        this._options.source = this._unfilteredWorkItems;
        this._workItems = this._unfilteredWorkItems;

        // revert the expand states to their unfiltered state
        this._options.expandStates = this._unfilteredExpandStates;

        // revert the query type to their unfiltered state
        this._isLinkQuery = this._unfilteredIsLinkQuery;
        this._isTreeQuery = this._unfilteredIsTreeQuery;

        // update filter store
        if (this._queriesHubContext) {
            this._queriesHubContext.triageViewActionCreator.applyFilters(this._workItems, this._filterManager.getFilters());
        }

    }

    /**
     * Ensures at least 1000 items are paged in (if there are 1000+ items in the result set)
     */
    private _pageFirstThousand() {

        // Ensure at least 1000 items are paged in.
        const pagedCount = Object.keys(this._pageData).length;

        this._pageNextSetOfWorkItems(QueryResultGrid.FILTER_PAGE_SIZE - pagedCount).then<void>(() => {
            this._applyFilter();
        });
    }

    private _applyFilter() {
        if (this._filterManager.isFiltering()) {
            this.filterWorkItems(this._filterManager.filter());
        } else {
            this._updateFilterMessage();
            if (this._queriesHubContext) {
                this._queriesHubContext.triageViewActionCreator.clearFilter();
            }
        }
    }

    private _pageNextSetOfWorkItems(count: number): IPromise<void> {
        const uniqueIds = this._getUniqueUnfilteredIds();
        const idsToPage = [];

        for (let index = 0; index < uniqueIds.length && idsToPage.length < count; index++) {
            const id = uniqueIds[index];

            if (!this.isWorkItemPaged(id)) {
                idsToPage.push(id);
            }
        }

        return this._pageWorkItemsByIds(idsToPage);
    }

    private _pageWorkItemsByIds(workItemIds: number[]): IPromise<void> {

        const defer = Q.defer<void>();

        const getNextWorkItemIds = (): number[] => {
            let workItemsNeeded = workItemIds.filter((value: number) => { return this._pageData[value] == null });
            workItemsNeeded = Utils_Array.subtract(workItemsNeeded, this._workItemsFailedToFetch);

            return workItemsNeeded.slice(0, PageSizes.QUERY);
        };

        const getNextWorkItems = () => {
            const workItemsNeeded = getNextWorkItemIds();

            if (workItemsNeeded.length > 0) {
                this.pageWorkItems(workItemsNeeded, () => {
                    getNextWorkItems();
                });
            } else {
                defer.resolve(null);
            }
        };

        getNextWorkItems();

        return defer.promise;
    }

    public isWorkItemPaged(workItemId: number): boolean {
        /// <summary>Checks if the work item is paged in.</summary>
        /// <param name="workItemId" type="Number">Work Item's ID</param>
        /// <return type="Boolean">True if work item is paged, false otherwise</return>

        return workItemId in this._pageData;
    }

    public pageWorkItems(workItemIds: any[], callback: (...args: any[]) => any) {
        /// <summary>Pages in the given work item IDs into the pagedata.</summary>
        /// <param name="workItemIds" type="Array" elementType="Number">The IDs to page in.</param>
        /// <param name="callback" type="Function">The callback to call once the items are paged in.</param>
        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");
        Diag.Debug.assertParamIsFunction(callback, "callback");

        // Add unpaged work items to the grid's WI needed
        this._workItemsNeeded = this._workItemsNeeded.concat(workItemIds);

        // Page Work Items, add them to the index, and search
        this._pageWorkItems(callback);
    }

    public getWorkItemPageData(workItemId: number): any[] {
        /// <summary>Returns paged-in data for the work item</summary>
        /// <param name="workItemId" type="Number">The Work Item ID</param>
        /// <returns type="Array" elementType="Any">The paged-in data</returns>
        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        return this._pageData[workItemId].slice(0);
    }

    public getFilterManager(): FilterManager {
        return this._filterManager;
    }

    private _getWorkItemFieldValueFromPageData(id: number, fieldRefName: string): string {
        const workItem = this._pageData[id];
        if (!!workItem) {
            const fieldIndex = this._pageColumnMap[fieldRefName];
            if (typeof fieldIndex === "number") {
                return WITOM.Field.convertValueToDisplayString(workItem[fieldIndex]);
            }
        }
        return Utils_String.empty;
    }
}

VSS.initClassPrototype(QueryResultGrid, {
    _workItems: null,
    _workItemsNeeded: null,
    _links: null,
    _displayColumns: null,
    _displayColumnsMap: null,
    _sortColumns: null,
    _rootCount: 0,
    _allowSort: true,
    _pageColumns: null,
    _pageColumnMap: null,
    _pageData: null,
    _store: null,
    _projectName: null,
    _fetching: false,
    _linkTypesFetched: false,
    _fetchingLinkTypes: false,
    _saving: false,
    _lastVisibleRange: null,
    _workItemsProvider: null,
    _workItemsProviderVersion: 0,
    _workItemsNavigator: null,
    _navigateNextDelegate: null,
    _navigatePreviousDelegate: null,
    _refreshDelegate: null,
    _workItemChangedDelegate: null,
    _filterApplied: false,
    _filterManager: null,
    _unfilteredWorkItems: null,
    _unfilteredExpandStates: null,
    _unfilteredIsLinkQuery: null,
    _unfilteredIsTreeQuery: null,
    _isLinkQuery: false,
    _isTreeQuery: false,
    _emptyQueryResults: false,
    _managedWorkItems: null,
    _pendingManaged: null,
    _allowSingleClickOpen: true,
    _allowInteractionWithTitle: true,
});

VSS.classExtend(QueryResultGrid, TfsContext.ControlExtensions);

export class QueryResultGridPager {

    /** Helper class to optimize paging for the QueryResultGrid
     * @param  pageSize            page size (typically 200)
     * @param  cache               dictionary of already cached workitem data, key is the work item id
     * @param  workItems           array of workitem ids (index = dataIndex, value = workitemId)
     * @param  getDescendentCount  returns the number of descendants an item has (input is dataIndex)
     * @param  isCollapsed         returns the collapsed state of an item (input is dataIndex)
     */
    constructor(
        private _pageSize: number,
        private _cache: { [id: number]: any },
        private _workItems: number[],
        private _getDescendentCount: (index: number) => number,
        private _isCollapsed: (index: number) => boolean) {
    }

    /** Determines a set of workitems to page so the grid can render items in the visible range. Opportunistically add items that might likely become visible due to subsequent user action.
     * @param  aboveRange          dataIndexes of the range above the visible section (contains up to a pageSize of items)
     * @param  visibleRange        dataIndexes of visible items
     * @param  belowRange          dataIndexes of the range below the visible section (contains up to a pageSize of items).
     */
    public getItemsNeededToPage(
        aboveRange: number[],
        visibleRange: number[],
        belowRange: number[]): number[] {

        if (visibleRange.length <= 0 || this._pageSize <= 0) {
            return;
        }

        // Step 1: Page in the visible range
        let workItemsNeeded: number[] = this._getUnpagedItemsInRange(visibleRange, this._pageSize);

        // Step 2: Page 50 items above and below
        const cacheAheadLength: number = Math.floor(this._pageSize / 4);

        aboveRange.reverse(); // so they are in order as we scoll up

        const lastQuarterInAboveRange = aboveRange.slice(0, cacheAheadLength);
        workItemsNeeded = workItemsNeeded.concat(this._getUnpagedItemsInRange(lastQuarterInAboveRange, this._pageSize - workItemsNeeded.length));

        const firstQuarterInBelowRange = belowRange.slice(0, cacheAheadLength);
        workItemsNeeded = workItemsNeeded.concat(this._getUnpagedItemsInRange(firstQuarterInBelowRange, this._pageSize - workItemsNeeded.length));

        // Step 3. If we do need to page try to fill 200 items page size from the above, below ranges
        if (workItemsNeeded.length > 0) {

            const remainingAboveRange = aboveRange.slice(cacheAheadLength);
            workItemsNeeded = workItemsNeeded.concat(this._getUnpagedItemsInRange(remainingAboveRange, this._pageSize - workItemsNeeded.length));

            const remainingBelowRange = belowRange.slice(cacheAheadLength);
            workItemsNeeded = workItemsNeeded.concat(this._getUnpagedItemsInRange(remainingBelowRange, this._pageSize - workItemsNeeded.length));

            // Step 4. If we still have room, try to page in collapsed items under the visible range (using BFT)
            if (workItemsNeeded.length < this._pageSize) {
                workItemsNeeded = workItemsNeeded.concat(this._getUnpagedCollapsedItems(visibleRange, this._pageSize - workItemsNeeded.length));
            }
        }

        return workItemsNeeded;
    }

    /** returns a set of workitem item ids that are unpaged and collapsed under the range
     * @param  range list of dataIndexes
     */
    private _getUnpagedCollapsedItems(range: number[], maxSize: number): number[] {

        const unpagedWorkItemIds: number[] = [];
        let workItemId;
        let dataIndex: number;
        let descendentsCount: number;
        const queue: number[] = []; // used for Breadth First Traversal

        // initialize the queue with visible collapsed items
        for (let i = 0; i < range.length; i++) {
            dataIndex = range[i];
            if (this._isCollapsed(dataIndex)) {
                queue.push(dataIndex);
            }
        }

        while (unpagedWorkItemIds.length < maxSize && queue.length > 0) {
            dataIndex = queue.shift();

            descendentsCount = this._getDescendentCount(dataIndex);
            if (descendentsCount > 0) {
                for (let i = dataIndex + 1; i <= dataIndex + descendentsCount; i++) {
                    workItemId = this._workItems[i];

                    if (!(workItemId in this._cache)) {
                        unpagedWorkItemIds.push(workItemId);
                        if (unpagedWorkItemIds.length >= maxSize) {
                            break;
                        }
                    }
                    const descendentsOfI = this._getDescendentCount(i);
                    if (descendentsOfI > 0) {
                        queue.push(i);
                        i += descendentsOfI;
                    }
                }
            }
        }

        return unpagedWorkItemIds;
    }

    /** returns a set of workitem item ids that are unpaged
     * @param  range list of dataIndexes
     */
    private _getUnpagedItemsInRange(range: number[], maxSize: number): number[] {

        const unpagedWorkItemIds: number[] = [];
        let workItemId;
        let i: number;

        for (i = 0; i < range.length; i++) {

            if (unpagedWorkItemIds.length >= maxSize) {
                break;
            }

            workItemId = this._workItems[range[i]];

            if (workItemId > 0 && !(workItemId in this._cache)) {
                unpagedWorkItemIds.push(workItemId);
            }

        }
        return unpagedWorkItemIds;
    }
}

export class QueryResultGridShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {

    constructor(groupName: string, protected _grid: QueryResultGrid) {
        super(groupName);

        this.registerShortcut(
            "j",
            {
                description: Resources.KeyboardShortcutDescription_Next_Item,
                action: () => {
                    QueryResultGridShortcutGroup.simulateKeyDownEventOnGrid(this._grid, Utils_UI.KeyCode.DOWN);
                },
                element: this._grid.getElement()[0]
            });

        this.registerShortcut(
            "k",
            {
                description: Resources.KeyboardShortcutDescription_Previous_Item,
                action: () => {
                    QueryResultGridShortcutGroup.simulateKeyDownEventOnGrid(this._grid, Utils_UI.KeyCode.UP);
                },
                element: this._grid.getElement()[0]
            });

        // The following Hotkeys are hidden from the help dialog and description will not be shown to the user
        this.registerShortcut(
            "shift+j",
            {
                description: "Expand Selection Down",
                action: () => {
                    QueryResultGridShortcutGroup.simulateKeyDownEventOnGrid(this._grid, Utils_UI.KeyCode.DOWN, false, true);
                },
                hideFromHelpDialog: true,
                element: this._grid.getElement()[0]
            });

        this.registerShortcut(
            "shift+k",
            {
                description: "Expand Selection Up",
                action: () => {
                    QueryResultGridShortcutGroup.simulateKeyDownEventOnGrid(this._grid, Utils_UI.KeyCode.UP, false, true);
                },
                hideFromHelpDialog: true,
                element: this._grid.getElement()[0]
            });
    }

    /**
     * Will move focus to the grid and simulate a keydown event with the given keycode
     *
     * @param grid - grid to focus and simulate event on
     * @param keycode - the keycode for the simulated keydown event
     * @param ctrl - true if the ctrl key should be pressed
     * @param shift - true if the shift key should be pressed
     */
    public static simulateKeyDownEventOnGrid(grid: QueryResultGrid, keyCode: Utils_UI.KeyCode, ctrl: boolean = false, shift: boolean = false) {
        if (grid) {
            // Move focus to the grid
            grid.focus(0);

            // Simulate keydown event
            const e = $.Event("keydown");
            e.keyCode = keyCode;
            e.ctrlKey = ctrl;
            e.shiftKey = shift;
            grid.getFocusElement().trigger(e);
        }
    }
}

export class QueryResultHtmlTableFormatter extends Grids.HtmlTableFormatter {
    constructor(grid, options?) {
        super(grid, options);
    }

    public processColumns(columns: any[]): any[] {
        // Shallow clone the columns array so we don't mess with the actual grid's column order
        // Remove the id column and expand/collapse button columns if they exists
        const clonedColumns = columns.filter(c => !Utils_String.equals(c.name, WITConstants.CoreFieldRefNames.Id, true)
            && !Utils_String.equals(c.name, QueryResultGrid.EXPAND_COLUMN_NAME, true)
            && !Utils_String.equals(c.name, QueryResultGrid.COLLAPSE_COLUMN_NAME, true));

        // Add an id column to the start, that links to the workitem
        const idColumn = {
            name: WITConstants.CoreFieldRefNames.Id,
            fieldId: WITConstants.CoreField.Id,
            text: Resources.CopySelectedWorkItemsIdColumnTitle,
            getColumnValue: function (dataIndex, columnIndex, columnOrder) {
                // Get workitem id
                const id = this.getWorkItemIdAtDataIndex(dataIndex);

                if (id <= 0) {
                    return "";
                }

                return WorkItemHtmlTableFormatter.getIdColumnValue(id, this._options.tfsContext);
            },
            noHtmlEncode: true // Prevents the HTML table formatter from HTMLencoding these ID links
        };
        clonedColumns.unshift(idColumn);

        return clonedColumns;
    }

    public getFormattedColumnValue(column: any, value: string): string {
        if (column.isIdentity) {
            const identity = WITIdentityHelpers.parseUniquefiedIdentityName(value);
            if (identity) {
                return identity.displayName;
            }
        }
        return value;
    }
}

VSS.initClassPrototype(QueryResultHtmlTableFormatter, {
    _options: null,
    _grid: null
});

function beginCreateTemporaryQueryIdForSelectedWorkItemIds(tfsContext: TFS_Host_TfsContext.TfsContext, workItemsProvider: QueryResultsProvider,
    workItemsIds: number[], columns: string[], sortColumns: string[],
    successCallback?: (tempQueryId: string) => void, errorCallback?: IErrorCallback) {
    const queryAdapter: any = (<Service.VssConnection>workItemsProvider.project.store.tfsConnection).getService<QueryAdapter>(QueryAdapter);
    createTemporaryQueryIdForSelectedWorkItemIds(tfsContext, queryAdapter, workItemsIds, columns, sortColumns, successCallback, errorCallback);
}

export function createTemporaryQueryIdForSelectedWorkItemIds(tfsContext: TFS_Host_TfsContext.TfsContext, queryAdapter: QueryAdapter,
    workItemsIds: number[], columns: string[], sortColumns: string[],
    successCallback?: (tempQueryId: string) => void, errorCallback?: IErrorCallback) {

    const editinfo = createEditInfoForSelectedWorkItemIds(workItemsIds);
    queryAdapter.beginGenerateWiql(editinfo, columns, sortColumns as IQuerySortColumn[], (wiql: string) => {
        TempQueryUtils.beginCreateTemporaryQueryId(tfsContext, wiql, QueryType[QueryType.Flat]).then(successCallback, errorCallback);
    }, errorCallback);
}

function createEditInfoForSelectedWorkItemIds(ids: number[]): IEditInfo {
    if (!ids || ids.length === 0) {
        return null;
    }
    const clauses: IClause[] = [];
    clauses.push(
        <IClause>({
            logicalOperator: "",
            fieldName: WITConstants.CoreFieldRefNames.Id,
            operator: WITCommonResources.WiqlOperators_In,
            value: ids.toString(),
            index: 0
        }));

    const filter: IFilter = {
        clauses: clauses,
        groups: []
    };

    return <IEditInfo>{
        mode: LinkQueryMode.WorkItems,
        treeLinkTypes: "",
        linkTypes: "",
        sourceFilter: filter,
        treeTargetFilter: {},
        linkTargetFilter: {}
    };
}

Menus.menuManager.attachExecuteCommand(function (sender, args) {
    let commandArgs = args.get_commandArgument(),
        options;
    const tfsContext = commandArgs.tfsContext || TfsContext.getDefault();

    switch (args.get_commandName()) {
        case "copy-selection-html":
            const grid = commandArgs.grid;
            const numSelected: number = grid.getSelectionCount();

            const columnNames: string[] = $.map(grid.getColumns(), function (column, index) { return column.name });

            grid.copySelectedItems(QueryResultHtmlTableFormatter, true);

            const ciData: { [key: string]: any } = {
                "NumberOfSelectedWorkItems": numSelected,
                "ColumnNames": columnNames,
                "CurrentController": tfsContext.navigation.currentController,
                "CurrentAction": tfsContext.navigation.currentAction
            };
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_COPY_SELECTION_AS_HTML,
                ciData));
            return false;

        case QueryResultGrid.COMMAND_ID_DESTROY:
            commandArgs.grid.destroyWorkItems(RecycleBinTelemetryConstants.CONTEXT_MENU, undefined);

            return false;

        case QueryResultGrid.COMMAND_ID_RESTORE:
            commandArgs.grid.restoreWorkItems(RecycleBinTelemetryConstants.CONTEXT_MENU, undefined);

            return false;

        case QueryResultGrid.COMMAND_ID_UNFOLLOW:
            Diag.logTracePoint("Follows.UnfollowsClicked");
            const selectedWorkItemIds: number[] = commandArgs.selectedWorkItems;
            let unFollowResults = commandArgs.queryResultsProvider;
            unfollowWorkItems(selectedWorkItemIds, unFollowResults, tfsContext, sender);

            return false;

        case QueryResultGrid.COMMAND_ID_EMAIL_SELECTION:
            Diag.logTracePoint("SendMail.SendEmailContextMenuClicked");
            const queryResults = commandArgs.queryResultsProvider;

            try {
                const model = queryResults.queryResultsModel;
                let fields = [];

                if (model && model.columns) {
                    fields = $.map(model.columns, (column) => column.name);
                }

                const sendEmailDialogOptions: EmailWorkItemsModel_Async.IEmailWorkItemsDialogModelOptions = {
                    workItemSelectionOption:
                        <EmailWorkItemsModel_Async.IWorkItemSelectionOptions>{
                            workItems: commandArgs.selectedWorkItems,
                            fields: fields,
                            store: queryResults.queryDefinition.project,
                            projectId: tfsContext.navigation.projectId // Specify project context in order to send emails with project context
                        }
                };

                beginCreateTemporaryQueryIdForSelectedWorkItemIds(tfsContext, queryResults, commandArgs.selectedWorkItems, fields, [],
                    (tempQueryId: string) => {
                        const queryLink = TempQueryUtils.createTempQueryLink(tfsContext, tempQueryId);
                        $.extend(sendEmailDialogOptions.workItemSelectionOption, { extendedText: queryLink, tempQueryId: tempQueryId });
                        sendEmailDialogFunction(sendEmailDialogOptions);
                    },
                    () => {
                        sendEmailDialogFunction(sendEmailDialogOptions);
                    });
            } catch (e) {
                const options: Dialogs.IMessageDialogOptions = {
                    buttons: [Dialogs.MessageDialog.buttons.ok],
                    width: "auto",
                    contentText: e.Message,
                    resizable: false,
                    title: Resources.ErrorSendingEmail
                };
                Dialogs.show(Dialogs.MessageDialog, options);
            }
            return false;

        case "bulk-edit-workitems":
            VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit"], (BulkEdit: typeof WITControlsBulkEdit_Async) => {
                options = {
                    tfsContext: tfsContext,
                    okCallback: function (dialogResult) {
                        const bulkOptions = {
                            container: this._element
                        };

                        BulkEdit.bulkUpdateWorkItems(tfsContext,
                            dialogResult.workItemIds,
                            dialogResult.changes,
                            bulkOptions);
                    }
                };
                BulkEdit.BulkEditDialogs.bulkEditWorkItems(commandArgs.selectedWorkItems, commandArgs.selectedWorkItemProjectTypeMapping, options);
            });

            return false;
        case "link-to-new":
            const linkToNewOptions = $.extend({}, { tfsContext: tfsContext }, commandArgs.options);
            useWITDialogs().then(WITDialogs => WITDialogs.newLinkedWorkItem(commandArgs.baseId, commandArgs.selectedIds, linkToNewOptions));
            return false;

        case "link-to-existing":
            const linkToExistingOptions = $.extend({}, { tfsContext: tfsContext }, commandArgs.options);
            useWITDialogs().then(WITDialogs => WITDialogs.linkToExistingWorkItem(commandArgs.baseId, commandArgs.selectedIds, linkToExistingOptions));
            return false;

        case "create-copy":
            useWITDialogs().then(WITDialogs => WITDialogs.createCopyOfWorkItem(commandArgs.workItemId, { tfsContext: tfsContext }));
            return false;

        case "use-as-a-template":
            useWITDialogs().then(WITDialogs => WITDialogs.useWorkItemAsATemplate(commandArgs.workItemId, { tfsContext: tfsContext }));
            return false;
    }

    function sendEmailDialogFunction(workItemSelectionOption) {
        VSS.requireModules(["Admin/Scripts/TFS.Admin.SendMail", "WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems"]).spread(
            (AdminSendMail: typeof AdminSendMail_Async, EmailWorkItems: typeof EmailWorkItemsModel_Async) => {
                AdminSendMail.Dialogs.sendMail(new EmailWorkItems.EmailWorkItemsDialogModel(workItemSelectionOption));
            });
    }
});

function unfollowWorkItems(selectedWorkItemIds: number[], queryResultsProvider: QueryResultsProvider, tfsContext: TFS_Host_TfsContext.TfsContext, sender) {
    let successfulUnfollows = 0;
    let unsuccessfulUnfollows = 0;

    if (selectedWorkItemIds && selectedWorkItemIds.length > 0) {
        let errorShown = false;

        const workItemToSubscriptionIdMap: IDictionaryNumberTo<string> = {};
        const followsService: FollowsService = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<FollowsService>(FollowsService);
        const filter: ArtifactFilter = {
            artifactId: null,
            artifactType: WITConstants.FollowsConstants.ArtifactType,
            type: FollowsService.FOLLOWS_TYPE,
            artifactUri: null,
            eventType: ""
        };
        const subscriptionQueryCondition: SubscriptionQueryCondition = {
            filter: filter,
            subscriptionId: null,
            scope: "",
            subscriberId: "",
            flags: null
        };
        const subscriptionQuery: SubscriptionQuery = {
            conditions: [subscriptionQueryCondition],
            queryFlags: null
        };
        const notificationHttpClient: NotificationsRestClient.NotificationHttpClient = Service.getCollectionClient(NotificationsRestClient.NotificationHttpClient, followsService.getWebContext());

        notificationHttpClient.querySubscriptions(subscriptionQuery)
            .then((subscriptionsMap) => {
                for (let i = 0; i < subscriptionsMap.length; i++) {
                    const notificationSubcription: NotificationSubscription = subscriptionsMap[i];
                    const notificationFilter = notificationSubcription.filter as ArtifactFilter;

                    workItemToSubscriptionIdMap[notificationFilter.artifactId] = notificationSubcription.id;
                }

                selectedWorkItemIds.forEach((workItemId: number) => {
                    if (workItemToSubscriptionIdMap[workItemId]) {

                        const followArtifact: ArtifactSubscription = {
                            subscriptionId: parseInt(workItemToSubscriptionIdMap[workItemId]),
                            artifactId: workItemId.toString(),
                            artifactType: Artifacts_Constants.ArtifactTypeNames.WorkItem
                        };

                        followsService.unfollowArtifact(followArtifact)
                            .then((subscription) => {
                                successfulUnfollows++;
                                delete workItemToSubscriptionIdMap[workItemId];
                                logCustomerIntelligenceData();
                            }, (reason) => {
                                unsuccessfulUnfollows++;
                                if (!errorShown) {
                                    eventSvc.fire(WorkItemViewActions.WORKITEM_VIEW_MESSAGE_CHANGE, sender, { message: Resources.BulkUnfollowsFailed, messageType: Notifications.MessageAreaType.Error });
                                    errorShown = true;
                                }

                                logCustomerIntelligenceData();
                            });
                    }
                });
            }, (reason) => {
                if (!errorShown) {
                    eventSvc.fire(WorkItemViewActions.WORKITEM_VIEW_MESSAGE_CHANGE, sender, { message: Resources.BulkUnfollowsFailed, messageType: Notifications.MessageAreaType.Error });
                    errorShown = true;
                }
                logCustomerIntelligenceData();
            });
    }

    const logCustomerIntelligenceData = () => {
        // log a single ci event with how many items were selected and how many of them were successful
        if (successfulUnfollows + unsuccessfulUnfollows === selectedWorkItemIds.length) {
            const ciData: IDictionaryStringTo<number> = {
                "NumberOfSelectedWorkItems": selectedWorkItemIds.length,
                "SuccessfulUnfollows": successfulUnfollows,
                "UnsuccessfulUnfollows": unsuccessfulUnfollows
            };
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.WORKITEM_BULKUNFOLLOWS,
                ciData));
        }
    };

}

// Deprecated, please don't rely on this enhancement, as it will be removed
export function registerEnhancements() {
    Controls.Enhancement.registerEnhancement(QueryResultGrid, ".query-result-grid");
}

registerEnhancements();

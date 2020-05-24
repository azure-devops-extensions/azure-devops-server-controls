import * as Q from "q";
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import Events_Document = require("VSS/Events/Document");
import Events_Handlers = require("VSS/Events/Handlers");
import Events_Services = require("VSS/Events/Services");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import Utils_Core = require("VSS/Utils/Core");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { WorkItemStore, WorkItemType, WorkItem, IWorkItemChangedArgs, WorkItemLink, Link, createError } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { ILinkInfo, PendingWorkItem, IWorkItemData, IWorkItemTypeExtension, IBeginGetWorkItemsOptions } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { Actions, Exceptions, WorkItemChangeType, PageSizes } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import { ClassificationFieldsMruStore } from "WorkItemTracking/Scripts/MruClassificationPicker/Stores/ClassificationFieldsMruStore";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

function Error_canceled() {
    return createError("Operation Canceled.", { name: Exceptions.OperationCanceledException });
};

class LinkManager {

    public workItemManager: WorkItemManager;

    constructor(workItemManager: WorkItemManager) {
        this.workItemManager = workItemManager;
    }

    public workItemsChanged(args?: IWorkItemChangedArgs) {
        if (args.change === WorkItemChangeType.Saved && args.changedWorkItemLinks) {

            // We dont want track workitem relations for remote workitems
            const localWorkItemLinkChanges = args.changedWorkItemLinks.filter((workItemLinkChange: WorkItemLink) => {
                return !workItemLinkChange.linkData.RemoteHostId;
            });
            // A work item is saved which has work item links added or removed
            this.updateWorkItemLinkTargets(localWorkItemLinkChanges);

            // Fire the events for work items impacted by the link changes
            this._fireEventsForWorkItemLinkTargets(localWorkItemLinkChanges);
        }
    }

    public updateWorkItemLinkTargets(changedWorkItemLinks: ILinkInfo[]) {
        /// <summary>If a work item link is added to or removed from a work item, the link changes happen
        /// only on the server side after work item is saved. This method tries to access to the work items
        /// which are at the other end of the work item links. If the work item of the link end is managed by
        /// work item manager, link operation occurs. If not, there is no need to do anything because once
        /// the work item is downloaded, it will include new link changes.</summary>

        let linkInfo: ILinkInfo;
        let workItem: WorkItem;
        const workItemManager = this.workItemManager;

        for (let i = 0, l = changedWorkItemLinks.length; i < l; i++) {
            linkInfo = changedWorkItemLinks[i];
            workItem = workItemManager.getWorkItem(linkInfo.targetId);

            if (workItem) {
                // We do this operation if the work item is managed by workItemManager
                if (linkInfo.command === "add") {
                    this.addWorkItemLink(workItem, linkInfo);
                }
                else if (linkInfo.command === "remove") {
                    this.deleteWorkItemLink(workItem, linkInfo);
                }
            }
        }
    }

    public addWorkItemLink(workItem: WorkItem, linkInfo: ILinkInfo) {
        const linkData = linkInfo.linkData;
        const linkType = workItem.store.findLinkTypeEnd(linkData["LinkType"]).oppositeEnd.id;

        // Trying to figure out whether the same link already exists
        const link = this.findWorkItemLink(workItem, linkInfo.sourceId, linkType);

        if (link) {
            // The same link is already added by the user. We need to mark this link as not new.
            link.linkData["Changed Date"] = linkData["Changed Date"];
        }
        else {
            // Adding the link to the list by setting new id and link type
            const newLinkData = <ILinkInfo>($.extend({}, linkData));
            newLinkData["ID"] = linkInfo.sourceId;
            newLinkData["LinkType"] = linkType;
            workItem.allLinks.push(new WorkItemLink(workItem, newLinkData));
        }

        workItem.linksUpdatedExternally()

        // Resetting links so that newly added link will be a part of valid links
        workItem.resetLinks();

        // Firing event to notify subscribers about this new link change
        workItem.fireFieldChange([WITConstants.DalFields.RelatedLinks, WITConstants.DalFields.HistoryId]);
    }

    public deleteWorkItemLink(workItem: WorkItem, linkInfo: ILinkInfo) {
        let link: WorkItemLink;
        const linkData = linkInfo.linkData;
        const linkType = workItem.store.findLinkTypeEnd(linkData["LinkType"]).oppositeEnd.id;

        // Trying to figure out whether the same link already exists
        link = this.findWorkItemLink(workItem, linkInfo.sourceId, linkType);

        if (link) {
            // Link is found. By setting a valid revised date, link is marked as removed.
            link.linkData["Revised Date"] = linkData["Revised Date"];
            link.linkData["Revised By"] = linkData["Revised By"];
        }

        workItem.linksUpdatedExternally()

        // Resetting links so that removed link will be out of valid links
        workItem.resetLinks();

        // Firing event to notify subscribers about this deleted link change
        workItem.fireFieldChange([WITConstants.DalFields.RelatedLinks, WITConstants.DalFields.HistoryId]);
    }

    public findWorkItemLink(workItem: WorkItem, targetId: number, linkType: number): WorkItemLink {
        const links = workItem.getLinks();
        let link: Link;
        for (let i = 0, l = links.length; i < l; i++) {
            link = links[i];
            if (link instanceof WorkItemLink &&
                (<WorkItemLink>link).getTargetId() === targetId &&
                (<WorkItemLink>link).getLinkType() === linkType) {
                return (<WorkItemLink>link);
            }
        }
    }

    private _fireEventsForWorkItemLinkTargets(changedWorkItemLinks: ILinkInfo[]) {
        let changedWorkItemLinksGroupByTargetId: IDictionaryNumberTo<ILinkInfo[]> = {};
        changedWorkItemLinks.forEach((link) => {
            const targetId = link.targetId;
            const workItem = this.workItemManager.getWorkItem(targetId);
            if (workItem) {
                if (!changedWorkItemLinksGroupByTargetId[targetId]) {
                    changedWorkItemLinksGroupByTargetId[targetId] = [];
                }
                changedWorkItemLinksGroupByTargetId[targetId].push(link);
            }
        });
        for (const id in changedWorkItemLinksGroupByTargetId) {
            const workItem = this.workItemManager.getWorkItem(Number(id));
            workItem.fireWorkItemLinksUpdatedByOtherWorkItem(<IWorkItemChangedArgs>({
                changedWorkItemLinks: changedWorkItemLinksGroupByTargetId[id]
            }));
        }
    }
}

interface CacheData {
    workItem: WorkItem;
    timeStamp: number;
}

export interface WorkItemStoreEventParam {
    workItemId: number;
}

export class WorkItemManager {

    private static cacheCleanupTimeout = 10 * 60 * 1000;
    private static WORKITEM_MANAGER_KEY = "workitem-manager";
    private static MINIMUM_PAGE_SIZE = 10;

    public store: WorkItemStore;
    public hasDirtyManager: boolean = false;

    private _downloading: boolean = false;
    private _workItemChangedDelegate: any;
    private _updateClassificationMruThrottledDelegate: Function;
    private _linkManager: LinkManager;
    private _lastRetrievedWorkitemCIData: any;

    private _cache: IDictionaryNumberTo<CacheData>;
    private _pendingWorkitems: IDictionaryStringTo<PendingWorkItem>;
    private _pinCounts: IDictionaryNumberTo<number>;
    private _events: Events_Handlers.NamedEventCollection<WorkItemManager, any>;
    private _cleanerTimer: any;
    private _runningDocumentEntry: Events_Document.RunningDocumentsTableEntry;

    private _areaIdsMap: IDictionaryStringTo<number[]>;
    private _iterationIdsMap: IDictionaryStringTo<number[]>;

    public static _initialize() {
        // Set up global listeners for work item changes
        Events_Services.getService().attachEvent(Actions.WORKITEM_DELETED, WorkItemManager._onWorkItemDeleted);
        Events_Services.getService().attachEvent(Actions.WORKITEM_RESTORED, WorkItemManager._onWorkItemRestored);
        Events_Services.getService().attachEvent(Actions.WORKITEM_DESTROYED, WorkItemManager._onWorkItemDestroyed);
        Events_Services.getService().attachEvent(Actions.WORKITEM_DISCARDED, WorkItemManager._onWorkItemDiscarded);
        Events_Services.getService().attachEvent(Actions.WORKITEM_ID_UPDATED, WorkItemManager._onWorkItemIdUpdated);
        Events_Services.getService().attachEvent(Actions.WORKITEM_COPIED, WorkItemManager._onWorkItemCopied);
    }

    public static get(store: WorkItemStore) {
        let manager: WorkItemManager = store.relatedData[WorkItemManager.WORKITEM_MANAGER_KEY];

        if (!manager) {
            manager = new WorkItemManager(store);
            store.relatedData[WorkItemManager.WORKITEM_MANAGER_KEY] = manager;
        }

        return manager;
    }

    private static _onWorkItemDeleted(store: WorkItemStore, args: WorkItemStoreEventParam) {

        const manager = WorkItemManager.get(store);

        // If work item is in work item manager, fire work item deleted on the work item and remove it from cache
        const workItem = manager.getWorkItem(args.workItemId);
        if (workItem) {
            // Set the IsDeleted field to true so that extensions can know that this was deleted
            const deleteField = workItem.getField(WITConstants.CoreField.IsDeleted);
            deleteField.setValue(true, true);

            workItem.fireWorkItemDeleted();
            const workItemsToUpdate = [workItem.id];

            // clean the cache of linked workItems
            const links = workItem.getLinks();
            let link: Link;

            for (let j = 0; j < links.length; j++) {
                link = links[j];
                if (link instanceof WorkItemLink) {
                    const targetId = (<WorkItemLink>link).getTargetId();
                    const sourceId = (<WorkItemLink>link).getSourceId();
                    workItemsToUpdate.push(targetId === workItem.id ? sourceId : targetId);
                }
            }
            manager.removeWorkItems(workItemsToUpdate);
        }

    }

    private static _onWorkItemRestored(store: WorkItemStore, args: WorkItemStoreEventParam) {
        WorkItemManager._removeWorkItemFromManager(store, args.workItemId);
    }

    private static _onWorkItemDestroyed(store: WorkItemStore, args: WorkItemStoreEventParam) {
        WorkItemManager._removeWorkItemFromManager(store, args.workItemId);
    }

    private static _removeWorkItemFromManager(store: WorkItemStore, id: number) {
        const manager = WorkItemManager.get(store);
        const workItem = manager.getWorkItem(id);

        if (workItem) {
            manager.removeWorkItem(workItem);
        }
    }

    private static _onWorkItemDiscarded(workItem: WorkItem) {
        const manager = WorkItemManager.get(workItem.store);
        manager.removeWorkItem(workItem);
    }

    private static _onWorkItemIdUpdated(workItem: WorkItem) {
        const manager = WorkItemManager.get(workItem.store);
        manager.updatePinWithSavedId(workItem);
    }

    private static _onWorkItemCopied(workItem: WorkItem) {
        const manager = WorkItemManager.get(workItem.store);
        manager.onWorkItemChanged(manager, { workItem: workItem, change: WorkItemChangeType.Created });
        manager.setWorkItem(workItem);
    }

    constructor(store: WorkItemStore) {
        /// <summary>Acts as cache and dirty manager for the work item objects that are used throughout in OM and UI.</summary>
        /// <param name="store" type="WorkItemStore">The work item store.</param>

        this.store = store;
        this._cache = {};
        this._pinCounts = {};
        this._pendingWorkitems = {};
        this._workItemChangedDelegate = Utils_Core.delegate(this, this.onWorkItemChanged);
        this._events = new Events_Handlers.NamedEventCollection();
        this._linkManager = new LinkManager(this);

        this._updateClassificationMruThrottledDelegate = Utils_Core.throttledDelegate(this, 100, this._updateClassificationMru);

        this._cleanerTimer = window.setInterval(() => {
            this.cleanCache();
        }, WorkItemManager.cacheCleanupTimeout);

        Events_Services.getService().attachEvent(HubEventNames.PostXHRNavigate, (sender: any, args: IHubEventArgs) => {
            // Reset dirty work items when hub XHR navigation happens
            this.resetDirtyWorkItems();

            // During the hub XHR navigation, running doc will be reset. Trigger delayed registration.
            Q.fcall(() => this.registerRunningDocumentEntry());
        });

        this.registerRunningDocumentEntry();
    }

    private _deletingOrRestoringMessageDelegate: (JQueryEventObject) => string = (e: JQueryEventObject) => {
        if (!Events_Document.getRunningDocumentsTable().isModified() && this.store.isDeletingOrRestoring()) {
            return Resources.DeleteOrRestoreConfirmationMessage;
        }
    };

    public registerRunningDocumentEntry() {
        if (this._runningDocumentEntry) {
            Events_Document.getRunningDocumentsTable().remove(this._runningDocumentEntry);
            $(window).bind("beforeunload", this._deletingOrRestoringMessageDelegate);
        }

        this._runningDocumentEntry = Events_Document.getRunningDocumentsTable().add(this.store.path() + "/WorkItemManager", {
            isDirty: () => {
                return this.isDirty(true);
            },
            beginSave: (callback, errorCallback: IErrorCallback) => {
                return this.beginSaveDirtyWorkItems(callback, errorCallback);
            },
            getDirtyDocumentTitles: (maxTitles) => {
                return this.getDirtyWorkItemTitles(maxTitles);
            }
        });

        $(window).bind("beforeunload", this._deletingOrRestoringMessageDelegate);
    }

    public getDirtyWorkItemTitles(maxTitles: number): string[] {
        let i, l, dirtyItem;
        const titles = [], dirtyItems = this.getDirtyWorkItems();
        for (i = 0, l = Math.min(maxTitles, dirtyItems.length); i < l; i++) {
            dirtyItem = dirtyItems[i];
            titles.push(dirtyItem.getCaption(false));
        }
        return titles;
    }

    public resetDirtyWorkItems() {
        const dirtyWorkItems = this.getDirtyWorkItems();
        for (const workItem of dirtyWorkItems) {
            workItem.reset();

            if (workItem.isNew()) {
                // Need to remove this from the set of work items, no other way to make it 'clean'
                this.removeWorkItem(workItem);
            }
        }
    }

    public dispose() {
        if (this._cleanerTimer) {
            window.clearInterval(this._cleanerTimer);
            this._cleanerTimer = null;
        }
    }

    public invalidateCache(workItemIds: number[]) {
        /// <summary>
        ///     Invalidates the cache for the list of workItemIds. Note that the cache will only be invalidated if certain conditions
        ///     are satisfied. For example, the work item is not pinned or dirty.
        /// </summary>
        /// <param name="workItemIds" type="number[]">The list of work item ids to clear from the cache</param>

        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");

        let cacheData: CacheData;
        let id: number;

        for (let i = 0, l = workItemIds.length; i < l; i += 1) {
            id = workItemIds[i];
            cacheData = this._cache[id];

            if (cacheData) {
                if (!this.isPinned(id) && !cacheData.workItem.isDirty()) {
                    this.removeWorkItem(cacheData.workItem);
                }
            }
        }
    }

    public cleanCache() {
        /// <summary>Removes work items that are not pinned from the cache.
        /// This method is run periodically (60 seconds) by a timer.
        /// </summary>
        let cacheData: CacheData;
        const now = new Date().getTime();

        const cache = this._cache;
        for (const id in cache) {
            if (cache.hasOwnProperty(id)) {
                cacheData = this._cache[id];
                if ((now - cacheData.timeStamp) > WorkItemManager.cacheCleanupTimeout && !this.isPinned(Number(id))) {
                    if (!cacheData.workItem.isDirty()) {
                        delete cache[id];
                    }
                }
            }
        }
    }

    public resetCache() {
        this._pinCounts = {};
        this._cache = {};
        this._pendingWorkitems = {};
    }

    public getLastRetrievedWorkitemCIData(): any {
        return this._lastRetrievedWorkitemCIData;
    }

    public updatePinWithSavedId(workItem: WorkItem) {
        /// <summary>When the id is set (i.e. when the workitem is saved), nothing is ever bound/unbound
        /// so the ID is never updated.
        /// This adds the new workitem ID to the cache with the same pinCount as the old tempId had
        /// </summary>
        /// <param name="workItem" type="WorkItem">The work item that needs to be spared from cache cleanup.</param>

        if (workItem.tempId < 0) {
            const negativeId = workItem.tempId;
            const positiveId = workItem.id || 0;

            const pinCount = this._pinCounts[negativeId] || 0;
            if (pinCount > 0 && positiveId > 0) {
                this._pinCounts[positiveId] = pinCount;
            }
        }
    }

    public pin(workItem: WorkItem) {
        /// <summary>Increases pin count for the work item.
        /// If pin count is greater than 0 cleanCache method will not remove work items from the cache.
        /// Note: Pinning a work item will reset work item's cache expiration timeout.
        /// </summary>
        /// <param name="workItem" type="WorkItem">The work item that needs to be spared from cache cleanup.</param>

        if (!(workItem instanceof WorkItem)) {
            throw new Error("Invalid argument type: 'workItem'");
        }

        if (workItem.id > 0) {
            this._touchCache(workItem.id, workItem);
            this._incrementPinCount(workItem.id);
        }

        if (workItem.tempId < 0) {
            this._touchCache(workItem.tempId, workItem);
            this._incrementPinCount(workItem.tempId);
        }
    }

    public unpin(workItem: WorkItem) {
        /// <summary>Decreases pin count for the work item.
        /// If pin count is greater than 0 cleanCache method will not remove work items from the cache.
        /// Note: Unpinning a work item will reset work item's cache expiration timeout.
        /// </summary>
        /// <param name="workItem" type="WorkItem">The work item that needs to be free for cache cleanup.</param>
        if (!(workItem instanceof WorkItem)) {
            throw new Error("Invalid argument type: 'workItem'.");
        }

        if (workItem.id > 0) {
            this._touchCache(workItem.id, workItem);
            this._decrementPinCount(workItem.id);
        }

        if (workItem.tempId < 0) {
            this._touchCache(workItem.tempId, workItem);
            this._decrementPinCount(workItem.tempId);
        }
    }

    public isPinned(id: number): boolean {
        /// <summary>Checks whether work item is pinned or not.</summary>
        /// <param name="id" type="Number">Id of the work item.</param>
        /// <returns type="Boolean" />

        return (this._pinCounts[id] || 0) > 0;
    }

    public createWorkItem(workItemType: WorkItemType, workItemData?: IWorkItemData, extensions?: IWorkItemTypeExtension[]): WorkItem {
        /// <summary>Creates a work item from the type definition and optional data.
        /// This is the preferred method for creating work items when you want UI support from the
        /// WorkItemManager (the majority of the WebAccess code).</summary>
        /// <param name="workItemType" type="WorkItemType">The work item type for the work item to create</param>
        /// <param name="workItemData" type="object" optional="true">Optional data to pass to the work item's constructor</param>
        /// <returns type="WorkItem">The new work item</returns>
        const workItem = workItemType.create(workItemData, extensions);
        this.onWorkItemChanged(this, { workItem: workItem, change: WorkItemChangeType.Created });
        this.setWorkItem(workItem);
        return workItem;
    }

    /**
     * Gets a work item asynchronously from the cache. If the work item is not present in the cache it will be
     * retrieved from the server and be cached. Note: Accessing a work item from the cache will reset its expiration timeout.
     * @param id Id of the work item.
     * @param callback Success callback. The first parameter will be the work item object.
     * @param errorCallback Error callback. The first parameter will be the error object.
     * @param isDeleted True to retrieve deleted work item. Otherwise retrieve nondeleted work item.
     * @param revision  Optional revision of the requested workitem. The value is used to evict a particular work item entry if its cached version is older. -1 means try to get fresh.
     * @param includeExtensionFields Should extension fields be included
     */
    public beginGetWorkItem(id: number,
        callback: IResultCallback,
        errorCallback?: IErrorCallback,
        isDeleted?: boolean,
        revision?: number,
        includeExtensionFields?: boolean) {

        if (this.getManagedWorkItems().length > 0) {
            if (!this._cache[id]) {
                this._lastRetrievedWorkitemCIData = { "CacheHit": "false" };
            }
            else {
                if (revision && ((revision > this._cache[id].workItem.revision) || (revision === -1))) {
                    this.invalidateCache([id]);
                }
                else {
                    const timeInCache = new Date().getTime() - this._cache[id].timeStamp;
                    this._lastRetrievedWorkitemCIData = {
                        "CacheHit": "true",
                        "TimeInCache": timeInCache.toString()
                    };
                }
            }
        }

        const options: IBeginGetWorkItemsOptions = {
            isDeleted: isDeleted,
            includeExtensionFields: includeExtensionFields
        };

        this.beginGetWorkItems([id], (workItems: WorkItem) => {

            if ($.isFunction(callback)) {
                callback.call(this, workItems && workItems[0]);
            }
        }, errorCallback, options);
    }

    public beginGetWorkItems(ids: number[], callback: IResultCallback, errorCallback?: IErrorCallback, options?: IBeginGetWorkItemsOptions) {
        /// <summary>Gets work item(s) asynchronously from the cache in pages of WorkItemManager.PAGE_SIZE, invoking an optional callback for
        /// each page of work item(s) streamed to the client (i.e. not in the cache).  If the work item(s) are not present in the cache they will be
        /// retrieved from the server and be cached.
        /// Note: Accessing a work item from the cache will reset its expiration timeout.
        /// </summary>
        /// <param name="ids" type="Array">An array of work item IDs.</param>
        /// <param name="callback" type="IResultCallback">Success callback. The first parameter will be the work item(s) array.</param>
        /// <param name="errorCallback" type="IErrorCallback">Error callback. The first parameter will be the error object.</param>
        /// <param name="options" type="Object">Additional options.</param>

        const readyWorkItemIds: number[] = [];
        const workItemsMap: IDictionaryNumberTo<WorkItem> = {};
        let pendingMap: IDictionaryNumberTo<number> = {};
        let pendingCount = 0;
        let pageSize: number = PageSizes.SAVE;
        let finished: boolean;

        options = options || {};

        if (options.pageSize && (Number(options.pageSize) > 0)) {
            pageSize = options.pageSize;
        }
        const tryFinish = () => {
            if (!finished && pendingCount <= 0) {
                finished = true;

                if ($.isFunction(callback)) {
                    callback.call(this, $.map(ids, (id) => {
                        return workItemsMap[id];
                    }));
                }
            }
        };

        const workItemReady = (id: number, workItem: WorkItem) => {
            pendingCount--;
            delete pendingMap[id];

            workItemsMap[id] = workItem;

            tryFinish();
        }

        const cancelPendingWorkItems = () => {
            $.each(pendingMap, (id, cookie) => {
                if (pendingMap.hasOwnProperty(id)) {
                    this._cancelPendingGetWorkItem(id, cookie);
                }
            });

            pendingCount = 0;
            pendingMap = {};
        };

        const failed = (error: TfsError) => {
            if (!finished) {
                finished = true;
                cancelPendingWorkItems();

                VSS.handleError(error, errorCallback, this);
            }
        };

        const workItemFailed = (id: string, error: TfsError) => {
            pendingCount--;
            delete pendingMap[id];

            failed(error);
        };

        const onCancel = () => {
            if (!finished) {
                failed(Error_canceled());
            }
        };

        $.each(ids, (i, id) => {
            const workItem = this.getWorkItem(id);

            if (workItem) {
                readyWorkItemIds.push(id);
                workItemsMap[id] = workItem;
            }
            else {
                pendingCount++;
                pendingMap[id] = this._pendWorkItem(id, workItemReady, workItemFailed);
            }
        });

        if (options.cancelable) {
            options.cancelable.register(onCancel);
        }

        if ($.isFunction(options.pageOperationCallback) && readyWorkItemIds.length > 0) {
            options.pageOperationCallback($.map(readyWorkItemIds, (id) => {
                return workItemsMap[id];
            }));
        }

        if (pendingCount) {
            this._downloadPendingWorkItems(options.pageOperationCallback, pageSize, options.isDeleted, options.includeExtensionFields, options.retryOnExceedingJsonLimit, options.excludeFromUserRecentActivity);
        }
        else {
            tryFinish();
        }
    }

    public getWorkItem(id: number): WorkItem {
        /// <summary>Returns cached work item by id. If the work item
        /// is not present in the cache return value will be undefined.
        /// Note: Accessing a work item from the cache will reset its expiration timeout.
        /// </summary>
        /// <param name="id" type="Number">Id of the work item.</param>
        /// <returns type="WorkItem">Returns a work item instance if it is found in the cache otherwise return value is undefined.</returns>

        let workItem: WorkItem;
        const cacheData = this._cache[id];

        if (cacheData) {
            cacheData.timeStamp = new Date().getTime();
            workItem = cacheData.workItem;
        }

        return workItem;
    }

    public bind(workItem: WorkItem) {
        if (!(workItem instanceof WorkItem)) {
            throw new Error("Invalid argument type: 'workItem'.");
        }

        workItem.attachWorkItemChanged(this._workItemChangedDelegate);
    }

    public unbind(workItem?: WorkItem) {
        /// <param name="workItem" type="WorkItem" optional="true" />

        if (!(workItem instanceof WorkItem)) {
            throw new Error("Invalid argument type: 'workItem'.");
        }

        workItem.detachWorkItemChanged(this._workItemChangedDelegate);
    }

    public setWorkItem(workItem: WorkItem) {
        /// <summary>Caches the work item object.</summary>
        /// <param name="workItem" type="WorkItem">The work item object to be cached.</param>
        let cacheData: CacheData;

        if (!(workItem instanceof WorkItem)) {
            throw new Error("Invalid argument type: 'workItem'.");
        }

        this._setManager(workItem);

        cacheData = {
            workItem: workItem,
            timeStamp: new Date().getTime()
        };

        if (workItem.id > 0) {
            this._cache[workItem.id] = cacheData;
        }

        if (workItem.tempId < 0) {
            this._cache[workItem.tempId] = cacheData;
        }
    }

    public removeWorkItem(workItem: WorkItem) {
        if (!(workItem instanceof WorkItem)) {
            throw new Error("Invalid argument type: 'workItem'.");
        }

        if (workItem.id > 0) {
            delete this._cache[workItem.id];
            delete this._pinCounts[workItem.id];
        }

        if (workItem.tempId < 0) {
            delete this._cache[workItem.tempId];
            delete this._pinCounts[workItem.tempId];
        }

        this._clearManager(workItem);
    }

    public removeWorkItems(workItemIds: number[]) {
        /// <summary>Remove cached work item instances.
        /// Note: Remove cached work item instance by Ids if exists.
        /// </summary>
        workItemIds.forEach((id, index) => {
            const workItem = this.getWorkItem(id);
            if (workItem) {
                this.removeWorkItem(workItem);
            }
        });
    }

    public getManagedWorkItems(): WorkItem[] {
        /// <summary>Returns cached work item instances.
        /// Note: Getting all work items will not touch expiration times.
        /// </summary>
        /// <returns type="WorkItem[]" />
        const workItems: WorkItem[] = [];
        const cache = this._cache;
        let workItem: WorkItem;

        for (const id in cache) {
            if (cache.hasOwnProperty(id)) {
                workItem = cache[id].workItem;

                if (Number(id) < 0 && workItem.id !== 0) {
                    //id is tempId of the work item and work item is already saved. We don't want to include this work item in our list
                    continue;
                }

                workItems.push(workItem);
            }
        }

        return workItems;
    }

    public getDirtyWorkItems(): WorkItem[] {
        /// <summary>Returns cached work item instances that are dirty.
        /// Note: Getting all work items will not touch expiration times.
        /// </summary>
        /// <returns type="WorkItem[]" />

        const dirtyItems: WorkItem[] = [];
        const workItems = this.getManagedWorkItems();
        for (let i = 0, l = workItems.length; i < l; i++) {
            if (workItems[i].isDirty()) {
                dirtyItems.push(workItems[i]);
            }
        }

        return dirtyItems;
    }

    public beginSaveDirtyWorkItems(callback: IResultCallback, errorCallback?: IErrorCallback): void {
        return this.store.beginSaveWorkItemsBatch(this.getDirtyWorkItems(), callback, errorCallback);
    }

    public onWorkItemChanged(sender: any, args?: IWorkItemChangedArgs) {
        if (args.change === WorkItemChangeType.PreSave) {
            const workItem: WorkItem = args.workItem;

            if (workItem && workItem.isDirty()) {
                this._populateWorkItemClassificationNodes(workItem);
                this._updateClassificationMruThrottledDelegate();
            }
        }
        if (args.change === WorkItemChangeType.Saved) {
            this.setWorkItem(args.workItem);
        }

        this._linkManager.workItemsChanged(args);

        this._events.invokeHandlers("work-item-changed", this, args);
    }

    public attachWorkItemChanged(handler: IEventHandler) {
        /// <summary>Attaches a generic work item change event handler.
        /// This event handler will be triggered for all changed work items that are
        /// managed by work item manager.
        /// </summary>
        /// <param name="handler" type="IEventHandler">Event handler callback.</param>

        this._events.subscribe("work-item-changed", <any>handler);
    }

    public detachWorkItemChanged(handler: IEventHandler) {
        /// <summary>Removes work item change handler from the event handler list.</summary>
        /// <param name="handler" type="IEventHandler">Event handler callback.</param>

        this._events.unsubscribe("work-item-changed", <any>handler);
    }

    public isDirty(onlyUserChanges?: boolean): boolean {
        /// <summary>Returns true if any of managed work items is dirty.</summary>
        /// <param name="onlyUserChanges" type="boolean" optional="true" />
        /// <returns type="Boolean" />

        const workItems = this.getManagedWorkItems();
        for (let i = 0, l = workItems.length; i < l; i++) {
            if (workItems[i].isDirty(onlyUserChanges)) {
                return true;
            }
        }
        return false;
    }

    private _populateWorkItemClassificationNodes(workItem: WorkItem) {
        const workItemUpdate = workItem.getUpdateData();
        const payloadFields = workItemUpdate && workItemUpdate.payload && workItemUpdate.payload.fields;

        // populate areaIds and iterationIds to update classification mru
        if (payloadFields) {
            const areaIdField = this.store.getFieldDefinition(WITConstants.CoreFieldRefNames.AreaId);
            const iterationIdField = this.store.getFieldDefinition(WITConstants.CoreFieldRefNames.IterationId);
            const projectId = workItem.project.guid;
            const areaId = payloadFields[areaIdField.id];
            const iterationId = payloadFields[iterationIdField.id];

            if (areaIdField && areaId) {
                if (!this._areaIdsMap) {
                    this._areaIdsMap = {};
                }
                if (!this._areaIdsMap[projectId]) {
                    this._areaIdsMap[projectId] = [];
                }
                this._areaIdsMap[projectId].push(areaId);
            }
            if (iterationIdField && iterationId) {
                if (!this._iterationIdsMap) {
                    this._iterationIdsMap = {};
                }
                if (!this._iterationIdsMap[projectId]) {
                    this._iterationIdsMap[projectId] = [];
                }
                this._iterationIdsMap[projectId].push(iterationId);
            }
        }
    }

    private _updateClassificationMru() {
        const mruFluxContext = ClassificationFieldsMruStore.getDefaultFluxContext();

        if (this._areaIdsMap) {
            for (const projectId of Object.keys(this._areaIdsMap)) {
                if (this._areaIdsMap[projectId] && this._areaIdsMap[projectId].length > 0) {
                    mruFluxContext.actionsCreator.addToAreaPathMru(projectId, this._areaIdsMap[projectId]);
                }
            }

            this._areaIdsMap = null;
        }

        if (this._iterationIdsMap) {
            for (const projectId of Object.keys(this._iterationIdsMap)) {
                if (this._iterationIdsMap[projectId] && this._iterationIdsMap[projectId].length > 0) {
                    mruFluxContext.actionsCreator.addToIterationPathMru(projectId, this._iterationIdsMap[projectId]);
                }
            }

            this._iterationIdsMap = null;
        }
    }

    private _setManager(workItem: WorkItem) {

        const manager = <WorkItemManager>workItem.relatedData[WorkItemManager.WORKITEM_MANAGER_KEY];

        if (manager !== this) {
            if (manager) {
                manager.unbind(workItem);
            }

            workItem.relatedData[WorkItemManager.WORKITEM_MANAGER_KEY] = this;

            this.bind(workItem);
        }
    }

    private _clearManager(workItem: WorkItem) {

        const manager = <WorkItemManager>workItem.relatedData[WorkItemManager.WORKITEM_MANAGER_KEY];

        if (manager === this) {
            workItem.relatedData[WorkItemManager.WORKITEM_MANAGER_KEY] = null;
            this.unbind(workItem);
        }
    }

    private _touchCache(id: number, workItem: WorkItem) {
        const cacheData = this._cache[id];

        if (cacheData && cacheData.workItem === workItem) {
            //there should be a cache entry by workItem.id and the cached workItem and the work item that is passed in must be the same instance.
            cacheData.timeStamp = new Date().getTime();
        }
    }

    private _decrementPinCount(id: number) {
        let pinCount = this._pinCounts[id] || 0;
        pinCount--;

        if (pinCount <= 0) {
            delete this._pinCounts[id];
        }
        else {
            this._pinCounts[id] = pinCount;
        }
    }

    private _incrementPinCount(id: number) {
        let pinCount = this._pinCounts[id] || 0;

        pinCount++;
        this._pinCounts[id] = pinCount;
    }

    private _pendWorkItem(id: number, callback: IResultCallback, errorCallback?: (id: string, error: Error) => void): number {
        let pendingItemData = this._pendingWorkitems[id];

        const workItemReady = (id: number, workItem: WorkItem) => {
            delete this._pendingWorkitems[id];

            //if it is not in the cache cache it now
            if (!this.getWorkItem(id)) {
                this.setWorkItem(workItem);
                this.onWorkItemChanged(this, { workItem: workItem, change: WorkItemChangeType.Opened });
            }

            callback.call(this, id, workItem);
        };

        const workItemFailed = (id: number, error: Error) => {
            delete this._pendingWorkitems[id];
            errorCallback.call(this, id, error);
        };

        if (pendingItemData) {
            return pendingItemData.cbQueue.register(workItemReady, workItemFailed);
        }
        else {
            pendingItemData = {
                id: id,
                cbQueue: VSS.queueCallbacks(this, <IResultCallback>workItemReady, <IErrorCallback>workItemFailed)
            };

            this._pendingWorkitems[id] = pendingItemData
            return pendingItemData.cookie;
        }
    }

    private _cancelPendingGetWorkItem(id: number, cookie: number) {
        const pendingItemData = this._pendingWorkitems[id];

        if (pendingItemData) {
            pendingItemData.cbQueue.unregister(cookie);

            if (pendingItemData.cbQueue.count() === 0) {
                delete this._pendingWorkitems[id];
            }
        }
    }

    private _downloadPendingWorkItems(pageOperationCallback: IResultCallback,
        pageSize: number,
        isDeleted?: boolean,
        includeExtensionFields?: boolean,
        retryOnExceedingJsonLimit?: boolean,
        excludeFromUserRecentActivity?: boolean) {

        const page: PendingWorkItem[] = [];

        if (!this._downloading) {
            $.each(this._pendingWorkitems, (id: string, pendingItemData: PendingWorkItem) => {
                if (this._pendingWorkitems.hasOwnProperty(id)) {
                    page.push(pendingItemData);

                    if (page.length > pageSize) {
                        return false;
                    }
                }
            });

            if (page.length) {
                this._downloading = true;

                this.store.beginGetWorkItems($.map(page, (pendingItemData) => {
                    return (<PendingWorkItem>pendingItemData).id;
                }), (workItems) => {

                    const workItemsMap = {};
                    try {
                        $.each(workItems, (i, workItem) => {
                            workItemsMap[workItem.id] = workItem;
                        });

                        $.each(page, (i, pendingItemData) => {
                            pendingItemData.cbQueue.finish(pendingItemData.id, workItemsMap[pendingItemData.id]);
                        });

                        if (pageOperationCallback && $.isFunction(pageOperationCallback)) {
                            pageOperationCallback(workItems);
                        }
                    }
                    finally {
                        this._downloading = false;
                        this._downloadPendingWorkItems(pageOperationCallback, pageSize, isDeleted, includeExtensionFields, retryOnExceedingJsonLimit, excludeFromUserRecentActivity);
                    }
                }, (error) => {
                    try {
                        if (retryOnExceedingJsonLimit === true && pageSize >= 2 * WorkItemManager.MINIMUM_PAGE_SIZE && error.type === Exceptions.InvalidOperationException) {
                            pageSize /= 2;
                        }
                        else {
                            $.each(page, (i, pendingItemData) => {
                                pendingItemData.cbQueue.error(pendingItemData.id, error);
                            });
                        }
                    }
                    finally {
                        this._downloading = false;
                        this._downloadPendingWorkItems(pageOperationCallback, pageSize, isDeleted, includeExtensionFields, retryOnExceedingJsonLimit, excludeFromUserRecentActivity);
                    }
                }, isDeleted, includeExtensionFields, excludeFromUserRecentActivity);
            }
        }
    }
}

WorkItemManager._initialize();

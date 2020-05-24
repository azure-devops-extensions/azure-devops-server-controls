import * as Q from "q";
import * as VSS from "VSS/VSS";
import * as WITDialogShim from "WorkItemTracking/SharedScripts/WorkItemDialogShim";
import { IWorkItemDialogOptions } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls";
import * as EventsServices from "VSS/Events/Services";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { Project, WorkItemStore, WorkItem, IWorkItemChangedArgs, IWorkItemsBulkSaveSuccessResult, WorkItemType } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WorkItemChangeType, Actions, Exceptions } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemManager, WorkItemStoreEventParam } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { ItemStoreEvents, IExternalItemChangedArgs, IExternalItemDeletedArgs } from "ScaledAgile/Scripts/Shared/Stores/ItemStoreInterface";
import { delegate } from "VSS/Utils/Core";
import { IItemMapper, ItemMapper } from "ScaledAgile/Scripts/Shared/DataProviders/ItemMapper";
import { ItemSaveStatus, IItem, UpdateMode, IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { Item } from "ScaledAgile/Scripts/Shared/Models/Item";
import { ItemActions } from "ScaledAgile/Scripts/Shared/Actions/ItemActions";
import { IReorderOperation, IReorderAjaxResponse } from "Agile/Scripts/Common/Agile";

import { IWorkItemData } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { IDynamicReorderOperation, DynamicReorderManager } from "ScaledAgile/Scripts/Shared/Utils/DynamicReorderManager";
import { DatabaseCoreFieldRefName } from "Agile/Scripts/Common/Utils";

export interface ICreateWorkItemResult {
    /**
     * Indicates whether the save operation was successful. If this is false,
     * a validation error occurred (provided in "validationError"). The createdItem
     * is provided regardless, potentially in an invalid state.
     */
    saveSuccess: boolean;

    /**
     * The newly-created item
     */
    createdItem: IItem;

    /**
     * Any validation error that occurred
     */
    validationError?: any;
}

/**
 * Interface for the ItemManager to manage the WIT integration
 */
export interface IItemManager {
    /**
     * Open the given item using the WIT form
     * @param {number} workItemId - The id of the item to be opened
     */
    openWITForm(workItemId: number, options?: IWorkItemDialogOptions): void;

    /**
     * Dispose the IItemManager instance
     */
    dispose(): void;

    /**
     * Save the work item given by id and fieldUpdateList.
     * @param {string} projectId - The project id of the work item
     * @param {number} workItemId - The id of the item to be opened
     * @param {IDictionaryStringTo<any>} fieldUpdateList - The field value that needs to be updated
     */
    beginSaveWorkItem(projectId: string, workItemId: number, fieldUpdateList: IDictionaryStringTo<any>): IPromise<IWorkItemsBulkSaveSuccessResult>;

    /**
     * Reorder the work item given by id.
     * @param {string} projectId - The project id that the item being reorder belong to
     * @param {string} teamId - The team id that the item being reorder belong to
     * @param {number} workItemId - The id of the item to be reordered
     * @param {string} orderField - The order reference name of the moved item
     * @param {IReorderOperation} reorderChange - The changes to be made for this reorder 
     */
    beginReorderWorkItem(projectId: string, teamId: string, workItemId: number, orderField: string, reorderChange: IReorderOperation): IPromise<IReorderAjaxResponse>;

    /**
     * Get the valid fields using WorkItemStore.
     * @returns {IPromise<IFieldDefinition[]>} Promise resolved with a collection of all field definitions
     */
    beginGetFields(): IPromise<IFieldDefinition[]>;

    /**
     * Creates a new work item in the specified project with the given iteration, WIT and title
     */
    beginCreateNewWorkItem(projectId: string, workItemType: string, fieldUpdateList: IDictionaryStringTo<string>): IPromise<ICreateWorkItemResult>;
}

/**
 * The ItemManager instance which manages the WIT integration
 */
export class ItemManager implements IItemManager {
    private _store: WorkItemStore;
    private _onWorkItemChangedDelegate: IEventHandler;
    private _onWorkItemDeletedDelegate: IEventHandler;
    private _itemMapper: IItemMapper;
    private _itemActions: ItemActions;
    private _reorderManager: DynamicReorderManager;
    private _fields: IFieldDefinition[];

    constructor(itemActions: ItemActions) {
        this._store = ProjectCollection.getDefaultConnection().getService<WorkItemStore>(WorkItemStore);

        this._onWorkItemChangedDelegate = delegate(this, this._onWorkItemChanged);
        WorkItemManager.get(this._store).attachWorkItemChanged(this._onWorkItemChangedDelegate);

        this._onWorkItemDeletedDelegate = delegate(this, this._onWorkItemDeleted);
        // Attach to the global work item delete event instead of attaching to 'work item changed' since 
        // work item changed event for deletion gets fired only after work item is open. 
        EventsServices.getService().attachEvent(Actions.WORKITEM_DELETED, this._onWorkItemDeletedDelegate);

        this._itemMapper = new ItemMapper();
        this._itemActions = itemActions;
        this._reorderManager = new DynamicReorderManager();
    }

    /**
     * Disposing the WITOMManager instance. We should detach all the attached event handlers before desponsing this object.
     */
    public dispose(): void {
        if (this._store && this._onWorkItemChangedDelegate) {
            WorkItemManager.get(this._store).detachWorkItemChanged(this._onWorkItemChangedDelegate);
            this._onWorkItemChangedDelegate = null;
        }

        if (this._onWorkItemDeletedDelegate) {
            EventsServices.getService().detachEvent(Actions.WORKITEM_DELETED, this._onWorkItemDeletedDelegate);
            this._onWorkItemDeletedDelegate = null;
        }

        this._reorderManager = null;
    }

    /**
     * Open the given item using the WIT form
     * @param {number} workItemId - The id of the item to be opened
     */
    public openWITForm(workItemId: number, options?: IWorkItemDialogOptions) {
        WITDialogShim.showWorkItemById(workItemId, options);
    }

    /**
     * Save the work item given by id and fieldUpdateList. It will invoke item status change action based on the saving status.
     * @param {string} projectId - The project id of the work item
     * @param {number} workItemId - The id of the item to be opened
     * @param {IDictionaryStringTo<any>} fieldUpdateList - The field value that needs to be updated
     */
    public beginSaveWorkItem(projectId: string, id: number, fieldUpdateList: IDictionaryStringTo<any>): IPromise<IWorkItemsBulkSaveSuccessResult> {
        this._invokeItemStatusChangedAction(id, ItemSaveStatus.IsSaving);
        return this._beginRefresh(projectId, id).then(
            (workItem: WorkItem) => {
                this._setFieldValues(workItem, fieldUpdateList);

                return Q.Promise((resolve, reject) => {
                    workItem.beginSave(
                        (result: IWorkItemsBulkSaveSuccessResult) => {
                            this._invokeItemStatusChangedAction(id, ItemSaveStatus.Saved);
                            resolve(result);
                        },
                        (error: any) => {
                            this._invokeItemStatusChangedAction(id, ItemSaveStatus.Error, error);
                            reject(error);
                        }
                    );
                });
            });
    }

    /**
     * See IItemManager.beginReorderWorkItem
     */
    public beginReorderWorkItem(projectId: string, teamId: string, workItemId: number, orderField: string, reorderChange: IReorderOperation): IPromise<IReorderAjaxResponse> {
        let deferred = Q.defer<IReorderAjaxResponse>();
        this._invokeItemStatusChangedAction(workItemId, ItemSaveStatus.IsSaving);
        // construct reorder changes
        const changes: IDynamicReorderOperation = $.extend(true, {}, reorderChange,
            { routeData: { project: projectId, team: teamId, teamId } });
        let successCallback = (result: IReorderAjaxResponse) => {
            try {
                this._onReorderSuccess(orderField, workItemId, result);
                deferred.resolve(result);
            }
            catch (e) {
                deferred.reject(e);
            }
        };
        let errorCallback = (result: Error) => {
            this._invokeItemStatusChangedAction(workItemId, ItemSaveStatus.Error, result.message);
            deferred.reject(result);
        };

        Q(this._reorderManager.postRequest(changes)).done(successCallback, errorCallback);
        return deferred.promise;
    }

    /**
    * Get the valid fields using WorkItemStore.
    * @returns {IPromise<IFieldDefinition[]>} Promise resolved with a collection of all field definitions
    */
    public beginGetFields(): IPromise<IFieldDefinition[]> {
        if (this._fields instanceof Array) {
            return Q(this._fields);
        }

        const deferred = Q.defer<IFieldDefinition[]>();
        this._store.beginGetFields(
            (fields: IFieldDefinition[]) => {
                this._fields = fields;
                deferred.resolve(fields);
            },
            (error: TfsError) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    public beginCreateNewWorkItem(projectId: string, workItemType: string, fieldUpdateList: IDictionaryStringTo<string>): IPromise<ICreateWorkItemResult> {
        return Q.Promise<ICreateWorkItemResult>((resolve, reject) => {
            this._store.beginGetProject(projectId, (project: Project) => {
                project.beginGetWorkItemType(workItemType, (wit) => {
                    // There is a race condition in the WITOM rule engine logic which causes incorrect evaluation
                    // when setting the iteration path; if the iteration node cache isn't loaded by the time we call
                    // "setFieldValue" for that property, it will fail to resolve the path to the correct ID and
                    // default to an incorrect value. Manually loading the cache will ensure proper evaluation.
                    project.nodesCacheManager.beginGetNodes().then(() => {
                        let newWorkItem = WorkItemManager.get(this._store).createWorkItem(wit);
                        this._setFieldValues(newWorkItem, fieldUpdateList);
                        newWorkItem.beginSave(() => resolve({ saveSuccess: true, createdItem: this._itemMapper.mapWorkItemToItem(newWorkItem) }), (error) => {
                            if (error && error.name === Exceptions.WorkItemSaveFailedDueToInvalidStatusException) {
                                resolve({
                                    saveSuccess: false,
                                    createdItem: this._itemMapper.mapWorkItemToItem(newWorkItem),
                                    validationError: error
                                });
                            }
                            else {
                                reject(error);
                            }
                        });
                    }, reject);
                }, reject);
            }, reject);
        });
    }

    protected _onReorderSuccess(orderField: string, workItemId: number, result: IReorderAjaxResponse) {
        // Invalidate the updated items stored in WorkItemManager cache.
        this._invalidateCache(result.updatedWorkItemIds);
        // Update items in item store with latest order
        this._invokeUpdateItemsAction(result.updatedWorkItemIds, result.updatedWorkItemOrders, orderField);
        // Invoke item saved action
        this._invokeItemStatusChangedAction(workItemId, ItemSaveStatus.Saved);
    }

    protected _invalidateCache(workItemIds: number[]) {
        WorkItemManager.get(this._store).invalidateCache(workItemIds);
    }

    protected _invokeUpdateItemsAction(updatedWorkItemIds: number[], updatedWorkItemValues: number[], updatedField: string): void {
        let updatedItemMap: IDictionaryNumberTo<IItem> = {};
        if (updatedWorkItemIds.length !== updatedWorkItemValues.length) {
            throw new Error("the updated work item ids count does match the updated values count");
        }
        for (let i = 0, l = updatedWorkItemIds.length; i < l; i++) {
            let id = updatedWorkItemIds[i];
            updatedItemMap[id] = new Item(id, { [updatedField]: updatedWorkItemValues[i] });
        }
        this._itemActions.updateItemsAction.invoke({
            itemMap: updatedItemMap,
            updateMode: UpdateMode.FieldUpdate
        });
    }

    private _invokeItemStatusChangedAction(id: number, status: ItemSaveStatus, error?: any) {
        this._itemActions.updateItemStatusAction.invoke({
            id: id,
            status: status,
            message: error && VSS.getErrorMessage(error)
        });
    }

    /**
     * Gets and/or refreshes a work item
     * @param {string} projectId - The project id of the work item
     * @param {number} workItemId - The id of the item to be opened
     */
    private _beginRefresh(projectId: string, workItemId: number, shouldInvalidateCache?: boolean): IPromise<WorkItem> {
        return Q.Promise((resolve, reject) => {
            this._store.beginGetProject(projectId, (project: Project) => {
                Q(project.nodesCacheManager.beginGetNodes()).done(() => {
                    let witManager = WorkItemManager.get(this._store);
                    if (shouldInvalidateCache) {
                        witManager.invalidateCache([workItemId]);
                    }
                    witManager.beginGetWorkItem(workItemId, resolve, reject);
                }, reject);
            }, reject);
        });
    }

    /**
     * Work item to update
     * @param workItem Work item to update
     * @param fieldUpdateList List of field updates to apply to work item
     */
    private _setFieldValues(workItem: WorkItem, fieldUpdateList: IDictionaryStringTo<any>) {
        for (let key of Object.keys(fieldUpdateList)) {
            workItem.setFieldValue(key, fieldUpdateList[key]);
        }
    }

    /** 
     * Handler for external work item changes
     * SaveCompleted is called by both itemChanged and itemCreated
     */
    private _onWorkItemChanged(sender: any, args: IWorkItemChangedArgs) {
        switch (args.change) {
            case WorkItemChangeType.SaveCompleted:
            case WorkItemChangeType.Reset:
                if (!args.workItem.isNew()) {
                    EventsServices.getService().fire(ItemStoreEvents.EXTERNAL_ITEM_CHANGED, this, {
                        item: this._itemMapper.mapWorkItemToItem(args.workItem)
                    } as IExternalItemChangedArgs);
                }
                break;
        }
    }

    private _onWorkItemDeleted(store: WorkItemStore, args: WorkItemStoreEventParam) {
        EventsServices.getService().fire(ItemStoreEvents.EXTERNAL_ITEM_DELETED, this, {
            id: args.workItemId
        } as IExternalItemDeletedArgs);
    }
}

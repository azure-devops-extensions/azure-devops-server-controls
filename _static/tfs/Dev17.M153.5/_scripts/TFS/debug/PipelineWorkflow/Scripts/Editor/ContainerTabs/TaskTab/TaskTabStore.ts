/**
 * @brief Contains Store for TaskTab container view
 */

import { Item } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TaskTabStoreBase } from "DistributedTaskControls/SharedViews/ContainerTabs/TaskTab/TaskTabStoreBase";
import { DeployPhaseList, IDeployPhaseListItemDetails } from "DistributedTaskControls/Phase/DeployPhaseList";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { ProcessItem } from "PipelineWorkflow/Scripts/Editor/Environment/DeployProcessItem";
import { TaskTabActions } from "PipelineWorkflow/Scripts/Shared/ContainerTabs/TaskTab/TaskTabActions";
import { GatesDeployPhaseItem } from "PipelineWorkflow/Scripts/Shared/Environment/GatesDeployPhaseItem";
import { ReleaseDeployPhaseHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseDeployPhaseHelper";

export interface ITaskTabStoreArgs {
    environmentId?: number;
}

export class TaskTabStore extends TaskTabStoreBase {

    constructor(args: ITaskTabStoreArgs) {
        super();
        this._environmentId = args.environmentId;
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineTaskTabStoreKey;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this.addToStoreList(this._environmentListStore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore), true);

        this._environmentListStore.addChangedListener(this._handleEnvironmentListStoreChange);

        this._taskTabActions = ActionsHubManager.GetActionsHub<TaskTabActions>(TaskTabActions);
        this._taskTabActions.selectEnvironment.addListener(this._handleSelectEnvironment);
    }

    public disposeInternal(): void {
        this._environmentListStore.removeChangedListener(this._handleEnvironmentListStoreChange);
        this._taskTabActions.selectEnvironment.removeListener(this._handleSelectEnvironment);
        super.disposeInternal();
    }

    public getEnvironmentList(): EnvironmentListStore {
        return this._environmentListStore;
    }

    public getSelectedEnvironmentStore(): DeployEnvironmentStore {
        return this._selectedEnvironmentStore;
    }

    public getSelectedEnvironmentId(): number {
        return this._selectedEnvironmentStore ? this._selectedEnvironmentStore.getEnvironmentId() : 0;
    }

    public getItemList(environmentInstanceId: string): Item[] {
        return (!!this._deployProcessItem[environmentInstanceId]) ? [
            this._deployProcessItem[environmentInstanceId],
            this._deployPhaseListItem[environmentInstanceId]
        ] : [];
    }

    public isValid(): boolean {
        return this._environmentListStore.areEnvironmentWorkflowsValid();
    }

    private _handleSelectEnvironment = (environmentId: number) => {
        if (!this._selectedEnvironmentStore || this._selectedEnvironmentStore.getEnvironmentId() !== environmentId) {
            let environmentStore = this._environmentListStore.getDataStoreList().filter((environmentStore: DeployEnvironmentStore) => {
                return (environmentStore.getEnvironmentId() === environmentId);
            });
            if (environmentStore && environmentStore.length > 0) {
                this._selectedEnvironmentStore = environmentStore[0];
                this.emitChanged();
            }
        }
    }

    private _handleEnvironmentListStoreChange = () => {
        let environmentStoreList: DeployEnvironmentStore[] = this._environmentListStore.getDataStoreList() as DeployEnvironmentStore[];
        if (environmentStoreList.length > 0) {

            // If the selected environment is not in the list of environment list store, it means it is deleted
            if (this._selectedEnvironmentStore && !environmentStoreList.some(store => store === this._selectedEnvironmentStore)) {
                this._selectedEnvironmentStore = null;
            }

            if (!this._selectedEnvironmentStore) {
                let filteredStores: DeployEnvironmentStore[] = [];
                if (this._environmentId) {
                    filteredStores = environmentStoreList.filter((store: DeployEnvironmentStore) => {
                        return store.getEnvironmentId() === this._environmentId;
                    });
                }

                if (filteredStores.length > 0) {
                    this._selectedEnvironmentStore = filteredStores[0];
                }
                else {
                    this._selectedEnvironmentStore = environmentStoreList[0];
                }
            }

            let deployProcessItemListChanged: boolean = false;
            this._environmentListStore.getDataStoreList().forEach((environmentStore: DeployEnvironmentStore) => {
                let environmentInstanceId: string = environmentStore.getInstanceId();
                if (!this._deployProcessItem[environmentInstanceId]) {
                    this._deployProcessItem[environmentInstanceId] = new ProcessItem(environmentStore.getInstanceId(), 1, 0);
                    this._deployPhaseListItem[environmentInstanceId] = new DeployPhaseList({
                        store: environmentStore.getPhaseListStore(),
                        itemToSelectAfterDelete: this._deployProcessItem[environmentInstanceId],
                        treeLevel: 2,
                        initialIndex: 0,
                        createItemDelegateMap: ReleaseDeployPhaseHelper.getCreateItemDelegateMap()
                    } as IDeployPhaseListItemDetails);
                    deployProcessItemListChanged = true;
                }
            });

            this._cleanupDeletedEnvironmentInstances();

            if (deployProcessItemListChanged) {
                this.emitChanged();
            }
        } else {
            this._selectedEnvironmentStore = null;
            this._cleanupDeletedEnvironmentInstances();
            this.emitChanged();
        }
    }

    private _cleanupDeletedEnvironmentInstances(): void {
        this._removeDeletedEnvironmentReferencesFromDictionary(this._deployProcessItem);
        this._removeDeletedEnvironmentReferencesFromDictionary(this._deployPhaseListItem);
    }

    private _removeDeletedEnvironmentReferencesFromDictionary(items: IDictionaryStringTo<Item>): void {
        for (let key in items) {
            if (items.hasOwnProperty(key)) {
                let environmentId = this._environmentListStore.getEnvironmentIdFromInstanceId(key);
                if (environmentId == null || environmentId === undefined) {
                    delete items[key];
                }
            }
        }
    }

    private _selectedEnvironmentStore: DeployEnvironmentStore;
    private _deployProcessItem: IDictionaryStringTo<ProcessItem> = {};
    private _deployPhaseListItem: IDictionaryStringTo<DeployPhaseList> = {};
    private _environmentListStore: EnvironmentListStore;
    private _taskTabActions: TaskTabActions;
    private _environmentId: number;
}
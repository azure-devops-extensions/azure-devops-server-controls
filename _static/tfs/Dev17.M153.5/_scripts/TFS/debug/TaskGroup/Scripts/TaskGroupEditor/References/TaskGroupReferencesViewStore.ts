import { format as formatString } from "VSS/Utils/String";

import { ITaskGroupReferenceGroup } from "DistributedTask/TaskGroups/ExtensionContracts";

import { ViewStoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Item } from "DistributedTaskControls/Common/Item";

import { StoreKeys, TabInstanceIds } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import { TabStore } from "TaskGroup/Scripts/TaskGroupEditor/TabContentContainer/TabStore";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";
import { TaskGroupReferencesStore, ITaskGroupReferencesState } from "TaskGroup/Scripts/Common/TaskGroupReferences/TaskGroupReferencesStore";
import { PanelItem } from "TaskGroup/Scripts/TaskGroupEditor/References/PanelItem";

export interface ITaskGroupReferencesViewState extends IStoreState {
    referenceItems: Item[];
}

export class TaskGroupReferencesViewStore extends ViewStoreBase {
    public static getKey(): string {
        return StoreKeys.TaskGroupReferencesViewStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._state = {
            referenceItems: null
        } as ITaskGroupReferencesViewState;

        // Initialize the tab store
        StoreManager.GetStore<TabStore>(TabStore, TabInstanceIds.References);

        this._taskGroupReferencesStore = StoreManager.GetStore<TaskGroupReferencesStore>(TaskGroupReferencesStore);
        this._taskGroupReferencesStore.addChangedListener(this._onTaskGroupReferencesStoreChange);
    }

    public disposeInternal(): void {
        this._taskGroupReferencesStore.removeChangedListener(this._onTaskGroupReferencesStoreChange);
    }

    public getState(): ITaskGroupReferencesViewState {
        return this._state;
    }

    private _onTaskGroupReferencesStoreChange = () => {
        const references = this._taskGroupReferencesStore.getState();
        if (!!references.referenceGroups) {
            this._state.referenceItems = [];

            references.referenceGroups.forEach((reference: ITaskGroupReferenceGroup, index) => {
                this._state.referenceItems.push(
                    new PanelItem(
                        this._getPanelItemId(index),
                        reference
                    )
                );
            });
        }
        else {
            this._state.referenceItems = null;
        }

        this.emitChanged();
    }

    private _getPanelItemId(index: number): string {
        return formatString("reference-{0}", index);
    }

    private _state: ITaskGroupReferencesViewState;
    private _taskGroupReferencesStore: TaskGroupReferencesStore;
}
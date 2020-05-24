import { empty as emptyString } from "VSS/Utils/String";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { IStoreState, StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { HistoryStore, IHistoryState, IRevisionsData } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";
import { TaskGroupVersionsStore, ITaskGroupVersionsStoreState } from "TaskGroup/Scripts/TaskGroupEditor/Versions/TaskGroupVersionsStore";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { getRevisionNumberToVersionSpecMapping } from "TaskGroup/Scripts/TaskGroupEditor/History/TaskGroupHistoryUtils";

import { StoreKeys } from "TaskGroup/Scripts/TaskGroupEditor/Constants";

export interface ITaskGroupRevisionData extends IRevisionsData {
    version: string;
}

export interface ITaskGroupHistoryViewState extends IHistoryState {
    revisions: ITaskGroupRevisionData[];
}

export class TaskGroupHistoryViewStore extends StoreBase {

    public static getKey(): string {
        return StoreKeys.TaskGroupHistoryStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._state = {} as ITaskGroupHistoryViewState;

        this._historyStore = StoreManager.GetStore<HistoryStore>(HistoryStore);
        this._historyStore.addChangedListener(this._triggerEmitChange);

        this._taskGroupVersionsStore = StoreManager.GetStore<TaskGroupVersionsStore>(TaskGroupVersionsStore, instanceId);
        this._taskGroupVersionsStore.addChangedListener(this._triggerEmitChange);
    }

    public disposeInternal(): void {
        this._taskGroupVersionsStore.removeChangedListener(this._triggerEmitChange);
        this._historyStore.removeChangedListener(this._triggerEmitChange);
    }

    public getState(): ITaskGroupHistoryViewState {
        this._state = this._historyStore.getState() as ITaskGroupHistoryViewState;
        this._updateStateWithVersions();
        return this._state;
    }

    private _updateStateWithVersions(): void {
        const versionsState = this._taskGroupVersionsStore.getState();
        const maxRevisionNumber = Math.max(...this._state.revisions.map((revision: IRevisionsData) => revision.revisionNumber));
        const revisionNumberToVersionSpecMapping: { [revision: number]: string } = getRevisionNumberToVersionSpecMapping(versionsState.allVersions, maxRevisionNumber);

        this._state.revisions.forEach((revision: ITaskGroupRevisionData) => {
            if (!!revisionNumberToVersionSpecMapping[revision.revisionNumber]) {
                revision.version = revisionNumberToVersionSpecMapping[revision.revisionNumber];
            }
        });
    }

    private _triggerEmitChange = (): void => {
        this.emitChanged();
    }

    private _state: ITaskGroupHistoryViewState;
    private _historyStore: HistoryStore;
    private _taskGroupVersionsStore: TaskGroupVersionsStore;
}
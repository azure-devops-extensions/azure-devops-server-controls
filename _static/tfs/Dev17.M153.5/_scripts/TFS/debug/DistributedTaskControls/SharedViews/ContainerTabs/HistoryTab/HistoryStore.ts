import { HistoryActions, IRevisionsDiffData } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryActions";

import { ActionsHubManager} from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreKeys } from "DistributedTaskControls/Common/Common";

import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

export interface IHistoryState {
    revisions: IRevisionsData[];
    revisionsDiffData: IRevisionsDiffData;
    displayHistory: boolean;
    revertToRevision: number;
    showSaveDialog: boolean;
}

export interface IRevisionsData {
    changedBy: string;
    ellipsis: JSX.Element;
    changeType: string;
    changedDate: string;
    changeDetails?: string;
    comment: string;
    revisionNumber: number;
    apiVersion?: string;
}

export enum ChangeType {
    Add = 1,
    Update,
    Delete,
    Undelete
}

export class HistoryStore extends StoreBase {

    constructor() {
        super();

        this._historyState = {
            revisions: [],
            displayHistory: true,
            revisionsDiffData: null,
            revertToRevision: 0,
            showSaveDialog: false
        } as IHistoryState;
    }

    public static getKey(): string {
        return StoreKeys.HistoryStore;
    }

    public initialize(): void {

        this._historyActions = ActionsHubManager.GetActionsHub<HistoryActions>(HistoryActions);
        this._historyActions.UpdateRevisions.addListener(this._updateRevisions);
        this._historyActions.DisplayHistory.addListener(this._displayHistory);
        this._historyActions.ShowDiffData.addListener(this._updateRevisionsDiffData);
        this._historyActions.SetRevertToRevision.addListener(this._setRevertRevision);
        this._historyActions.CloseRevertConfirmationDialog.addListener(this._hideSaveDialog);
    }

    public disposeInternal(): void {

        this._historyActions.UpdateRevisions.removeListener(this._updateRevisions);
        this._historyActions.DisplayHistory.removeListener(this._displayHistory);
        this._historyActions.ShowDiffData.removeListener(this._updateRevisionsDiffData);
        this._historyActions.SetRevertToRevision.removeListener(this._setRevertRevision);
        this._historyActions.CloseRevertConfirmationDialog.removeListener(this._hideSaveDialog);
    }

    private _updateRevisions = (revisions: IRevisionsData[]): void => {
        this._historyState.revisions = revisions;
        this.emitChanged();
    }

    private _updateRevisionsDiffData = (revisionsDiffData: IRevisionsDiffData): void => {
        this._historyState.revisionsDiffData = revisionsDiffData;
        this._historyState.displayHistory = false;
        this.emitChanged();
    }

    private _displayHistory = (showHistory: boolean): void => {
        this._historyState.displayHistory = showHistory;
        this.emitChanged();
    }

    private _setRevertRevision = (revertToRevision: number): void => {
        this._historyState.revertToRevision = revertToRevision;
        this._historyState.showSaveDialog = true;
        this.emitChanged();
    }

    private _hideSaveDialog = (): void => {
        this._historyState.showSaveDialog = false;
        this.emitChanged();
    }

    public getState(): IHistoryState {
        return this._historyState;
    }

    private _historyState: IHistoryState;
    private _historyActions: HistoryActions;
}

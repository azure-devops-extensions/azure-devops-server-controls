/**
 * @brief This file contains list of All actions related to History Scenario
 */

import { IEmptyActionPayload, ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { IRevisionsData } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

import { Action } from "VSS/Flux/Action";

export interface IRevisionsDiffData {
    originalVersion: number;
    modifiedVersion: number;
    originalVersionContent: string;
    modifiedVersionContent: string;
}

export class HistoryActions extends ActionsHubBase {

    public initialize(): void {
        this._updateRevisions = new Action<IRevisionsData[]>();
        this._showDiffData = new Action<IRevisionsDiffData>();
        this._displayHistory = new Action<boolean>();
        this._setRevertToRevision = new Action<number>();
        this._closeRevertConfirmationDialog = new Action<IEmptyActionPayload>();
    }

    public static getKey(): string {
        return ActionsKeys.HistoryActions;
    }

    public get UpdateRevisions(): Action<IRevisionsData[]> {
        return this._updateRevisions;
    }

    public get DisplayHistory(): Action<boolean> {
        return this._displayHistory;
    }

    public get ShowDiffData(): Action<IRevisionsDiffData> {
        return this._showDiffData;
    }

    public get SetRevertToRevision(): Action<number> {
        return this._setRevertToRevision;
    }

    public get CloseRevertConfirmationDialog(): Action<IEmptyActionPayload> {
        return this._closeRevertConfirmationDialog;
    }

    private _updateRevisions: Action<IRevisionsData[]>;
    private _showDiffData: Action<IRevisionsDiffData>;
    private _displayHistory: Action<boolean>;
    private _setRevertToRevision: Action<number>;
    private _closeRevertConfirmationDialog: Action<IEmptyActionPayload>;
}

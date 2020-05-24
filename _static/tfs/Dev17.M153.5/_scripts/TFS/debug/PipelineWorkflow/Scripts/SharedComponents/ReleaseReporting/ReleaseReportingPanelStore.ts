import * as Utils_Array from "VSS/Utils/Array";
import * as SDK from "VSS/SDK/Shim";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IState } from "DistributedTaskControls/Common/Components/Base";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";

import { ReleaseReportingKeys, DeploymentQueryConstants } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Constants";
import { ReleaseReportingPanelActions } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanelActions";

export interface IReleaseReportingPanelState {
    showPanel: boolean;
    width: number;
    contributions: any[];
}

export interface IReleaseReportingPanelStoreArgs {
    width: number;
}

export class ReleaseReportingPanelStore extends StoreBase {
    constructor(private _options?: IReleaseReportingPanelStoreArgs) {
        super();
        let width: number = 670;
        if (!!this._options && !!this._options.width){
            width = this._options.width;
        }

        this._state = {
            showPanel: true,
            width: width,
            contributions: []
        } as IReleaseReportingPanelState;
    }

    public static getKey(): string {
        return ReleaseReportingKeys.StoreKey_ReleaseReportingPanelStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);

        this._actions = ActionsHubManager.GetActionsHub<ReleaseReportingPanelActions>(ReleaseReportingPanelActions, instanceId);
        this._actions.initializeContributions.addListener(this._handleInitializeContributions);
    }

    public getState(): IReleaseReportingPanelState {
        return this._state;
    }

    protected disposeInternal(): void {
        this._actions.initializeContributions.removeListener(this._handleInitializeContributions);
    }

    private _handleInitializeContributions = (contributions: Contribution[]) => {
        this._state.contributions = contributions || [];

        this.emitChanged();
    }

    private _state: IReleaseReportingPanelState;
    private _actions: ReleaseReportingPanelActions;
}

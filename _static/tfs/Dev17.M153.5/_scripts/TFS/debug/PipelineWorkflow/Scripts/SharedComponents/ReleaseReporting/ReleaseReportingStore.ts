import * as Utils_Array from "VSS/Utils/Array";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IState } from "DistributedTaskControls/Common/Components/Base";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import { DialogActions } from "PipelineWorkflow/Scripts/Common/Actions/DialogActions";

import { ReleaseReportingKeys, DeploymentQueryConstants } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Constants";
import { IEnvironmentDeployments, IDeploymentRenderingData } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingDialog";
import { ReleaseReportingActions } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingActions";

export interface IReleaseReportingState extends IReleaseReportingDialogDeploymentState, IState {
    showDialog: boolean;
    definition?: PipelineTypes.PipelineDefinition;
    contributions: Contribution[];
    errorMessage?: string;
    showReleaseReportFilterBar: boolean;
    numberOfDaysToFilter: number;
    action: string;
}

export interface IReleaseReportingStoreArgs {
    showDialog: boolean;
}

export interface IReleaseReportingDialogDeploymentState extends IState {
    environmentDeployments: IEnvironmentDeployments[];
}

export class ReleaseReportingStore extends StoreBase {
    constructor(private _options?: IReleaseReportingStoreArgs) {
        super();
        this._state = {
            showDialog: !!this._options && !!this._options.showDialog,
            environmentDeployments: [],
            showReleaseReportFilterBar: false,
            numberOfDaysToFilter: DeploymentQueryConstants.DaysToAnalyze
        } as IReleaseReportingState;
    }

    public static getKey(): string {
        return ReleaseReportingKeys.StoreKey_ReleaseReportingStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._commonActions = ActionsHubManager.GetActionsHub<DialogActions>(DialogActions, instanceId);
        this._commonActions.showDialog.addListener(this._handleShowDialog);
        this._commonActions.closeDialog.addListener(this._handleCloseDialog);

        this._actions = ActionsHubManager.GetActionsHub<ReleaseReportingActions>(ReleaseReportingActions, instanceId);
        this._actions.initializeDefinition.addListener(this._handleInitializeData);
        this._actions.initializeContributions.addListener(this._handleInitializeContributions);
        this._actions.initializeDeployments.addListener(this._handleInitializeDeployments);
    }

    public getState(): IReleaseReportingState {
        return this._state;
    }

    protected disposeInternal(): void {
        this._commonActions.showDialog.removeListener(this._handleShowDialog);
        this._commonActions.closeDialog.removeListener(this._handleCloseDialog);
        this._actions.initializeDefinition.removeListener(this._handleInitializeData);
        this._actions.initializeContributions.removeListener(this._handleInitializeContributions);
        this._actions.initializeDeployments.removeListener(this._handleInitializeDeployments);
    }

    private _handleInitializeData = (definition: PipelineTypes.PipelineDefinition) => {
        this._state.definition = definition;
        this._state.environmentDeployments = [];
        
        if (definition.environments && definition.environments.length > 0) {
            definition.environments.forEach((environment) => {
                let environmentDeployment: IEnvironmentDeployments = { environmentName: environment.name, environmentId: environment.id, deployments: null };
                this._state.environmentDeployments.push(environmentDeployment);
            });
        }

        this.emitChanged();
    }

    private _handleInitializeContributions = (contributions: Contribution[]) => {
        this._state.contributions = contributions || [];

        this.emitChanged();
    }

    private _handleInitializeDeployments = (deploymentResult: IEnvironmentDeployments): void => {
        if (!!this._state && !!this._state.environmentDeployments)
        {
            this._state.environmentDeployments.forEach((deployment) => {
                if (deployment.environmentId === deploymentResult.environmentId) {
                    let deployments: IDeploymentRenderingData[] = Utils_Array.clone(deploymentResult.deployments);
                    deployment.deployments = deployments;
                }
            });
            this.emitChanged();
        }
    }

    private _handleShowDialog = () => {
        this._updateDialogVisibility(this._state.showDialog, true);
    }

    private _handleCloseDialog = () => {
        this._updateDialogVisibility(this._state.showDialog, false);
    }

    private _updateDialogVisibility(originalValue: boolean, newValue: boolean): void {
        // Emit changes only if original value and new value are different.
        if (originalValue !== newValue) {
            this._state.showDialog = newValue;
            this.emitChanged();
        }
    }

    private _state: IReleaseReportingState;
    private _commonActions: DialogActions;
    private _actions: ReleaseReportingActions;
}

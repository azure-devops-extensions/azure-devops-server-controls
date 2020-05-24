import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IStoreState, StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { autobind } from "OfficeFabric/Utilities";
import {
    DeployEnvironmentsPanelActions,
    ICurrentlyDeployedRelease,
    ICurrentlyDeployedReleaseEnvironmentTuple,
    IEnvironmentDeployProgressState,
    IEnvironmentSkeleton,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentsPanelActions";
import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as  RMConstants from  "ReleaseManagement/Core/Constants";
import { IEnvironmentAgentPhaseWarningData } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentUtils";
import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

export interface IDeployEnvironmentsPanelItemViewState extends IStoreState {
    deployableEnvironments: ReleaseEnvironment[];
    selectedEnvironments: IEnvironmentSkeleton[];

    deployErrorMessage: string;
    deployComment: string;
    deployProgressState: IEnvironmentDeployProgressState;  

    fetchingReleasesError: boolean;
    releaseToCompare: {[id: number]: ICurrentlyDeployedRelease};

    demands: IEnvironmentAgentPhaseWarningData[];

    deploymentOption: string;
}

export class DeployEnvironmentsPanelViewStore extends StoreBase {
    public static getKey(): string {
        return ReleaseProgressStoreKeys.DeployEnvironmentsPanelViewStore;
    }

    public initialize(instanceId: string): void {

         this._setInitialState();

        this._actionsHub = ActionsHubManager.GetActionsHub<DeployEnvironmentsPanelActions>(DeployEnvironmentsPanelActions, instanceId);
        this._actionsHub.updateErrorInFetchingRelease.addListener(this._updateErrorDuringFetchingRelease);
        this._actionsHub.updateReleaseToCompare.addListener(this.updateReleaseToCompare);
        this._actionsHub.updateDemands.addListener(this._updateDemands);
        this._actionsHub.updateDeployState.addListener(this._updateDeployState);
        this._actionsHub.updateErrorInDeploy.addListener(this._updateErrorInDeploy);
        this._actionsHub.updateDeployableEnvironments.addListener(this._updateDeployableEnvironments);
        this._actionsHub.updateDeploymentOption.addListener(this._updateDeploymentOption);

        this._onDataStoreChanged();
    }

    private _setInitialState(): void {
        this._state = {
            deployProgressState: IEnvironmentDeployProgressState.Initial,
            releaseToCompare: {},
            selectedEnvironments: [],
            deployableEnvironments: [],
            deploymentOption: RMConstants.RedeploymentDeploymentGroupTargetFilter.None
        } as IDeployEnvironmentsPanelItemViewState;
    }

    protected disposeInternal(): void {
        this._actionsHub.updateErrorInFetchingRelease.removeListener(this._updateErrorDuringFetchingRelease);
        this._actionsHub.updateReleaseToCompare.removeListener(this.updateReleaseToCompare);
        this._actionsHub.updateDemands.removeListener(this._updateDemands);
        this._actionsHub.updateDeployState.removeListener(this._updateDeployState);
        this._actionsHub.updateErrorInDeploy.removeListener(this._updateErrorInDeploy);
        this._actionsHub.updateDeployableEnvironments.removeListener(this._updateDeployableEnvironments);
        this._actionsHub.updateDeploymentOption.removeListener(this._updateDeploymentOption);
    }

    private _onDataStoreChanged = (): void => {
        this.emitChanged();
    }

    public getState(): IDeployEnvironmentsPanelItemViewState {
        return this._state;
    }

    public getDemandWarnings(): {[id: number]: string} {
        let warnings = {};
        if (this._state.demands) {
            this._state.demands.forEach((demand: IEnvironmentAgentPhaseWarningData) => {
                if (demand.hasWarning){
                    if (warnings[demand.environmentId]) {
                        warnings[demand.environmentId] += "\n" + demand.warningMessage;
                    } 
                    else {
                        warnings[demand.environmentId] = Resources.DemandsWarning + "\n" + demand.warningMessage;
                    }   
                }            
            });
        }      
        return warnings;       
    }

    public isSelectionDisabled(): boolean {
        return this._state.deployProgressState === IEnvironmentDeployProgressState.InProgress 
        || this._state.deployProgressState === IEnvironmentDeployProgressState.Error;
    }

    @autobind
    private _updateDeployableEnvironments(environments: ReleaseEnvironment[]): void {
        //to reset currentlydeployed, selected and other state values.
        this._setInitialState();
        this._state.deployableEnvironments = environments;
        this.emitChanged();
    }

    @autobind
    private _updateDeployState(state: IEnvironmentDeployProgressState): void {
        this._state.deployProgressState = state;
        this.emitChanged();
    }

    @autobind
    private _updateErrorInDeploy(errorMessage: string): void {
        this._state.deployErrorMessage = errorMessage;
        this._state.deployProgressState = IEnvironmentDeployProgressState.Error;
        this.emitChanged();
    }

    @autobind
    private _updateDemands(demands: IEnvironmentAgentPhaseWarningData[]): void {
        this._state.demands = demands;
        this.emitChanged();
    }

    @autobind
    private _updateErrorDuringFetchingRelease(error: boolean): void {
        this._state.fetchingReleasesError = error;
        this.emitChanged();
    }

    @autobind
    private updateReleaseToCompare(releaseToCompareTuple: ICurrentlyDeployedReleaseEnvironmentTuple): void {
        this._state.releaseToCompare[releaseToCompareTuple.environmentId] = releaseToCompareTuple.currentlyDeployedRelease;       
        this.emitChanged();
    }

    @autobind 
    private _updateDeploymentOption(deploymentOption: string): void {
        this._state.deploymentOption = deploymentOption;
        this.emitChanged();
    }

    private _actionsHub: DeployEnvironmentsPanelActions;
    
    private _state: IDeployEnvironmentsPanelItemViewState;
}
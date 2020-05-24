import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { SaveStatus, SaveStatusActionsHub } from "DistributedTaskControls/Actions/SaveStatusActionsHub";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { PostDeploymentApprovalStore } from "PipelineWorkflow/Scripts/Editor/Environment/PostDeploymentApprovalStore";
import { PostDeploymentGatesStore } from "PipelineWorkflow/Scripts/Editor/Environment/PostDeploymentGatesStore";


export interface IEnvironmentPostDeploymentPanelViewState extends IStoreState {
    isValid: boolean;
    isAutomatedApproval: boolean;
    environmentName: string;
    environmentId: number;
}

export class EnvironmentPostDeploymentPanelViewStore extends StoreBase {

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelinePostDeploymentPanelViewStoreKey;
    }

    public initialize(instanceId: string): void {
        this._environmentStore = StoreManager.GetStore<DeployEnvironmentStore>(DeployEnvironmentStore, instanceId);
        this._saveStatusActions = ActionsHubManager.GetActionsHub<SaveStatusActionsHub>(SaveStatusActionsHub);
        this._saveStatusActions.updateSaveStatus.addListener(this._handleSaveStatusUpdate);

        this._postDeploymentApprovalStore = StoreManager.GetStore<PostDeploymentApprovalStore>(PostDeploymentApprovalStore, instanceId);
        this._postDeploymentApprovalStore.addChangedListener(this._onChange);

        this._postDeploymentGatesStore = StoreManager.GetStore<PostDeploymentGatesStore>(PostDeploymentGatesStore, instanceId);
        this._postDeploymentGatesStore.addChangedListener(this._onChange);
        this._setState();
    }

    public disposeInternal(): void {
        this._postDeploymentGatesStore.removeChangedListener(this._onChange);
        this._postDeploymentApprovalStore.removeChangedListener(this._onChange);
    }

    public getState(): IEnvironmentPostDeploymentPanelViewState {
        return this._state;
    }

    public isValid(): boolean {
        let isValid: boolean = true;
        isValid = this._postDeploymentApprovalStore.isValid()
            && this._postDeploymentGatesStore.isValid();

        return isValid;
    }

    private _onChange = () => {
        this._setState();
    }

    private _handleSaveStatusUpdate = (status: SaveStatus) => {
        if (status === SaveStatus.Success || status === SaveStatus.Failure) {
            this._setState();
        }
    }

    private _setState(): void {
        const isAutomatedApproval = this._postDeploymentApprovalStore.isAutomatedApproval();
        const isValid = this.isValid();
        const envName = this._environmentStore.getEnvironmentName();
        const envId = this._environmentStore.getEnvironmentId();

        if (!this._state ||
            this._state.isValid !== isValid ||
            this._state.isAutomatedApproval !== isAutomatedApproval ||
            this._state.environmentName !== envName ||
            this._state.environmentId !== envId) {

            this._state = {
                isValid: isValid,
                isAutomatedApproval: isAutomatedApproval,
                environmentName: envName,
                environmentId: envId
            };

            this.emitChanged();
        }
    }

    private _environmentStore: DeployEnvironmentStore;
    private _postDeploymentGatesStore: PostDeploymentGatesStore;
    private _postDeploymentApprovalStore: PostDeploymentApprovalStore;
    private _state: IEnvironmentPostDeploymentPanelViewState;
    private _saveStatusActions: SaveStatusActionsHub;
}
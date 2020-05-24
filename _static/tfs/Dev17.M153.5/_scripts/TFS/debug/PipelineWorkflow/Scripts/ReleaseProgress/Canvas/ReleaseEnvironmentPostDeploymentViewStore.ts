import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";

import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import { ReleasePostDeploymentApprovalStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleasePostDeploymentApprovalStore";
import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";

export interface IEnvironmentPostDeploymentViewState extends IStoreState {
    isValid: boolean;
    isAutomatedApproval: boolean;
    environmentName: string;
    environmentId: number;
}

export class ReleaseEnvironmentPostDeploymentViewStore extends StoreBase {

    public static getKey(): string {
        return ReleaseProgressStoreKeys.ReleaseEnvironmentPostDeploymentViewStore;
    }

    public initialize(instanceId: string): void {
        this._environmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, instanceId);

        this._postDeploymentApprovalStore = StoreManager.GetStore<ReleasePostDeploymentApprovalStore>(ReleasePostDeploymentApprovalStore, instanceId);
        this._postDeploymentApprovalStore.addChangedListener(this._onChange);

        this._setState();
    }

    public disposeInternal(): void {
        this._postDeploymentApprovalStore.removeChangedListener(this._onChange);
    }

    public getState(): IEnvironmentPostDeploymentViewState {
        return this._state;
    }

    public isValid(): boolean {
        let isValid: boolean = true;
        isValid = this._postDeploymentApprovalStore.isValid();

        return isValid;
    }

    private _onChange = () => {
        this._setState();
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

    private _environmentStore: ReleaseEnvironmentStore;
    private _postDeploymentApprovalStore: ReleasePostDeploymentApprovalStore;
    private _state: IEnvironmentPostDeploymentViewState;
}
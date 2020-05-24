import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";

import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import { ReleasePreDeploymentApprovalStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleasePreDeploymentApprovalStore";
import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";

export interface IEnvironmentPreDeploymentViewState extends IStoreState {
    isValid: boolean;
    isAutomatedApproval: boolean;
    environmentName: string;
    environmentId: number;
}

export class ReleaseEnvironmentPreDeploymentViewStore extends StoreBase {

    public static getKey(): string {
        return ReleaseProgressStoreKeys.ReleaseEnvironmentPreDeploymentViewStore;
    }

    public initialize(instanceId: string): void {
        this._environmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, instanceId);
        this._preDeploymentApprovalStore = StoreManager.GetStore<ReleasePreDeploymentApprovalStore>(ReleasePreDeploymentApprovalStore, instanceId);
       
        this._environmentStore.addChangedListener(this._onChange);
        this._preDeploymentApprovalStore.addChangedListener(this._onChange);
       

        this._setState();
    }

    public disposeInternal(): void {
        this._environmentStore.removeChangedListener(this._onChange);
        this._preDeploymentApprovalStore.removeChangedListener(this._onChange);    
    }

    public getState(): IEnvironmentPreDeploymentViewState {
        return this._state;
    }

    public isValid(): boolean {
        let isValid: boolean = true;
        isValid = this._preDeploymentApprovalStore.isValid();
        return isValid;
    }

    private _onChange = () => {
        this._setState();
        this.emitChanged();
    }

    private _setState(): void {
        this._state = {
            isValid: this.isValid(),
            isAutomatedApproval: this._preDeploymentApprovalStore.isAutomatedApproval(),
            environmentName: this._environmentStore.getEnvironmentName(),
            environmentId: this._environmentStore.getEnvironmentId()
        };
    }

    private _environmentStore: ReleaseEnvironmentStore;
    private _preDeploymentApprovalStore: ReleasePreDeploymentApprovalStore;
    private _state: IEnvironmentPreDeploymentViewState;
}
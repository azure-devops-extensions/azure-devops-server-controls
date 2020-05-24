import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { PreDeploymentGatesStore } from "PipelineWorkflow/Scripts/Editor/Environment/PreDeploymentGatesStore";
import { EnvironmentTriggerStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerStore";
import { PreDeploymentApprovalStore } from "PipelineWorkflow/Scripts/Editor/Environment/PreDeploymentApprovalStore";
import { QueueSettingsStore } from "PipelineWorkflow/Scripts/Editor/Environment/QueueSettingsStore";


export interface IEnvironmentPreDeploymentPanelViewState extends IStoreState {
    isValid: boolean;
    isAutomatedTrigger: boolean;
    isAutomatedApproval: boolean;
    environmentName: string;
    environmentId: number;
}

export class EnvironmentPreDeploymentPanelViewStore extends StoreBase {

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelinePreDeploymentPanelViewStoreKey;
    }

    public initialize(instanceId: string): void {
        this._environmentStore = StoreManager.GetStore<DeployEnvironmentStore>(DeployEnvironmentStore, instanceId);
        this._environmentTriggerStore = StoreManager.GetStore<EnvironmentTriggerStore>(EnvironmentTriggerStore, instanceId);
        this._preDeploymentGatesStore = StoreManager.GetStore<PreDeploymentGatesStore>(PreDeploymentGatesStore, instanceId);
        this._preDeploymentApprovalStore = StoreManager.GetStore<PreDeploymentApprovalStore>(PreDeploymentApprovalStore, instanceId);
        this._queueSettingsStore = StoreManager.GetStore<QueueSettingsStore>(QueueSettingsStore, instanceId);

        this._environmentStore.addChangedListener(this._onChange);
        this._environmentTriggerStore.addChangedListener(this._onChange);
        this._preDeploymentGatesStore.addChangedListener(this._onChange);
        this._preDeploymentApprovalStore.addChangedListener(this._onChange);
        this._queueSettingsStore.addChangedListener(this._onChange);

        this._setState();
    }

    public disposeInternal(): void {
        this._environmentStore.removeChangedListener(this._onChange);
        this._preDeploymentGatesStore.removeChangedListener(this._onChange);
        this._environmentTriggerStore.removeChangedListener(this._onChange);
        this._preDeploymentApprovalStore.removeChangedListener(this._onChange);
        this._queueSettingsStore.removeChangedListener(this._onChange);
    }

    public getState(): IEnvironmentPreDeploymentPanelViewState {
        return this._state;
    }

    public isValid(): boolean {
        let isValid: boolean = true;
        isValid = this._environmentTriggerStore.isValid()
            && this._preDeploymentApprovalStore.isValid()
            && this._preDeploymentGatesStore.isValid()
            && this._queueSettingsStore.isValid();
        return isValid;
    }

    private _onChange = () => {
        this._setState();
        this.emitChanged();
    }

    private _setState(): void {
        this._state = {
            isValid: this.isValid(),
            isAutomatedTrigger: this._environmentTriggerStore.isAutomatedTrigger(),
            isAutomatedApproval: this._preDeploymentApprovalStore.isAutomatedApproval(),
            environmentName: this._environmentStore.getEnvironmentName(),
            environmentId: this._environmentStore.getEnvironmentId()
        };
    }

    private _preDeploymentGatesStore: PreDeploymentGatesStore;
    private _environmentTriggerStore: EnvironmentTriggerStore;
    private _environmentStore: DeployEnvironmentStore;
    private _preDeploymentApprovalStore: PreDeploymentApprovalStore;
    private _queueSettingsStore: QueueSettingsStore;
    private _state: IEnvironmentPreDeploymentPanelViewState;
}
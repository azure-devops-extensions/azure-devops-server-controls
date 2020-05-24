import { DataStoreBase, ChangeTrackerStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Properties } from "DistributedTaskControls/Common/Telemetry";

import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { RetentionPolicyItem } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyItem";
import { RetentionPolicyStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyStore";

export class RetentionPolicyListStore extends ChangeTrackerStoreBase {

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);

        this._environmentListStore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
    }

    public getDefaultSelectedItem(): RetentionPolicyItem {
        let retentionPolicyItems: RetentionPolicyItem[] = this.getRetentionPolicyItems();
        if (retentionPolicyItems && retentionPolicyItems.length > 0) {
            return retentionPolicyItems[0];
        }
        return null;
    }

    public disposeInternal(): void {
       this._environmentListStore = null;
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineRetentionPolicyListStoreKey;
    }

    public isValid(): boolean {
        let isValid: boolean = true;
        let retentionPolicyStores: RetentionPolicyStore[] = this._getEnvironmentRetentionPolicyStores();

        for (let store of retentionPolicyStores) {
            if (!store.isValid()) {
                isValid = false;
                break;
            }
        }
        return isValid;
    }

    public isDirty(): boolean {
        let isDirty: boolean = false;
        let retentionPolicyStores: RetentionPolicyStore[] = this._getEnvironmentRetentionPolicyStores();

        for (let store of retentionPolicyStores) {
            if (store.isDirty()) {
                isDirty = true;
                break;
            }
        }
        return isDirty;
    }

    public getChangeTelemetryData(changes: IDictionaryStringTo<any>) {
        if (this.isDirty()) {
            changes[Properties.RetentionPoliciesChanged] = true;
        }
    }

    public getRetentionPolicyItems(): RetentionPolicyItem[] {
        let retentionPolicyItems: RetentionPolicyItem[] = [];
        let retentionPolicyStores: RetentionPolicyStore[] = this._getEnvironmentRetentionPolicyStores();

        for (let store of retentionPolicyStores) {
            retentionPolicyItems.push(new RetentionPolicyItem({ instanceId: store.getInstanceId() }));
        }
        return retentionPolicyItems;
    }

    private _getEnvironmentRetentionPolicyStores(): RetentionPolicyStore[] {
        let environmentStores: DeployEnvironmentStore[] = this._environmentListStore.getDataStoreList();
        let retentionPolicyStores: RetentionPolicyStore[] = [];
        for (let store of environmentStores) {
            retentionPolicyStores.push(store.getRetentionPolicyStore());
        }
        return retentionPolicyStores;
    }

    private _environmentListStore: EnvironmentListStore;
}

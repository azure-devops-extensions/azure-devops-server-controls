/**
 * @brief Store for OptionsTab container view
 */

import { ContainerTabStoreBase } from "DistributedTaskControls/SharedViews/ContainerTabs/ContainerTabStoreBase";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { GeneralOptionsStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/GeneralOptionsStore";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";


export class OptionsTabStore extends ContainerTabStoreBase {

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineOptionsStoreKey;
    }

     public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this.addToStoreList(this._generalOptionsStore = StoreManager.GetStore<GeneralOptionsStore>(GeneralOptionsStore));
    }

    private _generalOptionsStore: GeneralOptionsStore;
}
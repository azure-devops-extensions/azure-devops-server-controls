/**
 * @brief Contains Store for VariablesTab container view
 */
import { VariablesTabStoreBase } from "DistributedTaskControls/SharedViews/ContainerTabs/VariablesTab/VariablesTabStoreBase";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";

export class VariablesTabStore extends VariablesTabStoreBase {

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineVariablesStoreKey;
    }
}
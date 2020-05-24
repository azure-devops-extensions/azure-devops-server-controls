import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import * as CommonTypes from "PipelineWorkflow/Scripts/Common/Types";
import { EnvironmentCheckListStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/EnvironmentCheckListStore";

export class AutoLinkWorkItemsEnvironmentCheckListStore extends EnvironmentCheckListStore {
    
    protected isEnvironmentEnabled(envStore: DeployEnvironmentStore): boolean{
        return envStore.getEnvironmentAutoLinkWorkItemsOption();
    }
}
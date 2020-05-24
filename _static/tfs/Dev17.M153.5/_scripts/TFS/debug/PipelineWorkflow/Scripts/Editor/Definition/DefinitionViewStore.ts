/**
 * Contains common code for TaskTab store
 */

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { AggregatorViewStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { HistoryStore } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { DefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionStore";
import { TaskTabStore, ITaskTabStoreArgs } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/TaskTab/TaskTabStore";
import { VariablesTabStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/VariablesTab/VariablesTabStore";

import * as StringUtils from "VSS/Utils/String";

export interface IDefinitionViewStoreArgs {
    definitionId?: number;
    environmentId?: number;
}

export class DefinitionViewStore extends AggregatorViewStoreBase {

    constructor(args: IDefinitionViewStoreArgs) {
        super();
        this._definitionId = args.definitionId;
        this._environmentId = args.environmentId;
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineDefinitionTabsStoreKey;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);

        this.addToStoreList(StoreManager.CreateStore<TaskTabStore, ITaskTabStoreArgs>(TaskTabStore, StringUtils.empty, { environmentId: this._environmentId }));
        this.addToStoreList(StoreManager.GetStore<VariablesTabStore>(VariablesTabStore));

        // Creating history store to listen to actions when build definition is loaded
        this.addToStoreList(StoreManager.GetStore<HistoryStore>(HistoryStore));
    }

    private _environmentId: number;
    private _definitionId: number;
}
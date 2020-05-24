import * as React from "react";
import * as ReactDOM from "react-dom";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { ProgressIndicatorStore } from "PipelineWorkflow/Scripts/Common/Stores/ProgressIndicatorStore";
import { PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { ReleaseReportingActionsCreator } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingActionsCreator";
import { ReleaseReportingStore, IReleaseReportingStoreArgs } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingStore";
import { ReleaseReportingPanelStore, IReleaseReportingPanelStoreArgs } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanelStore";
import { ReleaseReportingPanelActionsCreator } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanelActionsCreator";

export interface IReleaseReportingOptions {
    definitionId?: number;
    releaseId?: number;
}

export class ReleaseReportingPanelHelper  {
    constructor(private _options?: IReleaseReportingOptions) {
    }

    public InitializeReportingStore(instanceId?: string): void {
        this._releaseReportingStore = StoreManager.CreateStore<ReleaseReportingStore, IReleaseReportingStoreArgs>(
            ReleaseReportingStore,
            instanceId,
            {
                showDialog: true
            });

        // Initialize required stores
        this._releaseReportingProgressIndicatorStore = StoreManager.GetStore<ProgressIndicatorStore>(ProgressIndicatorStore, instanceId);
        this._releaseReportingActionsCreator = ActionCreatorManager.GetActionCreator<ReleaseReportingActionsCreator>(ReleaseReportingActionsCreator, instanceId);

        // Initialize data for create release.
        this._releaseReportingActionsCreator.initializeData(this._options.definitionId, instanceId, instanceId);
    }

    public InitializeReportingPanelStore(width: number, instanceId?: string): void {
        this._releaseReportingPanelStore = StoreManager.CreateStore<ReleaseReportingPanelStore, IReleaseReportingPanelStoreArgs>(
            ReleaseReportingPanelStore,
            instanceId,
            {
                width: width
            });
        this._releaseReportingPanelStore.initialize(instanceId);
        // Initialize required stores
        this._releaseReportingProgressIndicatorStore = StoreManager.GetStore<ProgressIndicatorStore>(ProgressIndicatorStore, instanceId);
        this._releaseReportingPanelActionsCreator = ActionCreatorManager.GetActionCreator<ReleaseReportingPanelActionsCreator>(ReleaseReportingPanelActionsCreator, instanceId);

        this._releaseReportingPanelActionsCreator.initializeData();
    }

    public getReportingPanelStore(): ReleaseReportingPanelStore {
        return this._releaseReportingPanelStore;
    }

    public getReportingPanelActionCreator(): ReleaseReportingPanelActionsCreator
    {
        return this._releaseReportingPanelActionsCreator;
    }

    public getReportingStore(): ReleaseReportingStore {
        return this._releaseReportingStore;
    }

    public getReportingActionCreator(): ReleaseReportingActionsCreator
    {
        return this._releaseReportingActionsCreator;
    }
    private _releaseReportingStore: ReleaseReportingStore;
    private _releaseReportingPanelStore: ReleaseReportingPanelStore;
    private _releaseReportingProgressIndicatorStore: ProgressIndicatorStore;
    private _releaseReportingActionsCreator: ReleaseReportingActionsCreator;
    private _releaseReportingPanelActionsCreator: ReleaseReportingPanelActionsCreator;
}
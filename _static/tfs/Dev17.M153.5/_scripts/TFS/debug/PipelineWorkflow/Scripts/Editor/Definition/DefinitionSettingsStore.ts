
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";

import * as CommonTypes from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { DefinitionSettingsActionsHub } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionSettingsActions";

import RMContracts = require("ReleaseManagement/Core/Contracts");

export class DefinitionSettingsStore extends DataStoreBase {

    constructor() {
        super();
        this._definitionSettingsActionsHub = ActionsHubManager.GetActionsHub<DefinitionSettingsActionsHub>(DefinitionSettingsActionsHub);
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineDefinitionSettingsStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._definitionSettingsActionsHub.updateMaxAndDefaultRetentionPolicy.addListener(this._handleUpdateDefaultAndMaxRetentionPolicy);
    }

    public disposeInternal(): void {
        this._definitionSettingsActionsHub.updateMaxAndDefaultRetentionPolicy.removeListener(this._handleUpdateDefaultAndMaxRetentionPolicy);
        this._definitionSettingsActionsHub = null;
    }

    public isValid(): boolean {
        return true;
    }

    public isDirty(): boolean {
        return false;
    }

    public updateVisitor(visitor: CommonTypes.PipelineDefinition) {
        //No implementation is required here.
    }

    public getDefaultRetentionPolicy(): RMContracts.EnvironmentRetentionPolicy {
        if (this._defaultRetentionPolicy) {
            return this._defaultRetentionPolicy;
        } else {
            return {
                daysToKeep: CommonTypes.PipelineConstants.DefaultDaysToKeep,
                releasesToKeep: CommonTypes.PipelineConstants.DefaultReleasesToKeep,
                retainBuild: CommonTypes.PipelineConstants.DefaultRetainBuild
            } as RMContracts.EnvironmentRetentionPolicy;
        }
    }

    public getMaximumRetentionPolicy(): RMContracts.EnvironmentRetentionPolicy {
        if (this._maximumRetentionPolicy) {
            return this._maximumRetentionPolicy;
        } else {
            return {
                daysToKeep: CommonTypes.PipelineConstants.MaxDaysToKeepRelease,
                releasesToKeep: CommonTypes.PipelineConstants.MaxReleasesToKeep,
                retainBuild: CommonTypes.PipelineConstants.DefaultRetainBuild
            } as RMContracts.EnvironmentRetentionPolicy;
        }
    }

    private _handleUpdateDefaultAndMaxRetentionPolicy = (settings: CommonTypes.PipelineSettings): void => {
        if (settings) {
            this._defaultRetentionPolicy = settings.retentionSettings.defaultEnvironmentRetentionPolicy;
            this._maximumRetentionPolicy = settings.retentionSettings.maximumEnvironmentRetentionPolicy;
            this._daysToKeepDeletedReleases = settings.retentionSettings.daysToKeepDeletedReleases;
        }
    }

    private _definitionSettingsActionsHub: DefinitionSettingsActionsHub;
    private _defaultRetentionPolicy: CommonTypes.PipelineRetentionPolicy;
    private _maximumRetentionPolicy: CommonTypes.PipelineRetentionPolicy;
    private _daysToKeepDeletedReleases: number;
}
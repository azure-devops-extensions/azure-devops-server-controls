// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineSettings } from "PipelineWorkflow/Scripts/Common/Types";
import { DefinitionSettingsActionsHub } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionSettingsActions";

export class DefinitionSettingsActionsCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_DefinitionSettingsActionCreator;
    }

    public initialize(): void {
        this._definitionSettingsActionsHub = ActionsHubManager.GetActionsHub<DefinitionSettingsActionsHub>(DefinitionSettingsActionsHub);
    }

    public updateMaxAndDefaultRetentionPolicy(settings: PipelineSettings) {
        this._definitionSettingsActionsHub.updateMaxAndDefaultRetentionPolicy.invoke(settings);
    }

    private _definitionSettingsActionsHub: DefinitionSettingsActionsHub;
}

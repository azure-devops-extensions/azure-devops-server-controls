/// <reference types="react" />

import * as React from "react";

import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import * as CommonTypes from "PipelineWorkflow/Scripts/Common/Types";
import { Actions } from "DistributedTaskControls/Actions/ItemSelectorActions";

export class GeneralOptionsActionsHub extends ActionsBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_GeneralOptionsActionHub;
    }

    public initialize(): void {
        this._updateReleaseDefinitionDescription = new ActionsBase.Action<string>();
        this._updateReleaseNameFormat = new ActionsBase.Action<string>();
        this._updateGeneralOptionsAction = new ActionsBase.Action<CommonTypes.PipelineDefinition>();
        this._refreshOptionsTab = new ActionsBase.Action<void>();
    }

    public get updateReleaseDefinitionDescription(): ActionsBase.Action<string> {
        return this._updateReleaseDefinitionDescription;
    }

    public get updateReleaseNameFormat(): ActionsBase.Action<string> {
        return this._updateReleaseNameFormat;
    }

    public get updateGeneralOptions(): ActionsBase.Action<CommonTypes.PipelineDefinition> {
        return this._updateGeneralOptionsAction;
    }

    public get refreshOptionsTab(): ActionsBase.Action<void> {
        return this._refreshOptionsTab;
    }

    private _updateReleaseDefinitionDescription: ActionsBase.Action<string>;
    private _updateReleaseNameFormat: ActionsBase.Action<string>;
    private _updateGeneralOptionsAction: ActionsBase.Action<CommonTypes.PipelineDefinition>;
    private _refreshOptionsTab: ActionsBase.Action<void>;
}

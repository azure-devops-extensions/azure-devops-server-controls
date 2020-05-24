// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />

import * as React from "react";

import { Component as BaseComponent } from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import {
    EnvironmentGatesComponent,
    IEnvironmentDeploymentGatesComponentProps
} from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentGatesComponent";
import { IGatesState } from "PipelineWorkflow/Scripts/Editor/Environment/GatesStore";
import { PreDeploymentGatesViewStore } from "PipelineWorkflow/Scripts/Editor/Environment/PreDeploymentGatesViewStore";
import { PreDeploymentGatesActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/PreDeploymentGatesActionCreator";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { PreDeploymentConditionsViewComponents } from "PipelineWorkflow/Scripts/Shared/Constants";

export class EnvironmentPreDeploymentGatesComponent extends BaseComponent<IEnvironmentDeploymentGatesComponentProps, IGatesState> {
    constructor(props: IEnvironmentDeploymentGatesComponentProps) {
        super(props);
        this._store = StoreManager.GetStore<PreDeploymentGatesViewStore>(PreDeploymentGatesViewStore, props.instanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator<PreDeploymentGatesActionCreator>(
            PreDeploymentGatesActionCreator,
            props.instanceId);
    }

    public render(): JSX.Element {
        return (
            <EnvironmentGatesComponent
                cssClass="pre-deployment-gates"
                instanceId={this.props.instanceId}
                description={Resources.PreDeploymentGatesCollapsibleDescriptionText}
                releaseDefinitionFolderPath={this.props.releaseDefinitionFolderPath}
                releaseDefinitionId={this.props.releaseDefinitionId}
                environmentId={this.props.environmentId}
                componentName={PreDeploymentConditionsViewComponents.EnvironmentPreDeploymentGatesView}
                expanded={this.props.expanded}
                onHeaderClick={this.props.onHeaderClick}
                actionCreator={this._actionCreator}
                store={this._store} />
        );
    }

    private _actionCreator: PreDeploymentGatesActionCreator;
    private _store: PreDeploymentGatesViewStore;
}
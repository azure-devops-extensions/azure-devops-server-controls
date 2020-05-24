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
import { PostDeploymentGatesViewStore } from "PipelineWorkflow/Scripts/Editor/Environment/PostDeploymentGatesViewStore";
import { PostDeploymentGatesActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/PostDeploymentGatesActionCreator";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { PostDeploymentConditionsViewComponents } from "PipelineWorkflow/Scripts/Shared/Constants";

export class EnvironmentPostDeploymentGatesComponent extends BaseComponent<IEnvironmentDeploymentGatesComponentProps, IGatesState> {
    constructor(props: IEnvironmentDeploymentGatesComponentProps) {
        super(props);
        this._store = StoreManager.GetStore<PostDeploymentGatesViewStore>(PostDeploymentGatesViewStore, props.instanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator<PostDeploymentGatesActionCreator>(
            PostDeploymentGatesActionCreator,
            props.instanceId);
    }

    public render(): JSX.Element {
        return (
            <EnvironmentGatesComponent
                cssClass="post-deployment-gates"
                instanceId={this.props.instanceId}
                description={Resources.PostDeploymentGatesCollapsibleDescriptionText}
                releaseDefinitionFolderPath={this.props.releaseDefinitionFolderPath}
                releaseDefinitionId={this.props.releaseDefinitionId}
                environmentId={this.props.environmentId}
                componentName={PostDeploymentConditionsViewComponents.EnvironmentPostDeploymentGatesView}
                expanded={this.props.expanded}
                onHeaderClick={this.props.onHeaderClick}
                actionCreator={this._actionCreator}
                store={this._store} />
        );
    }

    private _actionCreator: PostDeploymentGatesActionCreator;
    private _store: PostDeploymentGatesViewStore;
}
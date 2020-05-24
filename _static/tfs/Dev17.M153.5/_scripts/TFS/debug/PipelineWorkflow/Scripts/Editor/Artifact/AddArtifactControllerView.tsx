/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { PanelComponent } from "DistributedTaskControls/Components/PanelComponent";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";

import { ArtifactControllerView } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactControllerView";
import { ArtifactMode } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Artifact/AddArtifactControllerView";

export interface IState {
    showPanel: boolean;
}

export interface IProps extends ComponentBase.IProps {
    onClose: (instanceId: string) => void;
    instanceId: string;
    hasCloseButton?: boolean;
    elementToFocusOnDismiss?: HTMLElement;
    addArtifactPanelWidth?: number;
}

export class AddArtifactControllerView extends ComponentBase.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            showPanel: true
        };
    }

    public render(): JSX.Element {

        return (
            <PanelComponent
                showPanel={this.state.showPanel}
                panelWidth={this.props.addArtifactPanelWidth}
                onClose={this._closePanel}
                onClosed={this._handleOnClosed}
                isBlocking={true}
                hasCloseButton={this.props.hasCloseButton}
                elementToFocusOnDismiss={this.props.elementToFocusOnDismiss}>
                <ArtifactControllerView
                    mode={ArtifactMode.Add}
                    instanceId={this.props.instanceId}
                    onAddArtifact={this._onAddArtifactClick}/>
            </PanelComponent>);
    }

    private _onAddArtifactClick = (artifactType: string): void => {
        this._artifactInstanceId = this.props.instanceId;
        this.setState({ showPanel: false } as IState);
        this._publishAddArtifactTelemetry(artifactType);
    }

    private _publishAddArtifactTelemetry(artifactType: string) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.ArtifactType] = artifactType;

        Telemetry.instance().publishEvent(Feature.AddNewArtifact, eventProperties);
    }

    private _closePanel = () => {
        this.setState({ showPanel: false } as IState);
    }

    private _handleOnClosed = () => {
        this.props.onClose(this._artifactInstanceId);
    }

    private _artifactInstanceId: string;
}
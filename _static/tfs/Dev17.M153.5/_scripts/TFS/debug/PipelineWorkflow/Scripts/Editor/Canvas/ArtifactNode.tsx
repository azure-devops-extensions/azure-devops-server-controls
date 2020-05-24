/// <reference types="react" />

import * as React from "react";
import { CSSTransitionGroup as ReactCSSTransitionGroup } from "react-transition-group";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { InnerFocusZone } from "DistributedTaskControls/Components/InnerFocusZone";

import { ArtifactProperties } from "PipelineWorkflow/Scripts/Editor/Canvas/ArtifactProperties";
import { ArtifactTrigger } from "PipelineWorkflow/Scripts/Editor/Canvas/ArtifactTrigger";
import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { ArtifactPropertiesViewStore } from "PipelineWorkflow/Scripts/Editor/Canvas/ArtifactPropertiesViewStore";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Canvas/ArtifactNode";

export interface IProps extends Base.IProps {
    showTrigger: boolean;
    setFocusOnAddArtifact: () => void;
}

export interface IArtifactNodeViewState extends IStoreState {
    isTemporary: boolean;
    isDeleting: boolean;
    isMounted: boolean;
}

export class ArtifactNode extends Base.Component<IProps, IArtifactNodeViewState> {

    public componentWillMount(): void {
        this._artifactPropertiesViewStore = StoreManager.GetStore<ArtifactPropertiesViewStore>(ArtifactPropertiesViewStore, this.props.instanceId);
        this._artifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        this._setState();
        this._artifactPropertiesViewStore.addChangedListener(this._handleArtifactPropertiesChanges);
    }

    public componentDidMount(): void {
        this.setState({ isMounted: true } as IArtifactNodeViewState);
    }

    public componentWillUnmount() {
        this._artifactPropertiesViewStore.removeChangedListener(this._handleArtifactPropertiesChanges);
    }

    public render(): JSX.Element {
        const artifactNodeClasses = css("cd-artifact-node",
            { "cd-artifact-temporary-node": this.state.isTemporary }, this.props.cssClass);

        const transitionTime = 500;
        const transitionEnterRequired = (this.state.isTemporary && (this._artifactListStore.getStores().length !== 1));

        const ariaLabel = Utils_String.localeFormat(Resources.ArtifactNodeAriaLabel, this._artifactPropertiesViewStore.getState().alias);


        const noArtifactAddButtonContainerStyle: React.CSSProperties = {
            width: LayoutConstants.artifactPropertiesWidth,
            height: LayoutConstants.artifactPropertiesHeight,
            marginTop: LayoutConstants.artifactPropertiesTopMargin
        };

        const noArtifactAddButtonStyle: React.CSSProperties = {
            height: LayoutConstants.artifactPropertiesHeight,
            width: LayoutConstants.artifactPropertiesWidth
        };

        const noArtifactAddButtonContainer = (
            <div className="add-artifact-circle-button-container" style={noArtifactAddButtonContainerStyle}>
                <div className="add-artifact-circle-button" style={noArtifactAddButtonStyle}>
                    <div className="add-artifact-icon">
                        <span className="bowtie-icon bowtie-math-plus-light"></span>
                    </div>
                    <div>{Resources.AddArtifact}</div>
                </div>
            </div>
        );

        const showNoArtifactAddButton = (this.state.isDeleting && (this._artifactListStore.getDataStoreList().length === 1));

        const animationContStyle: React.CSSProperties = (showNoArtifactAddButton) ? {
            position: "absolute",
            top: 0,
            marginTop: -LayoutConstants.artifactPropertiesTopMargin
        } : {};

        return (
            <div className={artifactNodeClasses}>

                {showNoArtifactAddButton && noArtifactAddButtonContainer}

                <ReactCSSTransitionGroup
                    style={animationContStyle}
                    transitionName="zoom-in-out-animation"
                    transitionEnter={transitionEnterRequired}
                    transitionEnterTimeout={transitionTime}
                    transitionLeave={true}
                    transitionLeaveTimeout={transitionTime}>

                    {!this.state.isDeleting && this.state.isMounted && (
                        <InnerFocusZone ref={this._resolveRef("_innerFocusZone")} ariaLabel={ariaLabel}>
                            <div className="artifacts-details-container">
                                <ArtifactProperties
                                    cssClass="artifact-properties-container"
                                    instanceId={this.props.instanceId}
                                    onAddArtifactComplete={this._handleAddArtifactComplete} />
                                {
                                    this.props.showTrigger && !this.state.isTemporary &&
                                    <ArtifactTrigger cssClass="artifact-trigger-container" instanceId={this.props.instanceId} />
                                }
                            </div>
                        </InnerFocusZone>
                    )}

                </ReactCSSTransitionGroup>

            </div>
        );
    }

    private _handleArtifactPropertiesChanges = () => {
        this._setState();

        //Setting focus on Add artifact if Node deleted
        if (this.state.isDeleting && this.props.setFocusOnAddArtifact) {
            this.props.setFocusOnAddArtifact();
        }
    }

    private _handleAddArtifactComplete = () => {
        if (this._innerFocusZone) {
            this._innerFocusZone.focus();
        }
    }

    private _setState(): void {
        let state = this._artifactPropertiesViewStore.getState();
        this.setState({ isTemporary: state.isTemporary, isDeleting: state.isDeleting } as IArtifactNodeViewState);
    }

    private _artifactPropertiesViewStore: ArtifactPropertiesViewStore;
    private _artifactListStore: ArtifactListStore;
    private _innerFocusZone: InnerFocusZone;
}

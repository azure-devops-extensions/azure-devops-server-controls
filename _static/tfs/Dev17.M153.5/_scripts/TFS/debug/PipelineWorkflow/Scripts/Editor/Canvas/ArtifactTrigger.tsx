/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { OverlayPanelSelectable } from "DistributedTaskControls/Components/OverlayPanelSelectable";
import { Circle } from "DistributedTaskControls/Components/Canvas/Circle";
import { IStoreState } from "DistributedTaskControls/Common/Stores/Base";

import { ArtifactTriggerItem } from "PipelineWorkflow/Scripts/Editor/Canvas/ArtifactTriggerItem";
import { ArtifactTriggerStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTriggerStore";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ArtifactTriggerConditionStore } from "PipelineWorkflow/Scripts/SharedComponents/ArtifactTriggerCondition/ArtifactTriggerConditionStore";
import { PullRequestTriggerStore } from "PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerStore";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Canvas/ArtifactTrigger";

export interface IArtifactTriggerState extends IStoreState {
    isEnabled: boolean;
    isValid: boolean;
}

export class ArtifactTrigger extends Base.Component<Base.IProps, IArtifactTriggerState> {

    public componentWillMount(): void {
        this._artifactTriggerStore = StoreManager.GetStore<ArtifactTriggerStore>(ArtifactTriggerStore, this.props.instanceId);
        this._artifactTriggerStore.addChangedListener(this._handleChange);
        this._pullRequestTriggerStore = StoreManager.GetStore<PullRequestTriggerStore>(PullRequestTriggerStore, this.props.instanceId);
        this._pullRequestTriggerStore.addChangedListener(this._handleChange);
        this.setState({ isEnabled: this._isTriggerEnabled(), isValid: this._isTriggerValid() });
    }

    public componentWillUnmount(): void {
        this._artifactTriggerStore.removeChangedListener(this._handleChange);
        this._pullRequestTriggerStore.removeChangedListener(this._handleChange);
    }

    public shouldComponentUpdate(nextProps: Base.IProps, nextState: IArtifactTriggerState): boolean {
        return (this.state.isEnabled !== nextState.isEnabled) || (this.state.isValid !== nextState.isValid);
    }

    public render(): JSX.Element {
        let isValid = !this.state.isEnabled || this.state.isValid;
        const iconClass = css(
            "artifact-trigger-icon",
            "bowtie-icon",
            { "bowtie-trigger": !this.state.isEnabled },
            { "bowtie-trigger-approval": this.state.isEnabled }
        );

        return (
            <OverlayPanelSelectable
                instanceId={CanvasSelectorConstants.CanvasSelectorInstance}
                getItem={this._getItem}
                isValid={isValid}
                cssClass={this.props.cssClass}
                tooltipProps={{
                    content: Resources.CDTrigger,
                    hostClassName: "cd-artifact-trigger-tooltip-container"
                }}>

                <Circle cssClass="cd-artifact-trigger" circleCss="cd-artifact-trigger-circle" radius={LayoutConstants.artifactTriggerRadius} >
                    {
                        !!isValid ?
                            (<span className={iconClass}></span>)
                            : (<span className="cd-artifact-trigger-error bowtie-icon bowtie-status-error-outline"></span>)
                    }
                </Circle>

            </OverlayPanelSelectable>
        );
    }

    private _getItem = (): ArtifactTriggerItem => {
        return new ArtifactTriggerItem(this.props.instanceId);
    }

    private _isTriggerEnabled = (): boolean => {
        return this._artifactTriggerStore.getState().isToggleEnabled || this._pullRequestTriggerStore.getState().isToggleEnabled;
    }

    private _isTriggerValid = (): boolean => {
       // When toggle is disabled, its always valid, otherwise check for validity
        return (!this._artifactTriggerStore.getState().isToggleEnabled || this._artifactTriggerStore.isValid())
            && (!this._pullRequestTriggerStore.getState().isToggleEnabled || this._pullRequestTriggerStore.isValid());
    }

    private _handleChange = () => {
        this.setState({ isEnabled: this._isTriggerEnabled(), isValid: this._isTriggerValid() });
    }

    private _pullRequestTriggerStore: PullRequestTriggerStore;
    private _artifactTriggerStore: ArtifactTriggerStore;
    private _artifactTriggerConditionStore: ArtifactTriggerConditionStore;
}

/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { OverlayPanelSelectable } from "DistributedTaskControls/Components/OverlayPanelSelectable";
import { Circle } from "DistributedTaskControls/Components/Canvas/Circle";

import { EnvironmentPostDeploymentPanelViewStore, IEnvironmentPostDeploymentPanelViewState } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentPostDeploymentPanelViewStore";
import { PostDeploymentApprovalsItem } from "PipelineWorkflow/Scripts/Editor/Canvas/PostDeploymentApprovalsItem";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Shared/Canvas/PostDeploymentApprovals";

export interface IPostDeploymentApprovalsProps extends Base.IProps {
    releaseDefinitionFolderPath?: string;
    releaseDefinitionId?: number;
}

export class PostDeploymentApprovals extends Base.Component<IPostDeploymentApprovalsProps, IEnvironmentPostDeploymentPanelViewState> {

    public componentWillMount(): void {
        this._postDeploymentPanelViewStore = StoreManager.GetStore<EnvironmentPostDeploymentPanelViewStore>(EnvironmentPostDeploymentPanelViewStore, this.props.instanceId);
        this._postDeploymentPanelViewStore.addChangedListener(this._handlePostDeploymentPanelViewStoreChange);
        this.setState(this._postDeploymentPanelViewStore.getState());
    }

    public componentWillUnmount(): void {
        this._postDeploymentPanelViewStore.removeChangedListener(this._handlePostDeploymentPanelViewStoreChange);
    }

    public render(): JSX.Element {
        const isAutomatedApproval = this.state.isAutomatedApproval;
        const approvalIconClass = css("bowtie-icon", { "bowtie-user": isAutomatedApproval }, { "bowtie-manual-approval": !isAutomatedApproval });

        return (
            <OverlayPanelSelectable
                instanceId={CanvasSelectorConstants.CanvasSelectorInstance}
                getItem={this._getItem}
                isValid={this.state.isValid}
                cssClass={this.props.cssClass}
                tooltipProps={{
                    content: Resources.EnvironmentPostDeploymentConditionsHeading
                }}>
                <Circle cssClass="cd-post-approvals" circleCss="cd-post-approvals-circle" radius={LayoutConstants.postDeploymentIndicatorElementRadius}>
                    {
                        this.state.isValid ?
                            <span className={approvalIconClass}></span> :
                            <span className="cd-post-approvals-error bowtie-icon bowtie-status-error-outline"></span>
                    }
                </Circle>
            </OverlayPanelSelectable>
        );
    }


    private _getItem = (): PostDeploymentApprovalsItem => {
        let state = this._postDeploymentPanelViewStore.getState();
        return new PostDeploymentApprovalsItem(this.props.releaseDefinitionFolderPath, this.props.releaseDefinitionId, state.environmentId, state.environmentName, this.props.instanceId);
    }

    private _handlePostDeploymentPanelViewStoreChange = () => {
        this.setState(this._postDeploymentPanelViewStore.getState());
    }

    private _postDeploymentPanelViewStore: EnvironmentPostDeploymentPanelViewStore;
}

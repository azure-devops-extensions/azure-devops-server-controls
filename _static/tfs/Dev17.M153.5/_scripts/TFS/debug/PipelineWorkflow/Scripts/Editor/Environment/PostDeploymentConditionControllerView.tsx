/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";

import { ApprovalPoliciesStore } from "PipelineWorkflow/Scripts/Editor/Environment/ApprovalPoliciesStore";
import { EnvironmentAutoRedeployTriggerComponent } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentAutoRedeployTriggerComponent";
import { EnvironmentPostDeploymentGatesComponent } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentPostDeploymentGatesComponent";
import { EnvironmentPostApprovalComponent } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentPostApprovalComponent";
import { PostDeploymentApproversViewStore } from "PipelineWorkflow/Scripts/Editor/Environment/PostDeploymentApproversViewStore";
import { PostDeploymentConditionsViewComponents } from "PipelineWorkflow/Scripts/Shared/Constants";
import { IDeploymentConditionProps, IDeploymentConditionViewState } from "PipelineWorkflow/Scripts/Shared/Environment/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_String from "VSS/Utils/String";

import * as VssContext from "VSS/Context";

/**
 * View containing post deployment conditions associated with an environment
 */
export class PostDeploymentConditionView extends ComponentBase.Component<IDeploymentConditionProps, IDeploymentConditionViewState> {

    public componentWillMount(): void {
        this.setState({ activeComponent: PostDeploymentConditionsViewComponents.EnvironmentPostApprovalView });
        this._approvalViewStore = StoreManager.GetStore<PostDeploymentApproversViewStore>(PostDeploymentApproversViewStore, this.props.instanceId);
        this._policiesStore = StoreManager.GetStore<ApprovalPoliciesStore>(ApprovalPoliciesStore, this.props.instanceId);
    }

    public render(): JSX.Element {
        let approvalView: string = PostDeploymentConditionsViewComponents.EnvironmentPostApprovalView;
        let gatesView: string = PostDeploymentConditionsViewComponents.EnvironmentPostDeploymentGatesView;
        let triggersView: string = PostDeploymentConditionsViewComponents.EnvironmentAutoRedeployTriggerView;

        return (<div className="environment-post-deployment-condition-container">
            <div className="post-release-approvers-container">
                <OverlayPanelHeading label={Resources.EnvironmentPostDeploymentConditionsHeading}
                    infoButtonRequired={false}
                    description={this.props.environmentName}>
                </OverlayPanelHeading>

                <EnvironmentPostApprovalComponent
                    environmentId={this.props.environmentId}
                    releaseDefinitionFolderPath={this.props.releaseDefinitionFolderPath}
                    releaseDefinitionId={this.props.releaseDefinitionId}
                    instanceId={this.props.instanceId}
                    showAutoApproveCheckbox={false}
                    policiesStore={this._policiesStore}
                    environmentApprovalPoliciesInfoMessage={Resources.PostDeploymentApprovalPoliciesInfoMessage}
                    onHeaderClick={this._onHeaderClick}
                    expanded={(this.state.activeComponent === approvalView)}
                    isReleaseView={this.props.isReleaseView}
                    viewStore={this._approvalViewStore}>
                </EnvironmentPostApprovalComponent>

                {
                    !this.props.isReleaseView
                        ? (
                            <EnvironmentPostDeploymentGatesComponent
                                environmentId={this.props.environmentId}
                                releaseDefinitionFolderPath={this.props.releaseDefinitionFolderPath}
                                releaseDefinitionId={this.props.releaseDefinitionId}
                                ariaLabel={Resources.EnvironmentPostApprovalGatesHeading}
                                instanceId={this.props.instanceId}
                                onHeaderClick={this._onHeaderClick}
                                expanded={(this.state.activeComponent === gatesView)}>
                            </EnvironmentPostDeploymentGatesComponent>
                        ) : null
                }

                {
                        <EnvironmentAutoRedeployTriggerComponent
                            environmentId={this.props.environmentId}
                            releaseDefinitionFolderPath={this.props.releaseDefinitionFolderPath}
                            releaseDefinitionId={this.props.releaseDefinitionId}
                            expanded={(this.state.activeComponent === triggersView)}
                            instanceId={this.props.instanceId}
                            onHeaderClick={this._onHeaderClick}>
                        </EnvironmentAutoRedeployTriggerComponent>
                }
            </div>
        </div>
        );
    }

    private _onHeaderClick = (view: string, isExpanded: boolean): void => {
        this.setState({ activeComponent: (isExpanded) ? view : Utils_String.empty });
    }

    private _approvalViewStore: PostDeploymentApproversViewStore;
    private _policiesStore: ApprovalPoliciesStore;
}
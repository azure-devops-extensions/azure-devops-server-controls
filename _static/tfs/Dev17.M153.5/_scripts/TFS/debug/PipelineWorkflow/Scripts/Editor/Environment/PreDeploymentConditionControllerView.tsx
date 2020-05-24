/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { ApprovalPoliciesStore } from "PipelineWorkflow/Scripts/Editor/Environment/ApprovalPoliciesStore";
import { EnvironmentTriggerControllerView } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerControllerView";
import { EnvironmentPreDeploymentGatesComponent } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentPreDeploymentGatesComponent";
import { PreDeploymentApproversViewStore } from "PipelineWorkflow/Scripts/Editor/Environment/PreDeploymentApproversViewStore";
import { QueueSettingsComponent } from "PipelineWorkflow/Scripts/Editor/Environment/QueueSettingsComponent";
import { EnvironmentApprovalViewStore } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentApprovalViewStore";
import { PreDeploymentConditionsViewComponents } from "PipelineWorkflow/Scripts/Shared/Constants";
import { EnvironmentPreApprovalComponent } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentPreApprovalComponent";
import { IDeploymentConditionProps, IDeploymentConditionViewState } from "PipelineWorkflow/Scripts/Shared/Environment/Types";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as VssContext from "VSS/Context";
import * as Utils_String from "VSS/Utils/String";

/**
 * View containing pre deployment conditions associated with an environment
 */
export class PreDeploymentConditionView extends ComponentBase.Component<IDeploymentConditionProps, IDeploymentConditionViewState> {

    constructor(props) {
        super(props);
        this._approvalStore = StoreManager.GetStore<PreDeploymentApproversViewStore>(PreDeploymentApproversViewStore, this.props.instanceId);
        this._policiesStore = StoreManager.GetStore<ApprovalPoliciesStore>(ApprovalPoliciesStore, this.props.instanceId);
        this.state = {
            activeComponent: (this._approvalStore.isAutomatedApproval() ? PreDeploymentConditionsViewComponents.EnvironmentTriggerView : PreDeploymentConditionsViewComponents.EnvironmentPreApprovalView)
        };
    }

    public render(): JSX.Element {       

        return (<div className="environment-pre-deployment-condition-container">
            <div className="pre-release-approvers-container">
                <OverlayPanelHeading label={Resources.EnvironmentPreDeploymentConditionHeading}
                    infoButtonRequired={false}
                    description={this.props.environmentName}>
                </OverlayPanelHeading>
                {
                    <EnvironmentTriggerControllerView
                        instanceId={this.props.instanceId}
                        onHeaderClick={this._onHeaderClick}
                        expanded={(this.state.activeComponent === PreDeploymentConditionsViewComponents.EnvironmentTriggerView)}>
                    </EnvironmentTriggerControllerView>
                }

                <EnvironmentPreApprovalComponent
                    environmentId={this.props.environmentId}
                    releaseDefinitionFolderPath={this.props.releaseDefinitionFolderPath}
                    releaseDefinitionId={this.props.releaseDefinitionId}
                    instanceId={this.props.instanceId}
                    policiesStore={this._policiesStore}
                    showAutoApproveCheckbox={true}
                    environmentApprovalPoliciesInfoMessage={Resources.PreDeploymentApprovalPoliciesInfoMessage}
                    onHeaderClick={this._onHeaderClick}
                    expanded={(this.state.activeComponent === PreDeploymentConditionsViewComponents.EnvironmentPreApprovalView)}
                    viewStore={this._approvalStore}>
                </EnvironmentPreApprovalComponent>

                {
                  <EnvironmentPreDeploymentGatesComponent
                        environmentId={this.props.environmentId}
                        releaseDefinitionFolderPath={this.props.releaseDefinitionFolderPath}
                        releaseDefinitionId={this.props.releaseDefinitionId}
                        ariaLabel={Resources.EnvironmentPreApprovalGatesHeading}
                        instanceId={this.props.instanceId}
                        onHeaderClick={this._onHeaderClick}
                        expanded={(this.state.activeComponent === PreDeploymentConditionsViewComponents.EnvironmentPreDeploymentGatesView)}>
                   </EnvironmentPreDeploymentGatesComponent>
                }
                {
                    <QueueSettingsComponent
                        instanceId={this.props.instanceId}
                        onHeaderClick={this._onHeaderClick}
                        expanded={(this.state.activeComponent === PreDeploymentConditionsViewComponents.QueueSettingsView)}>
                    </QueueSettingsComponent>
                }
            </div>
        </div>
        );
    }

    private _onHeaderClick = (view: string, isExpanded: boolean): void => {
        this.setState({ activeComponent: (isExpanded) ? view : Utils_String.empty });
    }

    private _approvalStore: PreDeploymentApproversViewStore;
    private _policiesStore: ApprovalPoliciesStore;
}
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { InnerFocusZone } from "DistributedTaskControls/Components/InnerFocusZone";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ConditionalTooltipHost } from "DistributedTaskControls/Components/ConditionalTooltipHost";

import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { ReleaseEditorPreDeploymentApproval } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEditorPreDeploymentApproval";
import { ReleaseEditorPostDeploymentApproval } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEditorPostDeploymentApproval";
import { ReleasePreDeploymentIndicator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePreDeploymentIndicator";
import { ReleasePostDeploymentIndicator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePostDeploymentIndicator";
import { IReleaseEnvironmentNodeViewState } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentNodeViewStore";
import { ReleaseEnvironmentNodeBase, IReleaseEnvironmentNodeBaseProps } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentNodeBase";
import { ReleaseEnvironmentProperties } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentProperties";
import { ComputedDeploymentStatus } from "PipelineWorkflow/Scripts/Common/Types";
import {
    IDeploymentConditionsInfo,
    ReleaseApprovalStatusIndicator,
    IGatesInfo,
    INodeDetailsInfo
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseEnvironmentStatusIndicator, ReleaseEditorMode } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseEnvironmentNodeActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentNodeActions";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { EnvironmentStatus } from "ReleaseManagement/Core/Contracts";

import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { css } from "OfficeFabric/Utilities";

import { empty, localeFormat } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentNode";

export class ReleaseEnvironmentNode extends ReleaseEnvironmentNodeBase<IReleaseEnvironmentNodeBaseProps, IReleaseEnvironmentNodeViewState> {

    public componentWillMount(): void {
        super.componentWillMount();
        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
    }

    public render(): JSX.Element {
        let arePreDeploymentIndicatorsVisible: boolean;
        let arePostDeploymentIndicatorsVisible: boolean;

        const statusInfo = this.state.statusInfo;
        if (statusInfo) {
            arePreDeploymentIndicatorsVisible = this.props.isEditMode || (!!statusInfo.preDeploymentConditionsInfo && (!!statusInfo.preDeploymentConditionsInfo.approvalInfo || !!statusInfo.preDeploymentConditionsInfo.gatesInfo));
            arePostDeploymentIndicatorsVisible = this.props.isEditMode || (!!statusInfo.postDeploymentConditionsInfo && (!!statusInfo.postDeploymentConditionsInfo.approvalInfo || !!statusInfo.postDeploymentConditionsInfo.gatesInfo));
        }

        let isNodeDisabled: boolean = this.props.isEditMode && this._isEnvironmentInProgress();

        // This is done to ensure that properties overlaps with pre-approval element.
        const corePropertiesStyles = (arePreDeploymentIndicatorsVisible ? {
            marginLeft: LayoutConstants.marginLeftForCorePropertiesToOverlapOnTriggersAndPreDeployments
        } : {});

        // This is done to ensure that post deployment approval element overlaps with properties element.
        const postApprovalsStyles = (arePostDeploymentIndicatorsVisible ? {
            marginLeft: LayoutConstants.marginLeftForPostDeploymentToOverlapOnCoreProperties
        } : {});

        // This is done to ensure that properties element across columns align properly. 
        // When there are no pre-approvals, then the core properties element is drawn at 
        // 0 offset from the left. We need to ensure that properties elements align when
        // nodes like below appear vertically
        // 1. Pre-approval -> Properties (Prop-with-pre)
        // 2. Properties (Prop)
        //
        // For Prop-with-pre to align with Prop, Prop-with-pre should be shifted left by
        // margin equivalent to with of Pre-approval
        //
        // The Properties in Prop-with-pre is already moved left by half the pre-approval
        // width to overlap with pre-approval. 
        // 
        // The whole node is moved further by half the pre-approval width to ensure that 
        // Prop-with-pre aligns with prop.
        //
        // Similarly for post-approval element
        const environmentNodeParentStyles = {
            marginLeft: arePreDeploymentIndicatorsVisible ? LayoutConstants.marginLeftForCorePropertiesToOverlapOnTriggersAndPreDeployments : 0,
            marginRight: arePostDeploymentIndicatorsVisible ? LayoutConstants.marginLeftForCorePropertiesToOverlapOnTriggersAndPreDeployments : 0
        };

        return (
            <div className="cd-environment-node-parent" style={environmentNodeParentStyles}>

                <InnerFocusZone ref={(element) => { this._releaseEnvironmentNode = element; }} ariaLabel={localeFormat(Resources.EnvironmentNodeAriaLabel, this.state.name)}>

                    <div className="cd-environment-node">

                        {
                            arePreDeploymentIndicatorsVisible
                            &&
                            <div className="pre-approvals-container">
                                {this._getPreDeploymentIndicator(this.state.statusInfo.preDeploymentConditionsInfo, isNodeDisabled)}
                            </div>
                        }

                        <div className="core-properties-container flex-item" style={corePropertiesStyles} >

                            {this._getReleaseEnvironmentPropertiesElement(isNodeDisabled)}

                        </div>

                        {
                            arePostDeploymentIndicatorsVisible
                            &&
                            <div className="post-approvals-container" style={postApprovalsStyles}>
                                {this._getPostDeploymentIndicator(this.state.statusInfo.postDeploymentConditionsInfo, isNodeDisabled)}
                            </div>
                        }

                    </div>

                </InnerFocusZone>

                {
                    !this.props.isEditMode && this._getEnvironmentNodeActions(arePreDeploymentIndicatorsVisible, arePostDeploymentIndicatorsVisible)
                }

            </div >
        );

    }

    private _getReleaseEnvironmentPropertiesElement(isNodeDisabled: boolean): JSX.Element {
        let statusText: string;
        let computedStatus: ComputedDeploymentStatus;
        let statusIndicator: ReleaseEnvironmentStatusIndicator;
        let nodeDetailsInfo: INodeDetailsInfo[] | IPromise<INodeDetailsInfo[]>;
        let auxiliaryStatusText: string;
        let statusInfo = this.state.statusInfo;
        if (statusInfo) {
            statusIndicator = statusInfo.statusIndicator;
            statusText = statusInfo.statusText;
            nodeDetailsInfo = statusInfo.nodeDetailsInfo;
            computedStatus = statusInfo.status;
        }

        const projectId = this._releaseStore.getProjectReferenceId();
        const hasPermission: boolean = PermissionHelper.hasEditReleaseEnvironmentPermissions(this.state.releaseDefinitionFolderPath, this.state.releaseDefinitionId, projectId, this.state.definitionEnvironmentId);
        const isDisabled: boolean = isNodeDisabled || this.props.isEditMode;
        return (
            <ConditionalTooltipHost
                content={Resources.NoPermissionForEditReleaseEnvironment}
                directionalHint={DirectionalHint.bottomCenter}
                showTooltip={this.props.isEditMode && !hasPermission}>

                <ReleaseEnvironmentProperties
                    cssClass={css(
                        "core-properties", { "no-edit-mode": !isNodeDisabled }
                    )}
                    instanceId={this.props.instanceId}
                    name={this.state.name}
                    id={this.state.id}
                    statusIndicator={statusIndicator}
                    statusText={statusText}
                    nodeDetailsInfo={nodeDetailsInfo}
                    definitionEnvironmentId={this.state.definitionEnvironmentId}
                    isEditMode={this.props.isEditMode}
                    disabled={isDisabled}
                    hasPermission={hasPermission}
                    computedStatus={computedStatus}
                    environmentStatus={this.state.environmentStatus}
                    releaseDefinitionFolderPath={this.state.releaseDefinitionFolderPath}
                    releaseDefinitionId={this.state.releaseDefinitionId}
                    releaseId={this._releaseStore.getReleaseId()}
                    hideEnvironmentProperties={this.props.isEditMode && (this._isEnvironmentInProgress() || hasPermission)}
                    areTasksInvalid={!this.state.areTasksValid}
                    deploymentIssues={this.state.deploymentIssues}
                    issuesCount={this.state.issuesCount}
                    showArtifactConditionsNotMetMessage={this.state.showArtifactConditionsNotMetMessage} />

            </ConditionalTooltipHost>);
    }

    private _isEnvironmentInProgress(): boolean {
        return this.state.environmentStatus === EnvironmentStatus.InProgress;
    }

    private _getPreDeploymentIndicator(preDeploymentConditionsInfo: IDeploymentConditionsInfo, isNodeDisabled?: boolean): JSX.Element {
        if (this.props.isEditMode) {
            return (
                <ConditionalTooltipHost
                    showTooltip={!this._hasManageReleaseApproverPermissions()}
                    content={Resources.NoPermissionForEditReleaseApprovals}
                    directionalHint={DirectionalHint.bottomCenter}>

                    <ReleaseEditorPreDeploymentApproval
                        cssClass="pre-deployment-conditions flex-item"
                        instanceId={this.props.instanceId}
                        environmentName={this.state.name}
                        environmentId={this.state.definitionEnvironmentId}
                        hasPermission={this._hasManageReleaseApproverPermissions()}
                        releaseDefinitionFolderPath={this.state.releaseDefinitionFolderPath}
                        releaseDefinitionId={this.state.releaseDefinitionId}
                        disabled={isNodeDisabled || !this._hasManageReleaseApproverPermissions()} />

                </ConditionalTooltipHost>
            );
        }
        else {
            return (
                <ReleasePreDeploymentIndicator
                    cssClass="cd-environment-pre-deployment"
                    instanceId={this.props.instanceId}
                    deploymentConditionsInfo={preDeploymentConditionsInfo}
                    environmentName={this.state.name} />
            );
        }
    }

    private _getPostDeploymentIndicator(postDeploymentConditionsInfo: IDeploymentConditionsInfo, isNodeDisabled?: boolean): JSX.Element {
        if (this.props.isEditMode) {
            return (
                <ConditionalTooltipHost
                    showTooltip={!this._hasManageReleaseApproverPermissions()}
                    content={Resources.NoPermissionForEditReleaseApprovals}
                    directionalHint={DirectionalHint.bottomCenter}>

                    <ReleaseEditorPostDeploymentApproval
                        cssClass="post-approvals flex-item"
                        instanceId={this.props.instanceId}
                        environmentName={this.state.name}
                        environmentId={this.state.definitionEnvironmentId}
                        hasPermission={this._hasManageReleaseApproverPermissions()}
                        releaseDefinitionFolderPath={this.state.releaseDefinitionFolderPath}
                        releaseDefinitionId={this.state.releaseDefinitionId}
                        disabled={isNodeDisabled || !this._hasManageReleaseApproverPermissions()} />

                </ConditionalTooltipHost>
            );
        }
        else {
            return (
                <ReleasePostDeploymentIndicator
                    cssClass="cd-environment-post-deployment"
                    instanceId={this.props.instanceId}
                    deploymentConditionsInfo={postDeploymentConditionsInfo}
                    environmentName={this.state.name} />
            );
        }
    }

    


    private _getEnvironmentNodeActions(arePreConditionsVisible: boolean, arePostConditionsVisible: boolean): JSX.Element {
        const nodeCommandsStyle = {
            marginLeft: (arePreConditionsVisible ? (-LayoutConstants.marginLeftForCorePropertiesToOverlapOnTriggersAndPreDeployments) : 0),
            marginRight: (arePostConditionsVisible ? (-LayoutConstants.marginLeftForPostDeploymentToOverlapOnCoreProperties) : 0),
            width: LayoutConstants.corePropertiesWidth,
            maxWidth: LayoutConstants.corePropertiesWidth
        };

        return (
            <div className="cd-environment-node-commands" style={nodeCommandsStyle}>
                <ReleaseEnvironmentNodeActions
                    instanceId={this.props.instanceId}
                    onDeploymentCancelCompleted={this._setFocus}
                    environmentName={this.state.name} />
            </div>
        );
    }

    private _hasManageReleaseApproverPermissions(): boolean {
        const projectId: string = this._releaseStore.getProjectReferenceId();
        const hasEditEnvironmentPermissions: boolean = PermissionHelper.hasEditReleaseEnvironmentPermissions(this.state.releaseDefinitionFolderPath, this.state.releaseDefinitionId, projectId, this.state.definitionEnvironmentId);
        const hasManageApproverPermissions: boolean = PermissionHelper.hasManageReleaseApproversPermissions(this.state.releaseDefinitionFolderPath, this.state.releaseDefinitionId, projectId, this.state.definitionEnvironmentId);

        // User have manage release approver permissions if:
        // 1. User is having edit environment permissions, and
        // 2. User is having manage approver permissions
        return hasEditEnvironmentPermissions && hasManageApproverPermissions;
    }

    private _releaseStore: ReleaseStore;
}
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Circle } from "DistributedTaskControls/Components/Canvas/Circle";
import { OverlayPanelSelectable } from "DistributedTaskControls/Components/OverlayPanelSelectable";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { EnvironmentPreDeploymentApprovalsItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentPreDeploymentApprovalsItem";
import { ReleaseEnvironmentPreDeploymentViewStore, IEnvironmentPreDeploymentViewState } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPreDeploymentViewStore";
import { ReleaseEnvironmentCanvasViewUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentCanvasViewUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { mergeStyles } from "OfficeFabric/Styling";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Shared/Canvas/EnvironmentPreDeploymentConditions";

export interface IReleaseEditorPreDeploymentApprovalProps extends Base.IProps {
    environmentName: string;
    environmentId: number;
    releaseDefinitionFolderPath: string;
    releaseDefinitionId: number;
    disabled?: boolean;
    hasPermission?: boolean;
}

export class ReleaseEditorPreDeploymentApproval extends Base.Component<IReleaseEditorPreDeploymentApprovalProps, IEnvironmentPreDeploymentViewState>{

    constructor(props) {
        super(props);
        this._viewStore = StoreManager.GetStore<ReleaseEnvironmentPreDeploymentViewStore>(ReleaseEnvironmentPreDeploymentViewStore, this.props.instanceId);
        this.state = this._viewStore.getState();
    }

    public componentWillMount(): void {
        this._viewStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._viewStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {

        const isValid = this.state.isValid;
        const isAutomatedApproval = this.state.isAutomatedApproval;
        const approvalIconClass = css("bowtie-icon", { "bowtie-user": isAutomatedApproval }, { "bowtie-manual-approval": !isAutomatedApproval });

        const circleMarginTop = ReleaseEnvironmentCanvasViewUtils.getApprovalsCircleTopMargin();
        const ariaLabelNoPermission = [Resources.PreDeploymentConditions, Resources.NoPermissionForEditReleaseApprovals].join(": ");

        return (
            <OverlayPanelSelectable
                instanceId={CanvasSelectorConstants.ReleaseCanvasSelectorInstance}
                getItem={this._getItem}
                cssClass={css(this.props.cssClass, mergeStyles({ marginTop: circleMarginTop }))}
                isValid={isValid}
                tooltipProps={this.props.hasPermission ? { content: Resources.PreDeploymentConditions } : null}
                ariaLabel={!this.props.hasPermission ? ariaLabelNoPermission : null}
                disabled={this.props.disabled}>

                <div className="cd-edit-release-approvals">
                    <Circle circleCss={css("cd-pre-deployment-conditions-node", "release-canvas-element",
                        { "cd-node-disabled": this.props.disabled })} radius={LayoutConstants.postDeploymentIndicatorElementRadius}>
                        {isValid ?
                            <div className={"cd-approvals"}>
                                <span className={approvalIconClass}></span>
                            </div> :
                            (
                                <div className="cd-approvals">
                                    <span className="cd-approvals-error bowtie-icon bowtie-status-error-outline"></span>
                                </div>
                            )
                        }
                    </Circle>
                </div>

            </OverlayPanelSelectable>
        );

    }

    private _getItem = (): EnvironmentPreDeploymentApprovalsItem => {
        return new EnvironmentPreDeploymentApprovalsItem(this.props.releaseDefinitionFolderPath, this.props.releaseDefinitionId, this.props.environmentId, this.props.environmentName, this.props.instanceId, true);
    }

    private _onChange = () => {
        this.setState(this._viewStore.getState());
    }

    private _viewStore: ReleaseEnvironmentPreDeploymentViewStore;
}
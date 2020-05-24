/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { OverlayPanelSelectable } from "DistributedTaskControls/Components/OverlayPanelSelectable";
import { ModifiedOval } from "DistributedTaskControls/Components/Canvas/ModifiedOval";

import { EnvironmentPreDeploymentPanelViewStore, IEnvironmentPreDeploymentPanelViewState } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentPreDeploymentPanelViewStore";
import { EnvironmentTriggersAndPreDeploymentApprovalsItem } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentTriggersAndPreDeploymentApprovalsItem";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Shared/Canvas/EnvironmentPreDeploymentConditions";

export interface IEnvironmentTriggersAndPreDeploymentApprovalsProps extends Base.IProps {
    releaseDefinitionFolderPath?: string;
    releaseDefinitionId?: number;
}

export class EnvironmentTriggersAndPreDeploymentApprovals extends Base.Component<IEnvironmentTriggersAndPreDeploymentApprovalsProps, IEnvironmentPreDeploymentPanelViewState> {

    constructor(props) {
        super(props);
        this._environmentPreDeploymentPanelViewStore = StoreManager.GetStore<EnvironmentPreDeploymentPanelViewStore>(EnvironmentPreDeploymentPanelViewStore, this.props.instanceId);
        this.state = this._environmentPreDeploymentPanelViewStore.getState();
    }

    public componentWillMount(): void {
        this._environmentPreDeploymentPanelViewStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._environmentPreDeploymentPanelViewStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        const isValid = this.state.isValid;
        const isAutomatedTrigger = this.state.isAutomatedTrigger;
        const isAutomatedApproval = this.state.isAutomatedApproval;

        const approvalIconClass = css("bowtie-icon", { "bowtie-user": isAutomatedApproval }, { "bowtie-manual-approval": !isAutomatedApproval });
        const triggerIconClass = css("bowtie-icon", { "bowtie-trigger-approval": isAutomatedTrigger }, { "bowtie-trigger": !isAutomatedTrigger });

        return (
            <OverlayPanelSelectable
                instanceId={CanvasSelectorConstants.CanvasSelectorInstance}
                getItem={this._getItem}
                isValid={isValid}
                cssClass={this.props.cssClass}
                tooltipProps={{
                    content: Resources.PreDeploymentConditions
                }}>

                <ModifiedOval
                    width={LayoutConstants.triggersAndPreDeploymentApprovalsElementWidth}
                    height={LayoutConstants.triggersAndPreDeploymentApprovalsElementHeight}
                    cssClass="cd-triggers-and-approvals-container"
                    ovalClass="cd-pre-deployment-conditions-node">

                    {
                        isValid ?
                            (<div>
                                <div className="cd-triggers">
                                    <span className={triggerIconClass}></span>
                                </div>

                                <div className="cd-approvals">
                                    <span className={approvalIconClass}></span>
                                </div>
                            </div>) :
                            (
                                <div className="cd-triggers">
                                    <span className="cd-triggers-error bowtie-icon bowtie-status-error-outline"></span>
                                </div>
                            )
                    }

                </ModifiedOval>

            </OverlayPanelSelectable>
        );
    }

    private _onChange = () => {
        this.setState(this._environmentPreDeploymentPanelViewStore.getState());
    }

    private _getItem = (): EnvironmentTriggersAndPreDeploymentApprovalsItem => {
        let state = this._environmentPreDeploymentPanelViewStore.getState();
        return new EnvironmentTriggersAndPreDeploymentApprovalsItem(this.props.releaseDefinitionFolderPath, this.props.releaseDefinitionId, state.environmentId, state.environmentName, this.props.instanceId);
    }

    private _environmentPreDeploymentPanelViewStore: EnvironmentPreDeploymentPanelViewStore;
}

import * as React from "react";

import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import {
    INodeDetailsInfo,
    IInProgressDeploymentInfo,
    IInprogressStatus,
    NodeDetailsInfoType
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { INodeDetailsRenderer, ICommonRendererConfig } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/NodeDetailsRendererFactory";
import { IEnvironmentNodeSubStatusTextProps, EnvironmentNodeSubStatusText } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentNodeSubStatusText";
import { IReleaseEnvironmentAgentPhaseInProgressContentProps } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentAgentPhaseInProgressContent";

import { HtmlNormalizer } from "VSS/Utils/Html";
import { empty } from "VSS/Utils/String";

export abstract class NodeDetailsInProgressRenderer implements INodeDetailsRenderer {

    constructor(inProgressDeploymentInfo: IInProgressDeploymentInfo, commonRendererConfig: ICommonRendererConfig) {
        this._inProgressDeploymentInfo = inProgressDeploymentInfo;
        this._commonRendererConfig = commonRendererConfig;
    }

    public getSubStatusElement(className?: string, index?: number): JSX.Element {
        let key = this._commonRendererConfig.instanceId + "-InProgressSubStatus-" + (index ? index : "");

        let jsxToReturn: JSX.Element = <div className="cd-environment-show-in-progress-phase-content" key={key} >
            {this.phaseContent}
        </div>;

        return jsxToReturn;
    }

    public getAdditionalStatusElement(index?: number): JSX.Element {
        let subStatusProps: IEnvironmentNodeSubStatusTextProps = {
            text: this._inProgressDeploymentInfo.startTimeText,
            className: "cd-environment-in-progress-total-duration-text"
        };
        let key = this._commonRendererConfig.instanceId + "-InProgressAdditionalStatus-" + (index ? index : "");

        return <div className="cd-environment-in-progress-total-duration" key={key} aria-label={this._inProgressDeploymentInfo.startTimeAriaLabel} >
            <EnvironmentNodeSubStatusText {...subStatusProps} />
            <span className="fade-out-element"></span>
        </div>;
    }

    public getAriaLabel(): string {
        return empty;
    }

    public getRendererType(): NodeDetailsInfoType {
        return this.rendererType;
    }

    protected _getEnvironmentId(): number {
        return this._commonRendererConfig.environmentId;
    }

    protected _getPhaseContentProps(): IReleaseEnvironmentAgentPhaseInProgressContentProps {
        return {
            environmentName: this._commonRendererConfig.environmentName,
            environmentId: this._commonRendererConfig.environmentId,
            inprogressStatus: this._inProgressDeploymentInfo.inProgressStatus,
            taskName: this._inProgressDeploymentInfo.taskName,
            deploymentIssues: this._commonRendererConfig.deploymentIssues
        } as IReleaseEnvironmentAgentPhaseInProgressContentProps;
    }

    protected abstract get phaseContent(): JSX.Element;
    protected abstract get rendererType(): NodeDetailsInfoType;

    protected _inProgressDeploymentInfo: IInProgressDeploymentInfo;
    protected _commonRendererConfig: ICommonRendererConfig;

}
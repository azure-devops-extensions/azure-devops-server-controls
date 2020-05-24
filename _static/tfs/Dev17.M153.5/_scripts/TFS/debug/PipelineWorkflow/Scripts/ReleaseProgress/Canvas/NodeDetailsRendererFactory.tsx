import * as React from "react";

import {
    INodeDetailsInfo,
    IEnvironmentSubStatusInfo,
    IInProgressDeploymentInfo,
    INodeDetailsGatesInfo,
    NodeDetailsInfoType,
    IDeploymentIssues
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

import { NodeDetailsSubStatusRenderer } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/NodeDetailsSubStatusRenderer";
import { NodeDetailsDeploymentGroupInProgressRenderer } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/NodeDetailsDeploymentGroupInProgressRenderer";
import { NodeDetailsReleaseEnvironmentInProgressRenderer } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/NodeDetailsReleaseEnvironmentInProgressRenderer";
import { NodeDetailsReleaseEnvironmentManualInterventionPendingRenderer } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/NodeDetailsReleaseEnvironmentManualInterventionPendingRenderer";
import { NodeDetailsGatesRenderer } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/NodeDetailsGatesRenderer";

export interface INodeDetailsRenderer {
    getAdditionalStatusElement(index?: number): JSX.Element;
    getSubStatusElement(className?: string, index?: number): JSX.Element;
    getAriaLabel(): string;
    getRendererType(): NodeDetailsInfoType;
}

export interface ICommonRendererConfig {
    environmentName: string;
    environmentId: number;
    hideEnvironmentProperties: boolean;
    instanceId: string;
    deploymentIssues: IDeploymentIssues;
}

export class NodeDetailsRendererFactory {

    public static getRendererInstances(nodeDetailsInfo: INodeDetailsInfo[], commonRendererConfig: ICommonRendererConfig): INodeDetailsRenderer[] {
        if (!nodeDetailsInfo) {
            return [];
        }
        else {
            let renderersToReturn: INodeDetailsRenderer[] = [];

            if (!commonRendererConfig.hideEnvironmentProperties) {
                nodeDetailsInfo.forEach((rendererConfig: INodeDetailsInfo) => {
                    renderersToReturn.push(NodeDetailsRendererFactory._getRendererInstance(rendererConfig, commonRendererConfig));
                });
            }

            return renderersToReturn;
        }
    }

    private static _getRendererInstance(rendererConfig: INodeDetailsInfo, commonRendererConfig: ICommonRendererConfig): INodeDetailsRenderer {
        switch (rendererConfig.infoType) {

            case NodeDetailsInfoType.subStatusRenderer:
                return new NodeDetailsSubStatusRenderer((rendererConfig as IEnvironmentSubStatusInfo), commonRendererConfig);

            case NodeDetailsInfoType.releaseEnvironmentInProgressRenderer:
                return new NodeDetailsReleaseEnvironmentInProgressRenderer((rendererConfig as IInProgressDeploymentInfo), commonRendererConfig);

            case NodeDetailsInfoType.deploymentGroupsInProgressRenderer:
                return new NodeDetailsDeploymentGroupInProgressRenderer((rendererConfig as IInProgressDeploymentInfo), commonRendererConfig);

            case NodeDetailsInfoType.gatesRenderer:
                return new NodeDetailsGatesRenderer((rendererConfig as INodeDetailsGatesInfo), commonRendererConfig);

            case NodeDetailsInfoType.manualInterventionPendingRenderer:
                return new NodeDetailsReleaseEnvironmentManualInterventionPendingRenderer((rendererConfig as IInProgressDeploymentInfo), commonRendererConfig);

        }
    }

}
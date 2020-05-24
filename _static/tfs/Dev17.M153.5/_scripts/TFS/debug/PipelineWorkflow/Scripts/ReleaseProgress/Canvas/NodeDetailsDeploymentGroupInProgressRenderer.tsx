import * as React from "react";

import { NodeDetailsInfoType } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import {
    ReleaseEnvironmentInProgressPhaseContent,
    IReleaseEnvironmentInProgressPhaseContentProps
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentInProgressPhaseContent";
import { IDeploymentGroupInProgressPhaseContentProps } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentGroupInProgressPhaseContent";
import { NodeDetailsInProgressRenderer } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/NodeDetailsInProgressRenderer";

export class NodeDetailsDeploymentGroupInProgressRenderer extends NodeDetailsInProgressRenderer {

    protected get phaseContent(): JSX.Element {
        let deploymentGroupPhaseProps: IReleaseEnvironmentInProgressPhaseContentProps = {
            ...this._getDeploymentGroupPhaseContentProps(),
            isDeploymentGroupPhase: true
        } as IReleaseEnvironmentInProgressPhaseContentProps;

        return <ReleaseEnvironmentInProgressPhaseContent {...deploymentGroupPhaseProps} />;
    }


    protected get rendererType(): NodeDetailsInfoType {
        return NodeDetailsInfoType.deploymentGroupsInProgressRenderer;
    }

    protected _getDeploymentGroupPhaseContentProps(): IDeploymentGroupInProgressPhaseContentProps {
        return {
            ...this._getPhaseContentProps(),
            deploymentGroupPhaseMachinesData: this._inProgressDeploymentInfo.deploymentGroupPhaseMachinesData
        };
    }
}

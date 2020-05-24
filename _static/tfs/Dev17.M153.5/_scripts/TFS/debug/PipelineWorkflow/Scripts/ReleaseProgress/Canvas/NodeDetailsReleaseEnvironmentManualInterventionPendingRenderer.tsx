import * as React from "react";

import { NodeDetailsInfoType } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

import {
    ReleaseEnvironmentInProgressPhaseContent,
    IReleaseEnvironmentInProgressPhaseContentProps
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentInProgressPhaseContent";
import { NodeDetailsInProgressRenderer } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/NodeDetailsInProgressRenderer";

export class NodeDetailsReleaseEnvironmentManualInterventionPendingRenderer extends NodeDetailsInProgressRenderer {

    protected get phaseContent(): JSX.Element {

        let agentlessPhaseProps: IReleaseEnvironmentInProgressPhaseContentProps = this._getPhaseContentProps();

        return <ReleaseEnvironmentInProgressPhaseContent {...agentlessPhaseProps} isManualInterventionPending={true} />;

    }

    public getAdditionalStatusElement(index?: number): JSX.Element {
        return null;
    }

    protected get rendererType(): NodeDetailsInfoType {
        return NodeDetailsInfoType.manualInterventionPendingRenderer;
    }

}
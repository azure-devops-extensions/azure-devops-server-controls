import * as React from "react";

import { NodeDetailsInfoType } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

import {
    ReleaseEnvironmentInProgressPhaseContent,
    IReleaseEnvironmentInProgressPhaseContentProps
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentInProgressPhaseContent";
import { NodeDetailsInProgressRenderer } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/NodeDetailsInProgressRenderer";

export class NodeDetailsReleaseEnvironmentInProgressRenderer extends NodeDetailsInProgressRenderer {

    protected get phaseContent(): JSX.Element {

        let agentPhaseProps: IReleaseEnvironmentInProgressPhaseContentProps = this._getPhaseContentProps();

        return <ReleaseEnvironmentInProgressPhaseContent {...agentPhaseProps} />;

    }

    protected get rendererType(): NodeDetailsInfoType {
        return NodeDetailsInfoType.releaseEnvironmentInProgressRenderer;
    }

}
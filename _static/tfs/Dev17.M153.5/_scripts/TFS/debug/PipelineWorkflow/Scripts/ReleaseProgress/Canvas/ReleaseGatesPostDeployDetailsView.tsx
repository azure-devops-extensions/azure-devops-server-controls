/// <reference types="react" />
import * as React from "react";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { ReleaseGatesPostDeployDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesPostDeployDetailsViewStore";
import { ReleaseGatesDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesDetailsView";

export class ReleaseGatesPostDeployDetailsView extends ReleaseGatesDetailsView {

    protected getViewStore() {
        return StoreManager.GetStore<ReleaseGatesPostDeployDetailsViewStore>(ReleaseGatesPostDeployDetailsViewStore, this.props.instanceId);
    }

    protected isPreDeploymentGates(): boolean {
        return false;
    }
}
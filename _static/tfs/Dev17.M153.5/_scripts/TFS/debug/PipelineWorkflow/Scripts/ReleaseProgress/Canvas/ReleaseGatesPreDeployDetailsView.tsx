/// <reference types="react" />
import * as React from "react";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { ReleaseGatesPreDeployDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesPreDeployDetailsViewStore";
import { ReleaseGatesDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesDetailsView";

export class ReleaseGatesPreDeployDetailsView extends ReleaseGatesDetailsView {

    protected getViewStore() {
        return StoreManager.GetStore<ReleaseGatesPreDeployDetailsViewStore>(ReleaseGatesPreDeployDetailsViewStore, this.props.instanceId);
    }

    protected isPreDeploymentGates(): boolean {
        return true;
    }
}
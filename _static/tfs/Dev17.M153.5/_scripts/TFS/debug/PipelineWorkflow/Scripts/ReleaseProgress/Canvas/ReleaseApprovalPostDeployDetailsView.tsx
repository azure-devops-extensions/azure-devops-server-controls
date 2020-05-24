/// <reference types="react" />
import * as React from "react";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { ReleaseApprovalPostDeployDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalPostDeployDetailsViewStore";
import {ReleaseApprovalDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalDetailsView";

export class ReleaseApprovalPostDeployDetailsView extends ReleaseApprovalDetailsView {

    protected getViewStore() {
        return StoreManager.GetStore<ReleaseApprovalPostDeployDetailsViewStore>(ReleaseApprovalPostDeployDetailsViewStore, this.props.instanceId);
    }
}
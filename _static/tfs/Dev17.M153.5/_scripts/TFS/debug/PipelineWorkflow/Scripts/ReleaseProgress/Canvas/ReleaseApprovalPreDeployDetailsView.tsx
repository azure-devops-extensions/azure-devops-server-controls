/// <reference types="react" />
import * as React from "react";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ReleaseApprovalDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalDetailsView";
import { ReleaseApprovalPreDeployDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalPreDeployDetailsViewStore";

export class ReleaseApprovalPreDeployDetailsView extends ReleaseApprovalDetailsView {

    protected getViewStore() {
        return StoreManager.GetStore<ReleaseApprovalPreDeployDetailsViewStore>(ReleaseApprovalPreDeployDetailsViewStore, this.props.instanceId);
    }
}
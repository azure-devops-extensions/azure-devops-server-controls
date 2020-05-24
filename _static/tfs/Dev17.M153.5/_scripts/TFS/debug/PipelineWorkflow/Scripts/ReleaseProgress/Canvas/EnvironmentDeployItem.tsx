import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import { OverlayPanelActionsCreator } from "DistributedTaskControls/Actions/OverlayPanelActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

import { EnvironmentStatus } from "ReleaseManagement/Core/Contracts";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { EnvironmentDeployPanelTabs } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentDeployPanelTabs";

export class EnvironmentDeployItem implements Item {

    constructor(private _instanceId: string) {
    }

    public getOverview(instanceId?: string): JSX.Element {
        return null;
    }

    public getDetails(): JSX.Element {
        return (
            <EnvironmentDeployPanelTabs 
                key={this.getKey()}
                instanceId={this._instanceId}
                onActionComplete={this.closePanel}
                />
        );
    }

    public getKey(): string {
        return "cd-release-environment-deploy-action-" + this._instanceId;
    }

    public getInstanceId(): string {
        return this._instanceId;
    }

    public closePanel() {
        let overlayPanelActionsCreator = ActionCreatorManager.GetActionCreator<OverlayPanelActionsCreator>(OverlayPanelActionsCreator,
            CanvasSelectorConstants.ReleaseCanvasSelectorInstance);
        overlayPanelActionsCreator.hideOverlay();
    }
}

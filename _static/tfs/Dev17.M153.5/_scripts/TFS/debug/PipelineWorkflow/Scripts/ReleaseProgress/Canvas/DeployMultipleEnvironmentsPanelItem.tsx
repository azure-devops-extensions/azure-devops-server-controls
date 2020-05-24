/// <reference types="react" />
import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import { OverlayPanelActionsCreator } from "DistributedTaskControls/Actions/OverlayPanelActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import {
    DeployMultipleEnvironmentsPanel
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployMultipleEnvironmentsPanel";

export class DeployMultipleEnvironmentsPanelItem implements Item {

    constructor(private _instanceId: string) {
    }

    public getOverview(instanceId?: string): JSX.Element {
        return null;
    }

    public getDetails(): JSX.Element {
        return (
            <DeployMultipleEnvironmentsPanel 
                key={this.getKey()}
                instanceId={this._instanceId}
                onActionComplete={this.closePanel}/>
        );
    }

    public getKey(): string {
        return "cd-release-multiple-environment-deploy-" + this._instanceId;
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
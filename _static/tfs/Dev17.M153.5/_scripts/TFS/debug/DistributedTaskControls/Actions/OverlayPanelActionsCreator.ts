import { OverlayPanelActions } from "DistributedTaskControls/Actions/OverlayPanelActions";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

export class OverlayPanelActionsCreator extends ActionCreatorBase {

    public static getKey(): string {
        return ActionCreatorKeys.OverlayPanelActionsCreator;
    }

    public initialize(instanceId: string) {
        this._actions = ActionsHubManager.GetActionsHub<OverlayPanelActions>(OverlayPanelActions, instanceId);
    }

    public showOverlay(): void {
        this._actions.showOverlay.invoke({});
    }

    public hideOverlay(): void {
        this._actions.hideOverlay.invoke({});
    }

    public setFocusOnCloseButton(): void {
        this._actions.setFocusOnCloseButton.invoke({});
    }

    public setDetailsPanelWidth(width: number): void {
        this._actions.setDetailsPanelWidth.invoke({ width: width });
    }

    public setIsBlockingPanelOpen(isOpen: boolean): void {
        this._actions.setIsBlockingPanelOpen.invoke({ isOpen: isOpen });
    }

    private _actions: OverlayPanelActions;
}
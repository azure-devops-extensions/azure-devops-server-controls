import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

import { Action } from "VSS/Flux/Action";

export interface IDetailsPanelWidthPayload {
    width: number;
}

export interface IIsBlockingPanelOpenPayload {
    isOpen: boolean;
}

export class OverlayPanelActions extends ActionsHubBase {

    public initialize() {
        this._showOverlay = new Action<IEmptyActionPayload>();
        this._hideOverlay = new Action<IEmptyActionPayload>();
        this._setFocusOnCloseButton = new Action<IEmptyActionPayload>();
        this._setDetailsPanelWidth = new Action<IDetailsPanelWidthPayload>();
        this._setIsBlockingPanelOpen = new Action<IIsBlockingPanelOpenPayload>();
    }

    public static getKey(): string {
        return ActionsKeys.OverlayPanelActions;
    }

    public get showOverlay(): Action<IEmptyActionPayload> {
        return this._showOverlay;
    }

    public get hideOverlay(): Action<IEmptyActionPayload> {
        return this._hideOverlay;
    }

    public get setFocusOnCloseButton(): Action<IEmptyActionPayload> {
        return this._setFocusOnCloseButton;
    }

    public get setDetailsPanelWidth(): Action<IDetailsPanelWidthPayload> {
        return this._setDetailsPanelWidth;
    }

    public get setIsBlockingPanelOpen(): Action<IIsBlockingPanelOpenPayload> {
        return this._setIsBlockingPanelOpen;
    }

    private _showOverlay: Action<IEmptyActionPayload>;
    private _hideOverlay: Action<IEmptyActionPayload>;
    private _setDetailsPanelWidth: Action<IDetailsPanelWidthPayload>;
    private _setIsBlockingPanelOpen: Action<IIsBlockingPanelOpenPayload>;
    private _setFocusOnCloseButton: Action<IEmptyActionPayload>;
}



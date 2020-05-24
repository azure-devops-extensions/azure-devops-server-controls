/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import { StoreKeys } from "DistributedTaskControls/Common/Common";

import { OverlayPanelActions, IDetailsPanelWidthPayload, IIsBlockingPanelOpenPayload } from "DistributedTaskControls/Actions/OverlayPanelActions";


export interface IOverlayPanelStoreArgs {
    detailsPaneWidth: number;
}

/** 
 * Selection state for a two panel selector.
 */
export interface IOverlayPanelState extends ComponentBase.IState {

    showDetails: boolean;
    focusOnCloseButton: boolean;

    detailsPaneWidth?: number;

    /**
     * Indicate if a blocking panel (like dialog or fabric pane is open)
     */ 
    isBlockingPanelOpen?: boolean;
}

/**
 * Encapsulates the store to handle selection for the two panel selector. 
 */
export class OverlayPanelStore extends StoreCommonBase.StoreBase {

    constructor(args: IOverlayPanelStoreArgs) {
        super();
        this._state.detailsPaneWidth = args.detailsPaneWidth;
    }

    public initialize(instanceId?: string) {
        this._actions = ActionsHubManager.GetActionsHub<OverlayPanelActions>(OverlayPanelActions, instanceId);
        this._actions.showOverlay.addListener(this._handleShowOverlay);
        this._actions.hideOverlay.addListener(this._handleHideOverlay);
        this._actions.setFocusOnCloseButton.addListener(this._setFocusOnCloseButton);
        this._actions.setDetailsPanelWidth.addListener(this._handleSetDetailsPanelWidth);
        this._actions.setIsBlockingPanelOpen.addListener(this._handleSetIsOverlayPanelOpen);
    }

    protected disposeInternal(): void {
        this._actions.showOverlay.removeListener(this._handleShowOverlay);
        this._actions.hideOverlay.removeListener(this._handleHideOverlay);
        this._actions.setFocusOnCloseButton.removeListener(this._setFocusOnCloseButton);
        this._actions.setDetailsPanelWidth.removeListener(this._handleSetDetailsPanelWidth);
        this._actions.setIsBlockingPanelOpen.removeListener(this._handleSetIsOverlayPanelOpen);
    }

    public static getKey(): string {
        return StoreKeys.OverlayPanelStore;
    }

    public getState(): IOverlayPanelState {
        return this._state;
    }

    private _handleShowOverlay = () => {
        this._state.showDetails = true;
        this.emitChanged();
    }

    private _handleHideOverlay = () => {
        this._state.showDetails = false;
        this._state.focusOnCloseButton = false;
        this.emitChanged();
    }

    private _setFocusOnCloseButton = () => {
        this._state.focusOnCloseButton = true;
        this.emitChanged();
    }

    private _handleSetDetailsPanelWidth = (payload: IDetailsPanelWidthPayload) => {
        this._state.detailsPaneWidth = payload.width;
    }

    private _handleSetIsOverlayPanelOpen = (payload: IIsBlockingPanelOpenPayload) => {
        this._state.isBlockingPanelOpen = payload.isOpen;
    }

    private _actions: OverlayPanelActions;
    private _state: IOverlayPanelState = {} as IOverlayPanelState;
}

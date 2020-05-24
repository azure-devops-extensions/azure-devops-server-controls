// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IState } from "DistributedTaskControls/Common/Components/Base";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { Telemetry, Feature } from "DistributedTaskControls/Common/Telemetry";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";

import { SaveAsTemplateDialogActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/SaveAsTemplateDialogActionsHub";

import * as Utils_String from "VSS/Utils/String";

export interface ISaveAsTemplateDialogState extends IState {
    name: string;
    description: string;
    // storing "isVisible" state in the store for the dialog as need to wait till promise is resolved
    // and based on that the dialog is closed
    isVisible: boolean;
    errorMessage: string;
    isCreateButtonEnabled: boolean;
}

/**
 * Store to contain state associated with save as template dialog box
 */
export class SaveAsTemplateDialogStore extends StoreBase {

    constructor() {
        super();
        this._resetValues();
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_SaveAsTemplateDialogStoreKey;
    }

    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<SaveAsTemplateDialogActionsHub>(SaveAsTemplateDialogActionsHub);
        this._actions.changeName.addListener(this._handleNameChange);
        this._actions.changeDescription.addListener(this._handleDescriptionChange);
        this._actions.onSaveCompletion.addListener(this._handleSaveCompletion);
        this._actions.onCancelClick.addListener(this._handleCancelClick);
        this._actions.showDialog.addListener(this._handleShowDialog);
        this._actions.onDismissErrorMessage.addListener(this._handleDismissErrorMessage);
        this._actions.showErrorMessage.addListener(this._handleErrorMessage);
    }

    public disposeInternal(): void {
        this._actions.changeName.removeListener(this._handleNameChange);
        this._actions.changeDescription.removeListener(this._handleDescriptionChange);
        this._actions.onSaveCompletion.removeListener(this._handleSaveCompletion);
        this._actions.onCancelClick.removeListener(this._handleCancelClick);
        this._actions.showDialog.removeListener(this._handleShowDialog);
        this._actions.onDismissErrorMessage.removeListener(this._handleDismissErrorMessage);
        this._actions.showErrorMessage.removeListener(this._handleErrorMessage);
    }

    public getState(): ISaveAsTemplateDialogState {
        return this._state;
    }

    private _handleNameChange = (name: string): void => {
        this._state.name = name;
        this._state.isCreateButtonEnabled = this._state.name ? true : false;
        this._state.errorMessage = Utils_String.empty;
        this.emitChanged();
    }

    private _handleDescriptionChange = (description: string): void => {
        this._state.description = description;
        this.emitChanged();
    }

    private _handleSaveCompletion = (): void => {
        this._state.isVisible = false;
        this.emitChanged();
        Telemetry.instance().publishEvent(Feature.SaveEnvironmentAsTemplate);
        this._resetValues();
    }

    private _handleCancelClick = (): void => {
        this._state.isVisible = false;
        this.emitChanged();
        this._resetValues();
    }

    private _handleDismissErrorMessage = (): void => {
        this._state.errorMessage = Utils_String.empty;
        this.emitChanged();
    }

    private _handleShowDialog = (): void => {
        this._state.isVisible = true;
        this.emitChanged();
    }

    private _handleErrorMessage = (errorMessage: string): void => {
        this._state.errorMessage = errorMessage;
        this.emitChanged();
    }

    private _resetValues() {
        this._state = {
            name: Utils_String.empty,
            description: Utils_String.empty,
            errorMessage: Utils_String.empty,
            isCreateButtonEnabled: false,
            isVisible: false
        };
    }

    private _state: ISaveAsTemplateDialogState;
    private _actions: SaveAsTemplateDialogActionsHub;
}
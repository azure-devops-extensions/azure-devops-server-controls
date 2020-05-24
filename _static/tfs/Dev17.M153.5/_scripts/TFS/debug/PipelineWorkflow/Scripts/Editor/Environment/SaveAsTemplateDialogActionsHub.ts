// Copyright (c) Microsoft Corporation.  All rights reserved.

import { Action, ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";

/**
 *  Actions for save as template dialog.
 */
export class SaveAsTemplateDialogActionsHub extends ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_SaveAsTemplateActionHub;
    }

    public initialize(): void {
        this._changeName = new Action<string>();
        this._changeDescription = new Action<string>();
        this._onSaveCompletion = new Action<IEmptyActionPayload>();
        this._onCancelClick = new Action<IEmptyActionPayload>();
        this._onDismissErrorMessage = new Action<IEmptyActionPayload>();
        this._showDialog = new Action<IEmptyActionPayload>();
        this._showErrorMessage = new Action<string>();
    }

    /**
     * Update save as template dialog name
     */
    public get changeName(): Action<string> {
        return this._changeName;
    }

    /**
     * Update save as template dialog description
     */
    public get changeDescription(): Action<string> {
        return this._changeDescription;
    }

    /**
    * Invoked when server successfully saves the environment as template
    */
    public get onSaveCompletion(): Action<IEmptyActionPayload> {
        return this._onSaveCompletion;
    }

    /**
    * Invoked on cancel button click
    */
    public get onCancelClick(): Action<IEmptyActionPayload> {
        return this._onCancelClick;
    }

    /**
    * Invoked when OfficeFabric error message bar is dismissed
    */
    public get onDismissErrorMessage(): Action<IEmptyActionPayload> {
        return this._onDismissErrorMessage;
    }

    /**
    * Shows up the save as template dialog
    */
    public get showDialog(): Action<IEmptyActionPayload> {
        return this._showDialog;
    }

    /**
    * Shows error message when template save was not successful
    */
    public get showErrorMessage(): Action<string> {
        return this._showErrorMessage;
    }

    private _changeName: Action<string>;
    private _changeDescription: Action<string>;
    private _onSaveCompletion: Action<IEmptyActionPayload>;
    private _onCancelClick: Action<IEmptyActionPayload>;
    private _onDismissErrorMessage: Action<IEmptyActionPayload>;
    private _showDialog: Action<IEmptyActionPayload>;
    private _showErrorMessage: Action<string>;
}
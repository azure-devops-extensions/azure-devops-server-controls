// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");

import Component_Dialog = require("VSSPreview/Flux/Components/Dialog");

export interface IActionConfirmationDialogOptions extends Component_Dialog.DialogOptions {
    title: string;
    description?: string;
}

export class ActionConfirmationDialog extends Component_Dialog.Dialog<IActionConfirmationDialogOptions> {

    /**
 * Renders the content of the dialog.
 */
    public render(): JSX.Element {
        return (<div className="action-confirmation-description">
            <label >{this._options.description}</label>
        </div>);
    }

    /**
     * Default options for this dialog.
     *
     * @param options
     */
    public initializeOptions(options?: any) {
        let defaultOptions: Component_Dialog.DialogOptions = {
            okButtonEnabled: true,
            title: options.title
        };

        super.initializeOptions($.extend(defaultOptions, options));
    }

    //  /**
    //* Ok click handler. Executed when ok button is clicked.
    //*
    //* @param e
    //*/
    public onOkClick(e?: JQueryEventObject): any {
        this._options.okCallback();
        this.close();
    }
}

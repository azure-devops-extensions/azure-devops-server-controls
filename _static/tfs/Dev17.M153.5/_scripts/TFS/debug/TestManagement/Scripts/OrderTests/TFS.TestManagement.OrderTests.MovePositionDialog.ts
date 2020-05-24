// Copyright (c) Microsoft Corporation.  All rights reserved.

import Dialogs = require("VSS/Controls/Dialogs");
import Notifications = require("VSS/Controls/Notifications");
import Controls = require("VSS/Controls");
import Utils_String = require("VSS/Utils/String");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");

export interface IMovePositionDialogOptions {
    totalTestCases: number;
    moveItemsHandler: (newOrder: number) => void;
}

export class MovePositionDialog extends Dialogs.ModalDialog {

    private _totalTestCases: number;
    private _input: JQuery;
    private _content: JQuery;
    private _errorSection: any;
    private _intRegex;
    private _moveItems: Function;

    constructor(options: IMovePositionDialogOptions) {
        super(options);
        this._totalTestCases = options.totalTestCases;
        this._moveItems = options.moveItemsHandler;
        this._intRegex = /^\d+$/;
    }

    public static movePositionDialogFunc(options: IMovePositionDialogOptions) {
        return Dialogs.show(MovePositionDialog, options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            width: 300,
            resizable: false,
            title: Resources.MoveToPosition
        }, options));
    }

    public initialize() {
        this._setupDialog();

        this._element.append(this._content);

        super.initialize();

        this._setFocusOnFirstInput();

        this.updateOkButton(true);
    }

    public onOkClick() {
        let newPosition = parseInt(this._input.val(), 10);

        // Only an integer position between 1 and the maximum number of elements in the grid is valid
        if (isNaN(newPosition)
            || !this._intRegex.test(this._input.val())
            || newPosition <= 0
            || newPosition > this._totalTestCases) {
            let dialogError = Utils_String.format(Resources.MoveToPositionErrorMessage, this._totalTestCases);
            this._errorSection.setError(dialogError);
            return;
        }

        this._moveItems(newPosition);

        this.close();
    }

    private _setupDialog() {
        let $controlElement: JQuery = this.getElement();

        $controlElement.addClass("move-to-position-dialog");

        this._content = $("<div />").addClass("content");

        // Setup the error pane.
        this._errorSection = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $controlElement);

        let id = Controls.getId();
        let dialogText = Utils_String.format(Resources.MoveToPositionDialogMessage, this._totalTestCases);
        $("<label />").text(dialogText).attr("for", id + "_txt").appendTo(this._content);

        this._input = $("<input />")
            .attr("type", "text")
            .attr("id", id + "_txt")
            .addClass("input-text")
            .css("width", "100%")
            .appendTo(this._content)
            .val("");
    }

    private _setFocusOnFirstInput() {
        $("input:visible:first", this._content).focus();
    }
}
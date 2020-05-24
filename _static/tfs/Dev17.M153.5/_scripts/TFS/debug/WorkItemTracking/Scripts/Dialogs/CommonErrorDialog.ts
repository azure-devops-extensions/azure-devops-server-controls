///<amd-dependency path="jQueryUI/button"/>
///<amd-dependency path="jQueryUI/dialog"/>
///<amd-dependency path="jQueryUI/tabs"/>

/// <reference types="jquery" />

import "VSS/LoaderPlugins/Css!Dialogs/CommonErrorDialog";

import Dialogs = require("VSS/Controls/Dialogs");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");

export interface CommonErrorDialogOptions extends Dialogs.IConfirmationDialogOptions {
    message: string;
}

export class CommonErrorDialog<TOptions extends CommonErrorDialogOptions> extends Dialogs.ConfirmationDialogO<TOptions> {

    private _message: string;

    constructor(options?: any) {
        super($.extend(
            {
                cssClass: "wit-common-error-dialog",
                height: "auto",
                width: 600,
            },
            options));
    }

    public initialize() {
        super.initialize();

        this._message = this._options.message;

        //custom formatting to display error icon
        var $container = $("<table>").addClass("dialog-content");
        var $row = $("<tr>").appendTo($container);
        var $errorIcon = $("<td>").addClass("bowtie-icon bowtie-status-error").appendTo($row);

        $row.append(this._getErrorMessage());

        this.getElement().append($container);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions(options);
    }

    protected _getErrorMessage(): JQuery {

        var $confirmationMessage = $("<td>").addClass("dialog-message").text(this._message);
        $confirmationMessage.append("<br>");

        return $confirmationMessage;
    }

    public static showDialog(title: string, message: string, okCallback?: Function, cancelCallback?: Function): CommonErrorDialog<CommonErrorDialogOptions> {

        var dialogOptions = {
            title: title,
            message: message,
            buttons: []
        };

        if (okCallback) {
            dialogOptions.buttons.push({
                text: VSS_Resources_Platform.ModalDialogOkButton,
                id: VSS_Resources_Platform.ModalDialogOkButton,
                click: function () {
                    okCallback.apply(this);
                    $(this).dialog("close");
                }
            });
        }

        if (cancelCallback) {
            dialogOptions.buttons.push({
                text: VSS_Resources_Platform.ModalDialogCancelButton,
                id: VSS_Resources_Platform.ModalDialogCancelButton,
                click: function () {
                    cancelCallback.apply(this);
                    $(this).dialog("close");
                }
            });
        }

        return Dialogs.show(CommonErrorDialog, dialogOptions);
    }
}

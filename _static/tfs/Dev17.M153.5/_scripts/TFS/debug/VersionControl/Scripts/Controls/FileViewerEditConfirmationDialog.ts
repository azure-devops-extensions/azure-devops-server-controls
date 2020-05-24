import Dialogs = require("VSS/Controls/Dialogs");

export interface FileEditConfirmationDialogOptions extends Dialogs.IConfirmationDialogOptions {
    editWarningHtml?: string;
}

export class FileEditConfirmationDialog extends Dialogs.ConfirmationDialogO<FileEditConfirmationDialogOptions> {

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            width: 500,
            height: "auto",
            initialFocusSelector: "#ok"
        }, options));
    }

    public initialize() {
        this._element.html(this._options.editWarningHtml);
        super.initialize();
    }

    public getDialogResult() {
        return true;
    }
}

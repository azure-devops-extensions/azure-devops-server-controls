import Dialogs = require("VSS/Controls/Dialogs");
import AdminDialogFieldContracts = require("Admin/Scripts/TFS.Admin.Dialogs.FieldContracts");

class DeleteProcessLayoutNodeConfirmationDialog extends Dialogs.ConfirmationDialog {
    public _options: AdminDialogFieldContracts.ConfirmDialogOptions;

    public initializeOptions(options?: AdminDialogFieldContracts.ConfirmDialogOptions): void {
        this._options = options;

        super.initializeOptions($.extend({
            height: "auto",
            minHeight: "auto",
            width: 500,
            minWidth: 500
        }, options));
    }

    public initialize() {
        super.initialize();

        var root = this.getElement();

        var $dialogWarning = $('<table>').appendTo(root);
        var $warnTableRow = $('<tr>').appendTo($dialogWarning);
        var $warnTableImg = $('<td>').appendTo($warnTableRow).addClass("remove-dialog-warning-td");
        $('<span/>').appendTo($warnTableImg).addClass('remove-dialog-warning-icon');
        var $warnTableTxt = $('<td>').appendTo($warnTableRow).addClass("remove-dialog-warning-td");

        if (this._options && this._options.dialogTextStrings) {
            for (var i in this._options.dialogTextStrings) {
                $('<div>').addClass('remove-field-dialog-text').text(this._options.dialogTextStrings[i]).appendTo($warnTableTxt);
            }
        }

        this.updateOkButton(true);
    }

    public onOkClick() {
        this.onClose();
        if (this._options && $.isFunction(this._options.okCallback)) {
            this._options.okCallback();
        }
    }

    /**
     * This exists to ensure the cancel event is only handled within the confirmation dialog context.
     * Without, this dialog will close and then the edit dialog will open on the process/workitems page.
     * The declaration is found in Dialogs.d.ts:ModalDialogO
     */
    public onCancelClick(e: JQueryEventObject) {
        this.onClose();
        if (this._options && $.isFunction(this._options.cancelCallback)) {
            this._options.cancelCallback(e);
        }
    }
}

export = DeleteProcessLayoutNodeConfirmationDialog;
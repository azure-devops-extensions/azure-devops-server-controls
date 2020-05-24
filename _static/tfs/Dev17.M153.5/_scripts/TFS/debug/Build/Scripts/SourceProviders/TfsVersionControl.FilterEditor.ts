import { FilterEditorControl, FilterViewModel } from "Build/Scripts/FilterViewModel";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import AddPathDialog = require("VersionControl/Scripts/Controls/AddPathDialog");
import VCClient = require("VersionControl/Scripts/TFS.VersionControl.ClientServices");

import Dialogs = require("VSS/Controls/Dialogs");
import Utils_Core = require("VSS/Utils/Core");


var delegate = Utils_Core.delegate;

export class TfvcFilterEditorControl extends FilterEditorControl {
    constructor(viewModel: FilterViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();
        this.getElement().prepend("<input type=\"text\" data-bind=\"value: pattern, valueUpdate: 'afterkeydown'\" />");
        var nextColumn = this.getElement().parent();
        var filePathTd = nextColumn.after("<td class='option-link'><button class=\"file-path\">...</button></td>");
        var filePathButton = nextColumn.parent().find("button.file-path");
        filePathButton.bind("click", delegate(this, this.onSourcePickerClick, this.getViewModel().pattern()));
    }

    private onSourcePickerClick(path: string) {
        var viewModel = this.getViewModel();

        this.showPathDialog(viewModel.pattern(),
            (result: ISelectedPathNode) => {
                viewModel.pattern(result.path);
            });
    }

    /**
     * Shows a path picker dialog
     */
    private showPathDialog(initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var dialogModel = new AddPathDialog.AddPathDialogModel();

        // Initialize input model
        dialogModel.inputModel = new AddPathDialog.InputModel();
        dialogModel.inputModel.path(initialValue);

        // set the repository context
        dialogModel.repositoryContext = VCClient.getContext(tfsContext);

        // set the callabck
        dialogModel.okCallback = callback;

        // Show the dialog
        Dialogs.show(AddPathDialog.AddPathDialog, dialogModel);
    }
}

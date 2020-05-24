/// <reference types="jquery" />

import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");

import Dialogs = require("VSS/Controls/Dialogs");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

var delegate = Utils_Core.delegate;

export interface DeleteDefinitionDialogModel {
    name: string;
    isDraft: boolean;
}

// show with ControlsCommon.Dialog.show(DeleteDefinitionDialog, model)
export class DeleteDefinitionDialog extends Dialogs.ModalDialog {
    private _model: DeleteDefinitionDialogModel;
    private _$nameInput: JQuery;

    constructor(model: DeleteDefinitionDialogModel) {
        let title = !!model.isDraft ? BuildResources.ConfirmDeleteDraft : BuildResources.ConfirmDeleteDefinition;
        super($.extend({
            title: Utils_String.format(title, model.name),
            resizable: false,
            useBowtieStyle: true
        }, model));
        this._model = model;
    }

    public initialize() {
        super.initialize();

        var nameId = "definition-delete-name";

        let confirmation = "";
        let warning = "";
        if (this._model.isDraft) {
            confirmation = BuildResources.DeleteDraftConfirmationText;
            warning = Utils_String.format(BuildResources.DeleteDraftDescription, this._model.name);
        }
        else {
            confirmation = BuildResources.DeleteDefinitionConfirmationText;
            warning = Utils_String.format(BuildResources.DeleteDefinitionDescription, this._model.name);
        }

        // ominous warning
        $("<label />")
            .text(warning)
            .addClass("build-pre-wrap-text")
            .appendTo(this.getElement());

        $("<br />").appendTo(this.getElement());

        // confirmation
        $("<label />")
            .text(confirmation)
            .addClass("delete-definition-confirmation-text")
            .appendTo(this.getElement());

        this._$nameInput = $("<input />")
            .attr("id", nameId)
            .attr("type", "text")
            .attr("required", "")
            .attr("aria-label", confirmation)
            .addClass("buildvnext-tab delete-definition-dialog")
            .addClass("delete-definition-no-match")
            .attr("data-bind", "value: name, valueUpdate: 'afterkeydown'")
            .on("keyup", delegate(this, this._onKeyUp))
            .appendTo(this.getElement());
        
        this.setDialogResult(true);

        // ok button should be disabled until the names match
        this.updateOkButton(false);

        // Focus on "Ok" button
        // This uses the same pattern that ModalDialog control uses inside updateOkButton to get the corresponding button
        this.getElement().siblings(".ui-dialog-buttonpane").find("#ok").focus();
    }

    public dispose(): void {
        super.dispose();
    }

    private _onKeyUp() {
        if (this._model.name === this._$nameInput.val()) {
            this._$nameInput.removeClass("delete-definition-no-match");
            this._$nameInput.addClass("delete-definition-match");
            this.updateOkButton(true);
        }
        else {
            this._$nameInput.addClass("delete-definition-no-match");
            this._$nameInput.removeClass("delete-definition-match");
            this.updateOkButton(false);
        }
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Controls.DeleteDefinitionDialog", exports);

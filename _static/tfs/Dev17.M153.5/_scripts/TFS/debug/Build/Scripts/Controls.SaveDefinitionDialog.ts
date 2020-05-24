/// <reference types="jquery" />

import ko = require("knockout");

import Build_Actions = require("Build/Scripts/Actions/Actions");
import BuildDefinitionViewModel = require("Build/Scripts/BuildDefinitionViewModel");
import Build_FolderManageDialog_Component_NO_REQUIRE = require("Build/Scripts/Components/FolderManageDialog");
import Mru = require("Build/Scripts/Mru");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");

import { isDefinitionNameValid, isDefinitionFolderValid } from "Build.Common/Scripts/Validation";

import ComboControls_NO_REQUIRE = require("VSS/Controls/Combos");

import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import Dialogs = require("VSS/Controls/Dialogs");
import VSS = require("VSS/VSS");

import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");

export interface ISaveDefinitionDialogOptions extends Dialogs.IModalDialogOptions {
    showFolderPicker: boolean;
}

export class SaveDefinitionDialogModel implements ISaveDefinitionDialogOptions {
    private _disposalManager: Utils_Core.DisposalManager;


    public name: KnockoutObservable<string>;
    public comment: KnockoutObservable<string>;
    public disableName: boolean = false;
    public folderPath: KnockoutObservable<string>;
    public commentPlaceHolder: string = BuildResources.CommentPlaceHolder;
    public commentLabel: string = BuildResources.CommentLabel;
    public buildPickFolderLabel: string = BuildResources.BuildPickFolderLabel;
    public folderPathDialogTitle: string = BuildResources.SelectFolderPathDialogTitle;

    public nameIsInvalid: KnockoutComputed<boolean>;
    public folderIsInvalid: KnockoutComputed<boolean>;
    public isValid: KnockoutComputed<boolean>;

    public showFolderPicker: boolean = true;

    public folderPathsSource: KnockoutObservableArray<string> = ko.observableArray([]);

    public showFolderDialog: KnockoutObservable<boolean> = ko.observable(false);

    constructor(name: KnockoutObservable<string>, comment: KnockoutObservable<string>, folderPath: KnockoutObservable<string>) {
        this.name = name;
        this.comment = comment;
        this.folderPath = folderPath;

        this.folderPathsSource(Mru.RecentlyUsedFolderPaths.getMRUValue());

        this._disposalManager = new Utils_Core.DisposalManager();

        this._disposalManager.addDisposable(this.folderPath.subscribe((path) => {
            Mru.RecentlyUsedFolderPaths.appendMRUValue(path);
            let source = this.folderPathsSource.peek();
            source.unshift(path);
            source = Utils_Array.unique(source);
            this.folderPathsSource(source);
        }));

        this.nameIsInvalid = ko.computed(() => {
            return !isDefinitionNameValid(this.name());
        });
        this._disposalManager.addDisposable(this.nameIsInvalid);

        this.folderIsInvalid = ko.computed(() => {
            let folder = this.folderPath();

            // allow empty folder; it will default to root
            return folder && !isDefinitionFolderValid(folder);
        });
        this._disposalManager.addDisposable(this.folderIsInvalid);

        this.isValid = ko.computed(() => {
            return !this.nameIsInvalid()
                && !this.folderIsInvalid();
        });
        this._disposalManager.addDisposable(this.isValid);
    }

    public onFolderPickerClick(evt: JQueryEventObject) {
        this.showFolderDialog(true);
    }

    public onFolderManageDialogOkClick(result: Build_FolderManageDialog_Component_NO_REQUIRE.IFolderManageDialogResult) {
        this.folderPath(result.path);
        this.showFolderDialog(false);
    }

    public onFolderManageDialogDismiss() {
        this.showFolderDialog(false);
    }

    public onFolderComboInputChange(combo: ComboControls_NO_REQUIRE.Combo) {
        this.folderPath(combo.getValue<string>());
    }
}

// show with ControlsCommon.Dialog.show(SaveDefinitionDialog, model)
export class SaveDefinitionDialog extends Dialogs.ModalDialog {
    private _model: SaveDefinitionDialogModel;
    private _$nameInput: JQuery;
    private _isValidSubscription: KnockoutDisposable;

    constructor(model: SaveDefinitionDialogModel) {
        let options = <Dialogs.IDialogOptions>{
            title: BuildResources.SaveDefinitionLabel,
            cssClass: "definition-save-dialog",
            useBowtieStyle: true
        };
        super($.extend(options, model));
        this._model = model;
    }

    public initialize() {
        super.initialize();

        let nameId = "definition-save-name";
        let commentId = "definition-save-comment";
        let contentClass = "content";
        let folderPathId = "definition-save-folderPath";

        let element = this.getElement();

        // name
        this._$nameInput = $("<input />")
            .attr("id", nameId)
            .attr("type", "text")
            .attr("placeholder", "Enter a name")
            .addClass("buildvnext-tab save-definition-dialog")
            .attr("data-bind", "value: name, valueUpdate: 'afterkeydown', css: { 'invalid': nameIsInvalid }")
            .attr("autofocus", "true")
            .appendTo(element);

        if (this._model.disableName) {
            this._$nameInput.prop('disabled', true);
        }

        $("<div />")
            .addClass(contentClass)
            .append(
            $("<label />")
                .attr("for", nameId)
                .text(BuildResources.NameLabel),
            this._$nameInput
            ).appendTo(element);

        // comment
        $("<div />")
            .addClass(contentClass)
            .append(
            $("<label />")
                .attr("for", commentId)
                .text(this._model.commentLabel),
            $("<textarea />")
                .attr("id", commentId)
                .attr("rows", "3")
                .attr("placeholder", this._model.commentPlaceHolder)
                .addClass("buildvnext-tab save-definition-dialog")
                .attr("data-bind", "value: comment, valueUpdate: 'afterkeydown'")
            ).appendTo(element);

        if (this._model.showFolderPicker && FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.BuildAllDefinitionsTab, false)) {
            // folder path
            $("<div />")
                .addClass(contentClass)
                .append(
                $("<label />")
                    .attr("for", commentId)
                    .text(BuildResources.BuildSelectFolderLabel),
                $("<div data-bind=\"createFolderManageReactComponent: { 'showDialog': showFolderDialog(), 'title': folderPathDialogTitle, 'showDialogActions': false, 'refreshIfNotInitialized': true, 'okManageDialogCallBack': onFolderManageDialogOkClick.bind($data), 'onManageDialogDissmiss': onFolderManageDialogDismiss.bind($data) }\" ></div>"),
                $("<div class='folder'><div class='folder-input' data-bind=\"createComboControl: { 'options': { 'change': onFolderComboInputChange.bind($data), 'source': folderPathsSource() }, 'observable': folderPath, 'invalid': folderIsInvalid }\"></div><button class='folder-path' data-bind=\"click: onFolderPickerClick, text: buildPickFolderLabel\"></button></div>")
                ).appendTo(element);
        }

        ko.applyBindings(this._model, element[0]);

        this._isValidSubscription = this._model.isValid.subscribe((newValue: boolean) => {
            this.updateOkButton(newValue);
        });

        this.updateOkButton(this._model.isValid());
        this.setDialogResult(true);
        // Focus on "Ok" button, so that common scenario - ctrl+s and enter - just works
        // This uses the same pattern that ModalDialog control uses inside updateOkButton to get the corresponding button
        element.siblings(".ui-dialog-buttonpane").find("#ok").focus();
    }

    public dispose(): void {
        if (this._isValidSubscription) {
            this._isValidSubscription.dispose();
        }

        ko.cleanNode(this.getElement()[0]);
        super.dispose();
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Controls.SaveDefinitionDialog", exports);

import Controls = require("VSS/Controls");
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import Menus = require("VSS/Controls/Menus");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_String = require("VSS/Utils/String");
import VSS_Telemetry = require("VSS/Telemetry/Services");

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCFileViewer = require("VersionControl/Scripts/Controls/FileViewer");

import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export class FileViewerEditPanel extends Controls.BaseControl {

    public static EVENT_COMMIT_CLICKED: string = "commit-clicked";
    public static EVENT_COMMIT_TO_NEW_BRANCH_CLICKED: string = "commit-to-new-branch-clicked";
    public static EVENT_DISCARD_CLICKED: string = "discard-clicked";

    private _item: VCLegacyContracts.ItemModel;
    private _editSettings: VCFileViewer.FileEditSettings;
    private _isGitRepository: boolean;

    private _isVisible: boolean;
    private _isInputEnabled: boolean;
    private _isDirty: boolean;
    private _isRendered: boolean;
    private _defaultMessage: string;

    private _actionsToolbar: Menus.MenuBar;
    private _$commitMessage: JQuery;
    private _$commitMessageDescription: JQuery;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this.hideElement();
        this._isDirty = false;
        this._isInputEnabled = true;
    }

    public update(item: VCLegacyContracts.ItemModel, isGitRepository: boolean, editSettings?: VCFileViewer.FileEditSettings) {
        this._item = item;
        this._isGitRepository = isGitRepository;
        this._editSettings = editSettings;
        this._isDirty = false;

        this.commitMessage(this.getDefaultCommitMessage());

        if (this._isRendered) {
            this.enableInput();
            this._toggleExtendedMessage(false);
            this._styleForCommitOptions();
        }
    }

    public isVisible(): boolean {
        return this._isVisible;
    }

    public isDirty(value?: boolean): boolean {
        if (value !== undefined && value !== null && value !== this._isDirty) {
            this._isDirty = value;
            this._updateToolbar();
        }
        return this._isDirty;
    }

    public commitMessage(message?: string): string {
        if (message !== undefined) {
            message = message || "";
            this._defaultMessage = message;
            if (this._$commitMessage) {
                this._$commitMessage.val(message);
                this._$commitMessageDescription.val("");
            }
            return message;
        }
        else {
            // Return the concatenation of the short commit message and the extended description message, with a new line between.
            // If not rendered, or empty, then return the default message.
            let fullMessage: string;
            if (this._$commitMessage) {
                fullMessage = this._$commitMessage.val().trim();
                if (this._$commitMessageDescription.val().trim()) {
                    fullMessage = fullMessage ? fullMessage + Utils_String.lineFeed + this._$commitMessageDescription.val().trim() : this._$commitMessageDescription.val().trim();
                }
            }
            if (!fullMessage) {
                fullMessage = this._defaultMessage;
            }
            return fullMessage;
        }
    }

    public getDefaultCommitMessage(): string {
        let message;
        if (this._item && this._item.serverItem) {
            let fileName = VersionControlPath.getFileName(this._item.serverItem);
            if (this._editSettings && this._editSettings.newFile) {
                message = Utils_String.format(VCResources.FileViewerDefaultCommitMessageForAdd, fileName);
            }
            else {
                message = Utils_String.format(VCResources.FileViewerDefaultCommitMessage, fileName);
            }
        }
        return message || "";
    }

    private _render() {

        let $container = $(domElem("div"));

        let tfsContext = this._options.tfsContext || {};
        let id = (tfsContext && tfsContext.currentIdentity) ? tfsContext.currentIdentity.id : undefined;
        IdentityImage.identityImageElement(tfsContext, id, null, null).addClass("identity-image").appendTo($container);

        // When the commit message area loses focus, then hide the extended description area.
        let $messageArea = $(domElem("div")).addClass("commit-message-area");

        // If the user clicks the Enter key while in the _$commitMessage box, then put the focus on the extended commit description box.
        this._$commitMessage = $(domElem("input")).addClass("commit-message").val(this._defaultMessage).appendTo($messageArea);
        this._addMessageFocusBindings(this._$commitMessage);
        this._bind(this._$commitMessage, "keydown", (e: JQueryKeyEventObject) => {
            let key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;
            if (key === 13) {
                this._toggleExtendedMessage(true);
                this._$commitMessageDescription.focus();
                return false;
            }
        });

        this._$commitMessageDescription = $(domElem("textarea")).addClass("commit-message-description").attr("placeholder", VCResources.EditFileExtendedCommitMessageWatermark).appendTo($messageArea);
        this._addMessageFocusBindings(this._$commitMessageDescription);
        this._$commitMessageDescription.hide();

        $(domElem("span")).addClass("icon").addClass("icon-vc-comment-arrow-left-white").addClass("commit-message-bubble").appendTo($messageArea);
        let $dropIcon = $(domElem("span")).addClass("icon").addClass("bowtie-icon bowtie-triangle-down").addClass("commit-message-drop").appendTo($messageArea);
        this._bind($dropIcon, "mousedown", () => {
            this.delayExecute(null, 10, true, () => {
                this.cancelDelayedFunction("hideExtendedMessage");
            });
        });
        this._bind($dropIcon, "mouseup", () => {
            let isVisible = this._$commitMessageDescription.is(":visible");
            if (isVisible) {
                this._$commitMessage.focus();
                this._toggleExtendedMessage();
            }
            else {
                this._toggleExtendedMessage()
                this._$commitMessageDescription.focus();
            }
        });
        $messageArea.appendTo($container);

        this._actionsToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $container, {
            cssClass: "edit-file-actions-menu",
            items: []
        });

        this._updateToolbar();
        this._styleForCommitOptions()
        $container.appendTo(this._element);
        this._isRendered = true;
    }

    // We only show commit options (ex: commit to a new branch) when explicity set and only for Git (Tfvc REST API's currently do not support creating a shelveset).
    private _allowCommitOptions(): boolean {
        return !!(this._editSettings && this._editSettings.allowBranchCreation && this._isGitRepository);
    }

    private _styleForCommitOptions() {
        this._element.toggleClass("commit-options", this._allowCommitOptions());
    }

    // Adds the focus bindings such that the extended commit message is hidden if we're not focused on a commit message item.
    private _addMessageFocusBindings($messageElement: JQuery) {
        this._bind($messageElement, "blur", (e: JQueryEventObject) => {
            this.delayExecute("hideExtendedMessage", 100, true, () => {
                this._toggleExtendedMessage(false);
            });
        });
        this._bind($messageElement, "focus", (e: JQueryEventObject) => {
            this.delayExecute(null, 10, true, () => {
                this.cancelDelayedFunction("hideExtendedMessage")
            });
            if (this._$commitMessageDescription.val()) {
                this._toggleExtendedMessage(true);
            }
        });
    }

    public toggleVisibility(show?: boolean): boolean {
        /// <summary>Toggle between displaying and hiding the file edit panel</summary>
        /// <param name="show" type="boolean" optional="true">True to show, false to hide, undefined to flip the state.</param>
        let priorVisibleState = this._isVisible;

        if (show === undefined) {
            show = !this._isVisible;
        }

        this._isVisible = show;

        if (show) {
            if (!this._isRendered) {
                this._render();
            }
            this.showElement();
            VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_EDIT_ON_FEATURE, {
                "FileExtension": VersionControlPath.getFileExtension(this._item.serverItem)
            }));
        }
        else {
            this.hideElement();
        }

        return this._isVisible;
    }

    public disableInput() {
        this._isInputEnabled = false;
        this._updateToolbar();
        this._$commitMessage.attr("disabled", "disabled");
        this._$commitMessageDescription.attr("disabled", "disabled");
    }

    public enableInput() {
        this._isInputEnabled = true;
        this._updateToolbar();
        this._$commitMessage.removeAttr("disabled");
        this._$commitMessageDescription.removeAttr("disabled");
    }

    private _onCommitClick(): void {
        this._fire(FileViewerEditPanel.EVENT_COMMIT_CLICKED, { message: this.commitMessage() });
    }

    private _onCommitToNewBranchClick(): void {
        this._fire(FileViewerEditPanel.EVENT_COMMIT_TO_NEW_BRANCH_CLICKED, { message: this.commitMessage() });
    }

    private _onRevertClick(): void {
        this._fire(FileViewerEditPanel.EVENT_DISCARD_CLICKED);
    }

    private _updateToolbar() {
        let newFile = this._editSettings && this._editSettings.newFile;
        let menuItems: any[] = [];
        let commitmenuItems: any[] = [];
        let saveText = this._isGitRepository ? VCResources.EditFileCommit : VCResources.EditFileCheckin;

        let commitButton = <Menus.IMenuItemSpec> {
            id: "commit-file-changes",
            title: saveText,
            icon: "bowtie-icon bowtie-save",
            showText: false,
            disabled: !this._isInputEnabled || !(this.isDirty() || newFile),
            action: () => {
                this._onCommitClick();
            }
        }
        menuItems.push(commitButton);

        if (this._allowCommitOptions()) {
            commitmenuItems.push({
                id: "commit-file-changes-default",
                text: saveText,
                title: saveText,
                icon: "bowtie-icon bowtie-save",
                showText: true,
                disabled: !this._isInputEnabled || !(this.isDirty() || newFile),
                action: () => {
                    this._onCommitClick();
                }
            });
            commitmenuItems.push({
                id: "commit-file-changes-new-branch",
                text: this._isGitRepository ? VCResources.EditFileCommitToNewBranch : VCResources.EditFileCheckinToShelveset,
                title: this._isGitRepository ? VCResources.EditFileCommitToNewBranchTitle : VCResources.EditFileCheckinToShelvesetTitle,
                icon: "bowtie-icon bowtie-tfvc-branch",
                showText: true,
                disabled: !this._isInputEnabled || !(this.isDirty() || newFile),
                action: () => {
                    this._onCommitToNewBranchClick();
                }
            });

            $.extend(commitButton, {
                childItems: commitmenuItems,
                splitDropOptions: {
                    // SplitDrop options - separates the drop icon and behavior into a separate, split menu item.
                    id: "commit-file-changes-splitdrop",
                    title: Utils_String.format(VCResources.EditFileSaveDropTitle, saveText)
                },
            });
        }

        menuItems.push({
            id: "discard-file-changes",
            title: this.isDirty() ? VCResources.EditFileDiscard : VCResources.EditFileCancel,
            icon: newFile ? "bowtie-icon bowtie-edit-remove" : (this.isDirty() ? "bowtie-icon bowtie-edit-undo " : "bowtie-icon bowtie-math-multiply"),
            showText: false,
            disabled: !this._isInputEnabled,
            action: () => {
                this._onRevertClick();
            }
        });

        this._actionsToolbar.updateItems(menuItems);
    }

    // Toggle the visibility of the extended commit message.  This also applies the relevant style changes.
    private _toggleExtendedMessage(show?: boolean) {
        if (!this._isRendered) {
            return;
        }

        let priorVisibleState = this._$commitMessageDescription.is(':visible');
        if (show === undefined) {
            show = !priorVisibleState;
        }

        if (show !== priorVisibleState) {
            this._$commitMessageDescription.toggle(show);
            if (show || this._$commitMessageDescription.val()) {
                this._$commitMessage.addClass("extended-message");
            }
            else {
                this._$commitMessage.removeClass("extended-message");
            }
        }
    }
}

VSS.classExtend(FileViewerEditPanel, TfsContext.ControlExtensions);

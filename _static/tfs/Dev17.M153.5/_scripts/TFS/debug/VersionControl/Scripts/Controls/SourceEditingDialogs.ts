/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Controls = require("VSS/Controls");
import CoreDialogs = require("VSS/Controls/Dialogs");
import FileInput = require("VSS/Controls/FileInput");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_File = require("VSS/Utils/File");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

import VCContracts = require("TFS/VersionControl/Contracts");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {GitClientService} from "VersionControl/Scripts/GitClientService";
import {TfvcClientService} from "VersionControl/Scripts/TfvcClientService";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCSourceEditing = require("VersionControl/Scripts/Controls/SourceEditing");
import VCSourceEditingEvents = require("VersionControl/Scripts/Controls/SourceEditingEvents");
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import VCModalDialog = require("VersionControl/Scripts/Controls/VersionControlModalDialog");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

import * as _DocumentConstants from "Presentation/Scripts/TFS/TFS.Welcome.Documents";
import * as _DefaultContentProvider from "VersionControl/Scripts/TFS.VersionControl.FileDefaultContentProvider";

import domElem = Utils_UI.domElem;

interface DialogBaseOptions extends CoreDialogs.IModalDialogOptions {
    repositoryContext?: RepositoryContext;
    itemPath?: string;
    itemVersion?: string;
    initialDrop?: DataTransfer;
    hideUpload?: boolean;
    hideNewFile?: boolean;
    itemIsFolder?: boolean;
}

/**
* Dialog for handling delete file/folder
*/
class DialogBase extends VCModalDialog.VersionControlModalDialog<DialogBaseOptions> {

    public _repositoryContext: RepositoryContext;
    public _itemPath: string;
    public _itemVersion: string;
    public _isGitRepository: boolean;

    private _$fileNameInput: JQuery;
    private _$errorMessage: JQuery;
    private _invalidCharacters: string[] = ["/", "\\", ":", "<", ">", "*"];
    private _$commentInputBox: JQuery;

    public initialize() {
        super.initialize();

        this._repositoryContext = this._options.repositoryContext;
        this._itemPath = this._options.itemPath;
        this._itemVersion = this._options.itemVersion;
        this._isGitRepository = this._repositoryContext.getRepositoryType() === RepositoryType.Git;
    }

    public _addCommentBox(defaultComment: string, selectAndFocus: boolean, $container: JQuery): JQuery {

        const inputId = "comment" + Controls.getId();

        const $commentDiv = $(domElem("div", "form-section")).appendTo($container);

        $(domElem("label"))
            .attr("for", inputId)
            .text(this._isGitRepository ? VCResources.CommitComment : VCResources.CheckinComment)
            .appendTo($commentDiv);

        this._$commentInputBox = $(domElem("textarea", "comment-input"))
            .attr("id", inputId)
            .val(defaultComment || "")
            .appendTo($commentDiv)
            .bind("input keyup", () => {
                this.updateOkButton(this._hasCompleteInputs());
            });

        if (selectAndFocus) {
            this._$commentInputBox.select();
            this._$commentInputBox.focus();
        }

        return this._$commentInputBox;
    }

    public _getCommentText() {
        if (this._$commentInputBox) {
            return $.trim(this._$commentInputBox.val());
        }
        else {
            return "";
        }
    }

    public _setCommentText(comment: string) {
        if (this._$commentInputBox) {
            this._$commentInputBox.val(comment);
        }
    }

    public _hasCompleteInputs() {
        if (this._$commentInputBox) {
            return !!this._getCommentText();
        }
        else {
            return true;
        }
    }

    public _handleError(error: Error) {
        const messageFormat = this._isGitRepository ? VCResources.CommitFailedMessageFormat : VCResources.CheckinFailedMessageFormat;
        alert(Utils_String.format(messageFormat, error.message));
        this.updateOkButton(this._hasCompleteInputs());
    }

    protected addFileNameInput($container: JQuery, inputId: string): JQuery {

        this._$fileNameInput = $(domElem("input", "file-name-input"))
            .attr("type", "text")
            .attr("id", inputId)
            .appendTo($container)
            .bind("blur", () => {
                this._$errorMessage.hide();
            })
            .bind("focus", () => {
                if (this._$fileNameInput.hasClass("invalid")) {
                    this._$errorMessage.show();
                }
            });

        // Add error for invalid input
        this._$errorMessage = $(domElem("div", "input-error-tip"))
            .hide()
            .text("")
            .appendTo($container);

        return this._$fileNameInput;
    }

    protected getFileNameInputText(): string {
        if (this._$fileNameInput) {
            return this._$fileNameInput.val();
        }
        else {
            return "";
        }
    }
    
    protected showFileNameInputError(showError: boolean) {
        // Don't show an error on empty file name
        const currentFileName = this._$fileNameInput.val().trim();
        if (currentFileName && showError) {
            this._$fileNameInput.addClass("invalid");
            this._$errorMessage.text(Utils_String.format(VCResources.InvalidFileName, this._$fileNameInput.val().trim()));
            this._$errorMessage.show();
        }
        else {
            this._$fileNameInput.removeClass("invalid");
            this._$errorMessage.hide();
        }
    }

    protected isValidFileNameInput(): boolean {
        const currentFileName = this._$fileNameInput.val().trim();
        if (!currentFileName) {
            return false;
        }

        let validInput: boolean = true;
        this._invalidCharacters.forEach((value: string) => {
            if (currentFileName.indexOf(value) >= 0) {
                validInput = false;
                return;
            }
        });
        return validInput;
    }
}

/**
* Dialog for handling add new file(s) to an existing folder
*/
class AddFilesToFolderDialog extends DialogBase {

    private _fileInputControl: FileInput.FileInputControl;
    private _$newFileRadioButton: JQuery;
    private _$newFilePane: JQuery;
    private _$uploadFilesRadioButton: JQuery;
    private _$uploadFilesPane: JQuery;
    private _userEditedComment: boolean;
    private _existingFileNameVersions: { [fileNameLower: string]: number };

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "vc-new-item-dialog vc-editing-dialog"
        }, options));
    }

    public initialize() {
        super.initialize();

        const allowUpload = FileInput.FileInputControl.isSupported() && !this._options.hideUpload;
        const showNewFilePane = !allowUpload || !this._options.hideNewFile;
        const selectUploadPane = allowUpload && Boolean(this._options.initialDrop);
        let controlInitialized = false;

        if (showNewFilePane && allowUpload) {
            this._element.addClass("multi-mode-enabled");
        }

        this._repositoryContext.getClient().beginGetItem(this._repositoryContext, this._itemPath, this._itemVersion, <VCLegacyContracts.ItemDetailsOptions>{
            recursionLevel: VCLegacyContracts.VersionControlRecursionType.OneLevel
        }, (item: VCLegacyContracts.ItemModel) => {
                
            // Store the child items and build a hash of file name keys
            this._existingFileNameVersions = {};
            $.each(item.childItems || [], (i: number, item: VCLegacyContracts.ItemModel) => {
                this._existingFileNameVersions[VersionControlPath.getFileName(item.serverItem).toLowerCase()] = (<VCLegacyContracts.TfsItem>item).changeset || 1;
            });

            if (!this._userEditedComment) {
                this._setCommentText(this.getDefaultComment());
            }

            this._decorateInputFiles();
            this.updateOkButton(this._hasCompleteInputs());
        }, (error: any) => {
            this.showError(error);
        });

        //
        // Create the "new file" pane which collects the filename for a new file
        //
        if (showNewFilePane) {

            if (allowUpload) {
                const $createAndEditDiv = $(domElem("div", "form-section")).appendTo(this._element);
                const $createAndEditPair = $(domElem("div", "radio-pair")).appendTo($createAndEditDiv);

                const controlId = "newFile" + Controls.getId();
                this._$newFileRadioButton = $(domElem("input"))
                    .attr("type", "radio")
                    .attr("id", controlId)
                    .attr("name", controlId)
                    .prop("checked", !selectUploadPane)
                    .appendTo($createAndEditPair);
                $(domElem("label"))
                    .attr("for", controlId)
                    .text(VCResources.AddFileDialogNewItemLabel)
                    .appendTo($createAndEditPair);
            }

            this._$newFilePane = $(domElem("div", "new-file-pane selected-pane form-section")).appendTo(this._element);
            if (allowUpload) {
                this._$newFilePane.bind("click", () => {
                    if (this._$newFileRadioButton) {
                        this._handlePaneToggled(false);
                    }
                });
            }

            const inputId = "fileName" + Controls.getId();
            $(domElem("label"))
                .attr("for", inputId)
                .text(VCResources.AddFileDialogFilenameLabel)
                .appendTo($(domElem("div", "file-name-label")).appendTo(this._$newFilePane));

            const $fileNameInput = this.addFileNameInput(this._$newFilePane, inputId);
            $fileNameInput.bind("input keyup", () => {
                this.showFileNameInputError(!this.isValidFileNameInput());
                this.updateOkButton(this._hasCompleteInputs());
            });

            if (!selectUploadPane) {
                $fileNameInput.focus();
            }

            if (this._$newFileRadioButton) {
                this._$newFileRadioButton.change((e: JQueryEventObject) => {
                    const isChecked = this._$newFileRadioButton.prop("checked") ? true : false;
                    this._handlePaneToggled(!isChecked);
                });
            }
        }

        //
        // Create the "upload file(s)" pane which allows uploading existing files
        //
        if (allowUpload) {

            if (showNewFilePane) {
                const $uploadFilesDiv = $(domElem("div", "form-section")).appendTo(this._element);
                const $uploadFilesPair = $(domElem("div", "radio-pair")).appendTo($uploadFilesDiv);

                const controlId = "uploadFiles" + Controls.getId();
                this._$uploadFilesRadioButton = $(domElem("input"))
                    .attr("type", "radio")
                    .attr("id", controlId)
                    .attr("name", controlId)
                    .prop("checked", !!selectUploadPane)
                    .appendTo($uploadFilesPair);
                $(domElem("label"))
                    .attr("for", controlId)
                    .text(VCResources.AddFileDialogUploadFilesLabel)
                    .appendTo($uploadFilesPair);
            }

            this._$uploadFilesPane = $(domElem("div", "upload-files-pane form-section")).appendTo(this._element);
            if (showNewFilePane) {
                this._$uploadFilesPane.bind("click", () => {
                    if (this._$uploadFilesRadioButton) {
                        this._handlePaneToggled(true);
                    }
                });
            }

            const isTfvc = this._repositoryContext.getRepositoryType() === RepositoryType.Tfvc;
            const isGit = this._repositoryContext.getRepositoryType() === RepositoryType.Git;

            this._fileInputControl = FileInput.FileInputControl.createControl($(domElem("div", "form-section")).appendTo(this._$uploadFilesPane), {
                initialDrop: this._options.initialDrop,
                maximumTotalFileSize: VCSourceEditing.Constants.MAX_EDIT_FROM_WEB_CONTENT_SIZE,
                detectEncoding: isTfvc,
                fileNamesCaseSensitive: isGit,
                updateHandler: (updateEvent: FileInput.FileInputControlUpdateEventData) => {
                    if (controlInitialized) {
                        if (!this._userEditedComment) {
                            this._setCommentText(this.getDefaultComment());
                        }
                        if (this._$uploadFilesRadioButton) {
                            this._handlePaneToggled(true);
                        }
                        this._decorateInputFiles();
                        this.updateOkButton(this._hasCompleteInputs());
                    }
                },
                limitMessageFormatter: (errorText: string, limitEvent: FileInput.FileInputControlLimitEventData) => {
                    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                        CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                        CustomerIntelligenceConstants.SOURCEEDITING_UPLOAD_LIMIT,
                        $.extend({}, limitEvent, { isGit, isTfvc })));

                    return errorText + (isGit ? VCResources.WebEditLimitWorkaroundGit : VCResources.WebEditLimitWorkaroundTfvc);
                }
            });

            this._addCommentBox(this.getDefaultComment(), !showNewFilePane || selectUploadPane, this._$uploadFilesPane)
                .bind("input keyup", () => {
                    this._userEditedComment = this._getCommentText() !== this.getDefaultComment();
                });

            if (this._$uploadFilesRadioButton) {
                this._$uploadFilesRadioButton.change((e: JQueryEventObject) => {
                    const isChecked = this._$uploadFilesRadioButton.prop("checked") ? true : false;
                    this._handlePaneToggled(isChecked);
                });
            }
        }

        controlInitialized = true;
        this.updateOkButton(this._hasCompleteInputs());
    }

    public _hasCompleteInputs() {

        if (!super._hasCompleteInputs()) {
            return false;
        }

        if (!this._existingFileNameVersions) {
            return false;
        }

        if (this.isUploadFilesMode()) {
            // Upload files mode: must have at least one file selected
            if (this._fileInputControl.isLoadInProgress() || this._fileInputControl.getFiles().length === 0) {
                return false;
            }
        }
        else {
            // New file mode: must have a valid filename
            if (!this.isValidFileNameInput()) {
                return false;
            }
        }

        return true;
    }

    public onOkClick(e?: JQueryEventObject): any {
        if (this.isUploadFilesMode()) {
            //Only allow OK button to be clicked once for uploads 
            this.updateOkButton(false);

            const files = this._fileInputControl.getFiles();
            const comment = this._getCommentText();
            Actions.updateFilesInFolder(this._repositoryContext, this._itemPath, files, this._existingFileNameVersions, VCSpecs.VersionSpec.parse(this._itemVersion), comment).done((newVersion: VCSpecs.VersionSpec) => {
                const result: AddNewFilesResult = {
                    newFilePaths: files.map(file => VersionControlPath.combinePaths(this._itemPath, file.name)),
                    newVersion,
                    comment,
                };

                this.setDialogResult(result);
                super.onOkClick(e);
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_FILE_UPLOAD_COMMIT_FEATURE, {
                    "FileCount": files.length
                }));
            }).fail((e: Error) => {
                this._handleError(e);
            });
        }
        else {
            const newFilename = this.getFileNameInputText().trim();

            const errorMessage = VersionControlPath.validateFilename(newFilename, this._itemPath, this._repositoryContext.getRepositoryType());
            if (errorMessage) {
                this._handleError(new Error(errorMessage));
                return;
            }

            const newItemPath = VersionControlPath.combinePaths(this._itemPath, newFilename);

            this.updateOkButton(false);

            // Make sure the item doesn't already exist
            this._repositoryContext.getClient().beginGetItem(
                this._repositoryContext,
                newItemPath,
                this._itemVersion,
                null,
                (item: VCLegacyContracts.ItemModel) => {
                    this._handleError(new Error(Utils_String.format(VCResources.AddFileDialogAlreadyExistsErrorFormat, newItemPath)));
                },
                (error: Error) => {
                    const result: AddNewFilesResult = { newFilePaths: [newItemPath] };
                    this.setDialogResult(result);
                    super.onOkClick(e);
                });
        }
    }

    private _handlePaneToggled(uploadMode: boolean) {

        this._$newFilePane.toggleClass("selected-pane", !uploadMode);
        this._$uploadFilesPane.toggleClass("selected-pane", uploadMode);

        this._$newFileRadioButton.prop("checked", !uploadMode);
        this._$uploadFilesRadioButton.prop("checked", uploadMode);

        this.updateOkButton(this._hasCompleteInputs());
    }

    private isUploadFilesMode(): boolean {
        if (this._fileInputControl) {
            if (this._$uploadFilesRadioButton) {
                return this._$uploadFilesRadioButton.prop("checked") ? true : false;
            }
            else {
                return true;
            }
        }
        else {
            return false;
        }
    }

    private getDefaultComment(): string {
        if (!this._fileInputControl || this._fileInputControl.getFiles().length === 0) {
            return VCResources.AddFileDialogDefaultComment;
        }
        else {
            const files = this._fileInputControl.getFiles();
            let editCount = 0;

            if (this._existingFileNameVersions) {
                for (let i = 0, l = files.length; i < l; i++) {
                    if (this._existingFileNameVersions[files[i].name.toLowerCase()]) {
                        editCount++;
                    }
                }
            }

            if (files.length == 1) {
                if (editCount > 0) {
                    return Utils_String.format(VCResources.AddFileDialogDefaultCommentSingleFileWithEdit, files[0].name);
                }
                else {
                    return Utils_String.format(VCResources.AddFileDialogDefaultCommentSingleFile, files[0].name);
                }
            }
            else {
                const parentFolderName = VersionControlPath.getFileName(this._itemPath) || this._repositoryContext.getRootPath();
                if (editCount > 0 && editCount < files.length) {
                    return Utils_String.format(VCResources.AddFileDialogDefaultCommentMultipleFilesWithAddsAndEdits, files.length, parentFolderName);
                }
                else if (editCount > 0) {
                    return Utils_String.format(VCResources.AddFileDialogDefaultCommentMultipleFilesWithEdits, files.length, parentFolderName);
                }
                else {
                    return Utils_String.format(VCResources.AddFileDialogDefaultCommentMultipleFiles, files.length, parentFolderName);
                }
            }
        }
    }

    private _decorateInputFiles() {
        if (this._existingFileNameVersions && this._fileInputControl) {
            const rows = this._fileInputControl.getRows();

            if (rows.length > 0) {
                for (let i = 0, l = rows.length; i < l; i++) {
                    const row = rows[i];
                    if (this._existingFileNameVersions[row.result.name.toLowerCase()]) {
                        row.$fileNameElement.text(Utils_String.format(VCResources.AddFileDialogReplaceFileFormat, row.result.name));
                    }
                    else {
                        row.$fileNameElement.text(Utils_String.format(VCResources.AddFileDialogNewFileFormat, row.result.name));
                    }
                }
            }
        }
    }
}

/**
* Dialog for handling rename file/folder
*/
class RenameItemDialog extends DialogBase {

    private _itemIsFolder: boolean;
    private _parentFolder: string;
    private _defaultComment: string;
    private _userEditedComment: boolean;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "vc-rename-item-dialog vc-editing-dialog"
        }, options));
    }

    public initialize() {
        super.initialize();

        this._itemIsFolder = this._options.itemIsFolder;
        this._parentFolder = VersionControlPath.getContainingFolder(this._itemPath, this._repositoryContext.getRootPath());

        const fileName = VersionControlPath.getFileName(this._itemPath);
        const fileExtension = VersionControlPath.getFileExtension(fileName);

        const inputId = "fileName" + Controls.getId();

        const $fileNameDiv = $(domElem("div", "form-section")).appendTo(this._element);
        $(domElem("label"))
            .attr("for", inputId)
            .text(this._itemIsFolder ? VCResources.RenameDialogFoldernameLabel : VCResources.RenameDialogFilenameLabel)
            .appendTo($fileNameDiv);

        const $fileNameInput = this.addFileNameInput($fileNameDiv, inputId);
        $fileNameInput.val(fileName || "")
            .bind("input keyup", () => {
                if (!this._userEditedComment) {
                    this._defaultComment = Utils_String.format(VCResources.DefaultRenameCommentFormatFromTo, fileName, this.getFileNameInputText().trim());
                    this._setCommentText(this._defaultComment);
                }
                    this.showFileNameInputError(!this.isValidFileNameInput());
                    this.updateOkButton(this._hasCompleteInputs());
            });

        if (fileExtension) {
            Utils_UI.SelectionUtils.selectInputText($fileNameInput, 0, fileName.length - fileExtension.length - 1, true);
        }
        else {
            Utils_UI.SelectionUtils.selectInputText($fileNameInput, 0, fileName.length, true);
        }

        this._defaultComment = Utils_String.format(VCResources.DefaultRenameCommentFormat, fileName);
        this._addCommentBox(this._defaultComment, false, this._element)
            .bind("input keyup", () => {
                if (this._getCommentText() !== this._defaultComment) {
                    this._userEditedComment = true;
                }
            });

        this.updateOkButton(this._hasCompleteInputs());
    }

    protected showFileNameInputError(showError: boolean) {
        const currentFileName = this.getFileNameInputText().trim();
        const fileName = VersionControlPath.getFileName(this._itemPath);
        if (fileName === currentFileName) {
            showError = false;
        }
        super.showFileNameInputError(showError);
    }

    public _hasCompleteInputs() {

        if (!super._hasCompleteInputs()) {
            return false;
        }

        if (!this.isValidFileNameInput()) {
            return false;
        }

        return true;
    }

    protected isValidFileNameInput() {
        const currentFileName = this.getFileNameInputText().trim();
        if (!super.isValidFileNameInput() || currentFileName === VersionControlPath.getFileName(this._itemPath)) {
            // Unchanged file name is not allowed
            return false;
        }

        return true;
    }

    public onOkClick(e?: JQueryEventObject): any {

        const newFilename = this.getFileNameInputText().trim();

        const errorMessage = VersionControlPath.validateFilename(newFilename, this._parentFolder, this._repositoryContext.getRepositoryType());
        if (errorMessage) {
            this._handleError(new Error(errorMessage));
            return;
        }

        this.updateOkButton(false);

        const newItemPath = VersionControlPath.combinePaths(this._parentFolder, newFilename);

        // Make sure the item doesn't already exist
        this._repositoryContext.getClient().beginGetItem(this._repositoryContext, newItemPath, this._itemVersion, null,
            (item: VCLegacyContracts.ItemModel) => {
                this._handleError(new Error(Utils_String.format(VCResources.AddFileDialogAlreadyExistsErrorFormat, newItemPath)));
            },
            (error: Error) => {
                const comment = this._getCommentText();
                Actions.renameItem(this._repositoryContext, this._itemPath, this._itemVersion, newItemPath, comment)
                    .done((newVersion: VCSpecs.VersionSpec) => {
                        this.setDialogResult({ newVersion, comment, newItemPath });
                        super.onOkClick(e);
                        Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_FILE_RENAME_COMMIT_FEATURE, {
                            "FileExtension": VersionControlPath.getFileExtension(newItemPath)
                        }));
                    })
                    .fail((e: Error) => {
                        this._handleError(e);
                    });
            });
    }
}

/**
* Dialog for handling delete file/folder
*/
class DeleteItemDialog extends DialogBase {

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "vc-delete-item-dialog vc-editing-dialog"
        }, options));
    }

    public initialize() {
        super.initialize();

        const defaultComment = Utils_String.format(VCResources.DefaultDeleteCommentFormat, this._itemPath);
        this._addCommentBox(defaultComment, true, this._element);

        this.updateOkButton(true);
    }

    public onOkClick(e?: JQueryEventObject): any {

        this.updateOkButton(false);

        const comment = this._getCommentText();
        Actions.deleteItem(this._repositoryContext, this._itemPath, this._itemVersion, comment)
            .done((newVersion: VCSpecs.VersionSpec) => {
                this.setDialogResult({ newVersion, comment });
                super.onOkClick(e);
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_FILE_DELETE_COMMIT_FEATURE, {
                    "FileExtension": VersionControlPath.getFileExtension(this._itemPath)
                }));
            })
            .fail((e: Error) => {
                this._handleError(e);
            });
    }
}

/**
* Dialogs which support editing source content.
*/
export namespace Dialogs {

    /**
    * Show a dialog prompting the user with a dialog to enter new file info to add to a given folder
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param itemPath Path to the folder to add to
    * @param folderVersion Version string for the version of the folder that add was called on
    * @param initialFiles List of upload-files to populate the dialog with initially
    * @param hideUpload Hide the ability to upload existing files
    * @param hideNewFile Hide the ability to enter a filename for a new file
    */
    export function addNewItems(
        repositoryContext: RepositoryContext,
        folderPath: string,
        folderVersion: string,
        initialDrop?: DataTransfer,
        hideUpload?: boolean,
        hideNewFile?: boolean,
        successCallback?: (result: AddNewFilesResult) => void,
        cancelCallback?: () => void) {

        return CoreDialogs.Dialog.show<CoreDialogs.Dialog>(AddFilesToFolderDialog, {
            title: VCResources.AddFileDialogTitle,
            width: 560,
            okText: VCResources.AddNewItemsDialogOKText,
            hideUpload: hideUpload,
            hideNewFile: hideNewFile,
            repositoryContext: repositoryContext,
            itemPath: folderPath,
            itemVersion: folderVersion,
            initialDrop: initialDrop,
            okCallback: successCallback,
            cancelCallback,
        });
    }

    /**
    * Show a dialog which prompts the user to enter a new name and commit/checkin comment for a rename operation.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param itemPath Path to the file/folder to rename
    * @param itemVersion Version string for the version of the item that rename was called on
    * @param itemIsFolder True if the item represents a folder. False for a file.
    * @param successCallback Method invoked once the delete operation has succeeded
    */
    export function renameItem(
        repositoryContext: RepositoryContext,
        itemPath: string,
        itemVersion: string,
        itemIsFolder: boolean,
        successCallback?: (result: RenameOrDeleteResult) => void,
        cancelCallback?: () => void) {

        return CoreDialogs.Dialog.show<CoreDialogs.Dialog>(RenameItemDialog, {
            title: VCResources.RenameDialogTitle,
            width: 560,
            okText: VCResources.RenameItemsDialogOKText,
            repositoryContext: repositoryContext,
            itemPath: itemPath,
            itemVersion: itemVersion,
            itemIsFolder: itemIsFolder,
            okCallback: successCallback,
            cancelCallback,
        });
    }

    /**
    * Show a dialog which confirms and collect commit/checkin comment for a delete operation.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param itemPath Path to the file/folder to delete
    * @param itemVersion Version string for the version of the item that delete was called on
    * @param successCallback Method invoked once the delete operation has succeeded
    */
    export function deleteItem(
        repositoryContext: RepositoryContext,
        itemPath: string,
        itemVersion: string,
        successCallback?: (result: RenameOrDeleteResult) => void,
        cancelCallback?: () => void) {

        return CoreDialogs.Dialog.show<CoreDialogs.Dialog>(DeleteItemDialog, {
            title: VCResources.DeleteItemDialogTitle,
            width: 560,
            okText: VCResources.DeleteItemsDialogOKText,
            repositoryContext: repositoryContext,
            itemPath: itemPath,
            itemVersion: itemVersion,
            okCallback: successCallback,
            cancelCallback,
        });
    }
}

/**
 * Result data after an add file operation.
 */
export interface AddNewFilesResult {
    newFilePaths: string[];
    newVersion?: VCSpecs.VersionSpec;
    comment?: string;
}

/**
 * Result data after a rename or delete operation.
 */
export interface RenameOrDeleteResult {
    newVersion: VCSpecs.VersionSpec;
    comment: string;
    newItemPath?: string;
}

/**
* Actions for editing source content.
*/
export namespace Actions {

    const gitIgnoreFileName = ".gitignore";
    const readmeFileName = "README.md";

    /**
    * Performs an add items to folder operation by prompting the user with a dialog to enter new file info
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param itemPath Path to the folder to add to
    * @param folderVersion Version string for the version of the folder that add was called on
    * @param initialFiles List of upload-files to populate the dialog with initially
    * @param hideUpload Hide the ability to upload existing files
    * @param hideNewFile Hide the ability to enter a filename for a new file
    */
    export function showAddNewItemsUI(
        repositoryContext: RepositoryContext,
        folderPath: string,
        folderVersion: string,
        initialDrop?: DataTransfer,
        hideUpload?: boolean,
        hideNewFile?: boolean,
        successCallback?: (result: AddNewFilesResult) => void,
        cancelCallback?: () => void) {

        Dialogs.addNewItems(repositoryContext, folderPath, folderVersion, initialDrop, hideUpload, hideNewFile, successCallback, cancelCallback);
    }

    /**
    * Performs a rename-item action by prompting the user with a dialog to enter the new name and commit/checkin comment.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param itemPath Path to the file/folder to rename
    * @param itemVersion Version string for the version of the item that rename was called on
    * @param itemIsFolder True if the item represents a folder. False for a file.
    * @param successCallback Method invoked once the rename operation has succeeded
    */
    export function showRenameItemUI(
        repositoryContext: RepositoryContext,
        itemPath: string,
        itemVersion: string,
        itemIsFolder: boolean,
        successCallback?: (result: RenameOrDeleteResult) => void,
        cancelCallback?: () => void) {

        Dialogs.renameItem(repositoryContext, itemPath, itemVersion, itemIsFolder, successCallback, cancelCallback);
    }

    /**
    * Make the server call to complete an item rename operation.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param originalItemPath Path to the file/folder to rename
    * @param originalItemVersion Version string for the version of the item that rename was called on
    * @param newItemPath The new path of the item
    * @param comment Comment for the checkin/commit
    */
    export function renameItem(
        repositoryContext: RepositoryContext,
        originalItemPath: string,
        originalItemVersion: string,
        newItemPath: string,
        comment: string): JQueryPromise<VCSpecs.VersionSpec> {

        const deferred = $.Deferred<VCSpecs.VersionSpec>();

        repositoryContext.getClient().beginGetItem(repositoryContext, originalItemPath, originalItemVersion, null, (item: VCLegacyContracts.ItemModel) => {

            if (repositoryContext.getRepositoryType() === RepositoryType.Git) {
                const gitClient = <GitClientService>(repositoryContext.getClient());
                const gitRepositoryContext = <GitRepositoryContext>(repositoryContext);
                const gitItem = <VCLegacyContracts.GitItem>item;

                const pushToCreate = <VCContracts.GitPush>{
                    refUpdates: [<VCContracts.GitRefUpdate>{
                        name: GitRefUtility.versionStringToRefName(originalItemVersion),
                        oldObjectId: gitItem.commitId.full
                    }],
                    commits: [<VCContracts.GitCommitRef>{
                        comment: comment,
                        changes: [<VCContracts.GitChange>{
                            changeType: VCContracts.VersionControlChangeType.Rename,
                            sourceServerItem: originalItemPath,
                            item: <VCContracts.GitItem>{
                                path: newItemPath
                            }
                        }]
                    }]
                };

                gitClient.beginPushChanges(gitRepositoryContext.getRepository(), pushToCreate,
                    (newPush: VCContracts.GitPush) => {
                        const newVersion = new VCSpecs.GitCommitVersionSpec(newPush.refUpdates[0].newObjectId);
                        VCSourceEditingEvents.Events._triggerItemRenamedEvent(newVersion, comment, originalItemPath, originalItemVersion, newItemPath);
                        deferred.resolve(newVersion);
                    }, deferred.reject);
            }
            else {
                const tfvcClient = <TfvcClientService>(repositoryContext.getClient());
                const changesetToCreate = <VCContracts.TfvcChangeset>{
                    comment: comment,
                    changes: [<VCContracts.TfvcChange>{
                        changeType: VCContracts.VersionControlChangeType.Rename,
                        sourceServerItem: originalItemPath,
                        item: {
                            path: newItemPath,
                            version: (<VCLegacyContracts.TfsItem>item).changeset
                        }
                    }]
                };

                tfvcClient.beginCreateChangeset(changesetToCreate, (newChangeset: VCContracts.TfvcChangesetRef) => {
                    const newVersion = new VCSpecs.ChangesetVersionSpec(newChangeset.changesetId);
                    VCSourceEditingEvents.Events._triggerItemRenamedEvent(newVersion, comment, originalItemPath, originalItemVersion, newItemPath);
                    deferred.resolve(newVersion);
                }, deferred.reject);
            }

        }, deferred.reject);

        return deferred.promise();
    }

    /**
    * Performs a delete-item action by prompting the user with a dialog to confirm and collect commit/checkin comment.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param itemPath Path to the file/folder to delete
    * @param itemVersion Version string for the version of the item that delete was called on
    * @param successCallback Method invoked once the delete operation has succeeded
    */
    export function showDeleteItemUI(
        repositoryContext: RepositoryContext,
        itemPath: string,
        itemVersion: string,
        successCallback?: (result: RenameOrDeleteResult) => void,
        cancelCallback?: () => void) {

        Dialogs.deleteItem(repositoryContext, itemPath, itemVersion, successCallback, cancelCallback);
    }

    /**
    * Make the server call to complete an item deletion operation.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param itemPath Path to the file/folder to delete
    * @param itemVersion Version string for the version of the item that delete was called on
    * @param comment Comment for the checkin/commit
    */
    export function deleteItem(
        repositoryContext: RepositoryContext,
        itemPath: string,
        itemVersion: string,
        comment: string): JQueryPromise<VCSpecs.VersionSpec> {

        const deferred = $.Deferred<VCSpecs.VersionSpec>();

        repositoryContext.getClient().beginGetItem(repositoryContext, itemPath, itemVersion, null, (item: VCLegacyContracts.ItemModel) => {

            if (repositoryContext.getRepositoryType() === RepositoryType.Git) {
                const gitClient = <GitClientService>(repositoryContext.getClient());
                const gitRepositoryContext = <GitRepositoryContext>(repositoryContext);
                const gitItem = <VCLegacyContracts.GitItem>item;

                const pushToCreate = <VCContracts.GitPush>{
                    refUpdates: [<VCContracts.GitRefUpdate>{
                        name: GitRefUtility.versionStringToRefName(itemVersion),
                        oldObjectId: gitItem.commitId.full
                    }],
                    commits: [<VCContracts.GitCommitRef>{
                        comment: comment,
                        changes: [<VCContracts.GitChange>{
                            changeType: VCContracts.VersionControlChangeType.Delete,
                            item: <VCContracts.GitItem>{
                                path: itemPath
                            }
                        }]
                    }]
                };

                gitClient.beginPushChanges(gitRepositoryContext.getRepository(), pushToCreate,
                    (newPush: VCContracts.GitPush) => {
                        const newVersion = new VCSpecs.GitCommitVersionSpec(newPush.refUpdates[0].newObjectId);
                        VCSourceEditingEvents.Events._triggerItemDeletedEvent(newVersion, comment, itemPath, itemVersion);
                        deferred.resolve(newVersion);
                    }, deferred.reject);
            }
            else {
                const tfvcClient = <TfvcClientService>(repositoryContext.getClient());
                const changesetToCreate = <VCContracts.TfvcChangeset>{
                    comment: comment,
                    changes: [<VCContracts.TfvcChange>{
                        changeType: VCContracts.VersionControlChangeType.Delete,
                        item: {
                            path: itemPath,
                            version: (<VCLegacyContracts.TfsItem>item).changeset
                        }
                    }]
                };

                tfvcClient.beginCreateChangeset(changesetToCreate, (newChangeset: VCContracts.TfvcChangesetRef) => {
                    const newVersion = new VCSpecs.ChangesetVersionSpec(newChangeset.changesetId);
                    VCSourceEditingEvents.Events._triggerItemDeletedEvent(newVersion, comment, itemPath, itemVersion);
                    deferred.resolve(newVersion);
                }, deferred.reject);
            }

        }, deferred.reject);

        return deferred.promise();
    }

    /**
    * Make the server call to complete a file edit operation.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param itemPath Path to the file being edited
    * @param itemCommitId Commit id of the item when editing was started on it. May be null/empty for new files.
    * @param branchName The name of the branch to commit to.
    * @param isNewFile True if the item represents a new file.
    * @param content Updated file contents.
    * @param comment Comment for the checkin/commit.
    * @param newBranchName The name of a new branch to create from branchName, then commit to it instead.
    */
    export function editFileGit(
        repositoryContext: RepositoryContext,
        itemPath: string,
        itemCommitId: string,
        branchName: string,
        isNewFile: boolean,
        content: string,
        comment: string,
        newBranchName?: string): JQueryPromise<VCSpecs.VersionSpec> {

        const changes = <VCContracts.GitChange[]>[{
            changeType: isNewFile ? VCContracts.VersionControlChangeType.Add : VCContracts.VersionControlChangeType.Edit,
            item: {
                path: itemPath
            },
            newContent: {
                content: content || "",
                contentType: VCContracts.ItemContentType.RawText
            }
        }];

        return modifyPathsGit(repositoryContext, changes, itemCommitId, branchName, comment, newBranchName).then((newVersion: VCSpecs.VersionSpec) => {
            const newBranchVersion = newBranchName ? new VCSpecs.GitBranchVersionSpec(newBranchName).toVersionString() : undefined;
            VCSourceEditingEvents.Events._triggerItemEditedEvent(newVersion, comment, itemPath, new VCSpecs.GitBranchVersionSpec(branchName).toVersionString(), newBranchVersion, repositoryContext.getRepositoryId());
            return newVersion;
        });
    }

    /**
     * Make the server call to add default files.
     *
     * @param repositoryContext RepositoryContext for the repository to commit to
     */
    export function createDefaultFilesPush(repositoryContext: RepositoryContext,
        createReadMe: boolean = false,
        gitIgnoreTemplateName?: string): JQueryPromise<VCSpecs.VersionSpec> {
        
        const deferred = $.Deferred<VCSpecs.VersionSpec>();
        const branchName = "master";
        
        const changes: VCContracts.GitChange[] = [];
        if (createReadMe) {
            changes.push(<VCContracts.GitChange>{
                changeType: VCContracts.VersionControlChangeType.Add,
                item: {
                    path: "/" + readmeFileName
                },
                newContentTemplate: <VCContracts.GitTemplate>{
                    name: readmeFileName,
                    type: 'readme'
                }
            });
        }

        if (gitIgnoreTemplateName) {
            changes.push(<VCContracts.GitChange>{
                changeType: VCContracts.VersionControlChangeType.Add,
                item: {
                    path: "/" + gitIgnoreFileName
                },
                newContentTemplate: <VCContracts.GitTemplate>{
                    name: gitIgnoreTemplateName,
                    type: 'gitignore'
                }
            });
        }

        const comment = createCommitMsgForDefaultFiles(changes);
        modifyPathsGit(repositoryContext, changes, "", branchName, comment).then((newVersion: VCSpecs.VersionSpec) => {
            deferred.resolve(newVersion);
        },
        (error) => {
            deferred.reject(error);
        });
        return deferred.promise();
    }

    /**
     * Creates commit msg for template files to be added
     * currently supports only gitignore and readme
     *
     * @param changes to be committed
     */
    function createCommitMsgForDefaultFiles(changes: VCContracts.GitChange[]): string {
        let defaultFileNames: string = '';

        for (const change of changes) {
            if (change.newContentTemplate.type === "gitignore") {
                defaultFileNames += (gitIgnoreFileName + " (" + change.newContentTemplate.name.substr(0, change.newContentTemplate.name.lastIndexOf('.')) + ")");
            }
            else {
                defaultFileNames += change.newContentTemplate.name;
            }
            defaultFileNames += ", ";
        }
        defaultFileNames = defaultFileNames.substr(0, defaultFileNames.length - 2);
        return Utils_String.format(changes.length === 1 ?
            VCResources.InitRepoWithDefaultFileMessage : VCResources.InitRepoWithDefaultFilesMessage, defaultFileNames);
    }

    /**
    * Update (add or edit) one or more files in a folder.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to.
    * @param folderPath Path of the folder to add to.
    * @param files Files to upload.
    * @param existingFileVersions Hash of existing files in the folder (pend edits on these files, adds on the others)
    * @param versionToAddTo Spec of the version to add to.
    * @param comment Comment for the checkin/commit
    */
    export function updateFilesInFolder(
        repositoryContext: RepositoryContext,
        folderPath: string,
        files: FileInput.FileInputControlResult[],
        existingFileVersions: { [fileNameLower: string]: number; },
        versionToAddTo: VCSpecs.VersionSpec,
        comment: string): JQueryPromise<VCSpecs.VersionSpec> {

        if (repositoryContext.getRepositoryType() === RepositoryType.Git) {

            if (!(versionToAddTo instanceof VCSpecs.GitBranchVersionSpec)) {
                throw new Error("Invalid version spec: Can only push to a branch version spec.");
            }

            const branchName = (<VCSpecs.GitBranchVersionSpec>versionToAddTo).branchName;

            const changes: VCContracts.GitChange[] = [];
            for (let i = 0, l = files.length; i < l; i++) {
                changes.push(<VCContracts.GitChange>{
                    changeType: existingFileVersions[files[i].name.toLowerCase()] ? VCContracts.VersionControlChangeType.Edit : VCContracts.VersionControlChangeType.Add,
                    item: {
                        path: VersionControlPath.combinePaths(folderPath, files[i].name)
                    },
                    newContent: {
                        content: files[i].content,
                        contentType: VCContracts.ItemContentType.Base64Encoded
                    }
                });
            }

            return modifyPathsGit(repositoryContext, changes, null, branchName, comment).then((newVersion: VCSpecs.VersionSpec) => {
                VCSourceEditingEvents.Events._triggerItemsUploadedEvent(newVersion, comment, folderPath, changes.map(c => c.item.path));
                return newVersion;
            });
        }
        else {
            const tfvcChanges: VCContracts.TfvcChange[] = [];
            for (let i = 0, l = files.length; i < l; i++) {
                const existingVersion = existingFileVersions[files[i].name.toLowerCase()] || 0;
                tfvcChanges.push(<VCContracts.TfvcChange>{
                    changeType: existingVersion ? VCContracts.VersionControlChangeType.Edit : VCContracts.VersionControlChangeType.Add,
                    item: {
                        path: VersionControlPath.combinePaths(folderPath, files[i].name),
                        contentMetadata: {
                            encoding: _getEncodingCodePage(files[i].encoding)
                        },
                        version: existingVersion
                    },
                    newContent: {
                        content: files[i].content,
                        contentType: VCContracts.ItemContentType.Base64Encoded
                    }
                });
            }

            return modifyPathsTfvc(repositoryContext, tfvcChanges, comment).then((newVersion: VCSpecs.VersionSpec) => {
                VCSourceEditingEvents.Events._triggerItemsUploadedEvent(newVersion, comment, folderPath, tfvcChanges.map(c => c.item.path));
                return newVersion;
            });
        }
    }

    /**
    * Make the server call to complete a file edit operation.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param changes Changes to make
    * @param baseCommitId Commit id of the tree when editing was started on it. May be null/empty for new files.
    * @param branchName The name of the branch to commit to.
    * @param comment Comment for the checkin/commit
    */
    function modifyPathsGit(
        repositoryContext: RepositoryContext,
        changes: VCContracts.GitChange[],
        baseCommitId: string,
        branchName: string,
        comment: string,
        newBranchName?: string): JQueryPromise<VCSpecs.VersionSpec> {

        const deferred = $.Deferred<VCSpecs.VersionSpec>();

        _beginGetSpecificGitRef(repositoryContext, baseCommitId, branchName, newBranchName).done((gitRef: VCContracts.GitRef) => {
            const gitClient = <GitClientService>(repositoryContext.getClient());
            const gitRepositoryContext = <GitRepositoryContext>(repositoryContext);

            const pushToCreate = <VCContracts.GitPush>{
                refUpdates: [<VCContracts.GitRefUpdate>{
                    name: gitRef.name,
                    oldObjectId: gitRef.objectId
                }],
                commits: [<VCContracts.GitCommitRef>{
                    comment: comment,
                    changes: changes
                }]
            };

            gitClient.beginPushChanges(gitRepositoryContext.getRepository(), pushToCreate,
                (newPush: VCContracts.GitPush) => {
                    const newVersion = new VCSpecs.GitCommitVersionSpec(newPush.refUpdates[0].newObjectId);
                    deferred.resolve(newVersion);
                }, deferred.reject);

        }).fail(deferred.reject);

        return deferred.promise();
    }

    /**
    * Make the server call to complete a file edit operation.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param itemPath Path to the file being edited
    * @param itemChangesetVersion Specific changeset of the item when editing on it was started. May be 0 for new files.
    * @param isNewFile True if the item represents a new file.
    * @param content Updated file contents.
    * @param comment Comment for the checkin/commit.
    * @param encoding The file encoding code page to use.  Defaults to UTF-8 (code page 65001).
    */
    export function editFileTfvc(
        repositoryContext: RepositoryContext,
        itemPath: string,
        itemChangesetVersion: number,
        isNewFile: boolean,
        content: string,
        comment: string,
        encoding?: number): JQueryPromise<VCSpecs.VersionSpec> {

        const changes = [<VCContracts.TfvcChange>{
            changeType: isNewFile ? VCContracts.VersionControlChangeType.Add : VCContracts.VersionControlChangeType.Edit,
            item: {
                path: itemPath,
                contentMetadata: {
                    encoding: encoding ? encoding : VCSourceEditing.TfvcEncodingConstants.UTF8
                },
                version: itemChangesetVersion
            },
            newContent: {
                content: content || "",
                contentType: VCContracts.ItemContentType.RawText
            }
        }];

        return modifyPathsTfvc(repositoryContext, changes, comment).then((newVersion: VCSpecs.VersionSpec) => {
            const originalVersion = itemChangesetVersion ? new VCSpecs.ChangesetVersionSpec(itemChangesetVersion).toVersionString() : new VCSpecs.LatestVersionSpec().toVersionString();
            VCSourceEditingEvents.Events._triggerItemEditedEvent(newVersion, comment, itemPath, originalVersion);
            return newVersion;
        });
    }

    /**
    * Make the server call to complete a file edit operation.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param changes Changes to make.  Each item requires the changesetId item.version when editing was started. Should be 0 for new files.
    * @param comment Comment for the checkin/commit
    */
    export function modifyPathsTfvc(
        repositoryContext: RepositoryContext,
        changes: VCContracts.TfvcChange[],
        comment: string): JQueryPromise<VCSpecs.VersionSpec> {

        const deferred = $.Deferred<VCSpecs.VersionSpec>();

        const tfvcClient = <TfvcClientService>(repositoryContext.getClient());

        const changesetToCreate = <VCContracts.TfvcChangeset>{
            comment: comment,
            changes: changes
        };

        tfvcClient.beginCreateChangeset(changesetToCreate, (newChangeset: VCContracts.TfvcChangesetRef) => {
            const newVersion = new VCSpecs.ChangesetVersionSpec(newChangeset.changesetId);
            deferred.resolve(newVersion);
        }, deferred.reject);

        return deferred.promise();
    }

    function _beginGetSpecificGitRef(
        repositoryContext: RepositoryContext,
        commitId: string,
        branchName: string,
        newBranchName?: string): JQueryPromise<VCContracts.GitRef> {

        const deferred = $.Deferred<VCContracts.GitRef>();

        if (commitId) {
            // An existing item to be committed into a branch to be created or the existing branch.
            deferred.resolve(<VCContracts.GitRef>{
                name: GitRefUtility.getFullRefNameFromBranch(newBranchName || branchName),
                objectId: commitId
            });
        }
        else {
            // A new item to be committed...
            const fullRefName = GitRefUtility.getFullRefNameFromBranch(branchName);
            const gitContext = <GitRepositoryContext>repositoryContext;

            gitContext.getGitClient().beginGetGitRef(gitContext.getRepository(), fullRefName, (gitRefs: VCContracts.GitRef[]) => {
                const refMatch = $.grep(gitRefs, (gitRef: VCContracts.GitRef) => { return gitRef.name === fullRefName })[0];
                if (refMatch) {
                    // ... into the existing branch, or into a new branch to be created from it.
                    deferred.resolve(<VCContracts.GitRef>{
                        name: newBranchName ? GitRefUtility.getFullRefNameFromBranch(newBranchName) : fullRefName,
                        objectId: refMatch.objectId
                    });
                }
                else {
                    // ... into a new branch to be created from scratch.
                    deferred.resolve(<VCContracts.GitRef>{
                        name: GitRefUtility.getFullRefNameFromBranch(branchName),
                        objectId: CommitIdHelper.EMPTY_OBJECT_ID
                    });
                }
            });
        }
        return deferred.promise();
    }

    function _getEncodingCodePage(encoding: Utils_File.FileEncoding): number {
        switch (encoding) {
            case Utils_File.FileEncoding.Binary:
                return VCSourceEditing.TfvcEncodingConstants.Binary;

            case Utils_File.FileEncoding.UTF16_BE:
                return VCSourceEditing.TfvcEncodingConstants.UTF16_BE;

            case Utils_File.FileEncoding.UTF16_LE:
                return VCSourceEditing.TfvcEncodingConstants.UTF16_LE;

            case Utils_File.FileEncoding.UTF32_BE:
                return VCSourceEditing.TfvcEncodingConstants.UTF32_BE;

            case Utils_File.FileEncoding.UTF32_LE:
                return VCSourceEditing.TfvcEncodingConstants.UTF32_LE;

            default:
                return VCSourceEditing.TfvcEncodingConstants.UTF8;
        }
    }
}

import * as VSSStore from "VSS/Flux/Store";
import { format, localeIgnoreCaseComparer } from "VSS/Utils/String";

import { VersionControlChangeType } from "TFS/VersionControl/Contracts";
import { CommitPayload, GatedCheckinPayload } from "VersionControl/Scenarios/Explorer/ActionsHub";
import { ItemModel, TfsItem } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { getFileName } from "VersionControl/Scripts/VersionControlPath";

export interface CommitPromptState {
    isGit: boolean;
    isVisible: boolean;
    editingPath: string;
    itemName: string;
    changeType: VersionControlChangeType;
    initialComment: string;
    isSaving: boolean;
    existingBranches: string[];
    errorMessage: string;
    existingFileList: ItemModel[];
    isUploading?: boolean;
    initialDrop?: DataTransfer;
    isCreatingFolder?: boolean;
    gatedCheckin?: GatedCheckinPayload;
}

export interface PromptPayload {
    path: string;
    changeType: VersionControlChangeType;
    existingFileList?: ItemModel[];
    isUploading?: boolean;
    initialDrop?: DataTransfer;
    isCreatingFolder?: boolean;
    newSubfolder?: string;
}

const commentTemplates = {
    [VersionControlChangeType.Edit]: VCResources.AddFileDialogDefaultCommentSingleFileWithEdit,
    [VersionControlChangeType.Add]: VCResources.FileViewerDefaultCommitMessageForAdd,
    [VersionControlChangeType.Rename]: VCResources.DefaultRenameCommentFormat,
    [VersionControlChangeType.Delete]: VCResources.DefaultDeleteCommentFormat,
};

/**
 * A store containing the state of the dialog to commit an edited file.
 */
export class CommitPromptStore extends VSSStore.Store {
    public state = {
        isVisible: false,
        initialComment: "",
        isSaving: false,
    } as CommitPromptState;

    public initialize = (isGit: boolean): void => {
        this.state.isGit = isGit;

        this.emitChanged();
    }

    public prompt = (payload: PromptPayload): void => {
        this.state.isVisible = true;
        this.state.editingPath = payload.path;
        this.state.changeType = payload.changeType;

        this.state.itemName = getFileName(payload.path);
        this.state.initialComment = getInitialComment(payload.changeType, this.state.itemName, payload.newSubfolder, payload.isCreatingFolder, payload.isUploading);

        this.state.isSaving = false;
        this.state.errorMessage = undefined;

        this.state.initialDrop = payload.initialDrop;
        this.state.isUploading = payload.isUploading;
        this.state.existingFileList = payload.existingFileList;

        this.state.isCreatingFolder = payload.isCreatingFolder;

        this.emitChanged();
    }

    public start = (): void => {
        this.state.isSaving = true;
        this.state.errorMessage = undefined;
        this.state.gatedCheckin = undefined;

        this.emitChanged();
    }

    public notifyGatedCheckin = (gatedCheckin: GatedCheckinPayload): void => {
        this.state.gatedCheckin = gatedCheckin;
        this.state.isSaving = false;

        this.emitChanged();
    }

    public notifyError = (error: Error): void => {
        this.state.errorMessage = error.message;
        this.state.isSaving = false;
        this.state.gatedCheckin = undefined;

        this.emitChanged();
    }

    public hide = (): void => {
        this.state.isVisible = false;
        this.state.gatedCheckin = undefined;

        this.emitChanged();
    }

    public hideAndRememberBranch = (payload: CommitPayload): void => {
        if (this.state.existingBranches && payload.newBranchVersionSpec) {
            this.state.existingBranches = this.state.existingBranches.concat(payload.newBranchVersionSpec.branchName);
        }

        this.hide();
    }

    public loadExistingBranches = (existingBranches: string[]): void => {
        this.state.existingBranches = existingBranches;

        this.emitChanged();
    }

    public updateChildren = (retrievedItems: ItemModel[]) => {
        if (this.state.isVisible) {

            if (retrievedItems) {
                retrievedItems.forEach((retrievedItem) => {
                    if (localeIgnoreCaseComparer(retrievedItem.serverItem, this.state.editingPath) === 0) {
                        this.state.existingFileList = retrievedItem.childItems;
                    }
                });
            }

            this.emitChanged();
        }
    }
}

function getInitialComment(changeType: VersionControlChangeType, itemName: string, newSubfolder: string, isCreatingFolder: boolean, isUploading: boolean): string {
    if (isUploading || isCreatingFolder) {
        return "";
    } else if (changeType === VersionControlChangeType.Add && newSubfolder) {
        return format(VCResources.DefaultAddSingleFileIntoNewSubfolderCommentFormat, itemName, newSubfolder);
    } else {
        return format(commentTemplates[changeType], itemName);
    }
}

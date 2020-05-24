import * as React from "react";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import { VersionControlChangeType } from "TFS/VersionControl/Contracts";
import { ActionCreator, NewCommitDescriptor } from "VersionControl/Scenarios/Explorer/ActionCreator";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import * as _VCCommitDialog from "VersionControl/Scenarios/Shared/Committing/CommitDialog";
import { CommitPromptState } from "VersionControl/Scenarios/Shared/Committing/CommitPromptStore";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

/**
 * A container that displays a dialog with required data to commit file changes.
 */
export const CommitDialogContainer = VCContainer.create(
    ["commitPrompt", "context", "permissions", "version"],
    ({ commitPromptState, repositoryContext, permissionsState, versionSpec }, { actionCreator }) =>
        commitPromptState.isVisible &&
        <CommitDialogAsync
            {...commitPromptState}
            tfsContext={repositoryContext.getTfsContext()}
            rootPath={repositoryContext.getRootPath()}
            currentBranchName={(versionSpec as GitBranchVersionSpec).branchName}
            gatedCheckin={commitPromptState.gatedCheckin}
            isRenaming={commitPromptState.changeType === VersionControlChangeType.Rename}
            isUploading={commitPromptState.isUploading}
            canCreatePullRequest={permissionsState.createPullRequest}
            onSave={newCommit => onSave(newCommit, commitPromptState, actionCreator)}
            onDismiss={actionCreator.dismissCommitDialog}
            existingFileList={commitPromptState.existingFileList}
        />);

function onSave(
    newCommit: NewCommitDescriptor,
    { editingPath, changeType, isUploading, isCreatingFolder, existingFileList }: CommitPromptState,
    actionCreator: ActionCreator,
): void {
    // There's no VersionControlChangeType.Upload so treat the upload files scenario as a special case.
    if (isUploading) {
        actionCreator.uploadFiles(editingPath, newCommit, existingFileList);
    } else if (isCreatingFolder) {
        actionCreator.addNewFolder(editingPath, newCommit);
    } else {
        switch (changeType) {
            case VersionControlChangeType.Add:
            case VersionControlChangeType.Edit:
                actionCreator.saveEditingFile(newCommit);
                break;
            case VersionControlChangeType.Rename:
                actionCreator.renameItem(editingPath, newCommit);
                break;
            case VersionControlChangeType.Delete:
                actionCreator.deleteItem(editingPath, newCommit);
                break;
        }
    }
}

const CommitDialogAsync = getAsyncLoadedComponent(
    ["VersionControl/Scenarios/Shared/Committing/CommitDialog"],
    (vcCommitDialog: typeof _VCCommitDialog) => vcCommitDialog.CommitDialog);

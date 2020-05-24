import { GitRef } from "TFS/VersionControl/Contracts";
import { NewCommitDescriptor } from "VersionControl/Scenarios/Explorer/ActionCreator";
import * as CommittingSource_Async from "VersionControl/Scenarios/Shared/Committing/CommittingSource";
import { FocusManager } from "VersionControl/Scenarios/Shared/Sources/FocusManager";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import {
    VersionSpec,
    GitBranchVersionSpec,
    GitCommitVersionSpec,
    ChangesetVersionSpec,
} from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { getExplorerUrl, getCreatePullRequestUrl } from "VersionControl/Scripts/VersionControlUrls";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { navigateToUrl } from "VersionControl/Scripts/Utils/XhrNavigationUtilsNonReact";
import { CommitPromptState } from "VersionControl/Scenarios/Shared/Committing/CommitPromptStore";

import { ProjectOverviewConstants } from "ProjectOverview/Scripts/Generated/Constants";
import { AsyncReadmeEditingSource } from "ProjectOverview/Scripts/Shared/Sources/AsyncReadmeEditingSource";
import { ReadmeItemModelSource } from "ProjectOverview/Scripts/Shared/Sources/ReadmeItemModelSource";
import { ReadmeFile, ReadmeEditorState } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeInterfaces";
import { ReadmeActionsHub } from "ProjectOverview/Scripts/Shared/ReadmeActionsHub";
import { isGit } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeUtils";

export interface EditorAggregatedState {
    readmeEditorState: ReadmeEditorState;
    commitPromptState: CommitPromptState;
}

export interface EditorTelemetrySpy {
    publishCreateReadmeClicked: () => void;
    publishEditReadmeClicked: () => void;
    publishReadmeCommitedToNewBranch: () => void;
}

export class ReadmeEditorActionCreator {
    public readonly focusManager: FocusManager;

    constructor(
        private _actionsHub: ReadmeActionsHub,
        private _editorState: () => EditorAggregatedState,
        private _readmeItemModelSource: ReadmeItemModelSource,
        private _editingSource: AsyncReadmeEditingSource,
        private _telemetrySpy: EditorTelemetrySpy
    ) {
        this.focusManager = this._editingSource.focusManager;
    }

    public startReadmeEditing = (isReadmeCreated?: boolean): void => {
        // checking if isReadmeCreated is true or not because when this function gets called when user 
        // clicks on "Edit" to edit readme ,the if check is bypassed if we don't explicitly check for true value of isReadmeCreated 
        if (isReadmeCreated === true) {
            this._telemetrySpy.publishCreateReadmeClicked();
        } else {
            this._telemetrySpy.publishEditReadmeClicked();
        }

        const readmeFile = this._editorState().readmeEditorState.readmeFile;
        this._actionsHub.readmeEditingStarted.invoke(isReadmeCreated);

        if (isReadmeCreated === true) { // create a default item model and update the store in case of new file.
            this._editingSource.getDefaultContentItem(readmeFile.repositoryContext).then(
                (defaultContentItem) => {
                    if (isGit(readmeFile.repositoryContext)) {
                        // in case of Git repo, fetch the latest commitId and update the created item model. 
                        // we need this latest commitId in order to create a new commit.
                        const branchName = (VersionSpec.parse(defaultContentItem.item.version) as GitBranchVersionSpec).branchName;
                        this._editingSource.getLatestGitRef(readmeFile.repositoryContext as GitRepositoryContext, branchName)
                            .then((latestGitRef: GitRef) => {
                                (defaultContentItem.item as VCLegacyContracts.GitItem).commitId = { full: latestGitRef.objectId, short: "" };
                                this._actionsHub.readmeDefaultItemSet.invoke(defaultContentItem);
                            });
                    } else {
                        this._actionsHub.readmeDefaultItemSet.invoke(defaultContentItem);
                    }
                }
            );
        } else {
            // readmeItemModel is not fetched in the initial json island data. Initially only content is available. On Edit click, we fetch
            // the item model as it is required by the FileViewer. 
            if (!readmeFile.isItemModelComplete) {
                this._readmeItemModelSource.getReadmeForRepository(
                    readmeFile.repositoryContext,
                    ProjectOverviewConstants.ReadmeFilePath).then((item) => {
                        this._actionsHub.readmeItemModelInitialized.invoke(item);
                    },
                    (error: TfsError) => {
                        this._actionsHub.readmeStartEditingFailed.invoke(error);
                    });
            }
        }
    }

    public cancelReadmeEditing = (): void => {
        this._actionsHub.readmeEditingCancelled.invoke(undefined);
    }

    public editContent = (newContent: string): void => {
        this._actionsHub.readmeContentEdited.invoke(newContent);
    }

    public toggleEditingDiffInline = (): void => {
        this._actionsHub.toggleEditingDiffInlineClicked.invoke(undefined);
    }

    public setReadmeEditModeTab = (itemKey: string): void => {
        this._actionsHub.readmeEditModeTabSet.invoke(itemKey);
    }

    public promptSaveEditingFile = (): void => {
        this._actionsHub.readmeCommitDialogPrompted.invoke(this._editorState().readmeEditorState.readmeFile.itemModel.serverItem);

        this._fetchExistingBranches();
    }

    public dismissNotification = (): void => {
        this._actionsHub.readmeNotificationDismissed.invoke(null);
    }

    public discardEditingFile = (isDirty: boolean): void => {
        if (isDirty) {
            this._actionsHub.readmeDiscardChangesPrompted.invoke(undefined);
        } else {
            this.cancelReadmeEditing();
        }
    }

    public dismissLoseChangesDialog = (): void => {
        this._actionsHub.readmeDiscardChangesDialogDismissed.invoke(undefined);
    }

    public saveReadmeCommit = (commitDescriptor: NewCommitDescriptor): void => {
        this._actionsHub.readmeCommitStarted.invoke(undefined);

        const readmeEditorState = this._editorState();
        const item = readmeEditorState.readmeEditorState.readmeFile.itemModel;
        const isNewFile = readmeEditorState.readmeEditorState.isNewFile;
        const editingContent = readmeEditorState.readmeEditorState.editedContent;
        const repositoryContext = readmeEditorState.readmeEditorState.readmeFile.repositoryContext;

        let versionSpec: VersionSpec; // empty incase of tfvc and branch name incase of git.
        let realVersionSpec: VersionSpec; // changeset number in case of tfvc and commit id in case of git.

        if (!isGit(readmeEditorState.readmeEditorState.readmeFile.repositoryContext)) {
            versionSpec = new VersionSpec();
            realVersionSpec = VersionSpec.parse(item.version); // item.version is changeset no. in case of tfvc
            if (isNewFile) { // in case of new file, lastest changeset can be 0.
                realVersionSpec = new ChangesetVersionSpec(0);
            }
        } else {
            realVersionSpec = new GitCommitVersionSpec((item as VCLegacyContracts.GitItem).commitId.full);
            versionSpec = VersionSpec.parse(item.version); // item.version is branch name in case of git.
        }

        const currentEncoding = item.contentMetadata && item.contentMetadata.encoding;
        const newBranchVersionSpec = commitDescriptor.newBranchName && new GitBranchVersionSpec(commitDescriptor.newBranchName);

        this._editingSource.getCommittingSource().then(
            (committingSource: CommittingSource_Async.CommittingSource) => {
                committingSource.commitEditingFile(
                    item,
                    versionSpec,
                    realVersionSpec,
                    isNewFile,
                    editingContent,
                    commitDescriptor.comment,
                    currentEncoding,
                    repositoryContext,
                    newBranchVersionSpec)
                    .then(
                    newRealVersionSpec => committingSource.linkWorkItems(commitDescriptor.linkedWorkItemIds, newRealVersionSpec, newBranchVersionSpec, repositoryContext)
                        .then(
                        () => {
                            this._actionsHub.readmeCommitSaved.invoke(newBranchVersionSpec); // update the list of existing branches with the new branch.
                            if (commitDescriptor.hasToCreatePullRequest) {
                                this._actionsHub.readmeUpdatePullRequestStarted.invoke(undefined);
                                const baseBranchName = (versionSpec as GitBranchVersionSpec).branchName;
                                const url = getCreatePullRequestUrl(repositoryContext as GitRepositoryContext, newBranchVersionSpec.branchName, baseBranchName);
                                navigateToUrl(url, CodeHubContributionIds.pullRequestHub);
                            } else {
                                this.renderUpdatedReadme(newRealVersionSpec, item, newBranchVersionSpec);
                            }
                        },
                        error => this._actionsHub.readmeCommitFailed.invoke(error)),
                    error => this._actionsHub.readmeCommitFailed.invoke(error));
            }
        );
    }

    public dismissCommitDialog = (): void => {
        this._actionsHub.readmeCommitDialogDismissed.invoke(undefined);
    }

    public renderUpdatedReadme = (versionSpec: VersionSpec, previousItemModel: VCLegacyContracts.ItemModel, newBranchSpec?: GitBranchVersionSpec): void => {
        let readmeState = this._editorState().readmeEditorState.readmeFile;
        let repositoryContext = readmeState.repositoryContext;
        let isCommitToANewBranch = newBranchSpec && newBranchSpec.toVersionString && newBranchSpec.toVersionString() !== previousItemModel.version;

        if (isCommitToANewBranch) {
            this._telemetrySpy.publishReadmeCommitedToNewBranch();
            let targetBranch = VersionSpec.parse(previousItemModel.version).toDisplayText();
            let gitRepositoryContext = repositoryContext as GitRepositoryContext;

            this._actionsHub.readmeSavedToNewBranch.invoke({
                repositoryContext: gitRepositoryContext,
                targetBranch,
                sourceBranch: newBranchSpec.toFriendlyName(),
                pushDate: new Date(),
                explorerBranchUrl: getExplorerUrl(repositoryContext, null, null, { version: newBranchSpec.toVersionString() }),
                createPullRequestURL: getCreatePullRequestUrl(gitRepositoryContext, newBranchSpec.toFriendlyName(), targetBranch),
            });
        } else {
            this._readmeItemModelSource.getUpdatedReadmeItemModel(repositoryContext, versionSpec, previousItemModel).then((itemModel: VCLegacyContracts.ItemModel) => {
                this._readmeItemModelSource.getJsonContent(repositoryContext, itemModel).then((content) => {
                    this._actionsHub.readmeSaved.invoke({
                        itemModel,
                        content: content.content,
                    });
                });
            });
        }
    }

    public initializeReadmeContentRenderer(): void {
        const readmeEditorState = this._editorState().readmeEditorState;
        if (!readmeEditorState.readmeFile.renderer) {
            this._readmeItemModelSource.getMarkdownRenderer().then(
                (renderer) => {
                    this._actionsHub.readmeRendererInitialized.invoke(renderer);
                },
                (error: Error) => {
                    this._showError(error.message);
                }
            );
        }
    }

    private _fetchExistingBranches(): void {
        if (this._editorState().commitPromptState.existingBranches) {
            return;
        }

        const repositoryContext = this._editorState().readmeEditorState.readmeFile.repositoryContext;
        if (isGit(repositoryContext)) {
            this._editingSource.getExistingBranches(repositoryContext as GitRepositoryContext)
                .then((branches: string[]) => this._actionsHub.existingBranchesLoaded.invoke(branches));
        }
    }

    private _showError = (message: string): void => {
        this._actionsHub.errorEncountered.invoke({
            errorMessage: message,
        });
    }
}

export function isReadmeDirty(readmeEditorState: ReadmeEditorState): boolean {
    if (readmeEditorState.readmeFile.content) {
        return readmeEditorState.editedContent && (readmeEditorState.readmeFile.content !== readmeEditorState.editedContent);
    }
    else {
        return !!readmeEditorState.editedContent;
    }
}
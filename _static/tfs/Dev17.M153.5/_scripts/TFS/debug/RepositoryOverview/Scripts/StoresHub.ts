import { VersionControlChangeType } from "TFS/VersionControl/Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { CommitSavedPayload } from "VersionControl/Scenarios/Explorer/ActionsHub";
import { CommitPromptStore, CommitPromptState } from "VersionControl/Scenarios/Shared/Committing/CommitPromptStore";
import { isGit } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeUtils";
import { ReadmeEditorState, ReadmeNotificationState } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeInterfaces";

import { ReadmeSectionStore } from "RepositoryOverview/Scripts/Stores/ReadmeSectionStore";
import { ActionsHub } from "RepositoryOverview/Scripts/ActionsHub";
import { RepositoryOverviewData } from "RepositoryOverview/Scripts/Generated/Contracts";
import { LanguagesStore, LanguagesState } from "RepositoryOverview/Scripts/Stores/LanguagesStore";

export interface AggregatedState {
    readmeEditorState: ReadmeEditorState;
    readmeNotificationState: ReadmeNotificationState;
    commitPromptState: CommitPromptState;
    languagesState: LanguagesState;
}

/**
 * A container to hold the multiple stores of repository overview page
 */
export class StoresHub {
    public readmeSectionStore: ReadmeSectionStore;
    public commitPromptStore: CommitPromptStore;
    public languagesStore: LanguagesStore;

    constructor(actionsHub: ActionsHub, parsedPageData: RepositoryOverviewData, repositoryContext: RepositoryContext) {
        this._initializeReadmeSectionStore(actionsHub, parsedPageData, repositoryContext);
        this._initializeCommitPrompStore(actionsHub, repositoryContext);
        this._initializeLanguagesStore(actionsHub, repositoryContext);
    }

    public getAggregatedState = (): AggregatedState => {
        return {
            readmeEditorState: this.readmeSectionStore.getState().editorState,
            readmeNotificationState: this.readmeSectionStore.getState().notificationState,
            commitPromptState: this.commitPromptStore.state,
            languagesState: this.languagesStore.getState()
        };
    }

    private _initializeReadmeSectionStore(actionsHub: ActionsHub, parsedPageData: RepositoryOverviewData, repositoryContext: RepositoryContext): void {
        this.readmeSectionStore = new ReadmeSectionStore(parsedPageData.readmeFileItemModel, parsedPageData.readmeContent, repositoryContext);
        actionsHub.readmeRendererInitialized.addListener(this.readmeSectionStore.initializeRenderer);
        actionsHub.readmeItemModelInitialized.addListener(this.readmeSectionStore.initializeItemModel);
        actionsHub.readmeEditingStarted.addListener(this.readmeSectionStore.startEditing);
        actionsHub.readmeEditingCancelled.addListener(this.readmeSectionStore.clearEditState);
        actionsHub.readmeEditModeTabSet.addListener(this.readmeSectionStore.setReadmeEditModeTab);
        actionsHub.toggleEditingDiffInlineClicked.addListener(this.readmeSectionStore.toggleEditingDiffInline);
        actionsHub.readmeDiscardChangesPrompted.addListener(this.readmeSectionStore.showLoseChangesDialog);
        actionsHub.readmeDiscardChangesDialogDismissed.addListener(this.readmeSectionStore.hideLoseChangesDialog);
        actionsHub.readmeContentEdited.addListener(this.readmeSectionStore.setEditedContent);
        actionsHub.readmeDefaultItemSet.addListener(this.readmeSectionStore.setDefaultItem);
        actionsHub.readmeSaved.addListener(this.readmeSectionStore.saveReadme);
        actionsHub.readmeUpdatePullRequestStarted.addListener(this.readmeSectionStore.clearEditState);
        actionsHub.readmeSavedToNewBranch.addListener(this.readmeSectionStore.saveReadmeToNewBranch);
        actionsHub.readmeStartEditingFailed.addListener(this.readmeSectionStore.startEditingFailed);
        actionsHub.readmeNotificationDismissed.addListener(this.readmeSectionStore.clearNotification);
        actionsHub.errorEncountered.addListener(this.readmeSectionStore.updateErrorMessage);
    }

    private _initializeCommitPrompStore(actionsHub: ActionsHub, repositoryContext: RepositoryContext): void {
        this.commitPromptStore = new CommitPromptStore();
        this.commitPromptStore.initialize(isGit(repositoryContext));
        actionsHub.readmeCommitDialogPrompted.addListener(path => this.commitPromptStore.prompt({ path, changeType: VersionControlChangeType.Edit }));
        actionsHub.readmeCommitStarted.addListener(this.commitPromptStore.start);
        actionsHub.readmeCommitSaved.addListener(this._commitBranchStoreHideAndRememberBranch);
        actionsHub.readmeCommitFailed.addListener(this.commitPromptStore.notifyError);
        actionsHub.readmeCommitDialogDismissed.addListener(this.commitPromptStore.hide);
        actionsHub.existingBranchesLoaded.addListener(this.commitPromptStore.loadExistingBranches);
    }

    private _initializeLanguagesStore(actionsHub: ActionsHub, repositoryContext: RepositoryContext): void {
        this.languagesStore = new LanguagesStore();
        actionsHub.languagesFetched.addListener(this.languagesStore.loadLanguages);
    }

    private _commitBranchStoreHideAndRememberBranch = (branchVersionSpec: GitBranchVersionSpec) => {
        this.commitPromptStore.hideAndRememberBranch({ newBranchVersionSpec: branchVersionSpec } as CommitSavedPayload);
    }
}

import { Action } from "VSS/Flux/Action";
import { IContentRenderer } from "Presentation/Scripts/TFS/TFS.ContentRendering";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ISuggestionObject } from "VersionControl/Scenarios/Shared/Suggestion";
import { IFileViewerModel } from "Welcome/Scripts/TFS.Welcome.FileViewerModelBuilder";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface ReadmeRepositoryChangedLocallyPayload {
    repositoryContext: RepositoryContext;
    readmeItemModel: ItemModel;
    content: string;
    isWikiRepository: boolean;
    errorMessage: string;
    showWikiPageNotFoundError: boolean;
}

export interface ErrorPayload {
    errorMessage: string;
    showWikiPageNotFoundError?: boolean;
}

export interface ReadmeSavedPayload {
    itemModel: ItemModel;
    content: string;
}

/**
 * A container for the current instances of the readme actions
 */
export class ReadmeActionsHub {
    public readmeRendererInitialized = new Action<IContentRenderer>();
    public readmeRepositoryChangedLocally = new Action<ReadmeRepositoryChangedLocallyPayload>();
    public readmeRepositoryChangesSaved = new Action<void>();
    public readmeRepositoryChangeDialogPrompted = new Action<void>();
    public readmeRepositoryChangeDialogDismissed = new Action<void>();
    public readmeDefaultItemSet = new Action<IFileViewerModel>();
    public readmeEditingStarted = new Action<boolean>();
    public readmeEditingCancelled = new Action<void>();
    public readmeEditModeTabSet = new Action<string>();
    public readmeContentEdited = new Action<string>();
    public toggleEditingDiffInlineClicked = new Action<void>();
    public readmeCommitDialogPrompted = new Action<string>();
    public readmeDiscardChangesPrompted = new Action<void>();
    public existingBranchesLoaded = new Action<string[]>();
    public readmeCommitStarted = new Action<void>();
    public readmeCommitSaved = new Action<GitBranchVersionSpec>();
    public readmeCommitFailed = new Action<Error>();
    public readmeDiscardChangesDialogDismissed = new Action<void>();
    public readmeCommitDialogDismissed = new Action<void>();
    public readmeSaved = new Action<ReadmeSavedPayload>();
    public readmeUpdatePullRequestStarted = new Action<void>();
    public readmeSavedToNewBranch = new Action<ISuggestionObject>();
    public readmeItemModelInitialized = new Action<ItemModel>();
    public readmeStartEditingFailed = new Action<TfsError>();
    public readmeNotificationDismissed = new Action<void>();
    public errorEncountered = new Action<ErrorPayload>();
    public wikiRepositoryFetched = new Action<GitRepositoryContext>();
    public wikiHomePageFound = new Action<string>();
    public wikiHomePageNotFound = new Action<ReadmeRepositoryChangedLocallyPayload>();
}

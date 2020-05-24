import { IContentRenderer } from "Presentation/Scripts/TFS/TFS.ContentRendering";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ISuggestionObject } from "VersionControl/Scenarios/Shared/Suggestion";

export interface ReadmeNotificationState {
    newBranch?: ISuggestionObject; // special case of CreatePullRequestSuggestionBanner
    message?: string;
}

export interface ReadmeFile {
    repositoryContext: RepositoryContext;
    itemModel: ItemModel;
    /*
     * Initially on the page load, LegacyItem model is provided by the data provider. Complete item model is required for
     * editing in the file viewer. Rest client fetches the complete one. So itemModel update will set this to true as well.
     */
    isItemModelComplete: boolean;
    content: string;
    renderer: IContentRenderer;
}

export interface ReadmeEditorState {
    readmeFile: ReadmeFile;
    isEditing: boolean;
    isNewFile: boolean;
    editedContent: string;
    isLoseChangesDialogVisible: boolean;
    currentReadmeEditModeTab: string;
    isDiffInline: boolean;
    newReadmeDefaultContent?: string;
}

export interface DisplayFileSelectorState {
    isDefaultRepoPresent: boolean;
    defaultRepositoryContext: RepositoryContext;
    currentReadmeFile: ReadmeFile;
    currentWikiPage: WikiPage;
    isCurrentlySetToWikiHomePage: boolean;
    isChangeReadmeDialogOpen: boolean;
    errorMessage: string;
}

export interface WikiPage {
    repositoryContext: GitRepositoryContext;
    content: string;
    wikiHomePagePath: string;
    showWikiPageNotFoundError: boolean;
}

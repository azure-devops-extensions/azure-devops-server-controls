import * as VSSStore from "VSS/Flux/Store";
import { IContentRenderer } from "Presentation/Scripts/TFS/TFS.ContentRendering";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { ProjectOverviewData, RepositoryData, SourceRepositoryTypes } from "ProjectOverview/Scripts/Generated/Contracts";
import { ItemModel, FileContent } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ISuggestionObject } from "VersionControl/Scenarios/Shared/Suggestion";
import { IFileViewerModel } from "Welcome/Scripts/TFS.Welcome.FileViewerModelBuilder";
import {
    ReadmeSavedPayload,
    ReadmeRepositoryChangedLocallyPayload,
    ErrorPayload,
} from "ProjectOverview/Scripts/Shared/ReadmeActionsHub";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import { getRepositoryContext } from "ProjectOverview/Scripts/Utils";

export interface ReadmeNotificationState {
    newBranch?: ISuggestionObject; // special case of CreatePullRequestSuggestionBanner
    message?: string;
}

export interface WikiPageState {
    isDefaultSetToWikiHomePage: boolean;
    wikiRepositoryContext: GitRepositoryContext;
    wikiHomePagePath: string;
    showWikiPageNotFoundError: boolean;
}

export interface ReadmeFileState {
    renderer: IContentRenderer;
    itemModel: ItemModel;
    /*
     * Initially on the page load, LegacyItem model is provided by the data provider. Complete item model is required for
     * editing in the file viewer. Rest client fetches the complete one. So itemModel update will set this to true as well.
     */
    isItemModelComplete: boolean;
    isEditing: boolean;
}

export interface ReadmeEditState {
    defaultContent: string;
    isLoseChangesDialogVisible: boolean;
    isNewFile: boolean;
    currentReadmeEditModeTab: string;
    isDiffInline: boolean;
    editingContent: string;
}

export interface ReadmeState {
    isLoading: boolean;
    isDefaultRepoPresent: boolean;
    content: string;
    currentRepositoryContext: RepositoryContext;
    defaultRepositoryContext: RepositoryContext;
    readmeFileState: ReadmeFileState;
    readmeNotificationState: ReadmeNotificationState;
    readmeEditState: ReadmeEditState;
    wikiPageState: WikiPageState;
    isChangeReadmeDialogOpen: boolean;
    errorMessage: string;
}

export class ReadmeStore extends VSSStore.Store {
    private _state: ReadmeState;

    constructor() {
        super();

        this._state = {
            isLoading: true,
            isDefaultRepoPresent: undefined,
            content: "",
            currentRepositoryContext: null,
            defaultRepositoryContext: null,
            readmeFileState: {
                renderer: undefined,
                itemModel: undefined,
                isEditing: false,
                isItemModelComplete: false,
            },
            readmeEditState: {
                defaultContent: undefined,
                isLoseChangesDialogVisible: false,
                isNewFile: false,
                currentReadmeEditModeTab: null,
                isDiffInline: false,
                editingContent: null,
            },
            readmeNotificationState: {},
            wikiPageState: {
                isDefaultSetToWikiHomePage: undefined,
                wikiRepositoryContext: undefined,
                wikiHomePagePath: undefined,
                showWikiPageNotFoundError: undefined,
            },
            isChangeReadmeDialogOpen: false,
            errorMessage: null,
        };
    }

    public getState(): ReadmeState {
        return this._state;
    }

    public loadReadmeState = (projectOverviewData: ProjectOverviewData): void => {
        if (projectOverviewData.currentRepositoryData) {
            const isDefaultRepoPresent = projectOverviewData.currentRepositoryData.isDefaultReadmeRepoPresent;
            const content = projectOverviewData.currentRepositoryData.displayContent;
            const readmeItemModel = projectOverviewData.currentRepositoryData.readmeFileItemModel;
            const isDefaultWikiHomePage = projectOverviewData.currentRepositoryData.sourceRepositoryType === SourceRepositoryTypes.Wiki;
            const wikiPagePath = projectOverviewData.currentRepositoryData.wikiPagePath;
            const wikiRepositoryContext = isDefaultWikiHomePage
                ? new GitRepositoryContext(TfsContext.getDefault(), projectOverviewData.currentRepositoryData.gitRepositoryData.repository)
                : null;
            const repositoryContext = this._getRepositoryContext(projectOverviewData.currentRepositoryData);
            const showWikiPageNotFoundError = isDefaultWikiHomePage && (!isDefaultRepoPresent || content == null);
            const showReadmeRepoNotFoundError = !isDefaultWikiHomePage && !isDefaultRepoPresent;

            this._state.isDefaultRepoPresent = isDefaultRepoPresent;
            this._state.content = content;
            this._state.currentRepositoryContext = repositoryContext;
            this._state.defaultRepositoryContext = repositoryContext;
            this._state.readmeFileState.itemModel = isDefaultRepoPresent ? readmeItemModel : undefined;
            this._state.wikiPageState.isDefaultSetToWikiHomePage = isDefaultWikiHomePage;
            this._state.wikiPageState.wikiRepositoryContext = wikiRepositoryContext;
            this._state.wikiPageState.wikiHomePagePath = wikiPagePath;
            this._state.wikiPageState.showWikiPageNotFoundError = showWikiPageNotFoundError;
            this._state.errorMessage = showReadmeRepoNotFoundError ? ProjectOverviewResources.Readme_ReadmeRepoNotFound : null;
        }

        this._state.isLoading = false;
        this.emitChanged();
    }

    public stopIsLoading = (): void => {
        this._state.isLoading = false;
        this.emitChanged();
    }

    public saveReadme = (readmeSavedPayload: ReadmeSavedPayload): void => {
        this._resetEditState();
        this._state.content = readmeSavedPayload.content;
        this._updateItemModel(readmeSavedPayload.itemModel);
        this._clearNotification();
        this.emitChanged();
    }

    public saveReadmeToNewBranch = (suggestion: ISuggestionObject): void => {
        this._resetEditState();
        this._setNewBranchSuggestion(suggestion);
        this.emitChanged();
    }

    public updateCurrentRepository = (repositoryChangedPayload: ReadmeRepositoryChangedLocallyPayload): void => {
        this._state.content = repositoryChangedPayload.content;
        this._state.readmeFileState.isEditing = false;
        this._updateItemModel(repositoryChangedPayload.readmeItemModel);
        this._state.currentRepositoryContext = repositoryChangedPayload.repositoryContext;
        this._state.wikiPageState.isDefaultSetToWikiHomePage = repositoryChangedPayload.isWikiRepository;
        this._state.wikiPageState.showWikiPageNotFoundError = repositoryChangedPayload.showWikiPageNotFoundError;
        this._state.errorMessage = repositoryChangedPayload.errorMessage;
        this._clearNotification();
        this.emitChanged();
    }

    public saveRepositoryChanges = (): void => {
        this._state.defaultRepositoryContext = this._state.currentRepositoryContext;
        this._state.isDefaultRepoPresent = true;
        this.emitChanged();
    }

    public startEditing = (isNewFile: boolean): void => {
        this._state.readmeFileState.isEditing = true;
        this._state.readmeEditState.currentReadmeEditModeTab = VersionControlActionIds.Contents;
        if (isNewFile === true) {
            this._state.readmeEditState.isNewFile = true;
        } else {
            this._state.readmeEditState.isNewFile = false;
        }
        this.emitChanged();
    }

    public startEditingFailed = (error: TfsError): void => {
        const statusCode = parseInt(error.status);
        // 404 is returned for stakeholders instead of 403, we might end up coverign an actual 404 error
        // (project readme rendered , then deleted, then trying to edit it)
        // but taking that hit for a more prominent stakeholder scenario
        if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
            this._setErrorMessage(ProjectOverviewResources.InsufficientReadmePermission);
        }
        else {
            this._setErrorMessage(error.message);
        }
        this._state.readmeFileState.isEditing = false;
        this.emitChanged();
    }

    public toggleEditingDiffInline = (): void => {
        this._state.readmeEditState.isDiffInline = !this._state.readmeEditState.isDiffInline;
        this._clearNotification();
        this.emitChanged();
    }

    public setDefaultItem = (defaultContentItem: IFileViewerModel): void => {
        this._updateItemModel(defaultContentItem.item);
        this._state.readmeEditState.defaultContent = defaultContentItem.defaultContent;
        this._state.readmeEditState.editingContent = defaultContentItem.defaultContent;
        this.emitChanged();
    }

    public clearEditState = (): void => {
        this._resetEditState();
        this.emitChanged();
    }

    public showLoseChangesDialog = (): void => {
        this._state.readmeEditState.isLoseChangesDialogVisible = true;
        this.emitChanged();
    }

    public hideLoseChangesDialog = (): void => {
        this._state.readmeEditState.isLoseChangesDialogVisible = false;
        this.emitChanged();
    }

    public setReadmeEditModeTab = (readmeEditModeTab: string): void => {
        if (this._state.readmeEditState.currentReadmeEditModeTab !== readmeEditModeTab) {
            this._state.readmeEditState.currentReadmeEditModeTab = readmeEditModeTab;
            this.emitChanged();
        }
    }

    public setEditedContent = (newContent: string): void => {
        if (this._state.readmeEditState.editingContent !== newContent) {
            this._state.readmeEditState.editingContent = newContent;
            this.emitChanged();
        }
    }

    public updateWikiRepository = (wikiRepositoryContext: GitRepositoryContext): void => {
        this._state.wikiPageState.wikiRepositoryContext = wikiRepositoryContext;
        this.emitChanged();
    }

    public updateErrorMessage = (errorPayload: ErrorPayload): void => {
        this._state.errorMessage = errorPayload.errorMessage;
        this._state.wikiPageState.showWikiPageNotFoundError = errorPayload.showWikiPageNotFoundError;
        this.emitChanged();
    }

    public promptChangeReadmeDialog = (): void => {
        this._state.isChangeReadmeDialogOpen = true;
        this.emitChanged();
    }

    public dismissChangeReadmeDialog = (): void => {
        this._state.errorMessage = null;
        this._state.wikiPageState.showWikiPageNotFoundError = false;
        this._state.isChangeReadmeDialogOpen = false;
        this.emitChanged();
    }

    public updateWikiHomePagePath = (homePage: string): void => {
        this._state.wikiPageState.wikiHomePagePath = homePage;
        this.emitChanged();
    }

    public initializeRenderer = (renderer: IContentRenderer): void => {
        this._state.readmeFileState.renderer = renderer;
        this.emitChanged();
    }

    public initializeItemModel = (item: ItemModel): void => {
        this._updateItemModel(item);
        this.emitChanged();
    }

    public clearNotification = (): void => {
        this._state.errorMessage = null;
        this._state.wikiPageState.showWikiPageNotFoundError = false;
        this._clearNotification();
        this.emitChanged();
    }

    private _getRepositoryContext(repositoryData: RepositoryData): RepositoryContext {
        if (!repositoryData) {
            return undefined;
        }

        return getRepositoryContext(
            repositoryData.sourceRepositoryType === SourceRepositoryTypes.Tfvc,
            repositoryData.gitRepositoryData && repositoryData.gitRepositoryData.repository);
    }

    private _resetEditState = (): void => {
        this._state.readmeFileState.isEditing = false;
        this._state.readmeEditState.editingContent = null;
        this._state.readmeEditState.isLoseChangesDialogVisible = false;
    }
    
    private _updateItemModel(item: ItemModel): void {
        this._state.readmeFileState.itemModel = item;
        this._state.readmeFileState.isItemModelComplete = Boolean(item);
    }

    private _clearNotification = (): void => {
        this._setNotificationState();
    }

    private _setNewBranchSuggestion = (suggestion: ISuggestionObject): void => {
        this._setNotificationState(suggestion);
    }

    private _setErrorMessage = (message: string): void => {
        this._setNotificationState(undefined, message);
    }

    private _setNotificationState = (suggestion: ISuggestionObject = undefined, message: string = undefined): void => {
        this._state.readmeNotificationState = {
            message: message,
            newBranch: suggestion,
        }
    }
}

export function isDirty(readmeState: ReadmeState): boolean {
    if (readmeState.content) {
        return readmeState.readmeEditState.editingContent && (readmeState.content !== readmeState.readmeEditState.editingContent);
    }
    else {
        return !!readmeState.readmeEditState.editingContent;
    }
}

export function isGit(readmeState: ReadmeState): boolean {
    return (readmeState.currentRepositoryContext.getRepositoryType() !== RepositoryType.Tfvc);
}

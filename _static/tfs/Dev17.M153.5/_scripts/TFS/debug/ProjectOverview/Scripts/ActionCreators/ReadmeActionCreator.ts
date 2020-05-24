import { errorHandler, using } from "VSS/VSS";
import * as Utils_String from "VSS/Utils/String";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { getPagePathForGitItemPath } from "Wiki/Scripts/Helpers";
import { redirectToUrl, getExternalWikiHubPageEditUrl } from "Wiki/Scripts/WikiUrls";

import { ActionsHub } from "ProjectOverview/Scripts/ActionsHub";
import { ProjectOverviewConstants } from "ProjectOverview/Scripts/Generated/Constants";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import * as SettingsClient_LAZY_LOAD from "ProjectOverview/Scripts/SettingsClient";
import * as TelemetryClient from "ProjectOverview/Scripts/TelemetryClient";
import { ReadmeItemModelSource } from "ProjectOverview/Scripts/Shared/Sources/ReadmeItemModelSource";
import { WikiRepositorySource } from "ProjectOverview/Scripts/Sources/WikiRepositorySource";
import { AggregatedState } from "ProjectOverview/Scripts/Stores/StoresHub";

export class ReadmeActionCreator {
    constructor(
        private _actionsHub: ActionsHub,
        private _getAggregatedState: () => AggregatedState,
        private _readmeItemModelSource: ReadmeItemModelSource,
        private _wikiRepositorySource: WikiRepositorySource,
    ) {
    }

    public startWikiEditing = (): void => {
        TelemetryClient.publishEditWikiHomePageClicked();
        // Navigate to wiki edit home page link
        let homePagePath = this._getAggregatedState().readmeState.wikiPageState.wikiHomePagePath;
        homePagePath = getPagePathForGitItemPath(homePagePath);
        // TODO: Task 1147410: Handle Search and Project overview links for old/new format
        redirectToUrl(
            getExternalWikiHubPageEditUrl(null, { pagePath: homePagePath }),
            false);   // false- to denote the redirection is from a non-wiki hub
        return;
    }

    public publishWikiRepoNotPresent = (): void => {
        TelemetryClient.publishWikiRepoNotPresent();
    }

    public publishReadmeRepoNotPresent = (): void => {
        TelemetryClient.publishReadmeRepoNotPresent();
    }

    public initializeReadmeContentRenderer(fetchForLocalDisplay?: boolean): void {
        const readmeState = this._getAggregatedState().readmeState;
        if (!readmeState.readmeFileState.renderer && (!readmeState.wikiPageState.isDefaultSetToWikiHomePage || fetchForLocalDisplay)) {
            this._readmeItemModelSource.getMarkdownRenderer().then(
                (renderer) => {
                    this._actionsHub.readmeRendererInitialized.invoke(renderer);
                },
                (error: Error) => {
                    this._showError(error.message, false);
                }
            );
        }
    }

    public onDismissChangeReadmeDialog = (): void => {
        this._actionsHub.readmeRepositoryChangeDialogDismissed.invoke(undefined);
    }

    public promptChangeReadmeRepositoryDialog = (): void => {
        this._actionsHub.readmeRepositoryChangeDialogPrompted.invoke(undefined);
    }

    public changeDisplayFileLocally = (repositoryContext: RepositoryContext): void => {
        if (this._isWikiRepository(repositoryContext)) {
            this._changeToWikiHomePageLocally(repositoryContext);
        } else {
            this.changeToReadmeFileLocally(repositoryContext);
        }
    }

    public saveReadmeRepositoryChanges = (): void => {
        const readmeState = this._getAggregatedState().readmeState;
        const isWikiRepository = this._isWikiRepository(readmeState.currentRepositoryContext);
        using(
            ["ProjectOverview/Scripts/SettingsClient"],
            (currentSettingsClient: typeof SettingsClient_LAZY_LOAD) =>
                currentSettingsClient.SettingsClient.saveReadmeRepository(readmeState.currentRepositoryContext, isWikiRepository)
        );
        this._actionsHub.readmeRepositoryChangesSaved.invoke(undefined);
    }

    public fetchWikiHomePage = (): void => {
        const wikiRepositoryContext: RepositoryContext = this._getAggregatedState().readmeState.wikiPageState.wikiRepositoryContext;
        if (!wikiRepositoryContext) {
            this._wikiRepositorySource.getWikiRepository().then(
                (wikiRepositoryContext: GitRepositoryContext) => {
                    if (wikiRepositoryContext) {
                        this._actionsHub.wikiRepositoryFetched.invoke(wikiRepositoryContext);
                        this._fetchWikiHomePageContent(wikiRepositoryContext);
                    } else {
                        this._showError(null, true);
                        return;
                    }
                },
                (error: Error) => {
                    const isProjectWikiNotFound = Utils_String.equals(error.message, ProjectOverviewResources.NoProjectWikiFound);
                    this._showError(error.message, isProjectWikiNotFound);
                    return null;
                });
        } else {
            this._fetchWikiHomePageContent(wikiRepositoryContext);
        }
    }

    public changeToReadmeFileLocally = (repositoryContext: RepositoryContext): void => {
        const fetchForLocalDisplay = true;
        this.initializeReadmeContentRenderer(fetchForLocalDisplay);
        this._readmeItemModelSource.getReadmeForRepository(repositoryContext, ProjectOverviewConstants.ReadmeFilePath).then(
            (itemModel: VCLegacyContracts.ItemModel) => {
                this._readmeItemModelSource.getJsonContent(repositoryContext, itemModel).then(
                    (content) => {
                        this._actionsHub.readmeRepositoryChangedLocally.invoke({
                            repositoryContext,
                            readmeItemModel: itemModel,
                            content: content.content,
                            isWikiRepository: false,
                            errorMessage: null,
                            showWikiPageNotFoundError: false,
                        });
                    });
            },
            (error) => {
                // Show upsell if server returns bad request. Assuming it means itemModel not found
                // Status code: 400 is thrown if the repository is empty
                // Otherwise if the readme is not found then 404 is thrown
                if (error && error.status && error.status !== 400 && error.status !== 404) {
                    errorHandler.show(error);
                } else {
                    this._actionsHub.readmeRepositoryChangedLocally.invoke({
                        repositoryContext,
                        readmeItemModel: undefined,
                        content: undefined,
                        isWikiRepository: false,
                        errorMessage: null,
                        showWikiPageNotFoundError: false,
                    });
                }
            }
        );
    }

    private _isWikiRepository(repositoryContext: RepositoryContext): boolean {
        const readmeState = this._getAggregatedState().readmeState;
        return (readmeState.wikiPageState.wikiRepositoryContext
            && repositoryContext.getRepositoryId() === readmeState.wikiPageState.wikiRepositoryContext.getRepositoryId());
    }

    private _changeToWikiHomePageLocally(repositoryContext: RepositoryContext): void {
        // This covers scenario when wiki repo is initialized but there is no wiki page
        const wikiHomePagePath = this._getAggregatedState().readmeState.wikiPageState.wikiHomePagePath;
        if (!wikiHomePagePath) {
            this._actionsHub.wikiHomePageNotFound.invoke({
                repositoryContext,
                readmeItemModel: undefined,
                content: undefined,
                isWikiRepository: true,
                errorMessage: null,
                showWikiPageNotFoundError: true,
            });

            return;
        } else {
            // Fetch wiki page content and render locally
            this._wikiRepositorySource.getHomePageContent(wikiHomePagePath).then(
                (content: string) => {
                    this._actionsHub.readmeRepositoryChangedLocally.invoke({
                        repositoryContext,
                        readmeItemModel: undefined,
                        content: content,
                        isWikiRepository: true,
                        errorMessage: null,
                        showWikiPageNotFoundError: false,
                    });
                },
                (error: Error) => {
                    this._actionsHub.wikiHomePageNotFound.invoke({
                        repositoryContext,
                        readmeItemModel: undefined,
                        content: undefined,
                        isWikiRepository: true,
                        errorMessage: error.message,
                        showWikiPageNotFoundError: false,
                    });
                });
        }
    }

    private _fetchWikiHomePageContent(wikiRepositoryContext: RepositoryContext): void {
        this._wikiRepositorySource.getHomePagePath().then(
            (homePage: string) => {
                if (homePage) {
                    this._actionsHub.wikiHomePageFound.invoke(homePage);
                    this.changeDisplayFileLocally(wikiRepositoryContext);
                } else {
                    // This scenario occurs when wiki repository is initialized but there is no page.
                    this._actionsHub.wikiHomePageNotFound.invoke({
                        repositoryContext: wikiRepositoryContext,
                        readmeItemModel: undefined,
                        content: undefined,
                        isWikiRepository: true,
                        errorMessage: null,
                        showWikiPageNotFoundError: true,
                    });
                }
            },
            (error: Error) => this._actionsHub.wikiHomePageNotFound.invoke({
                repositoryContext: wikiRepositoryContext,
                readmeItemModel: undefined,
                content: undefined,
                isWikiRepository: true,
                errorMessage: error.message,
                showWikiPageNotFoundError: false,
            }));
    }

    private _showError = (message: string, isWikiPageNotFoundError: boolean): void => {
        this._actionsHub.errorEncountered.invoke({
            errorMessage: message,
            showWikiPageNotFoundError: isWikiPageNotFoundError,
        });
    }
}

/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Controls = require("VSS/Controls");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_FilteredListControl = require("Presentation/Scripts/TFS/FeatureRef/FilteredListControl");
import Menus = require("VSS/Controls/Menus");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import VSS_Telemetry = require("VSS/Telemetry/Services");

import VCContracts = require("TFS/VersionControl/Contracts");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import { GitClientService } from "VersionControl/Scripts/GitClientService"
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCCreateRepositoryDialogShower = require("VersionControl/Scripts/Controls/CreateRepositoryDialogShower");
import { queueModulePreload } from "VersionControl/Scripts/DeferredJobQueue";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";

import VCImportDialog_NO_REQUIRE = require("VersionControl/Scenarios/Import/ImportDialog/ImportDialog");

import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

/**
 * IRepositoryFavorite properties are a subset of those of VCContracts.GitRepository
 */
export interface IRepositoryFavorite {
    id: string;
    name: string;
    isFork: boolean;
    project: {
        id: string;
    };
}

module TabIds {
    export const All = "all";
    export const Favorites = "favorites";
    export const Forks = "forks";
}

export interface GitRepositorySelectorControlOptions extends TFS_FilteredListControl.FilteredListControlOptions {
    projectId: string,
    projectInfo: VCContracts.VersionControlProjectInfo,
    tfsContext?: TfsContext,
    initialRepositories?: VCContracts.GitRepository[],
    showRepositoryActions?: boolean,
    tfvcRepository?: VCContracts.GitRepository,
    // Show the favorite repositories tab.  Defaults true if projectId is provided
    showFavorites?: boolean,
}

export class GitRepositorySelectorControl extends TFS_FilteredListControl.FilteredListControl {

    private _projectId: string;
    private _myFavoriteStore: TFS_OM_Common.FavoriteStore;
    private _totalRepositoriesCount: number = 0;
    private _searchText: string;  // Used to keep Favorites and All Repositories search text in synch.
    private _lastTabId: string;   // Favorites or All Repositories tabId used when search text was updated.
    private _nameCountMap: IDictionaryStringTo<IDictionaryStringTo<number>>; // Used to determine repo names that need to be disambiguated in the list

    public initializeOptions(options?: any) {
        const tabNames: any = {};
        let defaultTabId: string = null;

        // Using the legacy Favorites Store, we will be scoping favorites at the project level, for consistency with all present-day consumers of favorites.
        // So we'll enable favorites only if we are provided a projectId and we're showing repositories scoped to it.
        // Once the Favorites REST API is ready for general first party use, this constraint can be safely relaxed.
        const showFavorites: boolean = !!(options.showFavorites !== false && options.projectId);

        if (showFavorites) {
            tabNames.favorites = VCResources.RepoPickerFavoritesTabLabel;
            tabNames.all = VCResources.RepoPickerAllTabLabel;
            defaultTabId = TabIds.Favorites;
            options.showFavorites = true;
        }

        super.initializeOptions($.extend({
            tabNames: showFavorites ? tabNames : (options.tabNames ? options.tabNames : undefined),
            defaultTabId: showFavorites ? defaultTabId : undefined,
            scrollToExactMatch: true,
            updateListOnTabSelection: showFavorites,
            useBowtieStyle: true,
        }, options));
    }

    public initialize() {
        this._element.addClass("vc-git-repository-selector-control").addClass("vc-git-selector");
        this._projectId = this._options.projectId;
        this._nameCountMap = {};

        super.initialize();

        if (this._options.initialRepositories) {
            let tabId = this._options.tabNames ? TabIds.All : "";
            tabId = (this._options.tabNames && this._options.tabNames.forks) ? TabIds.Forks : tabId;

            this._setItemsForTabId(tabId, this._options.initialRepositories);
        }

        if (this._options.showRepositoryActions) {
            this._createActionItems($(domElem("div", "vc-git-repository-selector-actions")).addClass("toolbar").appendTo(this._element));
        }

        queueModulePreload("VersionControl/Scenarios/Import/ImportDialog/ImportDialog");
    }

    public getAriaDescription(): string {
        const description = this._options.showRepositoryActions ? " " + VCResources.GitRepositorySelectorAriaDescribeActions : "";
        return super.getAriaDescription() + description;
    }

    private _createActionItems($container: JQuery) {
        const menuItems: Menus.IMenuItemSpec[] = [];

        if (this._projectId && this._options.tfsContext && this._options.tfsContext.navigation && this._options.tfsContext.navigation.project) {

            menuItems.push(<Menus.IMenuItemSpec>{
                id: "new-repository",
                text: VCResources.CreateNewRepositoryLinkText,
                icon: "bowtie-icon bowtie-math-plus-light",
                action: () => {
                    this._fire("action-item-clicked");
                    VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.REPOSITORYSELECTOR_NEW_REPO_CLICK, {}));
                    VCCreateRepositoryDialogShower.show(this._options.projectInfo, this._options.tfsContext,
                        $(".vc-git-selector-menu")[0],
                        (createdRepository) => {
                            if (createdRepository.repoType === RepositoryType.Git) {
                                window.location.href = VersionControlUrls.getGitActionUrl(this._options.tfsContext, createdRepository.gitRepository.name, null, null, false);
                            }
                            else {
                                window.location.href = VersionControlUrls.getExplorerUrl(TfvcRepositoryContext.create());
                            }
                        });
                }
            });

            menuItems.push(<Menus.IMenuItemSpec>{
                id: "import-repository",
                text: VCResources.ImportRepositoryLinkText,
                icon: "bowtie-icon bowtie-transfer-upload",
                action: () => {
                    this._fire("action-item-clicked");

                    VSS.using(["VersionControl/Scenarios/Import/ImportDialog/ImportDialog"], (VCImportRepository: typeof VCImportDialog_NO_REQUIRE) => {
                        const options = <VCImportDialog_NO_REQUIRE.ImportDialogOptions>{
                            tfsContext: this._options.tfsContext,
                            projectInfo: this._options.projectInfo.project,
                            repositoryName: null
                        };

                        VCImportRepository.ImportDialog.show(options);
                    });
                }
            });
        }

        menuItems.push(<Menus.IMenuItemSpec>{
            id: "manage-repositories",
            text: VCResources.ManageRepositoriesLinkText,
            icon: "bowtie-icon bowtie-settings-gear",
            action: () => {
                this._fire("action-item-clicked");
                window.open(this._options.tfsContext.getActionUrl(null, "versioncontrol", { area: "admin" }), '_blank');
            }
        });

        <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $container, <Menus.MenuBarOptions>{
            cssClass: "vc-git-repository-selector-action-repo",
            items: menuItems,
            orientation: "vertical",
            ariaAttributes: <Controls.AriaAttributes>{
                label: VCResources.GitRepositorySelectorActionsAriaLabel,
            },
        });
    }

    public _getWaterMarkText(tabId: string) {
        return VCResources.RepositoriesFilterWatermark;
    }

    public _getNoItemsText(tabId: string) {
        if (tabId === TabIds.Favorites) {
            return VCResources.RepoPickerNoFavoritesMessage;
        }
        else {
            return this._projectId ? VCResources.VersionSelectorNoGitRepositoriesInProject : VCResources.VersionSelectorNoGitRepositoriesInCollection;
        }
    }

    public _getNoMatchesText(tabId: string) {
        if (tabId === TabIds.Favorites) {
            return VCResources.RepoPickerNoMatchingFavorites;
        }
        else {
            return VCResources.VersionSelectorNoMatchingRepositories;
        }
    }

    public _setItemsForTabId(tabId: string, items: any[]) {
        super._setItemsForTabId(tabId, items);

        if (!this._projectId) {
            this._nameCountMap[tabId] = {};

            for (const item of items) {
                if (this._nameCountMap[tabId][item.name]) {
                    this._nameCountMap[tabId][item.name]++;
                } else {
                    this._nameCountMap[tabId][item.name] = 1;
                }
            }
        }
    }

    public _getItemName(item: any) {
        let name = item.name;

        if (!this._projectId) {
            // Make sure we don't pass an 'undefined' tabId to the map
            const tabId = this._selectedTab || "";

            if (this._nameCountMap[tabId][item.name] > 1) {
                name += " (" + item.project.name + ")";
            }
        }

        return name;
    }

    // Provide a special tooltip to distinguish a Tfvc repository.  Example: "$/MyProject (Team Foundation Version Control)"
    protected _getItemTooltip(item: any, defaultTooltip?: string): string {
        return (item && item === this._options.tfvcRepository) ? Utils_String.format(VCResources.GitRepositorySelectorTfvcTooltip, item.name) : defaultTooltip;
    }

    // Provide optional icons to better distinguish Tfvc and Git repositories, as well as forks.
    protected _getItemIconClass(item: any): string {
        if (item && this._options.tfvcRepository && item.name === this._options.tfvcRepository.name) {
            return "bowtie-icon bowtie-tfvc-repo";
        }

        if (item && item.isFork) {
            return "bowtie-icon bowtie-git-fork"; // this is a fork
        }

        return "bowtie-icon bowtie-git"; // default to git repo
    }

    /**
     * Executed when the user clicks Enter when there are no items that match the search text.
     * Overridden so if on the Favorites tab, clicking Enter takes the user to the All Repositories tab for the full list.
     */
    public _onEmptyListSearchEnterClick() {
        if (this._selectedTab === TabIds.Favorites) {
            const searchText: string = this.getSearchText();
            this.selectTab(TabIds.All);
            this.setSearchText(searchText);
        }
    }

    /** Override onItemSelected to publish telemetry */
    public _onItemSelected(item: any) {
        this._selectedItem = item;
        this.publishCIforRepositoryActions(CustomerIntelligenceConstants.GITREPOSITORYSELECTOR_REPO_SELECTED);
        super._onItemSelected(item);
    }

    public clearInput() {
        this._lastTabId = "";
        this._searchText = "";
        super.clearInput();
    }

    protected onSearchTextChanged() {
        this._lastTabId = this._selectedTab;
        this._searchText = this.getSearchText();
        super.onSearchTextChanged();
    }

    /**
     * Overridden onTabSelected to apply the same search text between Favorites and All Repositories tabs.
     */
    protected onTabSelected(tabId: string) {
        super.onTabSelected(tabId);

        if (this._lastTabId !== tabId) {
            this.setSearchText(this._searchText);
        }
    }

    public _beginGetListItems(tabId: string, callback: (items: any[]) => void) {
        if ($.isFunction(this._options.beginGetListItems)) {
            this._options.beginGetListItems(tabId, callback);
        }
        else if (!tabId || tabId === TabIds.All) {
            const gitClient = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<GitClientService>(GitClientService);
            if (this._projectId) {
                gitClient.beginGetProjectRepositories(this._projectId, (repositories: VCContracts.GitRepository[]) => {
                    repositories.sort((repository1: VCContracts.GitRepository, repository2: VCContracts.GitRepository) => {
                        return Utils_String.localeIgnoreCaseComparer(repository1.name, repository2.name);
                    });
                    if (this._options.tfvcRepository) {
                        repositories = repositories.slice(0);
                        repositories.unshift(<VCContracts.GitRepository>this._options.tfvcRepository);
                    }
                    this._totalRepositoriesCount = repositories.length;
                    callback.call(this, repositories);
                });
            }
            else {
                gitClient.beginGetAllRepositories((repositories: VCContracts.GitRepository[]) => {
                    repositories.sort((repository1: VCContracts.GitRepository, repository2: VCContracts.GitRepository) => {
                        return Utils_String.localeIgnoreCaseComparer(repository1.name, repository2.name);
                    });
                    this._totalRepositoriesCount = repositories.length;
                    callback.call(this, repositories);
                });
            }
        }
        else if (tabId === TabIds.Favorites) {
            if (this._myFavoriteStore) {
                callback.call(this, this._getFavoriteListItems());
            }
            else {
                const level = TFS_Host_TfsContext.NavigationContextLevels.Project;
                TFS_OM_Common.FavoriteStore.beginGetFavoriteStore(this._options.tfsContext, level, null, TFS_OM_Common.FavoriteStore.FAVORITE_STORE_SCOPE_FAVORITE_VC_REPOSITORIES, "Repository Favorites", false, (favStore: TFS_OM_Common.FavoriteStore) => {
                    this._myFavoriteStore = favStore;
                    const favoriteRepositories = this._getFavoriteListItems();
                    callback.call(this, favoriteRepositories);
                    this._validateFavorites();

                    if (favoriteRepositories.length === 0) {
                        // If no favorites to show, then switch to the All tab asynchronously to ensure the filteredList content area is fully initialized.
                        setTimeout(() => {
                            this.selectTab(TabIds.All);
                        }, 10);
                    }
                });
            }
        }
    }

    private _isGitRepositoryType(favoriteItem: TFS_OM_Common.FavoriteItem): boolean {
        return favoriteItem.type === TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_GIT_REPOSITORY ||
            favoriteItem.type === TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_GIT_REPOSITORY_FORK;
    }

    private _getFavoriteListItems(): IRepositoryFavorite[] {
        const favoriteRepositories: IRepositoryFavorite[] = [];
        let tfvcRepo: IRepositoryFavorite;

        this._myFavoriteStore.children.forEach((favoriteItem: TFS_OM_Common.FavoriteItem) => {

            if (favoriteItem.name && favoriteItem.data) {
                const favoriteRepo = <IRepositoryFavorite>{
                    id: favoriteItem.data,
                    name: favoriteItem.name,
                    isFork: favoriteItem.type === TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_GIT_REPOSITORY_FORK,
                    project: {
                        id: this._projectId,
                    },
                };
                if (favoriteItem.type === TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_TFVC_REPOSITORY) {
                    tfvcRepo = favoriteRepo;
                }
                else if (this._isGitRepositoryType(favoriteItem) && !favoriteItem.artifactIsDeleted) {
                    favoriteRepositories.push(favoriteRepo);
                }
            }
        });

        favoriteRepositories.sort((repository1: IRepositoryFavorite, repository2: IRepositoryFavorite) => {
            return Utils_String.localeIgnoreCaseComparer(repository1.name, repository2.name);
        });

        if (tfvcRepo && this._options.tfvcRepository) {
            favoriteRepositories.unshift(tfvcRepo);
        }

        return favoriteRepositories;
    }

    /**
     * Validate the favorite repository items against the collection of actual project repositories, and update in case of renames or deletes/accessibility.
     */
    private _validateFavorites() {
        if (this._myFavoriteStore.children.length > 0) {
            const gitClient = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<GitClientService>(GitClientService);
            gitClient.beginGetProjectRepositories(this._projectId, (repositories: VCContracts.GitRepository[]) => {
                const reposById: { [id: string]: VCContracts.GitRepository } = {};
                const favoritesToUpdate: TFS_OM_Common.FavoriteItem[] = [];

                repositories.forEach((repository: VCContracts.GitRepository) => {
                    reposById[repository.id] = repository;
                });
                this._totalRepositoriesCount = repositories.length;

                // Validate against the optional Tfvc repository name, but only update the total count if it is actually included.
                if (this._options.tfsContext && this._options.tfsContext.navigation && this._options.tfsContext.navigation.project) {
                    reposById["$/"] = <VCContracts.GitRepository>{ name: "$/" + this._options.tfsContext.navigation.project };
                    if (this._options.tfvcRepository) {
                        this._totalRepositoriesCount++;
                    }
                }

                this._myFavoriteStore.children.forEach((favoriteItem: TFS_OM_Common.FavoriteItem) => {
                    const repository = reposById[favoriteItem.data];

                    // The repository has been deleted or the user no longer has access.  
                    // Omit from view, and note the underlying artifact was deleted  (Allowing account favorite page to show a dismissable warning about these items)
                    // Do not remove the Tfvc repository favorite since there may be cases where it isn't shown depending on the repo picker context.
                    if (!repository && favoriteItem.type !== TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_TFVC_REPOSITORY) {
                        if (!favoriteItem.artifactIsDeleted) {
                            favoriteItem.artifactIsDeleted = true;
                            favoritesToUpdate.push(favoriteItem);
                        }
                    }
                    // The repository (or project for Tfvc) has been renamed.  Update the favorite name locally, and asynch on server.
                    else if (favoriteItem.name !== repository.name) {
                        favoriteItem.name = repository.name;
                        favoritesToUpdate.push(favoriteItem);
                    }
                });
                if (favoritesToUpdate.length) {
                    this._myFavoriteStore.beginUpdateItems(favoritesToUpdate, () => { });
                    this._clearCachedItems(TabIds.Favorites);
                    this.updateFilteredList(TabIds.Favorites);
                }
            });
        }
    }

    /**
     * returns true if the given repository item is a user's favorite.
     */
    protected _getItemIsFavorite(item: any): boolean {
        const data = this._getFavoriteId(item);
        return !!(data && this._myFavoriteStore.findByData(data));
    }

    /**
     * set or unset the given repository item as a user's favorite.
     */
    protected _setItemIsFavorite(item: any, makeFavorite: boolean) {
        makeFavorite ? this._addToFavorites(item) : this._removeFromFavorites(item);
    }

    private _addToFavorites(gitRepository: VCContracts.GitRepository) {
        const data = this._getFavoriteId(gitRepository);
        if (data && !this._myFavoriteStore.findByData(data)) {
            let favoriteType = (data === "$/") ? TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_TFVC_REPOSITORY : TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_GIT_REPOSITORY;
            if (favoriteType === TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_GIT_REPOSITORY){
                if (gitRepository.isFork){
                    favoriteType = TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_GIT_REPOSITORY_FORK;
                }
            }
            this._myFavoriteStore.beginCreateNewItem(gitRepository.name, favoriteType, data, () => {
                this._clearCachedItems(TabIds.Favorites);
                this.publishCIforRepositoryActions(CustomerIntelligenceConstants.GITREPOSITORYSELECTOR_REPO_FAVORITED);
            });
        }
    }

    private _removeFromFavorites(gitRepository: VCContracts.GitRepository) {
        const favoriteItem = this._getFavoriteItem(gitRepository);
        if (favoriteItem) {
            this._myFavoriteStore.remove(favoriteItem); // immediately update locally
            favoriteItem.beginDelete(() => {
                this.publishCIforRepositoryActions(CustomerIntelligenceConstants.GITREPOSITORYSELECTOR_REPO_UNFAVORITED);
            });
            this._clearCachedItems(TabIds.Favorites);
        }
    }

    private _getFavoriteItem(repositoryFavorite: IRepositoryFavorite): TFS_OM_Common.FavoriteItem {
        const data = this._getFavoriteId(repositoryFavorite);
        return this._myFavoriteStore.findByData(data);
    }

    /**
     * For Git, returns the gitRepository Id.
     * For Tfvc, returns "$/".  There is either 0 or 1 Tfvc repo favorites at the project scope, and the actual name could change.
     */
    private _getFavoriteId(gitRepository: VCContracts.GitRepository | IRepositoryFavorite): string {
        const isTfvc = gitRepository.name.indexOf("$/") === 0;
        return isTfvc ? "$/" : gitRepository.id;
    }

    /** Publish customer intelligence data when an a repository is selected or favorited/unfavortied, along with other context. */
    private publishCIforRepositoryActions(repositoryAction: string) {
        const ci = this._options.customerIntelligenceData ? (this._options.customerIntelligenceData as CustomerIntelligenceData).clone() : new CustomerIntelligenceData();
        const selectedTab = this._selectedTab || "";
        const favoritesEnabled = !!this._myFavoriteStore;
        const favoritesCount = favoritesEnabled ? this._myFavoriteStore.children.length : 0;
        ci.properties[CustomerIntelligenceConstants.GITREPOSITORYSELECTOR_FAVORITE_REPOS_ENABLED] = favoritesEnabled;
        ci.properties[CustomerIntelligenceConstants.GITREPOSITORYSELECTOR_ALL_REPOS_COUNT] = this._totalRepositoriesCount;
        ci.properties[CustomerIntelligenceConstants.GITREPOSITORYSELECTOR_FAVORITE_REPOS_COUNT] = favoritesCount;

        // Publish with the selected tab as the ActionSource, and publish immediately if the action is a repo selection that causes a page navigation.
        ci.publish(repositoryAction, false, selectedTab + "Tab", repositoryAction === CustomerIntelligenceConstants.GITREPOSITORYSELECTOR_REPO_SELECTED);
    }

    
    public invalidateRepositories = (projectInfo: VCContracts.VersionControlProjectInfo, tfvcRepository: VCContracts.GitRepository): void => {
        this._projectId = projectInfo.project.id;
        this._options.tfvcRepository = tfvcRepository;
        this._clearCachedItems();
        this.updateFilteredList(TabIds.All);
        this.updateFilteredList(TabIds.Favorites);
        this.updateFilteredList(TabIds.Forks);
    }

}
VSS.classExtend(GitRepositorySelectorControl, TfsContext.ControlExtensions);

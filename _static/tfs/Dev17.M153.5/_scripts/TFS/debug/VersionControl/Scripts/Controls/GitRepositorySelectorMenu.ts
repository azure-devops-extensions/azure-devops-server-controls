/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Controls = require("VSS/Controls");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_FilteredListControl = require("Presentation/Scripts/TFS/FeatureRef/FilteredListControl");
import TFS_FilteredListDropdownMenu = require("Presentation/Scripts/TFS/FeatureRef/FilteredListDropdownMenu");
import { canUseFavorites } from "Favorites/FavoritesService";
import VCContracts = require("TFS/VersionControl/Contracts");
import { GitClientService } from "VersionControl/Scripts/GitClientService"
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { GitRepositorySelectorControl, GitRepositorySelectorControlOptions } from "VersionControl/Scripts/Controls/GitRepositorySelectorControl";

import TfsContext = TFS_Host_TfsContext.TfsContext;

export interface GitRepositorySelectorMenuOptions extends TFS_FilteredListDropdownMenu.IFilteredListDropdownMenuOptions {
    projectId: string,
    projectInfo: VCContracts.VersionControlProjectInfo,
    tfsContext?: TfsContext,
    initialRepositories?: VCContracts.GitRepository[],
    showRepositoryActions?: boolean,
    showFavorites?: boolean,
    tfvcRepository?: VCContracts.GitRepository,
    showItemIcons?: boolean,
    onDefaultRepositorySelected?: { (repository: VCContracts.GitRepository): void; }
}

export class GitRepositorySelectorMenu extends TFS_FilteredListDropdownMenu.FilteredListDropdownMenu {

    private _projectId: string;
    private _projectName: string;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            popupOptions: {
                elementAlign: "left-top",
                baseAlign: "left-bottom",
            },
            chevronClass: "bowtie-chevron-down-light",
            ariaDescribedByText: VCResources.GitRepositorySelectorDescribe,
            setMaxHeightToFitWindow: true,
        }, options));
    }

    public initialize() {
        super.initialize();

        this._element.addClass("vc-git-selector-menu");

        this._projectId = this._options.projectId;
        this._projectName = this._options.projectName;

        this.initializeSelectedRepository();

        this._getPopupEnhancement()._bind("action-item-clicked", () => {
            this._hidePopup();
        });

        // ARIA attributes.  Because of the complexity of the control, consider this a button that shows a dialog.
        this._element.attr("role") || this._element.attr("role", "button");
        this._getPopupEnhancement().getElement().attr("role", "dialog");
    }

    protected initializeSelectedRepository() {
        let gitClient: GitClientService;

        if (!this.getSelectedRepository()) {

            gitClient = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<GitClientService>(GitClientService);

            const getUserDefaultRepoForProject = (projectName) => {
                gitClient.beginGetUserDefaultRepository(projectName, (repository: VCContracts.GitRepository) => {
                    if (!this.getSelectedRepository()) {
                        if (repository) {
                            this.setSelectedItem(repository);

                            // Let the creator know that an initial repo item has been selected
                            this._options.onInitialSelectedItem && this._options.onInitialSelectedItem(repository);
                        }
                        else if (this._options.initialRepositories && this._options.initialRepositories.length) {
                            // Just pick the first repository if they were supplied. This will happen when the
                            // project specified by projectName uses TFVC.
                            this.setSelectedItem(this._options.initialRepositories[0]);
                        }
                        if (this._options.onDefaultRepositorySelected && this.getSelectedRepository()) {
                            this._options.onDefaultRepositorySelected.call(this, this.getSelectedRepository());
                        }
                    }
                });
            }

            if (this._projectName) {
                getUserDefaultRepoForProject(this._projectName);
            }
            else if (this._options.tfsContext.navigation.project) {
                getUserDefaultRepoForProject(this._options.tfsContext.navigation.project);
            }
            else {
                gitClient.beginGetAllRepositories((repositories: VCContracts.GitRepository[]) => {
                    if (!this.getSelectedRepository() && repositories.length && (!this._projectId || this._projectId === repositories[0].project.id)) {
                        this.setSelectedItem(repositories[0]);
                    }
                });
            }
        }
    }

    /**
     * It sets a project and selects the default repository for that project
     */ 
    public setProject(projectInfo: VCContracts.VersionControlProjectInfo, tfvcRepository: VCContracts.GitRepository) {

        // If the team project changed
        if (this._projectId !== projectInfo.project.id)
        {
            this._updateProjectInfo(projectInfo);
            this._options.tfvcRepository = tfvcRepository;

            if (!this._options.tfvcRepository)
            {
                let gitClient = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<GitClientService>(GitClientService);
                gitClient.beginGetUserDefaultRepository(this._projectName, (repository: VCContracts.GitRepository) => {
                    if (repository) 
                    {
                        this.setSelectedItem(repository);

                        // Let the creator know that a repo item has been selected
                        this._options.onItemChanged && this._options.onItemChanged(repository);
                    }
                });
            }
        
            this.invalidateRepositories();
        }
    }

    public invalidateRepositories(): void {
        if (this.gitRepositorySelectorControl) {
            this.gitRepositorySelectorControl.invalidateRepositories(this._options.projectInfo, this._options.tfvcRepository);
        }
    }

    private _updateProjectInfo(projectInfo: VCContracts.VersionControlProjectInfo)
    {
        this._options.projectId = projectInfo.project.id;
        this._options.projectName = projectInfo.project.name;
        this._options.projectInfo = projectInfo;
        this._projectId = this._options.projectId;
        this._projectName = this._options.projectName;
    }

    private get gitRepositorySelectorControl() {
        return this.getFilteredList() as GitRepositorySelectorControl;
    }

    public _createFilteredList($container: JQuery): TFS_FilteredListControl.FilteredListControl {
        return <GitRepositorySelectorControl>Controls.Enhancement.enhance
            (GitRepositorySelectorControl, $container, <GitRepositorySelectorControlOptions>{
                projectId: this._projectId,
                projectInfo: this._options.projectInfo,
                initialRepositories: this._options.initialRepositories,
                showRepositoryActions: this._options.showRepositoryActions,
                showFavorites: canUseFavorites() && this._options.showFavorites,
                tfvcRepository: this._options.tfvcRepository,
                showItemIcons: this._options.showItemIcons,
                tabNames: this._options.tabNames,
                beginGetListItems: this._options.beginGetListItems
            });
    }

    public _getItemIconClass(item: any): string {
        if (this._isTfvcItem(item)) {
            return "bowtie-icon bowtie-tfvc-repo";
        }

        if (this._isFork(item)) {
            return "bowtie-icon bowtie-git-fork";
        }

        return "bowtie-icon bowtie-git";
    }

    protected _getItemIconAriaLabel(item: any): string {
        return this._isTfvcItem(item) ? VCResources.GitRepositorySelectorTfvcRepository : VCResources.GitRepositorySelectorGitRepository;
    }

    public _getItemDisplayText(item: any): string {
        if (item) {
            return item.name;
        }
        else {
            return "";
        }
    }

    public _getItemTooltip(item: any): string {
        return this._isTfvcItem(item) ? Utils_String.format(VCResources.GitRepositorySelectorTfvcTooltip, item.name) : this._getItemDisplayText(item);
    }

    public getSelectedRepository(): VCContracts.GitRepository {
        return <VCContracts.GitRepository>this._getSelectedItem();
    }

    public setSelectedRepository(repository: VCContracts.GitRepository) {
            this.setSelectedItem(repository);
    }

    private _isTfvcItem(item: VCContracts.GitRepository): boolean {
        const tfvcRepository: VCContracts.GitRepository = this._options.tfvcRepository;
        return (item && tfvcRepository && Utils_String.equals(item.name, tfvcRepository.name, true));
    }

    private _isFork(item: VCContracts.GitRepository): boolean {
        return (item && item.isFork);
    }
}
VSS.classExtend(GitRepositorySelectorMenu, TfsContext.ControlExtensions);

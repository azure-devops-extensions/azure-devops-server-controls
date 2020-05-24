import * as Q from "q";

import * as Artifacts_Services from "VSS/Artifacts/Services";
import * as StoreBase from "VSS/Flux/Store";
import * as VSS_Service from "VSS/Service";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Date from "VSS/Utils/Date";

import { TeamProjectReference } from "TFS/Core/Contracts";
import * as Favorites_Contracts from "Favorites/Contracts";
import { IFavoritesActionsCreator } from "Favorites/Controls/FavoritesActionsCreator";
import { IFavoritesDataProvider } from "Favorites/Controls/FavoritesDataProvider";
import { FavoritesStore } from "Favorites/Controls/FavoritesStore";

import { ProjectActions } from "MyExperiences/Scenarios/Projects/Actions";
import { HubStoreBase } from "MyExperiences/Scenarios/Shared/HubStoreBase";
import { HubItemGroup, IHubItem, IHubGroupColumn, IHubHeaderProps } from "MyExperiences/Scenarios/Shared/Models";

import * as Contracts from "MyExperiences/Scenarios/Projects/Contracts";
import * as ProjectDataService from "MyExperiences/Scenarios/Projects/ProjectDataService";
import * as Errors from "MyExperiences/Scenarios/Shared/Alerts";
import { isOrgAccountSelectorEnabled } from "MyExperiences/Scenarios/Shared/OrgAccountSelectorFeatureAvailabilityCheckHelper";
import {
    TeamProjectLineItem,
    LoadingLineItem,
    NoAdditionalTeamsLineItem,
    ErrorFetchingTeamsLineItem,
    IProjectHubItem,
    TeamProjectColumns,
    MRUColumns
} from "MyExperiences/Scenarios/Projects/ProjectsLine";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import { MyExperiencesTelemetry } from "MyExperiences/Scripts/Telemetry";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants";
import { FavoriteAlerts } from "MyExperiences/Scenarios/Favorites/Alerts";

import { ProgressAnnouncer, ProgressAnnouncerOptions } from "VSS/Utils/Accessibility";

export class ProjectsStore extends HubStoreBase {

    private _mruList: Contracts.TeamProjectLineReference[];
    private _allList: Contracts.TeamProjectLineReference[];

    private _allProjectsListIsLoaded: boolean = false;
    private _allProjectsPromise: IPromise<void>;

    constructor(
        private _favoritesStore: FavoritesStore,
        private _favoritesActionsCreator: IFavoritesActionsCreator,
        private _favoritesDataProvider: IFavoritesDataProvider,
        private _projectDataService?: ProjectDataService.ProjectDataService
    ) {

        super(_getHeaderProps());
        
        this._allList = [];
        this._mruList = [];

        ProjectActions.GridRowExpanded.addListener(this._onGridRowExpanded);
        ProjectActions.GridRowCollapsed.addListener(this._onGridRowCollapsed);
        ProjectActions.PrepSearch.addListener(this._onPrepSearch);
        ProjectActions.MruItemRemoved.addListener(this._onMruItemRemoved);

        this._favoritesActionsCreator.getActions().FavoritingFailed.addListener(this._onFavoritingFailed);
        this._favoritesActionsCreator.getActions().UnfavoritingFailed.addListener(this._onUnfavoritingFailed);
    }

    public loadMruProjects(): void {
        this._mruList = this._getProjectDataService().getMostRecentlyUsed();
        this.emitRecentAndAllProjectsLists();
    }

    public loadAllProjectsList(): IPromise<void> {
        if (this._allProjectsPromise) {
            return this._allProjectsPromise;
        }

        const projectsPromise = this._getProjectDataService().getProjectList();

        this._allProjectsPromise = projectsPromise.then<void>((projects: Contracts.TeamProjectLineReference[]) => {
            this._allList = projects;
            this._allProjectsListIsLoaded = true;
            this.emitRecentAndAllProjectsLists();
        }, e => {
            // Clear the spinner
            this._allProjectsListIsLoaded = true;
            this.emitRecentAndAllProjectsLists();

            this.alert = Errors.createReloadPromptAlertMessage(MyExperiencesResources.Projects_LoadProjectsError);
            throw e;
        });

        return this._allProjectsPromise;
    }

    public emitRecentAndAllProjectsLists(): void {
        let groups: HubItemGroup<IHubItem>[] = [];

        const mruGroup = this._createGroup(this._mruList, MyExperiencesResources.Projects_RecentHeader, MRUColumns);
        const allGroup = this._createGroup(this._allList, MyExperiencesResources.Projects_AllHeader, TeamProjectColumns);

        allGroup.isLoading = !this._allProjectsListIsLoaded;

        this.groups = [mruGroup, allGroup];
    }

    protected preFilter(): void {
        if (this._allProjectsPromise) {
            let projectService = this._getProjectDataService();

            // Set groups to loading Results group
            let loadingGroup = this._createGroup([], MyExperiencesResources.ProjectsSearchResultsTitle, TeamProjectColumns);
            loadingGroup.isLoading = true;
            this.groups = [loadingGroup];

            // Fetch all projects and teams
            this._allProjectsPromise
                .then(() => projectService.myTeamsAndProjectsForSearch())
                .then((references: Contracts.TeamProjectLineReference[]) => {
                    this.alert = null; // Clear error
                    references.forEach((references: Contracts.TeamProjectLineReference) => {
                        references.level = 0;
                        references.isExpanded = false;
                        references.isExpandable = false;
                    });

                    this.groups = [this._createGroup(references, MyExperiencesResources.ProjectsSearchResultsTitle, TeamProjectColumns)]
                }, e => {
                    loadingGroup.isLoading = false; // Hide spinner
                    this.alert = Errors.createReloadPromptAlertMessage(MyExperiencesResources.Projects_LoadSearchResultsError);
                    throw e;
                });
        }
    }

    protected postFilter(): void {
        this.emitRecentAndAllProjectsLists();
    }

    private _unloadTeamsForProject(project: Contracts.TeamProjectLineReference, projectIndex: number): void {
        let before = this._allList.slice(0, projectIndex + 1);
        let newData: Contracts.TeamProjectLineReference[] = [];
        Utils_Array.addRange(newData, before);

        let after = this._allList.length === projectIndex + 1 ? [] : this._allList.slice(projectIndex + 1);

        after.forEach((value: Contracts.TeamProjectLineReference) => {
            if (value.level == 0 || value.parent.projectId !== project.projectId) {
                Utils_Array.add(newData, value);
            }
        });

        this._allList = newData;

        this.emitRecentAndAllProjectsLists();

        MyExperiencesTelemetry.LogProjectExpandToggle(false, before.length - after.length);
    }

    private _loadTeamsForProject(project: Contracts.TeamProjectLineReference, projectIndex: number): void {
        // Add loading row
        let placeHolderLine: Contracts.TeamProjectLineReference = <any>{
            parent: project,
            level: 1,
            type: Contracts.ProjectHubItemTypes.Loading
        };
        this._allList.splice.call(this._allList, this._allList.indexOf(project) + 1, 0, placeHolderLine);

        this.emitRecentAndAllProjectsLists();

        const teams = this._getProjectDataService().getTeamsForProject(project.projectId);
        ProgressAnnouncer.forPromise(
            teams,
            {
                announceStartMessage: MyExperiencesResources.Projects_Announce_LoadingTeams,
                announceEndMessage: MyExperiencesResources.Projects_Announce_LoadedTeams,
            } as ProgressAnnouncerOptions);

        teams.then((references: Contracts.TeamProjectLineReference[]) => {
            // Remove toggle if there's no teams
            if (references) {
                references.forEach((reference: Contracts.TeamProjectLineReference) => {
                    reference.parent = project;
                });

                // Show empty teams entry
                if (references.length === 0) {
                    placeHolderLine.type = Contracts.ProjectHubItemTypes.NoAdditionalTeams;
                }
                // Replace the placeholder row with teams but only if the project row is still expanded
                else if (project.isExpanded) {
                    this._allList.splice.call(this._allList, this._allList.indexOf(project) + 1, 1, ...references);
                }

                MyExperiencesTelemetry.LogProjectExpandToggle(true, references.length);
            }

            this.emitRecentAndAllProjectsLists();
        }, e => {
            // Show error entry
            placeHolderLine.type = Contracts.ProjectHubItemTypes.ErrorFetchingTeams;
            this.emitRecentAndAllProjectsLists();
            throw e;
        });
    }

    private _createGroup(source: Contracts.TeamProjectLineReference[], type: string, columns: IHubGroupColumn<IProjectHubItem>[]): HubItemGroup<IProjectHubItem> {
        let group = new HubItemGroup<IProjectHubItem>(type, type, [], columns);

        if (source) {
            source.forEach(lineRef => {
                let lineItem: IProjectHubItem;

                switch (lineRef.type) {
                    case Contracts.ProjectHubItemTypes.TeamProject:
                        lineItem = new TeamProjectLineItem(this._favoritesStore, this._favoritesActionsCreator, this._favoritesDataProvider, lineRef);
                        break;
                    case Contracts.ProjectHubItemTypes.Loading:
                        lineItem = new LoadingLineItem(this._favoritesStore, this._favoritesActionsCreator, this._favoritesDataProvider);
                        break;
                    case Contracts.ProjectHubItemTypes.NoAdditionalTeams:
                        lineItem = new NoAdditionalTeamsLineItem(this._favoritesStore, this._favoritesActionsCreator, this._favoritesDataProvider);
                        break;
                    case Contracts.ProjectHubItemTypes.ErrorFetchingTeams:
                        lineItem = new ErrorFetchingTeamsLineItem(this._favoritesStore, this._favoritesActionsCreator, this._favoritesDataProvider);
                        break;
                }

                group.items.push(lineItem);
            });
        }

        return group;
    }

    private _getProjectDataService(): ProjectDataService.ProjectDataService {
        if (!this._projectDataService) {
            this._projectDataService = VSS_Service.getLocalService(ProjectDataService.ProjectDataService);
        }

        return this._projectDataService;
    }

    private _onGridRowExpanded = (data) => {
        let project: Contracts.TeamProjectLineReference = null;
        let projectIndex = -1;
        this._allList.forEach((value, index) => {
            if (value.key === data.key) {
                project = value;
                projectIndex = index;
            }
        });
        project.isExpanded = true;
        this._loadTeamsForProject(project, projectIndex);
    }

    private _onGridRowCollapsed = (data) => {
        let project: Contracts.TeamProjectLineReference = null;
        let projectIndex = -1;
        this._allList.forEach((value, index) => {
            if (value.key === data.key) {
                project = value;
                projectIndex = index;
            }
        });
        project.isExpanded = false;
        this._unloadTeamsForProject(project, projectIndex);
    }

    private _onPrepSearch = () => {
        let projectService = this._getProjectDataService();
        if (!projectService.areAllTeamsLoaded()) {
            // Start loading the teams for search
            projectService.myTeamsAndProjectsForSearch();
        }
    }

    private _onMruItemRemoved = (item) => {
        // Proactively remove the item regardless of server call outcome so the UI is responsive
        this._mruList = this._mruList.filter(x => x.key !== item.key);
        this.emitRecentAndAllProjectsLists();

        let projectService = this._getProjectDataService();
        projectService.removeItemFromMru(item.hashCode)
            .then(() => { }, () => {
                // If the server call fails, display a message to the user (note that the item will have already been removed from the page)
                this.alert = Errors.createReloadPromptAlertMessage(MyExperiencesResources.Projects_RemoveFromMruFailed);
            });
    }

    private _onFavoritingFailed = () => {
        this.alert = FavoriteAlerts.favoriteFailed;
    }

    private _onUnfavoritingFailed = () => {
        this.alert = FavoriteAlerts.unfavoriteFailed;
    }
}

function _getHeaderProps(): IHubHeaderProps {
    const headerProps: IHubHeaderProps = {
        title: MyExperiencesResources.Projects_HeaderTitle,
        filter: {
            watermark: MyExperiencesResources.Projects_SearchWatermark,
        },
        button: {
            text: MyExperiencesResources.Projects_CreateProjectButtonText
        },
        isOrganizationInfoAndCollectionPickerEnabled: isOrgAccountSelectorEnabled()
    };

    return headerProps;
}

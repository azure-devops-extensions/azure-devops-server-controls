import Q = require("q");
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import * as Service from "VSS/Service";
import * as Settings from "VSS/Settings";
import { WebPageDataService } from "VSS/Contributions/Services";
import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

import { FavoriteStorageScopes } from "Favorites/Constants";
import { Favorite } from "Favorites/Contracts";
import { IFavoritesService, FavoritesService } from "Favorites/FavoritesService";

import * as Core_RestClient from "TFS/Core/RestClient";
import { WebApiTeam, TeamContext} from "TFS/Core/Contracts";
import * as TFS_Rest_Utils from "Presentation/Scripts/TFS/TFS.Rest.Utils";

import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import { FavoriteTypes } from "TfsCommon/Scripts/Favorites/Constants";

import { Dashboard, DashboardGroup, DashboardGroupEntry } from "TFS/Dashboards/Contracts";
import * as Dashboards_RestClient from "TFS/Dashboards/RestClient";
import { DashboardPageExtension, DashboardHttpClientFactory } from "Dashboards/Scripts/Common";
import { DashboardUrlParams } from "Dashboards/Scripts/Generated/Constants";
import * as TFS_Dashboards_Resources from "Dashboards/Scripts/Resources/TFS.Resources.Dashboards";
import { LocalStorageKey } from "Dashboards/Components/Constants";
import { DashboardProviderPropertyBagNames } from "Dashboards/Scripts/Generated/Constants";
import { IExtendedFavorite } from "Dashboards/Components/Directory/Contracts";
import { DashboardItem, TeamScope } from "Dashboards/Components/Shared/Contracts";
import { DataConstants } from "Dashboards/Components/Constants";
import { DashboardsDataService } from "Dashboards/Components/Shared/DashboardsDataService";

export class DashboardsDataManager extends TfsService {
    public clearLocalDashboardCache(): void {
        const dataSvc = Service.getService(DashboardsDataService);
        dataSvc.clearLocalDashboardCache();
    }

    public getDashboardsForAllTeamsInProject(projectId: string): IPromise<DashboardItem[]> {
        const dataSvc = Service.getService(DashboardsDataService);
        return dataSvc.getDashboardsForAllTeamsInProject(projectId);
    }

    public getDashboardsFromMyTeamsInProject(projectId: string): IPromise<DashboardItem[]> {
        let teamMemberships = DashboardPageExtension.getTeamsMembersOf();
        let dashboardsClient = Dashboards_RestClient.getClient();
        let dashboardPromises: IPromise<DashboardGroup>[] = [];
        let dashboards: DashboardItem[] = [];

        // this is expectedly non performant. We need to create a seperate rest api to get this data from the dashboards service.
        return teamMemberships.then((teams: WebApiTeam[]) => {
            teams.forEach((team: WebApiTeam) => {
                let promise = dashboardsClient.getDashboards(
                    {
                        project: projectId,
                        projectId: projectId,
                        team: team.id,
                        teamId: team.id
                    });

                promise.then((group: DashboardGroup) => {
                    group.dashboardEntries.forEach((entry: DashboardGroupEntry) => {
                        // we can evaluate if we need a translation layer to convert from web contract to hub contract.
                        let item: DashboardItem = { dashboard: entry } as DashboardItem;
                        item.teamScope = { teamName: team.name, teamId: team.id };
                        dashboards.push(item);
                    });
                });

                dashboardPromises.push(promise);
            });

            return Q.all(dashboardPromises).then(() => {
                Utils_Array.sortIfNotSorted(dashboards,
                    (a: DashboardItem, b: DashboardItem) => {
                        return Utils_String.localeIgnoreCaseComparer(a.dashboard.name, b.dashboard.name);
                    });
                return dashboards;
            });
        });        
    }

    public getExpansionStateFromCache(teamIds: string[]): IDictionaryStringTo<boolean> {
        let expansionStates = {};
        teamIds.push(DataConstants.SentinelTeam);

        teamIds.forEach((teamId) => {
            expansionStates[teamId] = Service.
                getLocalService(Settings.LocalSettingsService).
                read<boolean>(Utils_String.format(
                    LocalStorageKey.GroupToggleStateFormat, teamId, null));
        });

        if (expansionStates[DataConstants.SentinelTeam] == null) {
            expansionStates[DataConstants.SentinelTeam] = true;
        }

        return expansionStates;
    }

    public saveChoiceCollapsed(groupId: string): void {
        Service.getLocalService(Settings.LocalSettingsService).write(Utils_String.format(LocalStorageKey.GroupToggleStateFormat, groupId), false);
    }

    public saveChoiceExpanded(groupId: string): void {
        Service.getLocalService(Settings.LocalSettingsService).write(Utils_String.format(LocalStorageKey.GroupToggleStateFormat, groupId), true);
    }

    public getFavorites(projectId: string): IPromise<IExtendedFavorite[]> {
        const favoritesService = Service.getService<FavoritesService>(FavoritesService);
        const favoritesPromise: IPromise<Favorite[]> = favoritesService.getFavorites(FavoriteTypes.DASHBOARD, FavoriteStorageScopes.Project, projectId, true);
        const dashboardsPromise: IPromise<DashboardItem[]> = this.getDashboardsForAllTeamsInProject(projectId);

        return Q.all([favoritesPromise, dashboardsPromise]).spread((favorites: Favorite[], dashboards: DashboardItem[]) => {
            let extendedFavorites: IExtendedFavorite[] = [];

            Utils_Array.sortIfNotSorted(favorites, (a, b) => {
                return Utils_String.localeIgnoreCaseComparer(a.artifactName, b.artifactName);
            });

            favorites.forEach((favorite: Favorite) => {
                if (!favorite.artifactIsDeleted) {
                    let extendedFavorite: IExtendedFavorite = {
                        favorite: favorite,
                        dashboardItem: Utils_Array.first(dashboards, (item) => item.dashboard.id === favorite.artifactId)
                    };

                    extendedFavorites.push(extendedFavorite);
                }
            });

            return extendedFavorites;
        });
    }

    public deleteDashboard(dashboardId: string, teamContext: TeamContext): IPromise<void> {
        return DashboardHttpClientFactory.getClient().deleteDashboard(teamContext, dashboardId);
    }
}
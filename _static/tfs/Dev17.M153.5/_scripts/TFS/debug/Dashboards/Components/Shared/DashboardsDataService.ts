import * as Utils_Array from "VSS/Utils/Array";
import * as Service from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";
import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";

import { Dashboard } from "TFS/Dashboards/Contracts";
import { DashboardProviderPropertyBagNames } from "Dashboards/Scripts/Generated/Constants";
import { DashboardItem, TeamScope } from "Dashboards/Components/Shared/Contracts";

export interface SecuredTeam {
    value: { 
        id: string;
        name: string;
    };
}

export class DashboardsDataService extends TfsService {
    private dataLoaded: IPromise<DashboardItem[]>;

    private getDataProviderLoadedPromise(projectId: string): IPromise<any> {
        const dataSvc = Service.getService(WebPageDataService);
        const dashboardsContribution = {
            id: DashboardProviderPropertyBagNames.DashboardDirectoryData,
            properties: {
                "serviceInstanceType": ServiceInstanceTypes.TFS,
                pageSource: {
                    project: {
                        id: projectId
                    }
                }
            }
        } as Contributions_Contracts.Contribution;
        const teamsContribution = {
            id: DashboardProviderPropertyBagNames.TeamList,
            properties: {
                "serviceInstanceType": ServiceInstanceTypes.TFS
            }
        } as Contributions_Contracts.Contribution
        return dataSvc.ensureDataProvidersResolved([dashboardsContribution, teamsContribution], true);
    }

    public clearLocalDashboardCache(): void {
        this.dataLoaded = null;
    }

    public getDashboardsForAllTeamsInProject(projectId: string): IPromise<DashboardItem[]> {

        if (!this.dataLoaded) {
            this.dataLoaded = this.getDataProviderLoadedPromise(projectId).then(() => {
                const dataSvc = Service.getService(WebPageDataService);
                let dashboards = dataSvc.getPageData<Dashboard[]>(DashboardProviderPropertyBagNames.DashboardDirectoryData);
                let teams = dataSvc.getPageData<SecuredTeam[]>(DashboardProviderPropertyBagNames.TeamList);
                return this.joinTeamsToDashboards(teams, dashboards);
            });
        }

        return this.dataLoaded;
    }

    private joinTeamsToDashboards(teams: SecuredTeam[], dashboards: Dashboard[]): DashboardItem[] {
        let dashboardItems: DashboardItem[] = [];
        dashboards.forEach((dashboard: Dashboard) => {
            let item = this.createDashboardItem(dashboard);
            const teamFound = Utils_Array.first(teams, team => team.value.id == item.teamScope.teamId);

            // note that we only add dashboards which owners can be mapped to.
            // this is being done because deleting a team doesn't delete the dashboards
            // and we dont filter these cases for project scoped dashboards when sending down
            // the wire.
            if (teamFound) {
                item.teamScope.teamName = teamFound.value.name;
                dashboardItems.push(item);
            }
        });

        return dashboardItems;
    }

    private createDashboardItem(dashboard: Dashboard): DashboardItem {
        let item = { dashboard: dashboard } as DashboardItem;
        item.teamScope = {} as TeamScope;
        item.teamScope.teamId = item.dashboard.ownerId;
        return item;
    }

}
import * as Service from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";

export class TeamsDataProviderHelper {

    constructor() {
        // Get page data from the data provider
        const pageDataService = Service.getService(WebPageDataService);
        this._pageData = pageDataService.getPageData<IProjectTeamsData>(this.teamsDataProviderId);
    }

    public getDefaultTeam(): ITeam {
        return this._pageData ? this._pageData.defaultTeam: undefined;
    }

    public getAllTeams(): ITeam[] {
        return this._pageData ? this._pageData.allTeams: undefined;
    }

    public isDataProviderExists(): boolean {
        return this._pageData ? true : false;
    }

    private readonly teamsDataProviderId: string = "ms.vss-test-web.test-teams-data-provider";
    private _pageData: IProjectTeamsData;
}

export interface ITeam {
    id: string;
    name: string;
}

export interface IProjectTeamsData {
    defaultTeam: ITeam;
    allTeams: ITeam[];
}
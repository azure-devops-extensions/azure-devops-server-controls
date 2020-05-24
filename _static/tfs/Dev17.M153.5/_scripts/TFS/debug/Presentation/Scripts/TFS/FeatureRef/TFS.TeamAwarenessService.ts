import { ITeamSettings, TeamService } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ITeamFoundationIdentityData } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { WebPageDataService } from "VSS/Contributions/Services";
import { Debug } from "VSS/Diag";
import { getService, VssService } from "VSS/Service";
import { equals } from "VSS/Utils/String";

export const TeamSettingsContributionId = "ms.vss-work-web.team-wit-settings-data-provider";

export interface ITeamAwarenessService {
    /**
     * Gets a list of team members on the team.
     *
     * @param teamId
     * @param includeGroups Indicates if groups should be included in the result.
     * @param maxResults Maximum number of team members to include in the result.
     * @param callback Function invoked when the team members have been retrieved successfully.
     * @param errorCallback OPTIONAL: Function called when an error has occurred.
     */
    beginGetTeamMembers(teamId: string, includeGroups: boolean, maxResults: number): Promise<ITeamFoundationIdentityData[]>;

    /**
     * Loads the team settings.  If they have not already been loaded or are not
     * in a data island on the page, then will be retrieved from the server.
     */
    beginGetTeamSettings(teamId: string): Promise<ITeamSettings>;

    /**
     * Returns the the team settings if they have already been loaded or are in
     * a data island of the page.
     */
    getTeamSettings(teamId: string): ITeamSettings;
}

export class TeamAwarenessService extends VssService implements ITeamAwarenessService {
    public static contextSupports(context: TfsContext): boolean {
        return context && context.currentTeam && !!context.currentTeam.identity.id;
    }

    private _teamSettingsById: IDictionaryStringTo<ITeamSettings> = {};

    /**
     * Gets a list of team members on the team.
     *
     * @param teamId Id of the team you want to get the members for
     * @param includeGroups Indicates if groups should be included in the result.
     * @param maxResults Maximum number of team members to include in the result.
     */
    public beginGetTeamMembers(teamId: string, includeGroups: boolean, maxResults: number): Promise<ITeamFoundationIdentityData[]> {
        Debug.assertParamIsBool(includeGroups, "includeGroups");
        Debug.assertParamIsNumber(maxResults, "maxResults");

        return new Promise((resolve, reject) => getService(TeamService, this.getWebContext()).beginGetTeamMembers(teamId, includeGroups, maxResults, resolve, reject));
    }

    /**
     * Loads the team settings.  If they have not already been loaded or are not
     * in a data island on the page, then will be retrieved from the server.
     *
     * @param teamId Id of the team you want to get the settings for
     */
    public beginGetTeamSettings(teamId: string): Promise<ITeamSettings> {
        const webPageDataService = getService(WebPageDataService, this.getWebContext());
        const teamSettingsData: ITeamSettings = webPageDataService.getPageData(TeamSettingsContributionId);
        if (teamSettingsData && equals(teamSettingsData.teamId, teamId, true)) {
            return Promise.resolve(teamSettingsData);
        }

        return webPageDataService.getDataAsync(TeamSettingsContributionId, null, { teamId })
            .then((teamSettings: ITeamSettings) => {
                Debug.assert(equals(teamSettings && teamSettings.teamId, teamId, true), "Retrieved teamSettings teamId does not match what was requested");

                this._teamSettingsById[teamSettings.teamId] = teamSettings;
                return teamSettings;
            });
    }

    public getTeamSettings(teamId: string): ITeamSettings {
        const webPageDataService = getService(WebPageDataService, this.getWebContext());
        const teamSettings: ITeamSettings = webPageDataService.getPageData(TeamSettingsContributionId);
        if (teamSettings && equals(teamSettings.teamId, teamId, true)) {
            this._teamSettingsById[teamSettings.teamId] = teamSettings;
            return teamSettings;
        }

        if (this._teamSettingsById[teamId]) {
            return this._teamSettingsById[teamId];
        }

        const message = `Team settings for team ${teamId} not found in JSON island`;
        Debug.fail(message);
        throw new Error(message);
    }
}

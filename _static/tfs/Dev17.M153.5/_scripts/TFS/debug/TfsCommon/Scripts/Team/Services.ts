
import { Debug } from "VSS/Diag";
import { VssService } from "VSS/Service";
import { format } from "VSS/Utils/String";
import { getErrorMessage } from "VSS/VSS";
import { publishErrorToTelemetry } from "VSS/Error";
import { DataProviderQuery } from "VSS/Contributions/Contracts";
import { getDataProviderScope } from "VSS/Contributions/LocalPageData";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";

export interface ITeamPermissions {
    currentUserHasTeamPermission: boolean;
    currentUserHasTeamAdminPermission: boolean;
}

/**
* Service to return information about current users permission within team
*/
export class TeamPermissionService extends VssService {

    private _teamPermissions: IDictionaryStringTo<ITeamPermissions> = {};

    /**
     * Returns object with information about current users permissions within current team
     * 
     * @param projectId
     * @param teamId
     */
    public beginGetTeamPermissions(projectId: string, teamId: string): IPromise<ITeamPermissions> {
        const deniedPermissionsObj: ITeamPermissions = {
            currentUserHasTeamAdminPermission: false,
            currentUserHasTeamPermission: false
        };

        if (!projectId || !teamId) {
            Debug.fail("BeginGetTeamPermissions: Cannot fetch teamPermissions without projectId and teamId");
            return Promise.resolve(deniedPermissionsObj);
        }

        const key = this._getCacheKey(projectId, teamId);
        if (this._teamPermissions[key]) {
            // Return from cache
            return Promise.resolve(this._teamPermissions[key]);
        }
        else {
            const dataProviderId = "ms.vss-tfs.team-permissions-data-provider";

            // Specify project id in pagesource so that it will match the scope specified below
            const query: DataProviderQuery = {
                context: {
                    properties: {
                        pageSource: {
                            project: { id: projectId },
                            team: { id: teamId }
                        }
                    }
                },
                contributionIds: [dataProviderId]
            };

            const dataProviderScope = getDataProviderScope();

            // Set scope to projectid since projectid specified here might be different than the page projectid
            // In that case we should set scope to projectid to get security tracking enabled for this explicitly specified project
            // If scope name and value are null, no security tracking is applied (and not accessible by public)
            const scopeName = dataProviderScope.name;
            const scopeValue = dataProviderScope.value ? projectId : null;

            const contributionsClient = this.getConnection().getHttpClient(ContributionsHttpClient);
            return contributionsClient.queryDataProviders(query, scopeName, scopeValue)
                .then<ITeamPermissions>((contributionDataResult: DataProviderResult) => {

                    if (contributionDataResult.exceptions) {
                        // Async request failed with an exception, return false and don't cache this 
                        return deniedPermissionsObj;
                    }

                    const pageData: any = contributionDataResult.data[dataProviderId] || {};
                    const currentUserHasTeamAdminPermission = Boolean(pageData && pageData.permissions && pageData.permissions.CurrentUserHasTeamAdminPermission);
                    const currentUserHasTeamPermission = Boolean(pageData && pageData.permissions && pageData.permissions.CurrentUserHasTeamPermission);

                    this._teamPermissions[key] = <ITeamPermissions>{
                        currentUserHasTeamPermission: currentUserHasTeamPermission,
                        currentUserHasTeamAdminPermission: currentUserHasTeamAdminPermission
                    };

                    return this._teamPermissions[key];
                }, (error: Error) => {
                    error.name = format("{0}.QueryDataProvidersError", (error.name || ""));
                    error.message = "queryDataProviders() failed in TeamPermissionService.beginGetTeamPermissions: " + getErrorMessage(error);

                    publishErrorToTelemetry(error);

                    return deniedPermissionsObj;
                });
        }
    }

    private _getCacheKey(projectId: string, teamId: string): string {
        return `${(projectId).toLowerCase()}/${(teamId).toLowerCase()}`;
    }
}

/**
* Service to return information about the selected team for the page, specified through data provider data
*/
export class PageTeamService extends VssService {

    /**
     * Returns object with information about current users permissions within current team
     * 
     * @param featureName Feature name
     * @param callback 
     * Success callback, taking one parameter (boolean) - the feature availability state
     * 
     * @param errorCallback Error callback
     */
    public getPageTeam(): any {

    }
}

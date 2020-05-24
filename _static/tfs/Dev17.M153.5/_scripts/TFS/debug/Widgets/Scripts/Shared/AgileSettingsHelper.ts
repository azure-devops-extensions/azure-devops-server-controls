import Q = require("q");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import { getDefaultWebContext } from "VSS/Context";

/**
 * @class
 * A utility class to help load process configuration
 */
export class AgileSettingsHelper {

    public static getProjectProcessConfiguration(): IPromise<TFS_AgileCommon.ProjectProcessConfiguration> {
        var deferred = Q.defer<TFS_AgileCommon.ProjectProcessConfiguration>();

        TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<TFS_AgileCommon.ProjectProcessConfigurationService>(TFS_AgileCommon.ProjectProcessConfigurationService).beginGetProcessSettings(
            (processSettings: TFS_AgileCommon.ProjectProcessConfiguration) => {
                deferred.resolve(processSettings);
            },
            (e) => {
                deferred.reject(e);
            });

        return deferred.promise;
    }

    public static getTeamSettings(teamId?: string): IPromise<TFS_AgileCommon.ITeamSettings> {
        teamId = teamId || getDefaultWebContext().team.id;

        return TFS_OM_Common.ProjectCollection.getDefaultConnection().getService(TFS_TeamAwarenessService.TeamAwarenessService).beginGetTeamSettings(teamId);
    }
}

import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Diag = require("VSS/Diag");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");

/**
 * Provides client license enablement state of Web access features.
 */
export class FeatureLicenseService extends TFS_Service.TfsService {
    private _licenses: IDictionaryStringTo<number>;

    public static getDefaultService(tfsContext: TFS_Host_TfsContext.TfsContext): FeatureLicenseService {
        return Service.getApplicationService(FeatureLicenseService);
    }

    /**
     *  Checks if the feature is active
     *
     * @param requiredFeature  The license feature
     * @return  Returns the sate of license feature
     */
    public static isFeatureActive(requiredFeature: string): boolean {
        return this.getDefaultService(TFS_Host_TfsContext.TfsContext.getDefault()).getFeatureState(requiredFeature) >= TFS_Server_WebAccess_Constants.FeatureMode.Trial;
    }

    public getFeatureState(id: string): number {
        Diag.Debug.assertParamIsString(id, "id");

        return this._licenses && this._licenses[id.toLowerCase()];
    }

    constructor() {
        super();

        this._licenses = Utils_Core.parseJsonIsland($(document), ".feature-licenses", false);
        // Usually we clear the data island after copying it into cache, but in this case the Service
        // is used by two objects, and the cache is local to one object, so we need the data island
        // for both the objects.
    }
} 

import { BuildClientService } from "Build.Common/Scripts/ClientServices";

import * as Context from "VSS/Context";
import { VssConnection, getCollectionService } from "VSS/Service";

/**
 * @brief Helper utility methods for Build Sources
 * @returns
 */
export class BuildSourceHelper {
    private static _vssConnection: VssConnection;
    private static _buildClient: BuildClientService;

    /**
     * @returns build client to be used for communication with Build service
     */
    public static getBuildClient(): BuildClientService {
        if (!this._buildClient) {
            this._buildClient = this._getVssConnection().getService<BuildClientService>(BuildClientService);
        }

        return this._buildClient;
    }
    
    /**
     * @returns vssConnection object
     */
    private static _getVssConnection(): VssConnection {
        if (!this._vssConnection) {
            this._vssConnection = new VssConnection(Context.getDefaultWebContext());
        }
        return this._vssConnection;
    }
}

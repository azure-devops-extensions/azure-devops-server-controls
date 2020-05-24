import Q = require("q");
import PolicyService = require("Policy/Scripts/TFS.Policy.ClientServices");
import PolicyContracts = require("Policy/Scripts/Generated/TFS.Policy.Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import PolicyClientServices = require("Policy/Scripts/TFS.Policy.ClientServices");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import VSS = require("VSS/VSS");

import VSS_Service_NO_REQUIRE = require("VSS/Service");
import Build_RestClient_NO_REQUIRE = require("TFS/Build/RestClient");
import Build_Contracts_NO_REQUIRE = require("TFS/Build/Contracts");

export interface IBuildSource {
    queryBuildLink(buildId: number): IPromise<string>;
}

export class BuildSource implements IBuildSource {
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext) {
        this._tfsContext = tfsContext;
    }

    private _buildService: Build_RestClient_NO_REQUIRE.BuildHttpClient3;
    private _buildLinkCache: { [buildId: number]: string; } = {};

    public queryBuildLink(buildId: number): IPromise<string> {
        if (!buildId) {
            return Q(null);
        }

        return Q.Promise((resolve, reject) => {
            VSS.using(
                ["VSS/Service", "TFS/Build/RestClient", "TFS/Build/Contracts"],
                (VSS_Service: typeof VSS_Service_NO_REQUIRE,
                    Build_RestClient: typeof Build_RestClient_NO_REQUIRE,
                    Build_Contracts: typeof Build_Contracts_NO_REQUIRE) => {

                    this._buildService = this._buildService || VSS_Service.getClient(Build_RestClient.BuildHttpClient3);

                    this._buildService.getBuild(buildId)
                        .then(build => {
                            const buildDetailsUrl = build && build._links && build._links.web && build._links.web.href;

                            if (!buildDetailsUrl) {
                                resolve(null);
                            }

                            this._buildLinkCache[buildId] = buildDetailsUrl;

                            resolve(buildDetailsUrl);
                        })
                        .then(null, rejectReason => {
                            // Since we failed to get a URL, don't show any "details" link
                            resolve(null);
                        });
                });
        });
    }
}
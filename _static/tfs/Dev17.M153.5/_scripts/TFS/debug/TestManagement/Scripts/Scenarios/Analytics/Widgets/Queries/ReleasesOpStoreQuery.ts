
import * as Q from "q";
import * as VssContext from "VSS/Context";
import { ICacheableQuery } from "Analytics/Scripts/QueryCache/ICacheableQuery";

import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import { Release } from "Widgets/Scripts/DataServices/ConfigurationQueries/Release";

import RMService = require("TestManagement/Scripts/Services/TFS.ReleaseManagement.Service");
import Services = require("TestManagement/Scripts/Services/Services.Common");
import { ReleaseDefinitionQueryOrder } from "ReleaseManagement/Core/Contracts";


/**Op-store cacheable query for Releases.  */
export class ReleasesOpStoreQuery implements ICacheableQuery<Release[]>{
    private projectId: string;

    //Provides a list of Releases scoped to the *current* project, as that is what the underlying client does.
    constructor() {
        this.projectId = VssContext.getDefaultWebContext().project.id;
    }

    public getKey(): string {
        return this.getQueryName() + "." + this.projectId;
    }

    public getQueryName(): string {
        return "ReleasesOpStoreQuery";
    }

    public runQuery(): IPromise<Release[]> {
        const releaseServicePromise = Services.ServiceFactory.getService(Services.ServiceType.ReleaseManagement);

        return releaseServicePromise.then((releaseService: RMService.IReleaseService) => {
            return releaseService.getReleaseDefinitions(ReleaseDefinitionQueryOrder.NameAscending).then((releases) => {
                return releases.map((value, i) => {
                    return {
                        ReleaseDefinitionId: null, //Not exposed from def.
                        ReleaseId: value.id,
                        ReleaseSK: null, //Not exposed from Op-store. For query resiliency, joins on SK"s are preferred means of identification for Ax-Queries.
                        Name: value.name,
                    } as Release;
                });
            });
        });
    }

}

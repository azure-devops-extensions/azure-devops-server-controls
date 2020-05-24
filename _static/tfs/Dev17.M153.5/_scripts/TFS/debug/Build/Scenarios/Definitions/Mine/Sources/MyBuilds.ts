import { getBuildsUpdatedActionHub} from "Build/Scripts/Actions/BuildsUpdated";
import {myBuildsUpdated} from "Build/Scenarios/Definitions/Mine/Actions/MyBuildsUpdated";
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";
import * as BuildClient from "Build.Common/Scripts/ClientServices";
import {IBuildFilter} from "Build.Common/Scripts/ClientContracts";

import * as TFS_Service from "Presentation/Scripts/TFS/TFS.Service";

import * as Service from "VSS/Service";

export class MyBuildsSource extends TFS_Service.TfsService {
    private _buildService: BuildClient.BuildClientService;

    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);

        this._buildService = this.getConnection().getService(BuildClient.BuildClientService);
    }

    public getBuilds(requestedFor: string, top: number, maxBuildsPerDefinition: number): void {
        let filter: IBuildFilter = {
            $top: top,
            requestedFor: requestedFor,
            maxBuildsPerDefinition: maxBuildsPerDefinition
        };

        this._getBuilds(filter);
    }

    private _getBuilds(filter: IBuildFilter): IPromise<any> {
        return this._buildService.getBuilds(filter)
            .then((result) => {
                getBuildsUpdatedActionHub().buildsUpdated.invoke({
                    builds: result.builds
                });

                myBuildsUpdated.invoke({
                    builds: result.builds
                });
            }, raiseTfsError);
    }
}
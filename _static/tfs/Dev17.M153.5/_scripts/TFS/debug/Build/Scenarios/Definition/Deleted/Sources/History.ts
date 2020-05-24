import { historyUpdated } from "Build/Scenarios/Definition/Deleted/Actions/History";
import { getBuildsUpdatedActionHub } from "Build/Scripts/Actions/BuildsUpdated";
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";
import { ContinuationTokenActionHub } from "Build/Scripts/Actions/ContinuationToken";
import { DefaultClientPageSizeMax } from "Build/Scripts/Constants";

import { BuildClientService } from "Build.Common/Scripts/ClientServices";
import { IBuildFilter } from "Build.Common/Scripts/ClientContracts";

import { BuildQueryOrder, BuildStatus, QueryDeletedOption } from "TFS/Build/Contracts";

import * as TFS_Service from "Presentation/Scripts/TFS/TFS.Service";

import * as Service from "VSS/Service";

export class HistorySource extends TFS_Service.TfsService {
    private _buildService: BuildClientService;

    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);

        this._buildService = this.getConnection().getService(BuildClientService);
    }

    public initialize(continuationTokenHub: ContinuationTokenActionHub, definitionId: number, count: number): IPromise<any> {
        let filter: IBuildFilter = {
            definitions: definitionId.toString(),
            statusFilter: BuildStatus.Completed,
            queryOrder: BuildQueryOrder.FinishTimeDescending,
            $top: count
        };

        return this._getBuilds(continuationTokenHub, filter);
    }

    public getBuilds(continuationTokenHub: ContinuationTokenActionHub, definitionId: number, filter: IBuildFilter): void {
        if (!filter) {
            filter = {};
        }

        filter.definitions = definitionId.toString();
        filter.statusFilter = BuildStatus.Completed;

        if (!filter.$top) {
            filter.$top = DefaultClientPageSizeMax;
        }

        if (!filter.queryOrder) {
            filter.queryOrder = BuildQueryOrder.FinishTimeDescending;
        }

        filter.deletedFilter = QueryDeletedOption.OnlyDeleted;

        this._getBuilds(continuationTokenHub, filter);
    }

    private _getBuilds(continuationTokenHub: ContinuationTokenActionHub, filter: IBuildFilter): IPromise<any> {
        return this._buildService.getBuilds(filter)
            .then((result) => {
                getBuildsUpdatedActionHub().buildsUpdated.invoke({
                    builds: result.builds
                });

                continuationTokenHub.continuationTokenUpdated.invoke({
                    continuationToken: result.continuationToken || ""
                });
            }, raiseTfsError);
    }
}
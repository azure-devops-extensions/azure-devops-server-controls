import {historyUpdated} from "Build/Scenarios/Definition/Deleted/Actions/History";
import {DefaultClientPageSizeMax} from "Build/Scripts/Constants";
import {BuildsSource} from "Build/Scripts/Sources/Builds";

import {IBuildFilter} from "Build.Common/Scripts/ClientContracts";

import {TfsService} from "Presentation/Scripts/TFS/TFS.Service";

import {BuildStatus, BuildQueryOrder, QueryDeletedOption} from "TFS/Build/Contracts";

import * as ReactPerf from "VSS/Flux/ReactPerf";

import {VssConnection} from "VSS/Service";

export class HistoryActionCreator extends TfsService {
    private _buildsSource: BuildsSource;

    public initializeConnection(connection: VssConnection): void {
        super.initializeConnection(connection);

        this._buildsSource = this.getConnection().getService(BuildsSource);
    }

    public getHistory(definitionId: number, filter?: IBuildFilter): IPromise<any> {
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

        return this._buildsSource.getBuilds(filter, true)
            .then((result) => {
                ReactPerf.start();
                historyUpdated.invoke({
                    filter: filter,
                    append: !!filter.continuationToken,
                    buildIds: result.builds.map((build) => build.id),
                    continuationToken: result.continuationToken
                });
                ReactPerf.stop();
                ReactPerf.printWasted(ReactPerf.getLastMeasurements());
            });
    }
}
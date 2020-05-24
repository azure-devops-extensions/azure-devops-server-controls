import Q = require("q");

import { getDefinitions } from "Build/Scripts/Actions/DefinitionsActionCreator";
import {DefaultClientPageSizeMax, DefaultPageSize} from "Build/Scripts/Constants";
import {BuildsSource} from "Build/Scripts/Sources/Builds";
import {DefinitionSource} from "Build/Scripts/Sources/Definitions";
import {searchDefinitionsUpdated, queuedDefinitionBuildsUpdated, filterApplied} from "Build/Scenarios/Definitions/Queued/Actions/QueuedDefinitions";

import {IBuildFilter, GetDefinitionsOptions, GetBuildsResult} from "Build.Common/Scripts/ClientContracts";

import {TfsService} from "Presentation/Scripts/TFS/TFS.Service";

import {BuildStatus, BuildQueryOrder, DefinitionQueryOrder} from "TFS/Build/Contracts";

import {VssConnection} from "VSS/Service";
import {delay, DelayedFunction} from "VSS/Utils/Core";

export class QueuedDefinitionsActionCreator extends TfsService {
    private _buildsSource: BuildsSource;
    private _definitionSource: DefinitionSource;

    private _searchDefinitionsDelayedFunction: DelayedFunction;

    public initializeConnection(connection: VssConnection): void {
        super.initializeConnection(connection);

        this._buildsSource = this.getConnection().getService(BuildsSource);
        this._definitionSource = this.getConnection().getService(DefinitionSource);
    }

    public getBuilds(filter?: IBuildFilter): IPromise<any> {
        if (filter) {
            filterApplied.invoke(null);
        }

        filter = filter || {};
        filter.queryOrder = BuildQueryOrder.FinishTimeDescending;

        let queuedFilter: IBuildFilter = copy(filter);
        queuedFilter.statusFilter = BuildStatus.InProgress | BuildStatus.None | BuildStatus.NotStarted;
        let queuedAndRunningBuilds = this._buildsSource.getBuilds(queuedFilter, true);

        let completedFilter: IBuildFilter = copy(filter);
        completedFilter.statusFilter = BuildStatus.Completed;
        completedFilter.$top = DefaultPageSize;
        let completedBuilds = this._buildsSource.getBuilds(completedFilter, true);

        return Q.all([queuedAndRunningBuilds, completedBuilds]).then((result) => {
            this._invokeAction(result, filter);
        });
    }

    public searchDefinitions(searchText: string): void {
        let filter: GetDefinitionsOptions = {
            name: searchText + "*",
            queryOrder: DefinitionQueryOrder.DefinitionNameAscending,
            $top: DefaultClientPageSizeMax
        };

        if (this._searchDefinitionsDelayedFunction) {
            this._searchDefinitionsDelayedFunction.cancel();
        }

        this._searchDefinitionsDelayedFunction = delay(this, 0, () => {
            getDefinitions(this._definitionSource, filter)
                .then((result) => {
                    searchDefinitionsUpdated.invoke({
                        filter: filter,
                        definitionIds: result.definitions.map((definition) => definition.id)
                    });
                });
        });
    }

    private _invokeAction(result: GetBuildsResult[], filter?: IBuildFilter) {
        let buildIds = [];
        result.forEach((r) => {
            r.builds.forEach((build) => {
                if (buildIds.indexOf(build.id) < 0) {
                    buildIds.push(build.id);
                }
            });
        });

        queuedDefinitionBuildsUpdated.invoke({
            buildIds: buildIds,
            filter: filter
        });
    }
}

function copy(routeData: any): any {
    let result = {};

    Object.keys(routeData || {}).forEach((key) => {
        result[key] = routeData[key];
    });

    return result;
}
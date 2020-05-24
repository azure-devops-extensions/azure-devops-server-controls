import Q = require("q");

import { DefaultClientPageSizeMax } from "Build/Scripts/Constants";
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";
import { BuildSource } from "Build/Scripts/CI/Sources/Builds";
import { getAllBuildsActionHub, AllBuildsActionHub } from "Build/Scenarios/CI/AllBuilds/Actions/AllBuilds";
import { IFilterData, getBuildQueryOrder, FilterDefaults, getFilter } from "Build/Scenarios/CI/AllBuilds/Common";

import { GetBuildsResult, IBuildFilterBase, IBuildFilter } from "Build.Common/Scripts/ClientContracts";

import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";

import { BuildStatus, BuildQueryOrder, DefinitionQueryOrder } from "TFS/Build/Contracts";

import { getService } from "VSS/Service";
import { BuildClientService } from "../../../../../Build.Common/Scripts/ClientServices";

export interface IAllBuildsActionCreatorOptions {
    buildsSource?: BuildSource;
    actionHub?: AllBuildsActionHub;
    buildService?: BuildClientService;
}

export class AllBuildsActionCreator {
    private _actionHub: AllBuildsActionHub;
    private _buildsSource: BuildSource;
    private _buildService?: BuildClientService;

    constructor(options?: IAllBuildsActionCreatorOptions) {
        this._buildService = (options && options.buildService) ? options.buildService : getService(BuildClientService);
        this._actionHub = (options && options.actionHub) ? options.actionHub : getAllBuildsActionHub();
        this._buildsSource = (options && options.buildsSource) ? options.buildsSource : new BuildSource({ service: this._buildService});
    }

    public getBuilds(filter: IFilterData, actionHub?: AllBuildsActionHub): IPromise<void> {
        filter = filter || {} as IFilterData;
        const shouldAppendResult = !!filter.continuationToken;
        let useDynamicGetBuildsCall = false;
        let buildFilter: IBuildFilterBase = {
            continuationToken: filter.continuationToken,
            queryOrder: filter.order,
            $top: DefaultClientPageSizeMax
        };

        if (!!filter.definitionId && filter.definitionId != FilterDefaults.DefaultId) {
            buildFilter.definitions = filter.definitionId + "";
        }

        if (!!filter.requestedFor) {
            useDynamicGetBuildsCall = true;
            (buildFilter as IBuildFilter).requestedFor = filter.requestedFor;
        }

        const queueId = filter.queueId;
        if (queueId && parseInt(queueId) > 0) {
            useDynamicGetBuildsCall = true;
            (buildFilter as IBuildFilter).queues = queueId;
        }

        if (!!filter.repositoryFilter) {
            useDynamicGetBuildsCall = true;
            (buildFilter as IBuildFilter).repositoryId = filter.repositoryFilter.id;
            (buildFilter as IBuildFilter).repositoryType = filter.repositoryFilter.type;
        }

        if (!!filter.tags && filter.tags.length > 0) {
            useDynamicGetBuildsCall = true;
            (buildFilter as IBuildFilter).tagFilters = filter.tags.join(",");
        }

        let promise: IPromise<GetBuildsResult> = null;
        if (useDynamicGetBuildsCall) {
            (buildFilter as IBuildFilter).statusFilter = filter.status;
            promise = this._buildsSource.getBuilds(buildFilter);
        }
        else {
            switch (filter.status) {
                case BuildStatus.Completed:
                    promise = this._buildsSource.getCompletedBuilds(buildFilter)
                    break;
                case BuildStatus.InProgress:
                    promise = this._buildsSource.getRunningBuilds(buildFilter)
                    break;
                case BuildStatus.NotStarted:
                    promise = this._buildsSource.getQueuedBuilds(buildFilter)
                    break;
                default:
                    promise = this._buildsSource.getAllBuilds(buildFilter)
                    break;
            }
        }

        return promise.then((result) => {
            let buildIds = [];
            if (!!result) {
                filter.continuationToken = result.continuationToken;
            }

            this._actionHub.allBuildsUpdated.invoke({
                builds: result.builds,
                filter: getFilter(filter),
                append: shouldAppendResult
            });
        }, (error) => {
            raiseTfsError(error);
        });
    }
}

var __allBuildsActionCreator = null;
export function getAllBuildsActionCreator() {
    if (!__allBuildsActionCreator) {
        __allBuildsActionCreator = new AllBuildsActionCreator();
    }

    return __allBuildsActionCreator;
}
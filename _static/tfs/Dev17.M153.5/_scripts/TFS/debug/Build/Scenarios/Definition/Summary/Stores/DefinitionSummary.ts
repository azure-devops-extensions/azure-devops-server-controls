/// <reference types="react" />
/// <reference types="react-dom" />

import Q = require("q");

import Build_Actions = require("Build/Scripts/Actions/Actions");
import { getBuildsUpdatedActionHub } from "Build/Scripts/Actions/BuildsUpdated";
import { definitionUpdated, DefinitionUpdatedPayload } from "Build/Scripts/Actions/Definitions";
import { getDefinition } from "Build/Scripts/Actions/DefinitionsActionCreator";
import { histogramsUpdated } from "Build/Scripts/Actions/HistogramsUpdated";
import * as Constants from "Build/Scripts/Constants";
import { BuildsSource } from "Build/Scripts/Sources/Builds";
import { DefinitionSource } from "Build/Scripts/Sources/Definitions";
import BuildStore = require("Build/Scripts/Stores/Builds");
import DefinitionMetricStore = require("Build/Scripts/Stores/DefinitionMetrics");
import DefinitionStore = require("Build/Scripts/Stores/Definitions");
import { QueryResult } from "Build/Scripts/QueryResult";

import { IBuildFilter } from "Build.Common/Scripts/ClientContracts";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_React = require("Presentation/Scripts/TFS/TFS.React");

import BuildContracts = require("TFS/Build/Contracts");

import { getService, getCollectionService } from "VSS/Service";
import VSS = require("VSS/VSS");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Date = require("VSS/Utils/Date");

export interface DefinitionRow {
    definitionResult: QueryResult<BuildContracts.BuildDefinitionReference>;
    completedHistory: QueryResult<BuildContracts.Build[]>;
    queuedOrRunningHistory: QueryResult<BuildContracts.Build[]>;
    metrics: BuildContracts.BuildMetric[];
}

export interface IDefinitionSummaryStoreOptions extends TFS_React.IStoreOptions {
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    buildStore?: BuildStore.BuildStore;
    definitionStore?: DefinitionStore.DefinitionStore;
    definitionMetricStore?: DefinitionMetricStore.DefinitionMetricStore;
}

export interface IBuildBranchInfo {
    uniqueBranchNames: string[];
    branchBuildsMap: IDictionaryStringTo<QueryResult<BuildContracts.Build[]>>;
}

interface ViewStateData {
    definitionid: number;
}

interface BuildsForBranchPayload {
    definitionId: number;
    repoId: string;
    repoType: string;
    branchName: string;
    numberOfBuilds: number;
}

export class DefinitionSummaryStore extends TFS_React.Store {
    private static RequestorsSize = 1;

    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    private _buildsSource: BuildsSource;
    private _definitionSource: DefinitionSource;

    private _buildStore: BuildStore.BuildStore;
    private _definitionStore: DefinitionStore.DefinitionStore;
    private _definitionMetricStore: DefinitionMetricStore.DefinitionMetricStore;

    private _branchBuildsRetrieved: IDictionaryStringTo<boolean> = {};
    private _definitionBuildsBranchInfo: IDictionaryNumberTo<IBuildBranchInfo> = {};

    constructor(options?: IDefinitionSummaryStoreOptions) {
        super(Constants.StoreChangedEvents.DefinitionSummaryStoreUpdated, options);

        this._tfsContext = (options && options.tfsContext) ? options.tfsContext : TFS_Host_TfsContext.TfsContext.getDefault();

        this._buildsSource = getCollectionService(BuildsSource);
        this._definitionSource = getCollectionService(DefinitionSource);

        this._buildStore = (options && options.buildStore) ? options.buildStore : BuildStore.getBuildStore();
        this._definitionStore = (options && options.definitionStore) ? options.definitionStore : DefinitionStore.getDefinitionStore();
        this._definitionMetricStore = (options && options.definitionMetricStore) ? options.definitionMetricStore : DefinitionMetricStore.getDefinitionMetricStore();

        definitionUpdated.addListener((payload: DefinitionUpdatedPayload) => {
            // invalidate definition build branches map
            if (payload.definitionId) {
                delete this._definitionBuildsBranchInfo[payload.definitionId];
            }

            this.emitChanged();
        });

        getBuildsUpdatedActionHub().buildsUpdated.addListener((payload) => {
            this._clearBuildMetrics(payload.builds);
        });

        getBuildsUpdatedActionHub().definitionMetricsUpdated.addListener((payload) => {
            this._clearBuildMetrics(payload.builds);
        });

        histogramsUpdated.addListener((payload) => {
            this.emitChanged();
        });
    }

    public getDefinitionRow(definitionId: number): DefinitionRow {
        let definition = this._definitionStore.getDefinition(definitionId);

        //get at most 5 most recent completed builds for this definition
        let filter: IBuildFilter = {
            definitions: definitionId.toString(),
            statusFilter: BuildContracts.BuildStatus.Completed,
            $top: 5,
            deletedFilter: BuildContracts.QueryDeletedOption.ExcludeDeleted
        };
        let completedHistories = this._buildStore.getBuilds(filter);

        //get at most 10 queued or running builds
        filter.statusFilter = BuildContracts.BuildStatus.InProgress | BuildContracts.BuildStatus.None | BuildContracts.BuildStatus.NotStarted
        filter.$top = 10;
        let queuedOrRunningHistories = this._buildStore.getBuilds(filter);

        let row: DefinitionRow = null;

        if (definition && definition.result) {
            row = this._getDefinitionRow(definition, completedHistories, queuedOrRunningHistories);
        }

        return row;
    }

    public getBuildsPerBranchInfo(definitionId: number): IBuildBranchInfo {
        let definitionResult = this._definitionStore.getDefinition(definitionId);
        if (!this._definitionBuildsBranchInfo[definitionId]) {
            if (!definitionResult.pending) {
                let definition = definitionResult.result as BuildContracts.BuildDefinition;
                if (!!definition && !!definition.metrics && !!definition.repository) {
                    let uniqueBranchNames: string[] = [];
                    let branchBuildsMap: IDictionaryStringTo<QueryResult<BuildContracts.Build[]>> = {};

                    for (let metric of definition.metrics) {
                        let name = metric.scope;

                        if (name.indexOf("refs/pull/") === 0) {
                            // ignore PR branches
                            continue;
                        }

                        if (uniqueBranchNames.length >= Constants.DefaultServerPageSizeMax) {
                            // we reached the limit, just break
                            break;
                        }

                        if (!Utils_Array.contains(uniqueBranchNames, name)) {
                            uniqueBranchNames.push(name);
                            branchBuildsMap[name] = this._getBuildsForBranch(
                                {
                                    branchName: name,
                                    definitionId: definition.id,
                                    numberOfBuilds: 2,
                                    repoId: definition.repository.id,
                                    repoType: definition.repository.type
                                }, !this._branchBuildsRetrieved[name]);

                            // we should only query the server once per branch
                            this._branchBuildsRetrieved[name] = true;
                        }
                    }

                    this._definitionBuildsBranchInfo[definitionId] = {
                        branchBuildsMap: branchBuildsMap,
                        uniqueBranchNames: uniqueBranchNames
                    };
                }
            }
        }

        return this._definitionBuildsBranchInfo[definitionId];
    }

    private _clearBuildMetrics(builds: BuildContracts.Build[]) {
        (builds || []).forEach((build) => {
            if (build && build.definition) {
                delete this._definitionBuildsBranchInfo[build.definition.id];
            }
        });

        this.emitChanged();
    }

    private _getBuildsForBranch(payload: BuildsForBranchPayload, refresh: boolean = false): QueryResult<BuildContracts.Build[]> {
        let buildFilter: IBuildFilter = {
            $top: payload.numberOfBuilds,
            definitions: payload.definitionId + "",
            branchName: payload.branchName,
            repositoryId: payload.repoId + "",
            repositoryType: payload.repoType,
            queryOrder: BuildContracts.BuildQueryOrder.FinishTimeDescending
        };

        var pendingResult = this._buildStore.getBuilds(buildFilter);

        if (!pendingResult) {
            refresh = true;

            pendingResult = {
                pending: true,
                result: null
            };
        }
        else if (pendingResult.pending) {
            refresh = false;
        }
        else if (refresh && !pendingResult.pending) {
            pendingResult.pending = true;
        }

        if (refresh) {
            // if there are multiple branch requests we might block UI thread, push these at the end of the stack using setTimeout
            setTimeout(() => {
                this._refreshBuildsForBranch(payload);
            }, 0);
        }

        return pendingResult;
    }

    private _refreshBuildsForBranch(payload: BuildsForBranchPayload) {
        // we're only interested in builds within the last 7 days
        let minFinishTime = new Date(Date.now());
        minFinishTime = Utils_Date.addDays(minFinishTime, -7);

        let buildFilter: IBuildFilter = {
            $top: payload.numberOfBuilds,
            definitions: payload.definitionId + "",
            branchName: payload.branchName,
            repositoryId: payload.repoId + "",
            repositoryType: payload.repoType,
            minFinishTime: minFinishTime,
            queryOrder: BuildContracts.BuildQueryOrder.FinishTimeDescending
        };

        this._buildsSource.getBuilds(buildFilter);
    }

    private _getDefinitionRow(definition: QueryResult<BuildContracts.BuildDefinitionReference>, completedHistory: QueryResult<BuildContracts.Build[]>, queuedOrRunningHistory: QueryResult<BuildContracts.Build[]>): DefinitionRow {
        let definitionId: number = definition.result.id;

        // if the definition is only a BuildDefinitionReference, get the full BuildDefinition
        if ((definition.result as BuildContracts.BuildDefinition).repository === undefined) {
            getDefinition(this._definitionSource, definitionId);
        }

        return {
            definitionResult: definition,
            completedHistory: completedHistory,
            queuedOrRunningHistory: queuedOrRunningHistory,
            metrics: this._definitionMetricStore.getAggregatedDefinitionMetrics(definitionId)
        };
    }
}

var _definitionSummaryStore: DefinitionSummaryStore = null;

export function getStore(): DefinitionSummaryStore {
    if (!_definitionSummaryStore) {
        _definitionSummaryStore = new DefinitionSummaryStore();
    }
    return _definitionSummaryStore;
}

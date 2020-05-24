
import Q = require("q");

import Build_Actions = require("Build/Scripts/Actions/Actions");
import * as BuildsSource from "Build/Scripts/Sources/Builds";
import { getBuildsUpdatedActionHub } from "Build/Scripts/Actions/BuildsUpdated";
import { definitionUpdated, DefinitionUpdatedPayload } from "Build/Scripts/Actions/Definitions";
import * as Constants from "Build/Scripts/Constants";
import { histogramsUpdated } from "Build/Scripts/Actions/HistogramsUpdated";
import { OneTimeActionCreator } from "Build/Scripts/OneTimeActionCreator";
import { QueryResult } from "Build/Scripts/QueryResult";

import { IBuildFilter } from "Build.Common/Scripts/ClientContracts";
import { orderBuildsByFinishTime } from "Build.Common/Scripts/BuildReference";

import TFS_React = require("Presentation/Scripts/TFS/TFS.React");

import BuildContracts = require("TFS/Build/Contracts");

import { Action } from "VSS/Flux/Action";

import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

export interface BuildHistoryEntry {
    definitionId: number;
    builds: BuildContracts.BuildReference[]
}

export var buildHistoryEntryTypeInfo = {
    fields: <any>{
        builds: {
            isArray: true,
            typeInfo: BuildContracts.TypeInfo.BuildReference
        }
    }
};

interface BuildEntry {
    build: QueryResult<BuildContracts.Build>;
    buildReference: BuildContracts.BuildReference;
}

export interface IBuildStoreOptions extends TFS_React.IStoreOptions {
    buildsSource?: BuildsSource.BuildsSource;
}

export interface InitializeBuildStorePayload {
    allBuilds: BuildContracts.Build[];
    buildHistory: BuildHistoryEntry[];
}
export var _initializeBuildStore = new Action<InitializeBuildStorePayload>();
export var initializeBuildStore = new OneTimeActionCreator(_initializeBuildStore);

export class BuildStore extends TFS_React.Store {
    private _buildsSource: BuildsSource.BuildsSource;

    private _allBuilds: IDictionaryNumberTo<BuildEntry> = {};
    private _allOldBuilds: IDictionaryNumberTo<BuildEntry> = {};
    private _buildsByDefinitionId: IDictionaryNumberTo<BuildEntry[]> = {};
    private _retrievedHistograms: IDictionaryNumberTo<boolean> = {};
    private _histogramPromises: IDictionaryNumberTo<boolean> = {};

    constructor(options?: IBuildStoreOptions) {
        super(Constants.StoreChangedEvents.BuildStoreUpdated, options);

        this._buildsSource = (options && options.buildsSource) ? options.buildsSource : Service.getCollectionService(BuildsSource.BuildsSource);

        _initializeBuildStore.addListener((payload: InitializeBuildStorePayload) => {
            var allBuilds = payload.allBuilds || [];
            var buildHistory = payload.buildHistory || [];

            buildHistory.forEach((entry: BuildHistoryEntry) => {
                let builds: BuildEntry[] = [];
                entry.builds.forEach((buildReference: BuildContracts.BuildReference) => {
                    let build: BuildEntry = {
                        build: null,
                        buildReference: buildReference
                    };
                    this._allBuilds[buildReference.id] = build;
                    builds.push(build);
                });

                this._buildsByDefinitionId[entry.definitionId] = builds;
                this._retrievedHistograms[entry.definitionId] = true;
            });

            allBuilds.forEach((build: BuildContracts.Build) => {
                this._updateBuildEntry(build);
            });

            // sort histories
            for (let key in this._buildsByDefinitionId) {
                this._buildsByDefinitionId[key].sort((a, b) => {
                    return orderBuildsByFinishTime(a.buildReference, b.buildReference);
                });
            }

            this.emitChanged();
        });

        getBuildsUpdatedActionHub().buildsUpdated.addListener((payload) => {
            let changed: boolean = this._updateBuilds(payload.builds);

            if (changed) {
                this.emitChanged();
            }
        });

        histogramsUpdated.addListener((payload) => {
            payload.definitionIds.forEach((definitionId: number) => {
                this._retrievedHistograms[definitionId] = true;
                delete this._histogramPromises[definitionId];
            });
        });

        Build_Actions.buildDeleted.addListener((build: BuildContracts.Build) => {
            delete this._allBuilds[build.id];
            var buildsForDefinition = this._buildsByDefinitionId[build.definition.id];
            if (buildsForDefinition) {
                let index = Utils_Array.findIndex(buildsForDefinition, (entry) => entry.buildReference.id === build.id);
                if (index > -1) {
                    buildsForDefinition.splice(index, 1);
                }

                buildsForDefinition.sort((a, b) => {
                    return orderBuildsByFinishTime(a.buildReference, b.buildReference);
                });
            }

            // refresh the histogram for the definition
            this._retrievedHistograms[build.definition.id] = false;
            this._refreshHistogram(build.definition.id);

            this.emitChanged();
        });

        definitionUpdated.addListener((payload: DefinitionUpdatedPayload) => {
            var updatedBuilds = this._buildsByDefinitionId[payload.definitionId];

            // refresh the build definition of the builds 
            if (updatedBuilds && payload && payload.definition && this._allBuilds) {
                updatedBuilds.forEach((build: BuildEntry) => {
                    if (build && build.buildReference) {
                        if (this._allBuilds[build.buildReference.id] && this._allBuilds[build.buildReference.id].build && this._allBuilds[build.buildReference.id].build.result) {
                            this._allBuilds[build.buildReference.id].build.result.definition = payload.definition;
                        }
                    }
                });
                this.emitChanged();
            }
        });
    }

    public getBuild(buildId: number, refresh?: boolean): QueryResult<BuildContracts.Build> {
        let pendingResult: QueryResult<BuildContracts.Build> = null;

        let buildReference: BuildContracts.BuildReference = null;
        let buildEntry = this._allBuilds[buildId];
        if (buildEntry) {
            pendingResult = buildEntry.build;
            buildReference = buildEntry.buildReference;
        }

        if (!pendingResult) {
            refresh = true;
            pendingResult = {
                pending: true,
                // use the build reference if it's there, otherwise we don't know anything other than the id
                result: <BuildContracts.Build>(buildReference || {
                    id: buildId
                })
            };
            this._allBuilds[buildId] = <BuildEntry>{
                build: pendingResult,
                buildReference: buildReference
            };
        }
        else if (pendingResult.pending) {
            refresh = false;
        }
        else if (refresh && !pendingResult.pending) {
            pendingResult.pending = true;
        }

        if (refresh) {
            this._buildsSource.getBuild(buildId, true);
        }

        return pendingResult;
    }

    public getOldBuild(buildId: number): QueryResult<BuildContracts.Build> {
        return this._allOldBuilds[buildId] ? this._allOldBuilds[buildId].build : null;
    }

    public getBuilds(filter?: IBuildFilter): QueryResult<BuildContracts.Build[]> {
        let builds: BuildContracts.Build[] = [];
        let topExists = filter && filter.$top;
        $.each(this._allBuilds, (buildId, buildEntry: BuildEntry) => {
            var build = (buildEntry.build && buildEntry.build.result) ? buildEntry.build.result : buildEntry.buildReference;
            if (isMatchingBuild(build, filter)) {
                builds.push(<BuildContracts.Build>build);
            }
        });

        if (filter) {
            builds = builds.sort((a, b) => {
                return orderBuildsByFinishTime(a, b, filter.queryOrder === BuildContracts.BuildQueryOrder.FinishTimeAscending);
            });
        }

        if (topExists && builds.length >= filter.$top) {
            builds = builds.slice(0, filter.$top);
        }

        if (topExists && builds.length >= filter.$top) {
            builds = builds.slice(0, filter.$top);
        }

        return {
            pending: false,
            result: builds
        };
    }

    public getBuildsById(buildIds: number[]): BuildContracts.Build[] {
        let result: BuildContracts.Build[] = [];

        buildIds.forEach((buildId) => {
            let entry = this._allBuilds[buildId];
            if (entry && entry.build && entry.build.result) {
                if (!entry.build.pending || entry.buildReference) {
                    result.push(entry.build.result);
                }
            }
        });

        return result;
    }

    public getLatestBuildForDefinition(definitionId: number): BuildContracts.BuildReference {
        let entries: BuildEntry[] = (this._buildsByDefinitionId[definitionId] || []);
        if (entries.length > 0) {
            return entries[0].buildReference;
        }
        return null;
    }

    public getDefinitionHistory(definitionId: number, count: number): QueryResult<BuildContracts.BuildReference[]> {
        return this.getDefinitionHistories([definitionId], count)[definitionId];
    }

    public getDefinitionHistories(definitionIds: number[], count: number): IDictionaryNumberTo<QueryResult<BuildContracts.BuildReference[]>> {
        let results: IDictionaryNumberTo<QueryResult<BuildContracts.BuildReference[]>> = {};
        let toRetrieve: number[] = [];

        definitionIds.forEach((definitionId: number) => {
            if (!!this._retrievedHistograms[definitionId]) {
                let entries = (this._buildsByDefinitionId[definitionId] || []).slice(0, count);
                let builds: BuildContracts.BuildReference[] = entries.map((entry: BuildEntry) => {
                    return entry.buildReference;
                });

                results[definitionId] = {
                    result: builds,
                    pending: false
                };
            }
            else {
                if (!this._histogramPromises[definitionId]) {
                    toRetrieve.push(definitionId);
                }

                results[definitionId] = {
                    result: [],
                    pending: true
                };
            }
        });

        if (toRetrieve.length > 0) {
            // while retrieving get default max size + 1 so that if one happend to call get builds for count 2 and later something calls for count 10...
            // ...we can still be assured that we already retreived data, there shouldn't a case for getting more that default client size
            this._buildsSource.getHistograms(toRetrieve, Constants.DefaultClientPageSizeMax + 1);

            toRetrieve.forEach((definitionId: number) => {
                this._histogramPromises[definitionId] = true;
            });
        }

        return results;
    }

    private _updateBuilds(builds: BuildContracts.Build[]): boolean {
        let changed: boolean = false;

        // builds
        if (builds && builds.length > 0) {
            let definitionIds: number[] = [];
            builds.forEach((build: BuildContracts.Build) => {
                this._updateBuildEntry(build);

                if (!Utils_Array.contains(definitionIds, build.definition.id)) {
                    definitionIds.push(build.definition.id);
                }
            });

            definitionIds.forEach((definitionId: number) => {
                (this._buildsByDefinitionId[definitionId] || []).sort((a, b) => {
                    return orderBuildsByFinishTime(a.buildReference, b.buildReference);
                });
            });

            changed = true;
        }

        return changed;
    }

    private _updateBuildEntry(build: BuildContracts.Build): void {
        this._allOldBuilds = {};

        for (let key in this._allBuilds) {
            this._allOldBuilds[key] = $.extend({}, this._allBuilds[key]);
        }

        let entry: BuildEntry = this._allBuilds[build.id];
        if (entry) {
            entry.build = {
                pending: false,
                result: build
            };
            entry.buildReference = build;
        }
        else {
            entry = {
                build: {
                    pending: false,
                    result: build
                },
                buildReference: build
            };
            this._allBuilds[build.id] = entry;

            let buildsByDefinitionId = this._buildsByDefinitionId[build.definition.id];
            if (!buildsByDefinitionId) {
                buildsByDefinitionId = [];
                this._buildsByDefinitionId[build.definition.id] = buildsByDefinitionId;
            }
            buildsByDefinitionId.push(entry);
        }
    }

    private _refreshHistogram(definitionId: number): void {
        if (!this._histogramPromises[definitionId]) {
            this._histogramPromises[definitionId] = true;
            this._buildsSource.getHistograms([definitionId], 10);
        }
    }

    private _updateBuildHistoryData(buildHistoryData: BuildHistoryEntry[]) {
        buildHistoryData = buildHistoryData || [];
        buildHistoryData.forEach((entry: BuildHistoryEntry) => {
            var builds: BuildEntry[] = [];
            entry.builds.forEach((buildReference: BuildContracts.BuildReference) => {
                var build: BuildEntry = {
                    build: null,
                    buildReference: buildReference
                };
                this._allBuilds[buildReference.id] = build;
                builds.push(build);
            });

            this._buildsByDefinitionId[entry.definitionId] = builds;
        });
    }
}
var _buildStore: BuildStore = null;

export function getBuildStore(options?: IBuildStoreOptions): BuildStore {
    if (!_buildStore) {
        _buildStore = new BuildStore(options);
    }
    return _buildStore;
}

//compares a build to some aspects of a filter
function isMatchingBuild(build: BuildContracts.BuildReference, filter?: IBuildFilter): boolean {
    if (build) {
        if (!filter) {
            return true;
        }

        // buildIds could be empty string as well, which is a valid filter
        let buildIds = filter.buildIds ? filter.buildIds.split(",") : "";
        if (buildIds && buildIds.indexOf(build.id + "") < 0) {
            return false;
        }

        if (filter.requestedFor && (!build.requestedFor || !Utils_String.equals(build.requestedFor.id, filter.requestedFor, true))) {
            return false;
        }

        if (filter.statusFilter && (build.status & filter.statusFilter) == 0) {
            return false;
        }

        if (filter.deletedFilter == 0 && build.deleted) {
            return false;
        }

        let fullBuild: any = build;
        let definitionIds = filter.definitions ? filter.definitions.split(",") : "";

        if (definitionIds && (!fullBuild.definition || definitionIds.indexOf(fullBuild.definition.id + "") < 0)) {
            return false;
        }

        if (filter.branchName && fullBuild.sourceBranch !== filter.branchName) {
            return false;
        }

        if (filter.repositoryId && (!fullBuild.repository || fullBuild.repository.id !== filter.repositoryId)) {
            return false;
        }

        if (filter.repositoryType && (!fullBuild.repository || filter.repositoryType !== fullBuild.repository.type)) {
            return false;
        }

        return true;
    }

    return false;
}

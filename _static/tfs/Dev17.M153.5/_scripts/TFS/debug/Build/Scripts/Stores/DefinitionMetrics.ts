import * as Build_Actions from "Build/Scripts/Actions/Actions";
import * as BuildContracts from "TFS/Build/Contracts";
import * as Constants from "Build/Scripts/Constants";
import { IDefinitionsBehavior } from "Build/Scripts/Behaviors";

import { getBuildsUpdatedActionHub } from "Build/Scripts/Actions/BuildsUpdated";
import { definitionMetricsRetrieved, DefinitionMetric } from "Build/Scripts/Actions/DefinitionMetrics";
import { definitionDeleted } from "Build/Scripts/Actions/Definitions";
import { BuildStore, getBuildStore } from "Build/Scripts/Stores/Builds";
import { DefinitionStore, getDefinitionStore } from "Build/Scripts/Stores/Definitions";
import { getUtcDate } from "Build/Scripts/Utilities/DateUtility";

import { BuildCustomerIntelligenceInfo, DefinitionMetrics } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { IStoreOptions as ITfsReactStoreOptions, Store as TfsReactStore } from "Presentation/Scripts/TFS/TFS.React";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as Performance from "VSS/Performance";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import { logError } from "VSS/Diag";

export interface IDefinitionMetricStoreOptions extends ITfsReactStoreOptions {
    buildStore?: BuildStore;
    definitionStore?: DefinitionStore;
}

interface IBuildUpdatedEvent {
    inProgressEvent: boolean;
    inQueueEvent: boolean;
}

// Depends on DefinitionStore and BuildStore
export class DefinitionMetricStore extends TfsReactStore {
    // original metrics, with dates
    private _definitionMetrics: IDictionaryNumberTo<BuildContracts.BuildMetric[]> = {};

    // metrics aggregated, this doesn't have any date context
    private _definitionMetricsAggregated: IDictionaryNumberTo<BuildContracts.BuildMetric[]> = {};

    private _buildStore: BuildStore;
    private _definitionStore: DefinitionStore;
    private _buildIdToEvent: IDictionaryNumberTo<IBuildUpdatedEvent> = {};

    private _tfsContext: TfsContext;

    constructor(options?: IDefinitionMetricStoreOptions) {
        super(Constants.StoreChangedEvents.DefinitionMetricStoreUpdated, options);

        this._buildStore = (options && options.buildStore) ? options.buildStore : getBuildStore();
        this._definitionStore = (options && options.definitionStore) ? options.definitionStore : getDefinitionStore();

        this._tfsContext = TfsContext.getDefault();

        let performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "DefinitionMetricStore");

        // initialize metrics
        let definitionResults = this._definitionStore.getDefinitions(DefinitionStore.exists);
        let initialMetrics: DefinitionMetric[] = [];
        definitionResults.forEach((definitionResult) => {
            if (definitionResult.result) {
                initialMetrics.push({
                    definitionId: definitionResult.result.id,
                    metrics: definitionResult.result.metrics || []
                });
            }
        });

        this._initializeDefinitionMetrics(initialMetrics);
        performance.addSplitTiming("updated existing metrics");

        definitionMetricsRetrieved.addListener((payload) => {
            this._initializeDefinitionMetrics(payload.metrics, payload.behavior);
        });

        getBuildsUpdatedActionHub().definitionMetricsUpdated.addListener((payload) => {
            this._updateMetricsFromBuilds(payload.builds, true);
        });

        definitionDeleted.addListener((definition: BuildContracts.BuildDefinitionReference) => {
            let changed: boolean = false;
            if (!!this._definitionMetricsAggregated[definition.id]) {
                delete this._definitionMetricsAggregated[definition.id];
                changed = true;
            }

            if (!!this._definitionMetrics[definition.id]) {
                delete this._definitionMetrics[definition.id];
                changed = true;
            }

            if (changed) {
                this.emitChanged();
            }
        });
    }

    // returns metrics that are aggregated per name and scope based on ask, these doesn't have any date context
    public getAggregatedDefinitionMetrics(definitionId: number, branchName?: string, scoped: boolean = true) {
        let metrics: BuildContracts.BuildMetric[] = [];
        metrics = this._definitionMetricsAggregated[definitionId];
        metrics = this._getMetrics(metrics, branchName, scoped);
        return metrics;
    }

    // returns original metrics
    public getDefinitionMetrics(definitionId: number, branchName?: string) {
        return this._getMetrics(this._definitionMetrics[definitionId] || [], branchName);
    }

    private _getMetrics(metrics: BuildContracts.BuildMetric[], branchName: string, scoped: boolean = true) {
        metrics = metrics || [];
        if (branchName) {
            // for tfvc, we store definition's default branch as $/projectId
            // but for metrics, when we queue the build, we store source branch and hence metric's branch as $/projectname
            // not sure if changing queue build to take $/projectId instead is a good idea, but in anycase tfvc doesn't really have concept of branches
            // so ignore branch for tfvc
            if (branchName != "$/" + this._tfsContext.navigation.projectId) {
                metrics = metrics.filter((metric) => {
                    return Utils_String.equals(metric.scope, branchName, true);
                });
            }
        }

        if (!scoped) {
            // we store aggregated metrics with the scope so if we need them not to be scoped, ignore the scope and merge them
            metrics = mergeBuildMetricsUniquePerName(metrics);
        }

        return metrics;
    }

    private _updateMetricsFromBuilds(builds: BuildContracts.Build[], isSignalRUpdate: boolean = false): void {
        let definitionIds: number[] = [];
        let definitionToBuildMetric: IDictionaryNumberTo<BuildContracts.BuildMetric[]> = {};

        builds.forEach((build) => {
            let definitionId = build.definition.id;
            let scope = build.sourceBranch;

            if (!definitionToBuildMetric[definitionId]) {
                definitionToBuildMetric[definitionId] = [];
            }

            let metrics: BuildContracts.BuildMetric[] = [];
            let existingBuild = this._buildStore.getOldBuild(build.id);

            this._buildIdToEvent[build.id] = <IBuildUpdatedEvent>{};

            // If - We have already seen this build event before
            if (existingBuild && !existingBuild.pending && existingBuild.result) {
                if (existingBuild.result.result && build.result && existingBuild.result.result === build.result) {
                    // if existing build and current build have same result then we don't need to compute anything, it's probably just a update event for existing build
                    return;
                }

                // If - existing build not started
                if (existingBuild.result.status === BuildContracts.BuildStatus.NotStarted) {
                    // If - existing build not started and now in progress
                    if (build.status === BuildContracts.BuildStatus.InProgress) {
                        // just increment in progress, decrement in queue if not received already
                        metrics.push({
                            date: null,
                            intValue: 1,
                            scope: scope,
                            name: DefinitionMetrics.CurrentBuildsInProgress
                        });
                        if (!this._buildIdToEvent[build.id].inQueueEvent) {
                            metrics.push({
                                date: null,
                                scope: scope,
                                intValue: -1,
                                name: DefinitionMetrics.CurrentBuildsInQueue
                            });
                        }
                    }
                    // If - existing build in progress and now completed/cancelled
                    else if (build.status === BuildContracts.BuildStatus.Completed || build.status === BuildContracts.BuildStatus.Cancelling) {
                        // take care of the result, decrement in progress if not received already, decrement in queue if not received already
                        metrics = metrics.concat(this._getCompletedBuildMetrics(build.result, scope));
                        if (!this._buildIdToEvent[build.id].inProgressEvent) {
                            metrics.push({
                                date: null,
                                scope: scope,
                                intValue: -1,
                                name: DefinitionMetrics.CurrentBuildsInProgress
                            });
                        }
                        if (!this._buildIdToEvent[build.id].inQueueEvent) {
                            metrics.push({
                                date: null,
                                scope: scope,
                                intValue: -1,
                                name: DefinitionMetrics.CurrentBuildsInQueue
                            });
                        }
                    }
                }
                // If - existing build in progress and now completed/cancelled
                else if (existingBuild.result.status === BuildContracts.BuildStatus.InProgress &&
                    (build.status === BuildContracts.BuildStatus.Completed || build.status === BuildContracts.BuildStatus.Cancelling)) {
                    // take care of the result, decrement in progress, decrement in queue if not received already
                    metrics = metrics.concat(this._getCompletedBuildMetrics(build.result, scope));
                    metrics.push({
                        date: null,
                        scope: scope,
                        intValue: -1,
                        name: DefinitionMetrics.CurrentBuildsInProgress
                    });
                    if (!this._buildIdToEvent[build.id].inQueueEvent) {
                        metrics.push({
                            date: null,
                            scope: scope,
                            intValue: -1,
                            name: DefinitionMetrics.CurrentBuildsInQueue
                        });
                    }
                }
            }
            // If - never seen this build before and not started yet
            else if (build.status === BuildContracts.BuildStatus.NotStarted) {
                // just increment in queue
                metrics.push({
                    date: null,
                    scope: scope,
                    intValue: 1,
                    name: DefinitionMetrics.CurrentBuildsInQueue
                });
                this._buildIdToEvent[build.id].inQueueEvent = true;
            }
            // If - never seen this build before and in progress
            else if (build.status === BuildContracts.BuildStatus.InProgress) {
                // just increment in progress
                metrics.push({
                    date: null,
                    scope: scope,
                    intValue: 1,
                    name: DefinitionMetrics.CurrentBuildsInProgress
                });
                this._buildIdToEvent[build.id].inProgressEvent = true;
                // since we directly received in progress event, mark in queue event also as seen, so that the next event handler won't consider this as missing case
                this._buildIdToEvent[build.id].inQueueEvent = true;
            }
            // If - never seen this build before and completed/cancelled
            else if (build.status === BuildContracts.BuildStatus.Completed || build.status === BuildContracts.BuildStatus.Cancelling) {
                // just take care of the result
                metrics = metrics.concat(this._getCompletedBuildMetrics(build.result, scope));

                // marking previous stages as known
                this._buildIdToEvent[build.id].inProgressEvent = true;
                this._buildIdToEvent[build.id].inQueueEvent = true;
            }

            definitionToBuildMetric[definitionId] = definitionToBuildMetric[definitionId].concat(metrics);
            definitionIds.push(definitionId);
        });

        definitionIds = Utils_Array.unique(definitionIds);
        definitionIds.forEach((definitionId: number) => {
            let newMetrics = definitionToBuildMetric[definitionId];
            if (newMetrics && newMetrics.length > 0) {
                // store aggregated ones - date is irrelevant
                this._definitionMetricsAggregated[definitionId] = appendBuildMetrics(this._definitionMetricsAggregated[definitionId], newMetrics);
            }

            // store actual metrics - honoring metric date
            let existingMetrics = this._definitionMetrics[definitionId] || [];
            this._definitionMetrics[definitionId] = appendBuildMetrics(existingMetrics, newMetrics, true);
        });

        this.emitChanged(isSignalRUpdate);
    }

    private _initializeDefinitionMetrics(definitionMetrics: DefinitionMetric[], behavior?: IDefinitionsBehavior) {
        if (definitionMetrics && definitionMetrics.length > 0) {
            definitionMetrics.forEach((definitionMetric) => {
                this._definitionMetricsAggregated[definitionMetric.definitionId] = aggregateBuildMetrics(definitionMetric.metrics);
                this._definitionMetrics[definitionMetric.definitionId] = definitionMetric.metrics;
            });
            this.emitChanged(behavior);
        }
    }

    private _getCompletedBuildMetrics(result: BuildContracts.BuildResult, scope: string) {
        let metrics: BuildContracts.BuildMetric[] = [];
        let currentDate = getUtcDate();
        switch (result) {
            case BuildContracts.BuildResult.Succeeded:
                metrics.push({
                    date: currentDate,
                    intValue: 1,
                    scope: scope,
                    name: DefinitionMetrics.SuccessfulBuilds
                });
                break;
            case BuildContracts.BuildResult.Failed:
                metrics.push({
                    date: currentDate,
                    intValue: 1,
                    scope: scope,
                    name: DefinitionMetrics.FailedBuilds
                });
                break;
            case BuildContracts.BuildResult.PartiallySucceeded:
                metrics.push({
                    date: currentDate,
                    intValue: 1,
                    scope: scope,
                    name: DefinitionMetrics.PartiallySuccessfulBuilds
                });
                break;
            case BuildContracts.BuildResult.Canceled:
                metrics.push({
                    date: currentDate,
                    intValue: 1,
                    scope: scope,
                    name: DefinitionMetrics.CanceledBuilds
                });
                break;
        }

        metrics.push({
            date: currentDate,
            intValue: 1,
            scope: scope,
            name: DefinitionMetrics.TotalBuilds
        });

        return metrics;
    }
}
var _definitionMetricStore: DefinitionMetricStore = null;

export function getDefinitionMetricStore(options?: IDefinitionMetricStoreOptions): DefinitionMetricStore {
    if (!_definitionMetricStore) {
        _definitionMetricStore = new DefinitionMetricStore(options);
    }
    return _definitionMetricStore;
}

function isMatchingMetric(originalMetric: BuildContracts.BuildMetric, metric: BuildContracts.BuildMetric, considerMetricDate: boolean) {
    let originalMetricTime = null;
    let metricTime = null;
    if (considerMetricDate) {
        let currentTime = getUtcDate().getTime();
        metricTime = originalMetric.date ? getUtcDate(originalMetric.date).getTime() : currentTime;
        originalMetricTime = metric.date ? getUtcDate(metric.date).getTime() : currentTime;
    }

    return Utils_String.equals(metric.scope, originalMetric.scope, true) && metricTime === originalMetricTime;
}

/**
 * Aggregate build metrics
 * This aggregates metrics with same name and scope
 * dates are ignored and always returns null as date
 * @param metrics metrics to aggregate
*/
export function aggregateBuildMetrics(metrics: BuildContracts.BuildMetric[]): BuildContracts.BuildMetric[] {
    metrics = metrics || [];
    var aggregatedMetrics: BuildContracts.BuildMetric[] = [];
    var metricNameToMetric: IDictionaryStringTo<BuildContracts.BuildMetric[]> = {};
    // create map - group by name
    metrics.forEach((value: BuildContracts.BuildMetric, index) => {
        if (!metricNameToMetric[value.name]) {
            metricNameToMetric[value.name] = [];
        }
        metricNameToMetric[value.name].push(value);
    });
    // now get values - sum()
    Object.keys(metricNameToMetric).forEach((name) => {
        let metrics = metricNameToMetric[name];
        let scopeToSum: IDictionaryStringTo<number> = {};
        metrics.forEach((metric) => {
            scopeToSum[metric.scope] = (scopeToSum[metric.scope] || 0) + metric.intValue;
        });

        Object.keys(scopeToSum).forEach((scope) => {
            aggregatedMetrics.push({
                intValue: scopeToSum[scope],
                name: name,
                scope: scope,
                date: null
            });
        });
    });
    return aggregatedMetrics;
}

/**
 * Append build metrics, this will also makes sure that there won't be any negative values on decrements
 * @param originalMetrics metrics
 * @param metrics metrics to be appended to
 * @param considerMetricDate whether to consider metric date while appending metrics, defaults to false
*/
export function appendBuildMetrics(originalMetrics: BuildContracts.BuildMetric[], metrics: BuildContracts.BuildMetric[], considerMetricDate: boolean = false): BuildContracts.BuildMetric[] {
    metrics = metrics || [];
    originalMetrics = originalMetrics || [];
    let incrementedMetrics: BuildContracts.BuildMetric[] = [];

    let metricNameToScopedMetrics: IDictionaryStringTo<BuildContracts.BuildMetric[]> = {};
    // create map of original metrics
    originalMetrics.forEach((metric) => {
        if (!metricNameToScopedMetrics[metric.name]) {
            metricNameToScopedMetrics[metric.name] = [];
        }
        metricNameToScopedMetrics[metric.name].push(metric);
    });

    // go through metrics and see if there is corresponding item in original metrics, if so increment, else push new one
    // note that we already aggregated metrics, so we would have unique metric per name, branch
    metrics.forEach((value: BuildContracts.BuildMetric, index) => {
        let existingMetrics = metricNameToScopedMetrics[value.name];
        if (!existingMetrics) {
            // this is new metric
            incrementedMetrics.push({
                date: value.date,
                intValue: value.intValue > 0 ? value.intValue : 0,
                name: value.name,
                scope: value.scope
            });

            //clear
            delete metricNameToScopedMetrics[value.name];
        }
        else {
            // check for scope and time if asked for
            let existingScopedMetric = existingMetrics.filter((metric) => {
                return isMatchingMetric(metric, value, considerMetricDate);
            });

            // existingScopedMetric should only contain one metric since original metrics are supposed to be unique per name, scope and day.
            if (existingScopedMetric && existingScopedMetric.length > 1) {
                logError("original metrics are not unique, metric calculations would go wrong" + JSON.stringify(originalMetrics));
            }

            if (existingScopedMetric && existingScopedMetric.length > 0) {
                let metricValue = value.intValue + existingScopedMetric[0].intValue;
                incrementedMetrics.push({
                    date: value.date,
                    intValue: metricValue > 0 ? metricValue : 0,
                    name: value.name,
                    scope: value.scope
                });

                //clear this particular metric from map since we are done, we push the rest of the map in the end
                metricNameToScopedMetrics[value.name] = metricNameToScopedMetrics[value.name].filter((item) => {
                    return !isMatchingMetric(item, value, considerMetricDate);
                });
            }
            else {
                // this is new metric
                incrementedMetrics.push({
                    date: value.date,
                    intValue: value.intValue > 0 ? value.intValue : 0,
                    name: value.name,
                    scope: value.scope
                });
            }
        }
    });

    Object.keys(metricNameToScopedMetrics).forEach((name) => {
        if (metricNameToScopedMetrics[name].length > 0) {
            incrementedMetrics = incrementedMetrics.concat(metricNameToScopedMetrics[name]);
        }
    });

    return incrementedMetrics;
}

/**
 * merge as unique build metrics, result will have unique metrics per name, rest will be ignored
 * This ensures that there will be only one metric per name
 * @param originalMetrics metrics
*/
export function mergeBuildMetricsUniquePerName(originalMetrics: BuildContracts.BuildMetric[]): BuildContracts.BuildMetric[] {
    let mergedMetricsMap: IDictionaryStringTo<BuildContracts.BuildMetric> = {};
    let metrics: BuildContracts.BuildMetric[] = [];

    originalMetrics.forEach((metric) => {
        if (mergedMetricsMap[metric.name]) {
            mergedMetricsMap[metric.name].intValue += metric.intValue;
        }
        else {
            mergedMetricsMap[metric.name] = {
                scope: metric.scope,
                date: metric.date,
                intValue: metric.intValue,
                name: metric.name
            };
        }
    });

    Object.keys(mergedMetricsMap).forEach((key) => {
        metrics.push(mergedMetricsMap[key]);
    });

    return metrics;
}
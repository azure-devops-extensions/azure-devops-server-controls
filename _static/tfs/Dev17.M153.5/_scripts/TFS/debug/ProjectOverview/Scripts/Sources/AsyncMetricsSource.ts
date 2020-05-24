import { requireModules } from "VSS/VSS";
import { GitCodeMetricsData, TfvcCodeMetricsData, WitMetricsData } from "ProjectOverview/Scripts/Generated/Contracts";
import {
    DeploymentMetricsData,
    TryDeploymentMetricsData,
    BuildMetricsPayload
} from "ProjectOverview/Scripts/ActionsHub";
import { CodeMetricsData } from "ProjectOverview/Scripts/Models";
import * as MetricsSource_Async from "ProjectOverview/Scripts/Sources/MetricsSource";

export class AsyncMetricsSource {
    private _metricsSourcePromise: IPromise<MetricsSource_Async.MetricsSource>;

    public fetchCodeMetric(numOfDays: number): IPromise<CodeMetricsData> {
        return this._getMetricsSourceAsync().then(
            (metricsSource: MetricsSource_Async.MetricsSource) => metricsSource.fetchCodeMetric(numOfDays));
    }

    public fetchGitMetric(numOfDays: number): IPromise<GitCodeMetricsData> {
        return this._getMetricsSourceAsync().then(
            (metricsSource: MetricsSource_Async.MetricsSource) => metricsSource.fetchGitMetric(numOfDays));
    }

    public fetchTfvcMetric(numOfDays: number): IPromise<TfvcCodeMetricsData> {
        return this._getMetricsSourceAsync().then(
            (metricsSource: MetricsSource_Async.MetricsSource) => metricsSource.fetchTfvcMetric(numOfDays));
    }

    public fetchDeploymentMetrics(numOfDays: number): IPromise<DeploymentMetricsData> {
        return this._getMetricsSourceAsync().then(
            (metricsSource: MetricsSource_Async.MetricsSource) => metricsSource.fetchDeploymentMetrics(numOfDays));
    }

    public tryFetchDeploymentMetrics(numOfDays: number): IPromise<TryDeploymentMetricsData> {
        return this._getMetricsSourceAsync().then(
            (metricsSource: MetricsSource_Async.MetricsSource) => metricsSource.tryFetchDeploymentMetrics(numOfDays));
    }

    public checkWitExists(projectId: string): IPromise<boolean> {
        return this._getMetricsSourceAsync().then(
            (metricsSource: MetricsSource_Async.MetricsSource) => metricsSource.checkWitExists(projectId));
    }

    public fetchWitMetric(numOfDays: number): IPromise<WitMetricsData> {
        return this._getMetricsSourceAsync().then(
            (metricsSource: MetricsSource_Async.MetricsSource) => metricsSource.fetchWitMetric(numOfDays));
    }

    public fetchBuildMetrics(projectId: string, numOfDays: number): IPromise<BuildMetricsPayload> {
        return this._getMetricsSourceAsync().then(
            (metricsSource: MetricsSource_Async.MetricsSource) => metricsSource.fetchBuildMetrics(projectId, numOfDays));
    }

    private _getMetricsSourceAsync(): IPromise<MetricsSource_Async.MetricsSource> {
        if (!this._metricsSourcePromise) {
            this._metricsSourcePromise = requireModules(["ProjectOverview/Scripts/Sources/MetricsSource"]).spread(
                (metricsSourceModule: typeof MetricsSource_Async) => new metricsSourceModule.MetricsSource());
        }

        return this._metricsSourcePromise;
    }
}

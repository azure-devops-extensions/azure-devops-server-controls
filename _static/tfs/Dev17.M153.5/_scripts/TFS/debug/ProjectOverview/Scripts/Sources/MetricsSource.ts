import * as Q from "q";
import * as LocalPageData from "VSS/Contributions/LocalPageData";
import { WebPageDataService } from "VSS/Contributions/Services";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { getScenarioManager } from "VSS/Performance";
import * as VSS_Service from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import * as RMContracts from "ReleaseManagement/Core/Contracts";
import * as WitRestClient from "TFS/WorkItemTracking/RestClient";
import { WorkItemQueryResult } from "TFS/WorkItemTracking/Contracts";
import { BuildHttpClient } from "TFS/Build/RestClient";
import { MetricAggregationTypes, DefinitionMetrics } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import * as BuildContracts from "TFS/Build/Contracts";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { Constants, RMConstants, PerformanceConstants } from "ProjectOverview/Scripts/Constants";
import { ProjectOverviewConstants, ProjectOverviewCIConstants } from "ProjectOverview/Scripts/Generated/Constants";
import { GitCodeMetricsData, TypeInfo, TfvcCodeMetricsData, WitMetricsData } from "ProjectOverview/Scripts/Generated/Contracts";
import {
    ReleaseAvailabilityStatus,
    DeploymentMetricsData,
    TryDeploymentMetricsData,
    BuildMetricsPayload
} from "ProjectOverview/Scripts/ActionsHub";
import { CodeMetricsData } from "ProjectOverview/Scripts/Models";

export class MetricsSource {
    private readonly _metricsDataProviderId: string = Constants.ProjectActivityDataProviderId;

    constructor(
        private _webPageDataService?: WebPageDataService,
        private _witClient?: WitRestClient.WorkItemTrackingHttpClient, 
        private _buildClient?: BuildHttpClient,
    ) { }    

    public fetchCodeMetric(numOfDays: number): IPromise<CodeMetricsData> {
        const deferred = Q.defer<CodeMetricsData>();
        const perfScenario = getScenarioManager().startScenario(ProjectOverviewCIConstants.Area, PerformanceConstants.CodeMetricsFetchTime);
        const webPageDataService = this._getWebPageDataService();
        const contribution = this._getProjectActivityContribution();
        const properties = this._getProjectOverviewProperties(ProjectOverviewConstants.CodeMetrics, numOfDays);

        webPageDataService.ensureDataProvidersResolved([contribution], true, properties).then(() => {
            const pageData = webPageDataService.getPageData(this._metricsDataProviderId) || {};
            const codeMetrics: CodeMetricsData = {
                gitCodeMetrics: pageData[ProjectOverviewConstants.GitMetrics],
                tfvcCodeMetrics: pageData[ProjectOverviewConstants.TfvcMetrics],
            };
            perfScenario.addData({ "days": numOfDays });
            perfScenario.end();
            deferred.resolve(codeMetrics);
        }, (error: Error) => {
            perfScenario.abort();
            deferred.reject(error);
        });

        return deferred.promise;
    }

    public fetchGitMetric(numOfDays: number): IPromise<GitCodeMetricsData> {
        const deferred = Q.defer<GitCodeMetricsData>();
        const perfScenario = getScenarioManager().startScenario(ProjectOverviewCIConstants.Area, PerformanceConstants.GitMetricsFetchTime);
        const webPageDataService = this._getWebPageDataService();
        const contribution = this._getProjectActivityContribution();
        const properties = this._getProjectOverviewProperties(ProjectOverviewConstants.GitMetrics, numOfDays);

        webPageDataService.ensureDataProvidersResolved([contribution], true, properties).then(() => {
            const pageData = webPageDataService.getPageData(this._metricsDataProviderId) || {};
            const gitMetrics: GitCodeMetricsData = pageData[ProjectOverviewConstants.GitMetrics];
            perfScenario.addData({ "days": numOfDays });
            perfScenario.end();
            deferred.resolve(gitMetrics);
        }, (error: Error) => {
            perfScenario.abort();
            deferred.reject(error);
        });

        return deferred.promise;
    }

    public fetchTfvcMetric(numOfDays: number): IPromise<TfvcCodeMetricsData> {
        const deferred = Q.defer<TfvcCodeMetricsData>();
        const perfScenario = getScenarioManager().startScenario(ProjectOverviewCIConstants.Area, PerformanceConstants.TfvcMetricsFetchTime);
        const webPageDataService = this._getWebPageDataService();
        const contribution = this._getProjectActivityContribution();
        const properties = this._getProjectOverviewProperties(ProjectOverviewConstants.TfvcMetrics, numOfDays);

        webPageDataService.ensureDataProvidersResolved([contribution], true, properties).then(() => {
            const pageData = webPageDataService.getPageData(this._metricsDataProviderId) || {};
            const tfvcMetrics: TfvcCodeMetricsData = pageData[ProjectOverviewConstants.TfvcMetrics];
            perfScenario.addData({ "days": numOfDays });
            perfScenario.end();
            deferred.resolve(tfvcMetrics);
        }, (error: Error) => {
            perfScenario.abort();
            deferred.reject(error);
        });

        return deferred.promise;
    }

    public fetchDeploymentMetrics(numOfDays: number): IPromise<DeploymentMetricsData> {
        const deferred = Q.defer<DeploymentMetricsData>();
        const perfScenario = getScenarioManager().startScenario(ProjectOverviewCIConstants.Area, PerformanceConstants.RMGetDeploymentMetricsTime);
        const webPageDataService = this._getWebPageDataService();
        const contribution = this._getReleaseManagementContribution();
        const properties = this._getReleaseManagementProperties(numOfDays, RMConstants.GetDeploymentMetrics);

        webPageDataService.ensureDataProvidersResolved([contribution], true, properties).then(() => {
            const pageData = webPageDataService.getPageData(RMConstants.DataProviderId) || {};
            const deploymentMetrics: DeploymentMetricsData = this._getDeploymentMetricsData(pageData[RMConstants.DeploymentMetrics] as RMContracts.Metric[]);
            perfScenario.addData({ "days": numOfDays });
            perfScenario.end();
            deferred.resolve(deploymentMetrics);
        }, (error: Error) => {
            perfScenario.abort();
            deferred.reject(error);
        });

        return deferred.promise;
    }

    public tryFetchDeploymentMetrics(numOfDays: number): IPromise<TryDeploymentMetricsData> {
        const deferred = Q.defer<TryDeploymentMetricsData>();
        const perfScenario = getScenarioManager().startScenario(ProjectOverviewCIConstants.Area, PerformanceConstants.RMTryGetDeploymentMetricsTime);
        const webPageDataService = this._getWebPageDataService();
        const contribution = this._getReleaseManagementContribution();
        const properties = this._getReleaseManagementProperties(numOfDays, RMConstants.TryGetDeploymentMetrics);

        webPageDataService.ensureDataProvidersResolved([contribution], true, properties).then(() => {
            const pageData = webPageDataService.getPageData(RMConstants.DataProviderId) || {};

            // If there are no resolved providers then it means that 
            // data provider does not exist in RM
            const contributionDataResult = LocalPageData.getDataProviderResults();
            if (!contributionDataResult.resolvedProviders || !contributionDataResult.resolvedProviders.length) {
                deferred.resolve({
                    releaseAvailabilityStatus: ReleaseAvailabilityStatus.ProviderAbsent
                } as TryDeploymentMetricsData);
            } else {
                let status: ReleaseAvailabilityStatus = ReleaseAvailabilityStatus.AvailabilityUnknown;
                let deploymentMetricsData = null;

                if (pageData[RMConstants.HasDefinitions]) {
                    status = ReleaseAvailabilityStatus.DefinitionsPresent;
                    deploymentMetricsData = this._getDeploymentMetricsData(pageData[RMConstants.DeploymentMetrics] as RMContracts.Metric[]);
                } else {
                    status = ReleaseAvailabilityStatus.DefinitionsAbsent;
                }

                const tryDeploymentMetrics: TryDeploymentMetricsData = {
                    deploymentMetricsData: deploymentMetricsData,
                    releaseAvailabilityStatus: status
                };

                perfScenario.addData({ "days": numOfDays });
                perfScenario.end();
                deferred.resolve(tryDeploymentMetrics);
            }
        }, (error: Error) => {
            perfScenario.abort();
            deferred.reject(error);
        });

        return deferred.promise;
    }

    public checkWitExists(projectId: string): IPromise<boolean> {
        const topOne = 1;

        //Query a top 1 workitem created in the project
        let wiql = `SELECT [${CoreFieldRefNames.Id}] FROM WorkItems WHERE [${CoreFieldRefNames.TeamProject}] = @project`;
        let perfScenario = getScenarioManager().startScenario(ProjectOverviewCIConstants.Area, PerformanceConstants.WitExistsFetchTime);

        return this._getWiqlResults(wiql, projectId, topOne).then((value: number) => {
            perfScenario.end();

            if (value === 1) {
                return true;
            }
            else {
                return false;
            }
        });
    }

    public fetchWitMetric(numOfDays: number): IPromise<WitMetricsData> {
        const maxItems = Constants.MaxWorkItemsMetric + 1;
        const deferred = Q.defer<WitMetricsData>();
        const perfScenario = getScenarioManager().startScenario(ProjectOverviewCIConstants.Area, PerformanceConstants.WitMetricsFetchTime);
        const webPageDataService = this._getWebPageDataService();
        const contribution = this._getProjectActivityContribution();
        const properties = this._getProjectOverviewProperties(ProjectOverviewConstants.WorkMetrics, numOfDays, maxItems);

        webPageDataService.ensureDataProvidersResolved([contribution], true, properties).then(() => {
            const pageData = webPageDataService.getPageData(this._metricsDataProviderId) || {};
            const witMetrics: WitMetricsData = pageData[ProjectOverviewConstants.WorkMetrics];
            perfScenario.addData({ "days": numOfDays });
            perfScenario.end();
            deferred.resolve(witMetrics);
        }, (error: Error) => {
            perfScenario.abort();
            deferred.reject(error);
        });

        return deferred.promise;
    }

    public fetchBuildMetrics(projectId: string, numOfDays: number): IPromise<BuildMetricsPayload> {
        let client = this._getBuildClient();

        let fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - numOfDays);

        let precision = MetricAggregationTypes.Daily;
        // build APIs are hourly precise only if date range is 1-3 days
        // for larger ranges they support only day precision
        if (numOfDays === 1) {
            precision = MetricAggregationTypes.Hourly;
        }

        return client.getProjectMetrics(
            projectId,
            precision,
            fromDate).then(
            (metrics: BuildContracts.BuildMetric[]) => {
                if (!metrics) {
                    return null;
                }
                let passed: number = 0;
                let notPassed: number = 0;

                // Build sends daily metrics, so we need to sum up
                // values for all the days and show 
                for (let metric of metrics) {
                    // The requirement is to treat partially successful also as passed
                    if (metric.name === DefinitionMetrics.SuccessfulBuilds || metric.name === DefinitionMetrics.PartiallySuccessfulBuilds) {
                        passed += metric.intValue;
                    }
                    else if (metric.name === DefinitionMetrics.FailedBuilds) {
                        notPassed += metric.intValue;
                    }
                }

                let data: BuildMetricsPayload = {
                    buildsNotPassed: notPassed,
                    buildsPassed: passed
                };

                return data;
            });
    }

    private _getWiqlResults(wiql: string, projectId: string, top: number, timePrecision: boolean = false): IPromise<number> {
        if (!this._witClient) {
            this._witClient = VSS_Service.getClient<WitRestClient.WorkItemTrackingHttpClient>(WitRestClient.WorkItemTrackingHttpClient);
        }

        return this._witClient.queryByWiql({ query: wiql }, projectId, undefined, timePrecision, top).then((witQueryResult: WorkItemQueryResult) => {
            return witQueryResult.workItems.length;
        });
    }

    private _getWebPageDataService(): WebPageDataService {
        if (!this._webPageDataService) {
            this._webPageDataService = VSS_Service.getService(WebPageDataService);
        }

        return this._webPageDataService;
    }

    private _getBuildClient(): BuildHttpClient {
        if (!this._buildClient) {
            this._buildClient = ProjectCollection.getConnection().getHttpClient(BuildHttpClient);
        }
        return this._buildClient;
    }

    private _getProjectActivityContribution(): Contribution {
        const contribution: Contribution = {
            id: this._metricsDataProviderId,
            properties: {
                serviceInstanceType: ServiceInstanceTypes.TFS,
            },
        } as Contribution;

        return contribution;
    }

    private _getProjectOverviewProperties(scope: string, numOfDays: number, maxCount?: number): IDictionaryStringTo<Object> {
        return {
            [ProjectOverviewConstants.Scope]: scope,
            [ProjectOverviewConstants.NumOfDays]: numOfDays,
            [ProjectOverviewConstants.WorkMetrics_MaxCountLabel]: maxCount,
        };
    }

    private _getDeploymentMetricsData(deploymentMetrics: RMContracts.Metric[]): DeploymentMetricsData {
        if (!deploymentMetrics) {
            return null;
        }

        let passed: number = 0;
        let notPassed: number = 0;

        for (let metric of deploymentMetrics) {
            // The requirement is to treat partially successful also as passed
            if (metric.name === RMConstants.SuccessfulDeployments || metric.name === RMConstants.PartiallySuccessfulDeployments) {
                passed += metric.value;
            }
            else if (metric.name === RMConstants.FailedDeployments) {
                notPassed = metric.value;
            }
        }

        let deploymentMetricData: DeploymentMetricsData = {
            deploymentsNotPassed: notPassed,
            deploymentsPassed: passed
        };

        return deploymentMetricData;
    }

    private _getReleaseManagementContribution(): Contribution {
        const contribution: Contribution = {
            id: RMConstants.DataProviderId,
            properties: {
                serviceInstanceType: RMConstants.ServiceInstanceId,
            },
        } as Contribution;

        return contribution;
    }

    private _getReleaseManagementProperties(numOfDays: number, operation: string): IDictionaryStringTo<Object> {
        const date = new Date();

        if (numOfDays === 1) {
            date.setDate(date.getDate() - numOfDays);
        }
        else {
            // since build supports day precision for 7,30 days range
            // make RM metrics behave simillarly
            date.setUTCDate(date.getUTCDate() - numOfDays);
            // UTC midnight
            date.setUTCHours(0, 0, 0, 0);
        }

        return {
            [RMConstants.MinMetricsDateTime]: date,
            [RMConstants.Operation]: operation,
        };
    }
}
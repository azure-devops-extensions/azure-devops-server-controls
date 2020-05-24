import * as VSSStore from "VSS/Flux/Store";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import { Constants } from "ProjectOverview/Scripts/Constants";
import {
    GitCodeMetricsData,
    ProjectOverviewData,
    TfvcCodeMetricsData,
    WitMetricsData
} from "ProjectOverview/Scripts/Generated/Contracts";
import {
    WitAvailabilityStatus,
    ReleaseAvailabilityStatus,
    DeploymentMetricsData,
    TryDeploymentMetricsData,
    BuildMetricsPayload
} from "ProjectOverview/Scripts/ActionsHub";
import { CodeMetricsData } from "ProjectOverview/Scripts/Models";

const numberOfDaysOptions = [1, 7, 30]

export interface CodeMetrics {
    hasCode: boolean;
    showGitStats: boolean;
    showTfvcStats: boolean;
    metricsAvailableDays?: number;
    gitMetrics?: GitCodeMetricsData;
    tfvcMetrics?: TfvcCodeMetricsData;
}

export interface WorkMetrics {
    witAvailable: WitAvailabilityStatus;
    metrics: WitMetricsData;
}

export interface MetricState {
    isLoading: boolean;
    currentNumberOfDays: number;
    numberOfDaysOptions: number[];
    codeMetrics?: CodeMetrics;
    workMetrics?: WorkMetrics;
    releaseMetrics?: ReleaseMetrics;
    buildMetrics?: BuildMetrics;
}

export interface ReleaseMetrics {
    releaseAvailability: ReleaseAvailabilityStatus;
    isRMFaultedIn: boolean;
    deploymentMetrics?: DeploymentMetricsData;
}

export interface BuildMetrics {
    buildDefinitionsPresent: boolean;
    buildMetrics?: BuildMetricsPayload;
}

export class MetricStore extends VSSStore.Store {
    public static getWitAvailabilityStatus(isWitAvailable: boolean): WitAvailabilityStatus {
        return isWitAvailable ? WitAvailabilityStatus.Created : WitAvailabilityStatus.NoneCreated;
    }

    private _state;

    constructor() {
        super();

        this._state = {
            isLoading: true,
            numberOfDaysOptions: undefined,
            currentNumberOfDays: undefined,
            codeMetrics: {
                hasCode: undefined,
                showGitStats: undefined,
                showTfvcStats: undefined,
                metricsAvailableDays: undefined,
            },
            workMetrics: {
                witAvailable: WitAvailabilityStatus.AvailabilityUnknown
            },
            releaseMetrics: {
                releaseAvailability: ReleaseAvailabilityStatus.AvailabilityUnknown,
                isRMFaultedIn: undefined,
            },
            buildMetrics: {
                buildDefinitionsPresent: undefined,
            }
        };
    }

    public getState(): MetricState {
        return this._state;
    }

    public loadMetricState = (projectOverviewData: ProjectOverviewData): void => {
        let codeMetricsAvailableDays = projectOverviewData.codeMetricsAvailableForDays;
        let defaultNumberOfdays = numberOfDaysOptions[1];

        //if data is not available for all days set default appropriately
        if (codeMetricsAvailableDays || codeMetricsAvailableDays === 0) {
            if (projectOverviewData.hasCode && codeMetricsAvailableDays < numberOfDaysOptions[1]) {
                defaultNumberOfdays = numberOfDaysOptions[0];
            }
        }
        else {
            codeMetricsAvailableDays = numberOfDaysOptions[numberOfDaysOptions.length - 1] + 1;
        }

        this._state.currentNumberOfDays = defaultNumberOfdays;
        this._state.numberOfDaysOptions = numberOfDaysOptions;
        this._state.codeMetrics.hasCode = projectOverviewData.hasCode;
        this._state.codeMetrics.showGitStats = projectOverviewData.supportsGit;
        this._state.codeMetrics.showTfvcStats = projectOverviewData.supportsTFVC;
        this._state.codeMetrics.metricsAvailableDays = codeMetricsAvailableDays;
        this._state.releaseMetrics.isRMFaultedIn = projectOverviewData.isRMFaultedIn;
        this._state.buildMetrics.buildDefinitionsPresent = projectOverviewData.hasBuildConfigured;
        this._state.isLoading = false;
        this.emitChanged();
    }

    public stopIsLoading = (): void => {
        this._state.isLoading = false;
        this.emitChanged();
    }

    public updateNumberOfDays = (numberOfDays: number): void => {
        this._state.currentNumberOfDays = numberOfDays;
        this.emitChanged();
    }

    public updateGitMetric = (newMetrics: GitCodeMetricsData) => {
        this._state.codeMetrics.gitMetrics = newMetrics;
        this.emitChanged();
    }

    public updateTfvcMetric = (newMetrics: TfvcCodeMetricsData) => {
        this._state.codeMetrics.tfvcMetrics = newMetrics;
        this.emitChanged();
    }

    public updateCodeMetric = (newMetric: CodeMetricsData) => {
        this._state.codeMetrics.gitMetrics = newMetric.gitCodeMetrics;
        this._state.codeMetrics.tfvcMetrics = newMetric.tfvcCodeMetrics;
        this.emitChanged();
    }

    public updateWorkMetric = (newMetrics: WitMetricsData) => {
        this._state.workMetrics.metrics = newMetrics;
        this.emitChanged();
    }

    public updateWorkMetricAvailability = (isAvailable: boolean) => {
        this._state.workMetrics.witAvailable = MetricStore.getWitAvailabilityStatus(isAvailable);
        this.emitChanged();
    }

    public updateDeloymentMetric = (newMetrics: DeploymentMetricsData) => {
        this._state.releaseMetrics.deploymentMetrics = newMetrics;
        this.emitChanged();
    }

    public tryUpdateDeploymentMetric = (tryDeploymentMetricsData: TryDeploymentMetricsData) => {
        this._state.releaseMetrics.releaseAvailability = tryDeploymentMetricsData.releaseAvailabilityStatus;
        this._state.releaseMetrics.deploymentMetrics = tryDeploymentMetricsData.deploymentMetricsData;
        this.emitChanged();
    }

    public updateBuildMetric = (newMetrics: BuildMetricsPayload) => {
        this._state.buildMetrics.buildMetrics = newMetrics;
        this.emitChanged();
    }
}
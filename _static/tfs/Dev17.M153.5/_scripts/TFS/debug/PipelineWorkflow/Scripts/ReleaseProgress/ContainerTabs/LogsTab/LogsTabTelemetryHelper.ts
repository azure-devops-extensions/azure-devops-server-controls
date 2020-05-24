import { Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { IJobItem, JobSortType, JobStates } from "DistributedTaskUI/Logs/Logs.Types";
import {ReleaseEnvironmentHelper} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentHelper";
import { ILogsFilterState } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";

export namespace LogsTabTelemetryProperties {

    // LogsTabLoadTelemetry properties
    export const environmentState: string = "environmentState";
    export const attemptsCount: string = "attemptsCount";
    export const inProgressJobCount: string = "inProgressJobCount";
    export const skippedJobCount: string = "skippedJobCount";
    export const failedJobCount: string = "failedJobCount";
    export const succeededJobCount: string = "succeededJobCount";
    export const partiallySucceededJobCount: string = "partiallySucceededJobCount";

    // Approval properties
    export const isApproveButtonVisible: string = "isApproveButtonVisible";
}

export namespace DeploymentGroupLogsTabTelemetryProperties {
    export const totalMachineCount: string = "totalMachineCount";
    export const sortOrder: string = "sortOrder";
    export const isTextFilterSet: string = "isTextFilterSet";
    export const statusFilter: string = "statusFilter";
}

export namespace LogsTabTelemetryFeature {
    export const logsTabLoadTelemetryFeature: string = "logsTabLoadTelemetry";
    export const logsTabAttemptChangeFeature: string = "logsTabAttemptChange";
    export const logsTabApprovalsClickFeature: string = "logsTabApprovalsClickFeature";
    export const deploymentGroupLogsTabInfo: string = "deploymentGroupLogsTabInfo";
    export const logsTabFilterStatus: string = "logsTabFilterChanged";
    export const logsTabSortOrder: string = "logsTabSortOrderChanged;";
}

export class LogsTabTelemetryHelper {


    public static publishLogsTabLoadTelemetry(environment: RMContracts.ReleaseEnvironment, items: IJobItem[]): void {

        if (environment) {
            let eventProperties: IDictionaryStringTo<any> = {};
            const environmentHelper = new ReleaseEnvironmentHelper(environment);
            const status = environmentHelper.getStatusInfo();

            eventProperties[LogsTabTelemetryProperties.environmentState] = status ? status.statusText : null;
            eventProperties[LogsTabTelemetryProperties.attemptsCount] = environment.deploySteps ? environment.deploySteps.length : 0;
            eventProperties[LogsTabTelemetryProperties.inProgressJobCount] = LogsTabTelemetryHelper.getJobCountForState(items, JobStates.InProgress);
            eventProperties[LogsTabTelemetryProperties.skippedJobCount] = LogsTabTelemetryHelper.getJobCountForState(items, JobStates.Skipped);
            eventProperties[LogsTabTelemetryProperties.failedJobCount] = LogsTabTelemetryHelper.getJobCountForState(items, JobStates.Failed);
            eventProperties[LogsTabTelemetryProperties.succeededJobCount] = LogsTabTelemetryHelper.getJobCountForState(items, JobStates.Succeeded);
            eventProperties[LogsTabTelemetryProperties.partiallySucceededJobCount] = LogsTabTelemetryHelper.getJobCountForState(items, JobStates.PartiallySucceeded);
            Telemetry.instance().publishEvent(LogsTabTelemetryFeature.logsTabLoadTelemetryFeature, eventProperties);
        }
    }

    public static publishDeploymentGroupLogsTabInfo(items: IJobItem[], filterState: ILogsFilterState): void {
        let eventProperties: IDictionaryStringTo<any> = {};

        items = items ? items : [];
        filterState = filterState ? filterState : { filterText: Utils_String.empty } as ILogsFilterState;

        eventProperties[DeploymentGroupLogsTabTelemetryProperties.totalMachineCount] = items.length;
        eventProperties[LogsTabTelemetryProperties.inProgressJobCount] = LogsTabTelemetryHelper.getJobCountForState(items, JobStates.InProgress);
        eventProperties[LogsTabTelemetryProperties.skippedJobCount] = LogsTabTelemetryHelper.getJobCountForState(items, JobStates.Skipped);
        eventProperties[LogsTabTelemetryProperties.failedJobCount] = LogsTabTelemetryHelper.getJobCountForState(items, JobStates.Failed);
        eventProperties[LogsTabTelemetryProperties.succeededJobCount] = LogsTabTelemetryHelper.getJobCountForState(items, JobStates.Succeeded);
        eventProperties[LogsTabTelemetryProperties.partiallySucceededJobCount] = LogsTabTelemetryHelper.getJobCountForState(items, JobStates.PartiallySucceeded);
        eventProperties[DeploymentGroupLogsTabTelemetryProperties.isTextFilterSet] = filterState.filterText ? true : false;
        eventProperties[DeploymentGroupLogsTabTelemetryProperties.statusFilter] = LogsTabTelemetryHelper.getStatusFilterText(filterState);
        Telemetry.instance().publishEvent(LogsTabTelemetryFeature.deploymentGroupLogsTabInfo, eventProperties);
    }

    public static publishDeploymentGroupLogsSortOrderSelected(sortOrder: JobSortType): void {
        if (!sortOrder) {
            sortOrder = JobSortType.Unknown;
        }
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[DeploymentGroupLogsTabTelemetryProperties.sortOrder] = this._getJobSortTypeName(sortOrder);
        Telemetry.instance().publishEvent(LogsTabTelemetryFeature.logsTabSortOrder, eventProperties);
    }

    public static publishDeploymentGroupLogsFilterTelemetry(filterState: ILogsFilterState): void {
        if (!filterState) {
            filterState = {} as ILogsFilterState;
        }
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[DeploymentGroupLogsTabTelemetryProperties.isTextFilterSet] = filterState.filterText ? true : false;
        eventProperties[DeploymentGroupLogsTabTelemetryProperties.statusFilter] = LogsTabTelemetryHelper.getStatusFilterText(filterState);
        Telemetry.instance().publishEvent(LogsTabTelemetryFeature.logsTabFilterStatus, eventProperties);
    }

    public static publishAttemptChangeTelemetry(): void {
        Telemetry.instance().publishEvent(LogsTabTelemetryFeature.logsTabAttemptChangeFeature);
    }

    public static publishDGPhaseClickTelemetry(): void {
        //Todo: Add code here to add following telemetry
        //status of phase, count of machines/tasks of inprogress/skipped/failed/… tasks/machines
    }

    public static publishViewApprovalClickActionTelemetry(isApproveButtonVisible: boolean): void {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[LogsTabTelemetryProperties.isApproveButtonVisible] = isApproveButtonVisible;
        Telemetry.instance().publishEvent(LogsTabTelemetryFeature.logsTabApprovalsClickFeature, eventProperties);
    }

    private static getJobCountForState(items: IJobItem[], state: JobStates): number {
        let count: number = 0;
        if (items && items.length > 0) {
            items = items.filter((item: IJobItem) => {
                return item.jobState === state;
            });
            count = items ? items.length : 0;
        }
        return count;
    }

    private static getStatusFilterText(filterState: ILogsFilterState): string {
        let jobStates: JobStates[] = [JobStates.ApprovalPending, JobStates.Approved, JobStates.AutomatedApproval, JobStates.Cancelled, JobStates.Cancelling, JobStates.EvaluatingGates, JobStates.Failed, JobStates.GatesFailed, JobStates.GatesPartiallySucceeded, JobStates.GatesSucceded, JobStates.InProgress, JobStates.PartiallySucceeded, JobStates.Pending, JobStates.Reassigned, JobStates.Rejected, JobStates.Skipped, JobStates.Succeeded, JobStates.Undefined];
        let statusFilterText = "";

        let enabledJobStates: string[] = [];

        jobStates.forEach((jobState: JobStates) => {
            if (jobState & filterState.jobStates) {
                enabledJobStates.push(this._getJobStateName[jobState]);
            }
        });

        statusFilterText = enabledJobStates.join();
        return statusFilterText;
    }

    private static _getJobStateName(state: JobStates): string {
        switch (state) {
            case JobStates.ApprovalPending: return "ApprovalPending";
            case JobStates.Approved: return "Approved";
            case JobStates.AutomatedApproval: return "AutomatedApproval";
            case JobStates.Cancelled: return "Cancelled";
            case JobStates.Cancelling: return "Cancelling";
            case JobStates.EvaluatingGates: return "EvaluatingGates";
            case JobStates.Failed: return "Failed";
            case JobStates.GatesFailed: return "GatesFailed";
            case JobStates.GatesPartiallySucceeded: return "GatesPartiallySucceeded";
            case JobStates.GatesSucceded: return "GatesSucceded";
            case JobStates.InProgress: return "InProgress";
            case JobStates.PartiallySucceeded: return "PartiallySucceeded";
            case JobStates.Pending: return "Pending";
            case JobStates.Reassigned: return "Reassigned";
            case JobStates.Rejected: return "Rejected";
            case JobStates.Skipped: return "Skipped";
            case JobStates.Succeeded: return "Succeeded";
            default: return "Undefined";
        }
    }

    private static _getJobSortTypeName(sortType: JobSortType): string {
        switch (sortType) {
            case JobSortType.DurationAsc: return "DurationAsc";
            case JobSortType.DurationDesc: return "DurationDesc";
            case JobSortType.StartTimeAsc: return "StartTimeAsc";
            default: return "Undefined";
        }
    }
}
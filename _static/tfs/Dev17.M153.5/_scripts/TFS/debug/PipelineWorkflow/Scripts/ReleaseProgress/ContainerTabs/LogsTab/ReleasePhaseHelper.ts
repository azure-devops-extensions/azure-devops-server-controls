import * as Q from "q";

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IAgentPhaseJobItem, IJobItem, IServerPhaseJobItem, Issue, IssueType, IStatus, ITaskLog, JobStates, JobType, TaskState } from "DistributedTaskUI/Logs/Logs.Types";
import { LogsViewUtility } from "DistributedTaskUI/Logs/LogsViewUtility";

import { IReleaseApprovalsData } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentApprovalTypes";
import { LogsSource } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsSource";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { IReleaseEnvironmentGatesRuntimeData, ReleaseEnvironmentGatesViewType, IReleaseEnvironmentGatesData } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentGatesTypes";
import { ApprovalExecutionOrderIndicator, IIssuesCount, IManualInterventionLog } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { IDeploymentGroupPhaseJobItem, IGatesStatusJobItem, IManualInterventionJobItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";
import * as PipelineResources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseDeployPhaseHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseDeployPhaseHelper";
import { ReleaseEnvironmentIssuesHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseEnvironmentIssuesHelper";
import { ReleaseSource } from "PipelineWorkflow/Scripts/Shared/Sources/ReleaseSource";
import { GatesType } from "PipelineWorkflow/Scripts/Common/Types";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import { IStatusProps, Statuses } from "VSSUI/Status";

export class ReleasePhaseHelper {

    public static getAgentPhaseJobItem(releaseDeployPhase: ReleaseContracts.ReleaseDeployPhase,
        deploymentJob: ReleaseContracts.DeploymentJob, environment: ReleaseContracts.ReleaseEnvironment, attempt: number): IAgentPhaseJobItem {
        const jobItem = this._getJobItem(releaseDeployPhase, deploymentJob, environment);
        const runPlanId = releaseDeployPhase.runPlanId;
        const taskListLogs = deploymentJob ? this._getTasksLogFromReleaseTasks(deploymentJob.tasks, releaseDeployPhase.id, environment, attempt, runPlanId) : null;
        const agentPhaseJob: ReleaseContracts.ReleaseTask = deploymentJob ? deploymentJob.job : null;
        const agentPhaseJobItem = {
            id: jobItem.id,
            name: jobItem.name,
            rank: jobItem.rank,
            jobState: jobItem.jobState,
            tasks: taskListLogs,
            planId: runPlanId,
            startTime: agentPhaseJob ? agentPhaseJob.startTime : null,
            finishTime: agentPhaseJob ? agentPhaseJob.finishTime : null,
            logUrl: agentPhaseJob ? agentPhaseJob.logUrl : null,
            queueId: this.getQueueIdForAgentPhase(releaseDeployPhase.rank, environment.deployPhasesSnapshot),
            agentName: agentPhaseJob ? agentPhaseJob.agentName : null,
            jobType: JobType.AgentPhaseJob,
            issues: agentPhaseJob ? this.convertToLogIssues(agentPhaseJob.issues, releaseDeployPhase.errorLog) :
                this._convertToLogIssuesForPhaseItem(releaseDeployPhase.errorLog, releaseDeployPhase.status),
            resultCode: this._getResultCodeForSkippedPhase(releaseDeployPhase),
            jobIssues: ReleasePhaseHelper.getJobLevelIssues(deploymentJob)
        } as IAgentPhaseJobItem;

        return agentPhaseJobItem;
    }

    public static getJobLevelIssues(deploymentJob: ReleaseContracts.DeploymentJob) {
        let issuesCount: IIssuesCount[] = [];
        let jobIssuesCount: IIssuesCount = ReleaseEnvironmentIssuesHelper.getEmptyIssues();

        if (deploymentJob) {

            if (deploymentJob.job) {
                jobIssuesCount = ReleaseEnvironmentIssuesHelper.accumulateIssuesCount(deploymentJob.job.issues);
                issuesCount.push(jobIssuesCount);
            }

            if (deploymentJob.tasks) {
                deploymentJob.tasks.forEach((task: ReleaseContracts.ReleaseTask) => {
                    issuesCount.push(ReleaseEnvironmentIssuesHelper.accumulateIssuesCount(task.issues));
                });
            }
        }

        return ReleaseEnvironmentIssuesHelper.combineIssuesCount(...issuesCount);
    }

    public static getServerPhaseJobItem(
        releaseDeployPhase: ReleaseContracts.ReleaseDeployPhase,
        deploymentJob: ReleaseContracts.DeploymentJob,
        environment: ReleaseContracts.ReleaseEnvironment,
        attempt: number): IServerPhaseJobItem | IManualInterventionJobItem {

        const hasManualInterventions: boolean = releaseDeployPhase && releaseDeployPhase.manualInterventions && (releaseDeployPhase.manualInterventions.length > 0);
        const jobItem = this._getJobItem(releaseDeployPhase, deploymentJob, environment);
        const taskListLogs = deploymentJob ? this._getTasksLogFromReleaseTasks(deploymentJob.tasks, releaseDeployPhase.id, environment, attempt, releaseDeployPhase.runPlanId) : null;
        const serverPhaseJob: ReleaseContracts.ReleaseTask = deploymentJob ? deploymentJob.job : null;

        const serverPhaseJobItem = {
            id: jobItem.id,
            name: jobItem.name,
            rank: jobItem.rank,
            jobState: jobItem.jobState,
            tasks: taskListLogs,
            startTime: deploymentJob ? this._getServerPhaseJobStartTime(deploymentJob.tasks) : null,
            finishTime: serverPhaseJob ? serverPhaseJob.finishTime : null,
            logUrl: serverPhaseJob ? serverPhaseJob.logUrl : null,
            jobType: JobType.ServerPhaseJob,
            jobIssues: ReleasePhaseHelper.getJobLevelIssues(deploymentJob),
            issues: serverPhaseJob ? this.convertToLogIssues(serverPhaseJob.issues, releaseDeployPhase.errorLog) :
                this._convertToLogIssuesForPhaseItem(releaseDeployPhase.errorLog, releaseDeployPhase.status),
            resultCode: this._getResultCodeForSkippedPhase(releaseDeployPhase)
        } as IServerPhaseJobItem;

        if (hasManualInterventions && serverPhaseJobItem.tasks && serverPhaseJobItem.tasks.length > 0) {
            let miMap: IDictionaryStringTo<ReleaseContracts.ManualIntervention> = {};
            releaseDeployPhase.manualInterventions.forEach(mi => { miMap[mi.taskInstanceId.toLowerCase()] = mi; });
            // fill mi data in the tasks
            serverPhaseJobItem.tasks.forEach((taskLog: ITaskLog) => {
                if (taskLog && taskLog.timelineRecordId) {
                    const matchedMi = miMap[taskLog.timelineRecordId.toLowerCase()];
                    if (matchedMi) {
                        let miTaskLog = taskLog as IManualInterventionLog;
                        miTaskLog.manualIntervention = JQueryWrapper.extendDeep({}, matchedMi);
                    }
                }
            });
        }

        return serverPhaseJobItem;
    }

    public static getMachineGroupId(releaseDeployPhase: ReleaseContracts.ReleaseDeployPhase, environment: ReleaseContracts.ReleaseEnvironment) {
        return this._getMachineGroupIdForDgPhase(releaseDeployPhase.rank, environment.deployPhasesSnapshot);
    }

    public static getDeploymentGroupJobs(releaseDeployPhase: ReleaseContracts.ReleaseDeployPhase, deploymentJobs: ReleaseContracts.DeploymentJob[], environment: ReleaseContracts.ReleaseEnvironment, attempt: number, agentNametoIdMap: IDictionaryStringTo<number> = {}): IDeploymentGroupPhaseJobItem {

        let deploymentGroupJobItems: IAgentPhaseJobItem[] = [];

        if (releaseDeployPhase.deploymentJobs) {
            let jobs = releaseDeployPhase.deploymentJobs.forEach((deploymentJob) => {
                const deploymentJobItem = this._getDeploymentJobItemFromReleaseDeploymentJob(releaseDeployPhase, environment, deploymentJob, attempt, agentNametoIdMap);
                if (deploymentJobItem) {
                    deploymentGroupJobItems.push(deploymentJobItem);
                }
            });
        }

        const rank = this._getJobRank(releaseDeployPhase.rank, 0);

        const startAndFinishTimePair: { startTime: Date; finishTime: Date } = this._getStartAndFinishTimeForDeploymentGroupPhase(deploymentJobs);

        return {
            jobs: deploymentGroupJobItems,
            id: releaseDeployPhase.id.toString(),
            name: releaseDeployPhase.name,
            rank: rank,
            jobState: this._getJobStateForReleaseDeployPhaseStatus(releaseDeployPhase.status),
            jobType: JobType.DeploymentGroupPhaseJob,
            startTime: startAndFinishTimePair.startTime ? startAndFinishTimePair.startTime : null,
            finishTime: startAndFinishTimePair.finishTime ? startAndFinishTimePair.finishTime : null,
            logUrl: null,
            tags: this._getTagsForDgPhase(releaseDeployPhase.rank, environment.deployPhasesSnapshot),
            machineGroupId: this._getMachineGroupIdForDgPhase(releaseDeployPhase.rank, environment.deployPhasesSnapshot),
            resultCode: this._getResultCodeForSkippedPhase(releaseDeployPhase)
        } as IDeploymentGroupPhaseJobItem;
    }

    public static getApprovalJobItem(approvalType: ReleaseContracts.ApprovalType, approvalData: IReleaseApprovalsData, approvalExecutionOrder: ApprovalExecutionOrderIndicator): IJobItem {
        let approvalJobItem: IJobItem = null;
        let approvalStatus = ReleaseContracts.ApprovalStatus.Undefined;

        if (approvalData && approvalData.overallApprovalsStatus) {
            approvalStatus = approvalData.overallApprovalsStatus.approvalStatus;
        }

        switch (approvalType) {
            case ReleaseContracts.ApprovalType.PreDeploy:
                approvalJobItem = {
                    id: "PreDeploymentApproval",
                    // If pre-deployment approvals are before gates, approvals will have rank 1, otherwise rank 2
                    rank: (approvalExecutionOrder && approvalExecutionOrder === ApprovalExecutionOrderIndicator.BeforeGates) ? 1 : 2,
                    jobType: JobType.PreDeploymentApprovalJob,
                    name: PipelineResources.EnvironmentPreDeploymentApprovalsHeading,
                    jobState: this._convertApprovalStatusToJobState(approvalStatus)
                } as IJobItem;
                break;
            case ReleaseContracts.ApprovalType.PostDeploy:
                approvalJobItem = {
                    id: "PostDeploymentApproval",
                    // If post-deployment approvals are before gates, approvals will have rank 999998, otherwise 999999
                    rank: (approvalExecutionOrder && approvalExecutionOrder === ApprovalExecutionOrderIndicator.BeforeGates) ? this._postDeployLastItemRank - 1 : this._postDeployLastItemRank,
                    jobType: JobType.PostDeploymentApprovalJob,
                    name: PipelineResources.EnvironmentPostDeploymentApprovalsHeading,
                    jobState: this._convertApprovalStatusToJobState(approvalStatus)
                } as IJobItem;
                break;
        }

        return approvalJobItem;
    }

    public static getReleaseGatesPhaseJobItem(releaseGatesPhase: ReleaseContracts.ReleaseGatesPhase, deploymentAttemptHelper: ReleaseDeploymentAttemptHelper): IGatesStatusJobItem {
        const conditionsData = deploymentAttemptHelper.getReleaseGatesPhaseConditionsRuntimeData(releaseGatesPhase);
        return ReleasePhaseHelper.getReleaseGatesJobItem(GatesType.Deploy, conditionsData.gatesRuntimeData, conditionsData.gatesData, null, releaseGatesPhase.name, this._getJobRank(releaseGatesPhase.rank, 0));
    }

    public static getReleaseGatesJobItem(gatesType: GatesType, gatesRuntimeData: IReleaseEnvironmentGatesRuntimeData, gatesData: IReleaseEnvironmentGatesData, approvalExecutionOrder: ApprovalExecutionOrderIndicator, itemName?: string, itemRank?: number): IGatesStatusJobItem {
        let gateJobItem: IGatesStatusJobItem = null;
        let gateStatus = ReleaseEnvironmentGatesViewType.NotStarted;

        if (gatesRuntimeData && gatesRuntimeData.gatesStatus) {
            gateStatus = gatesRuntimeData.gatesStatus.gatesViewType;
        }

        switch (gatesType) {
            case GatesType.PreDeploy:
                gateJobItem = {
                    id: "PreDeploymentGate",
                    // If pre-deployment approvals are before gates, gates will have rank 2, otherwise rank 1
                    rank: (approvalExecutionOrder && approvalExecutionOrder === ApprovalExecutionOrderIndicator.BeforeGates) ? 2 : 1,
                    jobType: JobType.PreDeploymentGateJob,
                    name: PipelineResources.EnvironmentPreApprovalGatesHeading,
                    jobState: this._convertGateStatusToJobState(gateStatus, approvalExecutionOrder),
                    gatesRuntimeData: gatesRuntimeData,
                    gatesData: gatesData,
                    gatesType: gatesType
                } as IGatesStatusJobItem;
                break;
            case GatesType.PostDeploy:
                gateJobItem = {
                    id: "PostDeploymentGate",
                    // If post-deployment approvals are before gates, gates will have rank 999999, otherwise rank 999998
                    rank: (approvalExecutionOrder && approvalExecutionOrder === ApprovalExecutionOrderIndicator.BeforeGates) ? this._postDeployLastItemRank : this._postDeployLastItemRank - 1,
                    jobType: JobType.PostDeploymentGateJob,
                    name: PipelineResources.EnvironmentPostApprovalGatesHeading,
                    jobState: this._convertGateStatusToJobState(gateStatus, approvalExecutionOrder),
                    gatesRuntimeData: gatesRuntimeData,
                    gatesData: gatesData,
                    gatesType: gatesType
                } as IGatesStatusJobItem;
                break;
            case GatesType.Deploy:
                if (itemName && itemRank) {
                    gateJobItem = {
                        id: `GatesDeployPhase${itemRank}`,
                        rank: itemRank,
                        jobType: JobType.GatesPhaseJob,
                        name: itemName,
                        jobState: this._convertGateStatusToJobState(gateStatus, ApprovalExecutionOrderIndicator.BeforeGates),
                        gatesRuntimeData: gatesRuntimeData,
                        gatesData: gatesData,
                        gatesType: gatesType
                    } as IGatesStatusJobItem;
                }
                break;
        }

        return gateJobItem;
    }

    public static getJobStatus(state: JobStates): IStatus {
        let iconName: string = Utils_String.empty;
        let status: string = Utils_String.empty;
        let className: string = Utils_String.empty;
        let statusProp: IStatusProps;
        switch (state) {
            case JobStates.Succeeded:
                status = Resources.JobSucceededStatus;
                statusProp = Statuses.Success;
                break;
            case JobStates.Failed:
                statusProp = Statuses.Failed;
                status = Resources.JobFailedStatus;
                break;
            case JobStates.InProgress:
                statusProp = Statuses.Running;
                status = Resources.JobInProgressStatus;
                break;
            case JobStates.Undefined:
            case JobStates.Pending:
                statusProp = Statuses.Waiting;
                status = Resources.JobNotStartedStatus;
                break;
            case JobStates.Skipped:
                statusProp = Statuses.Skipped;
                status = Resources.JobSkippedStatus;
                break;
            case JobStates.PartiallySucceeded:
                statusProp = Statuses.Warning;
                status = Resources.JobPartiallySucceededStatus;
                break;
            case JobStates.Cancelled:
                statusProp = Statuses.Canceled;
                status = Resources.JobCancelledStatus;
                break;
            case JobStates.Cancelling:
                statusProp = Statuses.Canceled;
                status = Resources.JobCancellingStatus;
                break;
            case JobStates.Approved:
                statusProp = Statuses.Success;
                status = PipelineResources.JobApprovedStatus;
                break;
            case JobStates.AutomatedApproval:
                statusProp = Statuses.Success;
                status = PipelineResources.JobApprovedAutomaticallyStatus;
                break;
            case JobStates.Reassigned:
                statusProp = Statuses.Waiting;
                status = PipelineResources.JobReassignedStatus;
                break;
            case JobStates.Rejected:
                statusProp = Statuses.Canceled;
                status = PipelineResources.JobRejectedStatus;
                break;
            case JobStates.ApprovalPending:
                statusProp = Statuses.Waiting;
                status = PipelineResources.JobApprovalPendingStatus;
                break;
            case JobStates.EvaluatingGates:
                statusProp = Statuses.Running;
                status = PipelineResources.EnvironmentStatusGates;
                break;
            case JobStates.GatesSucceded:
                statusProp = Statuses.Success;
                status = PipelineResources.SucceededText;
                break;
            case JobStates.GatesFailed:
                statusProp = Statuses.Failed;
                status = PipelineResources.FailedText;
                break;
            case JobStates.GatesPartiallySucceeded:
                statusProp = Statuses.Failed;
                status = PipelineResources.FailedText;
                break;
        }

        return {
            iconName: iconName,
            className: className,
            status: status,
            statusProps: statusProp
        };
    }

    public static getReleaseDeployPhaseFromPhaseId(phaseId: number, deployPhases: ReleaseContracts.ReleaseDeployPhase[]) {
        let deployPhase: ReleaseContracts.ReleaseDeployPhase = null;
        deployPhases.some((phase) => {
            if (phase.id === phaseId) {
                deployPhase = phase;
                return true;
            }
        });
        return deployPhase;
    }

    public static isPhaseCompleted(phase: ReleaseContracts.ReleaseDeployPhase) {
        if (phase.status === ReleaseContracts.DeployPhaseStatus.Succeeded ||
            phase.status === ReleaseContracts.DeployPhaseStatus.Skipped ||
            phase.status === ReleaseContracts.DeployPhaseStatus.Canceled ||
            phase.status === ReleaseContracts.DeployPhaseStatus.Failed ||
            phase.status === ReleaseContracts.DeployPhaseStatus.PartiallySucceeded) {
            return true;
        }

        return false;
    }

    public static convertToLogIssues(issues: ReleaseContracts.Issue[], errorLog: string): Issue[] {
        let logIssues: Issue[] = [];
        let errorCount: number = 0;

        if (issues) {
            for (const issue of issues) {
                const isErrorIssueType: boolean = Utils_String.equals(this._errorIssueType, issue.issueType, true);
                if (isErrorIssueType) {
                    errorCount++;
                }

                const logIssue: Issue = {
                    message: issue.message,
                    data: issue.data,
                    issueType: isErrorIssueType ? IssueType.Error : IssueType.Warning
                };
                logIssues.push(logIssue);
            }

            if (errorCount === 0 && errorLog) {
                logIssues = logIssues.concat(this._convertToLogIssuesForPhaseItem(errorLog));
            }
        }
        return logIssues;
    }

    private static _getStartAndFinishTimeForDeploymentGroupPhase(deploymentJobs: ReleaseContracts.DeploymentJob[]): { startTime: Date; finishTime: Date } {
        let startTime: Date = null;
        if (deploymentJobs && deploymentJobs.length > 0 && deploymentJobs[0].job.startTime) {
            startTime = deploymentJobs[0].job.startTime;
        }

        let finishTime: Date = null;
        if (deploymentJobs && deploymentJobs.length > 0 && startTime) {
            let dgMachineJobs = deploymentJobs.map((job) => {
                return job.job;
            });
            dgMachineJobs = dgMachineJobs.sort((job1: ReleaseContracts.ReleaseTask, job2: ReleaseContracts.ReleaseTask) => {
                if (job1 && job2) {
                    if (job1.finishTime && job2.finishTime) {
                        return job2.finishTime.getTime() - job1.finishTime.getTime();
                    }
                    else if (job1.finishTime) {
                        return new Date().getTime() - job1.finishTime.getTime();
                    }
                    else {
                        return 0;
                    }
                }
                else {
                    return 0;
                }
            });
            finishTime = dgMachineJobs[0].finishTime;
        }

        return {
            startTime: startTime,
            finishTime: finishTime
        };
    }

    private static getQueueIdForAgentPhase(phaseRank: number, deployPhasesSnapshot: ReleaseContracts.DeployPhase[]): number {
        const selectedPhase = this._getPhaseFromSnapshot(phaseRank, deployPhasesSnapshot) as ReleaseContracts.AgentBasedDeployPhase;
        if (selectedPhase) {
            return ReleaseDeploymentAttemptHelper.getAgentPhaseQueueId(selectedPhase);
        }
        return -1;
    }

    private static _getJobStateForReleaseDeployPhaseStatus(status: ReleaseContracts.DeployPhaseStatus): JobStates {
        switch (status) {
            case ReleaseContracts.DeployPhaseStatus.Undefined:
                return JobStates.Undefined;
            case ReleaseContracts.DeployPhaseStatus.NotStarted:
                return JobStates.Pending;
            case ReleaseContracts.DeployPhaseStatus.InProgress:
                return JobStates.InProgress;
            case ReleaseContracts.DeployPhaseStatus.Succeeded:
                return JobStates.Succeeded;
            case ReleaseContracts.DeployPhaseStatus.PartiallySucceeded:
                return JobStates.PartiallySucceeded;
            case ReleaseContracts.DeployPhaseStatus.Failed:
                return JobStates.Failed;
            case ReleaseContracts.DeployPhaseStatus.Canceled:
                return JobStates.Cancelled;
            case ReleaseContracts.DeployPhaseStatus.Cancelling:
                return JobStates.Cancelling;
            case ReleaseContracts.DeployPhaseStatus.Skipped:
                return JobStates.Skipped;
            default:
                return JobStates.Undefined;
        }
    }

    private static _getJobRank(phaseRank: number, jobRank: number): number {
        return phaseRank * this._eachPhaseBaseItemRank + jobRank;
    }

    private static _getJobItem(releaseDeployPhase: ReleaseContracts.ReleaseDeployPhase,
        deploymentJob: ReleaseContracts.DeploymentJob, environment: ReleaseContracts.ReleaseEnvironment): IJobItem {
        let jobItem: IJobItem;
        const agentPhaseJob: ReleaseContracts.ReleaseTask = deploymentJob ? deploymentJob.job : null;
        const jobName = ReleaseDeployPhaseHelper.getFormattedJobName(releaseDeployPhase, deploymentJob);

        // Return JobItem if job got created for the Phase, else create job item with phase level information itself
        if (agentPhaseJob) {
            const rank = this._getJobRank(releaseDeployPhase.rank, agentPhaseJob.rank);

            jobItem = {
                id: agentPhaseJob.timelineRecordId,
                name: jobName,
                rank: rank,
                jobState: this.convertStatusToJobState(agentPhaseJob.status)
            } as IJobItem;
        }
        else {
            const rank = this._getJobRank(releaseDeployPhase.rank, 0);
            jobItem = {
                id: releaseDeployPhase.id.toString(),
                name: jobName,
                rank: rank,
                jobState: this._getJobStateForReleaseDeployPhaseStatus(releaseDeployPhase.status)
            } as IJobItem;
        }

        return jobItem;
    }

    private static _getTasksLogFromReleaseTasks(releaseTasks: ReleaseContracts.ReleaseTask[], deployPhaseId: number, environment: ReleaseContracts.ReleaseEnvironment, attempt: number, phasePlanId: string): ITaskLog[] {
        let taskListLog: ITaskLog[] = [];
        if (releaseTasks) {
            for (const releaseTask of releaseTasks) {
                const taskLog = {
                    taskId: releaseTask.id.toString(),
                    taskDefinition: JQueryWrapper.extendDeep({}, releaseTask.task),
                    timelineRecordId: releaseTask.timelineRecordId,
                    name: releaseTask.name,
                    state: this.convertTaskStatusToTaskState(releaseTask.status),
                    rank: releaseTask.rank,
                    startTime: releaseTask.startTime,
                    finishTime: releaseTask.finishTime,
                    issues: this.convertToLogIssues(releaseTask.issues, ""),
                    percentComplete: releaseTask.percentComplete,
                    logUrl: releaseTask.logUrl,
                    resultCode: releaseTask.resultCode,
                    fetchLogDelegate: () => { return this._fetchLog(environment.releaseId, environment.id, deployPhaseId, releaseTask.id); }
                } as ITaskLog;

                taskListLog.push(taskLog);
            }
        }

        // Fix the task rank
        LogsViewUtility.fixTasksRank(taskListLog);

        return taskListLog;
    }

    private static _getDeploymentJobItemFromReleaseDeploymentJob(releaseDeployPhase: ReleaseContracts.ReleaseDeployPhase, environment: ReleaseContracts.ReleaseEnvironment, deploymentJob: ReleaseContracts.DeploymentJob, attempt: number, agentNametoIdMap: IDictionaryStringTo<number> = {}): IAgentPhaseJobItem {

        const job = deploymentJob && deploymentJob.job;
        const agentName = job && job.agentName;

        if (agentName) { //Avoid adding the job to the list if the agentName is not present
            let tasks = this._getTasksLogFromReleaseTasks(deploymentJob.tasks, releaseDeployPhase.id, environment, attempt, releaseDeployPhase.runPlanId);

            return {
                id: job.timelineRecordId,
                name: agentName,
                rank: job.rank,
                jobState: this.convertStatusToJobState(job.status),
                jobType: JobType.DeploymentGroupAgentJob,
                agentName: agentName,
                agentId: agentNametoIdMap[agentName.toLowerCase()],
                startTime: job.startTime,
                finishTime: job.finishTime,
                tasks: tasks,
                logUrl: job.logUrl,
                jobIssues: ReleasePhaseHelper.getJobLevelIssues(deploymentJob),
                issues: this.convertToLogIssues(job.issues, releaseDeployPhase.errorLog),
                resultCode: this._getResultCodeForSkippedPhase(releaseDeployPhase)
            };
        }
        else {
            return null;
        }
    }

    private static _fetchLog(releaseId: number, environmentId: number, releaseDeployPhaseId: number, taskId: number): IPromise<string> {

        return this._isLogBig(releaseId, environmentId, releaseDeployPhaseId, taskId).then((isLogBig: boolean) => {
            if (isLogBig) {
                return Q.resolve(Resources.TaskLogViewLimitExceededMessage);
            } else {
                return LogsSource.instance().getLogs(releaseId, environmentId, releaseDeployPhaseId, taskId);
            }
        },
            (error) => {
                let errorMessage = VSS.getErrorMessage(error);
                return Q.reject(errorMessage);
            });
    }

    private static _convertToLogIssuesForPhaseItem(errorLog: string, status?: ReleaseContracts.DeployPhaseStatus): Issue[] {
        if (errorLog && status !== ReleaseContracts.DeployPhaseStatus.Skipped) {
            return [{ message: errorLog, issueType: IssueType.Error }] as Issue[];
        } else {
            return [];
        }
    }

    private static _isLogBig(releaseId: number, environmentId: number, releaseDeployPhaseId: number, taskId: number): IPromise<boolean> {
        return ReleaseSource.instance().getReleaseTasks(releaseId, environmentId, releaseDeployPhaseId).then(
            (releaseTasks: ReleaseContracts.ReleaseTask[]) => {
                let filteredTask: ReleaseContracts.ReleaseTask = Utils_Array.first(releaseTasks, (task: ReleaseContracts.ReleaseTask) => { return task.id === taskId; });
                return Q.resolve(!!filteredTask && filteredTask.lineCount > this._maxLogLineCount);
            },
            (error) => {
                return Q.reject(error);
            });
    }

    public static convertTaskStatusToTaskState(status: ReleaseContracts.TaskStatus): TaskState {
        switch (status) {
            case ReleaseContracts.TaskStatus.Canceled:
                return TaskState.Cancelled;
            case ReleaseContracts.TaskStatus.Skipped:
                return TaskState.Skipped;
            case ReleaseContracts.TaskStatus.Failure:
            case ReleaseContracts.TaskStatus.Failed:
                return TaskState.Failed;
            case ReleaseContracts.TaskStatus.InProgress:
                return TaskState.InProgress;
            case ReleaseContracts.TaskStatus.Pending:
                return TaskState.Pending;
            case ReleaseContracts.TaskStatus.Success:
            case ReleaseContracts.TaskStatus.Succeeded:
                return TaskState.Succeeded;
            case ReleaseContracts.TaskStatus.PartiallySucceeded:
                return TaskState.PartiallySucceeded;
            default:
                return TaskState.Unknown;
        }
    }

    public static convertStatusToJobState(status: ReleaseContracts.TaskStatus): JobStates {
        switch (status) {
            case ReleaseContracts.TaskStatus.Canceled:
                return JobStates.Cancelled;
            case ReleaseContracts.TaskStatus.Skipped:
                return JobStates.Skipped;
            case ReleaseContracts.TaskStatus.Failure:
            case ReleaseContracts.TaskStatus.Failed:
                return JobStates.Failed;
            case ReleaseContracts.TaskStatus.InProgress:
                return JobStates.InProgress;
            case ReleaseContracts.TaskStatus.Pending:
                return JobStates.Pending;
            case ReleaseContracts.TaskStatus.Success:
            case ReleaseContracts.TaskStatus.Succeeded:
                return JobStates.Succeeded;
            case ReleaseContracts.TaskStatus.PartiallySucceeded:
                return JobStates.PartiallySucceeded;
            default:
                return JobStates.Undefined;
        }
    }

    private static _convertApprovalStatusToJobState(status: ReleaseContracts.ApprovalStatus): JobStates {
        switch (status) {
            case ReleaseContracts.ApprovalStatus.Canceled:
                return JobStates.Cancelled;
            case ReleaseContracts.ApprovalStatus.Skipped:
                return JobStates.Skipped;
            case ReleaseContracts.ApprovalStatus.Approved:
                return JobStates.Approved;
            case ReleaseContracts.ApprovalStatus.Reassigned:
                return JobStates.Reassigned;
            case ReleaseContracts.ApprovalStatus.Pending:
                return JobStates.ApprovalPending;
            case ReleaseContracts.ApprovalStatus.Rejected:
                return JobStates.Rejected;
            case ReleaseContracts.ApprovalStatus.Undefined:
                return JobStates.ApprovalPending;
            default:
                return JobStates.Undefined;
        }
    }

    static _convertGateStatusToJobState(status: ReleaseEnvironmentGatesViewType, approvalExecutionOrder: ApprovalExecutionOrderIndicator): JobStates {
        switch (status) {
            case ReleaseEnvironmentGatesViewType.Canceled:
                return JobStates.Cancelled;
            case ReleaseEnvironmentGatesViewType.Stabilizing:
            case ReleaseEnvironmentGatesViewType.Evaluating:
            case ReleaseEnvironmentGatesViewType.WaitingOnExitConditions:
                return JobStates.EvaluatingGates;
            case ReleaseEnvironmentGatesViewType.Failed: {
                if (approvalExecutionOrder === ApprovalExecutionOrderIndicator.AfterGatesAlways) {
                    return JobStates.GatesPartiallySucceeded ? JobStates.GatesPartiallySucceeded : JobStates.GatesFailed;
                }
                else {
                    return JobStates.GatesFailed;
                }
            }
            case ReleaseEnvironmentGatesViewType.Succeeded:
                return JobStates.GatesSucceded;
        }
    }

    private static _getServerPhaseJobStartTime(tasks: ReleaseContracts.ReleaseTask[]): Date {
        if (tasks && tasks.length > 0) {
            return tasks[0].startTime;
        }
        return null;
    }

    private static _getTagsForDgPhase(phaseRank: number, deployPhasesSnapshot: ReleaseContracts.DeployPhase[]): string[] {
        let tags: string[] = [];
        const selectedPhase = this._getPhaseFromSnapshot(phaseRank, deployPhasesSnapshot) as ReleaseContracts.MachineGroupBasedDeployPhase;
        if (selectedPhase && selectedPhase.deploymentInput) {
            tags = selectedPhase.deploymentInput.tags;
        }
        return tags;
    }

    private static _getMachineGroupIdForDgPhase(phaseRank: number, deployPhasesSnapshot: ReleaseContracts.DeployPhase[]): number {
        let id: number = -1;
        const selectedPhase = this._getPhaseFromSnapshot(phaseRank, deployPhasesSnapshot) as ReleaseContracts.MachineGroupBasedDeployPhase;
        if (selectedPhase && selectedPhase.deploymentInput) {
            id = selectedPhase.deploymentInput.queueId;
        }
        return id;
    }

    private static _getPhaseFromSnapshot(phaseRank: number, deployPhasesSnapshot: ReleaseContracts.DeployPhase[]): ReleaseContracts.DeployPhase {
        if (deployPhasesSnapshot && deployPhasesSnapshot.length > 0) {
            const selectedPhase = Utils_Array.first(deployPhasesSnapshot, (deployPhase) => {
                return deployPhase.rank === phaseRank;
            });
            return selectedPhase;
        }
        return null;
    }

    private static _getResultCodeForSkippedPhase(releaseDeployPhase: ReleaseContracts.ReleaseDeployPhase): string {
        let resultCode: string = "";
        if (releaseDeployPhase && releaseDeployPhase.status === ReleaseContracts.DeployPhaseStatus.Skipped && releaseDeployPhase.errorLog) {
            resultCode = releaseDeployPhase.errorLog;
        }

        return resultCode;
    }

    private static _maxLogLineCount = 1000000; // One Million
    private static readonly _eachPhaseBaseItemRank = 10000; // with this we can have 100 phases + 9999 multi config for each phase
    private static readonly _postDeployLastItemRank = 999999; // item rank that is shown in logs
    private static readonly _downloadLinkFormat: string = "{0}/releases/{1}/environments/{2}/deployPhases/{3}/tasks/{4}/logs";
    private static readonly _errorIssueType: string = "Error";
    private static readonly _newDownloadLinkFormat: string = "{0}/releases/{1}/environments/{2}/attempts/{3}/timelines/{4}/tasks/{5}/logs";
}
import { LiveLogsParser } from "DistributedTaskUI/Logs/LiveLogsParser";
import { IAgentPhaseJobItem, IServerPhaseJobItem, ILogLine, ITaskLog, LogType, TaskState, JobType, IJobItem, JobStates, IPhaseJobItem } from "DistributedTaskUI/Logs/Logs.Types";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseUrlUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseUrlUtils";

import { DeploymentMachine } from "TFS/DistributedTask/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class LogsHelper {

    public static getEffectiveLatestTaskLogs(formattedLogLines: ILogLine[], jobLogs: ILogLine[], phaseJobItem: IJobItem): ILogLine[] {
        const waitingForLogsText: string = this.getWaitingForLogsText(phaseJobItem);
        if (!jobLogs || (jobLogs.length === 1 && (Utils_String.localeIgnoreCaseComparer(jobLogs[0].content, waitingForLogsText) === 0))) {
            // clear the logs if waiting is the only current log
            jobLogs = [];
        }

        // find the index of "Starting" and "Finishing" task log sections
        let finishingTaskLogIndex = -1;
        let startingTaskLogIndex = -1;
        const startingFinishingTaskLogs = formattedLogLines.filter((logLine: ILogLine, index: number) => {
            if (logLine.logType === LogType.Section) {
                if (logLine.content.indexOf(Resources.AgentLogStepFinishingMarker) >= 0) {
                    finishingTaskLogIndex = index;
                    return true;
                }
                if (logLine.content.indexOf(Resources.AgentLogStepStartingMarker) >= 0) {
                    startingTaskLogIndex = index;
                    return true;
                }
            }
            return false;
        });

        if (startingFinishingTaskLogs && startingFinishingTaskLogs.length > 0) {
            // if the logs notify ending of a task or starting of a new task, clear logs of previous task
            if (finishingTaskLogIndex >= startingTaskLogIndex) {
                jobLogs = formattedLogLines.slice(finishingTaskLogIndex + 2, formattedLogLines.length);
            }
            else if (finishingTaskLogIndex < startingTaskLogIndex) {
                // take from one line before "Starting" since it has the section marker "*****"
                jobLogs = formattedLogLines.slice(startingTaskLogIndex - 1, formattedLogLines.length);
            }
        }
        else {
            // if the logs don't have any task state notification, append incoming logs to the existing ones
            jobLogs = jobLogs.concat(formattedLogLines);
        }

        if (!jobLogs || jobLogs.length <= 0) {
            // if the effective logs are empty, set the default log
            jobLogs = [{ content: waitingForLogsText, logType: LogType.Default }];
        }

        return jobLogs;
    }

    public static hasInProgressTaskChanged(phaseJobItem: IAgentPhaseJobItem | IServerPhaseJobItem, originalPhaseLogItem: IAgentPhaseJobItem | IServerPhaseJobItem): boolean {
        const phaseInProgressTaskRank = LogsHelper._getLastInProgressTaskRank(phaseJobItem);
        const originalPhaseInProgressTaskRank = LogsHelper._getLastInProgressTaskRank(originalPhaseLogItem);

        return phaseInProgressTaskRank !== originalPhaseInProgressTaskRank;
    }

    public static assignJobLogsToTask(jobItem: IAgentPhaseJobItem | IServerPhaseJobItem, jobLogs: ILogLine[], taskIdToTaskMap: IDictionaryStringTo<ITaskLog>, taskToLogsMap: IDictionaryStringTo<ILogLine[]>) {
        if (jobItem && jobItem.tasks) {
            if (!taskToLogsMap) { //If task logs are not available for a particular job, default to the compat implementation
                for (let i = jobItem.tasks.length - 1; i >= 0; i--) {
                    const task = jobItem.tasks[i];
                    task.liveLogsData = null;
                    if (task.state === TaskState.InProgress) {
                        task.liveLogsData = {
                            logLines: jobLogs,
                            maxLogs: this.c_maxLogsToShow
                        };
                        break;
                    }
                }
            }
            else {
                const taskIds = Object.keys(taskToLogsMap);
                if (taskIds && taskIds.length > 0) {
                    for (let i = 0, taskCount = taskIds.length; i < taskCount; i++) {
                        const task = taskIdToTaskMap[taskIds[i]];
                        //We only assign live logs to in-progress tasks, currently there is no reconciliation logic.
                        //In case the server call to update tasks fails, receiving a signalR event for live logs for the same task will not override it. We will rely on the next server call to fix it
                        if (task && task.state === TaskState.InProgress) {
                            task.liveLogsData = {
                                logLines: taskToLogsMap[task.timelineRecordId],
                                maxLogs: this.c_maxLogsToShow
                            };
                        }
                    }
                }
            }
        }
    }

    public static formatLogs(logs: string[]): ILogLine[] {
        if (!logs || logs.length <= 0) {
            return;
        }

        let formattedLogs: ILogLine[] = [];
        logs.forEach((logLine: string) => {
            formattedLogs = formattedLogs.concat(LiveLogsParser.formatLogLine(logLine));
        });

        return formattedLogs;
    }

    public static initializeJobToLogsMap(agentPhaseJobItem: IAgentPhaseJobItem, jobToLogsMap: IDictionaryStringTo<ILogLine[]>, logItems: IJobItem[]) {
        if (!agentPhaseJobItem) {
            return;
        }
        if (!jobToLogsMap.hasOwnProperty(agentPhaseJobItem.id)) {
            jobToLogsMap[agentPhaseJobItem.id] = [];
        }
        if (!(agentPhaseJobItem.jobState === JobStates.InProgress || agentPhaseJobItem.jobState === JobStates.Cancelling)) {
            jobToLogsMap[agentPhaseJobItem.id] = [];
        }
        else if (jobToLogsMap[agentPhaseJobItem.id].length <= 0
            || LogsHelper.hasInProgressTaskChanged(agentPhaseJobItem, this.findAgentPhaseJobItem(agentPhaseJobItem, logItems))) {
            const waitingForLogsText: string = LogsHelper.getWaitingForLogsText(agentPhaseJobItem);
            jobToLogsMap[agentPhaseJobItem.id] = [{ content: waitingForLogsText, logType: LogType.Default }];
        }
    }

    public static initializeJobToTasksMap(phaseJobItem: IPhaseJobItem, jobToTaskIdTaskMap: IDictionaryStringTo<IDictionaryStringTo<ITaskLog>>, jobToTasksLogLineMap: IDictionaryStringTo<IDictionaryStringTo<ILogLine[]>>) {
        //This method initializes two maps
        // jobToTaskIdTaskMap  : This map is used when updating the liveLogsData for the in progress tasks, to avoid iterating over the list of tasks for the jobs again
        // jobToTasksLogLineMap : This map is used to store the in memory live logs for all tasks of a job
        if (!phaseJobItem) {
            return;
        }
        if (!jobToTasksLogLineMap.hasOwnProperty(phaseJobItem.id)) {
            jobToTasksLogLineMap[phaseJobItem.id] = {};
        }
        if (!jobToTaskIdTaskMap[phaseJobItem.id]) {
            jobToTaskIdTaskMap[phaseJobItem.id] = {};
        }

        const tasks = phaseJobItem.tasks;
        if (tasks) {
            tasks.forEach((task) => {
                if (task && task.timelineRecordId) {
                    jobToTaskIdTaskMap[phaseJobItem.id][task.timelineRecordId] = task;
                    if (!jobToTasksLogLineMap[phaseJobItem.id][task.timelineRecordId]) {
                        jobToTasksLogLineMap[phaseJobItem.id][task.timelineRecordId] = [];
                    }
                    if (task.state !== TaskState.InProgress) {
                        jobToTasksLogLineMap[phaseJobItem.id][task.timelineRecordId] = [];
                    }
                    else if (jobToTasksLogLineMap[phaseJobItem.id][task.timelineRecordId].length <= 0) {
                        const waitingForLogsText: string = LogsHelper.getWaitingForLogsText(phaseJobItem);
                        jobToTasksLogLineMap[phaseJobItem.id][task.timelineRecordId] = [{ content: waitingForLogsText, logType: LogType.Default }];
                    }
                }
            });
        }
    }

    public static updateJobToLogsMapFromPayload(payloadId: string, newLogs: string[], jobToLogsMap: IDictionaryStringTo<ILogLine[]>, logItems: IJobItem[]) {
        const jobLogs = LogsHelper._getJobLogsContent(newLogs, jobToLogsMap[payloadId], payloadId, logItems);
        jobToLogsMap[payloadId] = jobLogs;
    }

    public static updateJobToTasksLogLineMapFromPayload(jobId: string, payloadId: string, newLogs: string[], jobToTasksLogLineMap: IDictionaryStringTo<IDictionaryStringTo<ILogLine[]>>, logItems: IJobItem[]) {
        const currentLogs: ILogLine[] = jobToTasksLogLineMap[jobId] ? jobToTasksLogLineMap[jobId][payloadId] : null;
        if (!jobToTasksLogLineMap[jobId]) {
            jobToTasksLogLineMap[jobId] = {};
        }
        const jobLogs = LogsHelper._getJobLogsContent(newLogs, currentLogs, jobId, logItems);
        jobToTasksLogLineMap[jobId][payloadId] = jobLogs;
    }

    public static findAgentPhaseJobItem(agentPhaseJobItem: IAgentPhaseJobItem, logItems: IJobItem[]) {
        const matchingOriginalAgentPhaseJobItems: IAgentPhaseJobItem[] = (logItems && logItems.length > 0)
            ? logItems.filter((item: IJobItem) => {
                return (item.jobType === JobType.AgentPhaseJob || item.jobType === JobType.ServerPhaseJob || item.jobType === JobType.DeploymentGroupAgentJob)
                    && item.id === agentPhaseJobItem.id;
            }) as IAgentPhaseJobItem[]
            : null;
        return (matchingOriginalAgentPhaseJobItems && matchingOriginalAgentPhaseJobItems.length === 1) ? matchingOriginalAgentPhaseJobItems[0] : null;
    }

    public static getWaitingForLogsText(phaseJobItem: IJobItem): string {
        let waitingForLogsText: string = Utils_String.empty;
        if (phaseJobItem && phaseJobItem.jobType === JobType.AgentPhaseJob) {
            waitingForLogsText = Resources.WaitingForAgentLogsText;
        } else if (phaseJobItem && phaseJobItem.jobType === JobType.ServerPhaseJob) {
            waitingForLogsText = Resources.WaitingForServerLogsText;
        }
        return waitingForLogsText;
    }

    public static getJobItem(timelineRecordId: string, logItems: IJobItem[]) {
        let phaseJobItem: IJobItem;
        if (logItems) {
            let filteredJobs = logItems.filter((logItem: IJobItem) => {
                return (logItem.id === timelineRecordId);
            });

            if (filteredJobs && filteredJobs.length > 0) {
                phaseJobItem = filteredJobs[0];
            }
        }
        return phaseJobItem;
    }

    public static getAgentPhaseJobItemForNonStartedDeploymentMachine(deploymentMachine: DeploymentMachine): IAgentPhaseJobItem {
        return {
            name: deploymentMachine.agent.name,
            agentName: deploymentMachine.agent.name,
            agentId: deploymentMachine.id,
            tasks: [],
            startTime: null,
            finishTime: null,
            id: deploymentMachine.agent.name,
            rank: -1,
            jobType: JobType.DeploymentGroupAgentJob,
            jobState: JobStates.Pending
        };
    }

    public static updateAgentToLogsMap(jobItems: IAgentPhaseJobItem[], agentNameToLogsMap: IDictionaryStringTo<IJobItem>) {
        for (let i = 0, jobCount = jobItems.length; i < jobCount; i++) {
            agentNameToLogsMap[jobItems[i].agentName.toLowerCase()] = jobItems[i];
        }
    }

    public static getJobItemsFromAgentNameToLogsMap(agentNameToLogsMap: IDictionaryStringTo<IJobItem>): IJobItem[] {
        return Object.keys(agentNameToLogsMap).map((keyName: string) => {
            return agentNameToLogsMap[keyName];
        });
    }

    public static getCurrentSelectedJobItem(selectedItemKey: string, items: IJobItem[]): IJobItem {
        const selectedJobItem: IJobItem = Utils_Array.first(items, (item) => {
            return (item.id === selectedItemKey);
        });

        return selectedJobItem;
    }



    private static _getLastInProgressTaskRank(phaseJobItem: IAgentPhaseJobItem | IServerPhaseJobItem): number {
        const phaseInProgressTaskRanks = (phaseJobItem && phaseJobItem.tasks)
            ? phaseJobItem.tasks.filter((task: ITaskLog) => { return task.state === TaskState.InProgress; })
            : null;
        const phaseInProgressTaskCount = phaseInProgressTaskRanks ? phaseInProgressTaskRanks.length : 0;
        const phaseInProgressTaskRank = (phaseInProgressTaskCount > 0 && phaseInProgressTaskRanks[phaseInProgressTaskCount - 1])
            ? phaseInProgressTaskRanks[phaseInProgressTaskCount - 1].rank
            : null;
        return phaseInProgressTaskRank;
    }

    private static _getJobLogsContent(newLogs: string[], currentLogs: ILogLine[], jobId: string, logItems: IJobItem[]): ILogLine[] {
        const formattedLogs = LogsHelper.formatLogs(newLogs);
        const phaseJobItem: IJobItem = LogsHelper.getJobItem(jobId, logItems);
        let jobLogs = LogsHelper.getEffectiveLatestTaskLogs(formattedLogs, currentLogs, phaseJobItem);
        if (jobLogs.length > LogsHelper.c_maxLogsToStore) {
            jobLogs = jobLogs.slice(jobLogs.length - LogsHelper.c_maxLogsToStore, jobLogs.length);
        }
        return jobLogs;
    }

    private static readonly c_maxLogsToShow = 25;
    private static readonly c_maxLogsToStore = 200;
    private static readonly _downloadAllLinkFormat: string = "{0}releases/{1}/logs";
}
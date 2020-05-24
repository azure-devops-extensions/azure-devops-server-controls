import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import {
    IAgentPhaseJobItem,
    IJobItem,
    ILogLine,
    IPhaseJobItem,
    JobSortType,
    JobStates,
    ITaskLog,
} from "DistributedTaskUI/Logs/Logs.Types";

import { LogsTabKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import {
    DeploymentGroupLogsTabActions,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentGroupLogsTabActions";
import { ILogsState, ILogsStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/ILogsStore";
import { DeploymentAttemptsHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentAttemptsHelper";
import { JobItemsSortHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/JobItemsSortHelper";
import { LogsHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsHelper";
import {
    IAddLogsPayload,
    LogsTabActions,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabActions";
import { LogsTabTelemetryHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabTelemetryHelper";
import { ReleasePhaseHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/ReleasePhaseHelper";
import { DeploymentAttemptStore } from "PipelineWorkflow/Scripts/ReleaseProgress/DeploymentAttempt/DeploymentAttemptStore";
import {
    ReleaseDeploymentAttemptHelper,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import {
    ReleaseEnvironmentStore,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import { ILogsFilterState } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";

import { DeployPhaseTypes, DeploymentReason, ReleaseDeployPhase, ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

import { DeploymentMachine } from "TFS/DistributedTask/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface IDeploymentGroupLogsArgs {
    deploymentGroupPhaseId: number;
    environmentInstanceId: string;
}

export class DeploymentGroupLogsStore extends StoreBase implements ILogsStore {

    constructor(args: IDeploymentGroupLogsArgs) {
        super();
        this._deploymentGroupPhaseId = args.deploymentGroupPhaseId;
        this._environmentInstanceId = args.environmentInstanceId;
    }

    public initialize(instanceId: string) {

        this._releaseEnvironmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, this._environmentInstanceId);
        this._releaseEnvironmentStore.addChangedListener(this._onReleaseEnvironmentChanged);

        this._logsTabActions = ActionsHubManager.GetActionsHub<LogsTabActions>(LogsTabActions, this._environmentInstanceId);
        // TODO: Cleanup all duplicate code, Task#1253196
        this._logsTabActions.addLogs.addListener(this._handleAddLogs);
        this._logsTabActions.selectLogItem.addListener(this._handleSelectLogItem);
        this._logsTabActions.resetLogItemSelection.addListener(this._handleResetLogItemSelection);
        this._logsTabActions.onSortOrderSelected.addListener(this._onSortOrderSelected);

        this._deploymentGroupLogsTabActions = ActionsHubManager.GetActionsHub<DeploymentGroupLogsTabActions>(DeploymentGroupLogsTabActions, instanceId);
        this._deploymentGroupLogsTabActions.getDeploymentMachines.addListener(this._initializeAgentNameToLogsMap);
        this._deploymentGroupLogsTabActions.filtersChanged.addListener(this._onFiltersChanged);

        this._deploymentAttemptStore = StoreManager.GetStore<DeploymentAttemptStore>(DeploymentAttemptStore, instanceId);
        this._deploymentAttemptStore.addChangedListener(this._onChange);

        this._agentNameToLogsMap = {};

        this._logItems = this._getDeploymentGroupLogItems();
        this._machineGroupId = this._getMachineGroupId();

        this._initializeJobToLogsMap();
    }

    public static getKey(): string {
        return LogsTabKeys.DeploymentGroupLogsStore;
    }

    public disposeInternal(): void {
        this._releaseEnvironmentStore.removeChangedListener(this._onReleaseEnvironmentChanged);
        this._logsTabActions.addLogs.removeListener(this._handleAddLogs);
        this._logsTabActions.selectLogItem.removeListener(this._handleSelectLogItem);
        this._logsTabActions.resetLogItemSelection.removeListener(this._handleResetLogItemSelection);
        this._deploymentGroupLogsTabActions.getDeploymentMachines.removeListener(this._initializeAgentNameToLogsMap);
        this._deploymentGroupLogsTabActions.filtersChanged.removeListener(this._onFiltersChanged);
        this._deploymentAttemptStore.removeChangedListener(this._onChange);
    }

    public getLogItems(): IJobItem[] {
        return this._logItems;
    }

    public getMachineGroupId(): number {
        return this._machineGroupId;
    }

    public getJobToLogsMap(): IDictionaryStringTo<ILogLine[]> {
        return JQueryWrapper.extendDeep({}, this._jobToLogsMap);
    }

    public getState(): ILogsState {
        const environment: ReleaseEnvironment = this._releaseEnvironmentStore.getEnvironment();

        return {
            logItems: this._logItems,
            jobToLogsMap: this.getJobToLogsMap(),
            environment: environment,
            selectedSortOrder: this._sortOrder,
            currentFilterState: this._filtersState,
            currentSelectedItemKey: this._getCurrentSelectedItemKey(environment)
        };
    }

    private _getSelectedAttempt(): number {
        let selectedAttempt: number = this._deploymentAttemptStore.getState().selectedAttempt;
        if (selectedAttempt < 0) {
            const environment = this._releaseEnvironmentStore.getEnvironment();
            if (environment) {
                selectedAttempt = ReleaseDeploymentAttemptHelper.getAttemptNumberForPhase(this._deploymentGroupPhaseId, environment.deploySteps);
            }
        }

        return selectedAttempt;
    }

    private _handleSelectLogItem = (selectedItemKey: string): void => {
        this._userSelectedItemKey = selectedItemKey;
        this._onChange();
    }

    private _handleResetLogItemSelection = (): void => {
        this._userSelectedItemKey = null;
    }

    private _getCurrentSelectedItemKey(environment: ReleaseEnvironment): string {
        // If user selected any job item in the left pane, then use that as selected key
        // else get the default selected key 
        let currentSelectedItemKey = this._userSelectedItemKey;
        if (!currentSelectedItemKey) {
            const items = this.getLogItems();
            currentSelectedItemKey = DeploymentAttemptsHelper.getDefaultSelectedJobItemInAttempt(environment, items, this._getSelectedAttempt());
        }

        return currentSelectedItemKey;
    }

    private _onSortOrderSelected = (sortOrder: JobSortType) => {
        this._sortOrder = sortOrder;
        LogsTabTelemetryHelper.publishDeploymentGroupLogsSortOrderSelected(sortOrder);
        this._onChange();
    }

    private _handleAddLogs = (payload: IAddLogsPayload): void => {
        if (this._jobToLogsMap.hasOwnProperty(payload.timelineRecordId)) {
            LogsHelper.updateJobToLogsMapFromPayload(payload.timelineRecordId, payload.logLines, this._jobToLogsMap, this._logItems);
            if (payload.stepRecordId && !Utils_String.equals(payload.stepRecordId, Utils_String.EmptyGuidString, true)) {
                //If the payload has the field for the task's timelineRecordId, mark an entry in the dictionary that task logs are available for the respective job id
                this._areTaskLogsAvailable[payload.timelineRecordId] = true;
                LogsHelper.updateJobToTasksLogLineMapFromPayload(payload.timelineRecordId, payload.stepRecordId, payload.logLines, this._jobToTasksLogLineMap, this._logItems);
            }
            this._onChange();
        }
    }

    private _onFiltersChanged = (filtersState: ILogsFilterState) => {
        this._onChange(filtersState);
        LogsTabTelemetryHelper.publishDeploymentGroupLogsFilterTelemetry(filtersState);
        this._filtersState = filtersState;
    }

    private _onReleaseEnvironmentChanged = () => {
        this._onChange();
    }

    private _initializeJobToLogsMap() {
        this._jobToLogsMap = {};

        if (this._logItems) {
            this._logItems.forEach((jobItem: IJobItem) => {
                const agentPhaseJobItem = jobItem as IAgentPhaseJobItem;
                LogsHelper.initializeJobToLogsMap(agentPhaseJobItem, this._jobToLogsMap, this._logItems);
            });
        }
    }

    private _onChange = (newFilterState: ILogsFilterState = null) => {
        const logItems = this._getDeploymentGroupLogItems(newFilterState);

        logItems.forEach((jobItem: IJobItem) => {
            const agentPhaseJobItem = jobItem as IAgentPhaseJobItem;
            LogsHelper.initializeJobToLogsMap(agentPhaseJobItem, this._jobToLogsMap, this._logItems);
            LogsHelper.initializeJobToTasksMap(agentPhaseJobItem, this._jobToTaskIdTaskMap, this._jobToTasksLogLineMap);
            //Check if task logs are available for the respective job id, if they are not available pass on null
            LogsHelper.assignJobLogsToTask(agentPhaseJobItem, this._jobToLogsMap[agentPhaseJobItem.id], this._jobToTaskIdTaskMap[agentPhaseJobItem.id],
                this._areTaskLogsAvailable[agentPhaseJobItem.id] ? this._jobToTasksLogLineMap[agentPhaseJobItem.id] : null);
        });

        this._logItems = logItems;
        this.emitChanged();
    }

    private _getMachineGroupId() {
        let machineGroupId = null;
        const environment = this._releaseEnvironmentStore.getEnvironment();
        const deploymentGroupPhase = this._getDeploymentGroupPhase();

        if (deploymentGroupPhase && deploymentGroupPhase.deploymentJobs) {
            machineGroupId = ReleasePhaseHelper.getMachineGroupId(deploymentGroupPhase, environment);
        }

        return machineGroupId;
    }

    private _getDeploymentGroupLogItems(newFilterState: ILogsFilterState = null): IJobItem[] {

        let jobItems: IJobItem[] = [];
        const environment = this._releaseEnvironmentStore.getEnvironment();
        const deploymentGroupPhase = this._getDeploymentGroupPhase();

        if (deploymentGroupPhase && deploymentGroupPhase.deploymentJobs) {
            const dgJobItem = ReleasePhaseHelper.getDeploymentGroupJobs(deploymentGroupPhase, deploymentGroupPhase.deploymentJobs, environment, this._getSelectedAttempt(), this._agentNameToIdMap);

            if (dgJobItem) {
                jobItems = dgJobItem.jobs as IAgentPhaseJobItem[];
                LogsHelper.updateAgentToLogsMap(jobItems as IAgentPhaseJobItem[], this._agentNameToLogsMap);
                jobItems = this._getSortedFilteredJobItems(newFilterState);
            }
        }

        return jobItems;
    }

    private _getSortedFilteredJobItems(newFilterState: ILogsFilterState): IJobItem[] {
        let jobItems: IJobItem[] = [];

        jobItems = this._getJobItemsFromAgentNameToLogsMap();
        jobItems = this._getMatchingMachines(jobItems as IPhaseJobItem[], newFilterState);
        jobItems = this._sortJobItems(jobItems);

        return jobItems;
    }

    private _getDeploymentGroupPhase(): ReleaseDeployPhase {
        let deploymentGroupPhase: ReleaseDeployPhase = null;
        const environment = this._releaseEnvironmentStore.getEnvironment();

        let selectedDeploymentAttempt = ReleaseDeploymentAttemptHelper.getDeploymentAttemptForAttemptNumber(environment.deploySteps, this._getSelectedAttempt());

        if (selectedDeploymentAttempt) {
            let deploymentGroupPhases: ReleaseDeployPhase[] = selectedDeploymentAttempt.releaseDeployPhases.filter((phase) => {
                return phase.phaseType === DeployPhaseTypes.MachineGroupBasedDeployment;
            });

            if (deploymentGroupPhases) {

                deploymentGroupPhases.some((phase) => {
                    if (phase.id === this._deploymentGroupPhaseId) {
                        deploymentGroupPhase = phase;
                        return true;
                    }
                });
            }
        }
        return deploymentGroupPhase;
    }

    private _getMatchingMachines(jobItems: IPhaseJobItem[], newFilterState: ILogsFilterState): IPhaseJobItem[] {
        let matchingMachines: IPhaseJobItem[] = jobItems || [];
        let filterState: ILogsFilterState = newFilterState ? newFilterState : this._filtersState;

        let hasNameFilterChanged: boolean = true;
        if (newFilterState && (this._filtersState && newFilterState.filterText === this._filtersState.filterText)) {
            hasNameFilterChanged = false;
        }

        if (filterState) {
            const filterText: string = filterState.filterText;

            if (filterText) {
                if (hasNameFilterChanged) {
                    matchingMachines = jobItems.filter((jobItem: IPhaseJobItem) => {
                        if (Utils_String.caseInsensitiveContains(jobItem.name, filterText)) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    });
                    this._filteredLogItems = matchingMachines;
                }
                else {
                    matchingMachines = this._filteredLogItems;
                }
            }
            if (filterState.jobStates) {
                if (matchingMachines) {
                    matchingMachines = matchingMachines.filter((jobItem: IPhaseJobItem) => {
                        if ((jobItem.jobState & filterState.jobStates) === jobItem.jobState) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    });
                }
            }
        }
        return matchingMachines;
    }

    private _sortJobItems(jobItems: IJobItem[]): IJobItem[] {
        const phaseJobItems = jobItems as IPhaseJobItem[];
        //The server object for skipped jobs contains both start time and end time. If skipped job items are sorted by duration asc, they come at the top
        //However, We have a requirement to show skipped jobs at the end in the UI. Hence we  group the job items in two groups and avoid sorting the skipped job items
        let groupedJobItems = this._groupJobItems(phaseJobItems);

        switch (this._sortOrder) {
            case JobSortType.DurationAsc:
                groupedJobItems.nonSkippedJobItems.sort(JobItemsSortHelper.sortByDurationAsc);
                break;
            case JobSortType.DurationDesc:
                groupedJobItems.nonSkippedJobItems.sort(JobItemsSortHelper.sortByDurationDesc);
                break;
            case JobSortType.StartTimeAsc:
                groupedJobItems.nonSkippedJobItems.sort(JobItemsSortHelper.sortByStartTimeAsc);
                break;
        }
        return groupedJobItems.nonSkippedJobItems.concat(groupedJobItems.skippedJobItems);
    }

    private _groupJobItems(jobItems: IPhaseJobItem[]): { skippedJobItems: IPhaseJobItem[]; nonSkippedJobItems: IPhaseJobItem[] } {
        let result: {
            skippedJobItems: IPhaseJobItem[];
            nonSkippedJobItems: IPhaseJobItem[];
        } = {
            skippedJobItems: [],
            nonSkippedJobItems: []
        };
        if (jobItems) {
            jobItems.forEach((jobItem) => {
                if ((jobItem.jobState & JobStates.Skipped) === 0) {
                    result.nonSkippedJobItems.push(jobItem);
                }
                else {
                    result.skippedJobItems.push(jobItem);
                }
            });
        }
        return result;
    }

    private _getJobItemsFromAgentNameToLogsMap(): IJobItem[] {
        return Object.keys(this._agentNameToLogsMap).map((keyName: string) => {
            return this._agentNameToLogsMap[keyName];
        });
    }

    private _initializeAgentNameToLogsMap = (machines: DeploymentMachine[]) => {
        for (let machine of machines) {
            const agentName = machine.agent && machine.agent.name;

            if (agentName) {
                this._agentNameToIdMap[agentName.toLowerCase()] = machine.id;
            }
        }

        if (this._shouldShowPendingMachines()) {
            for (let i = 0, machineCount = machines.length; i < machineCount; i++) {
                this._agentNameToLogsMap[machines[i].agent.name.toLowerCase()] = LogsHelper.getAgentPhaseJobItemForNonStartedDeploymentMachine(machines[i]);
            }
            LogsHelper.updateAgentToLogsMap(this._logItems as IAgentPhaseJobItem[], this._agentNameToLogsMap);
        }
        if (!this._deploymentGroupInfoAvailable) {
            LogsTabTelemetryHelper.publishDeploymentGroupLogsTabInfo(this._getDeploymentGroupLogItems(), this._filtersState);
            this._deploymentGroupInfoAvailable = true;
        }
        this._onChange();
    }

    private _shouldShowPendingMachines(): boolean { //We don't want to show pending machines when the phase is completed
        const deploymentAttempts = this._releaseEnvironmentStore.getEnvironment().deploySteps;
        const currentDeploymentAttempt = ReleaseDeploymentAttemptHelper.getDeploymentAttemptForAttemptNumber(deploymentAttempts, this._getSelectedAttempt());

        const deploymentGroupPhase = ReleasePhaseHelper.getReleaseDeployPhaseFromPhaseId(this._deploymentGroupPhaseId, currentDeploymentAttempt.releaseDeployPhases);

        if ((currentDeploymentAttempt.reason !== DeploymentReason.RedeployTrigger) && !ReleasePhaseHelper.isPhaseCompleted(deploymentGroupPhase)) {
            return true;
        }
        return false;
    }

    private _deploymentGroupPhaseId: number;
    private _environmentInstanceId: string;
    private _logsTabActions: LogsTabActions;
    private _deploymentGroupLogsTabActions: DeploymentGroupLogsTabActions;
    private _agentNameToLogsMap: IDictionaryStringTo<IJobItem>;
    private _logItems: IJobItem[] = [];
    private _machineGroupId: number = null;
    private _jobToLogsMap: IDictionaryStringTo<ILogLine[]>;
    private _releaseEnvironmentStore: ReleaseEnvironmentStore;
    private _sortOrder: JobSortType = JobSortType.StartTimeAsc;
    private _filtersState: ILogsFilterState;
    private _deploymentGroupInfoAvailable: boolean = false;
    private _filteredLogItems: IPhaseJobItem[]; //This is a cached list which avoids filtering the list of machines by machine name again if the name filter has not changed
    private _jobToTaskIdTaskMap: IDictionaryStringTo<IDictionaryStringTo<ITaskLog>> = {}; //Dictionary of jobId -> taskId -> task object
    private _jobToTasksLogLineMap: IDictionaryStringTo<IDictionaryStringTo<ILogLine[]>> = {};  //Dictionary of jobId -> taskId -> Log lines
    private _areTaskLogsAvailable: IDictionaryStringTo<boolean> = {}; //Dictionary which indicates whether task logs are available for a particular job id
    private _userSelectedItemKey: string;
    private _agentNameToIdMap: IDictionaryStringTo<number> = {};
    private _deploymentAttemptStore: DeploymentAttemptStore;
}

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { IAgentPhaseJobItem, IJobItem, ILogLine, IPhaseJobItem, IServerPhaseJobItem, ITaskLog, JobStates, JobType } from "DistributedTaskUI/Logs/Logs.Types";

import { IReleaseApprovalsData } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentApprovalTypes";
import { LogsTabKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { DeploymentAttemptsHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentAttemptsHelper";
import { ILogsState, ILogsStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/ILogsStore";
import { LogsHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsHelper";
import { DeploymentGroupPhaseMachines, IAddLogsPayload, LogsTabActions } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabActions";
import { ReleasePhaseHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/ReleasePhaseHelper";
import { DeploymentAttemptStore } from "PipelineWorkflow/Scripts/ReleaseProgress/DeploymentAttempt/DeploymentAttemptStore";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { IReleaseEnvironmentGatesRuntimeData, IReleaseEnvironmentGatesData } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentGatesTypes";
import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import { ApprovalExecutionOrderIndicator, IDeploymentConditionData } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { IDeploymentGroupPhaseJobItem, IDeploymentStatusJobItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";
import { GatesType } from "PipelineWorkflow/Scripts/Common/Types";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";

export class LogsTabViewStore extends StoreBase implements ILogsStore {

    public initialize(instanceId: string) {
        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._releaseEnvironmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, instanceId);
        this._releaseEnvironmentStore.addChangedListener(this._onChange);
        this._deploymentAttemptStore = StoreManager.GetStore<DeploymentAttemptStore>(DeploymentAttemptStore, instanceId);
        this._deploymentAttemptStore.addChangedListener(this._onChange);
        this._logsTabActions = ActionsHubManager.GetActionsHub<LogsTabActions>(LogsTabActions, instanceId);
        this._logsTabActions.addLogs.addListener(this._handleAddLogs);
        this._logsTabActions.getDeploymentMachines.addListener(this._initializeAgentNameToLogsMap);
        this._logsTabActions.selectLogItem.addListener(this._handleSelectLogItem);
        this._logsTabActions.resetLogItemSelection.addListener(this._handleResetLogItemSelection);

        this._agentNameToLogsMap = {};

        this._updateLogItems();
    }

    public static getKey(): string {
        return LogsTabKeys.LogsTabViewStore;
    }

    public disposeInternal(): void {
        this._releaseEnvironmentStore.removeChangedListener(this._onChange);
        this._deploymentAttemptStore.removeChangedListener(this._onChange);
        this._logsTabActions.addLogs.removeListener(this._handleAddLogs);
        this._logsTabActions.getDeploymentMachines.removeListener(this._initializeAgentNameToLogsMap);
        this._logsTabActions.selectLogItem.removeListener(this._handleSelectLogItem);
        this._logsTabActions.resetLogItemSelection.removeListener(this._handleResetLogItemSelection);
    }

    public getJobToLogsMap(): IDictionaryStringTo<ILogLine[]> {
        return JQueryWrapper.extendDeep({}, this._jobToLogsMap);
    }

    public getLogItems(): IJobItem[] {
        return this._logItems;
    }

    public getState(): ILogsState {
        const environment: ReleaseContracts.ReleaseEnvironment = this._releaseEnvironmentStore.getEnvironment();
        const currentSelectedItemKey: string = this._getCurrentSelectedItemKey(environment);
        const logItems: IJobItem[] = this.getLogItems();

        return {
            logItems: logItems,
            environment: environment,
            environmentName: environment.name,
            jobToLogsMap: this.getJobToLogsMap(),
            selectedAttempt: this._getSelectedAttempt(),
            currentSelectedItemKey: currentSelectedItemKey
        };
    }

    private _getCurrentSelectedItemKey(environment: ReleaseContracts.ReleaseEnvironment): string {
        // If user selected any job item in the left pane, then use that as selected key
        // else get the default selected key 
        let currentSelectedItemKey = this._userSelectedItemKey;
        if (!currentSelectedItemKey) {
            const items = this.getLogItems();
            currentSelectedItemKey = DeploymentAttemptsHelper.getDefaultSelectedJobItemInAttempt(environment, items, this._getSelectedAttempt());
        }

        return currentSelectedItemKey;
    }

    private _updateLogItems() {
        const selectedAttempt: number = this._getSelectedAttempt();
        const environment = this._releaseEnvironmentStore.getEnvironment();
        let deploymentAttemptHelper = this._getReleaseDeploymentAttemptHelper(environment);
        let preDeploymentConditionsData, postDeploymentConditionsData: IDeploymentConditionData = null;
        const preApprovals = DeploymentAttemptsHelper.getSpecificAttemptApprovals(environment.preDeployApprovals, selectedAttempt);
        const nonAutomatedPreApprovalsPresent: boolean = preApprovals && !preApprovals.isAutomated;
        const postApprovals = DeploymentAttemptsHelper.getSpecificAttemptApprovals(environment.postDeployApprovals, selectedAttempt);
        const nonAutomatedPostApprovalsPresent: boolean = postApprovals && !postApprovals.isAutomated;
        let preDeploymentApprovalJobItem, postDeploymentApprovalJobItem, preDeploymentGateJobItem, postDeploymentGateJobItem: IJobItem;
        if (deploymentAttemptHelper) {
            preDeploymentConditionsData = deploymentAttemptHelper.getReleasePreConditionsRuntimeData();
            postDeploymentConditionsData = deploymentAttemptHelper.getReleasePostConditionsRuntimeData();

            const preApprovalsData: IReleaseApprovalsData = preDeploymentConditionsData ? preDeploymentConditionsData.approvalsData : null;
            const postApprovalsData: IReleaseApprovalsData = postDeploymentConditionsData ? postDeploymentConditionsData.approvalsData : null;
            const preGatesRuntimeData: IReleaseEnvironmentGatesRuntimeData = preDeploymentConditionsData ? preDeploymentConditionsData.gatesRuntimeData : null;
            const postGatesRuntimeData: IReleaseEnvironmentGatesRuntimeData = postDeploymentConditionsData ? postDeploymentConditionsData.gatesRuntimeData : null;
            const preGatesData: IReleaseEnvironmentGatesData = preDeploymentConditionsData ? preDeploymentConditionsData.gatesData : null;
            const postGatesData: IReleaseEnvironmentGatesData = postDeploymentConditionsData ? postDeploymentConditionsData.gatesData : null;
            preDeploymentApprovalJobItem = this._getPreDeploymentApprovalItem(preApprovalsData, nonAutomatedPreApprovalsPresent, preDeploymentConditionsData.executionOrder);
            postDeploymentApprovalJobItem = this._getPostDeploymentApprovalItem(postApprovalsData, nonAutomatedPostApprovalsPresent, postDeploymentConditionsData.executionOrder);
            preDeploymentGateJobItem = this._getPreDeploymentGateItem(preGatesRuntimeData, preGatesData, preDeploymentConditionsData.executionOrder);
            postDeploymentGateJobItem = this._getPostDeploymentGateItem(postGatesRuntimeData, postGatesData, postDeploymentConditionsData.executionOrder);
        }

        let phaseLogItems = this._getPhaseJobItems(environment, deploymentAttemptHelper);
        this._logItems = [];

        if (environment.deploySteps && environment.deploySteps.length > 0) {
            const deploymentStatusJobItem = this._getDeploymentStatusJobItem(environment);
            this._logItems.push(deploymentStatusJobItem);
        }

        this._addApprovalAndGateJobItems(preDeploymentConditionsData, preDeploymentApprovalJobItem, preDeploymentGateJobItem);

        phaseLogItems = phaseLogItems.sort((item1: IJobItem, item2: IJobItem) => {
            return item1.rank - item2.rank;
        });

        this._logItems = this._logItems.concat(phaseLogItems);

        this._addApprovalAndGateJobItems(postDeploymentConditionsData, postDeploymentApprovalJobItem, postDeploymentGateJobItem);
    }

    private _showApprovalsBeforeGates(deploymentConditionsData: IDeploymentConditionData): boolean {
        return deploymentConditionsData && deploymentConditionsData.executionOrder && deploymentConditionsData.executionOrder === ApprovalExecutionOrderIndicator.BeforeGates;
    }

    private _addApprovalAndGateJobItems(deploymentConditionsData: IDeploymentConditionData, approvalJobItem: IJobItem, gateJobItem: IJobItem): void {
        // Both approval and gates exist, take into consideration the execution order while adding the jobItems.
        if (approvalJobItem && gateJobItem) {
            if (this._showApprovalsBeforeGates(deploymentConditionsData)) {
                this._logItems.push(approvalJobItem);
                this._logItems.push(gateJobItem);
            }
            else {
                this._logItems.push(gateJobItem);
                this._logItems.push(approvalJobItem);
            }
            // Either of approvals or gates exist, add whatever is present.
        } else {
            if (approvalJobItem) {
                this._logItems.push(approvalJobItem);
            }
            if (gateJobItem) {
                this._logItems.push(gateJobItem);
            }
        }
    }

    private _getSelectedAttempt(): number {
        let selectedAttempt: number = this._deploymentAttemptStore.getState().selectedAttempt;
        if (selectedAttempt < 0) {
            const environment = this._releaseEnvironmentStore.getEnvironment();
            if (environment) {
                selectedAttempt = ReleaseDeploymentAttemptHelper.getLatestDeploymentAttemptNumber(environment.deploySteps);
            }
        }

        return selectedAttempt;
    }

    private _getPreDeploymentApprovalItem(approvalData: IReleaseApprovalsData, nonAutomatedPreApprovalsPresent: boolean, executionOrder: ApprovalExecutionOrderIndicator): IJobItem {

        return this._getDeploymentApprovalItem(ReleaseContracts.ApprovalType.PreDeploy, nonAutomatedPreApprovalsPresent, approvalData, executionOrder);
    }

    private _getPostDeploymentApprovalItem(approvalData: IReleaseApprovalsData, nonAutomatedPostApprovalsPresent: boolean, executionOrder: ApprovalExecutionOrderIndicator): IJobItem {

        return this._getDeploymentApprovalItem(ReleaseContracts.ApprovalType.PostDeploy, nonAutomatedPostApprovalsPresent, approvalData, executionOrder);
    }

    private _getDeploymentApprovalItem(approvalType: ReleaseContracts.ApprovalType, nonAutomatedApprovalsPresent: boolean, approvalData: IReleaseApprovalsData, executionOrder: ApprovalExecutionOrderIndicator) {
        let approvalItem: IJobItem = null;

        if (nonAutomatedApprovalsPresent) {
            approvalItem = ReleasePhaseHelper.getApprovalJobItem(approvalType, approvalData, executionOrder);
        }

        return approvalItem;
    }

    private _getPreDeploymentGateItem(gatesRuntimeData: IReleaseEnvironmentGatesRuntimeData, gatesData: IReleaseEnvironmentGatesData, executionOrder: ApprovalExecutionOrderIndicator): IJobItem {
        if (gatesRuntimeData) {
            return this._getDeploymentGateItem(GatesType.PreDeploy, gatesRuntimeData, gatesData, executionOrder);
        }
    }

    private _getPostDeploymentGateItem(gatesRuntimeData: IReleaseEnvironmentGatesRuntimeData, gatesData: IReleaseEnvironmentGatesData, executionOrder: ApprovalExecutionOrderIndicator): IJobItem {
        if (gatesRuntimeData) {
            return this._getDeploymentGateItem(GatesType.PostDeploy, gatesRuntimeData, gatesData, executionOrder);
        }
    }

    private _getDeploymentGateItem(gatesType: GatesType, gatesRuntimeData: IReleaseEnvironmentGatesRuntimeData, gatesData: IReleaseEnvironmentGatesData, executionOrder: ApprovalExecutionOrderIndicator) {
        return ReleasePhaseHelper.getReleaseGatesJobItem(gatesType, gatesRuntimeData, gatesData, executionOrder);
    }

    private _getReleaseDeploymentAttemptHelper(environment: ReleaseContracts.ReleaseEnvironment): ReleaseDeploymentAttemptHelper {
        let deploymentAttemptHelper: ReleaseDeploymentAttemptHelper = null;
        const selectedAttempt = ReleaseDeploymentAttemptHelper.getDeploymentAttemptForAttemptNumber(environment.deploySteps, this._getSelectedAttempt());
        if (selectedAttempt) {
            deploymentAttemptHelper = ReleaseDeploymentAttemptHelper.createReleaseDeploymentAttemptHelper(environment, selectedAttempt,
                this._releaseStore.getProjectReferenceId());
        }

        return deploymentAttemptHelper;
    }

    private _getPhaseJobItems(environment: ReleaseContracts.ReleaseEnvironment, deploymentAttemptHelper: ReleaseDeploymentAttemptHelper): IJobItem[] {
        const selectedAttempt: number = this._getSelectedAttempt();
        let selectedDeploymentAttempt = ReleaseDeploymentAttemptHelper.getDeploymentAttemptForAttemptNumber(environment.deploySteps, selectedAttempt);
        let items: IJobItem[] = [];
        if (selectedDeploymentAttempt) {
            this._invokeOperationOnEachDeploymentPhase(selectedDeploymentAttempt, environment, (releaseDeployPhase: ReleaseContracts.ReleaseDeployPhase) => {
                if (releaseDeployPhase && releaseDeployPhase.phaseType === ReleaseContracts.DeployPhaseTypes.MachineGroupBasedDeployment) {
                    const dgJobItem = ReleasePhaseHelper.getDeploymentGroupJobs(releaseDeployPhase, releaseDeployPhase.deploymentJobs, environment, selectedAttempt);

                    if (dgJobItem) {
                        const deploymentGroupPhaseJobItem = dgJobItem as IDeploymentGroupPhaseJobItem;

                        if (!this._agentNameToLogsMap[deploymentGroupPhaseJobItem.id]) {
                            this._agentNameToLogsMap[deploymentGroupPhaseJobItem.id] = {};
                        }

                        LogsHelper.updateAgentToLogsMap(deploymentGroupPhaseJobItem.jobs as IAgentPhaseJobItem[], this._agentNameToLogsMap[deploymentGroupPhaseJobItem.id]);
                        deploymentGroupPhaseJobItem.jobs = LogsHelper.getJobItemsFromAgentNameToLogsMap(this._agentNameToLogsMap[deploymentGroupPhaseJobItem.id]) as IAgentPhaseJobItem[];
                        items = items.concat(deploymentGroupPhaseJobItem);
                    }
                }
                else {
                    this._invokeOperationOnEachDeploymentJob(releaseDeployPhase,
                        (releaseDeployPhase: ReleaseContracts.ReleaseDeployPhase, deploymentJob: ReleaseContracts.DeploymentJob) => {

                            let phaseJobItem: IJobItem;
                            switch (releaseDeployPhase.phaseType) {
                                case ReleaseContracts.DeployPhaseTypes.RunOnServer:
                                    phaseJobItem = ReleasePhaseHelper.getServerPhaseJobItem(releaseDeployPhase, deploymentJob, environment, selectedAttempt);
                                    if (phaseJobItem.id) {
                                        LogsHelper.initializeJobToLogsMap(phaseJobItem as IAgentPhaseJobItem, this._jobToLogsMap, this._logItems);
                                        LogsHelper.initializeJobToTasksMap(phaseJobItem as IPhaseJobItem, this._jobToTaskIdTaskMap, this._jobToTasksLogLineMap);
                                        //Check if task logs are available for the respective job id, if they are not available pass on null
                                        LogsHelper.assignJobLogsToTask(phaseJobItem as IServerPhaseJobItem, this._jobToLogsMap[phaseJobItem.id], this._jobToTaskIdTaskMap[phaseJobItem.id],
                                            this._areTaskLogsAvailable[phaseJobItem.id] ? this._jobToTasksLogLineMap[phaseJobItem.id] : null);
                                    }
                                    break;

                                case ReleaseContracts.DeployPhaseTypes.DeploymentGates:
                                    phaseJobItem = ReleasePhaseHelper.getReleaseGatesPhaseJobItem(releaseDeployPhase as ReleaseContracts.ReleaseGatesPhase, deploymentAttemptHelper);
                                    break;

                                case ReleaseContracts.DeployPhaseTypes.AgentBasedDeployment:
                                    phaseJobItem = ReleasePhaseHelper.getAgentPhaseJobItem(releaseDeployPhase, deploymentJob, environment, selectedAttempt);
                                    // Keeping dupe code here for simplicity
                                    if (phaseJobItem.id) {
                                        LogsHelper.initializeJobToLogsMap(phaseJobItem as IAgentPhaseJobItem, this._jobToLogsMap, this._logItems);
                                        LogsHelper.initializeJobToTasksMap(phaseJobItem as IPhaseJobItem, this._jobToTaskIdTaskMap, this._jobToTasksLogLineMap);
                                        //Check if task logs are available for the respective job id, if they are not available pass on null
                                        LogsHelper.assignJobLogsToTask(phaseJobItem as IAgentPhaseJobItem, this._jobToLogsMap[phaseJobItem.id], this._jobToTaskIdTaskMap[phaseJobItem.id],
                                            this._areTaskLogsAvailable[phaseJobItem.id] ? this._jobToTasksLogLineMap[phaseJobItem.id] : null);
                                    }
                                    break;
                            }

                            if (phaseJobItem) {
                                items.push(phaseJobItem);
                            }
                        });
                }
            });
        }
        return items;
    }

    private _getDeploymentGroupJobItems(releaseDeployPhase: ReleaseContracts.ReleaseDeployPhase, environment: ReleaseContracts.ReleaseEnvironment, attempt: number): IPhaseJobItem[] {
        let deploymentGroupJobItems: IPhaseJobItem[] = [];

        let dgJobItem = ReleasePhaseHelper.getDeploymentGroupJobs(releaseDeployPhase, releaseDeployPhase.deploymentJobs, environment, attempt);
        deploymentGroupJobItems.push(dgJobItem);

        return deploymentGroupJobItems;
    }

    private _getDeploymentStatusJobItem(environment: ReleaseContracts.ReleaseEnvironment): IDeploymentStatusJobItem {
        return {
            id: "deployment-status-job-item",
            rank: -100,
            jobType: JobType.DeploymentStatusJob,
            deploySteps: environment.deploySteps,
        } as IDeploymentStatusJobItem;
    }

    private _invokeOperationOnEachDeploymentJob(releaseDeployPhase: ReleaseContracts.ReleaseDeployPhase,
        operation: (releaseDeployPhase: ReleaseContracts.ReleaseDeployPhase,
            deploymentJob: ReleaseContracts.DeploymentJob) => void) {
        if (releaseDeployPhase) {
            if (releaseDeployPhase.phaseType !== ReleaseContracts.DeployPhaseTypes.DeploymentGates
                && releaseDeployPhase.deploymentJobs
                && releaseDeployPhase.deploymentJobs.length > 0) {
                releaseDeployPhase.deploymentJobs.forEach((deploymentJob: ReleaseContracts.DeploymentJob) => {
                    operation(releaseDeployPhase, deploymentJob);
                });
            }
            else {
                // This is to handle the case where Job is not got created for the Phase and we need to show something on 
                // the right pane, for example for skipped phase no job will get created but on right pane we need to show 
                // some message to user why phase got skipped
                operation(releaseDeployPhase, null);
            }
        }
    }


    private _invokeOperationOnEachDeploymentPhase(deploymentObj: ReleaseContracts.DeploymentAttempt,
        environment: ReleaseContracts.ReleaseEnvironment,
        operation: (releaseDeployPhase: ReleaseContracts.ReleaseDeployPhase) => void) {
        if (deploymentObj && deploymentObj.releaseDeployPhases) {
            deploymentObj.releaseDeployPhases.forEach((releaseDeployPhase: ReleaseContracts.ReleaseDeployPhase) => {
                operation(releaseDeployPhase);
            });
        }
    }

    private _onChange = () => {
        this._updateLogItems();
        this.emitChanged();
    }

    private _handleAddLogs = (payload: IAddLogsPayload): void => {
        if (this._jobToLogsMap.hasOwnProperty(payload.timelineRecordId)) {
            LogsHelper.updateJobToLogsMapFromPayload(payload.timelineRecordId, payload.logLines, this._jobToLogsMap, this._logItems);
            //If the payload has the field for the task's timelineRecordId, mark an entry in the dictionary that task logs are available for the respective job id
            if (payload.stepRecordId && !Utils_String.equals(payload.stepRecordId, Utils_String.EmptyGuidString, true)) {
                this._areTaskLogsAvailable[payload.timelineRecordId] = true;
                LogsHelper.updateJobToTasksLogLineMapFromPayload(payload.timelineRecordId, payload.stepRecordId, payload.logLines, this._jobToTasksLogLineMap, this._logItems);
            }
            this._onChange();
        }
    }

    private _handleSelectLogItem = (selectedItemKey: string): void => {
        this._userSelectedItemKey = selectedItemKey;
        this._onChange();
    }

    private _handleResetLogItemSelection = (): void => {
        this._userSelectedItemKey = null;
    }

    private _initializeAgentNameToLogsMap = (phaseMachines: DeploymentGroupPhaseMachines) => {
        const deploymentGroupPhaseJobItem = this._getCurrentDeploymentGroupPhaseJobItems(phaseMachines.deploymentGroupPhaseId);

        if (this._shouldShowPendingMachines(deploymentGroupPhaseJobItem.id)) {

            if (!this._agentNameToLogsMap[deploymentGroupPhaseJobItem.id]) {
                this._agentNameToLogsMap[deploymentGroupPhaseJobItem.id] = {};
            }

            for (let i = 0, machineCount = phaseMachines.machines.length; i < machineCount; i++) {
                const machine = phaseMachines.machines[i];

                if (machine && machine.agent && machine.agent.name) {
                    this._agentNameToLogsMap[deploymentGroupPhaseJobItem.id][machine.agent.name.toLowerCase()] = LogsHelper.getAgentPhaseJobItemForNonStartedDeploymentMachine(machine);
                }
            }

            LogsHelper.updateAgentToLogsMap(((deploymentGroupPhaseJobItem as IDeploymentGroupPhaseJobItem).jobs) as IAgentPhaseJobItem[], this._agentNameToLogsMap[deploymentGroupPhaseJobItem.id]);
            this._onChange();
        }
    }

    private _shouldShowPendingMachines(deploymentGroupPhaseId: string): boolean { //We don't want to show pending machines when the phase is completed        
        if (!!deploymentGroupPhaseId) {
            const deploymentAttempts = this._releaseEnvironmentStore.getEnvironment().deploySteps;
            const currentDeploymentAttempt = ReleaseDeploymentAttemptHelper.getDeploymentAttemptForAttemptNumber(deploymentAttempts, this._getSelectedAttempt());

            const deploymentGroupPhase = ReleasePhaseHelper.getReleaseDeployPhaseFromPhaseId(parseInt(deploymentGroupPhaseId, 10), currentDeploymentAttempt.releaseDeployPhases);

            if ((currentDeploymentAttempt.reason !== ReleaseContracts.DeploymentReason.RedeployTrigger) && !ReleasePhaseHelper.isPhaseCompleted(deploymentGroupPhase)) {
                return true;
            }
        }

        return false;
    }

    private _getCurrentDeploymentGroupPhaseJobItems(deploymentGroupPhaseId: number): IJobItem {
        if (this._logItems && deploymentGroupPhaseId) {
            for (let i = 0, itemCount = this._logItems.length; i < itemCount; i++) {
                if (this._logItems[i].id === deploymentGroupPhaseId.toString()) {
                    return this._logItems[i];
                }
            }
        }
    }

    private _releaseStore: ReleaseStore;
    private _releaseEnvironmentStore: ReleaseEnvironmentStore;
    private _deploymentAttemptStore: DeploymentAttemptStore;
    private _logsTabActions: LogsTabActions;
    private _agentNameToLogsMap: IDictionaryStringTo<IDictionaryStringTo<IJobItem>>;
    private _jobToLogsMap: IDictionaryStringTo<ILogLine[]> = {};
    private _jobToTasksLogLineMap: IDictionaryStringTo<IDictionaryStringTo<ILogLine[]>> = {}; //Dictionary of jobId -> taskId -> Log lines
    private _jobToTaskIdTaskMap: IDictionaryStringTo<IDictionaryStringTo<ITaskLog>> = {}; //Dictionary of jobId -> taskId -> task object
    private _areTaskLogsAvailable: IDictionaryStringTo<boolean> = {}; //Dictionary which indicates whether task logs are available for a particular job id
    private _logItems: IJobItem[] = [];
    private _userSelectedItemKey: string;
}

import * as Types from "DistributedTasksCommon/TFS.Tasks.Types";
import * as TaskUtils from "DistributedTasksCommon/TFS.Tasks.Utils";

import { TaskGroupDialogActionsCreator } from "DistributedTaskControls/Actions/TaskGroupDialogActionsCreator";
import { TaskListActionsCreator } from "DistributedTaskControls/Actions/TaskListActionsCreator";
import { MetaTaskHubContributionId, Workflow, FeatureFlag_EnableOldTaskGroupHub } from "DistributedTaskControls/Common/Common";
import { Telemetry, Feature, Properties, Source } from "DistributedTaskControls/Common/Telemetry";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { AppContext } from "DistributedTaskControls/Common/AppContext";
import { Singleton } from "DistributedTaskControls/Common/Factory";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { TaskItem } from "DistributedTaskControls/Components/Task/TaskItem";
import { TaskStore } from "DistributedTaskControls/Components/Task/TaskStore";
import { VariablesListBaseStore } from "DistributedTaskControls/Variables/VariablesListBaseStore";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";
import { TaskGroupParametersActionCreator } from "DistributedTaskControls/Actions/TaskGroupParametersActionCreator";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";
import { DataSourceBinding } from "TFS/ServiceEndpoint/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import Context = require("VSS/Context");
import { showMessageDialog, IShowMessageDialogOptions } from "VSS/Controls/Dialogs";
import "VSS/LoaderPlugins/Css!DistributedTasksLibrary";

/**
 * @brief Contains helper methods related to MetaTask
 */
export class MetaTaskManager extends Singleton {

    /**
     * @brief Singleton Instance
     */
    public static instance(): MetaTaskManager {
        return super.getInstance<MetaTaskManager>(MetaTaskManager);
    }

    public static isNewTaskGroupHubEnabled(): boolean {
        return !DtcUtils.isFeatureFlagEnabled(FeatureFlag_EnableOldTaskGroupHub);
    }

    /**
     * @brief Opens Manage Meta-Task page in new tab
     * @param taskId
     */
    public manageMetaTask(taskId: string): void {
        let url = Utils_String.empty;
        const isNewTaskGroupHubEnabled = MetaTaskManager.isNewTaskGroupHubEnabled();
        if (isNewTaskGroupHubEnabled) {
            url = Utils_String.format("{0}/_taskgroup/{1}", TaskUtils.PresentationUtils.getTeamUrl(), taskId);
        } else {
            url = DtcUtils.getUrlForExtension(MetaTaskHubContributionId,
                "properties",
                { taskGroupId: taskId });
        }

        UrlUtilities.openInNewWindow(url, true);
    }

    /**
     * This section has code copied from TFS.Tasks.TasksEditor.ts.
     * We will be using the exiting Create Meta Task dialog for parity implementation
     * This will be replaced with new UI once we have specs for the same.
     * We are copying code here so as to reduce the dependency on Old Build code and hence have avoid bloating of bundle size.
     */

    /**
     * @brief Creates a new MetaTask
     */
    public createMetaTask(taskItemList: TaskItem[], workflow: Workflow, taskListStoreInstaceId: string): void {
        let tasks: DistributedTaskContracts.TaskGroupStep[] = [];
        let addedVariables: string[] = [];
        let metaTaskInputs: DistributedTaskContracts.TaskInputDefinition[] = [];
        let dataSourceBindings: DataSourceBinding[] = [];
        let groups: DistributedTaskContracts.TaskGroupDefinition[] = [];
        let runsOn: string[];
        let invalidTaskDefinition: DistributedTaskContracts.TaskDefinition;
        this._taskListStoreInstanceId = taskListStoreInstaceId;

        this._workflow = workflow;
        this._taskItemList = taskItemList;
        this._variablesListStore = StoreManager.GetStore<VariablesListBaseStore>(VariablesListBaseStore);

        let taskStoreList: TaskStore[] = this._getTaskStoreList(this._taskItemList);

        let showErrorForTaskGroupCreation: boolean = taskStoreList.some(taskStore => {
            return !taskStore.isValidForCreatingTaskGroup();
        });

        if (showErrorForTaskGroupCreation === true) {
            let options: IShowMessageDialogOptions = {
                title: Resources.ErrorText,
                buttons: [{
                    id: "ok-button",
                    text: Resources.OK
                }]
            };

            Telemetry.instance().publishEvent(Feature.TaskGroupCreationBlockedDueToProcessParam);
            showMessageDialog(Resources.TaskGroupCreationDeniedBecauseOfProcessParams, options);
            return;
        }

        Utils_Array.first<TaskStore>(taskStoreList, ((taskStore: TaskStore) => {
            let task: Types.ITask = taskStore.getTaskInstance();
            let taskDefinition: DistributedTaskContracts.TaskDefinition = taskStore.getTaskDefinition();

            // runsOn for taskGroup: intersect child tasks runsOn
            if (!!runsOn) {
                runsOn = Utils_Array.intersect(runsOn, taskDefinition.runsOn, Utils_String.localeIgnoreCaseComparer);
            } else {
                runsOn = taskDefinition.runsOn;
            }
            if (runsOn.length < 1) {
                invalidTaskDefinition = taskDefinition;
                return true;
            }

            let taskGroupDefinition: DistributedTaskContracts.TaskGroupDefinition = {
                displayName: task.displayName,
                isExpanded: true,
                name: task.displayName,
                tags: [],
                visibleRule: Utils_String.empty
            };

            this._extractTaskGroupInputs(taskStore, metaTaskInputs, dataSourceBindings, addedVariables);

            tasks.push(<DistributedTaskContracts.TaskGroupStep>task);
            groups.push(taskGroupDefinition);
            return false;
        }));

        // alert user if unable to get runsOn value for taskGroup
        if (runsOn.length < 1 && !!invalidTaskDefinition) {
            alert(Utils_String.format(Resources.Task_UnableToCreateTaskGroupMessage,
                invalidTaskDefinition.name, invalidTaskDefinition.runsOn.join()));
            return;
        }

        this._showCreateMetaTaskDialog(metaTaskInputs, tasks, dataSourceBindings, groups, runsOn);
    }

    public extractVariablesFromInput(
        inputName: string,
        value: string,
        sourceInputDefinition: DistributedTaskContracts.TaskInputDefinition,
        taskStore: TaskStore
    ): DistributedTaskContracts.TaskInputDefinition[] {
        let extractedVariables: DistributedTaskContracts.TaskInputDefinition[] = [];
        if (!sourceInputDefinition || taskStore.isGroupOrInputVisible(sourceInputDefinition.visibleRule, inputName)) {
            extractedVariables = this._extractNonSystemVariables(inputName, value, sourceInputDefinition);
        }

        return extractedVariables;
    }

    public getTaskGroupInputsAndDataSourceBindings(taskItemList: TaskItem[]): {
        taskGroupInputs: DistributedTaskContracts.TaskInputDefinition[],
        dataSourceBindings: DataSourceBinding[]
    } {
        let addedVariables: string[] = [];
        let taskGroupInputs: DistributedTaskContracts.TaskInputDefinition[] = [];
        let dataSourceBindings: DataSourceBinding[] = [];
        const taskStoreList = this._getTaskStoreList(taskItemList);
        taskStoreList.forEach((taskStore: TaskStore) => {
            this._extractTaskGroupInputs(taskStore, taskGroupInputs, dataSourceBindings, addedVariables);
        });

        taskGroupInputs = taskGroupInputs.sort((taskInput1, taskInput2) => {
            return Utils_String.localeIgnoreCaseComparer(taskInput1.name, taskInput2.name);
        });

        return {
            taskGroupInputs: taskGroupInputs,
            dataSourceBindings: dataSourceBindings
        };
    }

    public updateTaskGroupInputValues(
        currentInputs: DistributedTaskContracts.TaskInputDefinition[],
        existingInputs: DistributedTaskContracts.TaskInputDefinition[]): DistributedTaskContracts.TaskInputDefinition[] {

        let taskGroupInputs: DistributedTaskContracts.TaskInputDefinition[] = currentInputs.map((taskInput) => taskInput);

        existingInputs.forEach((existingTaskInput) => {
            const match = Utils_Array.first(
                taskGroupInputs,
                (currentTaskInput) => currentTaskInput.name === existingTaskInput.name);

            if (!!match) {
                if (match.type === existingTaskInput.type) {
                    match.defaultValue = existingTaskInput.defaultValue;
                    match.helpMarkDown = existingTaskInput.helpMarkDown;
                    match.options = existingTaskInput.options;
                }
            }
        });

        taskGroupInputs = taskGroupInputs.sort((taskInput1, taskInput2) => {
            return Utils_String.localeIgnoreCaseComparer(taskInput1.name, taskInput2.name);
        });

        return taskGroupInputs;
    }

    private _extractNonSystemVariables(key: string, value: string,
        sourceInputDefinition: DistributedTaskContracts.TaskInputDefinition): DistributedTaskContracts.TaskInputDefinition[] {
        return TaskUtils.VariableExtractor.extractVariables(key, value, sourceInputDefinition, (variableName: string) => {
            return !this._isSystemVariable(variableName);
        });
    }

    private _getTaskStoreList(taskItems: TaskItem[]): TaskStore[] {
        return taskItems.map((item: TaskItem) => {
            return StoreManager.GetStore<TaskStore>(TaskStore, item.getKey());
        });
    }

    private _extractTaskGroupInputs(
        taskStore: TaskStore,
        metaTaskInputs: DistributedTaskContracts.TaskInputDefinition[],
        dataSourceBindings: DataSourceBinding[],
        addedVariables: string[]
    ): void {

        let task = taskStore.getTaskInstance();
        const taskDefinition = taskStore.getTaskDefinition();
        addedVariables = addedVariables || [];
        let currentDataSourceBindings: DataSourceBinding[] = [];
        metaTaskInputs = metaTaskInputs || [];
        dataSourceBindings = dataSourceBindings || [];

        // If definition contains source bindings
        if (taskDefinition.dataSourceBindings) {
            currentDataSourceBindings = TaskUtils.DataSourceBindingUtils.clone(taskDefinition.dataSourceBindings);
        }

        if (task.inputs) {
            for (let inputName in task.inputs) {
                if (task.inputs.hasOwnProperty(inputName)) {
                    task.inputs[inputName] = DtcUtils.resolveTaskInputValueByProcessParameters(task.inputs[inputName],
                        taskStore.getProcessParameterToValueMap()).resolvedValue;
                    let value: string = task.inputs[inputName];

                    let sourceInputDefinition: DistributedTaskContracts.TaskInputDefinition = Utils_Array.first(taskDefinition.inputs, (inputDefinition: DistributedTaskContracts.TaskInputDefinition) => {
                        return inputDefinition.name === inputName;
                    });

                    let extractedVariables: DistributedTaskContracts.TaskInputDefinition[] = this.extractVariablesFromInput(
                        inputName,
                        value,
                        sourceInputDefinition,
                        taskStore);

                    extractedVariables.forEach((variable: DistributedTaskContracts.TaskInputDefinition) => {
                        if (!Utils_Array.contains(addedVariables, variable.name)) {

                            if (!!this._variablesListStore) {
                                this._variablesListStore.resolveVariable(variable, taskStore.getTaskContext().processInstanceId);
                            }

                            metaTaskInputs.push(variable);
                            addedVariables.push(variable.name);
                        }

                        // Normalize data type
                        TaskUtils.VariableExtractor.normalizeVariableTypeInfo(metaTaskInputs, variable);
                    });

                    // Update current bindings with new name
                    if (extractedVariables.length === 1) {

                        let newlyAddedInput: DistributedTaskContracts.TaskInputDefinition = Utils_Array.first(metaTaskInputs,
                            (searchVariable: DistributedTaskContracts.TaskInputDefinition) => {
                                return searchVariable.name === extractedVariables[0].name;
                            });

                        TaskUtils.DataSourceBindingUtils.updateVariables(currentDataSourceBindings,
                            sourceInputDefinition,
                            newlyAddedInput);
                    }

                    dataSourceBindings = TaskUtils.DataSourceBindingUtils.merge(dataSourceBindings, currentDataSourceBindings);
                }
            }
        }
    }

    private _showCreateMetaTaskDialog(metaTaskInputDefinitions: DistributedTaskContracts.TaskInputDefinition[],
        tasks: DistributedTaskContracts.TaskGroupStep[],
        dataSourceBindings: DataSourceBinding[],
        groups: DistributedTaskContracts.TaskGroupDefinition[],
        runsOn: string[]) {

        let taskGroupActionsCreator: TaskGroupDialogActionsCreator = ActionCreatorManager.GetActionCreator<TaskGroupDialogActionsCreator>(TaskGroupDialogActionsCreator);
        const taskGroupParametersActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupParametersActionCreator>(TaskGroupParametersActionCreator);
        taskGroupParametersActionCreator.setMetaTaskInput(metaTaskInputDefinitions, tasks, dataSourceBindings, groups, runsOn);
        taskGroupActionsCreator.showTaskGroupSaveDialog();
    }

    public generateMetaTaskDefinition(groupName: string, description: string, category: string, tasks: DistributedTaskContracts.TaskGroupStep[], inputs: DistributedTaskContracts.TaskInputDefinition[], runsOn: string[],
        dataSourceBindings: DataSourceBinding[], groups: DistributedTaskContracts.TaskGroupDefinition[]): DistributedTaskContracts.TaskGroup {

        groupName = groupName.trim();

        let taskGroupDefinition: DistributedTaskContracts.TaskGroup = {
            tasks: tasks,
            owner: Context.getDefaultWebContext().user.id,
            category: category,
            description: description,
            agentExecution: null,
            author: Context.getDefaultWebContext().user.name,
            contentsUploaded: true,
            contributionIdentifier: null,
            contributionVersion: null,
            dataSourceBindings: dataSourceBindings,
            satisfies: [],
            demands: [],
            disabled: false,
            deleted: false,
            preview: false,
            deprecated: false,
            friendlyName: groupName,
            groups: groups,
            helpMarkDown: Utils_String.empty,
            hostType: null,
            iconUrl: Context.getPageContext().webAccessConfiguration.paths.resourcesPath + "icon-meta-task.png",
            id: Utils_String.empty,
            inputs: inputs,
            instanceNameFormat: Utils_String.localeFormat(Resources.MetataskInstanceNameFormat, groupName, (inputs && inputs.length ? "$(" + inputs[0].name + ")" : "")),
            minimumAgentVersion: MetaTaskManager._minimumAgentVersion,
            name: groupName,
            packageLocation: Utils_String.empty,
            packageType: Utils_String.empty,
            releaseNotes: null,
            serverOwned: false,
            sourceDefinitions: [],
            sourceLocation: Utils_String.empty,
            version: { isTest: false, major: 1, minor: 0, patch: 0 },
            parentDefinitionId: null,
            visibility: [MetaTaskManager._visibilityBuild, MetaTaskManager._visibilityRelease],
            runsOn: runsOn,
            definitionType: MetaTaskManager._definitionType,
            preJobExecution: { key: Utils_String.empty, value: Utils_String.empty },
            execution: { key: Utils_String.empty, value: Utils_String.empty },
            postJobExecution: { key: Utils_String.empty, value: Utils_String.empty },
            revision: null,
            createdBy: null,
            createdOn: null,
            modifiedBy: null,
            modifiedOn: null,
            comment: null,
            outputVariables: null,
            showEnvironmentVariables: false
        };

        return taskGroupDefinition;
    }

    public onCreateMetaTaskOkCallBack =
    (metaTaskDefinition: DistributedTaskContracts.TaskGroup, onMetaTaskCreated: (taskGroupId: string, taskGroupName: string) => void): IPromise<DistributedTaskContracts.TaskGroup> => {

        let taskListActionsCreator = ActionCreatorManager.GetActionCreator<TaskListActionsCreator>(TaskListActionsCreator, this._taskListStoreInstanceId);

        return taskListActionsCreator.createMetaTask(metaTaskDefinition,
            this._taskItemList.map((item: TaskItem) => {
                return item.getKey();
            }),
            this._workflow, onMetaTaskCreated);
    }

    private _isSystemVariable(variable: string): boolean {

        // Build doesn't expose variables via interfaces so use hardcoded values
        if (Utils_Array.contains(MetaTaskManager._systemVariable, variable.toLowerCase())) {
            return true;
        }

        // Detecing system variables for RM
        if (!!AppContext.instance().IsSystemVariable && AppContext.instance().IsSystemVariable(variable)) {
            return true;
        }

        return false;
    }

    private static readonly _systemVariable: string[] = [
        "agent.builddirectory",
        "agent.homedirectory",
        "agent.id",
        "agent.jobname",
        "agent.jobstatus",
        "agent.machinename",
        "agent.name",
        "agent.os",
        "agent.osversion",
        "agent.rootdirectory",
        "agent.serveromdirectory",
        "agent.tempdirectory",
        "agent.toolsdirectory",
        "agent.workfolder",
        "agent.workingdirectory",
        "build.artifactstagingdirectory",
        "build.binariesdirectory",
        "build.buildid",
        "build.buildnumber",
        "build.builduri",
        "build.clean",
        "build.definitionname",
        "build.definitionversion",
        "build.fetchtags",
        "build.queuedby",
        "build.queuedbyid",
        "build.reason",
        "build.repository.clean",
        "build.repository.git.submodulecheckout",
        "build.repository.localpath",
        "build.repository.name",
        "build.repository.provider",
        "build.repository.tfvc.shelveset",
        "build.repository.tfvc.workspace",
        "build.repository.uri",
        "build.requestedfor",
        "build.requestedForEmail",
        "build.requestedforid",
        "build.sourcebranch",
        "build.sourcebranchname",
        "build.sourcesdirectory",
        "build.sourcetfvcShelveset",
        "build.sourceversion",
        "build.stagingdirectory",
        "build.syncSources",
        "build.triggeredby.builddefinitionname",
        "build.triggeredby.buildid",
        "build.triggeredby.buildnumber",
        "build.triggeredby.definitionid",
        "build.triggeredby.projectid",
        "common.testresultsdirectory",
        "system.accesstoken",
        "system.collectionid",
        "system.culture",
        "system.debug",
        "system.defaultworkingdirectory",
        "system.definitionid",
        "system.enableaccesstoken",
        "system.hosttype",
        "system.jobid",
        "system.jobparallelismtag",
        "system.parallelexecutiontype",
        "system.planid",
        "system.pullrequest.isfork",
        "system.pullrequest.mergedat",
        "system.pullrequest.pullrequestid",
        "system.pullrequest.pullrequestnumber",
        "system.pullrequest.sourcebranch",
        "system.pullrequest.sourcecommitid",
        "system.pullrequest.sourcerepositoryuri",
        "system.pullrequest.targetbranch",
        "system.servertype",
        "system.teamfoundationcollectionuri",
        "system.teamfoundationserveruri",
        "system.teamproject",
        "system.teamprojectid"
    ];

    private _workflow: Workflow;
    private _taskItemList: TaskItem[];
    private _taskListStoreInstanceId: string;
    private _variablesListStore: VariablesListBaseStore;
    private static readonly _visibilityBuild: string = "Build";
    private static readonly _visibilityRelease: string = "Release";
    private static readonly _definitionType: string = "metaTask";
    private static readonly _minimumAgentVersion: string = "*";
}
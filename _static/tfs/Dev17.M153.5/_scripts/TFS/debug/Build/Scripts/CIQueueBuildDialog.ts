import * as Q from "q";

import { getDefinition } from "Build/Scripts/Actions/DefinitionsActionCreator";
import { getMessageBarEventManager, MessageTypes, raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";
import { DialogScenarios, NavigationScenario, startNavigationScenario } from "Build/Scripts/Performance";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { DefinitionSource } from "Build/Scripts/Sources/Definitions";
import { QueuesSource } from "Build/Scripts/Sources/Queues";

import { getRuntimeVariables, QueueBuildDialog } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/QueueBuildDialog";
import { Utilities } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/Utilities";

import { TaskListActions } from "DistributedTaskControls/Actions/TaskListActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { AppCapability, AppContext } from "DistributedTaskControls/Common/AppContext";
import { TaskListStoreInstanceId } from "DistributedTaskControls/Common/Common";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IApplicationLayerContext } from "DistributedTaskControls/Common/Types";
import { IProcessManagementStoreArgs, ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";
import { IOptions, ProcessParameterStore } from "DistributedTaskControls/Stores/ProcessParameterStore";
import { ITaskListStoreArgs, TaskListStore } from "DistributedTaskControls/Stores/TaskListStore";

import { BuildDefinition, BuildDefinitionStep, DefinitionQueueStatus, DesignerProcess } from "TFS/Build/Contracts";
import { TaskAgentQueue, TaskAgentQueueActionFilter, TaskDefinition } from "TFS/DistributedTask/Contracts";
import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";

import { getService as getEventService, CommonActions } from "VSS/Events/Action";
import { getCollectionClient, getCollectionService } from "VSS/Service";
import { empty, format } from "VSS/Utils/String";
import { globalProgressIndicator } from "VSS/VSS";

export class CIQueueBuildDialog {
    private _definitionId: number = -1;
    private _telemetrySource: string = "";
    private _showMessageOnSuccess = true;

    private _definitionSource: DefinitionSource = null;
    private _queuesSource: QueuesSource = null;

    private _taskAgentHttpClient: TaskAgentHttpClient = null;

    private _taskListActions: TaskListActions = null;

    private _performance: NavigationScenario = null;

    constructor(definitionId: number, telemetrySource: string, showMessageOnSuccess: boolean = true) {
        this._performance = startNavigationScenario(DialogScenarios.QueueBuild);
        this._definitionId = definitionId;
        this._telemetrySource = telemetrySource;
        this._showMessageOnSuccess = showMessageOnSuccess;

        this._definitionSource = getCollectionService(DefinitionSource);
        this._queuesSource = getCollectionService(QueuesSource);

        this._taskAgentHttpClient = getCollectionClient(TaskAgentHttpClient);

        this._taskListActions = ActionsHubManager.GetActionsHub<TaskListActions>(TaskListActions, TaskListStoreInstanceId);

        // Initializing TaskList Store since demands require this store to get "readOnly" demands from tasks
        // In addition to that we need to initialize some other stores as well - ProcessParameterStore
        const appContext: IApplicationLayerContext = {};
        // initialize the process management store
        StoreManager.CreateStore<ProcessManagementStore, IProcessManagementStoreArgs>(ProcessManagementStore, empty,
            { processManagementCapabilities: ProcessManagementCapabilities.All } as IProcessManagementStoreArgs);
        StoreManager.CreateStore<ProcessParameterStore, IOptions>(ProcessParameterStore, null, { appContext: appContext });
        StoreManager.CreateStore<TaskListStore, ITaskListStoreArgs>(
            TaskListStore,
            TaskListStoreInstanceId,
            {
                taskList: [],
                appContext: appContext,
                itemSelectionInstanceId: TaskListStoreInstanceId
            });

        // make sure we set app context, other-wise user can't add demands..., question: how am I supposed to know that!? we should fix this
        AppContext.instance().Capabilities = [AppCapability.Build, AppCapability.LinkProcessParameters];
    }

    public open() {
        this._performance.addSplitTiming("initializing data for queue build dialog");
        const progressId = globalProgressIndicator.actionStarted("CIQueueBuildDialog");

        // get latest definition
        const definitionPromise = getDefinition(this._definitionSource, this._definitionId);
        // get latest list of queues
        const queuesPromise = this._queuesSource.getQueues(TaskAgentQueueActionFilter.Use);
        // get list of all tasks, though we don't need all, we currently don't have ability to get all tasks with a list of ids in single call...
        const tasksPromise = this._taskAgentHttpClient.getTaskDefinitions(null, ["Build"]);

        Q.all([definitionPromise, queuesPromise, tasksPromise]).spread(
            (definition: BuildDefinition, queues: TaskAgentQueue[], taskDefinitions: TaskDefinition[]) => {
                this._performance.addSplitTiming("data initialized for queue build dialog");
                TaskDefinitionSource.instance().initializePrefetchedDefinitions(
                    taskDefinitions.filter((taskDefinition) => (!!taskDefinition)),
                    false);

                // update existing tasks, send forceUpdate true so that it when it gets taskItems it goes and fetches the task from the prefetched list using the source
                let steps: BuildDefinitionStep[] = [];
                const process = definition.process as DesignerProcess;
                if (process && process.phases && process.phases.length > 0) {
                    steps = process.phases[0].steps;
                }

                const queueStatus = (definition && definition.queueStatus) ? definition.queueStatus : DefinitionQueueStatus.Enabled;

                this._taskListActions.updateTasks.invoke({
                    forceUpdate: true,
                    tasks: steps
                });

                QueueBuildDialog.open({
                    agentQueues: queues,
                    defaultAgentQueue: Utilities.convertFromBuildQueue(definition.queue),
                    definitionName: definition.name,
                    definitionId: definition.id,
                    defaultSourceBranch: definition.repository ? definition.repository.defaultBranch : "",
                    processType: definition.process.type,
                    repository: definition.repository,
                    runTimeVariables: getRuntimeVariables(definition.variables),
                    serializedDemands: definition.demands,
                    queueDialogSource: this._telemetrySource,
                    onSuccess: this._onSuccess,
                    definitionQueueStatus: queueStatus
                });

                globalProgressIndicator.actionCompleted(progressId);
                this._performance.end();
            },
            (error) => {
                this._performance.addSplitTiming("data initialized for queue build dialog");
                globalProgressIndicator.actionCompleted(progressId);
                raiseTfsError(error);
                this._performance.end();
            });
    }

    private _onSuccess = (link: string, buildNumber: string) => {
        let openLink = false;
        if (this._showMessageOnSuccess) {
            const eventManager = getMessageBarEventManager();
            if (eventManager) {
                getMessageBarEventManager().raiseInfoMessage({
                    format: BuildResources.BuildQueuedTextPrefix + " {0} " + BuildResources.BuildQueuedTextSuffix,
                    links: [{
                        name: "#" + buildNumber,
                        href: link
                    }],
                    type: MessageTypes.Success
                });
            }
            else {
                openLink = true;
            }
        } else {
            openLink = true;
        }

        if (openLink) {
            getEventService().performAction(CommonActions.ACTION_WINDOW_OPEN, {
                url: link,
            });
        }
    }
}

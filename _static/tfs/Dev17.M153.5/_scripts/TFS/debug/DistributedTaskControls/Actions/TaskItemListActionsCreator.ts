import * as Q from "q";

import { DefinitionType, TaskGroupType } from "DistributedTasksCommon/TFS.Tasks.Types";

import { TaskExtensionItemListActionsCreator } from "DistributedTaskControls/Actions/TaskExtensionItemListActionsCreator";
import { MessageHandlerActions, IAddMessagePayload } from "DistributedTaskControls/Actions/MessageHandlerActions";
import * as Actions from "DistributedTaskControls/Actions/TaskItemListActions";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { TaskItemUtils } from "DistributedTaskControls/Common/TaskItemUtilities";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { ITaskDefinitionItem } from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { LoadableComponentActionsHub } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentActionsHub";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";

import * as Utils_String from "VSS/Utils/String";

import { TaskDefinition } from "TFS/DistributedTask/Contracts";

/**
 * @brief Action creator for Task actions
 * @param {TemplatesSource} private _source
 * @returns
 */
export class TaskItemListActionsCreator extends ActionCreatorBase {

    /**
     * @returns Returns unique key for this creator
     */
    public static getKey(): string {
        return ActionCreatorKeys.TaskActionsCreator;
    }

    /**
     * @brief Initializes the actions
     */
    public initialize(instanceId?: string) {
        this._instanceId = instanceId.concat(TaskItemUtils.tasksIdentifierText);

        this._actions = ActionsHubManager.GetActionsHub<Actions.TaskItemListActions>(Actions.TaskItemListActions);
        this._loadableComponentActionsHub = ActionsHubManager.GetActionsHub<LoadableComponentActionsHub>(LoadableComponentActionsHub, this._instanceId);
    }

    public updateTaskItemList(visibilityFilter: string[], taskGroupType: TaskGroupType, forceRefresh: boolean = false): void {
        let startTime: number = Date.now();

        let taskDefinitionsPromise = TaskDefinitionSource.instance().getTaskDefinitionList(false, visibilityFilter, forceRefresh);
        
        // One loading for tasks and other for extensions
        this._loadableComponentActionsHub.showLoadingExperience.invoke({});                     

        taskDefinitionsPromise.then((taskDefinitionList: TaskDefinition[]) => {
            // Making the filter empty while component is mounting except in case of refresh
            this._clearFilter(forceRefresh);

            this._updateTasks(taskDefinitionList, taskGroupType);
            this._loadableComponentActionsHub.hideLoadingExperience.invoke({});   

            this._publishTasksResolvedTelemetry(startTime);                                 
            }, (error) => {
                // Making the filter empty while component is mounting except in case of refresh
                this._clearFilter(forceRefresh);                

                this._actions.updateTaskItemList.invoke({
                isTaskFetched: false
            });

            this._loadableComponentActionsHub.hideLoadingExperience.invoke({});     
            
            this._publishTasksFailedTelemetry();
        });
    }

    public filterTaskItemList(filter: string): void {
        this._actions.filterTaskItemList.invoke(filter);
    }

    private _updateTasks(taskDefinitionList: TaskDefinition[], taskGroupType: TaskGroupType): void {
        let taskDefinitions = taskDefinitionList.filter((taskDefinition: TaskDefinition) => {
            return DtcUtils.isTaskSupportedForTaskGroup(taskGroupType, taskDefinition.runsOn);
        });

        (taskDefinitions || []).forEach((taskDefinition) => {
            if ((taskDefinition.definitionType === DefinitionType.metaTask) && taskDefinition.version.isTest) {
                let draftParenthesis = Utils_String.localeFormat("({0})", Resources.DraftText);
                if (taskDefinition.friendlyName && !Utils_String.endsWith(taskDefinition.friendlyName, draftParenthesis, Utils_String.localeIgnoreCaseComparer)) {
                    taskDefinition.friendlyName = Utils_String.localeFormat(Resources.DraftedTaskDefinitionFriendlyName, taskDefinition.friendlyName, draftParenthesis);
                }
            }
        });

        // Mapping task definitions to task definition items and returning as task items
        let tasks: ITaskDefinitionItem[] = taskDefinitions.map((taskDefinition: TaskDefinition) =>  TaskItemUtils.mapTaskDefinitionToITaskDefinitionItem(taskDefinition));
        
        this._actions.updateTaskItemList.invoke({
            taskItems: tasks,
            isTaskFetched: true
        });
    }

    private _publishTasksResolvedTelemetry(startTime: number): void {
        Telemetry.instance().publishEvent(Feature.TasksLoad, {} , null, false, startTime);
    }

    private _publishTasksFailedTelemetry(): void {
        Telemetry.instance().publishEvent(Feature.TasksFailed);
    }

    private _clearFilter(forceRefresh: boolean): void {
        if (!forceRefresh) {
            this.filterTaskItemList(Utils_String.empty);
        }
    }

    private _actions: Actions.TaskItemListActions;
    private _loadableComponentActionsHub: LoadableComponentActionsHub;
    private _instanceId: string;
}
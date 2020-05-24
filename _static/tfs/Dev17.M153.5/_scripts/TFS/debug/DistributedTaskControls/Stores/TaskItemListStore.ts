
import * as Actions from "DistributedTaskControls/Actions/TaskItemListActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { FilteringUtils } from "DistributedTaskControls/Common/FilteringUtils";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import { TaskItemType, ITaskDefinitionItem } from "DistributedTaskControls/Common/Types";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as Utils_String from "VSS/Utils/String";

// This is in-line with existing implementation
// The categories and it's sequence is pre-defined
// If any task sets a category apart from this, we will show that only in "All"
// UI will honor the same sequence so please don't change the sequence without consulting PMs.
export let PreDefinedTaskListCategories: IDictionaryStringTo<string> = {
    "all": Resources.TaskItemListAllText,
    "build": Resources.Task_BuildCategoryText,
    "utility": Resources.Task_UtilityCategoryText,
    "test": Resources.Task_TestCategoryText,
    "package": Resources.Task_PackageCategoryText,
    "deploy": Resources.Task_DeployCategoryText,
    "tool": Resources.Task_ToolCategoryText,
    "marketplace": Resources.Task_MarketplaceCategoryText
};

export const Key_PreDefinedTaskListCategories_MarketplaceTasks: string = "marketplace"; // Make sure that this is case-sensitive match to the Key for marketplace tasks in the above dictionary.

export const Key_PreDefinedTaskListCategories_AllTasks: string = "all"; // Make sure that this is case-sensitive match to the Key for All tasks in the above dictionary.

export interface ITaskListResult {
    tasks: ITaskDefinitionItem[];
    deprecatedTasks: ITaskDefinitionItem[];
}

export class TaskItemListStore extends StoreCommonBase.StoreBase {

    constructor() {
        super();
        this._deprecatedTaskItemList = [];
        this._taskItemList = [];
        this._completeDeprecatedTaskItemList = [];
        this._completeTaskItemList = [];
        this._isTaskFetched = false;
    }

    public initialize(): void {
        this._taskItemListActions = ActionsHubManager.GetActionsHub<Actions.TaskItemListActions>(Actions.TaskItemListActions);
        this._taskItemListActions.updateTaskItemList.addListener(this._handleUpdateTaskItemList);
        this._taskItemListActions.filterTaskItemList.addListener(this._handleFilterTaskItemList);
    }

    protected disposeInternal(): void {
        this._taskItemListActions.updateTaskItemList.removeListener(this._handleUpdateTaskItemList);
        this._taskItemListActions.filterTaskItemList.removeListener(this._handleFilterTaskItemList);
    }

    public static getKey(): string {
        return StoreKeys.TaskItemListStore;
    }

    public getDeprecatedTaskItemList(): ITaskDefinitionItem[] {
        return this._deprecatedTaskItemList;
    }

    public getTaskItemList(): ITaskDefinitionItem[] {
        return this._taskItemList;
    }
    
    public isTaskFetched(): boolean {
        return this._isTaskFetched;
    }

    public getTaskListPerCategory(): IDictionaryStringTo<ITaskListResult> {
        let tasksPerCategory: IDictionaryStringTo<ITaskListResult> = {};

        this._categorize(tasksPerCategory);
        
        for (let index in tasksPerCategory) {
            // Sort the tasks alphabetically based on their friendly names
            (tasksPerCategory[index].tasks || []).sort((a: ITaskDefinitionItem, b: ITaskDefinitionItem) => {
                return Utils_String.localeIgnoreCaseComparer(a.friendlyName, b.friendlyName);
            });
            (tasksPerCategory[index].deprecatedTasks || []).sort((a: ITaskDefinitionItem, b: ITaskDefinitionItem) => {
                return Utils_String.localeIgnoreCaseComparer(a.friendlyName, b.friendlyName);
            });
        }
        
        return tasksPerCategory;
    }

    private _categorize(tasksPerCategory: IDictionaryStringTo<ITaskListResult>) {
        tasksPerCategory[Key_PreDefinedTaskListCategories_AllTasks] = {
            tasks: [],
            deprecatedTasks: []
        } as ITaskListResult;

        this._taskItemList.forEach((task: ITaskDefinitionItem) => {
            let category = getNormalizedTaskCategory(task.category);

            if (category) {
                initializeTasksPercategory(tasksPerCategory, category);
                // First push the task to "All" bucket
                tasksPerCategory[Key_PreDefinedTaskListCategories_AllTasks].tasks.push(task);
                tasksPerCategory[category].tasks.push(task);
            }
        });

        this._deprecatedTaskItemList.forEach((task: ITaskDefinitionItem) => {
            let category = getNormalizedTaskCategory(task.category);

            if (category) {
                initializeTasksPercategory(tasksPerCategory, category);
                // First push the task to "All" bucket
                tasksPerCategory[Key_PreDefinedTaskListCategories_AllTasks].deprecatedTasks.push(task);
                tasksPerCategory[category].deprecatedTasks.push(task);
            }
        });
    }

    private _handleUpdateTaskItemList = (taskItemPayload: Actions.ITaskItemPayload) => {
       if (taskItemPayload) {
            // Update is only called when the task Item list is updated from source.
            if (taskItemPayload.taskItems) {
                let taskItemList: ITaskDefinitionItem[] = [];
                let deprecatedTaskItemList: ITaskDefinitionItem[] = [];

                (taskItemPayload.taskItems || []).forEach((taskItem) => {
                    taskItem.deprecated ? deprecatedTaskItemList.push(taskItem) : taskItemList.push(taskItem);
                });

                // replace values
                this._completeTaskItemList = taskItemList;
                this._completeDeprecatedTaskItemList = deprecatedTaskItemList;
                
                // Filter list if search is active
                this._taskItemList = this._lastFilter ?
                FilteringUtils.performFilteringWithScore<ITaskDefinitionItem>(
                    [], this._completeTaskItemList, this._lastFilter, Utils_String.empty, this._getMatchScore
                ) || [] :
                this._completeTaskItemList;

                // Filter list if search is active
                this._deprecatedTaskItemList = this._lastFilter ?
                    FilteringUtils.performFilteringWithScore<ITaskDefinitionItem>(
                        [], this._completeDeprecatedTaskItemList, this._lastFilter, Utils_String.empty, this._getMatchScore
                    ) || [] :
                    this._completeDeprecatedTaskItemList;
            }

            this._isTaskFetched = taskItemPayload.isTaskFetched;

            this.emitChanged();
       }
    }

    private _handleFilterTaskItemList = (filter: string) => {
        this._taskItemList = FilteringUtils.performFilteringWithScore<ITaskDefinitionItem>(
            this._taskItemList, this._completeTaskItemList, filter, this._lastFilter, this._getMatchScore
        ) || [];
        this._deprecatedTaskItemList = FilteringUtils.performFilteringWithScore<ITaskDefinitionItem>(
            this._deprecatedTaskItemList, this._completeDeprecatedTaskItemList, filter, this._lastFilter, this._getMatchScore
        ) || [];

        this.emitChanged();
        this._lastFilter = filter;
    }

    private _getMatchScore(item: ITaskDefinitionItem, filter: string, performExactMatch?: boolean): number {
        let nameToCompare = item.friendlyName || item.name || Utils_String.empty;
        let descriptionToCompare = item.description || Utils_String.empty;
        return FilteringUtils.getStringMatchScore(filter, [nameToCompare, descriptionToCompare], performExactMatch);
    }

    private _lastFilter: string = "";
    private _isTaskFetched: boolean;

    private _completeTaskItemList: ITaskDefinitionItem[];
    private _taskItemList: ITaskDefinitionItem[];

    private _completeDeprecatedTaskItemList: ITaskDefinitionItem[];
    private _deprecatedTaskItemList: ITaskDefinitionItem[];

    private _taskItemListActions: Actions.TaskItemListActions;
}

function getNormalizedTaskCategory(category: string) {
    if (category && Utils_String.localeIgnoreCaseComparer(category, Utils_String.empty) !== 0) {
        category = category.trim();
        category = category.toLowerCase();
        return category;
    }

    return null;
}

function initializeTasksPercategory(tasksPerCategory: IDictionaryStringTo<ITaskListResult>, category: string) {
    if (!tasksPerCategory[category]) {
        tasksPerCategory[category] = {
            tasks: [],
            deprecatedTasks: []
        } as ITaskListResult;
    }
}
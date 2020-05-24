/* tslint:disable:no-unnecessary-override */
import * as Q from "q";

import { ITask } from "DistributedTasksCommon/TFS.Tasks.Types";

import { AppCapability, AppContext } from "DistributedTaskControls/Common/AppContext";
import { Workflow } from "DistributedTaskControls/Common/Common";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { ITaskVersionInfo } from "DistributedTaskControls/Common/Types";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import * as Models from "DistributedTasksCommon/TFS.Tasks.Models";
import { DefinitionType } from "DistributedTasksCommon/TFS.Tasks.Types";
import * as TaskUtils from "DistributedTasksCommon/TFS.Tasks.Utils";

import { TaskDefinition, TaskGroup } from "TFS/DistributedTask/Contracts";

import * as VSSContext from "VSS/Context";
import * as Diag from "VSS/Diag";
import { first } from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

/**
 * @brief Source implementation for Tasks related communications with the server
 */
export class TaskDefinitionSource extends SourceBase {
    
    public static getKey(): string {
        return "TaskDefinitionSource";
    }

    /**
     * @brief Provides the list of tasks available based on visibility filter
     * @param {string[]} visibilityFilter?
     * @returns
     */
    public getTaskDefinitionList(allowPartialPrefetchedList?: boolean, visibilityFilter?: string[], forceRefresh: boolean = false): IPromise<TaskDefinition[]> {
        Diag.logVerbose("[TaskSource.getTasksList]: Method entry log.");

        if (!forceRefresh && this._canReturnPrefetchedTaskDefinitions(allowPartialPrefetchedList || false)){
            return Q.resolve(this._filterTaskDefinitions(this._preFetchedTaskDefinitionList));
        } else {
            this._usingDataProvider = false;
            let deferred = Q.defer<TaskDefinition[]>();
            
            if (forceRefresh || !this._taskDefinitionQueryPromise) {
                if (!Models.TaskDefinitionCache.metaTaskManager) {
                    Models.TaskDefinitionCache.metaTaskManager = new Models.MetaTaskManager();
                }
                let taskDefinitionCache = Models.TaskDefinitionCache.getTaskDefinitionCache(visibilityFilter, forceRefresh);
                let taskDefinitionsPromise = taskDefinitionCache.getTaskDefinitionResults();
                if (taskDefinitionsPromise) {
                    taskDefinitionsPromise.then((result: Models.TaskDefinitionsResult) => {
                        this.initializePrefetchedDefinitions(result.tasks, false);

                        // Search for not found task GUID here
                        // TODO: ankhokha: REMOVE THIS CODE AFTER TELEMETRY PURPOSE IS DONE
                        if (this._notFoundTaskId) {
                            const notFoundTask = first(result.tasks, (task: TaskDefinition): boolean => {
                                return task.id === this._notFoundTaskId;
                            });

                            if (notFoundTask) {
                                let telemetryEvents: IDictionaryStringTo<string> = {};                                
                                telemetryEvents[Properties.TaskName] = notFoundTask.name;
                                telemetryEvents[Properties.TaskDefinitionType] = notFoundTask.definitionType;
                                telemetryEvents[Properties.TaskId] = notFoundTask.id;
                                telemetryEvents[Properties.TaskVersionSpec] = notFoundTask.version.major + "." + notFoundTask.version.minor + "." + notFoundTask.version.patch;
                                Telemetry.instance().publishEvent(Feature.NotInstalledTaskInCall, telemetryEvents);
                            }
                        }

                        deferred.resolve(this._filterTaskDefinitions(this._preFetchedTaskDefinitionList));
                    }, (error) => {
                        Diag.logInfo(error.message || error.toString());
                        deferred.reject(error);
                        this._taskDefinitionQueryPromise = null;
                    });
                } else {
                    throw Error("There is a no task definition query that is in-progress.");
                }

                this._taskDefinitionQueryPromise = deferred.promise;
            }
    
            return this._taskDefinitionQueryPromise;
        }
    }

    // Returns latest version of task by the specified id
    public getTaskDefinitionFromTaskId(taskId: string): TaskDefinition {
        return this._taskDefinitionCollection.getTaskById(taskId);
    }

    public getTaskDefinition(taskId: string, versionSpec: string): TaskDefinition {
        if (this._taskDefinitionCollection) {
            let majorVersions = this._taskDefinitionCollection.getMajorVersions(taskId);
            if (majorVersions) {
                return TaskUtils.getTaskDefinition(majorVersions, versionSpec);
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    public getTaskVersionInfoList(taskId: string): ITaskVersionInfo[] {
        let taskVersionInfoList: ITaskVersionInfo[] = [];
        if (taskId && this._taskDefinitionCollection) {
            let taskDefinitions = this._taskDefinitionCollection.getMajorVersions(taskId);
            if (taskDefinitions) {
                Object.keys(taskDefinitions).forEach(key => {
                    let taskDefinition = taskDefinitions[key];
                    const isPreview = TaskUtils.isPreview(taskDefinition);
                    const isDeprecated = TaskUtils.isDeprecated(taskDefinition);
                    let taskMajorVersionSpec = TaskUtils.getMajorVersionSpec(taskDefinition.version);

                    taskVersionInfoList.push({
                        versionSpec: taskMajorVersionSpec,
                        isPreview: isPreview,
                        isDeprecated: isDeprecated
                    });
                });
            }
        }
        return taskVersionInfoList;
    }

    /**
     * @brief Return an empty task definition using taskName and taskDefinitionType
     */
    public getEmptyTaskDefinition(taskName?: string, taskDefinitionType?: string, taskInstance?: ITask): TaskDefinition {

        // Log telemetry when task is not present
        this._publishTelemetryForTaskNotInstalled(taskName, taskDefinitionType, taskInstance);

        return {
            definitionType: (!!taskDefinitionType) ? taskDefinitionType : Utils_String.empty,
            friendlyName: (!!taskName) ? taskName : Utils_String.empty,
            helpMarkDown: Resources.TaskDeletedMessage,
            dataSourceBindings: [],
            demands: [],
            groups: [],
            inputs: [],
            sourceLocation: {},
            visibility: [],
            version: { major: 0 }
        } as TaskDefinition;
    }

    public getLatestReleasedMajorVersionSpec(taskId: string): string {
        if (this._taskDefinitionCollection) {
            let taskDefinition = this._taskDefinitionCollection.getTaskById(taskId);
            if (taskDefinition) {
                return TaskUtils.getMajorVersionSpec(taskDefinition.version);
            } else {
                return "*";
            }
        } else {
            return "*";
        }
    }

    public initializePrefetchedDefinitions(prefetchedDefinitions: TaskDefinition[], isPartial: boolean, visibilityFilter?: string[]): void {

        if (prefetchedDefinitions) {

            // Set icons for meta tasks.
            prefetchedDefinitions.forEach((taskDefinition: TaskDefinition) => {
                if (taskDefinition.definitionType === DefinitionType.metaTask) {
                    taskDefinition.iconUrl = VSSContext.getPageContext().webAccessConfiguration.paths.resourcesPath + "icon-meta-task.png";
                }
                taskDefinition.friendlyName = taskDefinition.friendlyName
                    || taskDefinition.name
                    || taskDefinition.instanceNameFormat
                    || Utils_String.empty;
            });

            this._taskDefinitionCollection = new Models.TaskDefinitionCollection(prefetchedDefinitions, visibilityFilter);

            // Get the latest versions for the tasks.
            this._preFetchedTaskDefinitionList = this._taskDefinitionCollection.getLatestVersionArray();

            this._isTaskListPartial = isPartial;
        }
    }

    /**
     * @brief Save a new MetaTask definition
     * @param metaTaskDefinition
     * @param workflow
     */
    public saveMetaTaskDefinition(metaTaskDefinition: TaskGroup, workflow: Workflow): IPromise<TaskGroup> {
        // As per current code, visibilityFilter in RM is an empty array
        // Refer files: TFS.ReleaseManagement.KnockoutExtensions.ts, TFS.ReleaseManagement.DefinitionDesigner.ts
        let visibilityFilter: string[] = (workflow === Workflow.Build) ? ["Build"] : [];

        let taskDefinitionCache = Models.TaskDefinitionCache.getTaskDefinitionCache(visibilityFilter);

        if (!Models.TaskDefinitionCache.metaTaskManager) {
            Models.TaskDefinitionCache.metaTaskManager = new Models.MetaTaskManager();
        }

        return Models.TaskDefinitionCache.metaTaskManager.saveDefinition(metaTaskDefinition)
            .then((savedDefinition: TaskGroup) => {
                // Refresh the cache async after save is successfull
                if (AppContext.instance().isCapabilitySupported(AppCapability.ShowTaskGroupDemands)) {
                    taskDefinitionCache.cacheMetaTaskDemandsFromServer(metaTaskDefinition.id, TaskUtils.getMajorVersionSpec(metaTaskDefinition.version));
                }
                return taskDefinitionCache.refresh(savedDefinition.visibility).then((result: Models.TaskDefinitionsResult) => {
                    this.initializePrefetchedDefinitions(result.tasks, false);
                    return Q.resolve(savedDefinition);
                });
            }, (error) => {
                Diag.logInfo(error.message || error.toString());
                return Q.reject(error);
            });
    }

      /**
     * @brief Gets demands for a TaskGroup
     * @param taskId
     */
    public getTaskDefinitionDemandsFromTaskId(taskId: string): any[] {
        return this._taskDefinitionCollection.getTaskDefinitionDemandsById(taskId);
    }

    public static instance(): TaskDefinitionSource {
        return SourceManager.getSource(TaskDefinitionSource);
    }

    public disposeTaskDefinitionCache(): void {
        Models.TaskDefinitionCache.disposeInstance();
    }

    private _canReturnPrefetchedTaskDefinitions(allowPartialPrefetchedList: boolean): boolean {

        // If there is no prefetched task definitons, then do not use prefetched list
        if (!this._preFetchedTaskDefinitionList || this._preFetchedTaskDefinitionList.length === 0){
            return  false;
        }

        // If complete list is requested and what is stored is partial list, then do not use prefetched list.
        if (!allowPartialPrefetchedList && this._isTaskListPartial){
            return  false;
        }

        return  true;
    }

    private _filterTaskDefinitions(taskDefinitions: TaskDefinition[]): TaskDefinition[] {

        let filteredTaskDefinitions = (taskDefinitions || []).filter((taskDefinition: TaskDefinition) => {
            return !taskDefinition.disabled ;
        });

        return filteredTaskDefinitions;
    }

    private _publishTelemetryForTaskNotInstalled(taskName: string, taskDefinitionType: string, taskInstance: ITask): void {
        // We will be logging following things:
        // 1. If task was fetched from data provider
        // 2. task name
        // 3. GUID for the task (to ensure GUID of task is correct)
        let telemetryEvents: IDictionaryStringTo<string> = {};
        telemetryEvents[Properties.TaskDefinitionType] = taskDefinitionType;
        telemetryEvents[Properties.TaskRefName] = taskInstance && taskInstance.refName;
        if (taskInstance && taskInstance.task) {
            telemetryEvents[Properties.TaskVersionSpec] = taskInstance.task.versionSpec;
            telemetryEvents[Properties.TaskId] = taskInstance.task.id;
            this._notFoundTaskId = taskInstance.task.id;            
        }

        // logging all GUIDs in pre fetched
        telemetryEvents[Properties.prefetchedTaskGuids] = this._prefetchedTaskGuids();
        Telemetry.instance().publishEvent(Feature.TaskNotInstalled, telemetryEvents);
    }

    private _prefetchedTaskGuids(): string {
        let taskGuids: string = "";
        if (this._preFetchedTaskDefinitionList) {
            this._preFetchedTaskDefinitionList.forEach((prefetchedTask: TaskDefinition) => {
                if (prefetchedTask) {
                    taskGuids += ", " + prefetchedTask.id;
                }
                else {
                    taskGuids += ", NULL TASK";
                }
            });
        }

        return taskGuids;
    }

    private _taskDefinitionCollection: Models.TaskDefinitionCollection;
    private _preFetchedTaskDefinitionList: TaskDefinition[];
    private _taskDefinitionQueryPromise: IPromise<TaskDefinition[]>;
    private _isTaskListPartial: boolean;
    private _usingDataProvider: boolean = true;
    private _notFoundTaskId: string;
}
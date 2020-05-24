import Q = require("q");
import ko = require("knockout");

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Number = require("VSS/Utils/Number");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import WebApi_RestClient = require("VSS/WebApi/RestClient");
import Service = require("VSS/Service");
import PlatformContracts = require("VSS/Common/Contracts/Platform");
import VSSContext = require("VSS/Context");

import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpoint_Contracts = require("TFS/ServiceEndpoint/Contracts");
import BuildContracts = require("TFS/Build/Contracts");
import WebApi_Constants = require("VSS/WebApi/Constants");

import ServiceEndpoint_Common = require("DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common");
import TaskTypes = require("DistributedTasksCommon/TFS.Tasks.Types");
import TaskResources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import KoTree = require("DistributedTasksCommon/TFS.Knockout.Tree");
import TaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");
import KnockoutPivot = require("DistributedTasksCommon/TFS.Knockout.HubPageExplorerPivot");
import BuildClient = require("DistributedTasksCommon/DefinitionResourceReferenceBuildHttpClient");
import * as Resources from "DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary";

import DTAgent_Client = require("TFS/DistributedTask/TaskAgentRestClient");
import Endpoint_Client = require("TFS/ServiceEndpoint/ServiceEndpointRestClient");

export module CustomerIntelligenceInfo {
    export var Area = "DistributedTask";
    export var FeatureTask = "Task";
    export var FeatureInputEditorExtension = "TaskInputEditorExtension";
}

export interface IDirty {
    dirty: KnockoutComputed<boolean>;
}

export class ChangeTrackerModel implements IDirty, IDisposable {

    private _disposalManager: Utils_Core.DisposalManager;
    /**
     * Indicates whether the model is dirty.
     */
    public dirty: KnockoutComputed<boolean>;

    /**
     * Indicates whether the model is invalid.
     */
    public invalid: KnockoutComputed<boolean>;

    public warning: KnockoutComputed<boolean>;

    constructor() {
        this._disposalManager = new Utils_Core.DisposalManager();

        this._initializeObservables();

        // Subscribe to all observable changes in this view model
        this.dirty = this._disposalManager.addDisposable(ko.computed((): boolean => {
            return this._isDirty();
        }));

        this.invalid = this._disposalManager.addDisposable(ko.computed((): boolean => {
            return this._isInvalid();
        }));

        this.warning = this._disposalManager.addDisposable(ko.computed((): boolean => {
            return this._isWarning();
        }))
    }

    public dispose(): void {
        this._disposalManager.dispose();
    }

    public revert(): void {
    }

    public setClean(): void {
    }

    _addDisposable(disposable: IDisposable): IDisposable {
        return this._disposalManager.addDisposable(disposable);
    }

    _initializeObservables(): void {
        // Tracked observables initialized here
    }

    _isDirty(): boolean {
        // Check whether observables changed from original value
        return false;
    }

    _isInvalid(): boolean {
        // Check whether the value is invalid, eg: Empty values are invalid for "required" fields
        return false;
    }

    _isWarning(): boolean {
        return false;
    }
}


/**
 * A key-value pair
 */
export class KeyValuePair {

    public key: KnockoutObservable<string> = ko.observable("");
    public value: KnockoutObservable<string> = ko.observable("");

    constructor(key: string, value: string) {
        this.key(key);
        this.value(value);
    }
}

/**
 * A Simple key-value pair with out ko, to be used when ko is an over-kill/not required
 */
export class SimpleKeyValuePair {

    public key: string = "";
    public value: string = "";

    constructor(key: string = "", value: string = "") {
        this.key = key;
        this.value = value;
    }
}

/**
 * Context common to all models
 */
export class ModelContext {
    /**
     * The current date
     * Set the value of this observable to refresh duration calculations.
     */
    static currentDate: KnockoutObservable<Date> = ko.observable(new Date());
}

/**
 * Task definition metadata
 */
export class TaskDefinitionMetadata {
    private static _taskMetadata: { [id: string]: TaskDefinitionMetadata; };
    private static _defaultTaskMetadata: TaskDefinitionMetadata;

    private static _prepareEnvironmentTaskId: string = "114fca70-4b6d-4699-993c-8c38bfda8305";

    /**
     * Indicates whether to show the version dropdown
     */
    public showVersionDropdown: boolean;

    /**
     * Gets metadata for the specified task id
     * @param taskId The task id
     */
    public static getMetadata(taskId: string): TaskDefinitionMetadata {
        if (!TaskDefinitionMetadata._taskMetadata) {
            TaskDefinitionMetadata._initialize();
        }

        var metadata: TaskDefinitionMetadata = TaskDefinitionMetadata._taskMetadata[taskId.toLowerCase()];
        if (!metadata) {
            metadata = TaskDefinitionMetadata._defaultTaskMetadata;
        }

        return metadata;
    }

    private static _initialize() {
        TaskDefinitionMetadata._taskMetadata = {};

        TaskDefinitionMetadata._taskMetadata[TaskDefinitionMetadata._prepareEnvironmentTaskId] = {
            showVersionDropdown: false
        };

        TaskDefinitionMetadata._defaultTaskMetadata = {
            // always hide version dropdown for now
            showVersionDropdown: false
        };
    }
}

/**
 * Task definition view model
 */
export class TaskDefinitionViewModel {
    private _taskDefinition: DistributedTaskContracts.TaskDefinition;
    private _addFunction: () => void;

    public id: KnockoutObservable<string> = ko.observable("");
    public friendlyName: KnockoutObservable<string> = ko.observable("");
    public description: KnockoutObservable<string> = ko.observable("");
    public author: KnockoutObservable<string> = ko.observable("");
    public sourceLocation: KnockoutObservable<string> = ko.observable("");
    public iconUrl: KnockoutObservable<string> = ko.observable("");
    public disabled: KnockoutObservable<Boolean> = ko.observable(false);

    public hasIcon: KnockoutComputed<boolean>;

    constructor(taskDefinition: DistributedTaskContracts.TaskDefinition, addFunction: () => void) {
        this._taskDefinition = taskDefinition;
        this._addFunction = addFunction;

        this.id(taskDefinition.id);
        this.friendlyName(this._getFriendlyName(taskDefinition));
        this.description(taskDefinition.description);
        this.author(taskDefinition.author);
        this.sourceLocation(taskDefinition.sourceLocation);
        this.iconUrl(taskDefinition.iconUrl);
        this.disabled(taskDefinition.disabled);

        this.hasIcon = ko.computed({
            read: () => {
                return !!this.iconUrl();
            }
        });
    }

    public addCommand() {
        if ($.isFunction(this._addFunction)) {
            this._addFunction();
        }
    }

    public onAddButtonKeyDown(viewModel: TaskDefinitionViewModel, event: JQueryEventObject): boolean {
        var currentElement: JQuery = $(event.target);

        switch (event.keyCode) {
            case Utils_UI.KeyCode.ENTER:
                return TaskUtils.AccessibilityHelper.triggerClickOnEnterPress(event);

            case Utils_UI.KeyCode.UP:
            case Utils_UI.KeyCode.DOWN:
                event.preventDefault();
                var currentTaskDefinition = currentElement.parent().parent();
                var taskDefinitionList = currentTaskDefinition.parent().children("*[tabindex != '-1']:visible");
                var currentIndex = taskDefinitionList.index(currentTaskDefinition);

                var nextFocusableIndex: number = 0;
                if (event.keyCode == Utils_UI.KeyCode.UP) {
                    nextFocusableIndex = (currentIndex - 1 >= 0) ? currentIndex - 1 : taskDefinitionList.length - 1;
                }
                else {
                    nextFocusableIndex = (currentIndex + 1 < taskDefinitionList.length) ? currentIndex + 1 : 0;
                }

                var nextTaskDefinition = taskDefinitionList.eq(nextFocusableIndex);
                nextTaskDefinition.children("div.task-definition-add").children("button").focus();
                return false;

            default:
                return true;
        }
    }

    private _getFriendlyName(taskDefinition: DistributedTaskContracts.TaskDefinition): string {
        if (taskDefinition.definitionType === TaskTypes.DefinitionType.metaTask && taskDefinition.version.isTest) {
            return Utils_String.format("{0} ({1})", taskDefinition.name, TaskResources.DraftText);
        }

        return taskDefinition.friendlyName;
    }
}

/**
 * Regular expression for formatting task instance names
 */
export var InstanceNameFormatRegex: RegExp = /\$\((.+?)\)/g;

/**
 * Version specifier representing "latest"
 */
export var LatestVersionSpec: string = "*";


/**
 * Represents a view model for a task definition input
 */
export interface IPropertyValueModel extends IDirty {
    viewModel: any;

    init(element: JQuery);
    update(element: JQuery);
    extractValue(): string;
    getBindingHandler(): KnockoutBindingHandler;
}
/**
 * Maps a version to a task definition
 */
export interface TaskDefinitionVersionSpecItem {
    /**
     * The version
     */
    versionSpec: string;

    /**
     * The task definition
     */
    taskDefinition: DistributedTaskContracts.TaskDefinition;
}

/**
 * Caches the available task definitions
 */
export class TaskDefinitionCache {
    private _currentTaskDefinitions: DistributedTaskContracts.TaskDefinition[] = null;
    private _currentTaskDefinitionDictionary: IDictionaryStringTo<DistributedTaskContracts.TaskDefinition> = {};
    private _currentTaskDefinitionsDemands: IDictionaryStringTo<any[]> = {};
    private _taskDefinitionResultsPromise: IPromise<TaskDefinitionsResult>;

    public static metaTaskManager: TaskTypes.IMetaTaskManager = null;
    private static singleInstance: TaskDefinitionCache = null;
    

    /**
     * Gets the one-and-only instance of this class
     */
    public static getTaskDefinitionCache(visibilityFilter?: string[], forceRefresh: boolean = false): TaskDefinitionCache {
        if (forceRefresh || !TaskDefinitionCache.singleInstance) {
            if (!TaskDefinitionCache.singleInstance) {
                TaskDefinitionCache.singleInstance = new TaskDefinitionCache();             
            }
            TaskDefinitionCache.singleInstance._taskDefinitionResultsPromise = TaskDefinitionCache.singleInstance.refresh(visibilityFilter);
        }

        return TaskDefinitionCache.singleInstance;
    }

    public static getInstance(): TaskDefinitionCache {
        if (!TaskDefinitionCache.singleInstance) {
            TaskDefinitionCache.singleInstance = new TaskDefinitionCache();             
        }
        return TaskDefinitionCache.singleInstance;
    }

    public static disposeInstance(): void {
        TaskDefinitionCache.singleInstance = null;
    }

    /**
     * Get the list of task definitions
     */
    public getCurrentTaskDefinitions(): DistributedTaskContracts.TaskDefinition[] {
        return TaskDefinitionCache.singleInstance._currentTaskDefinitions;
    }

    public getTaskDefinition(id: string): DistributedTaskContracts.TaskDefinition {
        return TaskDefinitionCache.singleInstance._currentTaskDefinitionDictionary[id];
    }

    public getTaskDefinitionDemands(id: string): any[] {
        return TaskDefinitionCache.singleInstance._currentTaskDefinitionsDemands[id];
    }

    // If a refresh has been already triggered, use just this function to use that result. 
    public getTaskDefinitionResults(): IPromise<TaskDefinitionsResult> {
        return this._taskDefinitionResultsPromise;
    }

    /**
     * Refresh the list of task definitions from the server
     * @param visibilityFilter
     */
    public refresh(visibilityFilter?: string[]): IPromise<TaskDefinitionsResult> {
        var taskAgentCollectionClient: TaskAgentClientService;
        var taskDefinitionsPromise: IPromise<TaskDefinitionsResult>;
        var webContext: PlatformContracts.WebContext = VSSContext.getDefaultWebContext();
        var vssConnection: Service.VssConnection = new Service.VssConnection(webContext);

        taskAgentCollectionClient = vssConnection.getHttpClient(TaskAgentClientService);
        taskDefinitionsPromise = taskAgentCollectionClient.getTaskDefinitions2(null, visibilityFilter);

        var taskResult = Q.defer<TaskDefinitionsResult>();

        Q.all([
            taskDefinitionsPromise,
            this._getMetaTaskDefinitions()
        ]).spread((result: TaskDefinitionsResult, metaTaskDefinitions: DistributedTaskContracts.TaskGroup[]) => {
            // No-repro for service returning null definitions, 
            // but kusto reveals hit count (<10) of metaTaskDefinitions being null.
            result.tasks = result.tasks || [];
            metaTaskDefinitions = metaTaskDefinitions || [];

            metaTaskDefinitions.forEach((metaTask: DistributedTaskContracts.TaskGroup) => {
                metaTask.iconUrl = getLatestMetaTaskIconUrl();
            });

            result.tasks = result.tasks.concat(metaTaskDefinitions);
            this._setTasks(result.tasks);
            taskResult.resolve(result);
        }, (error) => {
            taskResult.reject(error);
        });

        return taskResult.promise;
    }

    public cacheMetaTaskDemandsFromServer(id: string, version: string): any[] {
        if (!TaskDefinitionCache.metaTaskManager) {
            return null;
        }

        var demands = [];
        var taskDefinitions = this._currentTaskDefinitions;
        var taskDefinitionCollection = new TaskDefinitionCollection(taskDefinitions);
        var expandedTaskGroups = TaskDefinitionCache.metaTaskManager.getTaskGroup(id, version, true);

        expandedTaskGroups.then((taskGroups: DistributedTaskContracts.TaskGroup) => {
            if (taskGroups.tasks) {
                taskGroups.tasks.forEach((taskGroupStep: DistributedTaskContracts.TaskGroupStep) => {
                    if (taskGroupStep.enabled) {
                        var taskDefinitionVersions = taskDefinitions.filter(t => t.id == taskGroupStep.task.id);
                        var taskDefinition = TaskUtils.getTaskDefinition(taskDefinitionCollection.getMajorVersions(taskGroupStep.task.id), taskGroupStep.task.versionSpec);
                        if (taskDefinition && taskDefinition.demands) {
                            taskDefinition.demands.forEach((demand: any) => {
                                demands.push(demand);
                            });
                        }
                    }
                });
            }
            this._currentTaskDefinitionsDemands[id] = demands;
        });

        return demands;
    }

    private _getMetaTaskDefinitions(): IPromise<DistributedTaskContracts.TaskGroup[]> {
        if (!TaskDefinitionCache.metaTaskManager) {
            return Q.resolve(null);
        }

        return TaskDefinitionCache.metaTaskManager.getDefinitions();
    }

    private _setTasks(tasks: DistributedTaskContracts.TaskDefinition[]) {
        TaskDefinitionCache.singleInstance._currentTaskDefinitions = tasks;
        TaskDefinitionCache.singleInstance._currentTaskDefinitionDictionary = {};
        TaskDefinitionCache.singleInstance._currentTaskDefinitions.forEach((taskDefinition) => {
            TaskDefinitionCache.singleInstance._currentTaskDefinitionDictionary[taskDefinition.id] = taskDefinition;
        });
    }
}

/**
 * Maps a task definition id to a list of versions
 */
export interface TaskDefinitionVersionMap {
    [id: string]: TaskDefinitionVersionSpecItem[];
}

export class TaskDefinitionCollection {
    // each version of each task, grouped by task id
    private _taskVersionMap: TaskDefinitionVersionMap = {};

    // major version of each task
    private _latestMajorVersions: { [id: string]: { [version: number]: DistributedTaskContracts.TaskDefinition }; } = {};

    // taskDropdown will be populated with the latest version of each task, grouped by category
    private _latestVersions: { [id: string]: DistributedTaskContracts.TaskDefinition };

    // latest version map to an array
    private _latestVersionArray: DistributedTaskContracts.TaskDefinition[];

    // helper class to fetch tasks from server
    private _taskDefinitionCache: TaskDefinitionCache;

    // To Store task definitions
    private _taskDefinitions: DistributedTaskContracts.TaskDefinition[];

    private _visibilityFilter: string[] = [];

    constructor(taskDefinitions: DistributedTaskContracts.TaskDefinition[], visibilityFilter?: string[]) {
        TaskDefinitionCache.metaTaskManager = new MetaTaskManager();

        // sort so latest version is last
        this._taskDefinitions = taskDefinitions.sort((a, b) => this._compareVersions(a.version, b.version));
        this._taskDefinitionCache = TaskDefinitionCache.getTaskDefinitionCache(visibilityFilter);

        $.each(this._taskDefinitions, (index: number, taskDefinition: DistributedTaskContracts.TaskDefinition) => {
            let id = taskDefinition.id.toLowerCase();

            if (taskDefinition.definitionType === TaskTypes.DefinitionType.metaTask) {
                taskDefinition.iconUrl = getLatestMetaTaskIconUrl();
            }

            // map the task definition to the appropriate task
            let taskVersionArray: TaskDefinitionVersionSpecItem[] = this._taskVersionMap[id];
            if (taskVersionArray === undefined) {
                taskVersionArray = [];
                this._taskVersionMap[id] = taskVersionArray;

                // the major version map will also be undefined at this point
                this._latestMajorVersions[id] = {};
            }

            // versionspec
            var versionSpec = getVersionSpec(taskDefinition.version);

            // splice instead of push so latest is on top
            taskVersionArray.splice(0, 0, {
                versionSpec: versionSpec,
                taskDefinition: taskDefinition
            });

            // latest of the major version
            this._latestMajorVersions[id][taskDefinition.version.major] = taskDefinition;
        });

        this._latestVersions = TaskUtils.getLatestReleasedVersions(this._latestMajorVersions);
    }

    public getTaskDefinitions(): DistributedTaskContracts.TaskDefinition[] {
        // Fetch the current task list from server
        if (this._taskDefinitionCache.getCurrentTaskDefinitions() != null) {
            this._taskDefinitions = this._taskDefinitionCache.getCurrentTaskDefinitions();
        }
        return this._taskDefinitions;
    }

    /**
     * Gets each version of each task, grouped by task id
     */
    public getTaskVersionMap(): TaskDefinitionVersionMap {
        this.getTaskDefinitions();
        $.each(this._taskDefinitions, (index: number, taskDefinition: DistributedTaskContracts.TaskDefinition) => {
            var id = taskDefinition.id.toLowerCase();
            // map the task definition to the appropriate task
            var taskVersionArray: TaskDefinitionVersionSpecItem[] = this._taskVersionMap[id];
            if (taskVersionArray === undefined) {
                taskVersionArray = [];
                this._taskVersionMap[id] = taskVersionArray;
            }
        });
        return this._taskVersionMap;
    }

    /**
     * Gets the latest version of a task by the specified id.
     */
    public getTaskById(id: string): DistributedTaskContracts.TaskDefinition {
        this.getTaskDefinitions();
        $.each(this._taskDefinitions, (index: number, taskDefinition: DistributedTaskContracts.TaskDefinition) => {
            var id = taskDefinition.id.toLowerCase();
            this._latestVersions[id] = taskDefinition;
        });

        return this._latestVersions[(id || "").toLowerCase()];
    }

    /**
     * Gets the latest major versions of a task definition
     * @param taskId
     */
    public getMajorVersions(taskId: string): IDictionaryNumberTo<DistributedTaskContracts.TaskDefinition> {
        var taskVersions: IDictionaryNumberTo<DistributedTaskContracts.TaskDefinition> = this._latestMajorVersions[taskId];

        // The following is a case which we will encounter with meta tasks
        // If the task version couldn't be fetched, we should check the cache, and update the latestMajorVersions array
        if (!taskVersions) {
            var taskDefinition: DistributedTaskContracts.TaskDefinition = this.getTaskById(taskId);
            // If the task definition exists in the cache, we should update
            if (taskDefinition) {
                this._latestMajorVersions[taskId] = { [taskDefinition.version.major]: taskDefinition };
                taskVersions = this._latestMajorVersions[taskId];
            }
            // Else we should return empty
            else {
                taskVersions = {};
            }
        }

        return taskVersions;
    }

    /**
     * Convert the latest version map to an array.
     */
    public getLatestVersionArray(): DistributedTaskContracts.TaskDefinition[] {
        if (!this._latestVersionArray) {
            this.getTaskVersionMap();

            let latestMajorVersions = this._latestMajorVersions;
            this._latestVersionArray = $.map(this._latestVersions, (taskDefinition: DistributedTaskContracts.TaskDefinition, index: string) => {
                // add wildcard versions while we're in here. latest version is first
                this._taskVersionMap[taskDefinition.id].splice(0, 0, {
                    versionSpec: LatestVersionSpec,
                    taskDefinition: taskDefinition
                });

                // wildcards for major definitions
                $.each(latestMajorVersions[taskDefinition.id], (majorVersionNumber: number, majorVersionDefinition: DistributedTaskContracts.TaskDefinition) => {
                    // find the first instance of the major version number and insert the x.* before it
                    let majorVersionPrefix = majorVersionNumber + ".";
                    let taskVersions: TaskDefinitionVersionSpecItem[] = this._taskVersionMap[taskDefinition.id];

                    let targetIndex: number = taskVersions.length;
                    $.each(taskVersions, (index: number, item: TaskDefinitionVersionSpecItem) => {
                        if (Utils_String.startsWith(item.versionSpec, majorVersionPrefix)) {
                            targetIndex = index;
                            return false;
                        }
                    });

                    taskVersions.splice(targetIndex, 0, {
                        versionSpec: majorVersionNumber + "." + LatestVersionSpec,
                        taskDefinition: majorVersionDefinition
                    });
                });

                return taskDefinition;
            });
        }

        return this._latestVersionArray;
    }

    /**
     * Gets the demands of a task definition
     * @param taskId
     */
    public getTaskDefinitionDemandsById(id: string): any[] {

        return this._taskDefinitionCache.getTaskDefinitionDemands(id) || [];
    }

    private _compareVersions(a: DistributedTaskContracts.TaskVersion, b: DistributedTaskContracts.TaskVersion): number {
        if (!a && !b) {
            return 0;
        }
        else if (!a) {
            // no version goes to the end of the list
            return 1;
        }
        else if (!b) {
            return -1;
        }

        let result: number = Utils_Number.defaultComparer(a.major, b.major);
        if (result === 0) {
            result = Utils_Number.defaultComparer(a.minor, b.minor);
            if (result === 0) {
                result = Utils_Number.defaultComparer(a.patch, b.patch);
                if (result === 0) {
                    if (a.isTest && !b.isTest) {
                        result = -1;
                    }
                    else if (b.isTest && !a.isTest) {
                        result = 1;
                    }
                }
            }
        }
        return result;
    }
}


export class BuildLegacyHttpClient extends WebApi_RestClient.VssHttpClient {

    /**
    * Gets connected services subscriptions for the azureConnection task input type  - This is to keep support for compat scenario : old tasks with new server OM for "Build" hub
    */
    public beginGetSubscriptionNames(project: string): IPromise<TaskTypes.ConnectedServiceMetadata[]> {
        return this._beginRequest<TaskTypes.ConnectedServiceMetadata[]>(
            {
                area: BuildLegacyHttpClient.AreaName,
                locationId: BuildLegacyHttpClient.AzureDeploymentEnvironmentDetailsResources,
                responseIsCollection: true,
                routeValues: {
                    project: project
                }
            });
    }

    private static AreaName: string = "Build";
    private static AzureDeploymentEnvironmentDetailsResources: string = "0524c91b-a145-413c-89eb-b3342b6826a4";
}

export class ConnectedServicesClientService extends Service.VssService {

    public initializeConnection(tfsConnection: Service.VssConnection) {
        super.initializeConnection(tfsConnection);
        this._buildLegacyHttpClient = tfsConnection.getHttpClient<BuildLegacyHttpClient>(BuildLegacyHttpClient, WebApi_Constants.ServiceInstanceTypes.TFS);
        this._httpClient = tfsConnection.getHttpClient<DTAgent_Client.TaskAgentHttpClient>(DTAgent_Client.TaskAgentHttpClient, WebApi_Constants.ServiceInstanceTypes.TFS);
        this._serviceEndpointClient = tfsConnection.getHttpClient<Endpoint_Client.ServiceEndpointHttpClient>(Endpoint_Client.ServiceEndpointHttpClient, WebApi_Constants.ServiceInstanceTypes.TFS);
        this._defResourceRefBuildClient = tfsConnection.getHttpClient<BuildClient.DefinitionResourceReferenceBuildHttpClient>(BuildClient.DefinitionResourceReferenceBuildHttpClient, WebApi_Constants.ServiceInstanceTypes.TFS);
    }

    /**
    * Gets all connected services, optionally filtered to a connection kind
    * @kind kind The kind of the connected service
    */
    public beginGetServiceEndpoints(type?: string, authSchemes?: string[], endpointIds?: string[]): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint[]> {
        return this._serviceEndpointClient.getServiceEndpoints(this._getProjectId(), type, authSchemes, endpointIds);
    }

    /** 
    * Gets connected services subscriptions for the azureConnection task input type  - This is to keep support for compat scenario : old tasks with new server OM for "Build" hub
    */
    public beginGetSubscriptionNames(): IPromise<TaskTypes.ConnectedServiceMetadata[]> {
        return this._buildLegacyHttpClient.beginGetSubscriptionNames(this._getProjectName());
    }

    public beginGetAzureSubscriptions(): IPromise<DistributedTaskContracts.AzureSubscriptionQueryResult> {
        return this._httpClient.getAzureSubscriptions();
    }

    public beginGetAzureManagementGroups(): IPromise<DistributedTaskContracts.AzureManagementGroupQueryResult> {
        return this._httpClient.getAzureManagementGroups();
    }

    public beginGetServiceEndpointTypes(type?: string, scheme?: string): IPromise<ServiceEndpoint_Contracts.ServiceEndpointType[]> {
        return this._serviceEndpointClient.getServiceEndpointTypes(type, scheme);
    }

    public beginCreateServiceEndpoint(endpoint: ServiceEndpoint_Contracts.ServiceEndpoint, autoAuthorizeForAllPipelines: boolean = false): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {

        if (!(FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.ResourceAuthorizationforVGEndpoint))) {
            return this._serviceEndpointClient.createServiceEndpoint(endpoint, this._getProjectId());
        }
        var endPointPromise = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();
        this._serviceEndpointClient.createServiceEndpoint(endpoint, this._getProjectId()).then((endpoint: ServiceEndpoint_Contracts.ServiceEndpoint) => {

            //  Check if auto-authorization is enabled. If not, simple create endpoint and return.
            if (!autoAuthorizeForAllPipelines) {
                endPointPromise.resolve(endpoint);
            }
            else {
                //  If auto-authorization is enabled, then authorize the endpoint for all pipelines in the project.

                //  Creating an endpoint reference to authorize for all definitions at time of creating
                let endpointReference: BuildContracts.DefinitionResourceReference = {
                    authorized: true,
                    id: endpoint.id,
                    name: endpoint.name,
                    type: "endpoint"
                };

                //  Authorizing the endpoint for all pipelines
                this._defResourceRefBuildClient.authorizeProjectResources([endpointReference], this._getProjectId()).then(() => {
                    endPointPromise.resolve(endpoint);
                }, (error) => {
                    endPointPromise.reject(new Error(Utils_String.localeFormat(TaskResources.ErrorSavingEndpointPolicyDuringCreation, "\r\n", error.message || error)));
                });
            }
        }, (error) => {
            endPointPromise.reject(new Error(error.message || error));
        });
        return endPointPromise.promise;
    }

    public beginDeleteServiceEndpoint(endpointId: string): IPromise<void> {
        if (!(FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.ResourceAuthorizationforVGEndpoint))) {
            return this._serviceEndpointClient.deleteServiceEndpoint(this._getProjectId(), endpointId);
        }
        let endPointPromise = Q.defer<void>();
        //  Creating an endpoint reference to un-authorize for all definitions at time of disconnecting the endpoint
        let endpointReference: BuildContracts.DefinitionResourceReference = {
            authorized: false,
            id: endpointId,
            name: "",
            type: "endpoint"
        };
        this._defResourceRefBuildClient.authorizeProjectResources([endpointReference], this._getProjectId()).then(() => {
            this._serviceEndpointClient.deleteServiceEndpoint(this._getProjectId(), endpointId).then(() => {
                endPointPromise.resolve();
            }, (err) => {
                endPointPromise.reject(new Error(Utils_String.localeFormat(Resources.ErrorDeletingEndpoint, "\r\n", err.message || err)));
            });
        }, (err) => {
            endPointPromise.reject(new Error(Utils_String.localeFormat(Resources.ErrorDeletingPolicy, "\r\n", err.message || err)));
        });
        return endPointPromise.promise;
    }

    public beginGetVstsAadTenantId(): IPromise<string> {
        return this._httpClient.getVstsAadTenantId();
    }

    public beginCreateOAuthRequest(tenantId: string, redirectUri: string, promptOption: DistributedTaskContracts.AadLoginPromptOption = DistributedTaskContracts.AadLoginPromptOption.SelectAccount, completeCallbackPayload: string, completeCallbackByAuthCode: boolean): IPromise<string> {
        return this._httpClient.createAadOAuthRequest(tenantId, redirectUri, promptOption, completeCallbackPayload, completeCallbackByAuthCode);
    }

    public beginUpdateServiceEndpoint(endpoint: ServiceEndpoint_Contracts.ServiceEndpoint, operation?: string): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        return this._serviceEndpointClient.updateServiceEndpoint(endpoint, this._getProjectId(), endpoint.id, operation);
    }

    public beginGetEndpoint(endpointId: string): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        return this._serviceEndpointClient.getServiceEndpointDetails(this._getProjectId(), endpointId);
    }

    public beginQueryEndpoint(taskEndpoint: DistributedTaskContracts.TaskDefinitionEndpoint): IPromise<string[]> {
        taskEndpoint.scope = this._getProjectId();
        return this._httpClient.queryEndpoint(taskEndpoint);
    }

    public beginQueryServiceEndpoint(dataSourceBinding: ServiceEndpoint_Contracts.DataSourceBinding): IPromise<string[]> {
        return this._serviceEndpointClient.queryServiceEndpoint(dataSourceBinding, this._getProjectId());
    }

    public beginExecuteServiceEndpointRequest(serviceEndpointRequest: ServiceEndpoint_Contracts.ServiceEndpointRequest, endpointId: string): IPromise<ServiceEndpoint_Contracts.ServiceEndpointRequestResult> {
        return this._serviceEndpointClient.executeServiceEndpointRequest(serviceEndpointRequest, this._getProjectId(), endpointId);
    }

    public authorizeEndpoint(endpoint: ServiceEndpoint_Contracts.ServiceEndpoint) {
        let endPointPromise = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();

        //  Creating an endpoint reference to authorize for all definitions at time of creating
        let endpointReference: BuildContracts.DefinitionResourceReference = {
            authorized: true,
            id: endpoint.id,
            name: endpoint.name,
            type: "endpoint"
        };

        //  Authorizing the endpoint for all pipelines
        this._defResourceRefBuildClient.authorizeProjectResources([endpointReference], this._getProjectId()).then(() => {
            endPointPromise.resolve(endpoint);
        }, (error) => {
            endPointPromise.reject(new Error(Utils_String.localeFormat(TaskResources.ErrorSavingEndpointPolicyDuringCreation, "\r\n", error.message || error)));
        });

        return endPointPromise.promise;
    }

    private _getProjectName(): string {
        return this.getWebContext().project.name;
    }

    private _getProjectId(): string {
        return this.getWebContext().project.id;
    }

    private _defResourceRefBuildClient: BuildClient.DefinitionResourceReferenceBuildHttpClient;
    private _buildLegacyHttpClient: BuildLegacyHttpClient;
    private _httpClient: DTAgent_Client.TaskAgentHttpClient;
    private _serviceEndpointClient: Endpoint_Client.ServiceEndpointHttpClient;
}

export class TaskAgentClientService extends DTAgent_Client.TaskAgentHttpClient {
    /**
 * [Preview API]
 *
 * @param {string} taskId
 * @param {string[]} visibility
 * @param {boolean} scopeLocal
 * @return IPromise<DistributedTaskContracts.TaskDefinitionsResult>
 */
    public getTaskDefinitions2(
        taskId?: string,
        visibility?: string[],
        scopeLocal?: boolean
    ): IPromise<TaskDefinitionsResult> {

        var queryValues: any = {
            visibility: visibility,
            scopeLocal: scopeLocal,
        };

        return this._beginRequestWithAjaxResult<TaskDefinitionsResult>({
            httpMethod: "GET",
            area: "distributedtask",
            locationId: "60aac929-f0cd-4bc8-9ce4-6b30e8f1b1bd",
            resource: "tasks",
            routeTemplate: "_apis/{area}/{resource}/{taskId}/{versionString}",
            responseIsCollection: true,
            routeValues: {
                taskId: taskId,
            },
            queryParams: queryValues,
            apiVersion: this.tasksApiVersion
        }).spread(
            (tasks: DistributedTaskContracts.TaskDefinition[], textStatus: string, jqXHR: JQueryXHR, pendingTaskHeader: string) => {
                return {
                    tasks: tasks,
                    pendingTaskHeader: jqXHR.getResponseHeader("x-ms-pendingtasks"),
                    // If the header is present, then fetch the value
                    numTasksToUpdate: (pendingTaskHeader != null) && parseInt(pendingTaskHeader) || 0
                };
            });
    }
}

export class TaskDefinitionsResult {
    public tasks: DistributedTaskContracts.TaskDefinition[];
    public numTasksToUpdate: number;
}

/**
 * Gets a version spec string from a task version
 * @param version The version
 */
export function getVersionSpec(version: DistributedTaskContracts.TaskVersion): string {
    var versionSpec: string = Utils_String.format("{0}.{1}.{2}", version.major, version.minor, version.patch);
    if (version.isTest) {
        versionSpec = versionSpec + "-test";
    }

    return versionSpec;
}

/**
 * A basic node in the task category tree
 */
export class TaskCategoryTreeNode extends KoTree.BaseTreeNode implements KoTree.ITreeNode, IDirty {
    /**
     * Category name 
     */
    public value: KnockoutObservable<string> = ko.observable("");

    /**
     * The text to display
     * see KoTree.ITreeNode
     */
    public text: KnockoutComputed<string>;

    /**
     * Whether to show an icon for the node
     * see KoTree.ITreeNode
     */
    public showIcon: KnockoutObservable<boolean> = ko.observable(true);

    /**
     * The CSS class for the icon
     * see KoTree.ITreeNode
     */
    public nodeIconCssClass: KnockoutObservable<string> = ko.observable("");

    /**
     * Indicates whether the model is dirty
     * see KoTree.ITreeNode
     */
    public dirty: KnockoutComputed<boolean>;

    /**
     * The CSS class for the node
     * see KoTree.ITreeNode
     */
    public cssClass: KnockoutObservable<string> = ko.observable("node-link");

    constructor(value: string, text?: string) {
        super();
        var displayText = text;
        if (!displayText) {
            displayText = value;
        }
        this.dirty = ko.computed({
            read: () => {
                return false;
            }
        });

        this.text = ko.computed({
            read: () => {
                return displayText;
            }
        });

        this.value(value);

    }

    /**
     * Called when the context menu for the node is clicked
     * @param target The node
     * @param args Event args
     */
    public _onContextMenuClick(target: KoTree.ITreeNode, args: JQueryEventObject) {
        this.root()._onContextMenuClick(this, args, this.value());
    }
}

/**
 * A tree section node "All Categories" that has list of all categories in it
 * Not used for now
 */
export class TaskCategoryAllTreeSection extends KoTree.BaseTreeSection<TaskCategoryTreeNode> {

    constructor(text: string, css: string = "node-section") {
        super(text, css);
    }
}

export interface IWizardPageViewModel {
    isInvalid: KnockoutObservable<boolean>;
    isInitialized: KnockoutObservable<boolean>;
}

export class WizardPage {
    public id: string = "";
    public templateName: string = "";
    public title: string = "";
    public viewModel: KnockoutObservable<IWizardPageViewModel> = ko.observable(null);
    public order: number = 0;
    public cssClass: string;

    constructor(id: string, title: string, order: number, cssClass: string, templateName: string, viewModel: IWizardPageViewModel) {
        this.id = id;
        this.order = order;
        this.cssClass = cssClass;
        this.templateName = templateName;
        this.title = title;
        this.viewModel(viewModel);
    }
}

export class MetaTaskManager implements TaskTypes.IMetaTaskManager {

    public constructor() {
        var webContext: PlatformContracts.WebContext = VSSContext.getDefaultWebContext();
        var vssConnection: Service.VssConnection = new Service.VssConnection(webContext);

        this._projectId = webContext.project.id;
        this._taskAgentClient = vssConnection.getHttpClient(DTAgent_Client.TaskAgentHttpClient);
    }

    public getDefinitions(): IPromise<DistributedTaskContracts.TaskGroup[]> {
        return this._taskAgentClient.getTaskGroups(this._projectId);
    }

    public getRevisions(taskGroupId: string): IPromise<DistributedTaskContracts.TaskGroupRevision[]> {
        return this._taskAgentClient.getTaskGroupHistory(this._projectId, taskGroupId);
    }

    public getRevision(taskGroupId: string, revision: number): IPromise<string> {
        return this._taskAgentClient.getTaskGroupRevision(this._projectId, taskGroupId, revision);
    }

    public saveDefinition(taskGroup: DistributedTaskContracts.TaskGroup): IPromise<DistributedTaskContracts.TaskGroup> {
        var taskGroupCreateParameter = this.ToTaskGroupCreateParameter(taskGroup);
        return this._taskAgentClient.addTaskGroup(<DistributedTaskContracts.TaskGroup>taskGroup, this._projectId);
    }

    public getTaskGroup(taskGroupId?: string, version?: string, expanded?: boolean): IPromise<DistributedTaskContracts.TaskGroup> {
        return this._taskAgentClient.getTaskGroup(this._projectId, taskGroupId, version, expanded ? DistributedTaskContracts.TaskGroupExpands.Tasks : DistributedTaskContracts.TaskGroupExpands.None);
    }

    private ToTaskGroupCreateParameter(taskGroup: DistributedTaskContracts.TaskGroup): DistributedTaskContracts.TaskGroupCreateParameter {
        var taskGroupCreateParameter: DistributedTaskContracts.TaskGroupCreateParameter = {
            category: taskGroup.category,
            description: taskGroup.description,
            iconUrl: taskGroup.iconUrl,
            inputs: taskGroup.inputs,
            instanceNameFormat: taskGroup.instanceNameFormat,
            name: taskGroup.name,
            parentDefinitionId: taskGroup.parentDefinitionId,
            runsOn: taskGroup.runsOn,
            tasks: taskGroup.tasks,
            version: taskGroup.version,
            friendlyName: taskGroup.friendlyName,
            author: taskGroup.author
        }
        return taskGroupCreateParameter;
    }
    private _taskAgentClient: DTAgent_Client.TaskAgentHttpClient;
    private _projectId: string;
}

export function getLatestMetaTaskIconUrl(): string {
    return VSSContext.getPageContext().webAccessConfiguration.paths.resourcesPath + "icon-meta-task.png";
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Tasks.Models", exports);

import VSS = require("VSS/VSS");

import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");

export interface TaskDefinitionReference {
    id: string;
    versionSpec: string;
    definitionType: string;
}

export interface IMetaTaskManager {
    getDefinitions(): IPromise<DistributedTaskContracts.TaskGroup[]>;
    getRevisions(taskGroupId: string): IPromise<DistributedTaskContracts.TaskGroupRevision[]>;
    getRevision(taskGroupId: string, revision: number): IPromise<string>;
    saveDefinition(taskGroup: DistributedTaskContracts.TaskGroup): IPromise<DistributedTaskContracts.TaskGroup>;
    getTaskGroup(taskGroupId?: string, version?: string, expanded?: boolean): IPromise<DistributedTaskContracts.TaskGroup>;
}

export interface IVariableProvider {
    isSystemVariable(variable: string): boolean;
    getVariableValue(variable: string): string;
}

export interface ITask {
    displayName: string;
    refName: string;
    enabled: boolean;
    continueOnError: boolean;
    timeoutInMinutes: number;
    alwaysRun: boolean;
    order?: number;
    inputs: { [key: string]: string; };
    task: TaskDefinitionReference;
    condition: string;
    overrideInputs?: { [key: string]: string; };
    environment?: { [key: string]: string; };
}

export interface ITaskList {
    tasks: KnockoutObservableArray<any>;
    visible: KnockoutObservable<boolean>;
    editable: KnockoutObservable<boolean>;
    type: TaskGroupType;
    isSupported(taskDefinition: any): void;
    taskDelegates: KnockoutObservable<ITaskDelegates>;
    addTask(taskDefinition: any): void;
    removeTask(task: any): void;
    moveTask(oldIndex: number, newIndex: number): void;
    getValue(): ITask[];
    getTasks(): any[];
    revert(): void;
    update(tasks: ITask[]): void;
    dispose(): void;
}

export interface ISelectedPathNode {
    path: string;
    isFolder: boolean;
}

export interface ITaskDelegates {
    filePathProviderDelegate?: (currentValue: string, callback: (node: ISelectedPathNode) => void) => void;
    artifactPathProviderDelegate?: (currentValue: string, callback: (node: ISelectedPathNode) => void) => void;
    editorExtensionDelegates?: KnockoutObservable<ITaskEditorExtensionDelegates>;
}

export interface ITaskEditorExtensionDelegates {
    fileContentProviderDelegate?: (filePath: string, callback: (content: any) => void, errorCallback: (error: any) => void) => void;
}

export interface ITaskListOwner {
    taskList: ITaskList;
}

export interface ITasksEditorOptions {
    addTasksLabel: string;
    defaultTaskCategoryName: string;
    disableAddTasks?: boolean;
    tasksVisibilityFilter?: string[];
    metaTaskManager?: IMetaTaskManager;
    variableProvider?: IVariableProvider;
}

export interface ConnectedServiceMetadata {
    name: string;
    teamProject: string;
    kind: ConnectedServiceKind;
    friendlyName: string;
    description: string;
}

export enum ConnectedServiceKind {
    Custom = 0,
    AzureSubscription = 1,
    Chef = 2,
    Generic = 3,
    GitHub = 4,
    GitHubEnterprise = 5,
}

export class MetaTaskCategoryType {
    public static metaTaskCategory: string[] = [
        'Build',
        'Deploy',
        'Package',
        'Utility',
        'Test'
    ]
}

export class DefinitionType {
    public static task: string = "task";
    public static metaTask: string = "metaTask";
}

export module TaskRunsOnConstants {
    export var RunsOnAgent = "Agent";
    export var RunsOnMachineGroup = "MachineGroup";
    export var RunsOnDeploymentGroup = "DeploymentGroup";
    export var RunsOnServer = "Server";
    export var RunsOnServerGate = "ServerGate";
}

export enum TaskGroupType {
    RunOnAny = 0,
    RunOnAgent = 1,
    RunOnServer = 2,
    RunOnMachineGroup = 3,
    RunsOnServerGate = 4
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Tasks.Types", exports);
/// <reference types="jquery" />



import ko = require("knockout");

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

import DistributedTask = require("TFS/DistributedTask/Contracts");

import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

/**
 * Viewmodel for a task agent pool
 */
export class TaskAgentPoolViewModel {
    private _taskAgentPool: DistributedTask.TaskAgentPool;

    /**
     * Date the pool was created
     */
    public createdOn: KnockoutObservable<Date> = TFS_Knockout.observableDate(null);

    /**
     * The pool id
     */
    public id: KnockoutObservable<number> = ko.observable(0);

    /**
     * The pool name
     */
    public name: KnockoutObservable<string> = ko.observable("");

    /**
     * The pool properties
     */
    public properties: KnockoutObservableArray<TaskModels.KeyValuePair> = ko.observableArray(<TaskModels.KeyValuePair[]>[]);

    /**
     * The pool scope
     */
    public scope: KnockoutObservable<string> = ko.observable("");

    /**
     * The pool size
     */
    public size: KnockoutObservable<number> = ko.observable(0);

    /**
     * Create a new TaskAgentPoolViewModel
     * @param taskAgentPool The data contract
     */
    constructor(taskAgentPool: DistributedTask.TaskAgentPool) {
        this.update(taskAgentPool);
    }

    /**
     * Update the model from a data contract
     * @param taskAgentPool The data contract
     */
    public update(taskAgentPool: DistributedTask.TaskAgentPool) {
        this._taskAgentPool = taskAgentPool;

        if (!!taskAgentPool) {
            this.createdOn(taskAgentPool.createdOn);
            this.id(taskAgentPool.id);
            this.name(taskAgentPool.name);
            this.properties($.map(taskAgentPool.properties || {}, (value: string, key: string) => {
                return new TaskModels.KeyValuePair(key, value);
            }));
            this.scope(taskAgentPool.scope);
            this.size(taskAgentPool.size);
        }
    }
}

/**
 * Gets a version spec string from a task version
 * @param version The version
 */
export function getVersionSpec(version: DistributedTask.TaskVersion): string {
    var versionSpec: string = Utils_String.format("{0}.{1}.{2}", version.major, version.minor, version.patch);
    if (version.isTest) {
        versionSpec = versionSpec + "-test";
    }

    return versionSpec;
}

/**
 * Gets a string that identifies the task definition and version
 * @param taskDefinition The task definition
 */
export function getTaskDefinitionKey(taskDefinition: DistributedTask.TaskDefinition): string {
    if (!!taskDefinition) {
        return Utils_String.format("{0}_{1}", taskDefinition.id, getVersionSpec(taskDefinition.version));
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Models.DistributedTask", exports);

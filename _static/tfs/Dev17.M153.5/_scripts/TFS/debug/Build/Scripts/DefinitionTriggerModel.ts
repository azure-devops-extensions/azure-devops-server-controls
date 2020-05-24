

import ko = require("knockout");

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import BuildContracts = require("TFS/Build/Contracts");

/**
 * Base trigger class of a definition
 */
export class DefinitionTriggerModel extends TaskModels.ChangeTrackerModel {
    public triggerType: BuildContracts.DefinitionTriggerType;
    public supportsBatchChanges: KnockoutObservable<boolean>;
    public supportsBranchFilters: KnockoutObservable<boolean>;
    public supportsPathFilters: KnockoutObservable<boolean>;
    public supportsPolling: KnockoutObservable<boolean>;
    public supported: KnockoutObservable<boolean>;

    constructor(triggerType: BuildContracts.DefinitionTriggerType) {
        super();
        this.triggerType = triggerType;
    }

    _initializeObservables(): void {
        this.supportsBatchChanges = ko.observable(false);
        this.supportsBranchFilters = ko.observable(false);
        this.supportsPathFilters = ko.observable(false);
        this.supportsPolling = ko.observable(false);
        this.supported = ko.observable(false);
    }

    public getValue(): BuildContracts.BuildTrigger {
        return null;
    }

    public validate(): boolean {
        return true;
    }

    public trimInputs(): void {
    }
}

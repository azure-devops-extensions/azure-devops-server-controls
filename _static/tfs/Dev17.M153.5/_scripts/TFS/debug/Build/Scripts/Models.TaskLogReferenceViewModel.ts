

import ko = require("knockout");

import BuildContracts = require("TFS/Build/Contracts");

/**
 * Viewmodel for a task log reference
 */
export class TaskLogReferenceViewModel {
    /**
     * The build id
     */
    public buildId: KnockoutObservable<number> = ko.observable(0);

    /**
     * The log id
     */
    public logId: KnockoutObservable<number> = ko.observable(0);

    constructor(buildId: number, logReference: BuildContracts.BuildLogReference) {
        this.buildId(buildId);

        this.update(logReference);
    }

    /**
     * Updates the model from a data contract
     * @param logReference The data contract
     */
    public update(logReference: BuildContracts.BuildLogReference) {
        if (!!logReference) {
            this.logId(logReference.id);
        }
    }
}

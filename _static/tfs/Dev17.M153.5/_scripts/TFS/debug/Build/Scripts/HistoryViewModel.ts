

import ko = require("knockout");

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import BuildCommon = require("TFS/Build/Contracts");

export class HistoryViewModel extends TaskModels.ChangeTrackerModel {
    /**
     * List of build definition revisions.
     */
    public revisions: KnockoutObservableArray<BuildCommon.BuildDefinitionRevision>;

    constructor() {
        super();
        this.revisions = ko.observableArray([]);
    }

    /**
     * Update list of revisions
     */
    public update(revisions: BuildCommon.BuildDefinitionRevision[]): void {
        this.revisions(revisions);
    }
}

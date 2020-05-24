

import ko = require("knockout");

import KnockoutPivot = require("DistributedTasksCommon/TFS.Knockout.HubPageExplorerPivot");
import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

export class BuildDesignerPivotTab extends KnockoutPivot.BasicPivotTab implements TaskModels.IDirty {
    /**
     * Indicates whether the model is dirty
     */
    public dirty: KnockoutComputed<boolean>;

    /**
     * Indicates whether the model is dirty
     */
    public invalid: KnockoutComputed<boolean>;

    public changeTrackerModel: KnockoutObservable<TaskModels.ChangeTrackerModel>;

    constructor(id: string, text: string, templateName: string) {
        super(id, text, templateName);
        this.changeTrackerModel = ko.observable(null);
        this.dirty = ko.computed({
            read: () => {
                if (this.changeTrackerModel()) {
                    return this.changeTrackerModel().dirty();
                }

                return false;
            }
        });

        this.invalid = ko.computed({
            read: () => {
                if (this.changeTrackerModel()) {
                    return this.changeTrackerModel()._isInvalid();
                }

                return false;
            }
        });
    }
}

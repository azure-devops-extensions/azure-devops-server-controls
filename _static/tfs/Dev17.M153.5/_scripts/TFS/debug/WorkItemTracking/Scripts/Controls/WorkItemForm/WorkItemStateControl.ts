import { TextWorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/TextWorkItemControl";
import { WorkItemControl, IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import WITHelpers = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers");

export class WorkItemStateControl extends TextWorkItemControl {
    private _stateColorCircle: JQuery;

    private _projectName: string;
    private _workItemTypeName: string;

    constructor(workItemControl: WorkItemControl, options?: any, comboOptions?: any) {
        super(workItemControl, options, comboOptions);

        this._projectName = workItemControl._workItemType.project.name;
        this._workItemTypeName = workItemControl._workItemType.name;

        if (workItemControl._workItemType.stateColors) {
            workItemControl._container.addClass("state-coloring-enabled");
            this._stateColorCircle = $("<div></div>").addClass("state-circle").prependTo(workItemControl._container);
        }
    }

    public invalidate(flushing, field) {
        super.invalidate(flushing, field);

        if (field && this._stateColorCircle) {
            WITHelpers.WITStateCircleColors.setStateColorsOnElement(this._stateColorCircle, this.getValue(), this._workItemControl._workItemType);
        }
    }
}

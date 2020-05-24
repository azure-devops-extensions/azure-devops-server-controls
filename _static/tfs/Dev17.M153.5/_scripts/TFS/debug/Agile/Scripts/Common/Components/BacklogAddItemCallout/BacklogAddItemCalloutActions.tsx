import { AddItemInsertLocation } from "./BacklogAddItemCallout";
import { Action } from "VSS/Flux/Action";
import { WorkItemType } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export class BacklogAddItemCalloutActions {
    public readonly beginLoadWorkItemType: Action<void>;
    public readonly workItemTypeLoaded: Action<WorkItemType>;
    public readonly readLocalSettings: Action<{ insertLocation: AddItemInsertLocation, selectedWorkItemType: string }>;
    public readonly insertLocationChanged: Action<AddItemInsertLocation>;
    public readonly selectedWorkItemTypeChanged: Action<string>;
    public readonly errorOnLoad: Action<void>;
    constructor() {
        this.beginLoadWorkItemType = new Action<void>();
        this.workItemTypeLoaded = new Action<WorkItemType>();
        this.readLocalSettings = new Action<{ insertLocation: AddItemInsertLocation, selectedWorkItemType: string }>();
        this.insertLocationChanged = new Action<AddItemInsertLocation>();
        this.selectedWorkItemTypeChanged = new Action<string>();
        this.errorOnLoad = new Action<void>();
    }
}


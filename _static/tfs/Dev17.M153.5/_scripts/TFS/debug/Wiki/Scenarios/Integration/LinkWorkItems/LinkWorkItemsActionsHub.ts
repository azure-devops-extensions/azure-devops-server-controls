import { Action } from "VSS/Flux/Action";

export class LinkWorkItemsActionsHub {
    public workItemsFetched = new Action<number[]>();
    public addWorkItemToDraft = new Action<number>();
    public removeWorkItemFromDraft = new Action<number>();
    public saveAssociatedWorkItems = new Action<number[]>();
    public workItemsUpdated = new Action<void>();
    public savingStarted = new Action<void>();
    public errorRaised = new Action<string>();
}
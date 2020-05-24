import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export interface IBacklogMembershipEvaluator {
    evaluate(workItem: WorkItem, callback: IResultCallback);
}
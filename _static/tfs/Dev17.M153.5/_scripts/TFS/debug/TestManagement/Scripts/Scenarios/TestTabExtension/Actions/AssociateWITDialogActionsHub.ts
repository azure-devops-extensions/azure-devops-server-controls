import { IWorkItemInfo } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/AssociateWITDialogStore";
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import { Action } from "VSS/Flux/Action";

export class AssociateWITDialogActionsHub {
    public initializeResult = new Action<IWorkItemInfo>();
    public fetchingWorkItems = new Action();
    public closeInfoBar = new Action();
    public onColumnSorted = new Action<WorkItem[]>();
    public clearStore = new Action();
    public onError = new Action<string>();
}

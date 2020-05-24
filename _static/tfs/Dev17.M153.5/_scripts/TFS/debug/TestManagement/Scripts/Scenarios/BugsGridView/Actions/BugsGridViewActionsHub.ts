import { IColumn } from "OfficeFabric/DetailsList";
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");
import { Action } from "VSS/Flux/Action";

export interface IWorkItemColorsAndIcon {
    id: number;
    stateColor: string;
    icon: string;
    color: string;
}

export class BugsGridViewActionsHub {
    static readonly CHILD_SCOPE = "CHILD_SCOPE";
    
    public onError = new Action<string>(BugsGridViewActionsHub.CHILD_SCOPE);
    public onErrorMessageClose = new Action<void>(BugsGridViewActionsHub.CHILD_SCOPE);
    public bugsLoaded = new Action<WIT_Contracts.WorkItem[]>(BugsGridViewActionsHub.CHILD_SCOPE);
    public colorsLoaded = new Action<IWorkItemColorsAndIcon[]>(BugsGridViewActionsHub.CHILD_SCOPE);
    public initializeSelection = new Action<void>(BugsGridViewActionsHub.CHILD_SCOPE);
    public initializeColumns = new Action<IColumn[]>(BugsGridViewActionsHub.CHILD_SCOPE);
    public dismissContextMenu = new Action<IColumn[]>(BugsGridViewActionsHub.CHILD_SCOPE);
    public updateContextMenuOpenIndex = new Action<number>(BugsGridViewActionsHub.CHILD_SCOPE);
    public afterSort = new Action<WIT_Contracts.WorkItem[]>(BugsGridViewActionsHub.CHILD_SCOPE);
    public afterBugsDeleted = new Action<WIT_Contracts.WorkItem[]>(BugsGridViewActionsHub.CHILD_SCOPE);
    public clearState = new Action<void>(BugsGridViewActionsHub.CHILD_SCOPE);
    public updateWorkItem = new Action<WIT_Contracts.WorkItem>(BugsGridViewActionsHub.CHILD_SCOPE);
    public updateWorkItemColorsAndInfo = new Action<IWorkItemColorsAndIcon>(BugsGridViewActionsHub.CHILD_SCOPE);
}
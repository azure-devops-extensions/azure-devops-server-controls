import { IColumn } from "OfficeFabric/DetailsList";
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");
import { Action } from "VSS/Flux/Action";

export interface IWorkItemColorsAndIcon {
    id: number;
    stateColor: string;
    icon: string;
    color: string;
}

export class RequirementsGridViewActionsHub {
    static readonly CHILD_SCOPE = "CHILD_SCOPE";
    
    public onError = new Action<string>(RequirementsGridViewActionsHub.CHILD_SCOPE);
    public onErrorMessageClose = new Action<void>(RequirementsGridViewActionsHub.CHILD_SCOPE);
    public requirementsLoaded = new Action<WIT_Contracts.WorkItem[]>(RequirementsGridViewActionsHub.CHILD_SCOPE);
    public colorsLoaded = new Action<IWorkItemColorsAndIcon[]>(RequirementsGridViewActionsHub.CHILD_SCOPE);
    public initializeSelection = new Action<void>(RequirementsGridViewActionsHub.CHILD_SCOPE);
    public initializeColumns = new Action<IColumn[]>(RequirementsGridViewActionsHub.CHILD_SCOPE);
    public dismissContextMenu = new Action<IColumn[]>(RequirementsGridViewActionsHub.CHILD_SCOPE);
    public updateContextMenuOpenIndex = new Action<number>(RequirementsGridViewActionsHub.CHILD_SCOPE);
    public afterSort = new Action<WIT_Contracts.WorkItem[]>(RequirementsGridViewActionsHub.CHILD_SCOPE);
    public afterRequirementsDeleted = new Action<WIT_Contracts.WorkItem[]>(RequirementsGridViewActionsHub.CHILD_SCOPE);
    public clearState = new Action<void>(RequirementsGridViewActionsHub.CHILD_SCOPE);
    public updateWorkItem = new Action<WIT_Contracts.WorkItem>(RequirementsGridViewActionsHub.CHILD_SCOPE);
    public updateWorkItemColorsAndInfo = new Action<IWorkItemColorsAndIcon>(RequirementsGridViewActionsHub.CHILD_SCOPE);
}
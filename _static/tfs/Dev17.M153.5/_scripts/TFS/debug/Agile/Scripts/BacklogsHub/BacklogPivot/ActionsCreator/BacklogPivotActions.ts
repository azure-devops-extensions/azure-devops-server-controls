import { IBacklogData } from "Agile/Scripts/BacklogsHub/BacklogHubContracts";
import { ActionsHub } from "Agile/Scripts/Common/ActionsHub";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { Action } from "VSS/Flux/Action";
import { registerDiagActions } from "VSS/Flux/Diag";
import { Contribution } from "VSS/Contributions/Contracts";

const ACTION_SCOPE = "PRODUCT_BACKLOG_PIVOT";

@registerDiagActions
export class BacklogPivotActions extends ActionsHub {
    public readonly rightPaneChanged: Action<string> = this.createAction<string>();
    public readonly addItemCalloutToggled: Action<boolean> = this.createAction<boolean>();
    public readonly filterBarToggled: Action<boolean> = this.createAction<boolean>();
    public readonly loadBacklogSucceeded: Action<IBacklogData> = this.createAction<IBacklogData>();
    public readonly loadBacklogFailed: Action<ExceptionInfo> = this.createAction<ExceptionInfo>();
    public readonly beginLoadBacklog: Action<void> = this.createAction<void>();
    public readonly beginReloadBacklog: Action<void> = this.createAction<void>();
    public readonly backlogItemAdded: Action<void> = this.createAction<void>();
    public readonly isFiltered: Action<boolean> = this.createAction<boolean>();
    public readonly loadRightPanelContributions: Action<Contribution[]> = this.createAction<Contribution[]>();

    constructor() {
        super(ACTION_SCOPE);
    }
}
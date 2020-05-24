import { Action } from "VSS/Flux/Action";
import { registerDiagActions } from "VSS/Flux/Diag";
import { IBacklogsHubHeaderData } from "Agile/Scripts/BacklogsHub/BacklogContentView/BacklogContentViewContracts";
import { ActionsHub } from "Agile/Scripts/Common/ActionsHub";

@registerDiagActions
export class BacklogContentViewActions extends ActionsHub {
    public readonly headerDataAvailable: Action<IBacklogsHubHeaderData> = this.createAction<IBacklogsHubHeaderData>();
    public readonly changeBacklogLevel: Action<string> = this.createAction<string>();
}
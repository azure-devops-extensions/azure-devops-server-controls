import { Action } from "VSS/Flux/Action";
import { registerDiagActions } from "VSS/Flux/Diag";
import { IBoardsHubHeaderData } from "Agile/Scripts/BoardsHub/TeamBoardContentView/TeamBoardContentViewContracts";
import { ActionsHub } from "Agile/Scripts/Common/ActionsHub";

@registerDiagActions
export class TeamBoardContentViewActions extends ActionsHub {
    public readonly headerDataAvailable: Action<IBoardsHubHeaderData> = this.createAction<IBoardsHubHeaderData>();
    public readonly changeBacklogLevel: Action<string> = this.createAction<string>();
}
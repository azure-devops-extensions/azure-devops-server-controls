import { ITeamBoardPivotContentDataProviderData } from "Agile/Scripts/BoardsHub/TeamBoardPivot/TeamBoardPivotContracts";
import { ActionsHub } from "Agile/Scripts/Common/ActionsHub";
import { Action } from "VSS/Flux/Action";
import { registerDiagActions } from "VSS/Flux/Diag";
import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";

const ACTION_SCOPE = "BOARD_PIVOT";

@registerDiagActions
export class TeamBoardPivotActions extends ActionsHub {
    public readonly boardContentAvailable: Action<ITeamBoardPivotContentDataProviderData> = this.createAction<ITeamBoardPivotContentDataProviderData>();
    public readonly resetBoard: Action<void> = this.createAction<void>();
    public readonly toggleFilterBarVisible: Action<boolean> = this.createAction<boolean>();
    public readonly boardCriteriaFilterChanged: Action<FilterState> = this.createAction<FilterState>();

    constructor() {
        super(ACTION_SCOPE);
    }
}
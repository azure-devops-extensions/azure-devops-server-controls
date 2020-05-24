import { Iteration } from "Agile/Scripts/Models/Iteration";
import { Action } from "VSS/Flux/Action";
import { ActionsHub } from "Agile/Scripts/Common/ActionsHub";
import { registerDiagActions } from "VSS/Flux/Diag";

@registerDiagActions
export class SprintsDirectoryActions extends ActionsHub {
    public readonly beginPagingTeams: Action<void> = this.createAction<void>();
    public readonly teamsPaged: Action<IDictionaryStringTo<Iteration>> = this.createAction<IDictionaryStringTo<Iteration>>();
    public readonly teamsPagedFailed: Action<TfsError> = this.createAction<TfsError>();
}
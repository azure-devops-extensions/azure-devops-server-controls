import { ActionsHub } from "Agile/Scripts/Common/ActionsHub";
import { ISprintHubHeaderData } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { Action } from "VSS/Flux/Action";
import { registerDiagActions } from "VSS/Flux/Diag";
import { DateRange } from "TFS/Work/Contracts";

@registerDiagActions
export class SprintsViewActions extends ActionsHub {
    public readonly headerDataAvailable: Action<ISprintHubHeaderData> = this.createAction<ISprintHubHeaderData>();
    public readonly updateSprintEditorCalloutVisibility: Action<boolean> = this.createAction<boolean>();
    public readonly updateSprintPickerCalloutVisibility: Action<boolean> = this.createAction<boolean>();
    public readonly updateTeamDaysOff: Action<DateRange[]> = this.createAction<DateRange[]>();
}

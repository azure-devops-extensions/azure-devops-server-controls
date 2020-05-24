import { ActionsHub } from "Agile/Scripts/Common/ActionsHub";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import * as Contracts from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { IAggregatedCapacity } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { Action } from "VSS/Flux/Action";
import { registerDiagActions } from "VSS/Flux/Diag";

@registerDiagActions
export class CapacityActions extends ActionsHub {
    public readonly initializeCapacityBegin: Action<void> = this.createAction<void>();
    public readonly initializeCapacity: Action<Contracts.IInitializeCapacityPayload> = this.createAction<Contracts.IInitializeCapacityPayload>();
    public readonly initializeCapacityError: Action<ExceptionInfo[]> = this.createAction<ExceptionInfo[]>();
    public readonly initializeWorkDetailsData: Action<IAggregatedCapacity> = this.createAction<IAggregatedCapacity>();

    public readonly addMissingTeamMembers: Action<Contracts.IUser[]> = this.createAction<Contracts.IUser[]>();
    public readonly replaceUserCapacities: Action<Contracts.IUserCapacity[]> = this.createAction<Contracts.IUserCapacity[]>();

    public readonly addUser: Action<Contracts.IUser> = this.createAction<Contracts.IUser>();
    public readonly removeUser: Action<Contracts.IUser> = this.createAction<Contracts.IUser>();
    public readonly updateAddUserCalloutVisibility: Action<boolean> = this.createAction<boolean>();

    public readonly insertEmptyActivity: Action<Contracts.IAddRemoveActivityPayload> = this.createAction<Contracts.IAddRemoveActivityPayload>();
    public readonly removeActivity: Action<Contracts.IAddRemoveActivityPayload> = this.createAction<Contracts.IAddRemoveActivityPayload>();
    public readonly updateActivity: Action<Contracts.IUpdateActivityPayload> = this.createAction<Contracts.IUpdateActivityPayload>();
    public readonly updateUserDaysOff: Action<Contracts.IUpdateUserDaysOffPayload> = this.createAction<Contracts.IUpdateUserDaysOffPayload>();

    public readonly updateTeamDaysOff: Action<Contracts.IDaysOff[]> = this.createAction<Contracts.IDaysOff[]>();
    public readonly undo: Action<void> = this.createAction<void>();
    public readonly save: Action<Contracts.ICapacity> = this.createAction<Contracts.ICapacity>();
    public readonly asyncOperationBegin: Action<void> = this.createAction<void>();
    public readonly asyncOperationEnd: Action<void> = this.createAction<void>();

    public readonly updateIteration: Action<Iteration> = this.createAction<Iteration>();

    public readonly initializeWorkDetailsDataBegin: Action<null> = this.createAction<null>();
    public readonly resetWorkDetailsData: Action<null> = this.createAction<null>();

    public readonly setRightPanelId: Action<string> = this.createAction<string>();
    public readonly initializeWorkDetailsError: Action<ExceptionInfo[]> = this.createAction<ExceptionInfo[]>();
}
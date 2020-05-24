import { ActionsHub } from "Agile/Scripts/Common/ActionsHub";
import { Team } from "Agile/Scripts/Models/Team";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { TeamSetting } from "TFS/Work/Contracts";
import { Action } from "VSS/Flux/Action";
import { registerDiagActions } from "VSS/Flux/Diag";

@registerDiagActions
export class SprintEditorActions extends ActionsHub {
    public readonly initialized: Action<void> = this.createAction<void>();
    public readonly initializeFailed: Action<TfsError> = this.createAction<TfsError>();

    public readonly fetchProjectIterationsFailed: Action<TfsError> = this.createAction<TfsError>();
    public readonly fetchProjectIterationsSucceeded: Action<INode> = this.createAction<INode>();
    public readonly setEditingIteration: Action<string> = this.createAction<string>();

    public readonly fetchTeams: Action<Team[]> = this.createAction<Team[]>();
    public readonly fetchTeamSettings: Action<TeamSetting> = this.createAction<TeamSetting>();
    public readonly fetchTeamSettingsFailed: Action<TfsError> = this.createAction<TfsError>();

    public readonly beginFetchTeamIterationPaths: Action<void> = this.createAction<void>();
    public readonly fetchTeamIterationPathsFailed: Action<TfsError> = this.createAction<TfsError>();
    public readonly fetchTeamIterationPathsSucceeded: Action<IFetchTeamIterationPathsPayload> = this.createAction<IFetchTeamIterationPathsPayload>();

    public readonly changeSelectedTeam: Action<string> = this.createAction<string>();

    public readonly beginCreateNewSprint: Action<void> = this.createAction<void>();
    public readonly createNewSprintFailed: Action<TfsError> = this.createAction<TfsError>();
    public readonly createNewSprintSucceeded: Action<string> = this.createAction<string>();

    public readonly clearPageMessage: Action<string> = this.createAction<string>();
}

export interface IFetchTeamIterationPathsPayload {
    teamIterationPaths: string[];
    nextSuggestedIterationPath: string;
}

import { SprintsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { Iteration, IterationBuilder } from "Agile/Scripts/Models/Iteration";
import { Team } from "Agile/Scripts/Models/Team";
import { ITeamSource, TeamSource } from "Agile/Scripts/Sources/TeamSource";
import { SprintEditorActions } from "Agile/Scripts/SprintsHub/SprintEditor/ActionsCreator/SprintEditorActions";
import { ISprintEditorDataProvider, SprintEditorDataProvider } from "Agile/Scripts/SprintsHub/SprintEditor/ActionsCreator/SprintEditorDataProvider";
import { SprintEditorUsageTelemetryConstants } from "Agile/Scripts/SprintsHub/SprintEditor/SprintEditorTelemetryConstants";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { WebSettingsScope, WebSettingsService } from "Presentation/Scripts/TFS/TFS.WebSettingsService";
import { TeamSetting, TeamSettingsIteration } from "TFS/Work/Contracts";
import { getDefaultWebContext } from "VSS/Context";
import * as Diag from "VSS/Diag";
import * as VSSError from "VSS/Error";
import { getService } from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import { WorkItemClassificationNode } from "TFS/WorkItemTracking/Contracts";

const TEAM_MRU_KEY = "Agile/SprintsHub/NewSprintTeamMru";

export class SprintEditorActionsCreator {
    private _actions: SprintEditorActions;
    private _dataProvider: ISprintEditorDataProvider;
    private _teamSource: ITeamSource;

    constructor(
        actions: SprintEditorActions,
        dataProvider: ISprintEditorDataProvider = new SprintEditorDataProvider(),
        teamSource: ITeamSource = new TeamSource()
    ) {
        this._actions = actions;
        this._dataProvider = dataProvider;
        this._teamSource = teamSource;
    }

    /**
     * Initialize the sprint editor experience
     * Loads all the teams and all the iterations for the current Project
     * @param selectedTeam The preselected team for the experience
     * @param editingIterationId If provided, sets the edited iteration to this id
     */
    public initialize(selectedTeam?: Team, editingIterationId?: string): Promise<void> {
        let teamsPromise: Promise<Team>;

        if (!selectedTeam) {
            const projectId = getDefaultWebContext().project.id;
            teamsPromise = this._teamSource.fetchTeamsForProject(projectId).then((teams: Team[]) => {
                teams = teams ? teams.sort((a: Team, b: Team) => Utils_String.ignoreCaseComparer(a.name, b.name)) : [];
                if (teams.length === 0) {
                    SprintsHubTelemetryHelper.publishTelemetryValue(SprintEditorUsageTelemetryConstants.SPRINTEDITOR_NO_MANAGEABLE_TEAMS, "noManageableTeams", true);
                }
                this._actions.fetchTeams.invoke(teams);
                if (teams.length > 0) {
                    const mruTeamId = this._getMRUTeam();
                    if (mruTeamId) {
                        const mruTeams = teams.filter(t => t.id === mruTeamId);
                        if (mruTeams.length > 0) {
                            return mruTeams[0];
                        } else {
                            return teams[0];
                        }
                    } else {
                        return teams[0];
                    }
                }
                return undefined;
            });
        } else {
            this._actions.fetchTeams.invoke([selectedTeam]);
            teamsPromise = Promise.resolve(selectedTeam);
        }

        return (
            this.getProjectIterations() // Get the project iterations
                .then(() => {
                    if (editingIterationId) {
                        this._actions.setEditingIteration.invoke(editingIterationId);
                    }
                    return teamsPromise; // Get the teams in parallel
                })
                .then((selectedTeam: Team) => {
                    if (selectedTeam) {
                        return this.changeSelectedTeam(selectedTeam.id); // With the selected team, fetch data related to the selected team
                    }
                })
                .then(() => {
                    this._actions.initialized.invoke(null); // The pivot is initialized at this point
                })
                .catch((error: TfsError) => {
                    if (error) {
                        VSSError.publishErrorToTelemetry(error);
                    }

                    this._actions.initializeFailed.invoke(error);
                })
        );
    }

    public getProjectIterations(): Promise<void> {
        return this._dataProvider.getRootIterationNodeForProject().then(
            (rootNode: INode) => {
                this._actions.fetchProjectIterationsSucceeded.invoke(rootNode);
            },
            (error: TfsError) => {
                if (error) {
                    VSSError.publishErrorToTelemetry(error);
                }
                this._actions.fetchProjectIterationsFailed.invoke(error);
            }
        );
    }

    /**
     * Change the selected team
     * @param teamId The new team id
     */
    public changeSelectedTeam(teamId: string): Promise<void[]> {
        Diag.Debug.assertIsNotNull(teamId);
        this._saveMRUTeam(teamId);
        // Change the team
        this._actions.changeSelectedTeam.invoke(teamId);

        // Fetch iterations for the new team
        return Promise.all([
            this.fetchTeamIterationPaths(teamId),
            this.fetchTeamSettings(teamId)
        ]);
    }

    public fetchTeamSettings(teamId: string): Promise<void> {
        Diag.Debug.assertIsNotNull(teamId);

        return this._dataProvider.getTeamSettings(teamId).then(
            (teamSettings: TeamSetting) => {
                this._actions.fetchTeamSettings.invoke(teamSettings);
            },
            (error: TfsError) => {
                if (error) {
                    VSSError.publishErrorToTelemetry(error);
                }
                this._actions.fetchTeamSettingsFailed.invoke(error);
            }
        );
    }

    /**
     * Fetch all iterations for a given team
     * @param teamId The team id
     */
    public fetchTeamIterationPaths(teamId: string): Promise<void> {
        Diag.Debug.assertIsNotNull("teamId");

        this._actions.beginFetchTeamIterationPaths.invoke(null);
        return this._dataProvider.getIterationPathsForTeam(teamId).then(
            (iterationPaths: string[]) => {
                const nextSuggestedIteration = this._dataProvider.tryGetNextSuggestedIterationPath(iterationPaths);
                this._actions.fetchTeamIterationPathsSucceeded.invoke({
                    teamIterationPaths: iterationPaths,
                    nextSuggestedIterationPath: nextSuggestedIteration
                });
            },
            (error: TfsError) => {
                if (error) {
                    VSSError.publishErrorToTelemetry(error);
                }
                this._actions.fetchTeamIterationPathsFailed.invoke(error);
            }
        );
    }

    /**
     * Create a sprint editor
     * @param teamId The team id to create the sprint for
     * @param teamName Name of the team to create the sprint for
     * @param name The name of the new iteration
     * @param startDate The start date of the new iteration
     * @param endDate The end date of the new iteration
     * @param parentIterationPath The parent of the new iteration
     */
    public createAndSubscribeIteration(teamId: string, teamName: string, name: string, startDate: Date, endDate: Date, parentIterationPath: string): IPromise<Iteration> {
        Diag.Debug.assertIsNotNull(teamId);
        Diag.Debug.assertIsNotNull(teamName);
        Diag.Debug.assertIsNotNull(name);
        Diag.Debug.assertIsNotNull(startDate);
        Diag.Debug.assertIsNotNull(endDate);
        Diag.Debug.assertIsNotNull(parentIterationPath);

        this._actions.beginCreateNewSprint.invoke(null);
        SprintsHubTelemetryHelper.publishTelemetry(SprintEditorUsageTelemetryConstants.SPRINTEDITOR_CREATECLICKED, {
            teamId,
            choice: SprintEditorUsageTelemetryConstants.SPRINTEDITOR_CREATENEW
        }, /*immediate*/ true);

        return this._dataProvider.createAndAddIterationForTeam(teamId, name, parentIterationPath, startDate, endDate).then(
            (value: TeamSettingsIteration) => {
                this._actions.createNewSprintSucceeded.invoke(null);
                return IterationBuilder.fromTeamSettingsIteration(value);
            },
            (error: TfsError) => {
                this._handleCreateIterationError(error, parentIterationPath);
                this._actions.createNewSprintFailed.invoke(error);
                return null;
            }
        );
    }

    /**
     * Edit an existing sprint
     * @param iteration The iteration to edit
     * @param name The new iteration name
     * @param startDate The new iteration start date
     * @param endDate The new iteration end date
     */
    public editIteration(iteration: INode, name: string, startDate: Date, endDate: Date): IPromise<Iteration> {
        Diag.Debug.assertIsNotNull(iteration);
        Diag.Debug.assertIsNotNull(name);
        Diag.Debug.assertIsNotNull(startDate);
        Diag.Debug.assertIsNotNull(endDate);

        this._actions.beginCreateNewSprint.invoke(null);
        SprintsHubTelemetryHelper.publishTelemetry(SprintEditorUsageTelemetryConstants.SPRINTEDITOR_CREATECLICKED, {
            iterationId: iteration.guid,
            choice: SprintEditorUsageTelemetryConstants.SPRINTEDITOR_CREATENEW
        }, /*immediate*/ true);

        return this._dataProvider.editIteration(iteration, name, startDate, endDate).then(
            (value: WorkItemClassificationNode) => {
                this._actions.createNewSprintSucceeded.invoke(null);
                return IterationBuilder.fromWorkItemClassificationNode(value);
            },
            (error: TfsError) => {
                this._handleCreateIterationError(error);
                this._actions.createNewSprintFailed.invoke(error);
                return null;
            }
        );
    }

    /**
     * Create a sprint editor from an existing project iteration
     * @param teamId The team id to create the sprint for
     * @param teamName Name of the team to create the sprint for
     * @param iterationPath The existing iteration path
     */
    public subscribeToIteration(teamId: string, teamName: string, iterationPath: string): IPromise<Iteration> {
        Diag.Debug.assertIsNotNull(teamId);
        Diag.Debug.assertIsNotNull(teamName);
        Diag.Debug.assertIsNotNull(iterationPath);

        this._actions.beginCreateNewSprint.invoke(null);

        SprintsHubTelemetryHelper.publishTelemetry(SprintEditorUsageTelemetryConstants.SPRINTEDITOR_CREATECLICKED, {
            teamId,
            choice: SprintEditorUsageTelemetryConstants.SPRINTEDITOR_SELECTEXISITING
        }, /*immediate*/ true);

        return this._dataProvider.selectIterationForTeam(teamId, iterationPath).then(
            (value: TeamSettingsIteration) => {
                this._actions.createNewSprintSucceeded.invoke(null);
                return IterationBuilder.fromTeamSettingsIteration(value);
            },
            (error: TfsError) => {
                if (error) {
                    VSSError.publishErrorToTelemetry(error);
                }
                this._actions.createNewSprintFailed.invoke(error);
                return null;
            }
        );
    }

    /**
     * Dismiss a message
     * @param id The message id
     */
    public clearPageMessage(id: string): void {
        Diag.Debug.assertIsNotNull(id);
        this._actions.clearPageMessage.invoke(id);
    }

    private _getMRUTeam(): string {
        const settingsService = getService(WebSettingsService);
        return settingsService.readLocalSetting(TEAM_MRU_KEY, WebSettingsScope.ProjectAndUser);
    }

    private _saveMRUTeam(teamId: string): void {
        const settingsService = getService(WebSettingsService);
        settingsService.writeLocalSetting(TEAM_MRU_KEY, teamId, WebSettingsScope.ProjectAndUser);
    }

    private _handleCreateIterationError(error: TfsError, creationLocation?: string) {
        if (error) {
            const permissionErrorTypeKey = "UnauthorizedAccessException";
            const duplicateErrorTypeKey = "ClassificationNodeDuplicateNameException";
            if (error && error.serverError && Utils_String.equals(error.serverError.typeKey, permissionErrorTypeKey, true)) {
                SprintsHubTelemetryHelper.publishTelemetry(SprintEditorUsageTelemetryConstants.SPRINTEDITOR_HITPERMISSIONERROR, { "location": creationLocation });
            } else if (error && error.serverError && Utils_String.equals(error.serverError.typeKey, duplicateErrorTypeKey, true)) {
                SprintsHubTelemetryHelper.publishTelemetry(SprintEditorUsageTelemetryConstants.SPRINTEDITOR_HITDUPLICATENAMEERROR, { "location": creationLocation });
            } else {
                VSSError.publishErrorToTelemetry(error);
            }
        }
    }
}
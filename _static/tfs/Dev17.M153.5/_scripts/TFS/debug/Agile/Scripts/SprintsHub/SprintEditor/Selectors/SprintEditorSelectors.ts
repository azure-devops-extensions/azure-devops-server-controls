import { SprintEditorStore } from "Agile/Scripts/SprintsHub/SprintEditor/Store/SprintEditorStore";
import { IMessage } from "Presentation/Scripts/TFS/Components/Messages";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { DayOfWeek } from "VSS/Common/Contracts/System";
import { Team } from "Agile/Scripts/Models/Team";


/**
 * Selectors for the sprint editor store
 */
export namespace SprintEditorSelectors {
    /**
     * Get the view state for the NewSprint view
     * @param store The sprint editor store to use to retrieve the information
     */
    export function GetSprintEditorViewState(store: SprintEditorStore): ISprintEditorViewState {
        return {
            editingIteration: store.editingIteration,
            hasFatalError: store.hasFatalError,
            initialized: store.initialized,
            isCreatingSprint: store.isCreatingSprint,
            isFetchingTeamIterations: store.isFetchingTeamIterations,
            messages: store.messages,
            nextSuggestedIterationPath: store.nextSuggestedIterationPath,
            selectedTeamBacklogIteration: store.selectedTeamBacklogIteration,
            selectedTeamDaysOff: store.selectedTeamDaysOff || [],
            selectedTeamIterationPaths: store.selectedTeamIterationPaths,
            projectIterationHierarchy: store.projectIterationHierarchy,
            selectedTeam: store.selectedTeam,
            suggestedParentNode: store.suggestedParentNode,
            teams: store.teams
        };
    }
}

export interface ISprintEditorViewState {
    /** The currently edited iteration */
    editingIteration?: INode;

    /** Does the component have a fatal error */
    hasFatalError: boolean;

    /** Is the component initialized */
    initialized: boolean;

    /** Are we creating a sprint editor? */
    isCreatingSprint: boolean;

    /** Are we fetching team iterations? */
    isFetchingTeamIterations: boolean;

    /** The page level messages */
    messages: IMessage[];

    /** The next suggested iteration path */
    nextSuggestedIterationPath: string;

    /** The project iteration hierarchy */
    projectIterationHierarchy: INode;

    /** The selected team */
    selectedTeam: Team;

    /** The selected team"s backlog iteration */
    selectedTeamBacklogIteration: INode;

    /** The selected team's days off */
    selectedTeamDaysOff: DayOfWeek[];

    /** The current iterations the team has already selected */
    selectedTeamIterationPaths: string[];

    /** The suggested parent location node */
    suggestedParentNode: INode;

    /** The current teams to select from */
    teams: Team[];
}
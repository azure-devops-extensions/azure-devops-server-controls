import { IterationDateUtil } from "Agile/Scripts/Common/IterationDateUtil";
import { Team } from "Agile/Scripts/Models/Team";
import * as SprintEditorResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.SprintEditor";
import { SprintEditorActions, IFetchTeamIterationPathsPayload } from "Agile/Scripts/SprintsHub/SprintEditor/ActionsCreator/SprintEditorActions";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { IMessage, IMessageLink } from "Presentation/Scripts/TFS/Components/Messages";
import { INode, INodeStructureType } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { TeamSetting } from "TFS/Work/Contracts";
import { DayOfWeek } from "VSS/Common/Contracts/System";
import { Store } from "VSS/Flux/Store";
import { isEmptyGuid } from "VSS/Utils/String";
import { traversePreOrder } from "VSS/Utils/Tree";
import * as VSS from "VSS/VSS";
import { NodeHelpers } from "WorkItemTracking/Scripts/Utils/NodeHelpers";

export class SprintEditorStore extends Store {
    // Data
    private _editingIteration: INode;
    private _hasFatalError: boolean;
    private _projectIterationHierarchy: INode;

    private _selectedTeamId: string;
    private _selectedTeamBacklogIterationId: string;
    private _selectedTeamBacklogIteration: INode;
    private _selectedTeamDaysOff: DayOfWeek[];
    private _selectedTeamIterationPaths: string[];
    private _suggestedParentNode: INode;
    private _teams: Team[];
    private _messages: IMessage[] = [];

    private _nextSuggestedIterationPath: string;

    // Busy states
    private _initialized: boolean;
    private _fetchingTeamIterations: boolean;
    private _creatingSprint: boolean;

    private _missingBacklogIterationMessageId: string;

    constructor(actions: SprintEditorActions) {
        super();
        this._attachActionListeners(actions);

        this._initialized = false;
        this._fetchingTeamIterations = false;
        this._creatingSprint = false;
    }

    public get editingIteration(): INode {
        return this._editingIteration;
    }

    /**
     *  The messages for the pages.
     */
    public get messages(): IMessage[] {
        return this._messages;
    }

    public get hasFatalError(): boolean {
        return this._hasFatalError;
    }

    /**
     * The next suggested iteration path for the current team
     */
    public get nextSuggestedIterationPath(): string {
        return this._nextSuggestedIterationPath;
    }

    /**
     * The project iterations in a hierarchical format
     */
    public get projectIterationHierarchy(): INode {
        return this._projectIterationHierarchy;
    }

    public get suggestedParentNode(): INode {
        return this._suggestedParentNode;
    }

    /**
     * The teams for this project
     */
    public get teams(): Team[] {
        return this._teams;
    }

    /**
     * The selected team id
     */
    public get selectedTeamId(): string {
        return this._selectedTeamId;
    }

    /**
     * The selected team
     */
    public get selectedTeam(): Team {
        const team = this._teams ? this._teams.filter((team: Team) => team.id === this._selectedTeamId)[0] : undefined;

        return team;
    }

    /**
     * The selected team's backlog iteration
     */
    public get selectedTeamBacklogIteration(): INode {
        if (!this._selectedTeamBacklogIteration) {
            if (this._projectIterationHierarchy && this._selectedTeamBacklogIterationId) {
                let backlogNode: INode;

                traversePreOrder(
                    this._projectIterationHierarchy,
                    (node: INode) => node.children,
                    (node: INode) => {
                        // Cancel traversal if the node was found
                        if (backlogNode) {
                            return false;
                        }

                        if (node.guid === this._selectedTeamBacklogIterationId) {
                            backlogNode = node;
                        }
                    }
                );

                this._selectedTeamBacklogIteration = backlogNode;
            }
        }

        return this._selectedTeamBacklogIteration;
    }

    /**
     * The selected team's days off
     */
    public get selectedTeamDaysOff(): DayOfWeek[] {
        return this._selectedTeamDaysOff;
    }

    /**
     * The already selected iterations for the selected team
     */
    public get selectedTeamIterationPaths(): string[] {
        return this._selectedTeamIterationPaths;
    }

    /**
     * Has the store been initialized
     */
    public get initialized(): boolean {
        return this._initialized;
    }

    /**
     * Are we currently fetching team iterations?
     */
    public get isFetchingTeamIterations(): boolean {
        return this._fetchingTeamIterations;
    }

    /**
     * Are we currently creating a sprint?
     */
    public get isCreatingSprint(): boolean {
        return this._creatingSprint;
    }

    protected _attachActionListeners(actions: SprintEditorActions) {
        actions.initialized.addListener(this._handleInitialized);
        actions.initializeFailed.addListener(this._handleInitializeFailed);
        actions.fetchTeams.addListener(this._handleFetchTeams);
        actions.fetchProjectIterationsFailed.addListener(this._handleFetchProjectIterationsFailed);
        actions.fetchProjectIterationsSucceeded.addListener(this._handleFetchProjectIterationsSucceeded);
        actions.setEditingIteration.addListener(this._handleSetEditingIteration);
        actions.beginFetchTeamIterationPaths.addListener(this._handleBeginFetchTeamIterations);
        actions.fetchTeamIterationPathsFailed.addListener(this._handleFetchTeamIterationsFailed);
        actions.fetchTeamIterationPathsSucceeded.addListener(this._handleFetchTeamIterationPathsSucceeded);
        actions.changeSelectedTeam.addListener(this._handleChangeSelectedTeam);
        actions.fetchTeamSettings.addListener(this._handleFetchTeamSettings);
        actions.fetchTeamSettingsFailed.addListener(this._handleFetchTeamSettingsFailed);
        actions.beginCreateNewSprint.addListener(this._handleBeginCreateNewSprint);
        actions.createNewSprintFailed.addListener(this._handleCreateNewSprintFailed);
        actions.createNewSprintSucceeded.addListener(this._handleCreateNewSprintSucceeded);
        actions.clearPageMessage.addListener(this._handleClearPageMessage);
    }

    private _handleInitialized = (): void => {
        this._initialized = true;
        this.emitChanged();
    }

    private _handleInitializeFailed = (error: TfsError): void => {
        this._initialized = true;
        this._createFatalError(error);
        this.emitChanged();
    }

    private _handleFetchProjectIterationsFailed = (error: TfsError): void => {
        this._createFatalError(error, SprintEditorResources.CouldNotLoadProjectIterations);
        this.emitChanged();
    }

    private _handleFetchProjectIterationsSucceeded = (projectIterationHierarchy: INode): void => {
        this._projectIterationHierarchy = projectIterationHierarchy;
        this._setSuggestedParentNode(this._projectIterationHierarchy, this._selectedTeamIterationPaths);
        this.emitChanged();
    }

    private _handleSetEditingIteration = (iterationId: string): void => {
        this._editingIteration = NodeHelpers.findByGuid(this._projectIterationHierarchy, iterationId);
    }

    private _handleFetchTeams = (teams: Team[]): void => {
        this._teams = teams;
        if (!this._teams || teams.length === 0) {
            const message = new Message(MessageBarType.warning, SprintEditorResources.NoCreateNodePermission, /* closeable */ false);
            this._setPageMessage(message);
        }
        this.emitChanged();
    }

    private _handleBeginFetchTeamIterations = (): void => {
        this._fetchingTeamIterations = true;
        this.emitChanged();
    }

    private _handleFetchTeamIterationsFailed = (error: TfsError): void => {
        this._fetchingTeamIterations = false;
        this._createFatalError(error, SprintEditorResources.CouldNotLoadTeamIterations);
        this.emitChanged();
    }

    private _handleFetchTeamIterationPathsSucceeded = (payload: IFetchTeamIterationPathsPayload): void => {
        this._fetchingTeamIterations = false;
        this._selectedTeamIterationPaths = payload.teamIterationPaths;
        this._nextSuggestedIterationPath = payload.nextSuggestedIterationPath;
        this._setSuggestedParentNode(this._projectIterationHierarchy, payload.teamIterationPaths);

        this.emitChanged();
    }

    private _handleFetchTeamSettingsFailed = (error: TfsError): void => {
        this._createFatalError(error, SprintEditorResources.CouldNotLoadTeamSettings);
        this.emitChanged();
    }

    private _handleChangeSelectedTeam = (teamId: string): void => {
        this._selectedTeamId = teamId;
        this._selectedTeamIterationPaths = [];
        this.emitChanged();
    }

    private _handleFetchTeamSettings = (teamSettings: TeamSetting): void => {
        this._setTeamBacklogIteration(teamSettings);
        this._setTeamDaysOff(teamSettings);
        this.emitChanged();
    }

    private _handleBeginCreateNewSprint = (): void => {
        this._creatingSprint = true;
        this.emitChanged();
    }

    private _handleCreateNewSprintFailed = (error: TfsError): void => {
        this._creatingSprint = false;
        this._createErrorMessage(error);

        this.emitChanged();
    }

    private _handleCreateNewSprintSucceeded = (): void => {
        this._creatingSprint = false;
        this.emitChanged();
    }

    /**
     * Given the message id, find it in the messages and remove it.
     * @param id The id of the message
     */
    private _handleClearPageMessage = (id: string): void => {
        const messages = this._messages;
        for (let i = 0, len = messages.length; i < len; i++) {
            if (messages[i].id === id) {
                messages.splice(i, 1);
                this._messages = messages.slice();
                this.emitChanged();
                break;
            }
        }
    }

    private _createErrorMessage(error: TfsError, prefix?: string, closeable: boolean = true): void {
        const errorMessage = prefix ? `${prefix}: ${error.message}` : VSS.getErrorMessage(error);
        const message = new Message(MessageBarType.error, errorMessage, closeable);
        this._setPageMessage(message);
    }

    private _createFatalError(error: TfsError, prefix?: string): void {
        this._createErrorMessage(error, prefix, false /* not closeable */);
        this._hasFatalError = true;
    }

    /**
     * Add the message, but prevent duplicate messages from being added.
     * @param message The message to be added.
     */
    private _setPageMessage(message: IMessage): void {
        if (message) {
            // Prevent duplicate messages from being added
            for (let i = 0, len = this._messages.length; i < len; i++) {
                if (this._messages[i].message === message.message) {
                    return;
                }
            }
            this._messages.push(message);
            this._messages = this._messages.slice();
        }
    }

    private _setTeamBacklogIteration(teamSettings: TeamSetting): void {
        this._selectedTeamBacklogIteration = null; // Reset cache value
        this._selectedTeamBacklogIterationId = !isEmptyGuid(teamSettings.backlogIteration.id) ? teamSettings.backlogIteration.id : null;

        if (this._missingBacklogIterationMessageId) {
            this._handleClearPageMessage(this._missingBacklogIterationMessageId);
        }

        if (!this._selectedTeamBacklogIterationId) {
            const message = new Message(MessageBarType.error, SprintEditorResources.NoTeamBacklogError, /* closeable */ false);
            this._missingBacklogIterationMessageId = message.id;
            this._setPageMessage(message);
        }
    }

    private _setTeamDaysOff(teamSettings: TeamSetting): void {
        this._selectedTeamDaysOff = IterationDateUtil.getWeekendsFromWorkingDays(teamSettings.workingDays);
    }

    private _setSuggestedParentNode(parentNode: INode, selectedTeamIterations: string[]): void {
        if (!parentNode) {
            return;
        }

        this._suggestedParentNode = undefined;
        if (selectedTeamIterations) {
            const lastSelectedIteration = selectedTeamIterations[selectedTeamIterations.length - 1];
            if (lastSelectedIteration) {
                const lastSelectedNode = NodeHelpers.findByPath(parentNode, lastSelectedIteration);
                if (lastSelectedNode) {
                    // If last selected node's parent's parent is the Project node, then last selected node's parent is a root node (Area/ or Iteration/)
                    // We want to skip that node
                    if (lastSelectedNode.parent.parent && lastSelectedNode.parent.parent.structure === INodeStructureType.Project) {
                        this._suggestedParentNode = parentNode;
                    } else {
                        this._suggestedParentNode = lastSelectedNode.parent;
                    }
                }
            }
        }

        if (!this._suggestedParentNode) {
            this._suggestedParentNode = parentNode;
        }
    }
}

/**
 * A message that will be delivered to the New Sprint view to be displayed
 */
class Message implements IMessage {
    public readonly id: string;

    constructor(public messageType: MessageBarType, public message: string, public closeable: boolean = true, public link?: IMessageLink) {
        this.id = GUIDUtils.newGuid();
    }
}
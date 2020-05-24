import { BacklogContentViewActions } from "Agile/Scripts/BacklogsHub/BacklogContentView/ActionsCreator/BacklogContentViewActions";
import { IBacklogsHubHeaderData } from "Agile/Scripts/BacklogsHub/BacklogContentView/BacklogContentViewContracts";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { Team } from "Agile/Scripts/Models/Team";
import * as BacklogContentViewResources from "Agile/Scripts/Resources/TFS.Resources.BacklogsHub.BacklogView";
import { IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import { IStore, Store } from "VSS/Flux/Store";
import { findIndex, first } from "VSS/Utils/Array";
import { equals } from "VSS/Utils/String";

export interface IBacklogContentViewStore extends IStore {
    /** Current team */
    readonly team: Team;
    /** Current backlog id */
    readonly currentBacklog: IBacklogLevelConfiguration;
    /** The parent backlog id */
    readonly nextBacklog: IBacklogLevelConfiguration;
    /** All backlog levels for the current team */
    readonly visibleBacklogLevels: IBacklogLevelConfiguration[];
    /** Exception information */
    readonly exceptionInfo: ExceptionInfo;
    /** Is the header data ready */
    readonly headerDataReady: boolean;
    /** Does the current team have iterations */
    readonly hasIterations: boolean;
    /** Is the current backlog the requirement backlog */
    readonly isRequirementBacklog: boolean;
    /** This is a signature (hash) of backlog levels that are detected as being newly added.
     * We use this to show the "A new backlog level has been configured for this project..." banner
     */
    newBacklogLevelsSignature: string;
}

export class BacklogContentViewStore extends Store implements IBacklogContentViewStore {
    private _actions: BacklogContentViewActions;

    private _allBacklogLevels: IBacklogLevelConfiguration[];
    private _visibleBacklogLevels: IBacklogLevelConfiguration[];
    private _currentBacklog: IBacklogLevelConfiguration;
    private _nextBacklog: IBacklogLevelConfiguration;
    private _team: Team;
    private _exceptionInfo: ExceptionInfo;
    private _headerDataReady: boolean;
    private _hasIterations: boolean;
    private _requirementLevelName: string;
    private _newBacklogLevelsSignature: string;

    public get visibleBacklogLevels(): IBacklogLevelConfiguration[] {
        return this._visibleBacklogLevels;
    }

    public get currentBacklog(): IBacklogLevelConfiguration {
        return this._currentBacklog;
    }

    public get nextBacklog(): IBacklogLevelConfiguration {
        return this._nextBacklog;
    }

    public get exceptionInfo(): ExceptionInfo {
        return this._exceptionInfo;
    }

    public get headerDataReady(): boolean {
        return this._headerDataReady;
    }

    public get hasIterations(): boolean {
        return this._hasIterations;
    }

    public get isRequirementBacklog(): boolean {
        if (!this._currentBacklog) {
            return false;
        }
        return equals(this._requirementLevelName, this._currentBacklog.name, true /*ignore case*/);
    }

    public get newBacklogLevelsSignature(): string {
        return this._newBacklogLevelsSignature;
    }

    public get team(): Team {
        return this._team;
    }

    constructor(actions: BacklogContentViewActions) {
        super();
        this._actions = actions;
        this._headerDataReady = false;
        this._attachActionListeners(this._actions);
    }

    protected _attachActionListeners(actions: BacklogContentViewActions) {
        actions.headerDataAvailable.addListener(this._headerDataAvailable);
        actions.changeBacklogLevel.addListener(this._changeBacklogLevel);
    }

    private _headerDataAvailable = (headerData: IBacklogsHubHeaderData): void => {
        if (!headerData) {
            this._exceptionInfo = {
                exceptionMessage: BacklogContentViewResources.BacklogHeader_UnknownError
            };
        } else {
            this._exceptionInfo = headerData.exceptionInfo;

            if (!this._exceptionInfo) {
                this._allBacklogLevels = headerData.allBacklogLevels;
                this._visibleBacklogLevels = headerData.allBacklogLevels.filter(bl => findIndex(headerData.visibleBacklogLevels, vbl => vbl.id === bl.id) >= 0);
                this._team = new Team({ id: headerData.teamId, name: headerData.teamName });
                this._currentBacklog = this._getBacklogById(headerData.allBacklogLevels, headerData.backlogId);
                this._nextBacklog = this._getNextBacklog(headerData.allBacklogLevels, headerData.backlogId);
                this._hasIterations = headerData.hasIterations;
                this._requirementLevelName = headerData.requirementLevelName;
                this._newBacklogLevelsSignature = headerData.newBacklogLevelsSignature;
            }
        }

        this._headerDataReady = true;
        this.emitChanged();
    }

    private _changeBacklogLevel = (levelName: string): void => {
        if (!this._exceptionInfo) {
            this._currentBacklog = this._getBacklogByLevel(this._allBacklogLevels, levelName);
            if (this._currentBacklog) {
                this._nextBacklog = this._getNextBacklog(this._allBacklogLevels, this._currentBacklog.id);
            } else {
                this._nextBacklog = null;
            }
        }

        this.emitChanged();
    }

    private _getBacklogById(backlogLevels: IBacklogLevelConfiguration[], backlogId: string): IBacklogLevelConfiguration {
        if (backlogLevels) {
            return first(this._allBacklogLevels, (bl) => bl.id === backlogId);
        }
    }

    private _getBacklogByLevel(backlogLevels: IBacklogLevelConfiguration[], levelName: string): IBacklogLevelConfiguration {
        if (backlogLevels) {
            return first(this._allBacklogLevels, (bl) => bl.name === levelName);
        }
    }

    private _getNextBacklog(backlogLevels: IBacklogLevelConfiguration[], currentBacklogId: string): IBacklogLevelConfiguration {
        if (backlogLevels && backlogLevels.length > 1) {
            const currentBacklogIndex = findIndex(backlogLevels, (bl) => bl.id === currentBacklogId);
            if (currentBacklogIndex > 0) {
                return backlogLevels[currentBacklogIndex - 1];
            }
        }
    }
}
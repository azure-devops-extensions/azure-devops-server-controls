import { TeamBoardContentViewActions } from "Agile/Scripts/BoardsHub/TeamBoardContentView/ActionsCreator/TeamBoardContentViewActions";
import { IBoardsHubHeaderData } from "Agile/Scripts/BoardsHub/TeamBoardContentView/TeamBoardContentViewContracts";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import * as BoardResources from "Agile/Scripts/Resources/TFS.Resources.BoardsHub.BoardView";
import { IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import { IStore, Store } from "VSS/Flux/Store";
import { findIndex, first } from "VSS/Utils/Array";
import { equals } from "VSS/Utils/String";

export interface ITeamBoardContentViewStore extends IStore {
    readonly headerData: IBoardsHubHeaderData;
    readonly currentBacklog: IBacklogLevelConfiguration;
    readonly nextBacklog: IBacklogLevelConfiguration;
    readonly isRequirementBacklog: boolean;
    readonly exceptionInfo: ExceptionInfo;
    readonly headerDataReady: boolean;
}

export class TeamBoardContentViewStore extends Store implements ITeamBoardContentViewStore {
    private _actions: TeamBoardContentViewActions;

    private _currentBacklog: IBacklogLevelConfiguration;
    private _nextBacklog: IBacklogLevelConfiguration;
    private _headerData: IBoardsHubHeaderData;
    private _exceptionInfo: ExceptionInfo;


    public get headerDataReady(): boolean {
        return !!this._headerData;
    }

    public get headerData(): IBoardsHubHeaderData {
        return this._headerData || <IBoardsHubHeaderData>{};
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

    public get isRequirementBacklog(): boolean {
        if (!this._currentBacklog) {
            return false;
        }
        return equals(this._headerData.requirementLevelName, this._currentBacklog.name, true /*ignore case*/);
    }

    constructor(actions: TeamBoardContentViewActions) {
        super();
        this._actions = actions;
        this._attachActionListeners(this._actions);
    }

    protected _attachActionListeners(actions: TeamBoardContentViewActions) {
        actions.headerDataAvailable.addListener(this._headerDataAvailable);
        actions.changeBacklogLevel.addListener(this._changeBacklogLevel);
    }

    protected _headerDataAvailable = (headerData: IBoardsHubHeaderData): void => {
        this._headerData = null;
        this._currentBacklog = null;
        this._nextBacklog = null;
        this._exceptionInfo = null;

        if (!headerData) {
            this._exceptionInfo = {
                exceptionMessage: BoardResources.BoardsHeader_UnknownError
            };
        } else {
            this._exceptionInfo = headerData.exceptionInfo;

            if (!this._exceptionInfo) {
                this._headerData = headerData;
                this._currentBacklog = this._getBacklogById(headerData.allBacklogLevels, headerData.backlogId);
                this._nextBacklog = this._getNextBacklog(headerData.allBacklogLevels, headerData.backlogId);
            }
        }

        this.emitChanged();
    }

    private _changeBacklogLevel = (levelName: string): void => {
        if (!this._exceptionInfo) {
            this._currentBacklog = this._getBacklogByLevel(this._headerData.allBacklogLevels, levelName);
            if (this._currentBacklog) {
                this._nextBacklog = this._getNextBacklog(this._headerData.allBacklogLevels, this._currentBacklog.id);
            } else {
                this._nextBacklog = null;
            }
        }

        this.emitChanged();
    }

    private _getBacklogById(backlogLevels: IBacklogLevelConfiguration[], backlogId: string): IBacklogLevelConfiguration {
        if (backlogLevels) {
            return first(this._headerData.allBacklogLevels, (bl) => bl.id === backlogId);
        }
    }

    private _getBacklogByLevel(backlogLevels: IBacklogLevelConfiguration[], levelName: string): IBacklogLevelConfiguration {
        if (backlogLevels) {
            return first(this._headerData.allBacklogLevels, (bl) => bl.name === levelName);
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
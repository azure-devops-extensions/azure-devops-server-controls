import { TeamBoardContentViewActions } from "Agile/Scripts/BoardsHub/TeamBoardContentView/ActionsCreator/TeamBoardContentViewActions";
import { IBoardsHubHeaderData } from "Agile/Scripts/BoardsHub/TeamBoardContentView/TeamBoardContentViewContracts";
import { BoardsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";

export interface ITeamBoardContentViewActionsCreator {
    /* initailize header data from data provider and invoke data ready action */
    initializeHeaderData(): void;

    /** Change the current backlog level */
    changeBacklogLevel(levelName: string, teamId: string): void;
}

export class TeamBoardContentViewActionsCreator implements ITeamBoardContentViewActionsCreator {
    private _actions: TeamBoardContentViewActions;

    constructor(actions: TeamBoardContentViewActions) {
        this._actions = actions;
    }

    public initializeHeaderData(): void {
        const pageDataService = getService(WebPageDataService);
        const headerData = pageDataService.getPageData<IBoardsHubHeaderData>(BoardsHubConstants.TEAM_BOARD_CONTENT_HEADER_DATAPROVIDER_ID);
        
        this._actions.headerDataAvailable.invoke(headerData);
    }

    public changeBacklogLevel(levelName: string, teamId: string): void {
        this._actions.changeBacklogLevel.invoke(levelName);
    }
}
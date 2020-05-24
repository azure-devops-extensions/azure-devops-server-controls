import Q = require('q');
import * as StringUtils from 'VSS/Utils/String';
import { Board } from 'Widgets/Scripts/DataServices/Legacy/AnalyticsChartingClient';
import { BaseAnalyticsDataService } from 'Widgets/Scripts/DataServices/Legacy/BaseAnalyticsDataService';
import WidgetResources = require('Widgets/Scripts/Resources/TFS.Resources.Widgets');

/** Provides methods for performing cached queries of common, Team-aware questions. */
export interface ITeamDataService {
    /**
     * Gets the lowest level board for a team within a project.
     * @param project ID or name.
     * @param teamId ID of a team
     * @returns a promise that resolves with the lowest level board for the given project and team.
     */
    getLowestLevelVisibleBoard(project: string, teamId: string): IPromise<Board>;
}

/**
 * Implements cached query support for general Team data.
 */
export class TeamDataService extends BaseAnalyticsDataService implements ITeamDataService {
    public static command: string = "Team";

    constructor() {
        super(TeamDataService.command);
    }

    public getLowestLevelVisibleBoard(project: string, teamId: string): IPromise<Board> {
        let key = StringUtils.format("lowestLevelBacklog-{0}/{1}", project, teamId);
        let cachedPromise = this.getCachedData(key);
        if (cachedPromise) {
            return cachedPromise;
        } else {
            let queryAndProcessPromise = this.analyticsClient.getBoards(project, teamId).then(this.processBoardsResults);
            this.setCachedData(key, queryAndProcessPromise);
            return queryAndProcessPromise;
        }
    }

    private processBoardsResults(boards: Board[]): Board {
        // We only want visible backlogs
        boards = boards.filter(board => board.IsBoardVisible);

        // It's confusing, but the lowest-level backlog is the board with the highest board level.
        // For example,
        //     Epics: 0
        //     Features: 1
        //     User Stories: 2
        // User Stories is the lowest level backlog because Features contain User Stories and Epics contain Features, but
        // User Stories has the largest board level number.
        if (boards.length > 0) {
            let lowestLevelBacklog = boards.reduce((prev, cur) => {
                return (prev.BoardLevel > cur.BoardLevel) ? prev : cur;
            });

            return lowestLevelBacklog;
        } else {
            throw WidgetResources.TeamDataService_FailedToFindAnyBoardsError;
        }
    }
}

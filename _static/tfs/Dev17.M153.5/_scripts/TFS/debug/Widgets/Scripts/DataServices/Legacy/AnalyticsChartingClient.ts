import { AnalyticsODataVersions, ODataQueryOptions } from 'Analytics/Scripts/OData';
import { FunctionNameParser } from 'Dashboards/Scripts/Common';
import DateUtils = require('VSS/Utils/Date');
import { AnalyticsClientCore } from 'Analytics/Scripts/QueryCache/AnalyticsClientCore';
import { ProjectIdentity, TeamIdentity } from 'Analytics/Scripts/CommonClientTypes';

/*
 * ======================================== Analytics Wire Data Models ==========================================
 * The following interfaces do not match 1-to-1 with the names of the entities in the analytics service,
 * nor do they expose all of the properties of those entities. These interfaces only expose what
 * we query for from the analytics service.
 */

export interface ODataWorkItemFieldDescriptor {
    /** Name of the field */
    FieldName: string;
    /** Type of the field */
    FieldType: string;
    /** Reference name of the field in VSTS  */
    FieldReferenceName: string;
}


/*
 * ======================================== Analytics Client Data Models ==========================================
 * The following interfaces represent what we want to operate against when working with data retrieved from
 * the AX service. Properties may be renamed, added, changed, etcetera from their Wire Data Model counterparts.
 */

export interface Board {
    BoardId: string;
    BoardName: string;
    BoardLevel: number;
    IsBoardVisible: boolean;
}

export interface Backlog {
    BacklogName: string;
    Category: string;
    IsBacklogVisible: boolean;
}

export interface Column {
    ColumnId: string;
    ColumnName: string;
    ColumnOrder: number;

    /**
     * The max (latest) RevisedDate of the BoardLocation.
     * If the date equals the end of time (9999-01-01T00:00:00Z) then the column is NOT deleted.
     * If the date doesn't equal the end of time, then either this is an old rename revision or the column is deleted.
     * Given in UTC.
     */
    LatestRevisedDate: string;
}

export interface LaneIdentity {
    LaneId: string;
    LaneName: string;
    IsDefaultLane: boolean;
    LaneOrder: number;
}


/**
 * LEGACY.
 *
 * Extends AnalyticsClient Core with queries for Agile Data/Metadata coming from the analytics service.
 * This is a legacy Container which entailed copy-paste processing code for query data handling and caching/consumption layer.
 * Avoid using for new scenarios, in favor of Configuration queries.
 */
export class AnalyticsChartingClient extends AnalyticsClientCore {
    protected static readonly axODataVersion: string = AnalyticsODataVersions.v1;

    /**
     * Constructs a new instance of this class.
     * @param command - Current command for activity logging. Used by Analytics Service to identify where traffic is coming from.
     */
    constructor(command: string) {
        super(command);
    }

    /**
     * Retrieves the list of projects for a collection
     * @return {IPromise<ProjectIdentity[]>} Promise for teams
     */
    public getProjects(): IPromise<ProjectIdentity[]> {
        var queryOptions: ODataQueryOptions = {
            entityType: "Projects",
            oDataVersion: AnalyticsChartingClient.axODataVersion,
            $orderby: "ProjectName",
            $select: "ProjectId,ProjectName"
        };

        return this.runODataQuery(queryOptions).then((data: { value: ProjectIdentity[] }) => data.value);
    }

    /**
     * Retrieves the alphanumerically sorted list of teams for a particular project
     * @param {string} project - Name or ID of a team project
     * @return {IPromise<TeamIdentity[]>} Promise for teams
     */
    public getTeams(project: string): IPromise<TeamIdentity[]> {
        var queryOptions: ODataQueryOptions = {
            entityType: "Teams",
            oDataVersion: AnalyticsChartingClient.axODataVersion,
            project: project,
            $orderby: "TeamName",
            $select: "TeamId,TeamName"
        };

        return this.runODataQuery(queryOptions)
            .then((data: { value: TeamIdentity[] }) => data.value);
    }

    /**
     * Retrieves a particular board.
     * @param {string} project - Name or ID of a team project
     * @param {string} boardId - ID of the board to retrieve
     * @returns {IPromise<Board>} Promise for the desired board
     */
    public getBoard(project: string, boardId: string): IPromise<Board> {
        var queryOptions: ODataQueryOptions = {
            entityType: "BoardLocations",
            oDataVersion: AnalyticsChartingClient.axODataVersion,
            project: project,
            $apply: `filter(BoardId eq ${boardId} and IsCurrent eq true)`
            + "/groupby((BoardName,BoardId,BoardLevel,IsBoardVisible))"
        };

        return this.runODataQuery(queryOptions)
            .then((data: { value: Board[] }) => data.value[0]);
    }

    /**
     * Retrieves the current (not necessarily visible) boards/backlogs for a particular project and team.
     * Ordered by board level in descending order.
     * @param {string} project - Name or ID of a team project
     * @param {string} teamId - ID of a team within the project
     * @return {IPromise<Board[]>} Promise for board/backlog references
     */
    public getBoards(project: string, teamId: string): IPromise<Board[]> {
        var queryOptions: ODataQueryOptions = {
            entityType: "BoardLocations",
            oDataVersion: AnalyticsChartingClient.axODataVersion,
            project: project,
            $apply: `filter(TeamSK eq ${teamId} and IsCurrent eq true)`
            + "/groupby((BoardName,BoardId,BoardLevel,IsBoardVisible))",
            $orderby: "BoardLevel desc"
        };

        return this.runODataQuery(queryOptions)
            .then((data: { value: Board[] }) => data.value);
    }

    /**
     * Retrieves the current backlogs that are visible for any of the given teams in the given project.
     * Ordered by backlog level in descending order.
     * @param {string} project - Name or ID of a team project
     * @param {string[]} teamIds - IDs of teams within the project
     * @return {IPromise<Backlog[]>} Promise for backlog references
     */
    public getBacklogs(project: string, teamIds: string[]): IPromise<Backlog[]> {
        if (!teamIds || teamIds.length == 0) {
            return Q.reject({});
        }
        var teamsQuery = "";
        for (let i = 0; i < teamIds.length; i++) {
            if (i > 0) {
                teamsQuery += " or ";
            }
            teamsQuery += `TeamSK eq ${teamIds[i]}`;
        }

        var queryOptions: ODataQueryOptions = {
            project: project,
            entityType: "BoardLocations",
            oDataVersion: AnalyticsChartingClient.axODataVersion,
            $apply: `filter(${teamsQuery})/groupby((BoardName,BoardLevel,BoardCategoryReferenceName,IsBoardVisible))`,
            $orderby: "BoardLevel desc"
        };

        return this.runODataQuery(queryOptions)
            .then((data: { value: any[] }) => {
                return data.value.map(x => <Backlog>{
                    BacklogName: x.BoardName,
                    Category: x.BoardCategoryReferenceName,
                    IsBacklogVisible: x.IsBoardVisible
                });
            });
    }

    /**
     * Retrieves the columns (current and deleted) of a given board.
     * Renamed columns will return their most recent revision.
     * @param {string} project - Name or ID of a team project
     * @param {string} boardId - ID of a board within the given project
     * @returns {IPromise<Column>} Promise for the columns
     */
    public getBoardColumns(project: string, boardId: string): IPromise<Column[]> {
        var queryOptions: ODataQueryOptions = {
            entityType: "BoardLocations",
            oDataVersion: AnalyticsChartingClient.axODataVersion,
            project: project,
            $apply: `filter(BoardId eq ${boardId})`
            + `/groupby((ColumnId, ColumnName, ColumnOrder), aggregate(RevisedDate with max as LatestRevisedDate))`,
        };

        return this.runODataQuery(queryOptions)
            .then((data: { value: Column[] }) => data.value)
            .then(columns => this.filterLatestColumnRevisions(columns));
    }


    /**
     * Returns the latest revision for each distinct column ID in the given array of columns.
     * Duplicate column ID entries can happen due to column renames, but we only want the
     * latest state of the column.
     * @param columns - The columns to filter
     * @returns {Column[]} An array of only the latest revisions of the given columns.
     */
    private filterLatestColumnRevisions(columns: Column[]) {
        var latestColumnRevisionsMap: IDictionaryStringTo<Column> = {};
        columns.forEach(col => {
            var val = latestColumnRevisionsMap[col.ColumnId];

            if (val != null) {
                var colRevisedDate = DateUtils.parseDateString(col.LatestRevisedDate);
                var valRevisedDate = DateUtils.parseDateString(val.LatestRevisedDate);
                // Save the latest revision
                if (DateUtils.defaultComparer(colRevisedDate, valRevisedDate) > 0) {
                    latestColumnRevisionsMap[col.ColumnId] = col;
                }
            } else {
                latestColumnRevisionsMap[col.ColumnId] = col;
            }
        });

        // Map to array
        return Object.keys(latestColumnRevisionsMap).map(key => latestColumnRevisionsMap[key]);
    }

    /**
     * Retrieves a set of current Kanban Swimlanes used by the selected team in a given board.
     * @param {string} project - Name or ID of a team project
     * @param {string} boardId - ID of the specific board
     * @return {IPromise<LaneIdentity[]>} Promise for the swimlanes
     */
    public getBoardLanes(project: string, boardId: string): IPromise<LaneIdentity[]> {
        var queryOptions: ODataQueryOptions = {
            entityType: "BoardLocations",
            oDataVersion: AnalyticsChartingClient.axODataVersion,
            project: project,
            $apply: `filter(BoardId eq ${boardId} and IsCurrent eq true)`
            + "/groupby((LaneId,LaneName,IsDefaultLane,LaneOrder))",
            $orderby: "LaneOrder"
        };

        return this.runODataQuery(queryOptions)
            .then((data: { value: LaneIdentity[] }) => data.value);
    }
}
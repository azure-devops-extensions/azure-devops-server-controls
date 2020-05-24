import "VSS/LoaderPlugins/Css!Widgets/Styles/AnalyticsPickers";

import * as Q from "q";

import * as AgileResources from "Agile/Scripts/Resources/TFS.Resources.AgileControls";

import * as Controls from "VSS/Controls";
import * as Combos from "VSS/Controls/Combos";
import * as VSS_Diag from "VSS/Diag";
import * as Locations from "VSS/Locations";
import * as Utils_String from "VSS/Utils/String";

import { ProjectIdentity, TeamIdentity } from "Analytics/Scripts/CommonClientTypes";

import { Selector } from "Dashboards/Scripts/Selector";

import * as WidgetResources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";
import * as ChartingClient from "Widgets/Scripts/DataServices/Legacy/AnalyticsChartingClient";
import { TypedCombo, TypedComboO } from "Widgets/Scripts/Shared/TypedCombo";
import { PlaceholderBoardUnsupportedError } from "Widgets/Scripts/CumulativeFlowDiagramErrors";


/**
 * Represents a combo control that makes use of the AnalyticsChartingClient to populate itself with data.
 */
export abstract class AnalyticsPickerO<T, TOptions extends Combos.IComboOptions>
    extends TypedComboO<T, TOptions>
    implements Selector {

    private _agileClient: ChartingClient.AnalyticsChartingClient;
    private $loadingSpinner: JQuery;
    private initializedOverlay: boolean;

    /**
     * An instance of the charting client.
     * Use this to fetch backing data in the control/selector.
     */
    protected get agileClient(): ChartingClient.AnalyticsChartingClient {
        if (this._agileClient == null) {
            this._agileClient = new ChartingClient.AnalyticsChartingClient("AnalyticsPicker");
        }

        return this._agileClient;
    }

    constructor(options: TOptions) {
        var defaults: Combos.IComboOptions = {
            mode: "drop",
            allowEdit: true
        };

        options = $.extend(defaults, options);
        options.cssClass = [options.cssClass, "analytics-picker"].join(" ");
        super(options);
    }

    public initialize(): void {
        super.initialize();

        let loadingSpinnerImgUrl = Locations.urlHelper.getVersionedContentUrl("big-progress.gif");
        this.$loadingSpinner = $("<img>")
            .attr("src", loadingSpinnerImgUrl);
    }

    /**
     * Implemented by child classes.
     * @returns {string} The name of the class
     */
    public abstract getName(): string;

    /**
     * Fetches the control's backing data using the provided context and sets the returned entries as the data source of the control.
     * @param contextParams - The context to use to fetch the control's backing data
     * @returns A promise.
     *     Resolves when the control finishes setting its data source.
     *     Rejects when fetching the backing data or setting the data source fails.
     */
    public abstract setContext(...contextParams: any[]): IPromise<void>;

    /**
     * Validates the state of the selector returning an error message if there is an issue.
     * @returns An error message if the selector is in an invalid state. Otherwise null.
     */
    public abstract validate(): string;

    public abstract getSettings(): any;

    /**
     * Creates overlay that displays on top of picker to prevent user from interacting with the control.
     * Extends the base implementation of showBusyOverlay by resizing the overlay to the size of the picker and
     * positioning it over the picker. Additionally, a spinner image is added to the overlay to indicate loading/busy state.
     * @returns the overlay's JQuery object.
     */
    public showBusyOverlay(): JQuery {
        let overlay = super.showBusyOverlay();

        // Add spinner icon and move overlay only if we haven't previously
        if (!this.initializedOverlay) {
            overlay.append(this.$loadingSpinner);
            overlay.appendTo(this.getElement());

            // Set width/height of overlay to the size of the picker
            overlay.width(this.getElement().outerWidth());
            overlay.height(this.getElement().outerHeight());

            this.initializedOverlay = true;
        }

        return overlay;
    }
}

/**
 * Represents a combo control that makes use of the AnalyticsChartingClient to populate itself with data.
 */
export abstract class AnalyticsPicker<T> extends AnalyticsPickerO<T, Combos.IComboOptions> { }

export class ProjectPicker extends AnalyticsPicker<ProjectIdentity> {
    public static createInstance($container?: JQuery, options?: Combos.IComboOptions): ProjectPicker {
        return <ProjectPicker>this.createIn<Combos.IComboOptions>(ProjectPicker, $container, options);
    }

    constructor(options: Combos.IComboOptions) {
        super($.extend({
            cssClass: "project-picker",
            placeholderText: WidgetResources.ProjectPicker_Watermark
        }, options));
    }

    public getName(): string {
        return "ProjectPicker";
    }

    /**
     * Retrieves the list of projects for the collection and sets it as the data source.
     * @returns A promise that resolves when the project selector is populated with the retrieved data
     */
    public setContext(): IPromise<void> {
        return this.agileClient.getProjects()
            .then(projects => {
                if (!projects) {
                    VSS_Diag.logWarning("Projects promise returned no data");
                }

                this.setSource(projects);
            });
    }

    public setSource(projects: ProjectIdentity[]): void {
        super.setSource(projects, project => project.ProjectName);
    }

    /**
     * Validates the currently selected project and returns an error message where applicable
     * @returns {string} An error message if the selected project is missing or invalid, otherwise null
     */
    public validate(): string {
        var errorMessage = null;

        if (!this.getText()) {
            errorMessage = WidgetResources.ProjectPicker_NoProjectSelectedError;
        } else {
            if (this.getValue() == null) {
                errorMessage = WidgetResources.ProjectPicker_SelectedProjectNotFoundError;
            }
        }

        return errorMessage;
    }

    public getSettings(): string {
        var project = this.getValue() as ProjectIdentity;
        if (project != null) {
            return project.ProjectId;
        } else {
            return null;
        }
    }
}

export class TeamPicker extends AnalyticsPicker<TeamIdentity> {
    public static createInstance($container?: JQuery, options?: Combos.IComboOptions): TeamPicker {
        return <TeamPicker>this.createIn<Combos.IComboOptions>(TeamPicker, $container, options);
    }

    constructor(options: Combos.IComboOptions) {
        super($.extend({
            cssClass: "team-picker",
            placeholderText: WidgetResources.TeamPicker_Watermark
        }, options));
    }

    public getName(): string {
        return "TeamPicker";
    }

    /**
     * Retrieves the list of teams for a given project and sets it as the team selector's data source
     * @param project - The name or ID of the project from which to look up teams
     * @returns A promise that resolves when the team selector is populated with the retrieved data
     */
    public setContext(project: string): IPromise<void> {
        return this.agileClient.getTeams(project)
            .then(teams => {
                if (!teams) {
                    VSS_Diag.logWarning("Teams promise returned no data");
                }

                this.setSource(teams);
            });
    }

    public setSource(teams: TeamIdentity[]): void {
        super.setSource(teams, team => team.TeamName);
    }

    /**
     * Validates the currently selected team and returns an error message where applicable
     * @returns {string} An error message if the selected team is missing or invalid, otherwise null
     */
    public validate(): string {
        var errorMessage = null;

        if (!this.getText()) {
            errorMessage = WidgetResources.TeamPicker_NoTeamSelectedError;
        } else {
            if (this.getValue() == null) {
                errorMessage = WidgetResources.TeamPicker_SelectedTeamNotFoundError;
            }
        }

        return errorMessage;
    }

    public getSettings(): string {
        var team = this.getValue() as TeamIdentity;
        if (team != null) {
            return team.TeamId;
        } else {
            return null;
        }
    }
}

export interface BoardPickerOptions extends Combos.IComboOptions {
    /**
     * Default value is true.
     * Only populates the source list with the boards/backlogs associated with visible backlog levels.
     */
    includeOnlyVisibleBacklogs?: boolean;
}

/** Used for selection of Team owned Boards (which operate as unique entities owned by teams in relation to a particular backlog level)*/
export class BoardPicker extends AnalyticsPickerO<ChartingClient.Board, BoardPickerOptions> {
    public static createInstance($container?: JQuery, options?: BoardPickerOptions): BoardPicker {
        return BoardPicker.create(BoardPicker, $container, options);
    }

    constructor(options: BoardPickerOptions) {
        super($.extend({
            cssClass: "board-picker",
            placeholderText: WidgetResources.BacklogPicker_Watermark
        }, options));
    }

    public initializeOptions(options: BoardPickerOptions) {
        var defaults: BoardPickerOptions = {
            includeOnlyVisibleBacklogs: true,
        };

        super.initializeOptions($.extend(defaults, options));
    }

    public getName(): string {
        return "BoardPicker";
    }

    /**
     * Retrieves the list of visible backlogs/boards using the provided parameters and sets it as the backlog selector's data source
     * @param {string} project - Project name or ID
     * @param {string} teamId - Team ID
     * @returns A promise that resolves when the backlog selector is populated with the retrieved data
     */
    public setContext(project: string, teamId: string): IPromise<void> {
        return this.agileClient.getBoards(project, teamId)
            .then(boards => {
                if (!boards) {
                    VSS_Diag.logWarning("Boards promise returned no data");
                }

                this.setSource(boards);
            });
    }

    public setSource(boards: ChartingClient.Board[]): void {
        if (this._options.includeOnlyVisibleBacklogs) {
            boards = boards.filter(board => board.IsBoardVisible);
        }

        super.setSource(boards, board => board.BoardName);
    }

    /**
     * Check whether the picker is in a valid state.
     * returns {string} - The error message for the state of the control or null if all is well.
     */
    public validate(): string {
        let errorMessage = null;
        let hasBacklogsToChooseFrom = this.firstOrDefault(() => true) != null;

        if (!hasBacklogsToChooseFrom) { // Are there any backlogs?
            errorMessage = WidgetResources.BacklogPicker_NoBacklogsToChooseFromError;;
        } else if (!this.getText()) { // Is there a selection?
            errorMessage = WidgetResources.BacklogPicker_NoBacklogSelectedError;
        } else {
            let selectedValue = this.getValue();
            if (selectedValue == null) { // Is the selection an option in the list?
                errorMessage = WidgetResources.BacklogPicker_SelectedBacklogNotFoundError;
            } else if (selectedValue.BoardId == null) {
                errorMessage = new PlaceholderBoardUnsupportedError(selectedValue.BoardName).message;
            }
        }

        return errorMessage;
    }

    public getSettings(): string {
        var backlog = this.getValue() as ChartingClient.Board;
        if (backlog != null) {
            return backlog.BoardId;
        } else {
            return null;
        }
    }
}

export interface BacklogPickerOptions extends Combos.IComboOptions {
    /**
     * Default value is true.
     * Only populates the source list with the boards/backlogs associated with visible backlog levels.
     */
    includeOnlyVisibleBacklogs?: boolean;
}

/** Used for selection of Backlog levels, which are not specific to any particular team. */
export class BacklogPicker extends AnalyticsPickerO<ChartingClient.Backlog, BacklogPickerOptions> {
    public static createInstance($container?: JQuery, options?: BacklogPickerOptions): BacklogPicker {
        return <BacklogPicker>this.createIn<BacklogPickerOptions>(BacklogPicker, $container, options);
    }

    constructor(options: BacklogPickerOptions) {
        super($.extend({
            cssClass: "backlog-picker",
            placeholderText: WidgetResources.BacklogPicker_Watermark
        }, options));
    }

    public initializeOptions(options: BoardPickerOptions) {
        var defaults: BoardPickerOptions = {
            includeOnlyVisibleBacklogs: true,
        };

        super.initializeOptions($.extend(defaults, options));
    }

    public static getInstanceName(): string {
        return "BacklogPicker";
    }

    public getName(): string {
        return BacklogPicker.getInstanceName();
    }

    /**
     * Retrieves the list of visible backlogs/boards using the provided parameters and sets it as the backlog selector's data source
     * @param {string} project - Project Guid
     * @param {string} teamIds - List of team IDs
     * @returns A promise that resolves when the backlog selector is populated with the retrieved data
     */
    public setContext(project: string, teamIds: string[]): IPromise<void> {
        return this.agileClient.getBacklogs(project, teamIds)
            .then(backlogs => {
                if (!backlogs) {
                    VSS_Diag.logWarning("Backlogs promise returned no data");
                }

                this.setSource(backlogs);
            });
    }

    public setSource(backlogs: ChartingClient.Backlog[]): void {
        if (this._options.includeOnlyVisibleBacklogs) {
            backlogs = backlogs.filter(backlog => backlog.IsBacklogVisible);
        }

        super.setSource(backlogs, board => board.BacklogName);
    }

    /**
     * Check whether current backlog level is still available for user to pick from backlog selector
     * If not available, show Error to user
     * @param {string[]} backlogLevels - Backlog levels
     * returns {boolean} - True if current backlog level is available in backlog selector dropdown else False
     */
    public validate(): string {
        let errorMessage = null;
        let hasBacklogsToChooseFrom = this.firstOrDefault(() => true) != null;

        if (!hasBacklogsToChooseFrom) { // Are there any backlogs?
            errorMessage = WidgetResources.BacklogPicker_NoBacklogsToChooseFromError;;
        } else if (!this.getText()) {
            errorMessage = WidgetResources.BacklogPicker_NoBacklogSelectedError;
        } else {
            if (this.getValue() == null) {
                errorMessage = WidgetResources.BacklogPicker_SelectedBacklogNotFoundError;
            }
        }

        return errorMessage;
    }

    public getSettings(): string {
        var backlog = this.getValue() as ChartingClient.Backlog;
        if (backlog != null) {
            return backlog.Category;
        } else {
            return null;
        }
    }
}


export interface SwimlanePickerOptions extends Combos.IComboOptions {
    /**
     * Default value is true.
     * Appends identifier to named default swimlane or sets an unnamed default swimlane to a localized default string if set to true.
     */
    enhanceDefaultSwimlaneDisplayName?: boolean;

    /**
     * Default value is true.
     * Prepends list with a special "All" swimlane option if set to true.
     */
    includeAllOption?: boolean;
}

export class SwimlanePicker extends AnalyticsPickerO<ChartingClient.LaneIdentity, SwimlanePickerOptions> {
    public static get AnalyticsUnnamedDefaultSwimlaneName(): string { return "(Default Lane)"; }

    private static _allOption: ChartingClient.LaneIdentity;
    public static get AllOption(): ChartingClient.LaneIdentity {
        if (SwimlanePicker._allOption == null) {
            SwimlanePicker._allOption = {
                LaneId: null, // No swimlanes will have an ID of null
                LaneName: WidgetResources.SwimlanePicker_AllOptionName,
                IsDefaultLane: null,
                LaneOrder: null
            };
        }

        return SwimlanePicker._allOption;
    }

    public static createInstance($container?: JQuery, options?: SwimlanePickerOptions): SwimlanePicker {
        return <SwimlanePicker>this.createIn<SwimlanePickerOptions>(SwimlanePicker, $container, options);
    }

    constructor(options: SwimlanePickerOptions) {
        super($.extend({
            cssClass: "swimlane-picker",
            placeholderText: WidgetResources.SwimlanePicker_Watermark
        }, options));
    }

    public getName(): string {
        return "SwimlanePicker";
    }

    public initializeOptions(options: SwimlanePickerOptions) {
        var defaults: SwimlanePickerOptions = {
            enhanceDefaultSwimlaneDisplayName: true,
            includeAllOption: true
        };

        super.initializeOptions($.extend(defaults, options));
    }

    /**
     * Used to order the swimlanes by default lane first, then by ascending lane order.
     * @param a - The first swimlane
     * @param b - The second swimlane
     * @returns A negative number if 'a' comes before 'b', a positive number if 'b' comes before 'a'.
     */
    private static swimlanesSortCompareFn(a: ChartingClient.LaneIdentity, b: ChartingClient.LaneIdentity): number {
        if (a.IsDefaultLane) {
            return -1;
        } else if (b.IsDefaultLane) {
            return 1;
        } else {
            return a.LaneOrder - b.LaneOrder;
        }
    }

    /**
     * Retrieves the swimlanes for the provided parameters and populates the swimlane selector with the returned data
     * @param {string} project - Name or ID of a team project
     * @param {string} boardId - ID of the specific board
     * @return A promise that resolves when the swimlane selector is populated with the retrieved data
     */
    public setContext(project: string, boardId: string): IPromise<void> {
        return this.agileClient.getBoardLanes(project, boardId)
            .then(swimlanes => {
                if (!swimlanes) {
                    VSS_Diag.logWarning("Swimlanes promise returned no data");
                }

                this.setSource(swimlanes);
            });
    }

    public setSource(swimlanes: ChartingClient.LaneIdentity[]): void {
        swimlanes.sort(SwimlanePicker.swimlanesSortCompareFn);

        if (this._options.includeAllOption) {
            this.prependAllSwimlaneOption(swimlanes);
        }

        super.setSource(swimlanes, this.laneToDisplayName);
    }

    /**
     * Validates the currently selected swimlane and returns an error message where applicable.
     * @returns An error message if the selected swimlane is invalid, otherwise null.
     */
    public validate(): string {
        var errorMessage = null;

        if (!this.getText()) {
            errorMessage = WidgetResources.SwimlanePicker_NoSwimlaneSelectedError;
        } else {
            if (this.getValue() == null) {
                errorMessage = WidgetResources.SwimlanePicker_SelectedSwimlaneNotFoundError;
            }
        }

        return errorMessage;
    }

    public getSettings(): string {
        var swimlane = this.getValue() as ChartingClient.LaneIdentity;
        if (swimlane != null) {
            return swimlane.LaneId;
        } else {
            return null;
        }
    }

    private laneToDisplayName(swimlane: ChartingClient.LaneIdentity) {
        var displayName = swimlane.LaneName;

        if (this._options.enhanceDefaultSwimlaneDisplayName && swimlane.IsDefaultLane) {
            if (swimlane.LaneName !== SwimlanePicker.AnalyticsUnnamedDefaultSwimlaneName) {
                displayName = Utils_String.format("{0} {1}", swimlane.LaneName, WidgetResources.SwimlanePicker_DefaultSwimlaneDisplayNameAddition);
            } else {
                displayName = AgileResources.Swimlane_Settings_DefaultLaneName;
            }
        }

        return displayName;
    }

    /**
     * Constructs and prepends a special swimlane representing "All" option to the beginning of the given list of swimlanes.
     * @param swimlanes - A defined list of swimlanes to prepend the "All" option to.
     */
    private prependAllSwimlaneOption(swimlanes: ChartingClient.LaneIdentity[]): void {
        swimlanes.unshift(SwimlanePicker.AllOption);
    }
}
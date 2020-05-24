import Q = require("q");
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import Controls = require("VSS/Controls");
import Configuration = require("Widgets/Scripts/PullRequestConfiguration");
import Dashboards_UIContracts = require("Dashboards/Scripts/Contracts");
import Grids = require("VSS/Controls/Grids");
import Identities_Picker_Controls = require("VSS/Identities/Picker/Controls");
import Navigation = require("VSS/Controls/Navigation");
import PullRequestManager = require("Widgets/Scripts/PullRequest");
import Resources = require("Widgets/Scripts/Resources/Tfs.Resources.Widgets");
import SDK = require("VSS/SDK/Shim");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import TFS_PullRequest = require("VersionControl/Scripts/Controls/PullRequest");
import {PullRequestVoteStatus} from "VersionControl/Scripts/PullRequestTypes";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import TFS_VersionControl_Contracts = require("TFS/VersionControl/Contracts");
import Utils_Core = require("VSS/Utils/Core");
import Context = require("VSS/Context");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import Widgets_LiveTitle = require("Widgets/Scripts/Shared/WidgetLiveTitle");
import WidgetTelemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Service from "VSS/Service";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";

var delegate = Utils_Core.delegate;
var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export module Constants {
    export var CORE_CSS_CLASS = "pull-request-widget";
    export var GRID_CONTAINER_CSS_CLASS = "pull-request-widget-grid-container";
    export var TITLE_CSS_CLASS = "pull-request-widget-title";
    export var TITLE_CONTAINER_CSS_CLASS = "pull-request-widget-title-container";
    export var TITLE_COUNT_CSS_CLASS = "pull-request-widget-title-count";
    export var VIEW_FILTER_CSS_CLASS = "pull-request-widget-view-filter";
    export var GRID_CSS_CLASS = "pull-request-widget-grid";
    export var SHOW_MORE_CSS_CLASS = "pull-request-widget-show-more";
    export var RESULTS_CONTAINER_CSS_CLASS = "pull-request-widget-results-container";
    export var NO_RESULTS_CONTAINER_CSS_CLASS = "pull-request-widget-no-results-container";
    export var NO_RESULTS_MESSAGE_CSS_CLASS = "pull-request-widget-no-results-message";
    export var NO_RESULTS_SYMBOL_CSS_CLASS = "pull-request-widget-no-results-symbol";
    export var ERROR_CONTAINER_CSS_CLASS = "pull-request-widget-error-container";
    export var ERROR_MESSAGE_CSS_CLASS = "pull-request-widget-error-message";
    export var ERROR_SYMBOL_CSS_CLASS = "pull-request-widget-error-symbol";
    export var GRID_DATA_CELL_TITLE_CSS_CLASS = "pull-request-widget-grid-data-cell-title";
    export var GRID_DATA_CELL_DETAILS_CSS_CLASS = "pull-request-widget-grid-data-cell-details";
    export var GRID_DATA_CELL_REPO_CSS_CLASS = "pull-request-widget-grid-data-cell-repo";
    export var GRID_DATA_CELL_CREATED_BY_CSS_CLASS = "pull-request-widget-grid-data-cell-created-by";
    export var GRID_DATA_CELL_CHANGED_CSS_CLASS = "pull-request-widget-grid-data-cell-changed";
    export var GRID_ICON_CELL_ICON_CSS_CLASS = "pull-request-widget-grid-icon-cell-icon";
    export var GRID_AVATAR_CELL_AVATAR_CSS_CLASS = "pull-request-widget-grid-avatar-cell-avatar";
    export var GRID_ICON_CELL_CSS_CLASS = "pull-request-widget-grid-icon-cell";
    export var GRID_DATA_CELL_CSS_CLASS = "pull-request-widget-grid-data-cell";
    export var GRID_AVATAR_CELL_CSS_CLASS = "pull-request-widget-grid-avatar-cell";

    export var GRID_MAX_ITEM_COUNT = 12;

    /**
     * Maps widget row span to the maximum number of PRs to show in the grid
     */
    export var GRID_ITEM_COUNT_MAP: IDictionaryNumberTo<number> = {
        2: 5,
        3: 9,
        4: GRID_MAX_ITEM_COUNT
    };

    export var QUERY_SIZE = 50;
    export var GRID_ROW_HEIGHT = 45;
    export var GRID_AVATAR_CELL_WIDTH = 44;
    export var GRID_ICON_CELL_WIDTH = 24;
    export var GRID_DATA_CELL_WIDTH = 396;
    export var PULL_REQUEST_PAGE = "{0}{1}{2}/{3}/_git/{4}/pullrequests";
    export var PULL_REQUEST_DISCUSSION_PAGE = "{0}{1}{2}/{3}/_git/{4}/pullrequest/{5}#view=discussion";
}

export module Events {
    export var ROW_CLICK_EVENT = "pull-request-widget-row-click-event";
    export var SHOW_MORE_CLICK_EVENT = "pull-request-widget-show-more-click-event";
    export var TITLE_CLICK_EVENT = "pull-request-widget-title-click-event";
    export var VIEW_CHANGE_EVENT = "pull-request-widget-view-change-event";
    export var PROJECT_CHANGE_EVENT = "pull-request-widget-project-change-event";
    export var GET_REPO_API_SUCCESSFUL = "get-repo-api-successful";
}

export module ViewActions {
    export var VIEW_ASSIGNED_TO_TEAM = "view-assigned-to-team-action";
    export var VIEW_ASSIGNED_TO_ME = "view-assigned-to-me-action";
    export var VIEW_CREATED_BY_ME = "view-created-by-me-action";
}

var WIDGET_TEMPLATE =
    `<div class='${Constants.TITLE_CONTAINER_CSS_CLASS}'>
        <span class='${Constants.TITLE_CSS_CLASS}'/>
        <div class='${Constants.TITLE_COUNT_CSS_CLASS}'/>
        <div class='${Constants.VIEW_FILTER_CSS_CLASS}'/>
    </div>
    <div class='${Constants.RESULTS_CONTAINER_CSS_CLASS}'>
        <div class='${Constants.GRID_CONTAINER_CSS_CLASS}'/>
    </div>
    <div class='${Constants.NO_RESULTS_CONTAINER_CSS_CLASS}'>
        <div class='${Constants.NO_RESULTS_MESSAGE_CSS_CLASS}'/>
        <div class='${Constants.NO_RESULTS_SYMBOL_CSS_CLASS}'/>
    </div>
    <div class='${Constants.ERROR_CONTAINER_CSS_CLASS}'>
        <div class='${Constants.ERROR_MESSAGE_CSS_CLASS}'/>
        <div class='${Constants.ERROR_SYMBOL_CSS_CLASS}'/>
    </div>
    <a class='${Constants.SHOW_MORE_CSS_CLASS}'/>`;

export class PullRequestUtils {
   /**
   * Gets a pull request URL for either the summary page for a repo or a specific id
   * @param {TfsContext} context the tfs context object
   * @param {string} repoName the name of the repository
   * @param {string} [pullRequestId] the id of the pull request (if not supplied will provide link to PR page for repo)
   * @returns string
   */
    public static getPullRequestUrl(context: Contracts_Platform.WebContext, repoName: string, pullRequestId?: number) {
        var project = context.project.name;
        var team = TFS_Dashboards_Common.getDashboardTeamContext().name;
        return Utils_String.format(
            pullRequestId ? Constants.PULL_REQUEST_DISCUSSION_PAGE : Constants.PULL_REQUEST_PAGE,
            tfsContext.getHostUrl(), tfsContext.getServiceHostUrl(), project, team, repoName, pullRequestId);
    }
}

export class PullRequestWidgetGrid extends Grids.Grid {
    public static ICON_CLASS_MAP = {
        APPROVE: 'bowtie-icon bowtie-status-success',
        APPROVE_WITH_COMMENT: 'bowtie-icon bowtie-status-success',
        NONE: 'bowtie-icon bowtie-math-minus-circle',
        NOT_READY: 'bowtie-icon bowtie-status-waiting-fill',
        REJECT: 'bowtie-icon bowtie-status-failure'
    };

    public initializeOptions(options?: Grids.IGridOptions) {
        var that = this;
        let identityPickerConsumerID =  "030e434e-0f6f-4367-aa58-435f814dbd88"; //This is used for tracking SPS usage sourced from this widget
        super.initializeOptions($.extend(<Grids.IGridOptions>{
            cssClass: Constants.GRID_CSS_CLASS,
            allowMultiSelect: false,
            header: false,
            gutter: {
                contextMenu: false
            },
            // Ensure that all items are always visible, since we limit their number before passing them to the grid
            extendViewportBy: Constants.GRID_MAX_ITEM_COUNT,
            columns: <any[]>[
                {
                    index: 'avatar',
                    width: Constants.GRID_AVATAR_CELL_WIDTH,
                    getCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        var pullRequest = <TFS_VersionControl_Contracts.GitPullRequest>that.getRowData(dataIndex);

                        var cell = that._drawCell.apply(that, arguments)
                            .html('')
                            .addClass(Constants.GRID_AVATAR_CELL_CSS_CLASS);

                        var identityRef: TFS_OM_Identities.IIdentityReference = pullRequest.createdBy;
                        var item = (identityRef && identityRef.id);

                        var avatarContainer = $("<div>").addClass(Constants.GRID_AVATAR_CELL_AVATAR_CSS_CLASS).appendTo(cell);
                        // Note: omitting operationScope to use the defaults provided by the control
                        Controls.create(Identities_Picker_Controls.IdentityDisplayControl, avatarContainer, <Identities_Picker_Controls.IIdentityDisplayOptions>{
                            consumerId: identityPickerConsumerID,
                            identityType: { User: true },
                            displayType: Identities_Picker_Controls.EDisplayControlType.AvatarText,
                            friendlyDisplayName: pullRequest.createdBy.displayName,
                            item: item,
                            size: Identities_Picker_Controls.IdentityPickerControlSize.Large,
                            turnOffHover: true,
                        });
                        return cell;
                    }
                },
                {
                    index: 'data',
                    width: Constants.GRID_DATA_CELL_WIDTH,
                    getCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        var pullRequest = <TFS_VersionControl_Contracts.GitPullRequest>that.getRowData(dataIndex);

                        var cell = that._drawCell.apply(that, arguments)
                            .html('')
                            .addClass(Constants.GRID_DATA_CELL_CSS_CLASS);

                        var titleLink =
                            $("<a>")
                                .attr("href", PullRequestUtils.getPullRequestUrl(Context.getDefaultWebContext(), pullRequest.repository.name, pullRequest.pullRequestId))
                                .attr("tabindex", -1) //we do this to avoid having the link inside nab the tabbing.
                                .text(pullRequest.title);

                        // as the row click is being managed exclusively through a custom click event handler, we prevent default behaviour on the a link here
                        titleLink.on("click", (event: JQueryEventObject) => { event.preventDefault(); });

                        var titleContainer = ($("<div>")
                            .addClass(Constants.GRID_DATA_CELL_TITLE_CSS_CLASS)
                            .append(titleLink));

                        // make the time diff to one minute, to avoid getting a long string - "less than a minute ago"
                        var createdDate = that._roundUpToOneMinute(pullRequest.creationDate);
                        var createdByHtml = $("<span/>")
                            .addClass(Constants.GRID_DATA_CELL_CREATED_BY_CSS_CLASS)
                            .text(pullRequest.createdBy.displayName)[0].outerHTML;

                        var detailsHtmlString = Utils_String.format(Resources.PullRequestWidgetDetailsFormat,
                            createdByHtml,
                            Utils_String.htmlEncode(GitRefUtility.getRefFriendlyName(pullRequest.targetRefName)),
                            Utils_String.htmlEncode(Utils_String.format(Resources.PullRequestWidgetCreatedDateFormat, Utils_Date.ago(createdDate))));

                        var detailsContainer = ($("<div>")
                            .addClass(Constants.GRID_DATA_CELL_DETAILS_CSS_CLASS)
                            .html(detailsHtmlString)); //User supplied inputs to this synthesized html string are encoded.

                        titleContainer.attr('title', titleContainer.text()).appendTo(cell);
                        detailsContainer.attr('title', detailsContainer.text()).appendTo(cell);

                        return cell;
                    }
                },
                {
                    index: 'icon',
                    width: Constants.GRID_ICON_CELL_WIDTH,
                    getCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        var pullRequest = <TFS_VersionControl_Contracts.GitPullRequest>that.getRowData(dataIndex);

                        var cell = that._drawCell.apply(that, arguments);
                        cell.html('');
                        var voteStatus = PullRequestManager.PullRequestManager.getMinimumVoteStatus(pullRequest);
                        var prIcon = ($("<div>")
                            .addClass('icon')
                            .addClass(PullRequestWidgetGrid.ICON_CLASS_MAP[PullRequestVoteStatus[voteStatus]]))
                            .addClass(Constants.GRID_ICON_CELL_CSS_CLASS);

                        var iconContainer = $("<div>").addClass(Constants.GRID_ICON_CELL_ICON_CSS_CLASS);
                        prIcon.appendTo(iconContainer);
                        iconContainer.attr('title', TFS_PullRequest.PullRequestVoteStatusUtils.voteDescription(voteStatus));

                        iconContainer.appendTo(cell);
                        return cell;
                    }
                }]
        }, options));
    }

    public _onContainerMouseDown() {
        // Overriding to suppress behavior. The base grid implementation sets focus on
        // the grid canvas when a click event occurs. This causes a problem where the <a>
        // elements in the grid are not clickable in Chrome.
    }

    public _onRowClick(event): any {
        return this.onOpenRowDetail(event);
    }

    public onOpenRowDetail(event) {
        const enterKey = 13;
        const middleClick = 2;
        const leftClick = 1;

        var rowInfo =  this._getRowInfoFromEvent(event, ".grid-row") || event.rowInfo;
        if (event.which == undefined && event.event.which) {
            event.which = event.event.which;
        }

        if (rowInfo && (event.which == leftClick || event.which == middleClick || event.which == enterKey)) {
            var id = this.getRowData(rowInfo.dataIndex)['pullRequestId'];
            var repository = this.getRowData(rowInfo.dataIndex)['repository'];
            var features: string = null;

            let target: string = "_blank";
            if (event.shiftKey) {
                features = `height = ${screen.availHeight}, width = ${screen.availWidth}`;
            } else if (!event.ctrlKey
                && event.which !== middleClick
                && !WidgetLinkHelper.mustOpenNewWindow()) {

                target = "_self";
            }

            this._fire(Events.ROW_CLICK_EVENT, {
                id: id,
                repository: repository,
                target: target,
                features: features
            });
        }
    }

    /**
     * Overwrite. Only apply row selection style if the grid is active, otherwise remove all stylings.
     */
    public _updateRowSelectionStyle(rowInfo, selectedRows, focusIndex) {
        if (this._active) {
            super._updateRowSelectionStyle(rowInfo, selectedRows, focusIndex);
        }
        return;
    }

    public initialize() {
        super.initialize();
        this._rowHeight = Constants.GRID_ROW_HEIGHT;

        var dataColumns = this._columns.filter((column) => {
            return column.index === 'data';
        });
        var dataColumn = dataColumns[0];
        dataColumn.width = Constants.GRID_DATA_CELL_WIDTH;

        this.getElement().focusout(() => {
            if (this.getElement().has(":focus").length === 0) {
                this._active = false;
                this.layout();
            }
        });
    }

    private _roundUpToOneMinute(date: Date): Date {
        var diff = new Date().getTime() - date.getTime();
        if (diff < 60000) {
            return new Date(date.getTime() - (60000 - diff));
        }

        return date;
    }
}

interface IViewPickerItem extends Navigation.IPivotFilterItem {
    action: string;
    queryType: PullRequestManager.QueryType;
}

export class PullRequestWidgetView extends BaseWidget.BaseWidgetControl<Dashboards_UIContracts.WidgetOptions> implements Dashboards_WidgetContracts.IConfigurableWidget{
    private _$titleElement: JQuery;
    private _$titleCount: JQuery;
    private _$gridContainer: JQuery;
    private _$viewFilterContainer: JQuery;
    private _$showMoreAnchor: JQuery;
    private _$resultsContainer: JQuery;
    private _$noResultsContainer: JQuery;
    private _$noResultsMessage: JQuery;
    private _$noResultsSymbol: JQuery;
    private _$errorContainer: JQuery;
    private _$errorMessage: JQuery;
    private _$errorSymbol: JQuery;

    private _grid: PullRequestWidgetGrid;
    private _viewFilter: Navigation.PivotFilter;
    private _manager: PullRequestManager.PullRequestManager;
    private _startLoadTime: number;

    private _rawSettings: string;
    private _widgetSettings: Configuration.IPullRequestWidgetSettings;
    private _widgetSize: TFS_Dashboards_Contracts.WidgetSize;
    private _widgetTitle: string;
    private _currentFilterView: string;

    private static ViewPickerPivotFilterModel: IViewPickerItem[] = [
        { action: ViewActions.VIEW_ASSIGNED_TO_TEAM, text: VCResources.PullRequest_Filter_AssignedToTeam, queryType: PullRequestManager.QueryType.AssignedToTeam },
        { action: ViewActions.VIEW_ASSIGNED_TO_ME, text: VCResources.PullRequest_Filter_AssignedToMe, queryType: PullRequestManager.QueryType.AssignedToMe },
        { action: ViewActions.VIEW_CREATED_BY_ME, text: VCResources.PullRequest_Filter_CreatedByMe, queryType: PullRequestManager.QueryType.CreatedByMe }
    ];

    public __test() {
        return {
            $titleAnchor: this._$titleElement,
            $titleCount: this._$titleCount,
            $gridContainer: this._$gridContainer,
            $showMoreAnchor: this._$showMoreAnchor,
            $noResultsContainer: this._$noResultsContainer,
            $noResultsMessage: this._$noResultsMessage,
            $noResultsSymbol: this._$noResultsSymbol,
            $errorContainer: this._$errorContainer,
            $resultsContainer: this._$resultsContainer,
            viewFilter: this._viewFilter,
            grid: this._grid,
            repo: this._widgetSettings.repo
        };
    }

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: Constants.CORE_CSS_CLASS
        }, options));
    }

    public initialize() {
        super.initialize();
    }

    /**
    * This tells the framework to show the stakeholder view if the current user is a stakeholder
    */
    public disableWidgetForStakeholders(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<boolean> {
        return Q(true);
    }

    public preload(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        this._manager = new PullRequestManager.PullRequestManager();
        this._initializeWidgetContext(settings);
        this._initializeLayout();
        this._bind(Events.ROW_CLICK_EVENT, delegate(this, this._onRowClick));
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public load(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return this.loadWidget(this._widgetSettings, settings);
    }

    private _parseSettings(settings: string): Configuration.IPullRequestWidgetSettings {
        var widgetSettings: Configuration.IPullRequestWidgetSettings = {
            repo: null,
            queryType: null
        }

        if (!settings) {
            return widgetSettings;
        }

        try {
            widgetSettings = JSON.parse(settings);
        } catch (e) {
            this._logWidgetLoadFailure(e.message);
        }

        return widgetSettings;
    }

    private _initializeWidgetContext(settings: Dashboards_WidgetContracts.WidgetSettings) {
        this._rawSettings = settings.customSettings.data;
        this._widgetSettings = this._parseSettings(this._rawSettings);
        this._widgetTitle = settings.name;
    }

    public _initializeLayout() {
        this._element.html(WIDGET_TEMPLATE); //Note: Widget template is a constant describing the UI layout structure.
        this._$titleElement = this._getElementByClass(Constants.TITLE_CSS_CLASS);
        this._$titleCount = this._getElementByClass(Constants.TITLE_COUNT_CSS_CLASS);
        this._$gridContainer = this._getElementByClass(Constants.GRID_CONTAINER_CSS_CLASS);
        this._$viewFilterContainer = this._getElementByClass(Constants.VIEW_FILTER_CSS_CLASS);
        this._$showMoreAnchor = this._getElementByClass(Constants.SHOW_MORE_CSS_CLASS);
        this._$resultsContainer = this._getElementByClass(Constants.RESULTS_CONTAINER_CSS_CLASS);
        this._$noResultsContainer = this._getElementByClass(Constants.NO_RESULTS_CONTAINER_CSS_CLASS);
        this._$noResultsMessage = this._getElementByClass(Constants.NO_RESULTS_MESSAGE_CSS_CLASS);
        this._$noResultsSymbol = this._getElementByClass(Constants.NO_RESULTS_SYMBOL_CSS_CLASS);
        this._$errorContainer = this._getElementByClass(Constants.ERROR_CONTAINER_CSS_CLASS);
        this._$errorMessage = this._getElementByClass(Constants.ERROR_MESSAGE_CSS_CLASS);
        this._$errorSymbol = this._getElementByClass(Constants.ERROR_SYMBOL_CSS_CLASS);

        this._collapseAll();

        this._grid = <PullRequestWidgetGrid>Controls.BaseControl.createIn(PullRequestWidgetGrid, this._$gridContainer);

        this._$resultsContainer.hide();

        this._createViewFilterControl();
        this._setTitle(Resources.PullRequestWidgetTitle);

        this._$showMoreAnchor.text(Resources.PullRequestWidgetViewAllAnchorText);
        this._$showMoreAnchor.click(delegate(this, this._onShowMoreClick));

        if (WidgetLinkHelper.mustOpenNewWindow()) {
            this._$showMoreAnchor.attr("target", "_blank");
        }

        this._$noResultsSymbol.append($("<img/>").attr("src", tfsContext.configuration.getResourcesFile("chart-noresult-3.png")));
        this._$noResultsMessage.text(Resources.PullRequestWidgetNoResultsEmptyMessage);
        this._$errorSymbol.text(Resources.PullRequestWidgetNoResultsErrorSymbol);
    }

    public loadWidget(widgetSettings: Configuration.IPullRequestWidgetSettings, settings: Dashboards_WidgetContracts.WidgetSettings):
        IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        var promise: Q.IPromise<Dashboards_WidgetContracts.WidgetStatus>;

        if (!widgetSettings || !widgetSettings.repo || !widgetSettings.queryType) {
            this.showUnConfiguredControl(settings.size, settings.name);
            promise = WidgetHelpers.WidgetStatusHelper.Unconfigured();
        } else {
            this._widgetSize = settings.size;

            promise = this._loadAndUpdate(widgetSettings, settings.size);
        }

        return promise;
    }

    public reload(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        var promise: Q.IPromise<Dashboards_WidgetContracts.WidgetStatus>;

        this._widgetTitle = settings.name;

        if (this._isRawSettingsUnchanged(settings.customSettings.data) && settings.size.rowSpan === this._widgetSize.rowSpan) {
            this._setTitle(this._widgetTitle);
            promise = WidgetHelpers.WidgetStatusHelper.Success();
        } else {
            this.hideUnConfiguredControl();
            this._rawSettings = settings.customSettings.data;
            this._widgetSettings = this._parseSettings(this._rawSettings);
            this._widgetSize = settings.size;

            if (!this._widgetSettings) {
                return WidgetHelpers.WidgetStatusHelper.Failure(Resources.InvalidConfigurationReconfigure);
            }

            promise = this._loadAndUpdate(this._widgetSettings, this._widgetSize);
        }

        return promise;
    }

    /**
   * Checks if raw settings has been updated or remain unchanged
   * @param {string} new settings provided to the widget
   * @returns boolean
   */
    public _isRawSettingsUnchanged(newSettings: string): boolean {

        // if both have valid strings, compare to identify change.
        if (this._rawSettings && newSettings) {
            return this._rawSettings === newSettings;
        }

        // if both are empty or undefined.
        else if (!this._rawSettings && !newSettings) {
            return true;
        }

        // if one if null but not the other, settings has changed.
        else {
            return false;
        }
    }

    public loadPullRequests(widgetSettings: Configuration.IPullRequestWidgetSettings, widgetSize: TFS_Dashboards_Contracts.WidgetSize): IPromise<void> {
        if (!widgetSettings || !widgetSettings.repo || !widgetSettings.queryType) {
            return Q.reject<void>('Invalid widget settings');
        }

        this._startLoadTime = Date.now();

        var pullRequestPromise = this._manager.getPullRequests(widgetSettings.repo.id, widgetSettings.queryType, Constants.QUERY_SIZE);
        // We make a call for the repo so that we get the updated name
        var repositoryPromise = this._manager.getRepository(widgetSettings.repo.id);

        return Q.spread<any, void>([pullRequestPromise, repositoryPromise], (result: PullRequestManager.PullRequestResult, repo: TFS_VersionControl_Contracts.GitRepository) => {
                var renderedCount: number = 0;
                if (result.PullRequests.length > 0) {
                    renderedCount = this._displayResult(result, widgetSize);
                }
                else {
                    this._displayEmptyResult();
                }

                this._updateHeader(result, repo);
            }, (err: Error) => {
                return Q.reject<Error>(err) as any;
            });
    }

    private _loadAndUpdate(widgetSettings: Configuration.IPullRequestWidgetSettings, widgetSize: TFS_Dashboards_Contracts.WidgetSize) {
        return this.loadPullRequests(this._widgetSettings, this._widgetSize)
            .then(() => {
                this._updateViewFilter(this._widgetSettings.queryType);
                this._$showMoreAnchor.attr("aria-label",
                    Utils_String.format(
                        Resources.PullRequest_ViewAllAriaLabel_Format, this._widgetSettings.repo.name));
                return WidgetHelpers.WidgetStatusHelper.Success();
            }, (error: Error|string) => {
                return WidgetHelpers.WidgetStatusHelper.Failure(error instanceof Error ? error.message : <string>error);
            });
    }

    private _updateViewFilter(selectedView: PullRequestManager.QueryType) {
        var items = this._clonePivotFilterModel().map((item, i, array) => {
            if (item.queryType === selectedView) {
                this._currentFilterView = item.text;
                item.selected = true;
            }
            return item;
        });

        this._viewFilter.updateItems(items);
    }

    private _clonePivotFilterModel(): IViewPickerItem[] {
        return PullRequestWidgetView.ViewPickerPivotFilterModel.map((item, index, array) => {
            return <IViewPickerItem>{
                action: item.action,
                queryType: item.queryType,
                text: item.text
            }
        });
    }

    private _createViewFilterControl() {
        this._viewFilter = <Navigation.PivotFilter>Controls.BaseControl.createIn(Navigation.PivotFilter, this._$viewFilterContainer, {
            behavior: 'dropdown',
            align: 'right-bottom',
            text: Resources.PullRequestWidgetViewFilterTitle,
            items: this._clonePivotFilterModel(),
            change: delegate(this, this._onFilterChange)
        });
    }

    private _getElementByClass(className: string): JQuery {
        return this.getElement().find("." + className);
    }

    private _displayResult(result: PullRequestManager.PullRequestResult, widgetSize: TFS_Dashboards_Contracts.WidgetSize): number {
        var truncatedResult = result.PullRequests.slice(0, Constants.GRID_ITEM_COUNT_MAP[widgetSize.rowSpan] || Constants.GRID_MAX_ITEM_COUNT);
        this._grid.setDataSource(truncatedResult, null, null, null, 0);
        this._collapseAll();
        this._$resultsContainer.show();
        return truncatedResult.length;
    }

    private _displayEmptyResult() {
        this._collapseAll();
        this._$noResultsContainer.show();
    }

    private _setTitle(title: string) {
        this._$titleElement.text(title);
        this.addTooltipIfOverflow(this._$titleElement);
    }

    private _updateHeader(result: PullRequestManager.PullRequestResult, repo: TFS_VersionControl_Contracts.GitRepository) {
        var widgetTitle = this._getWidgetTitle();
        this._setTitle(widgetTitle || Resources.PullRequestWidgetTitle);

        this._$showMoreAnchor.attr('href', PullRequestUtils.getPullRequestUrl(this.webContext, repo.name));
        this._$titleCount.text(Utils_String.format(Resources.PullRequestWidgetTitleCountFormat, result.Total));
        if(result.Total === 0){
            this._$titleCount.hide();
        }else{
            this._$titleCount.show();
        }
    }

    private _getWidgetTitle(): string {
        var widgetName = this._widgetTitle;
        if (this._widgetSettings && this._widgetSettings.repo && this._widgetSettings.repo.name) {
            var currentArtifactname = this._getPullRequestWidgetTitle(this._widgetSettings.repo.name);

            widgetName = Widgets_LiveTitle.WidgetLiveTitleViewer.getLiveTitle(widgetName,
                this._widgetSettings, currentArtifactname);
        }
        return widgetName;
    }

    private _getPullRequestWidgetTitle(repoName: string): string {
        return Utils_String.format(Resources.PullRequestWidgetTitleFormat, repoName);
    }

    private _collapseAll() {
        this._$noResultsContainer.hide();
        this._$resultsContainer.hide();
        this._$errorContainer.hide();
    }

    private _onFilterChange(item) {
        var queryType: PullRequestManager.QueryType;
        if (item.action === ViewActions.VIEW_ASSIGNED_TO_TEAM) {
            queryType = PullRequestManager.QueryType.AssignedToTeam;
        } else if (item.action === ViewActions.VIEW_CREATED_BY_ME) {
            queryType = PullRequestManager.QueryType.CreatedByMe;
        } else if (item.action === ViewActions.VIEW_ASSIGNED_TO_ME) {
            queryType = PullRequestManager.QueryType.AssignedToMe;
        }

        for (var i = 0; i < PullRequestWidgetView.ViewPickerPivotFilterModel.length; i++) {
            if (PullRequestWidgetView.ViewPickerPivotFilterModel[i].queryType === queryType) {
                this._currentFilterView = PullRequestWidgetView.ViewPickerPivotFilterModel[i].text;
                break;
            }
        }

        var telemetryProperties: { [key: string]: string } = { "queryType": this._currentFilterView };
        WidgetTelemetry.WidgetTelemetry.onWidgetClick(this.getTypeId(), Events.VIEW_CHANGE_EVENT, telemetryProperties);

        var settings: Configuration.IPullRequestWidgetSettings = {
            repo: this._widgetSettings.repo,
            queryType: queryType
        };
        this.loadPullRequests(settings, this._widgetSize);
    }

    private _onShowMoreClick(e: JQueryEventObject) {
        WidgetTelemetry.WidgetTelemetry.onWidgetClick(this.getTypeId(), Events.SHOW_MORE_CLICK_EVENT);
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAllowFpsWidgets, false)) {
            Service.getLocalService(HubsService).navigateToHub(CodeHubContributionIds.pullRequestHub, this._$showMoreAnchor.attr("href"));
            e.stopPropagation();
        }
    }

    private _onRowClick(e, args) {
        var url = PullRequestUtils.getPullRequestUrl(this.webContext, args.repository.name, args.id);

        var telemetryProperties: { [key: string]: string } = { "pullRequestId": args.id, "currentView": this._currentFilterView };
        WidgetTelemetry.WidgetTelemetry.onWidgetClick(this.getTypeId(), Events.ROW_CLICK_EVENT, telemetryProperties);

        if (args.target == "_self" && FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAllowFpsWidgets, false)) {
            Service.getLocalService(HubsService).navigateToHub(CodeHubContributionIds.pullRequestHub, url);
        }
        else if (args.features) {
            window.open(url, args.target, args.features);
        }
        else {
            window.open(url, args.target);
        }
    }

    private _logWidgetLoadFailure(error: string) {
        WidgetTelemetry.PullRequestTelemetry.publish(WidgetTelemetry.PullRequestTelemetry.WIDGET_LOAD_ERROR, { "error": error });
    }
}
Controls.Enhancement.registerEnhancement(PullRequestWidgetView, "." + Constants.CORE_CSS_CLASS);

SDK.VSS.register("Microsoft.VisualStudioOnline.MyWork.PullRequestWidget", () => PullRequestWidgetView);
SDK.registerContent("Microsoft.VisualStudioOnline.MyWork.PullRequestWidget.Initialize", (context) => {
    return Controls.create(PullRequestWidgetView, context.$container, context.options);
});

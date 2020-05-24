///<amd-dependency path='VSS/LoaderPlugins/Css!MyWork' />
import Controls = require("VSS/Controls");
import CoreTfsApi = require("TFS/Core/RestClient");
import Dashboards_UIContracts = require("Dashboards/Scripts/Contracts");
import Events_Action = require("VSS/Events/Action");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import MyWorkTelemetry = require("MyWork/Scripts/TFS.MyWork.Telemetry");
import ProjectsAndTeams_Widget_Api = require("MyWork/Scripts/TFS.MyWork.Widget.ProjectsAndTeams");
import Resources = require("MyWork/Scripts/Resources/TFS.Resources.MyWork");
import SDK = require("VSS/SDK/Shim");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import HostUIActions = require("Presentation/Scripts/TFS/TFS.Host.UI.Actions");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import VSS = require("VSS/VSS");

var delegate = Utils_Core.delegate;
var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export module ProjectsAndTeamsWidgetViewConstants {
    export var CORE_CSS_CLASS = "projectsAndTeams-widget-view";
    export var MENU_CONTAINER_CSS_CLASS = "projectsAndTeams-widget-view-menu-container";
    export var GRID_CONTAINER_CSS_CLASS = "projectsAndTeams-widget-view-grid-container";
    export var TITLE_CSS_CLASS = "projectsAndTeams-widget-view-title";
    export var GRID_CSS_CLASS = "projectsAndTeams-widget-grid";
    export var NO_RESULTS_CONTAINER_CSS_CLASS = "projectsAndTeams-widget-no-results-container";
    export var NO_RESULTS_MESSAGE_CSS_CLASS = "projectsAndTeams-widget-no-results-message";
    export var NO_RESULTS_SYMBOL_CSS_CLASS = "projectsAndTeams-widget-no-results-symbol";

    export var LAST_ACCESSED_CSS_CLASS = "projectsAndTeams-widget-grid-content-lastaccessed";
    export var PROJECT_OR_TEAM_NAME_CSS_CLASS = "projectsAndTeams-widget-grid-content-name";
    export var PROJECT_OR_TEAM_NAME_CONTAINER_CSS_CLASS = "projectsAndTeams-widget-grid-content-name-container";
    export var GRID_ROW_ICON_CSS_CLASS = "projectsAndTeams-widget-grid-content-icon";
    export var GRID_ROW_ICON_CONTAINER_CSS_CLASS = "projectsAndTeams-widget-grid-content-icon-container";
    export var PROJECT_ICON_CSS_CLASS = "projectsAndTeams-widget-project-icon";
    export var TEAM_ICON_CSS_CLASS = "projectsAndTeams-widget-team-icon";
    export var CLOSE_ICON_CSS_CLASS = "projectsAndTeams-widget-close-icon";
    export var CLOSE_ICON_CONTAINER_CSS_CLASS = "projectsAndTeams-widget-close-icon-container";

    export var REFRESH_INTERVAL = 5 * 60 * 1000;
    export var GRID_ROW_HEIGHT = 50;

    export var NEW_PROJECT_COMMAND = "new-project";
    export var BROWSE_PROJECTS_COMMAND = "browseTeams";
    export var REMOVE_FROM_MRU_COMMAND = "removeFromMRU";

    export var NEW_PROJECT_EVENT = "NewProjectEvent";
    export var BROWSE_PROJECTS_EVENT = "BrowseProjectsEvent";
    export var CLICK_PROJECT_EVENT = "ClickProjectEvent";
    export var REMOVE_FROM_MRU_EVENT = "removeFromMRUEvent";
    export var NEW_WIDGET_NON_DASHBOARD_MODE = "non-dashboard-mode";
}

export module ProjectsAndTeamsDataIndices {
    export var Text = "Text";
    export var LastAccessed = "LastAccessed";
    export var HashCode = "HashCode";
    export var IsTeam = "IsTeam";
    export var Url = "Url";
}

var HTML_TEMPLATE = "" +
    "  <span class='" + ProjectsAndTeamsWidgetViewConstants.TITLE_CSS_CLASS + "'/>" +
    "  <div class='" + ProjectsAndTeamsWidgetViewConstants.MENU_CONTAINER_CSS_CLASS + "'/>" +
    "  <div class='" + ProjectsAndTeamsWidgetViewConstants.GRID_CONTAINER_CSS_CLASS + "'/>" +
    "  <div class='" + ProjectsAndTeamsWidgetViewConstants.NO_RESULTS_CONTAINER_CSS_CLASS + "'>" +
    "      <div class='" + ProjectsAndTeamsWidgetViewConstants.NO_RESULTS_MESSAGE_CSS_CLASS + "'/>" +
    "      <div class='" + ProjectsAndTeamsWidgetViewConstants.NO_RESULTS_SYMBOL_CSS_CLASS + "'/>" +
    "  </div>";

export class ProjectsAndTeamsWidgetGrid extends Grids.Grid {
    public projectsAndTeamsManager: ProjectsAndTeams_Widget_Api.ProjectsAndTeamsManager;

    public static ICON_WIDTH = 25;
    private static TEXT_WIDTH = 235;
    private static CLOSE_WIDTH = 16;
    

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: ProjectsAndTeamsWidgetViewConstants.GRID_CSS_CLASS,
            allowMultiSelect: false,
            header: false,
            sortOrder: [{
                index: ProjectsAndTeamsDataIndices.LastAccessed,
                order: 'desc'
            }],
            gutter: {
                contextMenu: false,
            },
            columns: <any[]>[
                {
                    index: ProjectsAndTeamsDataIndices.IsTeam,
                    width: ProjectsAndTeamsWidgetGrid.ICON_WIDTH,
                    getCellContents: function (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        var cell = $("<div />").addClass("grid-cell").addClass(ProjectsAndTeamsWidgetViewConstants.GRID_ROW_ICON_CONTAINER_CSS_CLASS);
                        var $icon = $("<div />").addClass(ProjectsAndTeamsWidgetViewConstants.GRID_ROW_ICON_CSS_CLASS);

                        var isTeam = this.getRowData(dataIndex)[ProjectsAndTeamsDataIndices.IsTeam];
                        if (isTeam) {
                            $icon.addClass(ProjectsAndTeamsWidgetViewConstants.TEAM_ICON_CSS_CLASS);
                        } else {
                            $icon.addClass(ProjectsAndTeamsWidgetViewConstants.PROJECT_ICON_CSS_CLASS);
                        }

                        cell.append($icon);
                        return cell;
                    }
                },
                {
                    index: ProjectsAndTeamsDataIndices.Text,
                    width: ProjectsAndTeamsWidgetGrid.TEXT_WIDTH,
                    getCellContents: function (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {

                        var rowData = this.getRowData(dataIndex);
                        var text = rowData[ProjectsAndTeamsDataIndices.Text];
                        var lastAccessed = rowData[ProjectsAndTeamsDataIndices.LastAccessed];
                        var lastAccessedFriendly = Utils_Date.ago(new Date(lastAccessed));

                        var cell = $("<div />").addClass("grid-cell").addClass(ProjectsAndTeamsWidgetViewConstants.PROJECT_OR_TEAM_NAME_CONTAINER_CSS_CLASS);
                        var $name = $("<div />").text(text).addClass(ProjectsAndTeamsWidgetViewConstants.PROJECT_OR_TEAM_NAME_CSS_CLASS);
                        var $lastAccessed = $("<div />").text(lastAccessedFriendly).addClass(ProjectsAndTeamsWidgetViewConstants.LAST_ACCESSED_CSS_CLASS);

                        cell.append($name);
                        cell.append($lastAccessed);
                        return cell;
                    }
                },
                {
                    width: ProjectsAndTeamsWidgetGrid.CLOSE_WIDTH,
                    getCellContents: function (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        var cell = $("<div />").addClass("grid-cell").addClass(ProjectsAndTeamsWidgetViewConstants.CLOSE_ICON_CONTAINER_CSS_CLASS);
                        var rowData = this.getRowData(dataIndex);

                        var $closeIcon = $("<div />").addClass("icon").addClass("icon-close").addClass(ProjectsAndTeamsWidgetViewConstants.CLOSE_ICON_CSS_CLASS)
                            .mousedown((e) => {
                                if (e.which === 1) {
                                    this._fire(
                                        ProjectsAndTeamsWidgetViewConstants.REMOVE_FROM_MRU_EVENT,
                                        {
                                            hashCode: rowData[ProjectsAndTeamsDataIndices.HashCode],
                                            url: rowData[ProjectsAndTeamsDataIndices.Url]
                                        });
                                    e.stopImmediatePropagation();
                                }
                            });
                        cell.append($closeIcon);

                        return cell;
                    }
                }]
        }, options));
    }

    public _onRowMouseDown(e): any {

        if (e.which === 1) {

            var target: string;
            var features: string = null;

            if (!e.shiftKey) {
                target = e.ctrlKey ? "_blank" : "_self";
            } else {
                target = "_blank";
                features = Utils_String.format("height = {0}, width = {1}", screen.availHeight, screen.availWidth);
            }

            var rowInfo = this._getRowInfoFromEvent(e, ".grid-row");
            if (rowInfo) {

                var rowData = this.getRowData(rowInfo.dataIndex);

                this._fire(ProjectsAndTeamsWidgetViewConstants.CLICK_PROJECT_EVENT, { rowData: rowData, target: target, features: features });
            }
        }

        if (e.which === 3) {
            super._onRowMouseDown(e);
        }
    }

    public _updateRowSelectionStyle(rowInfo, selectedRows, focusIndex) {
        //Leaving this function empty since we don't want any kind of highliting on the grid.
        return;
    }

    public initialize() {
        super.initialize();
    }
}

export class ProjectsAndTeamsWidgetMenu extends Menus.MenuBar {

    private _$newProjectAction: JQuery;
    private _$menuBar: JQuery;
    private _$browseProjectsAction: JQuery;
    private _projectsAndTeamsManager: ProjectsAndTeams_Widget_Api.ProjectsAndTeamsManager;
    private _canCreateProject: boolean;

    public __test() {
        var that = this;
        return {
            $newProjectAction: this._$newProjectAction,
            $browseProjectsAction: this._$browseProjectsAction,
            $menubar: this._$menuBar,
            projectsAndTeamsManager: this._projectsAndTeamsManager
        };
    }

    public initialize() {

        this._projectsAndTeamsManager = new ProjectsAndTeams_Widget_Api.ProjectsAndTeamsManager(tfsContext);

        this._projectsAndTeamsManager.getUserPermission()
            .then((canCreateProject: boolean) => {

                this._canCreateProject = canCreateProject;

                super.initialize();

                this._$menuBar = this._element.find('.' + ProjectsAndTeamsWidgetViewConstants.MENU_CONTAINER_CSS_CLASS).first();
                this._$newProjectAction = this._element.find("[command='" + ProjectsAndTeamsWidgetViewConstants.NEW_PROJECT_COMMAND + "']").first();
                this._$browseProjectsAction = this._element.find("[command='" + ProjectsAndTeamsWidgetViewConstants.BROWSE_PROJECTS_COMMAND + "']").first();

                this._bind(ProjectsAndTeamsWidgetViewConstants.BROWSE_PROJECTS_EVENT, delegate(this, this._onBrowseProjects));

                if (canCreateProject) {
                    this._bind(ProjectsAndTeamsWidgetViewConstants.NEW_PROJECT_EVENT, delegate(this, this._onNewProject));
                } else {
                    this._$newProjectAction.hide();
                }
            });
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            items: this._createMenubarItems,
            executeAction: delegate(this, this._onMenuItemClick)
        }, options));
    }

    private _createMenubarItems(): any[] {
        var that = this;
        var menuItems = [];

        menuItems.push({ id: ProjectsAndTeamsWidgetViewConstants.NEW_PROJECT_COMMAND, text: Resources.ProjectsAndTeamsWidgetGridContextMenuNewText, title: Resources.ProjectsAndTeamsWidgetGridContextMenuNewText, showText: true, });
        menuItems.push({ rank: 10, id: ProjectsAndTeamsWidgetViewConstants.BROWSE_PROJECTS_COMMAND, cssClass: "browse-all", text: Resources.ProjectsAndTeamsWidgetGridContextMenuBrowseText, title: Resources.ProjectsAndTeamsWidgetGridContextMenuBrowseText, showText: true });

        return menuItems;
    }

    private _onMenuItemClick(e?) {
        var command = e.get_commandName(),
            args = e.get_commandArgument();

        switch (command) {
            case ProjectsAndTeamsWidgetViewConstants.NEW_PROJECT_COMMAND:
                this._fire(ProjectsAndTeamsWidgetViewConstants.NEW_PROJECT_EVENT);
                break;

            case ProjectsAndTeamsWidgetViewConstants.BROWSE_PROJECTS_COMMAND:
                this._fire(ProjectsAndTeamsWidgetViewConstants.BROWSE_PROJECTS_EVENT);
                break;
        }
    }

    private _onNewProject(e, data) {
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryProjectNav(ProjectsAndTeamsWidgetViewConstants.NEW_PROJECT_EVENT, {});
        Events_Action.getService().performAction(HostUIActions.ACTION_NEW_PROJECT, {
            tfsContext: tfsContext,
            source: MyWorkTelemetry.TelemetryConstants.MYWORK_AREA
        });
    }

    private _onBrowseProjects(e, data) {
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryProjectNav(ProjectsAndTeamsWidgetViewConstants.BROWSE_PROJECTS_EVENT, {});
    }
}

export class ProjectsAndTeamsWidgetView extends Controls.BaseControl {
    private _tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
    private _$titleAnchor: JQuery;
    private _$menuBar: JQuery;
    private _$gridContainer: JQuery;
    private _$noResultsContainer: JQuery;
    private _$noResultsMessage: JQuery;
    private _menuBar: Menus.MenuBar;
    private _grid: ProjectsAndTeamsWidgetGrid;
    private _projectsAndTeamsManager: ProjectsAndTeams_Widget_Api.ProjectsAndTeamsManager;
    private _startLoadTime: number;

    public __test() {
        return {
            tfsContext: this._tfsContext,
            $titleAnchor: this._$titleAnchor,
            $gridContainer: this._$gridContainer,
            $noResultsContainer: this._$noResultsContainer,
            $noResultsMessage: this._$noResultsMessage,
            grid: this._grid,
            menuBar: this._menuBar,
            projectsAndTeamsManager: this._projectsAndTeamsManager
        };
    }

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: ProjectsAndTeamsWidgetViewConstants.CORE_CSS_CLASS
        }, options));
    }

    public initialize() {
        this._startLoadTime = Date.now();
        super.initialize();
        this._projectsAndTeamsManager = new ProjectsAndTeams_Widget_Api.ProjectsAndTeamsManager(tfsContext);

        this._bind(ProjectsAndTeamsWidgetViewConstants.CLICK_PROJECT_EVENT, delegate(this, this._onProjectClick));
        this._bind(ProjectsAndTeamsWidgetViewConstants.REMOVE_FROM_MRU_EVENT, delegate(this, this._onRemoveFromMRU));

        this.DisplayContent();
    }

    public DisplayContent() {
        this.getElement().addClass(ProjectsAndTeamsWidgetViewConstants.NEW_WIDGET_NON_DASHBOARD_MODE);

        var that = this;
        this._element.html(HTML_TEMPLATE);

        this._$titleAnchor = this._element.find('.' + ProjectsAndTeamsWidgetViewConstants.TITLE_CSS_CLASS).first();
        this._$menuBar = this._element.find('.' + ProjectsAndTeamsWidgetViewConstants.MENU_CONTAINER_CSS_CLASS).first();
        this._$gridContainer = this._element.find('.' + ProjectsAndTeamsWidgetViewConstants.GRID_CONTAINER_CSS_CLASS).first();
        this._$noResultsContainer = this._element.find('.' + ProjectsAndTeamsWidgetViewConstants.NO_RESULTS_CONTAINER_CSS_CLASS).first();
        this._$noResultsMessage = this._element.find('.' + ProjectsAndTeamsWidgetViewConstants.NO_RESULTS_MESSAGE_CSS_CLASS).first();

        this._menuBar = <ProjectsAndTeamsWidgetMenu>Controls.BaseControl.createIn(ProjectsAndTeamsWidgetMenu, this._$menuBar);
        this._grid = <ProjectsAndTeamsWidgetGrid>Controls.BaseControl.createIn(ProjectsAndTeamsWidgetGrid, this._$gridContainer);
        this._grid._rowHeight = ProjectsAndTeamsWidgetViewConstants.GRID_ROW_HEIGHT;

        this._$titleAnchor.text(Utils_String.format(Resources.ProjectsAndTeamsWidgetTitleFormat));

        this.refresh().done(() => {
            var loadTime = `${Date.now() - that._startLoadTime}`;
            MyWorkTelemetry.MyWorkTelemetry.publishTelemetryProjectNav(MyWorkTelemetry.TelemetryConstants.WIDGET_INITIALIZATION, { "loadTimeMsec": loadTime });
        }).fail((error: Error) => {
            this._logWidgetLoadFailure(error.message);
        });

        setInterval(function () {
            that.refresh().fail((error: Error) => {
                this._logWidgetLoadFailure(error.message);
            });
        }, ProjectsAndTeamsWidgetViewConstants.REFRESH_INTERVAL);
    }

    public refresh(): JQueryPromise<void> {
        var deferred = $.Deferred<void>();
        var that = this;

        this._projectsAndTeamsManager.getRecentProjectsAndTeams()
            .then((result: ProjectsAndTeams_Widget_Api.ProjectsAndTeamsResult) => {

                if (result.projectsAndTeams && result.totalProjectsAndTeamsCount > 0) {

                    this._grid.setDataSource(result.projectsAndTeams, null, null, null, -1, false);
                    that._updateLayout(true);
                } else {

                    that._updateLayout(false);
                    that._$noResultsMessage.html(Resources.ProjectsAndTeamsWidgetNoResultsEmptyMessage);
                }

                deferred.resolve();
            },
                (error: Error) => {
                    deferred.reject(error);
                });

        return deferred.promise();
    }

    private _onProjectClick(e, args) {
        e.preventDefault();
        var projectUrl = `${this._tfsContext.getHostUrl() }${args.rowData.Url}`;

        var telemetryProperties: { [key: string]: string } = {
            "projectUrl": projectUrl,
        };

        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryProjectNav(ProjectsAndTeamsWidgetViewConstants.CLICK_PROJECT_EVENT, telemetryProperties, true);

        window.open(projectUrl, args.target, args.features);
    }

    private _onRemoveFromMRU(e, args) {
        e.preventDefault();
        var that = this;

        var projectUrl = `${this._tfsContext.getHostUrl() }${args.projectUrl}`;

        var telemetryProperties: { [key: string]: string } = {
            "projectUrl": projectUrl,
        };

        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryProjectNav(ProjectsAndTeamsWidgetViewConstants.REMOVE_FROM_MRU_EVENT, telemetryProperties);

        this._projectsAndTeamsManager.removeProjectOrTeamFromMRU(args.hashCode)
            .then((result: boolean) => {
                that.refresh();
            });
    }

    private _updateLayout(showGrid: boolean) {
        if (showGrid) {
            this._$noResultsContainer.hide();
            this._$gridContainer.show();
        } else {
            this._$noResultsContainer.show();
            this._$gridContainer.hide();
        }
    }

    private _logWidgetLoadFailure(error: string) {
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryProjectNav(MyWorkTelemetry.TelemetryConstants.WIDGET_LOAD_ERROR, { "error": error });
    }

}


Controls.Enhancement.registerEnhancement(ProjectsAndTeamsWidgetView, "." + ProjectsAndTeamsWidgetViewConstants.CORE_CSS_CLASS);

SDK.VSS.register("Microsoft.VisualStudioOnline.MyWork.ProjectsAndTeamsViewWidget", () => ProjectsAndTeamsWidgetView);
SDK.registerContent("Microsoft.VisualStudioOnline.MyWork.ProjectsAndTeamsViewWidget.Initialize", (context) => {
    return Controls.create(ProjectsAndTeamsWidgetView, context.$container, context.options);
});

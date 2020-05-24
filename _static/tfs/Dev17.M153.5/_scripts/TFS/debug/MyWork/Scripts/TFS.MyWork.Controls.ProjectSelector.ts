///<amd-dependency path="jQueryUI/button"/>
///<amd-dependency path="jQueryUI/dialog"/>


import VSS = require("VSS/VSS");
import Dialogs = require("VSS/Controls/Dialogs");
import Controls = require("VSS/Controls");
import Controls_Menus = require("VSS/Controls/Menus");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import Resources = require("MyWork/Scripts/Resources/TFS.Resources.MyWork");
import adminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import ProjectsAndTeams_Widget_Api = require("MyWork/Scripts/TFS.MyWork.Widget.ProjectsAndTeams");
import MyWorkTelemetry = require("MyWork/Scripts/TFS.MyWork.Telemetry");

var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;
var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export module Constants {
    export var CURRENT_SELECTED_PROJECT_CSS_CLASS = "current-selected-project-div";
    export var PROJECT_SELECT_ICON_CSS_CLASS = "project-select-icon-div";
    export var PROJECT_SELECT_DROPDOWN_CSS_CLASS = "project-select-dropdown-div";
    export var PROJECT_SELECT_DROPDOWN_CONTAINER_CSS_CLASS = "project-select-dropdown-container-div";
    export var GET_PROJECT_LIST_API_SUCCESSFUL = "get-project-list-api-successful";
}

export module ProjectSelectorEvents {
    export var PROJECT_CHANGED_EVENT = "project-changed-event";
    export var BROWSE_PROJECT_SELECTED_EVENT = "browse-project-selected-event";
}

var WIDGET_TEMPLATE = '' +
    `  <div class='${Constants.PROJECT_SELECT_DROPDOWN_CONTAINER_CSS_CLASS}'>` +
    `     <div class='${Constants.PROJECT_SELECT_DROPDOWN_CSS_CLASS}'/>` +
    `     <div class='${Constants.PROJECT_SELECT_ICON_CSS_CLASS}'/>` +
    `  </div>`;

export class ProjectsResult {
    totalProjectsCount: number;
    projects: Controls_Menus.IMenuItemSpec[];
}

export class AllProjectResult {
    totalProjectsCount: number;
    projects: any[];
}

export class CurrentProjectInfo {
    projectName: string;
    projectId: string;
}

export class MyWorkJumpListDialog extends Dialogs.ModalDialog {

    public static _controlType: string = 'MyWorkJumpListDialog';

    private _jumpUrl: any;
    private _closeButton: any;
    private _connectButton: any;
    public selectedProjectName: any;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: false,
            width: 650,
            height: 500,
            modal: true,
            title: adminResources.BrowseServer
        }, options));
    }

    public initialize() {
        var navigationContext = tfsContext.navigation,
            hideDefaultTeam = !(navigationContext.area && navigationContext.area.toLowerCase() === 'admin');

        this._options.url = tfsContext.getActionUrl('BrowseControl', 'browse', { area: 'api', hideDefaultTeam: hideDefaultTeam, selectedTeam: null, ignoreDefaultLoad: true } as TFS_Host_TfsContext.IRouteData);

        super.initialize();

        this._initializeButtons();
        this._element.bind('definitionchange', delegate(this, this.setCurrentJumpPoint));
    }

    public setCurrentJumpPoint(e?, params?) {
        if (params && params.selectedNode && params.selectedNode.type !== 'collection') {
            this._jumpUrl = params.selectedNode.model.name;
            this._element.siblings('.ui-dialog-buttonpane').find('#' + this._connectButton.id).button('enable');
        } else {
            this._jumpUrl = null;
            this._element.siblings('.ui-dialog-buttonpane').find('#' + this._connectButton.id).button('disable');
        }
    }

    private _jumpToDestination() {
        var enabled, disabled;
        disabled = this._element.siblings('.ui-dialog-buttonpane').find('#' + this._connectButton.id).button('option', 'disabled');
        enabled = (disabled === false);
        if (this._jumpUrl && enabled) {
            this.selectedProjectName = this._jumpUrl;
            this._fire(ProjectSelectorEvents.BROWSE_PROJECT_SELECTED_EVENT, { selectedProjectName: this.selectedProjectName });
        }
    }

    private _initializeButtons() {
        this._connectButton = {
            id: 'jump-list-dialog-connect-button',
            disabled: true,
            text: Utils_String.htmlEncode(Resources.ProjectSelectorBrowseProjectSelectText),
            click: delegate(this, this._jumpToDestination)
        };

        this._closeButton = {
            id: 'jump-list-dialog-close-button',
            text: Utils_String.htmlEncode(adminResources.Close),
            click: function () {
                $(this).dialog('close');
            }
        };

        this._element.dialog('option', 'buttons', [this._connectButton, this._closeButton]);
    }
}

VSS.classExtend(MyWorkJumpListDialog, TFS_Host_TfsContext.TfsContext.ControlExtensions);

export class ProjectSelector extends Controls.BaseControl {
    private static PROJECT_DROPDOWN_LIMIT = 5;

    private _menuBar: Controls_Menus.MenuBar;
    private _projectsAndTeamsManager: ProjectsAndTeams_Widget_Api.ProjectsAndTeamsManager;
    private _allProjectsDictionary: { [projectName: string]: string; } = {};
    private _projectSelectorList: ProjectsResult;
    private _currentProjectInfo: CurrentProjectInfo = null;
    private _subMenuShown: boolean = false;
    private _tempCurrentProjectId: string;
    private _widgetName: string;
    private _startLoadTime: number;

    private _$projectSelectorContainer: JQuery;
    private _$projectSelectorDropdown: JQuery;

    public __test() {
        var that = this;
        return {
            $projectSelectorContainer: that._$projectSelectorContainer,
            $projectSelectorDropdown: that._$projectSelectorDropdown,
            menuBar: that._menuBar,
            projectsAndTeamsManager: that._projectsAndTeamsManager,
            allProjectsDictionary: that._allProjectsDictionary,
            projectSelectorList: that._projectSelectorList,
            subMenuShown: that._subMenuShown,
            tempCurrentProjectId: that._tempCurrentProjectId,
            currentProjectInfo: that._currentProjectInfo,
            project_dropdown_limit: ProjectSelector.PROJECT_DROPDOWN_LIMIT
        };
    }

    public initialize() {
        this._startLoadTime = Date.now();
        var mainMenuItems: Controls_Menus.IMenuItemSpec[] = [];
        super.initialize();
        this._widgetName = this._options.widgetName;
        this._projectsAndTeamsManager = new ProjectsAndTeams_Widget_Api.ProjectsAndTeamsManager(tfsContext);

        this._element.html(WIDGET_TEMPLATE);

        this._$projectSelectorContainer = this._element.find('.' + Constants.PROJECT_SELECT_DROPDOWN_CONTAINER_CSS_CLASS).first();
        this._$projectSelectorDropdown = this._element.find('.' + Constants.PROJECT_SELECT_DROPDOWN_CSS_CLASS).first();
        this._$projectSelectorContainer.bind("click", delegate(this, this._onProjectSelectorClicked));
        var iconDiv = this._element.find('.' + Constants.PROJECT_SELECT_ICON_CSS_CLASS).first();

        this._getProjectList()
            .then((projectList: ProjectsResult) => {
                var loadTime = `${Date.now() - this._startLoadTime}`;
                var telemetryProperties: { [key: string]: string } = <any>({
                    "loadTimeMsec": loadTime,
                    "projectListCount": projectList.totalProjectsCount
                });
                MyWorkTelemetry.MyWorkTelemetry.publishTelemetryProjectSelector(Constants.GET_PROJECT_LIST_API_SUCCESSFUL, telemetryProperties);
                this._projectSelectorList = projectList;
                if (this._projectSelectorList === null || this._projectSelectorList.totalProjectsCount === 0) {
                    //If there are no projects that the user can access, don't draw the control and set the current project info
                    //as null so that consumers can react accordingly. 
                    this._currentProjectInfo = null;
                } else {
                    if (this._options.selectedProjectId) {
                        for (var projectName in this._allProjectsDictionary) {
                            if (this._allProjectsDictionary.hasOwnProperty(projectName)) {
                                if (this._allProjectsDictionary[projectName] === this._options.selectedProjectId) {
                                    this._currentProjectInfo = { projectName: projectName, projectId: this._options.selectedProjectId };
                                    break;
                                }
                            }
                        }
                    }

                    if (!this._currentProjectInfo) {
                        this._currentProjectInfo = { projectName: projectList.projects[0].text, projectId: projectList.projects[0].id };
                    }

                    mainMenuItems.push({
                        id: this._currentProjectInfo.projectId,
                        idIsAction: false,
                        hideDrop: true,
                        text: this._currentProjectInfo.projectName,
                        showText: true,
                        showIcon: false,
                        childItems: projectList.projects
                    } as Controls_Menus.IMenuItemSpec);

                    this._menuBar = <Controls_Menus.MenuBar><any>(Controls.BaseControl.createIn(
                        Controls_Menus.MenuBar,
                        this._$projectSelectorDropdown, {
                            cssClass: "top-level-menu-v2 project-selector header-item project-selector-nav-menu",
                            items: mainMenuItems,
                            executeAction: delegate(this, this._onMenuItemClick),
                            showIcon: false
                        }));
                    $(domElem("span", "icon icon-down-gray")).appendTo(iconDiv);
                }
                
                //Let the control consumer know project info is ready.
                if (this._options.postInitializeCallback) {
                    this._options.postInitializeCallback(this);
                }
            },
                (error: any) => {
                    this._logWidgetLoadFailure(error.message);
                    this._currentProjectInfo = null;
                });
    }

    public getCurrentProjectInfo() {
        return this._currentProjectInfo;
    }

    private _getAllSortedProjects(): IPromise<AllProjectResult> {
        var deferred = jQuery.Deferred<AllProjectResult>();
        var sortedProjects = [];

        this._projectsAndTeamsManager.getAllProjects()
            .then((allProjectResult: ProjectsAndTeams_Widget_Api.AllProjectsResult) => {

                var projects = allProjectResult.projects.sort((a, b) => (a["DisplayName"].localeCompare(b["DisplayName"])));

                for (var i = 0; i < projects.length; i++) {
                    var project = projects[i];
                    if (project["Teams"] === null) {
                        sortedProjects.push({ id: project["ProjectId"], text: project["DisplayName"] });
                    }
                }
                deferred.resolve({ totalProjectsCount: sortedProjects.length, projects: sortedProjects });
            },
                (getAllProjectsError: any) => {
                    deferred.resolve(deferred.reject(getAllProjectsError) as any);
                });
        return deferred.promise();
    }

    private _getProjectList(): IPromise<ProjectsResult> {
        var deferred = jQuery.Deferred<ProjectsResult>();
        var menuItems = [];
        var sortedProjects = [];

        this._getAllSortedProjects()
            .then((allProjectResult: AllProjectResult) => {
                sortedProjects = allProjectResult.projects;
                this._allProjectsDictionary = this._populateAllProjectsDictionary(sortedProjects);
            },
                (getAllSortedProjectsError: any) => {
                    this._currentProjectInfo = null;
                    deferred.resolve(deferred.reject(getAllSortedProjectsError) as any);
                }).then(() => {
                    this._projectsAndTeamsManager.getRecentProjectsAndTeams()
                        .then((result: ProjectsAndTeams_Widget_Api.ProjectsAndTeamsResult) => {
                            if (result.projectsAndTeams && result.totalProjectsAndTeamsCount > 0) {
                                for (var i = 0; i < ProjectSelector.PROJECT_DROPDOWN_LIMIT && i < result.projectsAndTeams.length; i++) {
                                    var mruProject = result.projectsAndTeams[i];
                                    if (!mruProject["IsTeam"]) {
                                        var currentProjectText = mruProject["Text"];
                                        menuItems.push({ id: this._allProjectsDictionary[currentProjectText], text: currentProjectText });
                                    }
                                }

                                if (menuItems.length === 0) {
                                    menuItems = sortedProjects.slice(0, ProjectSelector.PROJECT_DROPDOWN_LIMIT);
                                }

                            } else {
                                menuItems = sortedProjects.slice(0, ProjectSelector.PROJECT_DROPDOWN_LIMIT);
                            }
                            this._appendBrowseAllToMenuItems(menuItems);
                            deferred.resolve({ totalProjectsCount: menuItems.length, projects: menuItems });
                        },
                            (mruApiError: any) => {
                                menuItems = sortedProjects.slice(0, ProjectSelector.PROJECT_DROPDOWN_LIMIT);
                                this._appendBrowseAllToMenuItems(menuItems);
                                deferred.resolve({ totalProjectsCount: menuItems.length, projects: menuItems });
                            });
                },
                    (error: any) => {
                        this._currentProjectInfo = null;
                        deferred.resolve(deferred.reject(error) as any);
                    });
        return deferred.promise();
    }

    private _appendBrowseAllToMenuItems(menuItems: any[]) {
        if (menuItems.length > 0) {
            menuItems.push(this._getBrowseAllItem());
        }
    }

    private _populateAllProjectsDictionary(sortedProjects) {
        for (var i = 0; i < sortedProjects.length; i++) {
            this._allProjectsDictionary[sortedProjects[i].text] = sortedProjects[i].id;
        }
        return this._allProjectsDictionary;
    }

    private _getBrowseAllItem() {
        var arrowRightHtml = "<span class='arrow-right' />";
        return {
            id: "myWorkBrowseTeams",
            cssClass: "browse-all",
            text: VSS_Resources_Common.BrowseAllTeams + arrowRightHtml,
            encoded: true
        };
    }

    private _onMenuItemClick(e, args) {
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryProjectSelector(MyWorkTelemetry.TelemetryConstants.PROJECT_SELECTOR_MENU_ITEM_CLICKED, {});

        this._subMenuShown = false;
        if (this._currentProjectInfo.projectId === e._commandSource._item.id) {
            return;
        }

        if (e._commandSource._item.id === "myWorkBrowseTeams") {
            MyWorkTelemetry.MyWorkTelemetry.publishTelemetryProjectSelector(MyWorkTelemetry.TelemetryConstants.PROJECT_SELECTOR_BROWSE_ALL_SELECTED, {});

            VSS.using(["Admin/Scripts/TFS.Admin.Dialogs", "Admin/Scripts/TFS.Admin.Controls"], () => {
                var dialog = Dialogs.show(MyWorkJumpListDialog);
                dialog._bind(ProjectSelectorEvents.BROWSE_PROJECT_SELECTED_EVENT, (e, args) => {
                    this._currentProjectInfo.projectName = args.selectedProjectName;
                    this._currentProjectInfo.projectId = this._allProjectsDictionary[args.selectedProjectName];
                    this._redrawProjectSelector();
                    dialog.dispose();
                });
            });
            return;
        }
        this._currentProjectInfo.projectId = e._commandSource._item.id;
        this._currentProjectInfo.projectName = e._commandSource._item.text;

        this._redrawProjectSelector();
    }

    private _redrawProjectSelector() {
        var updatedMenuItems: Controls_Menus.IMenuItemSpec[] = [];

        updatedMenuItems.push({
            id: this._currentProjectInfo.projectId,
            idIsAction: false,
            hideDrop: true,
            text: this._currentProjectInfo.projectName,
            showText: true,
            showIcon: false,
            childItems: this._projectSelectorList.projects
        } as Controls_Menus.IMenuItemSpec);

        this._menuBar.updateItems(updatedMenuItems);
        this._fire(ProjectSelectorEvents.PROJECT_CHANGED_EVENT, { CurrentProjectInfo: this._currentProjectInfo });
    }

    private _onProjectSelectorClicked(e, args) {

        var $subMenu = this._$projectSelectorDropdown.find(".sub-menu");

        if ($subMenu.css("display") === undefined && !this._subMenuShown) {
            this._$projectSelectorDropdown.find(".project-selector-nav-menu").find(".menu-item").click();
            this._subMenuShown = true;
        } else if ($subMenu.css("display") === "none" && !this._subMenuShown) {
            $subMenu.click();
            this._subMenuShown = true;
        } else {
            this._subMenuShown = false;
        }
    }

    private _logWidgetLoadFailure(error: string) {
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetry(MyWorkTelemetry.TelemetryConstants.WIDGET_LOAD_ERROR, { "error": error });
    }
}


/// <reference types="jquery" />


import VSS = require("VSS/VSS");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Controls = require("VSS/Controls");
import ProfileWidget = require("MyWork/Scripts/TFS.MyWork.Controls.Widget.ProfileView");
import NewsWidget = require("MyWork/Scripts/TFS.MyWork.Controls.Widget.NewsView");
import ProjectsAndTeamsWidget = require("MyWork/Scripts/TFS.MyWork.Controls.Widget.ProjectsAndTeamsView");
import BuildWidget = require("MyWork/Scripts/TFS.MyWork.Controls.Widget.BuildView");
import MyCodeWidget = require("MyWork/Scripts/TFS.MyWork.Controls.Widget.MyCodeView");
import Service = require("VSS/Service");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import TFS_Server_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import DashboardGrid = require("Dashboards/Scripts/Grid");
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import TFS_Dashboards_RestClient = require("TFS/Dashboards/RestClient");

var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export module MyWorkViewConstants {
    export var CORE_CSS_CLASS = "my-work-view";
	export var CONTENT_AREA_CSS_CLASS = "my-work-content-area";
	export var LEFT_PANE_CSS_CLASS = "my-work-left-pane";
	export var RIGHT_PANE_CSS_CLASS = "my-work-right-pane";
    export var WORKITEMS_WIDGET_CONTAINER_CSS_CLASS = "my-work-workitems-widget-container";
    export var PROFILE_WIDGET_CONTAINER_CSS_CLASS = "my-work-profile-widget-container";
    export var PROJECTSANDTEAMS_WIDGET_CONTAINER_CSS_CLASS = "my-work-projectsandteams-widget-container";
    export var MYCODE_WIDGET_CONTAINER_CSS_CLASS = "my-work-mycode-widget-container";
    export var BUILD_WIDGET_CONTAINER_CSS_CLASS = "my-work-build-widget-container";
    export var NEWS_WIDGET_CONTAINER_CSS_CLASS = "my-work-news-widget-container";
    export var SEARCH_ADAPTER_WORK_ITEMS = "search-adapter-work-items";
    export var MYCODE_WIDGET_FF = "WebAccess.MyWork.MyCodeWidget";
    export var BUILD_WIDGET_FF = "WebAccess.MyWork.BuildWidget";
}

var HTML_TEMPLATE = "" +
    "  <div class='" + MyWorkViewConstants.RIGHT_PANE_CSS_CLASS + "'>" +
    "    <div class='" + MyWorkViewConstants.PROFILE_WIDGET_CONTAINER_CSS_CLASS + "'/>" +
    "    <div class='" + MyWorkViewConstants.PROJECTSANDTEAMS_WIDGET_CONTAINER_CSS_CLASS + "'/>" +
    "    <div class='" + MyWorkViewConstants.MYCODE_WIDGET_CONTAINER_CSS_CLASS + "'/>" +
    "    <div class='" + MyWorkViewConstants.WORKITEMS_WIDGET_CONTAINER_CSS_CLASS + "'/>" +
    "    <div class='" + MyWorkViewConstants.BUILD_WIDGET_CONTAINER_CSS_CLASS + "'/>" +
    "    <div class='" + MyWorkViewConstants.NEWS_WIDGET_CONTAINER_CSS_CLASS + "'/>" +
    "  </div>";

class MyWorkView extends Controls.BaseControl {
	private _$contentPane: JQuery;
	private _$leftPane: JQuery;
	private _$rightPane: JQuery;

	private _profileWidget: ProfileWidget.ProfileWidgetView;
    private _projectsAndTeamsWidget: ProjectsAndTeamsWidget.ProjectsAndTeamsWidgetView;
    private _myCodeWidget: MyCodeWidget.MyCodeWidgetView;
    private _buildWidget: BuildWidget.BuildWidgetView;
    private _newsWidget: NewsWidget.NewsView;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        $("." + MyWorkViewConstants.SEARCH_ADAPTER_WORK_ITEMS).hide(); //Temporarily hiding search box because it's broken.
        this._$contentPane = $("." + MyWorkViewConstants.CONTENT_AREA_CSS_CLASS);
        this._$contentPane.html(HTML_TEMPLATE);
        this._$leftPane = this._$contentPane.find('.' + MyWorkViewConstants.LEFT_PANE_CSS_CLASS).first();
        this._$rightPane = this._$contentPane.find('.' + MyWorkViewConstants.RIGHT_PANE_CSS_CLASS).first();
        this._renderView();
    }

	private _renderView() {
        this._profileWidget = <ProfileWidget.ProfileWidgetView>Controls.BaseControl.createIn(ProfileWidget.ProfileWidgetView, $('.' + MyWorkViewConstants.PROFILE_WIDGET_CONTAINER_CSS_CLASS));
        this._projectsAndTeamsWidget = <ProjectsAndTeamsWidget.ProjectsAndTeamsWidgetView>Controls.BaseControl.createIn(ProjectsAndTeamsWidget.ProjectsAndTeamsWidgetView, $('.' + MyWorkViewConstants.PROJECTSANDTEAMS_WIDGET_CONTAINER_CSS_CLASS));
        
        this._newsWidget = <NewsWidget.NewsView>Controls.BaseControl.createIn(NewsWidget.NewsView, $('.' + MyWorkViewConstants.NEWS_WIDGET_CONTAINER_CSS_CLASS));
        
        var _tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var _featureService = Service.getService(FeatureAvailability_Services.FeatureAvailabilityService, _tfsContext.contextData);
        if (_featureService.isFeatureEnabledLocal(MyWorkViewConstants.MYCODE_WIDGET_FF)) {
            this._myCodeWidget = <MyCodeWidget.MyCodeWidgetView>Controls.BaseControl.createIn(MyCodeWidget.MyCodeWidgetView, $('.' + MyWorkViewConstants.MYCODE_WIDGET_CONTAINER_CSS_CLASS));
        }
        if (_featureService.isFeatureEnabledLocal(MyWorkViewConstants.BUILD_WIDGET_FF)){
            this._buildWidget = <BuildWidget.BuildWidgetView>Controls.BaseControl.createIn(BuildWidget.BuildWidgetView, $('.' + MyWorkViewConstants.BUILD_WIDGET_CONTAINER_CSS_CLASS));
        }
	}
}

Controls.Enhancement.registerEnhancement(MyWorkView, "." + MyWorkViewConstants.CORE_CSS_CLASS);

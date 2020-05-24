

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");

import TFS_OM = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");

import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Controls = require("VSS/Controls");
import Locations = require("VSS/Locations");
import SDK = require("VSS/SDK/Shim");

import TFS_Resources_Widgets = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import VSS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import VSS_Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import { BacklogsUrls, BoardsUrls, SprintsUrls } from "Agile/Scripts/Common/HubUrlUtilities";
import { SprintsHubRoutingConstants } from "Agile/Scripts/Generated/HubConstants";
import { WidgetLinkHelper } from 'Widgets/Scripts/WidgetLinkHelper';

import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { getService } from "VSS/Service";

/**
* Class representing details for each item in the list. 
* @class
*/
export class ListItem {
    public text: string;
    public url: string;
    public domClass: string;

    constructor(text: string, url: string, domClass: string) {
        this.domClass = domClass;
        this.text = text;
        this.url = url;
    }
}

/**
* Class that enhances a DOM element with the work links widget control. 
* @extends VSS_Control_BaseWidget.BaseWidget<any>
* @class
*/
export class WorkLinksControl
    extends VSS_Control_BaseWidget.BaseWidgetControl<Dashboard_Shared_Contracts.WidgetOptions>
    implements Dashboards_WidgetContracts.IWidget {
    // constants for telemetry publishing values 
    private static Telemetry_BacklogValue: string = "Backlog";
    private static Telemetry_BoardValue: string = "Board";
    private static Telemetry_TaskboardValue: string = "Taskboard";
    private static Telemetry_QueriesValue: string = "Queries";

    // constants representing DOM classes used within the control. 
    public static DomClass_BacklogsLink: string = "work-panel-backlog";
    public static DomClass_BoardLink: string = "work-panel-board";
    public static DomClass_TaskboardLink: string = "work-panel-taskboard";
    public static DomClass_QueriesLink: string = "work-panel-queries";

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "worklinks-container"
        }, options));
    }

    public preload(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        this.render();
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public load(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        this.publishLoadedEvent({});
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    /**
    * The workflow for the widget control being rendered.
    */
    public render(): void {
        // Add the class that enables the widget to take advantage of the styles from the widget sdk
        this.getElement().addClass(TFS_Dashboards_Constants.WidgetDomClassNames.WidgetContainer);

        this.getElement().append($("<h2>").addClass(TFS_Dashboards_Constants.WidgetDomClassNames.Title).text(TFS_Resources_Widgets.WorkLinks_TeamWorkTitle));
        this.addContent(this.getElement());
    }

    /**
    * Adds the content (with the Work lInks) to the container
    * @param {JQuery} container -  the jquery element the content is written into. 
    */
    private addContent(container: JQuery): void {
        var content = $('<ul/>').addClass(TFS_Dashboards_Constants.WidgetDomClassNames.NoBulletList);
        this.addBacklogsLink(content);
        this.addBoardLink(content);
        this.addTaskBoardLink(content);
        this.addQueriesLink(content);
        content.appendTo(container);
    }

    /**
   * Conditionally Adds the backlogs link to the container
   * @param {JQuery} container -  the jquery element the backlogs link is written into.
   */
    private addBacklogsLink(container: JQuery): void {
        if (TFS_FeatureLicenseService.FeatureLicenseService.isFeatureActive(TFS_Server_WebAccess_Constants.LicenseFeatureIds.AgileBoards)) {
            let backlogUrl: string;
            if (getService(FeatureManagementService).isFeatureEnabled("ms.vss-tfs-web.vertical-navigation")) {
                backlogUrl = BacklogsUrls.getExternalBacklogContentUrl(this.teamContext.name);
            } else {
                backlogUrl = this._getActionUrl("backlog", "backlogs");
            }
            const backlog: ListItem = new ListItem(TFS_Resources_Widgets.WorkLinks_TeamWorkBacklogTitle, backlogUrl, WorkLinksControl.DomClass_BacklogsLink);
            this.addListItem(backlog, container);
            container.find("." + WorkLinksControl.DomClass_BacklogsLink).click(() => {
                VSS_Widget_Telemetry.WidgetTelemetry.onWidgetClick(this.getTypeId(), WorkLinksControl.Telemetry_BacklogValue);
            });
        }
    }

    /**
    * Conditionally Adds the boards link to the container
    * @param {JQuery} container -  the jquery element the boards link is written into.
    */
    private addBoardLink(container: JQuery): void {
        if (TFS_FeatureLicenseService.FeatureLicenseService.isFeatureActive(TFS_Server_WebAccess_Constants.LicenseFeatureIds.AgileBoards)) {
            var boardUrl: string = BoardsUrls.getExternalBoardContentUrl(this.teamContext.name);
            var board: ListItem = new ListItem(TFS_Resources_Widgets.WorkLinks_TeamWorkBoardTitle, boardUrl, WorkLinksControl.DomClass_BoardLink);
            this.addListItem(board, container);
            container.find("." + WorkLinksControl.DomClass_BoardLink).click(() => {
                VSS_Widget_Telemetry.WidgetTelemetry.onWidgetClick(this.getTypeId(), WorkLinksControl.Telemetry_BoardValue);
            });
        }
    }

    /**
    * Conditionally adds the taskboard link to the container
    * @param {JQuery} container -  the jquery element the taskboard link is written into.
    */
    private addTaskBoardLink(container: JQuery): void {
        if (TFS_FeatureLicenseService.FeatureLicenseService.isFeatureActive(TFS_Server_WebAccess_Constants.LicenseFeatureIds.AgileBoards)) {
            var taskBoardUrl: string = SprintsUrls.getExternalSprintContentUrl(this.teamContext.name, /*iteration:*/ null, SprintsHubRoutingConstants.TaskboardPivot);
            var taskBoard: ListItem = new ListItem(TFS_Resources_Widgets.WorkLinks_TeamWorkTaskboardTitle, taskBoardUrl, WorkLinksControl.DomClass_TaskboardLink);
            this.addListItem(taskBoard, container);
            container.find("." + WorkLinksControl.DomClass_TaskboardLink).click(() => {
                VSS_Widget_Telemetry.WidgetTelemetry.onWidgetClick(this.getTypeId(), WorkLinksControl.Telemetry_TaskboardValue);
            });
        }
    }

    /**
    * Adds the Queries link to the container
    * @param {JQuery} container -  the jquery element the Queries link is written into. 
    */
    private addQueriesLink(container: JQuery): void {
        var queriesUrl: string = this._getActionUrl(null, "queries");
        var queries: ListItem = new ListItem(TFS_Resources_Widgets.WorkLinks_TeamWorkQueriesTitle, queriesUrl, WorkLinksControl.DomClass_QueriesLink);
        this.addListItem(queries, container);
        container.find("." + WorkLinksControl.DomClass_QueriesLink).click(() => {
            VSS_Widget_Telemetry.WidgetTelemetry.onWidgetClick(this.getTypeId(), WorkLinksControl.Telemetry_QueriesValue);
        });
    }

    /**
    * Gets the link to the Mvc route url that matches the action and controller.
    * @param {string} action -  action method for the workflow that maps to the list item. 
    * @param {string} controller -  MVC Controller that manages the action method.
    * @return url to the mvc action controller.
    */
    public _getActionUrl(action: string, controller: string): string {
        return Locations.urlHelper.getMvcUrl(<Locations.MvcRouteOptions>{
            webContext: this.webContext,
            action: action,
            controller: controller
        });
    }

    /**
    * Adds an item to the list. 
    * @param {ListItem} item -  a item with a underlying link to a workflow. 
    * @param {JQuery} container -  jquery element the item is written into. 
    */
    public addListItem(item: ListItem, container: JQuery): void {
        var listItem = $("<li/>");
        var listItemTextLink = $("<a/>")
            .attr("href", item.url)
            .attr("class", item.domClass)
            .text(item.text);
        if (WidgetLinkHelper.mustOpenNewWindow()) {
            listItemTextLink.attr("target", "_blank")
        }

        listItemTextLink.appendTo(listItem);
        listItem.appendTo(container);
    }
}

// register control as an enhancement to allow the contribution model to associate it with the widget host.
SDK.VSS.register("dashboards.workLinks", () => WorkLinksControl);
SDK.registerContent("dashboards.workLinks-init", (context) => {
    return Controls.create(WorkLinksControl, context.$container, context.options);
});

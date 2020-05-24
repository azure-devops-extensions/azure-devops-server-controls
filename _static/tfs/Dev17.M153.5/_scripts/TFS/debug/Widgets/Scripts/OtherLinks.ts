


import * as Q from "q";

import * as Dashboard_Shared_Contracts from "Dashboards/Scripts/Contracts";
import * as TFS_Dashboards_Constants from "Dashboards/Scripts/Generated/Constants";

import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ACTION_REQUEST_FEEDBACK } from "Presentation/Scripts/TFS/TFS.Host.UI.Actions";

import * as Dashboards_WidgetContracts from "TFS/Dashboards/WidgetContracts";
import * as WidgetHelpers from "TFS/Dashboards/WidgetHelpers";

import * as Ajax from "VSS/Ajax";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as Controls from "VSS/Controls";
import * as Events_Action from "VSS/Events/Action";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as SDK from "VSS/SDK/Shim";
import * as Utils_Core from "VSS/Utils/Core";
import * as VSS_Resources_Common from "VSS/Resources/VSS.Resources.Common";
import * as VSS_Service from "VSS/Service";
import * as VSS from "VSS/VSS";

import * as TFS_Resources_Widgets from "Widgets/Scripts/Resources/TFS.Resources.Widgets";
import * as TFS_Widget_Utilities from "Widgets/Scripts/TFS.Widget.Utilities";
import * as VSS_Control_BaseWidget from "Widgets/Scripts/VSS.Control.BaseWidget";
import * as VSS_Widget_Telemetry from "Widgets/Scripts/VSS.Widget.Telemetry";

// this is defined in  Tfs\Service\WebAccess\Server\License\FeatureContext.cs
export enum FeatureMode {
    Off = 0,
    Advertising = 1,
    Trial = 2,
    Licensed = 3,
}

export interface OtherLinksResponse {
    showTeamLinks: boolean;
    portalUrl: string;
    guidanceUrl: string;
    reportUrl: string;
    feedbackMode: FeatureMode;
    userHasTeamWritePermission: boolean;
}

export class OtherLinksListControl extends VSS_Control_BaseWidget.BaseWidgetControl<Dashboard_Shared_Contracts.WidgetOptions>
                                   implements Dashboards_WidgetContracts.IWidget{
    // classes for Action Urls
    public static ActionManageAreas = "manage-areas";
    public static ActionManageIterations = "manage-iterations";

    // Dom Id for links
    public static DomClass_RequestFeedback = "request-feedback";
    public static DomId_ProjectPortal = "view-project-portal";
    public static DomId_ProcessGuidence = "view-process-guidance";
    public static DomId_Reports = "view-reports";
    public static DomId_Iterations = "view-iterations";
    public static DomId_WorkAreas = "configure-work-areas";

    // Self-reference to prevent a different page loading and to preserve tab
    // stopping with that element
    public static selfUrl = "#";

    private _$listElement: JQuery;
    private _configData: OtherLinksResponse;

    constructor(options?: any) {
        super(options);
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "other-links"
        }, options));
    }

    public preload(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public load(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {

        return this.getOtherLinksData()
            .then((response: OtherLinksResponse) => {
                if (this.render) {
                    this.render.call(this, response);
                    this.publishLoadedEvent({});
                    return WidgetHelpers.WidgetStatusHelper.Success();
                }
            }, (e) => {
                var error: string = TFS_Widget_Utilities.ErrorParser.stringifyError(e);
                return WidgetHelpers.WidgetStatusHelper.Failure(error);
            });
    }

    public getLinksElement(): JQuery {
        return this._$listElement;
    }

    public getOtherLinksData(): IPromise<OtherLinksResponse> {
        var otherLinksResponse: OtherLinksResponse =
            VSS_Service.
                getService(Contribution_Services.WebPageDataService).
                getPageData<OtherLinksResponse>(TFS_Dashboards_Constants.WidgetDataProviderPropertyBagNames.OtherLinksWidgetData);

        otherLinksResponse.userHasTeamWritePermission = true;
        return Q.resolve(otherLinksResponse);
    }

    public render(response: OtherLinksResponse): void {
        // Add the class that enables the widget to take advantage of the styles from the widget sdk
        this.getElement().addClass(TFS_Dashboards_Constants.WidgetDomClassNames.WidgetContainer);

        this._configData = response;
        if (this._configData.showTeamLinks) {
            this.renderLinks();
            this.attachLinks();
        }
    }

    private renderLinks(): void {

        this._$listElement = $("<ul/>").addClass(TFS_Dashboards_Constants.WidgetDomClassNames.NoBulletList);

        // Add Title element
        this.getElement().append($("<h2>").addClass(TFS_Dashboards_Constants.WidgetDomClassNames.Title).text(TFS_Resources_Widgets.OtherLinksWidget_Title));

        // Add the relavant links
        this.addFeedbackLink();
        this.addPortalLink();
        this.addGuidenceLink();
        this.addReportsLink();
        this.addIterationsLink();
        this.addTeamAreasLink();

        // Add generated list of links to the other links widget element
        this.getElement().append(this._$listElement);
    }

    private attachLinks(): void {
        var delegate = Utils_Core.delegate;

        // Attaching request feedback link
        this._$listElement.find('a.' + OtherLinksListControl.DomClass_RequestFeedback).click(delegate(this, this._onRequestFeedbackClick));

        // Register the deep-link handler
        Navigation_Services.getHistoryService().attachNavigate("requestFeedback", function (sender, state) {
            Events_Action.getService().performAction(ACTION_REQUEST_FEEDBACK, {});
        }, true);
    }

    private addFeedbackLink() :void {
        if (this._configData.feedbackMode >= FeatureMode.Advertising) {
            var title = VSS_Resources_Common.RequestFeedback;
            if (this._configData.feedbackMode < FeatureMode.Licensed) {
                title += VSS_Resources_Common.Asterix;
            }
            this.addLink(
                OtherLinksListControl.selfUrl,
                title,
                null,
                null,
                OtherLinksListControl.DomClass_RequestFeedback,
                "Request Feedback"
                );
        }
    }

    private addPortalLink(): void  {
        if (this._configData.portalUrl) {
            this.addLink(
                this._configData.portalUrl,
                TFS_Resources_Widgets.OtherLinksWidget_TeamProjectPortal,
                OtherLinksListControl.DomId_ProjectPortal,
                "_blank",
                null,
                "Project Portal"
                );
        }
    }

    private addGuidenceLink(): void  {
        if (this._configData.guidanceUrl) {
            this.addLink(
                this._configData.guidanceUrl,
                VSS_Resources_Common.ViewProcessGuidance,
                OtherLinksListControl.DomId_ProcessGuidence,
                "_blank",
                null,
                "Process Guidance"
                );
        }
    }

    private addReportsLink(): void  {
        if (this._configData.reportUrl) {
            this.addLink(
                this._configData.reportUrl,
                VSS_Resources_Common.ViewReports,
                OtherLinksListControl.DomId_Reports,
                "_blank",
                null,
                "Reports"
                );
        }
    }

    private addIterationsLink(): void  {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        if (this._configData.userHasTeamWritePermission) {
            this.addLink(
                tfsContext.getActionUrl("", "work", { area: 'admin', team: this.teamContext.name, _a: 'iterations' } as TFS_Host_TfsContext.IRouteData),
                TFS_Resources_Widgets.OtherLinks_ConfigureIterationTitle,
                OtherLinksListControl.DomId_Iterations,
                "_blank",
                OtherLinksListControl.ActionManageIterations,
                "Team Iterations"
                );
        }
    }

    private addTeamAreasLink(): void  {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        if (this._configData.userHasTeamWritePermission) {
            this.addLink(
                tfsContext.getActionUrl("", "work", { area: 'admin', team: this.teamContext.name, _a: 'areas' } as TFS_Host_TfsContext.IRouteData),
                TFS_Resources_Widgets.OtherLinks_ConfigureAreasTitle,
                OtherLinksListControl.DomId_WorkAreas,
                "_blank",
                OtherLinksListControl.ActionManageAreas,
                "Team Areas"
                );
        }
    }

    public _onRequestFeedbackClick(e?: any): boolean {

        // This event is so we can know when the user asks to provide feedback and we can start measuring performance from here...
        e.preventDefault();
        VSS.using(["Requirements/Scripts/TFS.Requirements.Registration.HostPlugins"], () => {
            Events_Action.getService().performAction(ACTION_REQUEST_FEEDBACK, {});
        });
        return false;
    }

    private addLink(hrefValue: string, title: string, idValue: string, targetValue: string, classValue: string, linkDescription: string): void {
        var link = this.getLink(hrefValue, title, idValue, targetValue, classValue);
        link.click((event: JQueryEventObject) => {
            VSS_Widget_Telemetry.WidgetTelemetry.onWidgetClick("typeId", linkDescription);
        });

        var linkItem = $("<li/>").append(link);
        this._$listElement.append(linkItem);
    }

    private getLink(hrefValue: string, title: string, idValue?: string, targetValue?: string, classValue?: string): JQuery {
        var link = $('<a/>').attr("href", hrefValue);

        link.text(title);
        if (idValue) {
            link.attr("id", idValue);
        }
        if (classValue) {
            link.attr("class", classValue);
        }
        if (targetValue) {
            link.attr("target", targetValue);
        }
        return link;
    }
}

SDK.VSS.register("dashboards.otherLinks", () => OtherLinksListControl);
SDK.registerContent("dashboards.otherLinks-init", (context) => {
    return Controls.create(OtherLinksListControl, context.$container, context.options);
});




import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";

import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import * as Locations from "VSS/Locations";

import TFS_Resources_Widgets = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import VSS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import VSS_Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import { BoardsUrls } from "Agile/Scripts/Common/HubUrlUtilities";

import FeatureAvailability_Services = require('VSS/FeatureAvailability/Services');
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export class HowToLinksWidget extends VSS_Control_BaseWidget.BaseWidgetControl<IHowToLinksWidgetOptions>
                              implements Dashboards_WidgetContracts.IWidget{
    
    public static WorkTelemetryId = "Work";

    public static CodeTelemetryId = "Code";

    public static BuildTelemetryId = "Build";

    public static ChartUrl = "https://go.microsoft.com/fwlink/?LinkId=627167";
    public static ChartTelemetryId = "Chart";
    public static NonMemberImage = "zerodata-no-charts.png";

    public widgetContainer: JQuery;
    private tfsContext: TFS_Host_TfsContext.TfsContext;

    constructor(options = <IHowToLinksWidgetOptions>{}) {
        super(options);
        this.tfsContext = options.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: IHowToLinksWidgetOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "how-to-links"
        }, options));
    }

    public preload(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        let isMember = WidgetLinkHelper.canAccessAdvancedFeatures();

        // title
        this.getElement()
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.WidgetContainer)
            .append($("<h2>").addClass(TFS_Dashboards_Constants.WidgetDomClassNames.Title).text(TFS_Resources_Widgets.HowToLinks_Title));

        if (isMember) {
            let links: IHowToLink[] = [
                { // Work
                    title: TFS_Resources_Widgets.HowToLinks_WorkTitle,
                    subtitle: TFS_Resources_Widgets.HowToLinks_WorkSubtitle,
                    url: BoardsUrls.getExternalBoardContentUrl(this.teamContext.name),
                    imageFileName: "howToLinksWork.png",
                    telemetryId: HowToLinksWidget.WorkTelemetryId
                },
                { // Code
                    title: TFS_Resources_Widgets.HowToLinks_CodeTitle,
                    subtitle: TFS_Resources_Widgets.HowToLinks_CodeSubtitle,
                    url: this.tfsContext.getActionUrl("", "code"),
                    imageFileName: "howToLinksCode.png",
                    telemetryId: HowToLinksWidget.CodeTelemetryId
                },
                { // Build
                    title: TFS_Resources_Widgets.HowToLinks_BuildTitle,
                    subtitle: TFS_Resources_Widgets.HowToLinks_BuildSubtitle,
                    url: this.tfsContext.getActionUrl("", "build"),
                    imageFileName: "howToLinksBuild.png",
                    telemetryId: HowToLinksWidget.BuildTelemetryId
                },
                { // Chart
                    title: TFS_Resources_Widgets.HowToLinks_ChartTitle,
                    subtitle: TFS_Resources_Widgets.HowToLinks_ChartSubtitle,
                    url: HowToLinksWidget.ChartUrl,
                    imageFileName: "howToLinksChart.png",
                    telemetryId: HowToLinksWidget.ChartTelemetryId
                }
            ];

            this.renderLinks(links);
        } else {
            this.renderNonMemberView();
        }
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public load(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        this.publishLoadedEvent({});
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    /**
    * Renders the widget for members.
    */
    private renderLinks(links: IHowToLink[]): void {
        
        // Blurb
        var blurbText = this.tfsContext.isHosted
            ? 
                (TFS_Resources_Widgets.HowToLinks_BlurbAzureDevOps)
            : TFS_Resources_Widgets.HowToLinks_BlurbTfs;
        
        var $blurb = this.getBlurb(blurbText);
        this.getElement().append($blurb);

        // Links
        links.forEach((link) => {
            Controls.BaseControl.createIn<IHowToLinkControlOptions>(HowToLinkControl, this.getElement(), {
                link: link,
                typeId: this.getTypeId()
            });
        });
    }

    private renderNonMemberView(): void {
        this.widgetContainer = $("<a />")
            .attr("href", TFS_Dashboards_Common.FwLinks.PublicAnonLearnMore)
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.ClickableWidgetContainer);

        var $blurb = this.getBlurb(TFS_Resources_Widgets.HowToLinks_BlurbNonMember);
        var $img = $("<img/>")
            .addClass("zerodata-img")
            .attr("src", Locations.urlHelper.getVersionedContentUrl("Widgets/zerodata-no-charts.png"));

        this.widgetContainer
            .append($blurb)
            .append($img);

        this.getElement().append(this.widgetContainer);
    }

    private getBlurb(blurbText: string): JQuery {
        return $("<div>")
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.WidgetDescription)
            .text(blurbText);
    }
}

export interface IHowToLinksWidgetOptions extends Dashboard_Shared_Contracts.WidgetOptions {
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

/**
 * Encapsulates a single link with title, subtitle etc.
 */
export interface IHowToLink {
    title: string;
    subtitle: string;
    url: string;
    telemetryId: string;
    imageFileName: string;
}

export interface IHowToLinkControlOptions {
    link: IHowToLink;
    typeId: string;
}

/**
 * Responsible for rendering a single link
 */
export class HowToLinkControl extends Controls.Control<IHowToLinkControlOptions> {
    public static TitleClass = "how-to-link-title";
    public static SubtitleClass = "how-to-link-subtitle";
    public static AnchorClass = "how-to-link-anchor";

    private link: IHowToLink;
    private typeId: string;

    public constructor(options: IHowToLinkControlOptions) {
        super(options);

        this.link = options.link;
        this.typeId = options.typeId;
    }

    public initialize() {
        var $title = $("<div>")
            .attr(HowToLinkControl.TitleClass, "")
            .addClass("how-to-link-title")
            .text(this.link.title);

        var $subtitle = $("<div>")
            .attr(HowToLinkControl.SubtitleClass, "")
            .addClass("how-to-link-subtitle")
            .text(this.link.subtitle);

        var $img = $("<img/>").attr("src", Locations.urlHelper.getVersionedContentUrl(`Widgets/${this.link.imageFileName}`));

        var $link = $("<a>")
            .addClass(HowToLinkControl.AnchorClass)
            .attr("href", this.link.url)
            .attr("target", "_blank")
            .append($img)
            .append($title)
            .append($subtitle)
            .click(() => VSS_Widget_Telemetry.WidgetTelemetry.onWidgetClick(this.typeId, this.link.telemetryId));

        this.getElement()
            .addClass("how-to-link")
            .append($link);
    }
}

SDK.VSS.register("dashboards.howToLinks", () => HowToLinksWidget);
SDK.registerContent("dashboards.howToLinks-init", (context) => {
    return Controls.create(HowToLinksWidget, context.$container, context.options);
});

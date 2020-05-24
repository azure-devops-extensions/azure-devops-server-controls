




import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");

import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");

import TFS_Widgets_Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import VSS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import VSS_Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";

class VSLinksListControl extends VSS_Control_BaseWidget.BaseWidgetControl<Dashboard_Shared_Contracts.WidgetOptions>
                         implements Dashboards_WidgetContracts.IWidget{

    constructor(options?: any) {
        super(options);
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "visual-studio-links"
        }, options));
    } 

    public initialize(): void {
        super.initialize();
    }

    public preload(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        // Add the class that enables the widget to take advantage of the styles from the widget sdk
        this.getElement().addClass(TFS_Dashboards_Constants.WidgetDomClassNames.WidgetContainer);
        
        this.renderLinks();
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public load(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        this.publishLoadedEvent({});
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    private renderLinks(): void {

        // create list unordered tags container
        var listElement = $("<ul/>")
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.LinkWithIconAndTextList);
            
        // add widget title  
        this.getElement().append($("<h2>").addClass(TFS_Dashboards_Constants.WidgetDomClassNames.Title).text(TFS_Widgets_Resources.VSLinksWidget_Title));        
       
        var projectGuid = this.webContext.project.id;
        var collectionUri = this.webContext.collection.uri;
        // encode the URI to deal with any non-utf8 character
        var tfsLink = Utils_String.format("vstfs:///Framework/TeamProject/{0}?url={1}", projectGuid, encodeURI(collectionUri));
        var vsOpenLinkUrl = "vsweb://vs/?Product=Visual_Studio\u0026EncFormat=UTF8\u0026tfslink=" + Utils_String.base64Encode(tfsLink);
        
        var vsOpenLink = this.getLinkWithIconAndText(
            vsOpenLinkUrl,
            TFS_Widgets_Resources.VSLinksWidget_VSOpenLink_Tooltip,
            TFS_Widgets_Resources.VSLinksWidget_VSOpenLink_Title,
            TFS_Widgets_Resources.VSLinksWidget_VSOpenLink_SubTitle, TFS_Dashboards_Constants.BowTieClassNames.ArrowOpenIcon);
        vsOpenLink.addClass("openvs");

        var vsOpenLinkItem = $("<li/>").append(vsOpenLink);

        vsOpenLinkItem.find('a').click(() => {
            VSS_Widget_Telemetry.WidgetTelemetry.onWidgetClick(this.getTypeId(), "OpenVs");
        });

        if (WidgetLinkHelper.canOpenProjectInVisualStudio()) {
            listElement.append(vsOpenLinkItem);
        }
        
        var vsDownloadLink = this.getLinkWithIconAndText(
            TFS_Widgets_Resources.VSLinksWidget_VSDownloadLink,
            TFS_Widgets_Resources.VSLinksWidget_VSDownloadLink_Title,
            TFS_Widgets_Resources.VSLinksWidget_VSDownloadLink_Title,
            TFS_Widgets_Resources.VSLinksWidget_VSDownloadLink_SubTitle, TFS_Dashboards_Constants.BowTieClassNames.BrandVisualStudioIcon);
        vsDownloadLink.addClass("getvs");

        var vsDownloadLinkItem = $("<li/>").append(vsDownloadLink);

        vsDownloadLinkItem.find('a').click(() => {
            VSS_Widget_Telemetry.WidgetTelemetry.onWidgetClick(this.getTypeId(), "GetVs");
        });

        listElement.append(vsDownloadLinkItem);

        this.getElement().append(listElement);
    }

}

SDK.VSS.register("dashboards.vsLinks", () => VSLinksListControl);
SDK.registerContent("dashboards.vsLinks-init", (context) => {
    return Controls.create(VSLinksListControl, context.$container, context.options);
});

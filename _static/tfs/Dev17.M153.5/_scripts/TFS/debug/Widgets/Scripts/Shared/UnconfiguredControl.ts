

import Context = require("VSS/Context");
import Utils_String = require("VSS/Utils/String");

import TFS_Dashboards_ActionRequiredControl = require("Dashboards/Scripts/ActionRequiredControl");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import * as UserPermissionsHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";
import TFS_Widget_Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import Tfs_Dashboards_Contracts = require("TFS/Dashboards/Contracts");

import Controls = require("VSS/Controls");
import * as Locations from "VSS/Locations";

export interface UnconfiguredControlOptions {
    containingControl: JQuery;
    widgetSize: Tfs_Dashboards_Contracts.WidgetSize;
    widgetName: string;
    clickHandler: IArgsFunctionR<any>;
    message?: string;
    linkText?: string;
}

export class UnconfiguredControl{

    private unconfiguredControl: TFS_Dashboards_ActionRequiredControl.WidgetNotification<Dashboard_Shared_Contracts.IWidgetNotificationOptions>;
    private containingControl: JQuery;
    private widgetSize: Tfs_Dashboards_Contracts.WidgetSize;
    private widgetName: string;
    private clickHandler: IArgsFunctionR<any>;
    private message: string;
    private linkText: string;
    public static DomClass_Unconfigured: string = "unconfigured";

    constructor(options: UnconfiguredControlOptions) {
        this.containingControl = options.containingControl;
        this.widgetSize = options.widgetSize;
        this.widgetName = options.widgetName;
        this.clickHandler = options.clickHandler;
        this.message = (options.message != null) ? options.message : TFS_Widget_Resources.WidgetNotificationConfigureTitle;
        this.linkText = (options.linkText != null) ? options.linkText : "";
    }

    /**
      * Shows the experiences that informs the user that they need to configure the widget. 
      * { Tfs_Dashboards_Contracts.WidgetSize} size to show the control for. Defaults to the size provided at creation if one isn't provided. 
      */
    public show(): void {
        this.containingControl.addClass(UnconfiguredControl.DomClass_Unconfigured);

        if (!this.unconfiguredControl) {
            this.create();
        }
        this.unconfiguredControl.showElement();
    }

    /**
     * Removes the unconfigured control
     */
    public hide(): void {
        this.containingControl.removeClass(UnconfiguredControl.DomClass_Unconfigured);

        if (this.unconfiguredControl) {
            this.unconfiguredControl.hideElement();
        }
    }

    public isVisible(): boolean {
        return !!this.unconfiguredControl;
    }

    public toggle(): void {
        if (this.isVisible()) {
            this.hide();
        }

        else {
            this.show();
        }
    }

    public remove(): void {
        if (this.unconfiguredControl) {
            this.unconfiguredControl.getElement().remove();
        }
    }

    public dispose(): void {
        if (this.unconfiguredControl) {
            this.unconfiguredControl.dispose();
            this.unconfiguredControl = null;
        }
    }

    /**
     * Creates the control informing the user about the widget's unconfigured state.
     */
    public create(): void {
        var cssClass = "configure-widget";
        var options = <Dashboard_Shared_Contracts.IWidgetNotificationOptions>{
            titleName: this.widgetName,
            message: this.message,
            linkText: this.linkText,
            ariaLabel: Utils_String.format(
                UserPermissionsHelper.CanManagePermissionsForDashboards() ?
                    TFS_Widget_Resources.WidgetNotificationConfigure_ScreenReaderSupportText_Admin : TFS_Widget_Resources.WidgetNotificationConfigure_ScreenReaderSupportText,
                this.widgetName),            
            clickHandler: this.clickHandler,
            cssClass: cssClass,
            widgetSize: this.widgetSize,
            imageUrl: this.getBackgroundImageUrl()
        };

        this.unconfiguredControl = <TFS_Dashboards_ActionRequiredControl.WidgetNotification<Dashboard_Shared_Contracts.IWidgetNotificationOptions>>
            Controls.BaseControl.createIn(TFS_Dashboards_ActionRequiredControl.WidgetNotification, this.containingControl, options);
    }

    private getBackgroundImageUrl(): string {
        let contentFileName;
        if (this.widgetSize.rowSpan == 1) {
            contentFileName = 'Dashboards/unconfigured-small.png';
        }
        else {
            contentFileName = 'Dashboards/unconfigured-large.png';
        }

        return Locations.urlHelper.getVersionedContentUrl(contentFileName);
    }
}
 

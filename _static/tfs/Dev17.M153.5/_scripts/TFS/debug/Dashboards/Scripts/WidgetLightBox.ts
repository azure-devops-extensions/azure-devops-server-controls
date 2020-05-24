import Controls_Dialogs = require("VSS/Controls/Dialogs");
import Controls = require("VSS/Controls");
import Performance = require("VSS/Performance");
import Utils_UI = require("VSS/Utils/UI");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import TFS_Dashboards_PushToDashboard = require("Dashboards/Scripts/Pinning.PushToDashboard");
import TFS_Dashboards_PushToDashboardInternal = require("Dashboards/Scripts/Pinning.PushToDashboardInternal");
import TFS_Dashboards_WidgetDataForPinning = require("Dashboards/Scripts/Pinning.WidgetDataForPinning");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import TFS_Dashboards_Control_WidgetHost = require("Dashboards/Scripts/WidgetHost");


// This is avoid having to import VSS/Controls/Dialogs in Dashboards/Scripts/Contracts
// extending WidgetLightboxOptions with IModalDialogOptions in Contracts will increase the size of dashboard load script
// WidgetLightboxDialogOptions will import the Dialogs only when lightbox is opened
export interface WidgetLightboxDialogOptions extends Controls_Dialogs.IModalDialogOptions, Dashboard_Shared_Contracts.WidgetLightboxOptions {
} 

export class WidgetLightboxDialog extends Controls_Dialogs.ModalDialogO<WidgetLightboxDialogOptions> {
    // container gets 2px border, increase container size so widget will get specified width
    private static BorderWidthAdjustment: number = 2;

    //These numbers are picked from trail and error
    private static TitleHeightAdjustment: number = 13;
    private static SubtitleHeightAdjustment: number = 2;
    private static NoTitleAndSubtitleHeightAdjustment: number = -36;
    private static TitleTextHeight: number = 40;
    private static SubTitleTextHeight: number = 30;
    private static HeaderPadding: number = 50;


    public _widgethost: Dashboard_Shared_Contracts.IWidgetHost;
    private _startTime: number;

    public initializeOptions(options: WidgetLightboxDialogOptions) {
        // framework control doesn't handle the case where there is no title, (markdown widget has no title)
        // css class it assigns includes a line-height along with margin occupying plenty of space, override that behavior
        let conditionalTitleClass = "";

        if (!options.title && !options.subtitle) {
            conditionalTitleClass = " no-title";
        }

        options = $.extend({
            width: (options.widgetData.lightboxOptions.width || Dashboard_Shared_Contracts.WidgetLightboxDialogConstants.defaultWidth),
            height: (options.widgetData.lightboxOptions.height || Dashboard_Shared_Contracts.WidgetLightboxDialogConstants.defaultHeight),
            minWidth: Dashboard_Shared_Contracts.WidgetLightboxDialogConstants.minWidth + WidgetLightboxDialog.BorderWidthAdjustment,
            minHeight: Dashboard_Shared_Contracts.WidgetLightboxDialogConstants.minHeight + Dashboard_Shared_Contracts.WidgetLightboxDialogConstants.BottomPaddingHeight,
            resizable: true,
            autoOpen: true,
            buttons: null,
            contentMargin: false,
            attachResize: true,
            hasProgressElement: false,
            dialogClass: "widget-lightbox-dialog" + conditionalTitleClass,
            preventAutoResize: true,
            open: () => {

                if (typeof this._options.animateFromRectangle !== "undefined" && this._options.animateFromRectangle !== null) {

                    this.getElement().parent().css("visibility", "hidden");

                    var $animation = $("<div />")
                        .width(this._options.animateFromRectangle.width)
                        .height(this._options.animateFromRectangle.height)
                        .css("position", "absolute")
                        .css("background-color", "white")
                        .css("top", this._options.animateFromRectangle.top)
                        .css("left", this._options.animateFromRectangle.left)
                        .css("transition", "all 0.3s")
                        .css("z-index", 999999)
                        .appendTo($("body"));

                    $animation
                        .css("left", this.getElement().parent().offset().left)
                        .css("top", this.getElement().parent().offset().top)
                        .width(this.getElement().parent().outerWidth())
                        .height(this.getElement().parent().outerHeight())

                    setTimeout(() => {
                        $animation.remove();
                        this.getElement().parent().css("visibility", "visible");
                        this.setDefaultFocus();
                    }, 300);
                }
            }
        }, options);

        this.adjustDialogSize(options);

        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();

        var options = <TFS_Dashboards_Control_WidgetHost.IWidgetHostOptions>{
            widget: this._options.widgetData,
            dashboardPermission: null,
            isLoaded: (host) => {
                this._widgetLoadedCallback(host);
            },
            remove: null,
            configure: null,
            widgetFactory: null,
            displayMode: TFS_Dashboards_Control_WidgetHost.WidgetHostDisplayMode.lightbox,
        }

        this._startTime = Performance.getTimestamp();

        options = this.adjustLightBoxSize(options);

        this._widgethost = this._options.widgetHost || <TFS_Dashboards_Control_WidgetHost.WidgetHost>Controls.BaseControl.createIn(TFS_Dashboards_Control_WidgetHost.WidgetHost, this.getElement(), options);
        this._widgethost.load(false);

        // base onDialogResize doesn't receive "ui" parameter so rolling our own
        this._bind("dialogresizestop", (e: JQueryEventObject, ui: any) => { this.onDialogResizeDone(e, ui); });

        // Since we don't have focus (due to blur above on open) we have to listen to keyboard in body
        // Internal close handler, keeping in this closure to be able to unbind
        var closeOnEscape = (e: JQueryEventObject) => {
            if (e.keyCode === Utils_UI.KeyCode.ESCAPE) {
                this.close();
                e.preventDefault();
            }
        }
        // Binding to body since we may not have focus
        $("body").on("keydown", closeOnEscape);
        // Resetting base onClose (instead of overriding) to still be able to access the closeOnEscape var in this closure
        this.onClose = (e: JQueryEventObject) => {
            super.onClose(e);
            // Removing our global key listener
            $("body").off("keydown", closeOnEscape);
        }

        // Soft-dismiss
        $(".ui-widget-overlay").click(() => {
            this.close();
        });

    }


    public onDialogResizeDone(e: JQueryEventObject, ui: any): any {
        // actual widget size - (dialog size before resize - dialog size after resize)
        this._widgethost.notifyLightboxResized({
            width: this._options.widgetData.lightboxOptions.width - (<number>this._options.width - ui.size.width),
            height: this._options.widgetData.lightboxOptions.height - (<number>this._options.height - ui.size.height)
        });
    }

    public _widgetLoadedCallback(host: Dashboard_Shared_Contracts.IWidgetHost): void {
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onLightboxWidgetLoaded(
            TFS_Dashboards_Common.DashboardPageExtension.getActiveDashboard(),
            this._options.widgetData.contributionId,
            this._options.widgetData.id,
            Performance.getTimestamp() - this._startTime
        );
    }

    private setDefaultFocus(): void {
        let $parentElement = this.getElement().parent();
        let $closeButton = $parentElement.find("button.ui-dialog-titlebar-close");
        $closeButton.focus();
    }

    /**
     * Framework dialog increases the height of the dialog to accomodate title (+66px) and subtitle (+22px) along with top (+20px) and bottom margin (+24px)
     * But the height returned in initialize is different from what is rendered, this function makes adjustments until frameworks fixes that.
     * @param options
     */
    private adjustDialogSize(options: WidgetLightboxDialogOptions): void {
        // when there is only title
        let titleHeightFix = WidgetLightboxDialog.TitleHeightAdjustment;

        // when there is subtitle
        let subtitleHeightFix = options.subtitle ? WidgetLightboxDialog.SubtitleHeightAdjustment : 0;

        // when there is no title or subtitle
        if (!options.title && !options.subtitle) {
            titleHeightFix = WidgetLightboxDialog.NoTitleAndSubtitleHeightAdjustment;
        }

        // Adjusting options to give the required space to content, instead of sizing the dialog itself
        options.width = <number>options.width + WidgetLightboxDialog.BorderWidthAdjustment;

        // Initial size of the dialog is different, since we adjust title at runtime - so accounting for that
        options.height = <number>options.height + titleHeightFix + subtitleHeightFix + Dashboard_Shared_Contracts.WidgetLightboxDialogConstants.BottomPaddingHeight;
    }

    /**
     * Adjust the widget host lightbox size accordingly to the browser view port
     * @param options - The option for the widgetHost
     */
    private adjustLightBoxSize(options: TFS_Dashboards_Control_WidgetHost.IWidgetHostOptions): TFS_Dashboards_Control_WidgetHost.IWidgetHostOptions {
        if (options.widget.lightboxOptions) {
            var titleHeightOffset = this._options.title != null ? WidgetLightboxDialog.TitleTextHeight : 0;
            var subTitleHeightOffset = this._options.subtitle != null ? WidgetLightboxDialog.SubTitleTextHeight : 0;

            var totalHeightOffset = titleHeightOffset + subTitleHeightOffset + WidgetLightboxDialog.HeaderPadding + Dashboard_Shared_Contracts.WidgetLightboxDialogConstants.BottomPaddingHeight;

            var lightboxOriginalHeight = options.widget.lightboxOptions.height;
            options.widget.lightboxOptions.height = lightboxOriginalHeight > (window.innerHeight - totalHeightOffset) ? (window.innerHeight - totalHeightOffset) : lightboxOriginalHeight; 
            options.widget.lightboxOptions.width = options.widget.lightboxOptions.width > window.innerWidth ? window.innerWidth : options.widget.lightboxOptions.width;
        }
        return options;
    }
}
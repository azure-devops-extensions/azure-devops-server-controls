/// <reference types="jquery" />

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Control_WidgetHost = require("Dashboards/Scripts/WidgetHost");

import {WidgetSizeConverter} from "TFS/Dashboards/WidgetHelpers";
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import TFS_Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");

import Controls = require("VSS/Controls");

import {IWidgetPreviewOptions} from "Dashboards/Scripts/BladeContracts";

/**
 * Interface for action possible to execute outside the Widget Preview. This is required to have
 * communication with button, curtain, other blade to the widget preview
 */
export interface IWidgetPreview {
    /**
     * Open the preview with in parameter the widget to preview.
     * @param {Widget} Widget - This is used to know what to preview
     * @param {boolean} isFromCatalog - Allows to know if from catalog
     */
    open(widget: TFS_Dashboards_Contracts.Widget, isFromCatalog?: boolean): void;

    /**
     * Refresh the widget with the setting passed by parameter
     * @param {ISettings} settings - All settings, changed and unmodified
     */
    refresh(settings: Dashboard_Shared_Contracts.ISettings): IPromise<TFS_Dashboards_WidgetContracts.WidgetStatus>;

    /**
    * Updates the size of the preview
    * @param {WidgetSize} size
    */
    updatePreviewSize(size: TFS_Dashboards_Contracts.WidgetSize): void;

    /**
     * Close the preview by returning the live preview tile at the widget position and delete this one.
     */
    close(): void;

    /**
     * When user clicks on preview, invoke this function
     */
    onClick(): void;
}

/**
 * This is the widget preview control.
 * It takes the widget id, search inside the grid, take the Html and push it to the preview for the case of existing widget
 *      OR
 * It create a new instance and fade in for the case of new widget
 */
export class WidgetPreview implements IWidgetPreview {
    private isPreviewOn: boolean = false;
    private isFromCatalog: boolean;
    private $widgetInConfiguration: JQuery;
    private options: IWidgetPreviewOptions;
    private widget: TFS_Dashboards_Contracts.Widget;
    public _widgetDuplicatedForPreview: Dashboard_Shared_Contracts.IWidgetHost;
    public _$previewDiv: JQuery;
    private previewWindowLeftPosition: number;
    private previewWindowTopPosition: number;
    public _previewWindowWidth: number;
    public _previewWindowHeight: number;
    public onClick: () => void;
    public static DelayLivePreviewMovementInMs: number = 500;
    private $parentContainer;

    /**
     * DOM Id for Preview Div
     */
    public static PreviewId: string = "preview";

    /**
     * DOM Id for Preview Div
     */
    public static ClickEventOnPreview: string = "click.Preview";

    /**
     * Classname for concealing the widgetHost
     */
    public static hiddenWidgetHostClass: string = "hidden-widget-host";

    public constructor(options: IWidgetPreviewOptions) {
        this.options = options;
        this.$parentContainer = options.$parentContainer || $("#container-with-scroll");
        this.initialize();
    }

    /**
     * Add a new listener to the Window that let the preview to redraw itself in the middle of the configuration left side space
     */
    public initialize(): void {
        window.addEventListener('resize', () => {
            this._positionInMiddle();
        });
    }

    /**
     * Open the preview with in parameter the widget to preview.
     * This react differently if this is open from the catalog because the underlying widget does not exist in that
     * case.
     * @param {WidgetBladeContext} context - This is used to know what to preview
     * @param {Blade<IBladeOptions>} bladeComeFrom - Allows to know from which blade we are coming from. Null if open directly from widget.
     */
    public open(widget: TFS_Dashboards_Contracts.Widget, isFromCatalog: boolean): void {
        // Deep-copying widget contract, to disconnect preview data from actual widget data
        // in case preview data gets changed by config blade, but user later cancels
        this.widget = $.extend(true, {}, widget);
        this.isPreviewOn = true;
        this.isFromCatalog = isFromCatalog; //Null is the case of calling from the grid in the context menu
        this.defineDimensionsAndPositions();
        this.createPreviewHtmlElements(this.widget);
        //Position and Dimension must be applied after the html creation of the preview
        this._$previewDiv.css('left', this.previewWindowLeftPosition);
        this._$previewDiv.css('top', this.previewWindowTopPosition);
        this._applyDimension();
        this._addClickEventOnPreview();
    }

    /**
     * When user clicks on preview, invoke callback
     */
    public _addClickEventOnPreview(): void {
        this._$previewDiv.on(WidgetPreview.ClickEventOnPreview, () => {
            if ($.isFunction(this.onClick)) {
                this.onClick();
            }
        });
    }

    /**
     * When user clicks on preview, invoke callback
     */
    public _removeClickEventOnPreview(): void {
        this._$previewDiv.off(WidgetPreview.ClickEventOnPreview);
    }

    /**
     * Show the preview window by making this one visible if the configuration blade is still in view. It also take care to hide the underlying real widget
     */
    public _showPreview(): void {
        if (this.isPreviewOn) {
            //We hide the existing widget when this one already exist: when we are not from the catalog
            this._hideWidgetInConfiguration(); // We hide the real widget until we close the preview.

            this._showPreviewHtml();
            this._$previewDiv.get(0).style.transitionDuration = WidgetPreview.DelayLivePreviewMovementInMs + 'ms';
            requestAnimationFrame(() => {
                this._positionInMiddle();
            });//We give a really quick delay just because to let the initial position handled by the browser before moving to the final position

        }
    }

    /**
     * Depending if the preview is from an existing or a new widget, the preview is different from the source of its widget.
     * One come from an existing widget, the other, we need to create a new one.
     */
    private defineDimensionsAndPositions(): void {
        this.applyPositionFromWidgetHostPosition();
        this._previewWindowWidth = this.$widgetInConfiguration.width();
        this._previewWindowHeight = this.$widgetInConfiguration.height();

    }

    /**
     * Change the window position (left and top) from the Widget in the grid (Gridster)
     */
    private applyPositionFromWidgetHostPosition(): void {
        this.$widgetInConfiguration = $('.widgethost[data-widget-id="' + this.widget.id + '"]'); //Required to get position
        if (this.$widgetInConfiguration.length === 0) {
            throw new Error("Cannot find the widget host for the widget in preview");
        }

        // The widget and the preview do not share a common offset parent and so we need to subtract the widget's parent offset to take its margin / scrolling into account
        // #container-without-scroll
        //     [notification area]
        //     #container-with-scroll
        //         [widget]
        //     [preview]
        var widgetOffset = this.$widgetInConfiguration.offset();
        var parentContainerOffset = this.$parentContainer.offset();
        var parentContainerPosition = this.$parentContainer.position(); // Parent position top will be > 0 if there is anything in the notification area
        this.previewWindowLeftPosition = widgetOffset.left - parentContainerOffset.left;
        this.previewWindowTopPosition = widgetOffset.top - parentContainerOffset.top + parentContainerPosition.top;
    }

    /**
     * Create the Html elements for the preview that consist of the preview itself but also the curtain over the widget.
     * The goal of the curtain above the widget is to disallow any widget actions
     * @param {WidgetBladeContext} context - Information about the context that is passing along to the widget host. Required to be
     * able to refresh to preview.
     */
    private createPreviewHtmlElements(widget: TFS_Dashboards_Contracts.Widget): void {
        this._$previewDiv = $('<div>')
            .attr('id', WidgetPreview.PreviewId)
            .addClass("live-preview");
        this._$previewDiv.append($('<div>')
            .attr('id', "preview-curtain"));

        this._widgetDuplicatedForPreview = <TFS_Dashboards_Control_WidgetHost.WidgetHost>Controls.BaseControl.createIn(
            TFS_Dashboards_Control_WidgetHost.WidgetHost,
            this._$previewDiv,
            <TFS_Dashboards_Control_WidgetHost.IWidgetHostOptions>{
                widget: widget,
                displayMode: TFS_Dashboards_Control_WidgetHost.WidgetHostDisplayMode.configurationPreview
            });

        this._widgetDuplicatedForPreview.load(false);
        this._$previewDiv.appendTo($('#container-with-scroll .dashboard-content-item .left'));
        this._$previewDiv.get(0).addEventListener("transitionend", () => {
            this._transitionEnd();
        });

        // Without the delay below, preview translation animation starts from bottom left in IE and Edge
        setTimeout(() => {
            this._showPreview();
        }, 10);
    }

    /**
     * Called once the preview is done moving
     */
    public _transitionEnd(): void {
        if (this.isPreviewOn) {
            this.previewInPosition();
        } else {
            //Remove the live preview
            this._hidePreviewHtml();
            // Display the widget with transition if come from an existing widget (configuration)
            this._showWidgetInConfiguration(); //Display back the real widget (see the open method that hide it)
            if ($.isFunction(this.options.onClosed)) {
                this.options.onClosed(this.isFromCatalog);
            }
        }
    }

    /**
     * When the preview is in the middle of the screen, this method is called
     */
    private previewInPosition(): void {
        if ($.isFunction(this.options.onOpened)) {
            this.options.onOpened(this.isFromCatalog);
        }
    }

    /**
     * Set the position of the preview
     * @param {number} left - Pixel
     * @param {number} top - Pixel
     */
    public _applyPosition(left: number, top: number): void {
        if (this._$previewDiv) {
            this._$previewDiv.css('left', left);
            this._$previewDiv.css('top', top);
        }
    }

    /**
     * Set the width and height of the preview window
     */
    public _applyDimension(): void {
        if (this._$previewDiv) {
            this._$previewDiv.css('width', this._previewWindowWidth);
            this._$previewDiv.css('height', this._previewWindowHeight);
        }
    }

    /**
	* Position the preview in the middle of the preview area. This is not the middle of the browser
	* but the middle of the dark blurry window.
	*/
    public _positionInMiddle(): void {
        this._applyPosition(this._getFinalPreviewLeftPosition(this._previewWindowWidth), this._getFinalPreviewTopPosition(this._previewWindowHeight));
    }

    /**
     * Get the left position of the preview which is the curtain container less the widget width half
     * @param previewWindowWidth
     * @returns {number} Pixel
     */
    public _getFinalPreviewLeftPosition(previewWindowWidth: number): number {
        return (window.innerWidth - this.options.widthOffset) / 2 - previewWindowWidth / 2;
    }

    /**
     * Get the top position of the preview which is the curtain height container less the widget height half.
     * @param previewWindowHeight
     * @returns {number} Pixel
     */
    public _getFinalPreviewTopPosition(previewWindowHeight: number): number {
        return (window.innerHeight / 2) - (previewWindowHeight / 2) - 50; //50 is about the VSTS header, this can be improved
    }

    /**
     * Close the preview by returning the live preview tile at the widget position and delete this one.
     * This method contains several animations that are queues. This allow to have distinct movement between
     * the movement and the fadeout. Read the CSS to see transition animation and tempo.
     */
    public close(): void {
        if (this.isPreviewOn) {
            this.isPreviewOn = false; //This need to be false here to detect on the animation over event that we are closing the preview
            this._removeClickEventOnPreview();

            if ($.isFunction(this.options.onClosing)) {
                this.options.onClosing(this.isFromCatalog);
            }

            //Move Animation, the onClosed will be caled once the animation is done
            this._$previewDiv.get(0).style.transitionDuration = WidgetPreview.DelayLivePreviewMovementInMs + 'ms';
            this._$previewDiv.css('left', this.previewWindowLeftPosition);
            this._$previewDiv.css('top', this.previewWindowTopPosition);
        }
    }

    /**
     * Refresh the widget with the setting passed by parameter
     * @param {ISettings} settings - All settings, changed and unmodified
     */
    public refresh(settings: Dashboard_Shared_Contracts.ISettings): IPromise<TFS_Dashboards_WidgetContracts.WidgetStatus> {
        return this._widgetDuplicatedForPreview.onInitializationComplete().then(() => {
            return this._widgetDuplicatedForPreview.reload(settings).then(null, () => {
                /* WidgetHost already logs exception and returns failure on promise. Don't allow the reload failure to go to unhandled path. */
            });
        });
    }

    /**
    * Updates the size of the preview
    * @param {WidgetSize} size
    */
    public updatePreviewSize(size: TFS_Dashboards_Contracts.WidgetSize): void {

        // Update the size in the parent div in the preview
        this._previewWindowWidth = WidgetSizeConverter.ColumnsToPixelWidth(size.columnSpan);
        this._previewWindowHeight = WidgetSizeConverter.RowsToPixelHeight(size.rowSpan);
        this._applyDimension();
        this._positionInMiddle();
    }

    public _hideWidgetInConfiguration(): void {
        if (this.$widgetInConfiguration) {
            this.$widgetInConfiguration.addClass(WidgetPreview.hiddenWidgetHostClass);
        }
    }

    public _showWidgetInConfiguration(): void {
        if (this.$widgetInConfiguration) {
            this.$widgetInConfiguration.removeClass(WidgetPreview.hiddenWidgetHostClass);
        }
    }

    /**
     * Show the Html container of the preview to the user
     */
    public _showPreviewHtml(): void {
        //this._$previewDiv.show();
        this._$previewDiv.get(0).style.display = "block";
    }
    /**
     * Remove the Html container of the preview to the user
     */
    public _hidePreviewHtml(): void {
        this._$previewDiv.remove();
    }

}

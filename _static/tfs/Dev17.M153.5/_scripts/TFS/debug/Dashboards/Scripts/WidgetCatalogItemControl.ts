/// <reference types="jquery" />

import Q = require("q");

import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import TFS_Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");
import { WidgetSource } from "Dashboards/Scripts/WidgetSource";
import { WidgetSizeConverter } from "TFS/Dashboards/WidgetHelpers";
import { createInitialWidgetState } from "Dashboards/Scripts/CreateInitialWidgetState";

import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");

import Controls = require("VSS/Controls");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Diag = require("VSS/Diag");
import * as Url from "VSS/Utils/Url"

export interface WidgetCatalogItemControlOptions {
    widget: TFS_Dashboards_Contracts.WidgetMetadata;
    /** Callback to trigger when item is selected */
    onselect: (control: WidgetCatalogItemControl) => void;
    /** Callback to trigger when item selection is confirmed */
    onconfirm: (control: WidgetCatalogItemControl) => void;
    /** Callback to trigger when up or down is pressed */
    onGridNavigate: (control: WidgetCatalogItemControl, keyCode: number) => void;
    /** Callback to execute when widget requested to be added */
    addWidgetCallback: (widget: TFS_Dashboards_Contracts.Widget, source: WidgetSource) => IPromise<TFS_Dashboards_Contracts.Widget>;
    /** What index in the catalog this item is */
    index: number;
}

/** Widget Catalog Item visual control */
export class WidgetCatalogItemControl extends Controls.Control<WidgetCatalogItemControlOptions> {
    public static MoreInfoAnimationDuration = 100;

    /** Distance (in pixels) between widget right-hand border and cursor drag position */
    private static WidgetDragMarginX = 20;

    /** Distance (in pixels) between widget top border and cursor drag position */
    private static WidgetDragMarginY = 50;

    /** Duration (in ms) of the (animation) transition between dragging the helper and dragging the widget */
    private static WidgetDragTransitionInMs = 500;

    /** Duration (in ms) of helper resize to match the widget */
    private static HelperResizeDurationInMs = 200;

    private $moreInfo: JQuery;
    private dragStartEvent: JQueryMouseEventObject = null;
    private dragEndEvent: JQueryMouseEventObject = null;

    /** Track whether we are dragging the helper (the handle created by JQuery UI) */
    private draggingHelper = false;

    /** Track whether we are (also) dragging the widget */
    private draggingWidget = false;

    /** Track the last event passed to the drag handler for the helper positioning animation */
    private lastDragEvent: MouseEvent;

    constructor(options: WidgetCatalogItemControlOptions) {
        super(options);
    }

    public getWidget(): TFS_Dashboards_Contracts.WidgetMetadata {
        return this._options.widget;
    }

    public refreshPublisher(): void {
        this.$moreInfo.find(".widget-publishername")
            .text(Utils_String.format(TFS_Dashboards_Resources.WidgetCatalog_PublisherTemplate, this._options.widget.publisherName));
    }

    /**
    * Enter and double click handler to pick the widget
    * @param e
    */
    public selectHandler(e: JQueryKeyEventObject): void {
        var keyCode = e.keyCode || e.which;

        if (keyCode === Utils_UI.KeyCode.ENTER || keyCode === Utils_UI.KeyCode.SPACE || e.type === "dblclick") {
            if (this.getElement().hasClass("selected") &&
                $.isFunction(this._options.onconfirm)
            ) {
                this._options.onconfirm(this);
            }
            else {
                if ($.isFunction(this._options.onselect)) {
                    this._options.onselect(this);
                }
            }

            e.preventDefault();
        }
    }

    /**
    * Handler to record drag event - we are measuring that people are trying to drag
    */
    public _trackDrag(endEvent: JQueryMouseEventObject): void {
        // During regular clicks mouse can also move - using 20 pixel threshold to tell between click and drag
        // We are not setting the element to "draggable" since ie/edge doesn't support setdragimage yet
        if (this.dragStartEvent !== null) {

            if (
                Math.abs(this.dragStartEvent.pageX - endEvent.pageX) > 20 ||
                Math.abs(this.dragStartEvent.pageY - endEvent.pageY) > 20
            ) {
                TFS_Dashboards_Telemetry.DashboardsTelemetry.onCatalogDrag();
            }

            this.dragStartEvent = null;
        }
    }

    public initialize() {
        var $element = this.getElement();

        const publisherNameId = `${this.getId()}-publishername`;
        const descriptionId = `${this.getId()}-description`;

        $element
            .addClass("widget-preview-tile")
            .attr("data-id", this._options.widget.contributionId)
            .attr("role", "row")
            .attr("aria-rowindex", this._options.index)
            .attr("aria-label", this._options.widget.name)
            .attr("aria-describedby", `${descriptionId} ${publisherNameId}`)
            .click(() => { this._options.onselect(this); })
            .dblclick((e) => {
                this.selectHandler(e);
            })
            .keydown((e: JQueryKeyEventObject) => {
                var keyCode = e.keyCode || e.which;
                if ((keyCode === Utils_UI.KeyCode.UP || keyCode === Utils_UI.KeyCode.DOWN || keyCode === Utils_UI.KeyCode.HOME || keyCode === Utils_UI.KeyCode.END)
                    && typeof this._options.onGridNavigate === "function") {
                    this._options.onGridNavigate(this, keyCode);
                    e.preventDefault();
                }
                else if (keyCode === Utils_UI.KeyCode.RIGHT) {
                    //focus on learn more.
                    this.$moreInfo.find("a").focus();
                    e.preventDefault();
                }

                this.selectHandler(e);
            })
            .focus(() => {
                // When tabbing to the list for the first time the first item isn't initially selected
                if (!this.getElement().hasClass("selected") && typeof this._options.onGridNavigate === "function") {
                    // ...This is a strange pattern that selection is performed by the passed in option
                    this._options.onselect(this);
                }
            })
            .mousedown((e) => {
                this.dragStartEvent = e;
            })
            .mouseup((e) => {
                this._trackDrag(e);
            })
            .mouseout((e) => {
                this._trackDrag(e);
            });


        $element.draggable({
            // The user drags an exact copy of the preview tile
            helper: "clone",
            // Show move cursor (same as widget dragging cursor)
            cursor: "move",
            // Add a minimum drag distance so that users don't accidentally drag when they want to click
            distance: 4,
            start: () => this.onStartDrag(),
            stop: () => this.onStopDrag(),
            drag: (e, ui) => this.onDrag(e as MouseEvent, ui.helper)
        });

        var mainContent = $("<div />")
            .addClass("widget-maincontent")
            .appendTo($element);

        mainContent.append(
            $("<img />")
                .addClass("widget-preview-image")
                .attr("src", this._options.widget.catalogIconUrl)
        );

        mainContent.append(
            $("<div />")
                .addClass("widget-preview-text")
                .append($("<div />")
                    .addClass("widget-name")
                    .text(this._options.widget.name))
                .append($("<div />")
                    .attr("id", descriptionId) // Id needed so aria-describedby can refer to this element
                    .addClass("widget-description")
                    .text(this._options.widget.description))
        );
        let learnMoreLinkAddress = this._options.widget.catalogInfoUrl || "#";
        learnMoreLinkAddress = Url.isSafeProtocol(learnMoreLinkAddress) ? learnMoreLinkAddress : "#";
        let $learnMoreLink = $("<a />")
            .text(TFS_Dashboards_Resources.WidgetCatalog_LearnMore)
            .attr("href", learnMoreLinkAddress)
            .attr("target", "_blank")
            .attr("tabindex", -1)
            .keydown((e: JQueryKeyEventObject) => {
                var keyCode = e.keyCode || e.which;
                if (keyCode === Utils_UI.KeyCode.LEFT) {
                    //focus back on catalog entry
                    this.getElement().focus();
                    e.preventDefault();
                }

                else if (keyCode === Utils_UI.KeyCode.ENTER) {
                    $learnMoreLink.click();
                    e.stopPropagation();
                }
                else if (keyCode === Utils_UI.KeyCode.SPACE) {
                    e.stopPropagation(); //Don't allow parent to treat a click here as widget creation, as we would on the container cell.
                    e.preventDefault(); //Disallow browser scrolling.
                }
            })
            .click((e: JQueryEventObject) => {
                e.stopPropagation(); //Don't allow parent to treat a click here as widget creation.
            });

        this.$moreInfo = $("<div />")
            .addClass("widget-preview-moreinfo")
            .append(
            $("<div />")
                .attr("id", publisherNameId) // Id needed so aria-describedby can refer to this element
                .addClass("widget-publishername")
                .text(Utils_String.format(TFS_Dashboards_Resources.WidgetCatalog_PublisherTemplate, this._options.widget.publisherName))
            )
            .append(
            $("<div />")
                .addClass("widget-learnmore-link")
                .append($learnMoreLink)
                .append(
                $("<span />")
                    .addClass("bowtie-icon")
                    .addClass("bowtie-navigate-external")
                )
            )
            .hide()
            .appendTo($element);
    }

    /**
    * Mark widget as selected
    */
    public select(): void {
        this.getElement().attr("tabindex", "0");
        this.getElement().addClass("selected");
        this.getElement().focus();
        this.$moreInfo.slideDown(WidgetCatalogItemControl.MoreInfoAnimationDuration);
    }

    /**
    * Mark widget as deselected
    */
    public deselect(): void {
        this.getElement().blur();
        this.getElement().removeAttr("tabindex");
        this.getElement().removeClass("selected");
        this.$moreInfo.slideUp(WidgetCatalogItemControl.MoreInfoAnimationDuration);
    }

    /** Fired when user starts to drag the helper */
    private onStartDrag(): void {
        this.draggingHelper = true;
        this.draggingWidget = false;
    }

    /** Fired when user stops dragging */
    private onStopDrag(): void {
        this.draggingHelper = false;
        this.draggingWidget = false;
    }

    /**
    * Fired when the use moves the mouse while dragging the helper
    * @param {MouseEvent} e The mouse event associated with the drag
    * @param {JQuery} $helper The element that is being dragged ("helper" is jQuery draggable terminology)
    */
    private onDrag(e: MouseEvent, $helper: JQuery): boolean {
        this.lastDragEvent = e;

        // We have picked up the widget, and the helper has faded out so now we return false to officially cancel the drag
        if (!this.draggingHelper) {
            return false;
        }

        var widgetResponse = createInitialWidgetState(this.getWidget());

        var widgetWidth = WidgetSizeConverter.ColumnsToPixelWidth(widgetResponse.size.columnSpan);
        var widgetHeight = WidgetSizeConverter.RowsToPixelHeight(widgetResponse.size.rowSpan);

        // If we haven't added / picked up the widget yet, check whether we have crossed the threshold
        if (!this.draggingWidget) {
            // Threshold == the boundary beyond which we will actually be dragging a widget rather than the helper
            var thresholdX = this.getElement().offset().left - WidgetCatalogItemControl.WidgetDragMarginX;

            if (e.clientX < thresholdX) {
                this.draggingWidget = true;

                // Animate helper to match the size the widget will have
                $helper.animate({
                    width: widgetWidth,
                    height: widgetHeight
                }, {
                        duration: WidgetCatalogItemControl.HelperResizeDurationInMs,
                        progress: (animation: IPromise<any>, progress: number, remainingMs: number) => {
                            // Adjust the helper to be in the same position the widget will occupy when it is picked up. This needs to happen as we drag
                            // so that the position can be updated on the fly as there is no way of accurately detecting the helper's actual offset from the
                            // cursor. By updating the position as the cursor is moved, we eventually home-in on the correct offset.
                            var helperOffset = $helper.offset();

                            var helperCursorOffsetX = this.lastDragEvent.clientX - helperOffset.left;
                            var helperCursorOffsetY = this.lastDragEvent.clientY - helperOffset.top;

                            var widgetCursorOffsetX = widgetWidth - WidgetCatalogItemControl.WidgetDragMarginX;
                            var widgetCursorOffsetY = WidgetCatalogItemControl.WidgetDragMarginY;

                            // Calculate the required change to get the helper into position
                            var deltaX = helperCursorOffsetX - widgetCursorOffsetX;
                            var deltaY = helperCursorOffsetY - widgetCursorOffsetY;

                            // Adjust the helper's margins to shift it in the right direction
                            var marginLeft = parseInt($helper.css("margin-left"));
                            var marginTop = parseInt($helper.css("margin-top"));
                            $helper.css("margin-left", marginLeft + deltaX * progress);
                            $helper.css("margin-top", marginTop + deltaY * progress);

                            Diag.Debug.logVerbose("deltaY: " + deltaY);
                        }
                    });

                // Hide the contents of the helper since we are resizing it
                $helper.children().fadeOut(WidgetCatalogItemControl.HelperResizeDurationInMs);

                // Add the widget, informing the callback that we are dragging to add which means the widget should initially be hidden
                this._options.addWidgetCallback(widgetResponse, WidgetSource.DragAndDrop)
                    .then((newWidget: TFS_Dashboards_Contracts.Widget) => {
                        var $widget = $(`[${TFS_Dashboards_Constants.JQuerySelectors.DataGridWidgetIdAttribute}='${newWidget.id}']`);

                        // Fade widget in while fading helper out
                        $widget.animate({
                            opacity: 1
                        }, WidgetCatalogItemControl.WidgetDragTransitionInMs,
                            () => {
                                // Restore the opacity after the animation is done
                                $widget.css("opacity", "");
                            });
                        $helper.fadeOut(WidgetCatalogItemControl.WidgetDragTransitionInMs, () => {
                            // Once the helper has faded out, we can officially cancel its drag as the widget
                            // is now under the cursor and is being dragged
                            this.draggingHelper = false;
                        });

                        // If we are still dragging the helper (i.e., they didn't let go of it since the call add widget call returned), transfer drag to the widget
                        if (this.draggingHelper) {
                            // We will click within the widget near the top-right
                            var offset = $widget.offset();
                            var clientX = offset.left + $widget.width() - WidgetCatalogItemControl.WidgetDragMarginX;
                            var clientY = offset.top + WidgetCatalogItemControl.WidgetDragMarginY;

                            // Fake the mousedown on the handle to pick up the widget. This means that the user is now dragging the widget (as well as the helper).
                            var $handle = $widget.find(".widget-container");
                            this.triggerMouseEvent(
                                "mousedown",
                                0,
                                clientX,
                                clientY,
                                $handle[0]);

                            // Move widget to under cursor. We need to trigger multiple events to get this to work with different browsers
                            // requiring a different number (Chrome > 1, Edge needs the most -- especially to reduce animation irregularities).
                            // This was confirmed via testing and there is no clearly understood technical reason for the requirement.
                            for (var i = 0; i < 10; i++) {
                                this.triggerMouseEvent(
                                    "mousemove",
                                    0,
                                    this.lastDragEvent.clientX,
                                    this.lastDragEvent.clientY,
                                    $handle[0]);
                            }
                        }
                });
            }
        }
    }

    //TODO: Move this to its own file
    private triggerMouseEvent(type: string, button: number, clientX: number, clientY: number, element: HTMLElement) {
        var mouseEvent: MouseEvent;

        // Use the MouseEvent constructor if available, otherwise fallback to the old (deprecated) way (for all versions of IE)
        if (typeof MouseEvent == "function") {
            mouseEvent = new MouseEvent(type, {
                clientX: clientX,
                clientY: clientY,
                bubbles: true,
                button: button
            });
        } else {
            mouseEvent = document.createEvent("MouseEvents");
            mouseEvent.initMouseEvent(
                /* eventType */type,
                /* bubbles */true,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                /* clientX */clientX,
                /* clientY */clientY,
                undefined,
                undefined,
                undefined,
                undefined,
                /* button */button,
                undefined);
        }

        element.dispatchEvent(mouseEvent);
    }
}
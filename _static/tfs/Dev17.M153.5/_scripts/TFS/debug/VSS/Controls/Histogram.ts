/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Controls = require("VSS/Controls");
import Controls_PopupContent = require("VSS/Controls/PopupContent");
import Diag = require("VSS/Diag");
import Utils_UI = require("VSS/Utils/UI");

export interface HistogramBarData {
    /**
     * Value of the bar.
     */
    value?: number;

    /**
     * Text value displayed when the bar is hovered.
     */
    title?: string;

    /**
     * State of the bar which effects vizualization.
     */
    state?: string;

    /**
     * Specifies whether the bar is selected or not.
     */
    selected?: boolean;

    /**
     * Action of this bar.
     */
    action?: Function;

    /**
     * Action arguments.
     */
    actionArgs?: any;
}

export interface IHistogramOptions extends Controls.EnhancementOptions {
    /**
     * List of bars to display in the histogram.
     */
    bars?: HistogramBarData[];

    /**
     * A generator function to return a list of bars to display in the histogram.
     */
    barGenerator?: () => HistogramBarData[];

    /**
     * Determines whether to render default bars before actual bar data loaded.
     */
    renderDefaultBars?: boolean;

    /**
     * Number of bars to display.
     */
    barCount?: number;

    /**
     * Width of a bar in px.
     */
    barWidth?: number;

    /**
     * Height of a bar in px.
     */
    barHeight?: number;

    /**
     * Space between the bars in px.
     */
    barSpacing?: number;

    /**
     * Hover state.
     */
    hoverState?: string;

    /**
     * Selected state.
     */
    selectedState?: string;

    /**
     * Determines whether the interaction is allowed or not.
     */
    allowInteraction?: boolean;
}

export class HistogramO<TOptions extends IHistogramOptions> extends Controls.Control<TOptions> {

    constructor(options?) {
        options.coreCssClass = "histogram";
        super(options);
    }

    public initialize(): void {
        var options = this._options;

        this._decorate();

        if (options.bars) {
            // If any items specified initially, load it
            this._load(options.bars);
        }
        else if ($.isFunction(options.barGenerator)) {
            // If a loader function is specified, call it to get the items
            this._load(options.barGenerator.call(this));
        }
        else if (options.renderDefaultBars !== false) {
            this._renderDefaultBars();
        }
    }

    public refresh(items: HistogramBarData[]): void {
        this._load(items);
    }

    public _clearBars(): void {
        this.getElement().find("div.bar").remove();
    }

    public _getBarCount(): number {
        var barCount = this._options.barCount || 9;
        // Ensuring bar count between 5 and 25
        barCount = Math.min(Math.max(barCount, 5), 100);
        return barCount;
    }

    private _getBarWidth(): number {
        var barWidth = this._options.barWidth || 5;
        // Ensuring bar width between 2 and 30 px
        barWidth = Math.min(Math.max(barWidth, 2), 30);
        return barWidth;
    }

    private _getBarSpacing(): number {
        var barSpacing = this._options.barSpacing || 2;
        // Ensuring bar spacing between 0 and 10 px
        barSpacing = Math.min(Math.max(barSpacing, 0), 10);
        return barSpacing;
    }

    private _getBarMaxHeight(): number {
        var barHeight = this._options.barHeight || 35;
        // Ensuring max bar height between 30 and 300 px
        barHeight = Math.min(Math.max(barHeight, 10), 300);
        return barHeight;
    }

    private _load(items: HistogramBarData[]): void {
        this._renderBars(items);
    }

    private _decorate(): void {
        // Setting width and height
        this.getElement().width(this._getBarCount() * (this._getBarSpacing() + this._getBarWidth()));
        this.getElement().height(this._getBarMaxHeight());
    }

    private _renderDefaultBars(): void {
        this._clearBars();

        for (var i = 0; i < this._getBarCount(); i++) {
            this.getElement().append(this._createBar(i));
        }
    }

    private _renderBars(items: HistogramBarData[]): void {
        Diag.Debug.assert($.isArray(items), "Array of items expected.");

        this._clearBars();

        var barCount = this._getBarCount();
        var l = barCount - items.length;
        var i: number;
        // If there is not enough items, rendering the default items first
        for (i = 0; i < l; i++) {
            this.getElement().append(this._createBar(i, { state: "default", value: 5 }));
        }

        // Rendering actual items
        let setBarForFirstFocus = false;
        while (i < barCount) {

            let item = items[i - l];
            let $bar = this._createBar(i, item);
            this.getElement().append($bar);

            // Set the bar to be focused by default. This should be the 'selected' bar by default, otherwise the last bar.
            if (!setBarForFirstFocus && (item && item.selected || i === barCount - 1) && this._options.allowInteraction !== false) {
                setBarForFirstFocus = true;
                $bar.attr("tabindex", "0");
            }

            i++;
        }
    }

    /**
     * @param index 
     * @param item 
     * @return 
     */
    private _createBar(index: number, item?: HistogramBarData): JQuery {

        var left,
            barElement,
            barWidth,
            barSpacing,
            state,
            height,
            hoverState = this._options.hoverState,
            selectedState = this._options.selectedState,
            allowInteraction = this._options.allowInteraction !== false;

        barWidth = this._getBarWidth();
        barSpacing = this._getBarSpacing();

        state = item && item.state;
        state = state || "default";

        // Calculating positioning related quantities
        left = index * (barWidth + this._getBarSpacing());

        height = item && item.value;
        height = typeof (height) === "number" ? (Math.max(Math.min(height, 100), 0)) : (height || (index % 2 ? 50 : 100));

        // Ensuring the item to be visible
        height = Math.max(height, Math.ceil(100 / this._getBarMaxHeight()));

        barElement = $("<div />").addClass("bar");
        barElement.addClass(state);

        // Positioning bar element
        barElement.css("left", left);
        barElement.css("width", barWidth);
        barElement.css("height", height + "%");
        barElement.css("bottom", 0);

        if (item) {
            if (selectedState && (item.selected || !allowInteraction)) {
                // If a selected state exists and item is selected, setting the selected class
                barElement.addClass(selectedState);
            }
            if (allowInteraction && hoverState && !item.selected) {
                // If a hover state exists and the item is not selected, attaching to hover events
                barElement.hover(function () {
                    $(this).addClass(hoverState);
                },
                    function () {
                        $(this).removeClass(hoverState);
                    });
            }
            if (allowInteraction && $.isFunction(item.action)) {

                barElement.addClass("interactive");

                // If the item has an action, attaching to click event
                barElement.data("action", { action: item.action, args: item.actionArgs });
                barElement.click(function () {
                    var action = $(this).data("action");
                    action.action(action.args);
                    return false;
                });

                barElement.keydown(function (event) {

                    var e = event || window.event;
                    if (e && e.keyCode) {
                        switch (e.keyCode) {

                            case Utils_UI.KeyCode.ENTER:
                            case Utils_UI.KeyCode.SPACE:
                                var action = $(this).data("action");
                                action.action(action.args);
                                return false;

                            case Utils_UI.KeyCode.RIGHT:
                            case Utils_UI.KeyCode.LEFT:

                                // Change focus to the next/previous interactive bar
                                let forward = e.keyCode === Utils_UI.KeyCode.RIGHT;
                                let $barToFocus = forward ? barElement.next(".bar.interactive") : barElement.prev(".bar.interactive");
                                if (!$barToFocus.length) {
                                    let $bars = barElement.parent().children(".bar.interactive");
                                    $barToFocus = forward ? $bars.first() : $bars.last();
                                }
                                if ($barToFocus.length) {
                                    barElement.removeAttr("tabindex");
                                    $barToFocus.attr("tabindex", "0");
                                    $barToFocus.focus();
                                }
                                return false;
                        }
                    }
                });
            }

            if (item.title) {
                barElement.attr("aria-label", item.title);
                Controls_PopupContent.RichContentTooltip.add(item.title, barElement[0]);
            }
        }

        return barElement;
    }
}

export class Histogram extends HistogramO<IHistogramOptions> { }
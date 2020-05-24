import "VSS/LoaderPlugins/Css!ProgressChart";

import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Utils_String = require("VSS/Utils/String");
import Resources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import TFS_FormatUtils = require("Presentation/Scripts/TFS/FeatureRef/FormatUtils");

export class ProgressControl extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs-ui-controls-accessories-progresscontrol";

    public static DECIMAL_PRECISION: number = 2;
    public static CSSCLASS_CONTAINER: string = "visual-progress-container";
    public static CSSCLASS_NOTOTAL: string = "visual-progress-no-total";
    public static CSSCLASS_TOTAL: string = "visual-progress-total";
    public static CSSCLASS_CURRENT: string = "visual-progress-current";
    public static CSSCLASS_UNDERALLOCATED: string = "visual-progress-underallocated";
    public static CSSCLASS_OVERALLOCATED: string = "visual-progress-overallocated";
    public static CSSCLASS_UNALLOCATED: string = "visual-progress-total-unallocated";
    public static CSSCLASS_SUMMARY_CURRENT: string = "visual-progress-summary-current";
    public static MINIMUM_PERCENTAGE_FOR_DISPLAY: number = 0.001;

    private _text: any;

    constructor(options?: any) {
        /// <summary>Constructs the ProgressControl</summary>
        /// <param name="current" type="Number">The current progress</param>
        /// <param name="total" type="Number">The total available progress</param>
        /// <param name="maxTotal" type="Number">The maximum total (used to identify 100% for visual control when controls of this type are clustered)</param>
        /// <param name="text" type="String">The display text</param>
        /// <param name="options" type="object" optional="true">
        ///     Optional control customizations:
        ///     {
        ///         inline: (boolean) indicates if the control should be displayed inline
        ///         suffixFormat: (string) e.g. "{0} hours"
        ///         cssClass: (string) class that the entire control should use
        ///         labelClass: (string) class that the label should use
        ///     }
        /// </param>

        super(options);

        Diag.Debug.assertParamIsNumber(options.current, "options.current");
        Diag.Debug.assertParamIsNumber(options.total, "options.total");
        Diag.Debug.assertParamIsNumber(options.maxTotal, "options.maxTotal");
        Diag.Debug.assertParamIsString(options.text, "options.text");

        this._text = options.text;
    }

    public initialize() {
        this._draw(
            this._options.current,
            this._options.total,
            this._options.maxTotal,
            this._options.text,
            this._options
        );
    }

    public getText(): string {
        /// <summary>Returns the text label of this progress control</summary>
        /// <returns type="String">The text on the progress control<returns>
        return this._text;
    }

    private _draw(current: number, total: number, maxTotal: number, text: string, options?: any) {
        /// <summary>Constructs the ProgressControl</summary>
        /// <param name="current" type="Number">The current progress</param>
        /// <param name="total" type="Number">The total available progress</param>
        /// <param name="maxTotal" type="Number">The maximum total (used to identify 100% for visual control when controls of this type are clustered)</param>
        /// <param name="text" type="String">The display text</param>
        /// <param name="options" type="object">
        ///     Optional control customizations:
        ///     {
        ///         inline: (boolean) indicates if the control should be displayed inline
        ///         suffixFormat: (string) e.g. "{0} hours"
        ///         cssClass: (string) class that the entire control should use
        ///         labelClass: (string) class that the label should use
        ///     }
        /// </param>

        Diag.Debug.assertParamIsNumber(current, "current");
        Diag.Debug.assertParamIsNumber(total, "total");
        Diag.Debug.assertParamIsNumber(maxTotal, "maxTotal");
        Diag.Debug.assertParamIsString(text, "text");
        Diag.Debug.assertParamIsObject(options, "options");

        if (options.summary) {
            this._drawSummaryStyle(current, total, maxTotal, text, options);
        }
        else {
            var $control = this.getElement(),
                $displayTextDiv = $("<div/>"),
                $progressTextDiv = $("<div/>"),
                progressText,
                stringWithSuffix,
                inline = options.inline || false;

            if (options.cssClass) {
                $control.addClass(options.cssClass);
            }

            if (options.cssLabelClass) {
                $displayTextDiv.addClass(options.cssLabelClass);
            }

            // If this control was customized to be "inlined" then we will push display text and progress onto same line
            if (inline) {
                $displayTextDiv.css("display", "inline").css("padding-right", "3px");
                $progressTextDiv.css("display", "inline");
            }

            if (text && $.isFunction(this._options.renderDisplayContents)) {
                $displayTextDiv.append(this._options.renderDisplayContents(text));
            }
            else {
                // Set the text
                $displayTextDiv.addClass("display-text");
                RichContentTooltip.addIfOverflow(text, $displayTextDiv);
                $displayTextDiv.text(text);
            }

            // Set the capacity info text
            if (total === 0) {
                stringWithSuffix = Utils_String.format(Resources.ProgressControl_NoCurrentValue, options.suffixFormat);
                progressText = Utils_String.format(stringWithSuffix, TFS_FormatUtils.FormatUtils.formatNumberForDisplay(current, ProgressControl.DECIMAL_PRECISION));
            }
            else {
                stringWithSuffix = Utils_String.format(options.suffixFormat, TFS_FormatUtils.FormatUtils.formatNumberForDisplay(total, ProgressControl.DECIMAL_PRECISION));
                progressText = Utils_String.format(Resources.ProgressControl_DefaultProgressText, TFS_FormatUtils.FormatUtils.formatNumberForDisplay(current, ProgressControl.DECIMAL_PRECISION), stringWithSuffix);
            }

            $progressTextDiv.text(progressText)
                .addClass("progress-text");

            $control.append($displayTextDiv);

            this._drawVisualProgress($control, current, total, maxTotal, inline);

            $control.append($progressTextDiv);
        }
    }

    private _drawSummaryStyle(current: number, total: number, maxTotal: number, text: string, options?: any) {
        /// <summary>Constructs the ProgressControl</summary>
        /// <param name="current" type="Number">The current progress</param>
        /// <param name="total" type="Number">The total available progress</param>
        /// <param name="maxTotal" type="Number">The maximum total (used to identify 100% for visual control when controls of this type are clustered)</param>
        /// <param name="text" type="String">The display text</param>
        /// <param name="options" type="object">
        ///     Optional control customizations:
        ///     {
        ///         inline: (boolean) indicates if the control should be displayed inline
        ///         suffixFormat: (string) e.g. "{0} hours"
        ///         cssClass: (string) class that the entire control should use
        ///         labelClass: (string) class that the label should use
        ///     }
        /// </param>

        Diag.Debug.assertParamIsNumber(current, "current");
        Diag.Debug.assertParamIsNumber(total, "total");
        Diag.Debug.assertParamIsNumber(maxTotal, "maxTotal");
        Diag.Debug.assertParamIsString(text, "text");
        Diag.Debug.assertParamIsObject(options, "options");

        var $control = this.getElement(),
            $container = $control.parent(),
            $currentDiv = $("<div/>"),
            $histogramDiv = $("<div/>").css("display", "inline-block"),
            $progressTextDiv = $("<div/>"),
            currentText,
            progressText,
            totalWithSuffix,
            inline = true,
            toolTip;

        if (options.cssClass) {
            $control.addClass(options.cssClass);
        }

        //Set the capacity info text
        totalWithSuffix = Utils_String.format(options.suffixFormat, TFS_FormatUtils.FormatUtils.formatNumberForDisplay(total, ProgressControl.DECIMAL_PRECISION));
        currentText = TFS_FormatUtils.FormatUtils.formatNumberForDisplay(current, ProgressControl.DECIMAL_PRECISION);
        progressText = Utils_String.format(Resources.ProgressControl_SummaryProgressText, totalWithSuffix);
        toolTip = Utils_String.format(Resources.ProgressControl_SummaryProgressToolTip, currentText, totalWithSuffix);

        $currentDiv.addClass(ProgressControl.CSSCLASS_SUMMARY_CURRENT)
            .attr("title", toolTip)
            .text(currentText)
            .appendTo($control);

        Diag.Debug.assert($container.width() > 0, "Container element does not have a width which usually indicates this control was initialized before adding to the DOM.");
        $histogramDiv.attr("title", toolTip)
            .css("width", $container.width() - $currentDiv.width());

        this._drawVisualProgress($histogramDiv, current, total, maxTotal, inline);

        $progressTextDiv.text(progressText)
            .attr("id", "progress-chart-remaining-time-id")
            .attr("title", toolTip)
            .appendTo($histogramDiv);

        $histogramDiv.appendTo($control);
    }

    private _getVisualPercentageValue(value: number): number {
        /// <summary>
        ///     Takes a value and returns it in a form that is accepted by the CSS width attribute. Note that the reason for needing to do
        ///     this is that very small percentages can be represented in Javascript in negative exponent form (e.g. "5.0e-8"). This value 
        ///     is not accepted by certain browsers as a valid CSS width. If we get a value that is below a certain threshold lets just 
        ///     return 0 since there will be no visual difference.
        /// </summary>
        /// <param name="value" type="Number">The calculated percentage</param>
        /// <returns type="Number">The percentage in a form gauranteed to be accepted by all browsers for a width setting<returns>

        Diag.Debug.assertParamIsNumber(value, "value");

        var result = value;

        if (result < ProgressControl.MINIMUM_PERCENTAGE_FOR_DISPLAY) {
            result = 0;
        }

        return result;
    }

    private _drawVisualProgress($container: JQuery, current: number, total: number, maxTotal: number, inline: boolean) {
        /// <summary>Draws the visual part of the progress control</summary>
        /// <param name="$container" type="jquery">The container to draw the visual progress in</param>
        /// <param name="current" type="Number">The current progress</param>
        /// <param name="total" type="Number">The total available progress</param>
        /// <param name="maxTotal" type="Number">The maximum total available progress</param>
        /// <param name="inline" type="boolean">Determines whether the visual progress should be rendered inline</param>

        Diag.Debug.assertParamIsObject($container, "$container");
        Diag.Debug.assertParamIsNumber(current, "current");
        Diag.Debug.assertParamIsNumber(total, "total");
        Diag.Debug.assertParamIsNumber(maxTotal, "maxTotal");
        Diag.Debug.assertParamIsBool(inline, "inline");

        var $outerDiv,
            $currentDiv,
            $totalDiv,
            totalPercentage,
            currentPercentage;

        if (total < 0 || current < 0 || (total === 0 && current === 0)) {
            // If total or current are not positive then do not attempt to draw visual progress. 
            return;
        }

        $outerDiv = $("<div/>").addClass(ProgressControl.CSSCLASS_CONTAINER);
        $currentDiv = $("<div/>").addClass(ProgressControl.CSSCLASS_CURRENT);

        if (total === 0) { // If total available progress is 0 then draw a different colored bar
            $currentDiv.addClass(ProgressControl.CSSCLASS_NOTOTAL);
            currentPercentage = current / maxTotal * 100;
            $currentDiv.css("width", this._getVisualPercentageValue(currentPercentage) + "%");
            $outerDiv.append($currentDiv);
        }
        else {
            $totalDiv = $("<div/>").addClass(ProgressControl.CSSCLASS_TOTAL);

            if (current <= total) { // Underallocated (or full allocation)
                totalPercentage = total / maxTotal * 100;
                currentPercentage = current / total * 100;

                // In this scenario current div is a child of total div
                $totalDiv.addClass(ProgressControl.CSSCLASS_UNALLOCATED);
                $currentDiv.addClass(ProgressControl.CSSCLASS_UNDERALLOCATED);
                $totalDiv.append($currentDiv);
                $outerDiv.append($totalDiv);
            }
            else { // Overallocated
                totalPercentage = total / current * 100;
                currentPercentage = current / maxTotal * 100;

                // In this scenario total div is a child of current div
                $currentDiv.addClass(ProgressControl.CSSCLASS_OVERALLOCATED);
                $totalDiv.addClass(ProgressControl.CSSCLASS_OVERALLOCATED);
                $currentDiv.append($totalDiv);
                $outerDiv.append($currentDiv);
            }

            $currentDiv.css("width", this._getVisualPercentageValue(currentPercentage) + "%");
            $totalDiv.css("width", this._getVisualPercentageValue(totalPercentage) + "%");
        }

        if (this._options.height) {
            $outerDiv.css({ 'height': this._options.height + 'px' });
            $currentDiv.css({ 'height': '100%' });
            if ($totalDiv) {
                $totalDiv.css({ 'height': '100%' });
            }
        }

        $container.append($outerDiv);
    }
}

VSS.initClassPrototype(ProgressControl, {
    _text: null
});
import * as Controls from "VSS/Controls";
import * as TFS_Dashboards_Constants from "Dashboards/Scripts/Generated/Constants";
import { RichContentTooltip } from "VSS/Controls/PopupContent";

/**
 * options contract for a control that *Presents* a numerical count. 
 */
export interface NumberDisplayControlOptions {
    /**
     * The unit measure for the number 
     */
    unit: string;

    /**
     * Number (scalar) to show within the content. 
     */
    count: number;

    /**
     * Short description of the unit, 3 ~ 4 words.
     */
    description: string;
}

/**
 * A control that display a number and its unit, it would limit the number to be less than 100.
 */
export class NumberDisplayControl extends Controls.Control<NumberDisplayControlOptions>{

    // dom section constants.
    public static DomClass_Root: string = "number-display";
    public static DomClass_Unit: string = "count-unit";
    public static DomClass_Description: string = "count-description";
    public static DomClass_Count: string = "big-number";
    public static DomClass_TextBlock: string = "text-block";
    public static DomClass_Plus: string = "too-many";

    private $count: JQuery;
    private $plus: JQuery;
    private $description: JQuery;

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            coreCssClass: NumberDisplayControl.DomClass_Root
        }, options));
    }

    public initialize(): void {
        super.initialize();

        // draws the control. 
        this._render();
    }

    /**
     * performs the actual dom composition of the control. 
     */
    private _render(): void {
        let container = this.getElement();
        container.empty();

        this.$count = $("<div>").
            addClass(NumberDisplayControl.DomClass_Count).
            attr("tabindex", 0).
            appendTo(container);

        this.setCount(this._options.count);

        this.$plus = $("<div>").
            addClass(NumberDisplayControl.DomClass_Plus).
            text("+").
            attr("aria-hidden", ""). // Omit the plus because screen readers always have the full number from the aria-label on the number
            appendTo(container);

        this.$description = $("<div>").addClass(NumberDisplayControl.DomClass_TextBlock).
            append(this.buildTextComponent(this._options.unit, NumberDisplayControl.DomClass_Unit)).
            append($("<br/>")).
            append(this.buildTextComponent(`(${this._options.description})`, NumberDisplayControl.DomClass_Description)).
            appendTo(container);
    }

    private buildTextComponent(text: string, cssClass: string): JQuery {
        let textComponent = $("<span>").
            addClass(cssClass).
            addClass(TFS_Dashboards_Constants.WidgetDomClassNames.TruncatedTextWithEllipsis).
            text(text).
            attr("aria-label", text);

        RichContentTooltip.addIfOverflow(text, textComponent);

        return textComponent;
    }

    /**
     * Renders the count/scalar
     * @param {number} count
     */
    public setCount(count: number): void {
        if (count == null) {
            return;
        }

        // Round the number so it doesn't display a fractional part for all presentation purposes
        let roundedCount = Math.round(count);

        // Truncate for visual rendering
        let truncatedCount = roundedCount;

        let showPlus = truncatedCount > 99;
        if (showPlus) {
            truncatedCount = 99;
            RichContentTooltip.add(count.toString(), this.$count);
        }
        this.$plus.css("display", showPlus ? "block" : "none");

        let hackyOffset = (truncatedCount < 10) ? "44px" : "78px";
        this.$description.css("left", hackyOffset);

        this.$count
            .text(truncatedCount)
            .attr("aria-label", `${this._options.unit} ${this._options.description} ${roundedCount}`);
    }

}

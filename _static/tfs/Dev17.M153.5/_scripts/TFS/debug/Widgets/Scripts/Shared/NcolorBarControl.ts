import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Utils_String = require("VSS/Utils/String");
import Widget_Utils = require("Widgets/Scripts/TFS.Widget.Utilities");
import { RichContentTooltip } from "VSS/Controls/PopupContent";

export interface NcolorBarCounts {
    /**
    * Number asigned to the bar
    */
    count: number;
    /**
    * Hover of the bar
    */
    hover: string;
    /**
    * Color of the bar
    */
    color: string;
}

interface NcolorBarSection {
    /**
    * index of bar section
    */
    index: number,
    /**
    * Value of bar section
    */
    value: number,
    /**
    * percentage of bar section
    */
    pct: number,
    /**
    * hover of bar section
    */
    hover: string,
    /**
    * text in bar section
    */
    text?: string
    /**
    * color of bar section
    */
    color: string
}

export interface NcolorBarControlOptions {
    counts: NcolorBarCounts[];
    size: number;
}

export class NcolorBarControl extends Controls.Control<NcolorBarControlOptions>{
    public static DomCoreCssClass: string = "widget-shared-ncolor-bar-control";

    private _countTotal: number = 0;
    private _counts: NcolorBarSection[] = [];
    private _size: number;


    constructor(options: NcolorBarControlOptions) {
        super(options);
        this._size = options.size;
        this.calculateBarPercentage(options.counts);
    }

    private calculateBarPercentage(counts: NcolorBarCounts[]): void {
        this._countTotal = 0;
        var length: number = counts.length;
        var percentageSum = 0;

        for (var i = 0; i < length; i++) { // get the value equals to 100%
            this._countTotal += counts[i].count;
        }
        for (var i = 0; i < length; i++) { // get the percentage value for each element
            if (this._countTotal !== 0) {
                this._counts.push({
                    index: i,
                    value: counts[i].count,
                    pct: counts[i].count * 100 / this._countTotal,
                    hover: counts[i].hover,
                    color: counts[i].color
                });
            } else {
                this._counts.push({
                    index: i,
                    value: counts[i].count,
                    pct: 0, hover: counts[i].hover,
                    color: counts[i].color
                });
            }
            // for each element get his size
            if (i < length - 1) {
                this._counts[i].pct = Math.floor(this._counts[i].pct * 100) / 100;
                percentageSum += this._counts[i].pct;
            }
        }
        //for the last element we calulate using the remaning part so it doesnt go out of bounds
        this._counts[this._counts.length - 1].pct = 100 - percentageSum;
    }
    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            coreCssClass: NcolorBarControl.DomCoreCssClass
        }, options));
    }

    public initialize(): void {
        super.initialize();
        this.render();
    }

    private textFits(value: number, percentage: number): boolean { // check that text in the bar dont get out of bands 
        var digits: number = 2; // we start digits in 2 because the margin equals the space of 1 plus 1 digit we always have
        var digitPercentageWidth: number = 6.5 * 100 / this._size; // the size of a digit is 6.5 pixels. We calculate the equivalent size for that in the bar percentage
        digitPercentageWidth += .3; // add an epsilon to aviod going out of bounds
        while (value / 10 > 1) { // if we can still divide between 10 it means we have more digits
            value /= 10;
            digits++;
        }
        return digits * digitPercentageWidth <= percentage; // a digit size is equivaletn to 2.1% se we check the text fits
    }

    private renderSection($container: JQuery, cssContainerClass: string, cssCountClass: string, section: NcolorBarSection): void {
        var sectionContainer: JQuery = $("<div/>").addClass(cssContainerClass);
        var $countSpan: JQuery;
        sectionContainer.attr({
            "style": "width:" + section.pct + "%",
            "aria-label": section.hover 
        });
        RichContentTooltip.add(section.hover, sectionContainer);

        if ((section.value > 0 || section.text) && this.textFits(section.value, section.pct) && section.index !== this._counts.length - 1) { // only render a value if is higher than zero
            $countSpan = $("<span/>").addClass(cssCountClass).text(section.text ? section.text : section.value);
        } else {
            $countSpan = $("<span/>").addClass(cssCountClass).text(Utils_String.empty);
        }

        if (section.pct  === 0) {
            sectionContainer.hide();
        }

        sectionContainer.append($countSpan);
        $container.append(sectionContainer);
    }

    private render(): void {
        var container: JQuery = $("<div/>").addClass("visual-progress-container");

        for (var i = 0; i < this._counts.length; i++) { // for each bar selects his color and text
            this.renderSection(container, "visual-progress-" + this._counts[i].color, "visual-progress-count", this._counts[i]);
        }

        container.appendTo(this.getElement());
    }
}

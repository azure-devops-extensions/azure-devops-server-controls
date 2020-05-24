/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");


export interface MultiLineTextBlockOptions {
    text: string;
    maxwidth: number;
}

/**
 * A multi-line text rendering block. This implementation only deals with 2 line scenario.
 */
export class MultiLineTextBlock extends Controls.Control<MultiLineTextBlockOptions> {
    //Currently it only supports 2 line rendering.
    public static maxLines = 2;
    public static widthLimitCSSPropertyName = "max-width"; //This is exposed for testability.

    constructor(options: MultiLineTextBlockOptions) {
        super(options);
    }

    public initializeOptions(options: MultiLineTextBlockOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "multiline-textblock"
        }, options));
    }

    public initialize() {
        super.initialize();

        var $container = this.getElement();
        var partitionedText = this.splitStrings(this._options.text || "");
        var partitionCount = partitionedText.length;

        for (var i = 0; i < MultiLineTextBlock.maxLines; i++) {
            if (i < partitionCount) {
                var $element = $("<span/>")
                    .css(MultiLineTextBlock.widthLimitCSSPropertyName, +this._options.maxwidth + "px")
                    .text(partitionedText[i]);
                $container.append($element);
            }
        }
    }

    /**
     * Heuristically split the available text into multiple lines.
     * Current heuristic - Word by word -> Line by line
     * This implementation always generates just two.
     * @param text
     */
    public splitStrings(text: string): string[] {
        var sep = " ";
        var splitSet = text.split(sep);
        //If we have 1 word, make the first empty (this is a layout shortcut!
        //If we have 2 or more words, Join all words after the second into the last line
        return (splitSet.length <= 1) ? ["", text] : [splitSet[0], splitSet.slice(1).join(sep)];
    }
}

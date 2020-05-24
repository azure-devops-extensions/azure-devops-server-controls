/// <reference types="jquery" />

import { EnhancementOptions, Control, BaseControl } from "VSS/Controls";
import * as Accessibility from "Presentation/Scripts/TFS/TFS.UI.Controls.Accessibility.Utils";

export interface MoreInfoOptions extends EnhancementOptions {
    /**
     * Text to show in the tooltip, which is displayed when the button is clicked
     */
    tooltipText: string,
    /**
     * Text to use in an aria-label.
     */
    ariaLabelText: string
}

/**
 * Provides standard UI for an an 'more info' button with a tooltip.
 */
export class MoreInfoControl<TOptions extends MoreInfoOptions> extends Control<TOptions> {

    public initializeOptions(options: TOptions): void {
        if (options == null) {
            throw new Error("Option required");
        }
        super.initializeOptions($.extend({
            coreCssClass: "more-info-control bowtie-icon bowtie-status-info-outline"
        },
        options));
    }

    public initialize() {
        super.initialize();        
        Accessibility.initializeConfigurationTooltip(this.getElement(), this._options.tooltipText, this._options.ariaLabelText);
    }
}


export interface HiddenFieldControlOptions {
    /**
     * Description text to render
     */ 
    description: string;
}

/**
 * Provides a simple control that is hidden.
 * 
 * Intended for use with aria-describeby for cases when the desired text doesn't exist on the page or isn't reliably accessible.
 */
export class HiddenFieldControl  extends Control<HiddenFieldControlOptions> {
    public initializeOptions(options: HiddenFieldControlOptions): void {
        super.initializeOptions($.extend({
            coreCssClass: "hidden-field-control",
        },
        options));
    }

    public initialize() {
        super.initialize();
        this.getElement().text(this._options.description);
    }
}



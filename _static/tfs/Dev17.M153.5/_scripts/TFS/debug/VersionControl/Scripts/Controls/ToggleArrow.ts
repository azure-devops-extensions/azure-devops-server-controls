/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Controls = require("VSS/Controls");

export interface ToggleArrowOptions {
    elementToToggle: JQuery;
}

/**
 * A control that displays a toggle down-arrow and, when clicked, toggles another element.
 * CollapsiblePanel requires the whole header be clickable and we want to use a new toggle icon
 * anyway, so a new, simple control here is not too redundant.
 */
export class ToggleArrow extends Controls.BaseControl {
    private _isExpanded = false;
    private _toggleIcon = $("span");
    private _elementToToggle: JQuery;

    public initializeOptions(options?: ToggleArrowOptions) {
        super.initializeOptions($.extend({
            tagName: "span",
            coreCssClass: "vc-toggle-arrow",
        }, options));
    }

    private _refreshIcon() {
        this._toggleIcon.toggleClass("bowtie-chevron-down", !this._isExpanded);
        this._toggleIcon.toggleClass("bowtie-chevron-up", this._isExpanded);
    }

    private _refreshElementToToggleVisibility() {
        this._elementToToggle.toggle(this._isExpanded);
    }

    private _refresh() {
        this._refreshIcon();
        this._refreshElementToToggleVisibility();
    }

    private _toggle() {
        this._isExpanded = !this._isExpanded;
        this._refresh();
    }

    public initialize() {
        super.initialize();

        const options: ToggleArrowOptions = this._options;

        this._elementToToggle = options.elementToToggle;

        this._toggleIcon = this.getElement()
            .addClass("bowtie-icon")
            .attr("tabindex", "0")
            .click(this._toggle.bind(this));

        this._refresh();
    }
}
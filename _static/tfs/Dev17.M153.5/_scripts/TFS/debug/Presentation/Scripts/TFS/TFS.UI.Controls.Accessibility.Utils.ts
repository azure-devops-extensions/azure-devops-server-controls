import Utils_UI = require("VSS/Utils/UI");
import PopupContent = require("VSS/Controls/PopupContent");

/**
 * Adds popup and keyboard accessibility to a tooltip element used in configuration
 * @param $tooltipHost {JQuery} The host of the tooltip element (usually an icon)
 * @param tooltipText {string} The text to display in the popup when the user clicks the tooltip element
 */
export function initializeConfigurationTooltip($tooltipHost: JQuery, tooltipText: string, ariaLabelText: string) {
    $tooltipHost.attr("role", "button")
        .attr("aria-label", ariaLabelText);

    // Ensure a secure tooltip
    PopupContent.RichContentTooltip.add(tooltipText, $tooltipHost, { openCloseOnHover: false, setAriaDescribedBy: true });
    $tooltipHost.bind("blur", (e: JQueryEventObject) => {
        PopupContent.RichContentTooltip.hide();
    });

    Utils_UI.accessible($tooltipHost);
}

/**
 * Adds tooltip to an element if content of that element overflows
 * Also makes it tabable
 * @param element - adds tooltip to this element
 */
export function addTooltipIfOverflow(element: JQuery) {
    PopupContent.RichContentTooltip.addIfOverflow(element.text(), element);
    if (Utils_UI.contentsOverflow(element)) {
        element.attr("tabindex", "0");
    }
}

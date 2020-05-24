import { DomAttributeConstants } from "DistributedTaskControls/Common/Common";

export function isFocusable(element: HTMLElement): boolean {
    const isFocusable =  element.hasAttribute(DomAttributeConstants.DataIsFocusableAttrib) ||
        element.tagName === "A" ||
        element.tagName === "INPUT" ||
        element.tagName === "BUTTON" ||
        element.tagName === "TEXTAREA" ||
        (element.hasAttribute(DomAttributeConstants.TabIndex) && parseInt(element.getAttribute(DomAttributeConstants.TabIndex)) >= 0) ||
        (element.getAttribute && element.getAttribute("role") === "BUTTON");

    const isReadOnlyOrDisabled = element.hasAttribute(DomAttributeConstants.DisabledAttrib) || element.hasAttribute(DomAttributeConstants.ReadOnlyAttrib);
    return isFocusable && !isReadOnlyOrDisabled;
}

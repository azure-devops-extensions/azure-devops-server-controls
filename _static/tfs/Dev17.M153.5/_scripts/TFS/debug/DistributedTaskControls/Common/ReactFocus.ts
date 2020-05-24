import { logError } from "VSS/Diag";
import { format } from "VSS/Utils/String";

//This code is similar to the file ReactFocus in build code 
//https://mseng.visualstudio.com/VSOnline/_git/VSO?path=%2FTfs%2FService%2FWebAccess%2FBuild%2FScripts%2FReactFocus.ts&version=GBmaster&_a=contents
//We should try to use this to handle focus wherever office fabric components do not provide this functionality
/* tslint:disable */

export function focusFocusableElement(root: HTMLElement) {
    if (!root) {
        logError("ReactFocus: focusFocusableElement: There is no element to focus.");
        return;
    }
    // We grab the first focusable element and trigger focus on it
    const focusableElement = root.querySelector('[data-is-focusable]') as HTMLElement;

    // we need to set tabIndex so that focus will work, note since this is inside a list, we would need it to be -1
    if (focusableElement) {
        focusableElement.setAttribute("tabindex", "-1");
        focusableElement.focus();
    }
}

export function focusDetailsListRow(root: HTMLElement, listIndex: number) {
    if (!root) {
        logError("ReactFocus: focusDetailsListRow: There is no element to focus.");
        return;
    }

    // Grab the corresponding item
    const focusableElement = root.querySelector(format('[data-list-index="{0}"]', listIndex)) as HTMLElement;
    focusFocusableElement(focusableElement);
}
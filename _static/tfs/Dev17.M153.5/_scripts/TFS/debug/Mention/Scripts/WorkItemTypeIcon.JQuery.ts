/// <reference types="jquery" />

import {
    IIconAccessibilityOptions,
    renderWorkItemTypeIcon as renderWorkItemTypeIconReact,
    unmountWorkItemTypeIcon
} from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import * as DataProvider from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";

export { IIconAccessibilityOptions } from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";

/**
 * Render work item type icon control
 *
 * @container Container element
 * @workItemTypeName Work item type name
 * @input Project name or custom input
 * @iconAccessibilityOptions Custom accessibility options to the icon control
 */
export function renderWorkItemTypeIcon(
    container: Element,
    workItemTypeName: string,
    input: string | DataProvider.IColorAndIcon,
    iconAccessibilityOptions?: IIconAccessibilityOptions): void {

    renderWorkItemTypeIconReact(container, workItemTypeName, input as any, iconAccessibilityOptions);
    const $container = $(container);
    const $clone = $container.children().first().clone();
    unmountWorkItemTypeIcon(container);
    $clone.appendTo($container);
}
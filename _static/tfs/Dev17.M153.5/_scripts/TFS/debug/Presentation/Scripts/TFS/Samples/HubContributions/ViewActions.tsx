/// <reference path='../../../../../../../../Vssf/Webplatform/Platform/Scripts/VSS/References/VSS.SDK.Interfaces.d.ts' />

import { showMessageDialog } from "VSS/Controls/Dialogs";
import { registerPivotActions } from "VSSPreview/Utilities/PivotContributions";

import { IListPivotActionContext, ITogglePivotActionContext } from "./Pivots";

function getCommonMenuItems(): IContributedMenuItem[] {
    return [
        {
            id: "getContext",
            text: "Get Context",
            icon: "fabric://Globe",
            action: (context: any): void => {
                showMessageDialog("Context: " + JSON.stringify(context, null, 4), { title: "Contributed Action Context" });
            },
        },
    ];
}

/**
 * Provides view actions that move a selection up or down, and automatically disables those buttons
 * when appropriate.
 */
registerPivotActions(
    "listPivot.viewActions",
    "ms.vss-tfs-web.hub-contributions-sample-hub:pivotbar:listPivot:contributedViewActions",
    (context: IListPivotActionContext): IContributedMenuItem[] => {
        const items: (IContributedMenuItem & { important?: boolean })[] = [
            ...getCommonMenuItems(),
            {
                id: "down",
                important: true,
                disabled: !!context.atBottom,
                icon: "fabric://ChevronDown",
                action: context.selectDown,
            },
            {
                id: "up",
                important: true,
                disabled: !!context.atTop,
                icon: "fabric://ChevronUp",
                action: context.selectUp,
            },
        ];
        return items;
    }
);

/**
 * Provides a view action to toggle the enabled state.
 */
registerPivotActions(
    "togglePivot.viewActions",
    "ms.vss-tfs-web.hub-contributions-sample-hub:pivotbar:togglePivot:contributedViewActions",
    (context: ITogglePivotActionContext): IContributedMenuItem[] => {
        const items: (IContributedMenuItem & { important?: boolean })[] = [
            ...getCommonMenuItems(),
            {
                id: "toggleEnabled",
                important: true,
                text: context.enabled ? "Disable" : "Enable",
                icon: "fabric://Globe",
                action: () => { context.setEnabled(!context.enabled); },
            },
        ];
        return items;
    }
);

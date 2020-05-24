/// <reference path='../../../../../../../../Vssf/Webplatform/Platform/Scripts/VSS/References/VSS.SDK.Interfaces.d.ts' />

import { showMessageDialog } from "VSS/Controls/Dialogs";
import { registerContent, VSS } from "VSS/SDK/Shim";

import { IHubActionContext } from "./Hub";

/**
 * Provides a contributed command that displays the context passed to it.
 */
registerContent("pivot.commands", contributionContext => {
    // register an object that implements getMenuItems()
    VSS.register("ms.vss-tfs-web.hub-contributions-sample-hub:pivotbar:contributedCommands", {
        getMenuItems: (context: IHubActionContext): IContributedMenuItem[] => {
            const items: (IContributedMenuItem & { important?: boolean })[] = [
                {
                    id: "view-hubviewstate",
                    text: "Show View State",
                    icon: "fabric://Globe",
                    important: true,
                    action: (): void => {
                        showMessageDialog("This is a command contributed directly to the pivotbar (hub). Context: " + JSON.stringify(context.viewOptions, null, 4), { title: "View State" });
                    },
                },
            ];
            return items;
        },
    });
});
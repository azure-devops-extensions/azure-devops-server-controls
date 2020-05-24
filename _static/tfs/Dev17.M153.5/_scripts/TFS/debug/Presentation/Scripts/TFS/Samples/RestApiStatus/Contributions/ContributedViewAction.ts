import { showMessageDialog } from "VSS/Controls/Dialogs";
import { registerContent, VSS } from "VSS/SDK/Shim";

import { Handler } from "./ContributedCommand";

class ViewActionHandler extends Handler {

    public getMenuItems(context: any) {
        return super.getMenuItems(context).concat([{
            id: "down",
            important: true,
            disabled: !!context.atBottom,
            icon: "fabric://ChevronDown",
            action: this.downHandler.bind(this),
        },
        {
            id: "up",
            important: true,
            disabled: !!context.atTop,
            icon: "fabric://ChevronUp",
            action: this.upHandler.bind(this),
        }]);
    }

    private downHandler() {

    }

    private upHandler() {

    }
}

// This file implements the action for the contributed PivotBar ViewAction.
// The contribution is ms.vss-tfs-web.api-status-sample-hub.pivotbar.contributedActions.viewActions.contributedViewAction,
// defined in vss-samples.json.

registerContent("contributed.viewAction", context => {
    const id = "ms.vss-tfs-web.api-status-sample-hub.pivotbar.contributedViewAction";
    VSS.register(id, new ViewActionHandler({ id: id, text: "Contributed ViewAction" }));
});

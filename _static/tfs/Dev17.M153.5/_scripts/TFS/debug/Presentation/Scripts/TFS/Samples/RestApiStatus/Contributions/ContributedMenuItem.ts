import { showMessageDialog } from "VSS/Controls/Dialogs";
import { registerContent, VSS } from "VSS/SDK/Shim";

import { Handler } from "./ContributedCommand";

// This file implements the action for the contributed PivotBar MenuItem.
// The contribution is ms.vss-tfs-web.api-status-sample-hub.pivotbar.contributedActions.menuItems.contributedMenuItem,
// defined in vss-samples.json.

registerContent("contributed.menuItem", context => {
    const id = "ms.vss-tfs-web.api-status-sample-hub.pivotbar.contributedActions.menuItems.contributedMenuItem";
    VSS.register(id, new Handler({ id, text: "Contributed MenuItem", important: true }));
});

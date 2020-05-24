import * as Controls from "VSS/Controls";

import { setGlobalPageContext } from "VersionControl/Scenarios/Shared/EnsurePageContext";

/**
 * Common Hub class for pages in VC.
 */
export class HubBase extends Controls.Control<{}> {
    public initialize(): void {
        super.initialize();

        setGlobalPageContext(this._options as any);
    }
}

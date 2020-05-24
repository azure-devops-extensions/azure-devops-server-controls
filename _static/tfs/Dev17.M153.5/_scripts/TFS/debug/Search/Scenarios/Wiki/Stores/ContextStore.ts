import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as VSSStore from "VSS/Flux/Store";

import { ContextUpdatedPayload } from "Search/Scenarios/Wiki/ActionsHub";

/**
 * Basic context information related to the page.
 */
export class ContextStore extends VSSStore.Store {
    private _tfsContext: TfsContext;

    constructor() {
        super();
        this._tfsContext = null;
    }

    public getTfsContext(): TfsContext {
        return this._tfsContext;
    }

    public onContextUpdated = (payload: ContextUpdatedPayload) => {
        this._tfsContext = payload.tfsContext;
        this.emitChanged();
    }
}

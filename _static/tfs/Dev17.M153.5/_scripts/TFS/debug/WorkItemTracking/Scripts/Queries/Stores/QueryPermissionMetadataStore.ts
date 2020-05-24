import * as StoreBase from "VSS/Flux/Store";
import { ActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/ActionsHub";

export class QueryPermissionMetadataStore extends StoreBase.Store {

    private _queryItemPermissionSet: string;
    constructor(actions: ActionsHub) {
        super();

        actions.InitializeQueryPermissionMetadata.addListener((metadata: string) => {
            this._queryItemPermissionSet = metadata;
            this.emitChanged();
        });
    }

    public getAll(): string {
        return this._queryItemPermissionSet;
    }
}

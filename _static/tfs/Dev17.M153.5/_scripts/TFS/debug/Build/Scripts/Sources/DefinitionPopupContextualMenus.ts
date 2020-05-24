import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";

import { DefinitionContextualMenuitemsActionHub } from "Build/Scripts/Actions/DefinitionContextualMenuItems";
import * as DefinitionContextualMenuItems from "Build/Scripts/Components/DefinitionContextualMenuItems";

import { BuildDefinitionReference } from "TFS/Build/Contracts";

export class DefinitionPopupContextualMenus extends TfsService {
    private _initialized: boolean = false;
    private _fetchedInitializedAsyncItems: boolean = false;

    public fetchAsyncItems(definition: BuildDefinitionReference, actionHub: DefinitionContextualMenuitemsActionHub) {
        this._fetchAsyncItems(definition, actionHub);
        this._initialized = true;
    }

    private _fetchAsyncItems(definition: BuildDefinitionReference, actionHub: DefinitionContextualMenuitemsActionHub) {
        DefinitionContextualMenuItems.getAsyncDashboardMenuItem(definition, actionHub);
    }
}
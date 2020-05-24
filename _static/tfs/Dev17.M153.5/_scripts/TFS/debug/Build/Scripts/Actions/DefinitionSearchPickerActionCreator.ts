import { getDefinitions } from "Build/Scripts/Actions/DefinitionsActionCreator";
import { DefinitionSearchPickerActionHub } from "Build/Scripts/Actions/DefinitionSearchPickerActions";
import { DefaultClientPageSizeMax } from "Build/Scripts/Constants";
import { DefinitionSource } from "Build/Scripts/Sources/Definitions";
import { getUtcDateString } from "Build/Scripts/Utilities/DateUtility";

import { GetDefinitionsResult, GetDefinitionsOptions } from "Build.Common/Scripts/ClientContracts";

import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";

import { DefinitionQueryOrder } from "TFS/Build/Contracts";

import { VssConnection } from "VSS/Service";

export class DefinitionSearchPickerActionCreator extends TfsService {
    private _definitionSource: DefinitionSource;
    private _searchPromise: IPromise<any> = null;

    public initializeConnection(connection: VssConnection): void {
        super.initializeConnection(connection);

        this._definitionSource = this.getConnection().getService(DefinitionSource);
    }

    public startsWithSearchDefinitions(name: string, actionHub: DefinitionSearchPickerActionHub): void {
        name = name || "";

        const filter: GetDefinitionsOptions = {
            queryOrder: DefinitionQueryOrder.DefinitionNameAscending,
            $top: DefaultClientPageSizeMax * 2,
            minMetricsTime: getUtcDateString(7),
            name: name + "*"
        };

        let searchPromise = getDefinitions(this._definitionSource, filter)
            .then((result) => {
                // if a new search was initiated while this one was running, ignore this one in favor of the newest
                if (this._searchPromise === searchPromise) {
                    delete this._searchPromise;

                    actionHub.definitionsUpdated.invoke({
                        definitionIds: result.definitions.map((definition) => definition.id),
                        searchTerm: name
                    });
                }
            });

        this._searchPromise = searchPromise;
    }

    public clearSearch(actionHub: DefinitionSearchPickerActionHub) {
        // since this is just triggering an action move it to event loop with out running this on UI thread
        // we are intentionally not using the arrow operator, there's no reason to create a closure on current instance of class unnecessarily, we just need actionHub
        setTimeout(function () {
            actionHub.searchCleared.invoke(null);
        }, 0);
    }
}
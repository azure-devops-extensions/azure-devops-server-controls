import { allDefinitionsUpdated } from "Build/Scenarios/Definitions/All/Actions/AllDefinitions";
import { getDefinitions } from "Build/Scripts/Actions/DefinitionsActionCreator";
import { IDefinitionsBehavior } from "Build/Scripts/Behaviors";
import { DefaultClientPageSizeMax } from "Build/Scripts/Constants";
import { DefinitionSource } from "Build/Scripts/Sources/Definitions";
import { DefinitionFavoriteStore, getDefinitionFavoriteStore } from "Build/Scripts/Stores/DefinitionFavorites";
import { DefinitionStore, getDefinitionStore } from "Build/Scripts/Stores/Definitions";
import { getUtcDateString } from "Build/Scripts/Utilities/DateUtility";

import { GetDefinitionsResult, GetDefinitionsOptions } from "Build.Common/Scripts/ClientContracts";
import { BuildClientService } from "Build.Common/Scripts/ClientServices";

import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";

import { DefinitionQueryOrder } from "TFS/Build/Contracts";

import { VssConnection } from "VSS/Service";
import * as Utils_Array from "VSS/Utils/Array";

export class AllDefinitionsActionCreator extends TfsService {
    protected _definitionSource: DefinitionSource;
    private _searchPromise: IPromise<GetDefinitionsResult> = null;

    public initializeConnection(connection: VssConnection): void {
        super.initializeConnection(connection);

        this._definitionSource = this.getConnection().getService(DefinitionSource);
    }

    public getAllDefinitions(filter?: GetDefinitionsOptions): IPromise<GetDefinitionsResult> {
        if (!filter) {
            filter = {};
        }

        if (!filter.$top) {
            filter.$top = DefaultClientPageSizeMax;
        }

        if (!filter.queryOrder) {
            filter.queryOrder = DefinitionQueryOrder.DefinitionNameAscending;
        }

        if (!filter.path) {
            filter.path = "\\";
        }

        if (!filter.minMetricsTime) {
            filter.minMetricsTime = getUtcDateString(7);
        }

        return getDefinitions(this._definitionSource, filter)
            .then((result) => {
                allDefinitionsUpdated.invoke({
                    filter: filter,
                    append: !!filter.continuationToken,
                    definitionIds: result.definitions.map((definition) => definition.id),
                    continuationToken: result.continuationToken
                });
                return result;
            });
    }

    public searchDefinitions(filter: GetDefinitionsOptions): void {
        // make sure we clear continuation token
        filter = {
            queryOrder: DefinitionQueryOrder.DefinitionNameAscending,
            $top: DefaultClientPageSizeMax,
            minMetricsTime: getUtcDateString(7),
            ...filter,
            continuationToken: ""
        };

        const behavior: IDefinitionsBehavior = {
            preventAutoFocus: true
        };

        let searchPromise = getDefinitions(this._definitionSource, filter, behavior)
            .then((result) => {
                // if a new search was initiated while this one was running, ignore this one in favor of the newest
                if (this._searchPromise === searchPromise) {
                    delete this._searchPromise;

                    allDefinitionsUpdated.invoke({
                        filter: filter,
                        append: !!filter.continuationToken,
                        definitionIds: result.definitions.map((definition) => definition.id),
                        continuationToken: result.continuationToken,
                        behavior: behavior
                    });
                    return result;
                }
            });

        this._searchPromise = searchPromise;
    }

    public ensureFavoritesLoaded(): void {
        let definitionFavoriteStore = getDefinitionFavoriteStore();
        let favoriteDefinitionIds = definitionFavoriteStore.getAllFavoriteDefinitionIds();
        if (favoriteDefinitionIds.length > 0) {
            let definitionStore = getDefinitionStore();
            let definitions = definitionStore.getDefinitionsById(favoriteDefinitionIds);
            let missingIds = Utils_Array.subtract(favoriteDefinitionIds, definitions.map(d => d.result && d.result.id));
            if (missingIds.length > 0) {
                getDefinitions(this._definitionSource, {
                    definitionIds: missingIds.join(",")
                });
            }
        }
    }
}

/**
 * Takes a string and converts into *{string}* so that we can enable fuzzy search
 * @param text text to convert
*/
export function createFilterTextForFuzzySearch(text: string): string {
    return text ? "*" + (text || "") + "*" : null;
}
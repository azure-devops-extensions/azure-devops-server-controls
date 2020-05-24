import { allDefinitionsUpdated } from "Build/Scenarios/Definitions/All2/Actions/AllDefinitions";
import { getDefinitions } from "Build/Scripts/Actions/DefinitionsActionCreator";
import { DefaultClientPageSizeMax } from "Build/Scripts/Constants";
import { DefinitionSource } from "Build/Scripts/Sources/Definitions";
import { DefinitionFavoriteStore, getDefinitionFavoriteStore } from "Build/Scripts/Stores/DefinitionFavorites";
import { DefinitionStore, getDefinitionStore } from "Build/Scripts/Stores/Definitions";
import { getUtcDateString } from "Build/Scripts/Utilities/DateUtility";

import { GetDefinitionsResult, GetDefinitionsOptions } from "Build.Common/Scripts/ClientContracts";
import { BuildClientService } from "Build.Common/Scripts/ClientServices";
import { RootPath } from "Build.Common/Scripts/Security";

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

        filter.includeLatestBuilds = true;
        filter.includeAllProperties = true;

        if (!filter.$top) {
            filter.$top = DefaultClientPageSizeMax;
        }

        if (!filter.queryOrder) {
            filter.queryOrder = DefinitionQueryOrder.DefinitionNameAscending;
        }

        if (!filter.path) {
            filter.path = RootPath;
        }

        if (!filter.minMetricsTime) {
            filter.minMetricsTime = getUtcDateString(7);
        }

        return getDefinitions(this._definitionSource, filter)
            .then((result) => {
                let append: boolean = (filter.path !== RootPath) || !!filter.continuationToken;
                allDefinitionsUpdated.invoke({
                    filter: filter,
                    append: append,
                    definitionIds: result.definitions.map((definition) => definition.id),
                    continuationToken: result.continuationToken
                });
                return result;
            });
    }

    public filterDefinitions(filter: GetDefinitionsOptions): void {
        // make sure we clear continuation token
        const isSearchActive: boolean = !!filter.name;

        if (isSearchActive) {
            filter.path = null;
        }
        else {
            filter.path = RootPath;
        }

        filter = {
            queryOrder: DefinitionQueryOrder.DefinitionNameAscending,
            $top: DefaultClientPageSizeMax,
            minMetricsTime: getUtcDateString(7),
            ...filter,
            continuationToken: "",
            includeLatestBuilds: true,
            includeAllProperties: true
        };

        filter.includeLatestBuilds = true;
        filter.includeAllProperties = true;

        let searchPromise = getDefinitions(this._definitionSource, filter)
            .then((result) => {
                // if a new search was initiated while this one was running, ignore this one in favor of the newest
                if (this._searchPromise === searchPromise) {
                    delete this._searchPromise;

                    allDefinitionsUpdated.invoke({
                        filter: filter,
                        append: !!filter.continuationToken,
                        definitionIds: result.definitions.map((definition) => definition.id),
                        continuationToken: result.continuationToken,
                    });
                }
                return result;
            });

        this._searchPromise = searchPromise;
    }
}

/**
 * Takes a string and converts into *{string}* so that we can enable fuzzy search
 * @param text text to convert
*/
export function createFilterTextForFuzzySearch(text: string): string {
    return text ? "*" + (text || "") + "*" : null;
}
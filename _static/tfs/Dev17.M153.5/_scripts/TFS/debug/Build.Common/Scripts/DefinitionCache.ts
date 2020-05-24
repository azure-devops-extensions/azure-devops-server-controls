import { GetDefinitionsResult } from "Build.Common/Scripts/ClientContracts";
import { BuildClientService } from "Build.Common/Scripts/ClientServices";

import { BuildDefinitionReference, DefinitionQuality } from "TFS/Build/Contracts";

interface ArrayCachePromise<T> {
    promise: IPromise<T[]>;
    array: T[];
}

/**
 * A cache of definitions, grouped by quality (draft, definition)
 */
export class DefinitionCache {
    private _buildClient: BuildClientService;

    private _allDefinitionsPromise: IPromise<BuildDefinitionReference[]>;

    private _buildDefinitionsAndDraftsPromise: ArrayCachePromise<BuildDefinitionReference> = { promise: null, array: [] };
    private _buildDefinitionsPromise: ArrayCachePromise<BuildDefinitionReference> = { promise: null, array: [] };
    private _buildDraftsPromise: ArrayCachePromise<BuildDefinitionReference> = { promise: null, array: [] };

    private _subsetPromises: ArrayCachePromise<any>[];

    constructor(buildClient: BuildClientService) {
        this._buildClient = buildClient;

        this._subsetPromises = [
            this._buildDefinitionsAndDraftsPromise,
            this._buildDefinitionsPromise,
            this._buildDraftsPromise
        ];
    }

    /**
     * Gets all definitions
     * @param refresh Whether to refresh the cache from the server
     */
    public getAllDefinitions(refresh: boolean = false): IPromise<BuildDefinitionReference[]> {
        if (refresh || !this._allDefinitionsPromise) {
            this._subsetPromises.forEach((subsetPromise: ArrayCachePromise<BuildDefinitionReference>, index: number) => {
                subsetPromise.promise = null;
                subsetPromise.array = [];
            });

            this._allDefinitionsPromise = this._buildClient.getDefinitions().then((result: GetDefinitionsResult) => {
                // we could check for the continuation token and follow it...
                // but since we didn't specify a $top we already got up to 10000 definitions, which is plenty
                return result.definitions;
            });

            let processPromise: IPromise<any> = this._allDefinitionsPromise
                .then((allDefinitions: BuildDefinitionReference[]) => {
                    (allDefinitions || []).forEach((definition: BuildDefinitionReference, index: number) => {
                        // determine whether the definition is a draft
                        let buildDefinitionReference: BuildDefinitionReference = <BuildDefinitionReference>definition;
                        if (buildDefinitionReference.quality === DefinitionQuality.Draft) {
                            this._buildDraftsPromise.array.push(buildDefinitionReference);
                        }
                        else {
                            this._buildDefinitionsPromise.array.push(buildDefinitionReference);
                        }

                        this._buildDefinitionsAndDraftsPromise.array.push(buildDefinitionReference);
                    });
                });

            this._subsetPromises.forEach((subsetPromise: ArrayCachePromise<BuildDefinitionReference>, index: number) => {
                subsetPromise.promise = processPromise
                    .then(() => {
                        return subsetPromise.array;
                    });
            });
        }
        return this._allDefinitionsPromise;
    }

    /**
     * Gets all Build definitions
     * @param refresh Whether to refresh the cache from the server
     */
    public getBuildDefinitionsAndDrafts(refresh: boolean = false): IPromise<BuildDefinitionReference[]> {
        if (refresh || !this._buildDefinitionsAndDraftsPromise.promise) {
            this.getAllDefinitions(refresh);
        }
        return this._buildDefinitionsAndDraftsPromise.promise;
    }

    /**
     * Gets all Build definitions, excluding drafts
     * @param refresh Whether to refresh the cache from the server
     */
    public getBuildDefinitions(refresh: boolean = false): IPromise<BuildDefinitionReference[]> {
        if (refresh || !this._buildDefinitionsPromise.promise) {
            this.getAllDefinitions(refresh);
        }
        return this._buildDefinitionsPromise.promise;
    }

    /**
     * Gets all Build draft definitions
     * @param refresh Whether to refresh the cache from the server
     */
    public getBuildDefinitionDrafts(refresh: boolean = false): IPromise<BuildDefinitionReference[]> {
        if (refresh || !this._buildDraftsPromise.promise) {
            this.getAllDefinitions(refresh);
        }
        return this._buildDraftsPromise.promise;
    }
}
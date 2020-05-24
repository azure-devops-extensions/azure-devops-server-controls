import Build_Actions = require("Build/Scripts/Actions/Actions");
import { definitionDeleted, definitionUpdated, definitionsUpdated, DefinitionUpdatedPayload, DefinitionsUpdatedPayload } from "Build/Scripts/Actions/Definitions";
import { getDefinition, getDefinitions } from "Build/Scripts/Actions/DefinitionsActionCreator";
import BuildModelsCommon = require("Build/Scripts/Constants");
import { QueryResult } from "Build/Scripts/QueryResult";
import { DefinitionSource } from "Build/Scripts/Sources/Definitions";
import DefinitionFavoriteStore = require("Build/Scripts/Stores/DefinitionFavorites");
import FolderStore = require("Build/Scripts/Stores/Folders");
import { IPermissionsStore, getPermissionsStore } from "Build/Scripts/Stores/Permissions";

import { GetDefinitionsOptions, StoredDefinition } from "Build.Common/Scripts/ClientContracts";

import TFS_React = require("Presentation/Scripts/TFS/TFS.React");

import { BuildDefinition, BuildDefinitionReference, BuildMetric } from "TFS/Build/Contracts";

import { Action } from "VSS/Flux/Action";

import { getCollectionService } from "VSS/Service";
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");


export interface IDefinitionFilter2 extends GetDefinitionsOptions {
    // determines whether to use fuzzy search when "name" is specified on the filter
    fuzzySearch?: boolean;
    // this is used to trigger online search for a given "name"
    searchForMore?: boolean;
    // page size being requested
    resultCount?: number;
}

export interface IDefinitionsResults {
    results: QueryResult<BuildDefinitionReference>[],
    hasMoreDefinitions: boolean;
    initializing: boolean;
}

export interface IDefinitionStoreOptions extends TFS_React.IStoreOptions {
    definitionSource?: DefinitionSource;
}

export class DefinitionStore extends TFS_React.Store {
    private _definitionsById: IDictionaryNumberTo<QueryResult<StoredDefinition>> = {};
    private _definitionSource: DefinitionSource;
    private _permissionsStore: IPermissionsStore;

    constructor(options?: IDefinitionStoreOptions) {
        super(BuildModelsCommon.StoreChangedEvents.DefinitionStoreUpdated, options);

        this._definitionSource = (options && options.definitionSource) ? options.definitionSource : getCollectionService(DefinitionSource);
        this._permissionsStore = getPermissionsStore();

        this._permissionsStore.addChangedListener(() => {
            this.emitChanged();
        });

        definitionUpdated.addListener((payload: DefinitionUpdatedPayload) => {
            if (payload.definition && !payload.definition.metrics) {
                // preserve metrics in the case of an update
                let existingDefinition = this._definitionsById[payload.definitionId];
                if (existingDefinition && existingDefinition.result && existingDefinition.result.metrics) {
                    payload.definition.metrics = existingDefinition.result.metrics;
                }
            }

            this._definitionsById[payload.definitionId] = {
                pending: false,
                result: payload.definition
            };

            this.emitChanged(payload.behavior);
        });

        definitionsUpdated.addListener((payload: DefinitionsUpdatedPayload) => {
            Object.keys(payload.definitions).forEach((key) => {
                let definition = payload.definitions[key];
                if (definition) {
                    this._definitionsById[definition.id] = {
                        pending: false,
                        result: definition
                    };
                }
            });

            this.emitChanged(payload.behavior);
        });

        definitionDeleted.addListener((definition: BuildDefinitionReference) => {
            // also remove any drafts of this definition
            for (let key in this._definitionsById) {
                let item = this._definitionsById[key];

                if (item.result && item.result.draftOf && item.result.draftOf.id == definition.id) {
                    this._definitionsById[key] = {
                        pending: false,
                        result: null
                    };
                }
            }

            this._definitionsById[definition.id] = {
                pending: false,
                result: null
            };

            this.emitChanged();
        });
    }

    public hasDefinitions(): boolean {
        return this.getDefinitions(DefinitionStore.exists).length > 0;
    }

    public getDefinition(definitionId: number): QueryResult<BuildDefinition> {
        let result = this._definitionsById[definitionId];
        if (!result) {
            result = {
                pending: true,
                result: <BuildDefinition>{
                    id: definitionId
                }
            };

            this._definitionsById[definitionId] = result;

            getDefinition(this._definitionSource, definitionId, true);
        }

        return result;
    }

    public getDefinitions(filter?: (item: QueryResult<BuildDefinitionReference>) => boolean, max?: number): QueryResult<BuildDefinitionReference>[] {
        let result: QueryResult<BuildDefinitionReference>[] = [];

        for (let key in this._definitionsById) {
            let item = this._definitionsById[key];

            if (!filter || filter(item)) {
                result.push(item);
            }

            if (max && max > 0 && result.length >= max) {
                break;
            }
        }

        return result;
    }

    public getDefinitionsById(ids: number[]): QueryResult<StoredDefinition>[] {
        let result: QueryResult<BuildDefinition>[] = [];

        let missingIds: number[] = [];

        for (let id of ids) {
            let item = this._definitionsById[id];
            if (!item) {
                item = {
                    pending: true,
                    result: <BuildDefinition>{
                        id: id
                    }
                };

                this._definitionsById[id] = item;
                missingIds.push(id);
            }

            result.push(item);
        }

        if (missingIds.length > 0) {
            getDefinitions(this._definitionSource, {
                definitionIds: missingIds.join(",")
            });
        }

        return result;
    }

    public setFolderId(definitionId: number, folderId: number): void {
        let def = this._definitionsById[definitionId];
        if (def && def.result) {
            this._definitionsById[definitionId].result.folderId = folderId;
        }
    }

    public static pendingOrExists(item: QueryResult<BuildDefinitionReference>): boolean {
        return item.pending || !!item.result;
    }

    public static exists(item: QueryResult<BuildDefinitionReference>): boolean {
        return !!item.result;
    }
}

var _definitionStore: DefinitionStore = null;

export function getDefinitionStore(options?: IDefinitionStoreOptions): DefinitionStore {
    if (!_definitionStore) {
        _definitionStore = new DefinitionStore(options);
    }
    return _definitionStore;
}
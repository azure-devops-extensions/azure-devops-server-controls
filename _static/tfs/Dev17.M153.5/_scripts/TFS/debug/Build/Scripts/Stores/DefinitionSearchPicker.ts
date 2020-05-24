import { DefinitionSearchPickerActionHub, getDefinitionSearchPickerActionHub } from "Build/Scripts/Actions/DefinitionSearchPickerActions";
import { DefinitionSearchPickerActionCreator } from "Build/Scripts/Actions/DefinitionSearchPickerActionCreator";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { DefinitionStore, getDefinitionStore } from "Build/Scripts/Stores/Definitions";
import { DefinitionFavoriteStore, getDefinitionFavoriteStore } from "Build/Scripts/Stores/DefinitionFavorites";

import { BuildDefinitionReference, BuildQueryOrder } from "TFS/Build/Contracts";

import { Store } from "VSS/Flux/Store";
import { getService, getCollectionService } from "VSS/Service";
import { contains, intersect, subtract } from "VSS/Utils/Array";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";

export interface IDefinitionSearchPickerStoreOptions {
    definitionStore: DefinitionStore;
    definitionFavoriteStore: DefinitionFavoriteStore;
    actionCreator: DefinitionSearchPickerActionCreator;
    actionHub: DefinitionSearchPickerActionHub;
}

export interface IDefinitionData {
    definitions: BuildDefinitionReference[];
    favDefinitions: BuildDefinitionReference[];
}

export class DefinitionSearchPickerStore extends Store {
    private _definitionStore: DefinitionStore;
    private _definitionFavoriteStore: DefinitionFavoriteStore;
    private _actionCreator: DefinitionSearchPickerActionCreator;
    private _actionHub: DefinitionSearchPickerActionHub;
    private _searchText: string;

    private _definitionIds: number[] = [];

    constructor(options?: IDefinitionSearchPickerStoreOptions) {
        super();

        this._definitionStore = (options && options.definitionStore) ? options.definitionStore : getDefinitionStore();
        this._definitionFavoriteStore = (options && options.definitionFavoriteStore) ? options.definitionFavoriteStore : getDefinitionFavoriteStore();
        this._actionCreator = (options && options.actionCreator) ? options.actionCreator : getCollectionService(DefinitionSearchPickerActionCreator);
        this._actionHub = (options && options.actionHub) ? options.actionHub : getDefinitionSearchPickerActionHub();

        this._actionHub.definitionsUpdated.addListener((payload) => {
            // just replace existing ones
            this._definitionIds = payload.definitionIds;
            this._searchText = payload.searchTerm;

            this.emitChanged();
        });

        this._actionHub.searchCleared.addListener(() => {
            if (this._searchText) {
                this._searchText = "";
                this.emitChanged();
            }
        });

        this._definitionStore.addChangedListener(() => {
            this.emitChanged();
        });

        this._definitionFavoriteStore.addChangedListener(() => {
            this.emitChanged();
        });

    }

    public getDefinitionData(selectedDefinitionId: number): IDefinitionData {
        let favDefinitionIds = this._definitionFavoriteStore.getAllFavoriteDefinitionIds();
        let definitions: BuildDefinitionReference[] = [];
        let favDefinitions: BuildDefinitionReference[] = [];
        let selectedDefinitionFound = false;

        if (!!this._searchText) {
            // if search is active, grab only from the searched ones
            favDefinitionIds = intersect(favDefinitionIds, this._definitionIds);
        }

        // get favorites
        favDefinitionIds.length > 0 && this._definitionStore.getDefinitionsById(favDefinitionIds).forEach((definitionResult, index) => {
            if (!definitionResult.pending && definitionResult.result) {
                if (definitionResult.result.id === selectedDefinitionId) {
                    selectedDefinitionFound = true;
                }

                favDefinitions.push(definitionResult.result);
            }
        });

        // now merge with the rest by removing any favorites
        const definitionIds = subtract(this._definitionIds, favDefinitionIds);
        definitionIds.length > 0 && this._definitionStore.getDefinitionsById(definitionIds).forEach((definitionResult, index) => {
            if (!definitionResult.pending && definitionResult.result) {
                if (definitionResult.result.id === selectedDefinitionId) {
                    selectedDefinitionFound = true;
                }

                definitions.push(definitionResult.result);
            }
        });

        // inject the selected one too if search isn't active and if this wasn't found yet
        if (!selectedDefinitionFound && !this._searchText && selectedDefinitionId > 0) {
            const definition = this._definitionStore.getDefinition(selectedDefinitionId);
            if (!definition.pending && definition.result) {
                // this cannot be a favorite as if it was, it should have found while getting favorites
                definitions.push(definition.result);
            }
        }

        definitions = definitions.sort((a, b) => {
            return localeIgnoreCaseComparer(a.name, b.name);
        });

        favDefinitions = favDefinitions.sort((a, b) => {
            return localeIgnoreCaseComparer(a.name, b.name);
        });

        return {
            definitions: definitions,
            favDefinitions: favDefinitions
        };
    }

    public searchDefinitions(name: string) {
        this._searchText = name;
        this.emitChanged(); // ensure that component will get latest search term
        // initiate search if there's something to search
        name && this._actionCreator.startsWithSearchDefinitions(name, this._actionHub);
    }

    public getSearchText() {
        return this._searchText;
    }
}

var __store: DefinitionSearchPickerStore = null;

export function getDefinitionSearchPickerStore(options?: IDefinitionSearchPickerStoreOptions) {
    if (!__store) {
        __store = new DefinitionSearchPickerStore(options);
    }

    return __store;
}

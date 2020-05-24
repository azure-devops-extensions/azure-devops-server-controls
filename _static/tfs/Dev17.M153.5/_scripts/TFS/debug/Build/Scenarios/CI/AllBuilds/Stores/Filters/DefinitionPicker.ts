import { Store } from "VSS/Flux/Store";
import { BuildDefinitionReference } from "TFS/Build/Contracts";

export interface InitialDefinitionPayload {
    favorites: BuildDefinitionReference[];
    definitions: BuildDefinitionReference[];
}

export interface DefinitionPickListItem {
    id: number;
    name: string;
    isFavorite: boolean;
}

export class DefinitionPickerStore extends Store {
    private _allFavoriteIds: number[] = [];
    private _filteredFavoriteIds: number[] = [];
    private _favoriteIdToDefinition: IDictionaryNumberTo<BuildDefinitionReference> = {};
    private _definitionIds: number[] = [];
    private _idToDefinition: IDictionaryNumberTo<BuildDefinitionReference> = {};

    public initializeDefinitions(initialDefinitions: InitialDefinitionPayload) {
        initialDefinitions.favorites.forEach((favorite: BuildDefinitionReference) => {
            this._allFavoriteIds.push(favorite.id);
            this._favoriteIdToDefinition[favorite.id] = favorite;
        });
        this._filteredFavoriteIds = this._allFavoriteIds;
        initialDefinitions.definitions.forEach((definition: BuildDefinitionReference) => {
            if (this._allFavoriteIds.indexOf(definition.id) < 0) {
                this._definitionIds.push(definition.id);
                this._idToDefinition[definition.id] = definition;
            }
        });
        this.emitChanged();
    }

    public getDefinitionPickListItems(): DefinitionPickListItem[] {
        let definitionList: DefinitionPickListItem[] = [];
        this._filteredFavoriteIds.forEach((favoriteId: number) => {
            let definition: BuildDefinitionReference = this._favoriteIdToDefinition[favoriteId];
            definitionList.push({
                name: definition.name,
                id: definition.id,
                isFavorite: true
            });
        });
        this._definitionIds.forEach((definitionId: number) => {
            let definition: BuildDefinitionReference = this._idToDefinition[definitionId];
            definitionList.push({
                name: definition.name,
                id: definition.id,
                isFavorite: false
            });
        });
        return definitionList;
    }
}
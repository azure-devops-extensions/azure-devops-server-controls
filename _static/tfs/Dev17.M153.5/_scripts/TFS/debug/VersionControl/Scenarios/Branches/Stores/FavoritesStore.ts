import {GitRefFavorite} from "TFS/VersionControl/Contracts";
import BranchesActions = require("VersionControl/Scenarios/Branches/Actions/BranchesActions");
import Utils_String = require("VSS/Utils/String");
import { ActionAdapter } from "Presentation/Scripts/TFS/Stores/DictionaryStore";

export interface FavoriteUpdate {
    currentBranches: string[];
    favorite: GitRefFavorite;
    isCompare: boolean;
}

export class FavoritesKeyValueAdapater extends ActionAdapter<GitRefFavorite> {
    constructor() {
        super();
        BranchesActions.InitializeFavorites.addListener(this._onInitializeFavorites);
        BranchesActions.AddFavorites.addListener(this._onAddFavorite);
        BranchesActions.RemoveFavorites.addListener(this._onRemoveFavorite);
    }

    private _onInitializeFavorites = (payload: GitRefFavorite[]) => {
        this.itemsAdded.invoke(payload);
    }

    private _onAddFavorite = (payload: FavoriteUpdate) => {
        this.itemsAdded.invoke(payload.favorite);
    }

    private _onRemoveFavorite = (payload: FavoriteUpdate) => {
        this.itemsRemoved.invoke(payload.favorite);
    }    

    public dispose(): void {
        BranchesActions.InitializeFavorites.removeListener(this._onInitializeFavorites);
        BranchesActions.AddFavorites.removeListener(this._onAddFavorite)
        BranchesActions.RemoveFavorites.removeListener(this._onRemoveFavorite);
        super.dispose();
    }
}

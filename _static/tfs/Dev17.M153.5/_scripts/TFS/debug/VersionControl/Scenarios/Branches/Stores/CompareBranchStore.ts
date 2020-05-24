import {GitRef, RefFavoriteType} from "TFS/VersionControl/Contracts";
import {localeIgnoreCaseComparer} from "VSS/Utils/String";
import {InitializeCompareBranch, SetCompareBranch, MyBranchesChanged, AddFavorites}  from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import {ActionAdapter} from "Presentation/Scripts/TFS/Stores/DictionaryStore";
import {FavoriteUpdate} from "VersionControl/Scenarios/Branches/Stores/FavoritesStore";
import {MyBranchesUpdate} from "VersionControl/Scenarios/Branches/Stores/BranchesTreeStore";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";

export interface CompareBranch {
    ref: GitRef;
    isMine: boolean
}

export interface CompareBranchUpdate {
    newCompareBranch: GitRef,
    newCompareIsMine: boolean,
    oldCompareBranch: GitRef,
    oldCompareIsMine: boolean,
    oldCompareIsDefault: boolean
}

export class CompareBranchAdapater extends ActionAdapter<CompareBranch> {
    constructor() {
        super();
        InitializeCompareBranch.addListener(this._onInitializeCompareBranch);
        SetCompareBranch.addListener(this._onSetCompareBranch);
        AddFavorites.addListener(this._onFavoritesUpdate);
        MyBranchesChanged.addListener(this._onMyBranchesUpdate);
    }

    private _onInitializeCompareBranch = (payload: CompareBranch) => {
        this.itemsAdded.invoke(payload);
    }

    private _onSetCompareBranch = (payload: CompareBranchUpdate) => {
        this.itemsAdded.invoke({ ref: payload.newCompareBranch, isMine: payload.newCompareIsMine } as CompareBranch);
    }

    private _onFavoritesUpdate = (favoriteUpdate: FavoriteUpdate) => {
        if ((favoriteUpdate.favorite.type === RefFavoriteType.Ref) && favoriteUpdate.isCompare) {
            const ref: GitRef = {
                name: GitRefUtility.getFullRefNameFromBranch(favoriteUpdate.favorite.name),
            } as GitRef;
            this.itemsAdded.invoke({ ref, isMine: true } as CompareBranch);
        }       
    }

    private _onMyBranchesUpdate = (payload: MyBranchesUpdate) => {
        if (payload.compareBranch) {
            this.itemsAdded.invoke({ ref: payload.compareBranch, isMine: payload.compareBranchIsMine } as CompareBranch);
        }
    }

    public dispose(): void {
        InitializeCompareBranch.removeListener(this._onInitializeCompareBranch);
        SetCompareBranch.removeListener(this._onSetCompareBranch);
        AddFavorites.removeListener(this._onFavoritesUpdate);
        MyBranchesChanged.removeListener(this._onMyBranchesUpdate);
        super.dispose();
    }
}

export function isEqual(x: CompareBranch, y: CompareBranch): boolean {
    return ((localeIgnoreCaseComparer(x.ref.name, y.ref.name) == 0)
        && (x.isMine === y.isMine));
}
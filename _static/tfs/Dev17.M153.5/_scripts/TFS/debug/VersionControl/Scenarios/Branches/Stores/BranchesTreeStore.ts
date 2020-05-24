import * as BranchesActions from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import {CompareBranchUpdate} from "VersionControl/Scenarios/Branches/Stores/CompareBranchStore";
import * as SmartTree from "Presentation/Scripts/TFS/Stores/TreeStore";
import * as OnDemandSmartTree from "VersionControl/Scenarios/Branches/Stores/OnDemandTreeStore";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import {GitRef, RefFavoriteType, GitRefUpdate} from "TFS/VersionControl/Contracts";
import {FavoriteUpdate} from "VersionControl/Scenarios/Branches/Stores/FavoritesStore";

export interface MyBranchesUpdate {
    branchesToAdd: GitRef[];
    branchNamesToRemove: string[];
    compareBranch: GitRef;
    compareBranchIsMine: boolean;
}

export interface RecreateBranchUpdate {
    refUpdate: GitRefUpdate;
    isHeaderBranch: boolean;
}

/**
 * The tree driving "My" pivot.
 */
export class MyBranchesTreeAdapter extends SmartTree.ActionAdapter {
    constructor() {
        super();
        BranchesActions.InitializeMyBranches.addListener(this._onInitializeMyBranches);
        BranchesActions.BranchCreated.addListener(this._onBranchCreated);
        BranchesActions.BranchRecreated.addListener(this._onRefRecreated);
        BranchesActions.MyBranchesChanged.addListener(this._onBranchChanged);
        BranchesActions.MyFolderExpanded.addListener(this._onFolderExpanded);
        BranchesActions.AddFavorites.addListener(this._onFavoriteAdded);
        BranchesActions.MyFolderCollapsed.addListener(this._onFolderCollapsed);
        BranchesActions.SetCompareBranch.addListener(this._onSetCompareBranch);
    }

    private _onInitializeMyBranches = (refs: GitRef[]) => {
        // If we have a reasonable amount of branches expand folders for display
        refsAddedDelegate(this, refs);

        if (refs.length <= 75) {
            this.expandAll.invoke("");
        }
    }

    private _onBranchCreated = (newBranch: GitRefUpdate) => {
        this.itemsAdded.invoke([newBranch.name]);
        expandBranchesFolderDelegate(this, newBranch.name, false);
    }

    private _onRefRecreated = (recreateBranchUpdate: RecreateBranchUpdate) => {
        refRecreated(this, recreateBranchUpdate)
    };

    private _onBranchChanged = (mybranchesUpdate: MyBranchesUpdate) => {
        refsAddedDelegate(this, mybranchesUpdate.branchesToAdd);
        this.itemsRemoved.invoke(mybranchesUpdate.branchNamesToRemove);
    }

    private _onFolderExpanded = (folderName: string) => {
        expandBranchesFolderDelegate(this, folderName, true);
    }

    private _onFavoriteAdded = (favoriteUpdate: FavoriteUpdate) => {
        if ((favoriteUpdate.favorite.type === RefFavoriteType.Ref)
            && !favoriteUpdate.isCompare) {
            this.itemsAdded.invoke([favoriteUpdate.favorite.name]);
        }
    }

    private _onFolderCollapsed = (folderName: string) => {
        this.folderCollapsed.invoke(folderName);
    }

    private _onSetCompareBranch = (compareUpdate: CompareBranchUpdate) => {
        //Ensure this branch appears on the Mine Tab
        refsAddedDelegate(this, [compareUpdate.newCompareBranch]);

        //Remove the old Compare Branch if it doesn't meet criteria for the Mine Tab
        if (!compareUpdate.oldCompareIsMine && !compareUpdate.oldCompareIsDefault) {
            refsRemovedDelegate(this, [compareUpdate.oldCompareBranch]);
        }
    }

    public dispose(): void {
        BranchesActions.InitializeMyBranches.removeListener(this._onInitializeMyBranches);
        BranchesActions.BranchCreated.removeListener(this._onBranchCreated);
        BranchesActions.BranchRecreated.removeListener(this._onRefRecreated);
        BranchesActions.MyBranchesChanged.removeListener(this._onBranchChanged);
        BranchesActions.MyFolderExpanded.removeListener(this._onFolderExpanded);
        BranchesActions.AddFavorites.removeListener(this._onFavoriteAdded);
        BranchesActions.MyFolderCollapsed.removeListener(this._onFolderCollapsed);
        BranchesActions.SetCompareBranch.removeListener(this._onSetCompareBranch);
        super.dispose();
    }
}

/**
 * The tree driving "All" pivot.
 */
export class AllBranchesTreeAdapter extends OnDemandSmartTree.OnDemandActionAdapter {
    constructor() {
        super();
        BranchesActions.InitializeAllBranches.addListener(this._onInitializeAllBranches);
        BranchesActions.BranchCreated.addListener(this._onBranchCreated);
        BranchesActions.BranchRecreated.addListener(this._onRefRecreated);
        BranchesActions.AllFolderExpanded.addListener(this._onFolderExpanded);
        BranchesActions.AllFolderCollapsed.addListener(this._onFolderCollapsed);
        BranchesActions.AllBranchesDemandLoading.addListener(this._onBranchesDemandLoading);
        BranchesActions.AllBranchesHasMore.addListener(this._onBranchesHasMore);
    }
    
    private _onInitializeAllBranches = (refs: GitRef[]) => {
        refsAddedDelegate(this, refs);
    }

    private _onBranchCreated = (newBranch: GitRefUpdate) => {
        this.itemsAdded.invoke([newBranch.name]);
        expandBranchesFolderDelegate(this, newBranch.name, false);
    }

    private _onRefRecreated = (recreateBranchUpdate: RecreateBranchUpdate) => {
        refRecreated(this, recreateBranchUpdate)
    }
    
    private _onFolderExpanded = (folderName: string) => {
        expandBranchesFolderDelegate(this, folderName, true);
    }

    private _onFolderCollapsed = (folderName: string) => {
        this.folderCollapsed.invoke(folderName);
    }

    private _onBranchesDemandLoading = (demandLoading: boolean) => {
        this.ondemandLoading.invoke(demandLoading);
        if (!demandLoading) {
            // We've loaded all the branches expand by default
            this.expandAll.invoke("");
        }
    }

    private _onBranchesHasMore = (hasMore: boolean) => {
        this.addRootHasMore.invoke(hasMore);
    }

    public dispose(): void {
        BranchesActions.InitializeAllBranches.removeListener(this._onInitializeAllBranches);
        BranchesActions.BranchCreated.removeListener(this._onBranchCreated);
        BranchesActions.BranchRecreated.removeListener(this._onRefRecreated);
        BranchesActions.AllFolderExpanded.removeListener(this._onFolderExpanded);
        BranchesActions.AllFolderCollapsed.removeListener(this._onFolderCollapsed);
        BranchesActions.AllBranchesDemandLoading.removeListener(this._onBranchesDemandLoading);
        BranchesActions.AllBranchesHasMore.removeListener(this._onBranchesHasMore);
        super.dispose();
    }
}

/**
 * The tree driving "Filter" pivot.
 */
export class FilterBranchesTreeAdapter extends SmartTree.ActionAdapter {
    constructor() {

        super();

        BranchesActions.InitializeFilterTree.addListener(this._onInitializeFilterTree);
        BranchesActions.BranchRecreated.addListener(this._onRefRecreated);
        BranchesActions.FilterFolderExpanded.addListener(this._onFolderExpanded);
        BranchesActions.FilterFolderCollapsed.addListener(this._onFolderCollapsed);
        BranchesActions.DeletedBranchSearch.addListener(this._onDeletedSearch);
    }

    private _onInitializeFilterTree = (branches: GitRef[]) => {
        const friendlyNames = branches.map(ref => ref.name).map(GitRefUtility.getRefFriendlyName);
        this.refreshItemsAndExpand.invoke(friendlyNames);
    }

    private _onDeletedSearch = (newBranch: GitRefUpdate) => {
        if (newBranch) {
            this.refreshItemsAndExpand.invoke([newBranch.name]);
        }
        else {
            this.refresh.invoke(null);
        }
    }

    private _onRefRecreated = (recreateBranchUpdate: RecreateBranchUpdate) => {
        refRecreated(this, recreateBranchUpdate)
    }

    private _onFolderExpanded = (folderName: string) => {
        this.folderExpanding.invoke(folderName);
        this.folderExpanded.invoke(folderName);
    }

    private _onFolderCollapsed = (folderName: string) => {
        this.folderCollapsed.invoke(folderName);
    }

    public dispose(): void {
        BranchesActions.InitializeFilterTree.removeListener(this._onInitializeFilterTree);
        BranchesActions.BranchRecreated.removeListener(this._onRefRecreated);
        BranchesActions.FilterFolderExpanded.removeListener(this._onFolderExpanded);
        BranchesActions.FilterFolderCollapsed.removeListener(this._onFolderCollapsed);
        BranchesActions.DeletedBranchSearch.removeListener(this._onDeletedSearch);
        super.dispose();
    }
}

function refRecreated(adapter: SmartTree.ActionAdapter, recreateBranchUpdate: RecreateBranchUpdate) {
    if (!recreateBranchUpdate.isHeaderBranch) {
        adapter.itemsAdded.invoke([recreateBranchUpdate.refUpdate.name]);
    }
}

function expandBranchesFolderDelegate(adapter: SmartTree.ActionAdapter, name: string, nameIsFolder: boolean) {
    let folderName: string;

    if (nameIsFolder) {
        folderName = name;
    }
    else {
        const lastSlashIndex = name.lastIndexOf("/");
        if (lastSlashIndex > 0) {
            folderName = name.substr(0, lastSlashIndex);
        }
        else {
            return;
        }
    }

    adapter.folderExpanding.invoke(folderName);
    adapter.folderExpanded.invoke(folderName);
}

function refsAddedDelegate(adapter: SmartTree.ActionAdapter, refs: GitRef[]) {
    const friendlyNames = refs.map(ref => ref.name).map(GitRefUtility.getRefFriendlyName);
    adapter.itemsAdded.invoke(friendlyNames);
}

function refsRemovedDelegate(adapter: SmartTree.ActionAdapter, refs: GitRef[]) {
    const friendlyNames = refs.map(ref => ref.name).map(GitRefUtility.getRefFriendlyName);
    adapter.itemsRemoved.invoke(friendlyNames);
}

import * as React from "react";
import { getHistoryService } from "VSS/Navigation/Services";

import {IItem} from "Presentation/Scripts/TFS/Stores/TreeStore";
import {GitUserDate, GitPullRequest, GitRefFavorite, GitPush} from "TFS/VersionControl/Contracts";
import {AheadBehindCount} from "VersionControl/Scenarios/Branches/Stores/StatsStore";
import * as Branches from "VersionControl/Scenarios/Branches/Stores/BranchesStore";
import {BranchStoreFactory, StoreIds} from "VersionControl/Scenarios/Branches/Stores/BranchStoreFactory";
import * as SmartTree from "Presentation/Scripts/TFS/Stores/TreeStore";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface IStateless { }

export module BranchMenuActions {
    export let Delete = "DELETE_BRANCH";
    export let New = "NEW_BRANCH";
    export let BranchSecurity = "BRANCH_SECURITY";
    export let BranchPolicies = "BRANCH_POLICIES";
    export let History = "BRANCH_HISTORY";
    export let PullRequest = "PULL_REQUEST";
    export let Explore = "BRANCH_EXPLORE";
    export let Remove_Favorite = "REMOVE_FAVORITES";
    export let Add_Favorite = "ADD_FAVORITES";
    export let Lock = "LOCK_BRANCH";
    export let Unlock = "UNLOCK_BRANCH";
    export let Settings = "BRANCH_SETTINGS";
    export let Compare = "BRANCH_COMPARE";
    export let SetCompareBranch = "SET_COMPARE_BRANCH";
    export let RestoreBranch = "RESTORE_BRANCH";
}

export interface IEnhancedGitRef {
    item: IItem;
    ref: Branches.GitRefWithState;
    comment: string;
    isUserCreated: boolean;
    isDefault: boolean;
    isCompare: boolean;
    hasMore: HasMore;
    lastUpdatedBy: GitUserDate;
    aheadBehindDefault: AheadBehindCount;
    pullRequest: GitPullRequest;
    favorite: GitRefFavorite;
    hasPolicy: boolean;
    push: GitPush;
    /* This key is used to prevent unnecessary renderings of the row.  It read directly by the DetailsList IObjectWithKey in Fabric */
    key: string;
}

export interface HasMore {
    isHasMore: boolean;
    expanding: boolean;
}

export module BranchRowActions {
    export let BranchAddFavorite = "BranchAddFavorite";
    export let BranchRemoveFavorite = "BranchRemoveFavorite";
    export let ExploreFiles = "ExploreFiles";
    export let FolderAddFavorite = "FolderAddFavorite";
    export let FolderRemoveFavorite = "FolderRemoveFavorite";
    export let NewPullRequest = "NewPullRequest";
    export let ViewPullRequest = "ViewPullRequest"
    export let ViewLastUpdate = "ViewLastUpdate";
    export let ShowMore = "ShowMore";
    export let Menu = "Menu";
}

//Return all branches shown on mine page (minus folders)
export function getMyBranchNames() : string[] {
    const myTreeStore: SmartTree.IItem[] = BranchStoreFactory.get<SmartTree.TreeStore>(StoreIds.MY_TREE).getAll();
    return myTreeStore.filter(item => {
        return item.isFolder == false;
    }).map(item => {
        return item.fullName;
    });
}

export function getBranchesCompareUrlFragment(baseBranchName: string, targetBranchName: string): string {
    return getHistoryService().getFragmentActionLink("commits", {
        baseVersion: new GitBranchVersionSpec(baseBranchName).toVersionString(),
        targetVersion: new GitBranchVersionSpec(targetBranchName).toVersionString(),
    });
}

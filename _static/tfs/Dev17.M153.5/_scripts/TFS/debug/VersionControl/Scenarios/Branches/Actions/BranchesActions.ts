import { Action } from "VSS/Flux/Action";
import { GitRef, GitBranchStats, GitRefUpdate, GitRefFavorite, GitCommitRef, GitPullRequest, GitPush } from "TFS/VersionControl/Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { MyBranchesUpdate, RecreateBranchUpdate } from "VersionControl/Scenarios/Branches/Stores/BranchesTreeStore";
import { CompareBranchUpdate, CompareBranch } from "VersionControl/Scenarios/Branches/Stores/CompareBranchStore";
import { FavoriteUpdate } from "VersionControl/Scenarios/Branches/Stores/FavoritesStore";
import { StaleBranchesUpdate } from "VersionControl/Scenarios/Branches/Stores/StaleBranchesStore";
import { MessageLevel, IMessage } from "VersionControl/Scenarios/Shared/MessageArea";
import { SelectionObject } from "VersionControl/Scenarios/Branches/Stores/TabSelectionStore";
import { GitRefPolicyScope } from "VersionControl/Scenarios/Shared/Policy/GitRefPolicyScope";

// - Initialize Options -
export let InitializeFavorites = new Action<GitRefFavorite[]>();
export let InitializeMyBranches = new Action<GitRef[]>();
export let InitializeAllBranches = new Action<GitRef[]>();
export let InitializeStaleBranches = new Action<StaleBranchesUpdate>();
export let InitializeFilterBranches = new Action<GitRef[]>();
export let InitializeFilterTree = new Action<GitRef[]>();
export let InitializeDefaultBranch = new Action<GitRef>();
export let InitializeCompareBranch = new Action<CompareBranch>();
export let RepositoryContextChange = new Action<GitRepositoryContext>();
export let InitializeCommitMetaData = new Action<GitCommitRef[]>();
export let InitializeGitPullRequest = new Action<GitPullRequest[]>();
export let InitializeTabSelection = new Action<string>();
export let InitializeCreatedBranches = new Action<GitRef[]>();
export let InitializeBranchPolicies = new Action<GitRefPolicyScope[]>();

// - Switch to demand loading of trees
export let AllBranchesDemandLoading = new Action<boolean>();
export let AllBranchesHasMore = new Action<boolean>();

// - Stale Branches Tab
export let StaleBranchesLoading = new Action<boolean>();

// - Branch creation / deletion -
export let BranchRecreated = new Action<RecreateBranchUpdate>();
export let BranchCreated = new Action<GitRefUpdate>();
export let BranchDeleted = new Action<GitRefUpdate>();

// - Branch Changes -
export let SetDefaultBranch = new Action<GitRef>();
export let RemoveDefaultBranch = new Action<GitRef>();
export let SetCompareBranch = new Action<CompareBranchUpdate>();
export let LockBranch = new Action<GitRef>();
export let UnLockBranch = new Action<GitRef>();

// - Expand Folder -
export let MyFolderExpanded = new Action<string>();
export let MyFolderCollapsed = new Action<string>();
export let AllFolderExpanded = new Action<string>();
export let AllFolderCollapsed = new Action<string>();
export let FilterFolderExpanded = new Action<string>();
export let FilterFolderCollapsed = new Action<string>();

// - DefaultBranch and BranchDisplayed -
export let ChangeDefaultBranch = new Action<string>();
export let BranchesDisplayed = new Action<string[]>();

// - Mine All Selector -
export let TabSelection = new Action<SelectionObject>();

//- Favorites Actions
export let AddFavorites = new Action<FavoriteUpdate>();
export let RemoveFavorites = new Action<FavoriteUpdate>();

// - Message Actions
export let ShowMessage = new Action<IMessage>();
export let DismissMessage = new Action<IMessage>();

// - Filter Actions
export let SetFilter = new Action<string>();
export let DeletedBranchSearch = new Action<GitRefUpdate>();

// - My Branches Specific Operations
export let MyBranchesChanged = new Action<MyBranchesUpdate>();

// - Ahead Behind
export let AddBranchStats = new Action<GitBranchStats[]>();
export let RemoveAllBranchStats = new Action<string>();

// - Git Push
export const InitializePush = new Action<GitPush>();
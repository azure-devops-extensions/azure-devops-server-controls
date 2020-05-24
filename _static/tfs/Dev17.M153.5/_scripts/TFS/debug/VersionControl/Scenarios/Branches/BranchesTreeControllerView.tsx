/// <reference types="react" />
/// <reference types="react-dom" />
import * as Utils_String from "VSS/Utils/String";
import * as React from "react";
import * as SmartTree from "Presentation/Scripts/TFS/Stores/TreeStore";
import * as Branch from "VersionControl/Scenarios/Branches/Actions/Branch";
import * as Branches from "VersionControl/Scenarios/Branches/Stores/BranchesStore";
import * as TabSelection from "VersionControl/Scenarios/Branches/Stores/TabSelectionStore";
import { IItem } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { GitRef, GitBranchStats, GitPullRequest, GitRefFavorite, GitCommitRef, GitPush } from "TFS/VersionControl/Contracts";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import { BranchStoreFactory, StoreIds } from "VersionControl/Scenarios/Branches/Stores/BranchStoreFactory";
import { DefaultBranchStore } from "VersionControl/Scenarios/Branches/Stores/DefaultBranchesStore";
import { BranchPermissions } from "VersionControl/Scenarios/Branches/Stores/BranchPermissionsStore";
import * as KeyValue from "Presentation/Scripts/TFS/Stores/DictionaryStore";
import { ValueStore } from "VersionControl/Scenarios/Branches/Stores/ValueStore";
import { BranchesDetailsList } from "VersionControl/Scenarios/Branches/Components/BranchDetailsList";
import { NoDefaultRow } from "VersionControl/Scenarios/Branches/Components/BranchesTreeDefaultRow";
import { IEnhancedGitRef, HasMore } from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import { CompareBranch } from "VersionControl/Scenarios/Branches/Stores/CompareBranchStore";
import { OnDemandStore } from "VersionControl/Scenarios/Branches/Stores/OnDemandTreeStore";
import * as StaleBranches from "VersionControl/Scenarios/Branches/Stores/StaleBranchesStore";
import { GitRefPolicyScope } from "VersionControl/Scenarios/Shared/Policy/GitRefPolicyScope";
import { Action } from "VSS/Flux/Action";
import * as StoreBase from "VSS/Flux/Store";

export interface BranchesViewTreeProps {
    permissions: BranchPermissions;
}

export interface BranchesViewTreeState {
    branches: IEnhancedGitRef[];
    highlightText: string;
    onFolderExpanded(fullName: string): void;
    onFolderCollapsed(fullName: string): void;
    branchesStore: StoreBase.Store;
    treeSelected: string;
    defaultBranch: IEnhancedGitRef;
    compareBranch: IEnhancedGitRef;
    compareIsMine: boolean;
    displayFlatBranches: boolean;
    showDeletedColumns: boolean;
}

export class BranchesTreeControllerView extends React.Component<BranchesViewTreeProps, BranchesViewTreeState> {
    private _changeDelegate = this._onChange.bind(this);
    private _filterMessageKey : number;

    constructor(props: BranchesViewTreeProps) {
        super(props);
        this.state = this._getStateFromStores();
    }

    public componentDidMount() {
        this.state.branchesStore.addChangedListener(this._changeDelegate);
        BranchStoreFactory.get<KeyValue.DictionaryStore<GitRef>>(StoreIds.COMPARE_BRANCH).addChangedListener(this._changeDelegate);
        BranchStoreFactory.get<DefaultBranchStore>(StoreIds.DEFAULT_BRANCH).addChangedListener(this._changeDelegate);
        BranchStoreFactory.get<KeyValue.DictionaryStore<GitRef>>(StoreIds.BRANCHES).addChangedListener(this._changeDelegate);
        BranchStoreFactory.get<KeyValue.DictionaryStore<GitRefFavorite>>(StoreIds.FAVORITES).addChangedListener(this._changeDelegate);
        BranchStoreFactory.get<ValueStore<TabSelection.SelectionObject>>(StoreIds.TAB_SELECTION).addChangedListener(this._changeDelegate);
        BranchStoreFactory.get<KeyValue.DictionaryStore<GitRef>>(StoreIds.USER_CREATED_BRANCHES).addChangedListener(this._changeDelegate);
        BranchStoreFactory.get<KeyValue.DictionaryStore<GitBranchStats>>(StoreIds.STATS).addChangedListener(this._changeDelegate);
        BranchStoreFactory.get<KeyValue.DictionaryStore<GitRefPolicyScope>>(StoreIds.POLICIES).addChangedListener(this._changeDelegate);
        BranchStoreFactory.get<KeyValue.DictionaryStore<GitPush>>(StoreIds.PUSH).addChangedListener(this._changeDelegate);
        BranchStoreFactory.get<ValueStore<boolean>>(StoreIds.DELETED_FILTER).addChangedListener(this._changeDelegate); 
    }

    public componentWillUnmount() {
        this.state.branchesStore.removeChangedListener(this._changeDelegate);
        BranchStoreFactory.get<KeyValue.DictionaryStore<GitRef>>(StoreIds.COMPARE_BRANCH).removeChangedListener(this._changeDelegate);
        BranchStoreFactory.get<DefaultBranchStore>(StoreIds.DEFAULT_BRANCH).removeChangedListener(this._changeDelegate);
        BranchStoreFactory.get<KeyValue.DictionaryStore<GitRef>>(StoreIds.BRANCHES).removeChangedListener(this._changeDelegate);
        BranchStoreFactory.get<KeyValue.DictionaryStore<GitRefFavorite>>(StoreIds.FAVORITES).removeChangedListener(this._changeDelegate);
        BranchStoreFactory.get<ValueStore<TabSelection.SelectionObject>>(StoreIds.TAB_SELECTION).removeChangedListener(this._changeDelegate);
        BranchStoreFactory.get<KeyValue.DictionaryStore<GitRef>>(StoreIds.USER_CREATED_BRANCHES).removeChangedListener(this._changeDelegate);     
        BranchStoreFactory.get<KeyValue.DictionaryStore<GitBranchStats>>(StoreIds.STATS).removeChangedListener(this._changeDelegate);
        BranchStoreFactory.get<KeyValue.DictionaryStore<GitRefPolicyScope>>(StoreIds.POLICIES).removeChangedListener(this._changeDelegate);  
        BranchStoreFactory.get<KeyValue.DictionaryStore<GitPush>>(StoreIds.PUSH).removeChangedListener(this._changeDelegate);
        BranchStoreFactory.get<ValueStore<boolean>>(StoreIds.DELETED_FILTER).removeChangedListener(this._changeDelegate); 
    }

    public render() {
        return (
                <BranchesDetailsList
                    defaultBranch={this.state.defaultBranch}
                    compareBranch={this.state.compareBranch}
                    compareIsMine={this.state.compareIsMine}
                    highlightText={this.state.highlightText}
                    branches={this.state.branches}
                    permissions={this.props.permissions}
                    displayFlatBranches={this.state.displayFlatBranches}
                    showDeletedColumns={this.state.showDeletedColumns}
                    onFolderCollapsed={this.state.onFolderCollapsed}
                    onFolderExpanded={this.state.onFolderExpanded} />     
            );
    }

    private _onChange() {

        const newState = this._getStateFromStores();

        //If we recieve a valid state allow change to render
        if (newState) {
            this.setState(newState);
        }
    }

    /**
     * Render data for each element of the tree
     * Makesure not only the tree has the branch data (tref) but the branches store too (ref)
     */
    private _createEnhancedRef(fullname: string, isDefault: boolean, isCompare: boolean, tref: IItem): IEnhancedGitRef {       

        const fullRef = BranchStoreFactory.get<KeyValue.DictionaryStore<Branches.GitRefWithState>>(StoreIds.BRANCHES).get(fullname);
        if (!fullRef) {
            //Add a placeholder if the default branch is not set
            if (isDefault) {
                return {
                    isDefault: true,
                } as IEnhancedGitRef;
            } 
            return null;
        }
        const ref: GitRef = fullRef.gitRef;
        let metadata: GitCommitRef = null;
        let stats: GitBranchStats = null;
        if (ref && ref.objectId) {
            metadata = BranchStoreFactory.get<KeyValue.DictionaryStore<GitCommitRef>>(StoreIds.COMMIT_METADATA).get(ref.objectId);
            stats = BranchStoreFactory.get<KeyValue.DictionaryStore<GitBranchStats>>(StoreIds.STATS).get(ref.objectId);
        }
        let pr: GitPullRequest = null;
        let userCreatedBranch: GitRef = null;
        let policy: GitRefPolicyScope = null;
        let push: GitPush = null;
        if (ref && ref.name) {
            pr = BranchStoreFactory.get<KeyValue.DictionaryStore<GitPullRequest>>(StoreIds.PULL_REQUEST).get(fullname);
            userCreatedBranch = BranchStoreFactory.get<KeyValue.DictionaryStore<GitRef>>(StoreIds.USER_CREATED_BRANCHES).get(fullname);  
            policy = BranchStoreFactory.get<KeyValue.DictionaryStore<GitRefPolicyScope>>(StoreIds.POLICIES).get(fullname);
            push = BranchStoreFactory.get<KeyValue.DictionaryStore<GitPush>>(StoreIds.PUSH).get(fullname);
        }

        return {
            item: tref ? tref : {fullName: fullname} as IItem,
            ref: fullRef,
            isDefault,
            isCompare,
            comment: metadata ? metadata.comment : "",
            lastUpdatedBy: metadata ? metadata.author : "",
            isUserCreated: !!userCreatedBranch,
            aheadBehindDefault: stats ? {
                ahead: stats.aheadCount,
                behind: stats.behindCount,
                name: fullname
            } : null,
            pullRequest: pr,
            hasMore: {
                isHasMore: false,
                expanding: false
            },
            favorite: BranchStoreFactory.get<KeyValue.DictionaryStore<GitRefFavorite>>(StoreIds.FAVORITES).get(fullname),
            hasPolicy: policy ? true : false,
            key: fullname,
            push
        } as IEnhancedGitRef
    }

    /**
     * We build an object for rendering from the stores
     */
    private _getStateFromStores(): BranchesViewTreeState {

        //We get treestore / tree actions from the Store, we should discuss this approach
        const expandedAction: Action<string> = BranchStoreFactory.get<ValueStore<TabSelection.SelectionObject>>(StoreIds.TAB_SELECTION).get().folderExpandedAction;
        const collapsedAction: Action<string> = BranchStoreFactory.get<ValueStore<TabSelection.SelectionObject>>(StoreIds.TAB_SELECTION).get().folderCollapsedAction;
        const treeSelected = BranchStoreFactory.get<ValueStore<TabSelection.SelectionObject>>(StoreIds.TAB_SELECTION).get().selection;
        const branchesStore: StoreBase.Store = BranchStoreFactory.get<ValueStore<TabSelection.SelectionObject>>(StoreIds.TAB_SELECTION).get().branchesStore;
        const displayFlatBranches: boolean = BranchStoreFactory.get<ValueStore<TabSelection.SelectionObject>>(StoreIds.TAB_SELECTION).get().displayFlat;
        let visibleTreeBranches: SmartTree.IItem[] = null;
        let visibleFlatBranches: string[] = null;
        if (displayFlatBranches) {
            visibleFlatBranches = (branchesStore as StaleBranches.StaleBranchesStore).get(); 
        }
        else {
            visibleTreeBranches = (branchesStore as SmartTree.TreeStore).getVisible();
        }

        const defaultBranch: GitRef = BranchStoreFactory.get<DefaultBranchStore>(StoreIds.DEFAULT_BRANCH).get();
        const enhancedDefaultRef: IEnhancedGitRef = this._createEnhancedRef((defaultBranch ? GitRefUtility.getRefFriendlyName(defaultBranch.name) : null), true, false, null);
        const compareBranch: CompareBranch = BranchStoreFactory.get<ValueStore<CompareBranch>>(StoreIds.COMPARE_BRANCH).get();
        let enhancedCompareRef: IEnhancedGitRef = this._createEnhancedRef((compareBranch ? GitRefUtility.getRefFriendlyName(compareBranch.ref.name) : null), false, true, null);

        //If compare branch is not set (or == default) update to equal default branch
        if (!enhancedCompareRef && enhancedDefaultRef ||
            (compareBranch && defaultBranch && (Utils_String.defaultComparer(compareBranch.ref.name, defaultBranch.name) === 0))) {
            enhancedDefaultRef.isCompare = true;
            enhancedCompareRef = enhancedDefaultRef;
        }

        const filterText: string = BranchStoreFactory.get<ValueStore<string>>(StoreIds.FILTER).get();

        // If we are looking at a deleted filter, we want to show push info not commit details
        const showDeletedColumns: boolean = BranchStoreFactory.get<ValueStore<boolean>>(StoreIds.DELETED_FILTER).get();

        //if your trees have changed switch listeners
        if (treeSelected && this.state && this.state.treeSelected && Utils_String.ignoreCaseComparer(treeSelected, this.state.treeSelected) !== 0) {
            this.state.branchesStore.removeChangedListener(this._changeDelegate);
            branchesStore.addChangedListener(this._changeDelegate);
        }

        let enhancedBranches: IEnhancedGitRef[] = [];
        let expandAction = (name: string) => { expandedAction.invoke(name); };

        if (!displayFlatBranches) {
            // Create View from Tree
            for (var i = 0; i < visibleTreeBranches.length; i++) {
                var tref: IItem = visibleTreeBranches[i];
                const hasMore: HasMore = OnDemandStore.getHasMore(tref.fullName);
                if (tref.isFolder || hasMore.isHasMore) {
                    //Update tref properties if it is a has more placeholder
                    tref = hasMore.isHasMore ? OnDemandStore.getHasMoreFolderRef(tref) : tref;
                    enhancedBranches.push(
                        {
                            item: tref,
                            ref: null,
                            isDefault: false,
                            isCompare: false,
                            comment: null,
                            lastUpdatedBy: null,
                            aheadBehindDefault: null,
                            pullRequest: null,
                            isUserCreated: false,
                            favorite: BranchStoreFactory.get<KeyValue.DictionaryStore<GitRefFavorite>>(StoreIds.FAVORITES).get(tref.fullName),
                            hasMore,
                            gitBranchStats: null,
                            hasPolicy: false,
                            push: null,
                            key: tref.fullName
                        } as IEnhancedGitRef);
                    continue;
                }

                let enhancedRef: IEnhancedGitRef = this._createEnhancedRef(tref.fullName,
                    enhancedDefaultRef && enhancedDefaultRef.item && enhancedDefaultRef.item.fullName === tref.fullName,
                    enhancedCompareRef && enhancedCompareRef.item && enhancedCompareRef.item.fullName === tref.fullName,
                    tref);
                if (!enhancedRef)
                    return null;

                enhancedBranches.push(enhancedRef);
            };
        }
        else {
            // Create Flat View
            for (var i = 0; i < visibleFlatBranches.length; i++) {
                let fullName: string = GitRefUtility.getRefFriendlyName(visibleFlatBranches[i]);
                let enhancedRef: IEnhancedGitRef = this._createEnhancedRef(fullName,
                    enhancedDefaultRef && enhancedDefaultRef.item && enhancedDefaultRef.item.fullName === fullName,
                    enhancedCompareRef && enhancedCompareRef.item && enhancedCompareRef.item.fullName === fullName,
                    tref);
                enhancedBranches.push(enhancedRef);
            }
            
            const isHasMore: boolean = BranchStoreFactory.get<StaleBranches.StaleBranchesStore>(StoreIds.STALE_LIST).hasMore();
            const expanding: boolean = BranchStoreFactory.get<StaleBranches.StaleBranchesStore>(StoreIds.STALE_LIST).isLoading();
            const stalePage: number = BranchStoreFactory.get<StaleBranches.StaleBranchesStore>(StoreIds.STALE_LIST).getLoadedPage();
            expandAction = (name: string) => { Branch.Creators.getMoreStaleBranches(stalePage+1); };

            if (isHasMore) {
                enhancedBranches.push(
                    {
                        item: {} as IItem,
                        ref: null,
                        isDefault: false,
                        isCompare: false,
                        comment: null,
                        lastUpdatedBy: null,
                        aheadBehindDefault: null,
                        pullRequest: null,
                        isUserCreated: false,
                        favorite: null,
                        hasMore: { isHasMore, expanding },
                        gitBranchStats: null,
                        hasPolicy: false,
                        push: null,
                        key: "hasMore"
                    } as IEnhancedGitRef);
            }
        }

        return {
                branches: enhancedBranches,
                displayFlatBranches,
                onFolderExpanded: expandAction,
                onFolderCollapsed: (name: string) => { collapsedAction.invoke(name); },
                branchesStore: branchesStore,
                treeSelected,
                defaultBranch: enhancedDefaultRef,
                compareBranch: enhancedCompareRef,
                compareIsMine: compareBranch ? compareBranch.isMine : false,
                highlightText: filterText,
                showDeletedColumns,
            } as BranchesViewTreeState;
        }
}

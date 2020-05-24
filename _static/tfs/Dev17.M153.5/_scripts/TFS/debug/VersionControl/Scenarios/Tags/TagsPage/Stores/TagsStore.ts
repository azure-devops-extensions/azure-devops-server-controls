import * as VSSStore from "VSS/Flux/Store";
import { IItem } from "Presentation/Scripts/TFS/Stores/TreeStore";

import { HasMore } from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import { OnDemandStore } from "VersionControl/Scenarios/Branches/Stores/OnDemandTreeStore";
import { GitTag } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { TagCreators } from "VersionControl/Scenarios/Tags/TagsPage/Actions/ActionCreator";
import { IEnhancedTagRef, XhrNavigationParams, TagsPageResults } from "VersionControl/Scenarios/Tags/TagsPage/Actions/ActionsHub";
import { TagsPageTreeAdapter } from "VersionControl/Scenarios/Tags/TagsPage/Stores/TagsPageTreeAdapter";
import { xhrNavigateToUrl } from "VersionControl/Scripts/Utils/XhrNavigationUtilsNonReact";

export interface TagState {
    tags: IEnhancedTagRef[];
    isLoading: boolean;
    compareTagBase?: string;
}

export class TagStore extends VSSStore.Store {
    public state: TagState;
    private _tagsTreeAdapter: TagsPageTreeAdapter;
    private _onDemandStore: OnDemandStore
    private _tagsMap: {
        [key: string]: GitTag;
    };
    private _deletedTags: string[]; // fullNames of deleted tags

    constructor(tagsTreeAdapter: TagsPageTreeAdapter) {

        super();
        this.state = { tags: [], isLoading: false}
        this._onDemandStore = new OnDemandStore({
            adapter: tagsTreeAdapter,
            onFolderExpandedCallback: TagCreators.ensureAllFolderNodesFetched,
        });
        this._tagsTreeAdapter = tagsTreeAdapter;
        this._tagsMap = {};
        this._onDemandStore.addChangedListener(this._updateState);
        this._deletedTags = [];
    }

    /* Tree action listeners */
    public onSearchStarted = (): void => {
        this.state.isLoading = true;
    }

    public addTags = (payload: TagsPageResults): void => {
        this.state.isLoading = false;
        if (!!payload.compareTagBase) {
            this.state.compareTagBase = payload.compareTagBase;
        }
        this._appendTagsToMap(payload.tags);
        this._tagsTreeAdapter.addTags(payload.tags);
        
    };

    public onFolderExpanded = (folderName: string): void => {
        this._tagsTreeAdapter.onFolderExpanded(folderName);
    }

    public onFolderCollapsed = (folderName: string): void => {
        this._tagsTreeAdapter.onFolderCollapsed(folderName);
    }

    public showAll = (): void => {
        this._tagsTreeAdapter.onFolderExpanded("");
    }

    public onFilterTree = (payload: TagsPageResults): void => {
        this.state.isLoading = false;
        this._appendTagsToMap(payload.tags);
        this._tagsTreeAdapter.onFilterTree(payload.tags);
    }

    public collapseAll = (): void => {
        this._tagsTreeAdapter.collapseAll.invoke(null);
    }

    public ondemandLoading = (demandLoading: boolean): void => {
        this._tagsTreeAdapter.ondemandLoading.invoke(demandLoading);
    }

    public onTagHasMore = (hasMore: boolean): void => {
        this._tagsTreeAdapter.addRootHasMore.invoke(hasMore);
    }

    public onSuccessfulTagDeletion = (fullName: string): void => {
        for (const tag of this.state.tags) {
            if (tag.item.fullName === fullName) {
                tag.isDeleted = true;
                break;
            }
        }

        this._deletedTags.push(fullName);
        this.emitChanged();
    }

    public onTagFetchFailed = (): void => {
        this.state.isLoading = false;
        this.emitChanged();
    }

    public onCompareTagSet = (tagName: string): void => {
        if (!!tagName) {
            this.state.compareTagBase = tagName;
            // Initially reset the previous tag base set for compare
            this.state.tags.forEach((tag: IEnhancedTagRef) => {
                if (tag.isCompareTagBase) {
                    tag.isCompareTagBase = false;
                    return;
                }
            });
            // Set the new tag base for compare
            this.state.tags.forEach((tag: IEnhancedTagRef) => {
                if (tag.item.fullName === tagName) {
                    tag.isCompareTagBase = true;
                    return;
                }
            });

            this.emitChanged();
        }
    }

    public navigateToUrl = (payload: XhrNavigationParams): void => {
        if (payload && payload.url && payload.hubId) {
            xhrNavigateToUrl(payload.url, payload.hubId);
        }
    }

    public dispose(): void {
        if (this._tagsTreeAdapter) {
            this._tagsTreeAdapter.dispose();
            this._tagsTreeAdapter = null;
        }

        this._deletedTags = [];
    }

    private _appendTagsToMap = (tags: GitTag[]): void => {
        tags.map((tag: GitTag) => {
            this._tagsMap[tag.name] = tag;
        });
    }

    private _updateState = (): void => {
        const visibleItems: IItem[] = this._onDemandStore.getVisible();
        const tagList = visibleItems.map((item: IItem) => {
            let tag: GitTag;
            const hasMore: HasMore = OnDemandStore.getHasMore(item.fullName);
            if (!hasMore.isHasMore) {
                tag = this._tagsMap[item.fullName];
            }

            return {
                item: hasMore.isHasMore ? OnDemandStore.getHasMoreFolderRef(item) : item,
                tagger: tag ? tag.tagger : undefined,
                comment: tag ? tag.comment : undefined,
                resolvedCommitId: tag ? tag.resolvedCommitId : undefined,
                hasMore: hasMore,
                isDeleted: this._deletedTags.indexOf(item.fullName) >= 0,
                isCompareTagBase: item.fullName === this.state.compareTagBase,
            }
        });
        this.state.tags = tagList;
        this.emitChanged();

    }
}
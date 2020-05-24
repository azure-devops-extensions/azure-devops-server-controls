import { Action } from "VSS/Flux/Action";
import { IItem } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { GitUserDate } from "TFS/VersionControl/Contracts";
import { GitTag } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { HasMore } from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import { OnDemandStore } from "VersionControl/Scenarios/Branches/Stores/OnDemandTreeStore";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitRepositoryPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissions } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";

export interface TagsPageResults {
    tags: GitTag[];
    hasMoreRecords: boolean;
    compareTagBase: string;
}

export interface XhrNavigationParams {
    url: string;
    hubId: string;
}

export interface IEnhancedTagRef {
    item: IItem;
    comment: string;
    tagger?: GitUserDate;
    hasMore?: HasMore;
    resolvedCommitId: string;
    isDeleted: boolean;
    isCompareTagBase?: boolean;
}

export interface GitTagsDataProviderArguments {
    folderName: string;
    resultsPageNumber?: number;
    filterString: string;
}

export enum TagDeletionStatusChangeReason {
    Succeeded,
    Failed,
    Cancelled,
}
export interface TagDeletionStatus {
    name?: string;
    error?: string;
    reason: TagDeletionStatusChangeReason;
}

export class ActionsHub {
    public tagsAdded = new Action<TagsPageResults>();
    public folderExpanded = new Action<string>();
    public folderCollapsed = new Action<string>();
    public filtersInvoked = new Action<TagsPageResults>();         //Called after getting the filtered tags from the service
    public showAll = new Action<void>();
    public collapseAll = new Action<void>();
    public tagsDemandLoading = new Action<boolean>();
    public tagsHasMore = new Action<boolean>();
    public contextUpdated = new Action<RepositoryContext>();
    public tagDeletionInitiated = new Action<string>();
    public tagDeletionStatusChanged = new Action<TagDeletionStatus>();
    public filterTextChanged = new Action<string>();        //Called on enter button press or when we delete all the characters from the filter text box. (on empty filter text).
    public filterCleared = new Action<void>();
    public navigateToUrl = new Action<XhrNavigationParams>();
    public fetchTagsFailed = new Action<string>();
    public notificationCleared = new Action<void>();
    public compareTagSet = new Action<string>();
    public gitPermissionUpdate = new Action<GitRepositoryPermissionSet>();
    public settingPermissionUpdate = new Action<SettingsPermissions>();
}

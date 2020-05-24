import { Action } from "VSS/Flux/Action";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { DiscussionManager } from "Presentation/Scripts/TFS/TFS.Discussion.OM";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ChangeExplorerGridModeChangedEventArgs } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid";
import { ChangeExplorerItemType } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerItemType";
import { Change, ChangeList, ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { DiffViewerOrientation, VersionControlUserPreferences } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { Notification } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { IAvatarImageProperties } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";

export interface IDiscussionManagerCreatedPayload {
    discussionManager: DiscussionManager;
    discussionId: number;
}

export interface IContextUpdatedPayload {
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
}

export interface IUserPreferencesUpdatedPayload {
    preferences: VersionControlUserPreferences;
}

export interface IOrientationUpdatedPayload {
    orientation: DiffViewerOrientation;
}

export interface IChangeListLoadedPayload {
    originalChangeList: ChangeList;
}

export interface IChangeListAuthorDetails {
    author: IAvatarImageProperties;
    authoredDate: Date;
    changeListId: number;
}

export interface IChangeListMoreChangesPayload {
    changes: Change[];
    allChangesIncluded: boolean;
    changeCounts: { [key: number]: number; };
}

export interface IStakeholdersDetails {
    author: IAvatarImageProperties;
    committer: IAvatarImageProperties;
    pusher: IAvatarImageProperties;
    authoredDate: Date;
    commitDate: Date;
    pushedDate: Date;
    pushId: number;
}

export interface ItemDetails {
    item: ItemModel;
    itemVersion: string;
    change: Change;
}

export interface IChangeListItemDetailsPayload {
    itemDetails: ItemDetails;
}

export interface IChangeListItemDetailsSelectedPayload {
    path: string;
    itemVersion: string;
}

export interface IChangeExplorerDisplayOptionUpdatedPayload {
    options: ChangeExplorerGridModeChangedEventArgs;
}

export interface UrlParameters {
    action?: string;
    annotate?: boolean;
    diffParent?: string;
    discussionId?: number;
    codeReviewId?: number;
    hideComments?: boolean;
    isFullScreen?: boolean;
    isReviewMode?: boolean;
    gridItemType?: ChangeExplorerItemType;
    path?: string;
    oversion?: string;
    mversion?: string;
    opath?: string;
    mpath?: string;
    refName?: string;
    ss?: string;
}

/*
 ** A container for the current instances of the actions that can be triggered in the change details page.
 */
export class ActionsHub {
    public contextUpdated = new Action<IContextUpdatedPayload>();
    public errorRaised = new Action<Error>();
    public notificationsFlushed = new Action<Notification>();
    public urlParametersChanged = new Action<UrlParameters>();
    public workItemsUpdated = new Action<number[]>();

    public discussionManagerCreated = new Action<IDiscussionManagerCreatedPayload>();
    public shouldHideDiscussionManagerUpdated = new Action<boolean>();

    // user preference actions
    public changeExplorerDisplayOptionUpdated = new Action<IChangeExplorerDisplayOptionUpdatedPayload>();
    public diffViewerOrientationUpdated = new Action<IOrientationUpdatedPayload>();
    public userPreferencesUpdated = new Action<IUserPreferencesUpdatedPayload>();

    // Code explorer actions
    public changeListLoaded = new Action<IChangeListLoadedPayload>();
    public changeListMoreChangesLoaded = new Action<IChangeListMoreChangesPayload>();
    public changeListMoreChangesLoading = new Action<void>();
    public changeListMoreChangesLoadFailed = new Action<void>();
    public changeListAutoLoadAllStarted = new Action<void>();
    public changeListAutoLoadAllStopped = new Action<void>();
    public changeListItemDetailsLoaded = new Action<IChangeListItemDetailsPayload>();
    public changeListItemDetailsSelected = new Action<IChangeListItemDetailsSelectedPayload>();
    public searchInBranchesDialogLoading = new Action<boolean>();
}

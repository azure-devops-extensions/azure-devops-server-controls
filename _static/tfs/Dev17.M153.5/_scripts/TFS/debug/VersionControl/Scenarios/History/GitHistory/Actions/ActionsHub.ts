import { Action } from "VSS/Flux/Action";
import { PathSearchItemIdentifier } from "VersionControl/Scenarios/Shared/Path/IPathSearchItemIdentifier";
import { PathSearchResult } from "VersionControl/Scenarios/Shared/Path/PathSearchResult";
import { RepositoryChangedPayload, SelectedPathChangedPayload } from "VersionControl/Scenarios/History/CommonPayloadInterfaces"
import { GitHistorySearchCriteria } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { Notification } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { GitRepositoryPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";

export interface PathSearchSelectionChangedPayload {
    itemIdentifier: PathSearchItemIdentifier;
    newInputText?: string;
}

/**
 * A container for the current instances of the actions that can be triggered in History page.
 */
export class ActionsHub {
    public currentRepositoryChanged = new Action<RepositoryChangedPayload>();
    public selectedPathChanged = new Action<SelectedPathChangedPayload>();
    public pathEditingStarted = new Action<string>();
    public pathEdited = new Action<string>();
    public pathEditingCancelled = new Action<void>();
    public errorRaised = new Action<Error>();
    public deletedBranchChanged = new Action<string>();
    public notificationDismissed = new Action<Notification>();   

    public pathSearchSelectionChanged = new Action<PathSearchSelectionChangedPayload>();
    public inFolderPathSearchResultsLoaded = new Action<PathSearchResult>();
    public globalPathSearchResultsLoaded = new Action<PathSearchResult>();
    public pathSearchFailed = new Action<Error>();

    public searchCriteriaUpdated = new Action<GitHistorySearchCriteria>();
    public permissionUpdate = new Action<GitRepositoryPermissionSet>();
}
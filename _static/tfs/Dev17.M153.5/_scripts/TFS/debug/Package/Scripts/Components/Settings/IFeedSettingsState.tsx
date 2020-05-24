import { MessageBarType } from "OfficeFabric/MessageBar";

import { State } from "VSS/Flux/Component";

import { Filter } from "VSSUI/Utilities/Filter";

import { IVssHubViewState } from "VSSPreview/Utilities/VssHubViewState";

import { IGeneralDialogProps } from "Package/Scripts/Dialogs/GeneralDialog";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedPermission, FeedRetentionPolicy, FeedView, UpstreamSource } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export interface IFeedSettingsState extends State {
    /**
     * Feed for which settings should be displayed
     */
    feed: () => Feed;

    /**
     * True if current user is an administrator and can make changes to feed settings
     */
    isUserAdmin: () => boolean;

    /**
     * Update store's properties that aren't part of IFeedSettingsState for given action
     */
    updateActionDependencies: (action: DependencyAction, data: any) => void;

    /**
     * Message to display in messagebar
     */
    messageBarMessage: string;

    /**
     * Type of message displayed: error, warning, info...
     */
    messageBarType: MessageBarType;

    /**
     * Store the current pivot key user is on
     */
    currentPivotKey: string;

    /**
     * When user makes some changes and switches pivot without saving
     * Show discard dialog or hide if no changes
     */
    showDiscardDialog: boolean;

    /**
     * Track saving data to server
     */
    isSavingChanges: boolean;

    /**
     * Set of components that currently have validation errors, and their corresponding errors
     */
    validationErrorBag: IDictionaryStringTo<string>;

    /**
     * Show/Hide 'Delete feed' dialog
     */
    showDeleteDialog: boolean;

    /**
     * Updated feed name pending save
     */
    feedName?: string;

    /**
     * Updated feed description pending save
     */
    feedDescription?: string;

    /**
     * Updated hide deleted package version pending save
     */
    hideDeletedPackageVersions?: boolean;

    /**
     * Updated badges enabled pending save
     */
    badgesEnabled?: boolean;

    /**
     * Tracks loading spinner
     */
    isLoadingPermissions: boolean;

    /**
     * Keeps track of whether permission data was fetched from server
     */
    isPermissionDataLoadedFromServer: boolean;

    /**
     * Permissions on the current feed
     */
    feedPermissions: FeedPermission[];

    /**
     * Permissions selected in grid
     * Don't use indices, while filtering selectionIndices will be from this array
     */
    selectedPermissions: FeedPermission[];

    /**
     * Store for a set of filter values in Permissions pivot
     */
    permissionsFilter: Filter;

    /**
     * Show/hide 'Add Users or Groups' Panel
     */
    showAddUsersOrGroupsPanel: boolean;

    /**
     * Tracks loading spinner
     */
    isLoadingViews: boolean;

    /**
     * Keeps track of whether views data was fetched from server
     */
    isViewsDataLoadedFromServer: boolean;

    /**
     * Views available for selected feed
     */
    views: FeedView[];

    /**
     * Store default view
     */
    defaultView: FeedView;

    /**
     * Views selected in grid
     * Don't use indices, while filtering selectionIndices will be from this array
     */
    selectedViews: FeedView[];

    /**
     * View permissions, keyed on view Id
     */
    viewPermissions: IDictionaryStringTo<FeedPermission[]>;

    /**
     * Newly added view permissions that needs to be saved, keyed on view Id
     */
    viewPermissionsToAdd: IDictionaryStringTo<FeedPermission[]>;

    /**
     * View permissions that needs to be removed, keyed on view Id
     */
    viewPermissionsToRemove: IDictionaryStringTo<FeedPermission[]>;

    /**
     * Tracks view permissions loading spinner
     */
    isLoadingViewPermissions: boolean;

    /**
     * Store for a set of filter values in Views pivot
     */
    viewsFilter: Filter;

    /**
     * Show/hide ViewPanel
     */
    showViewPanel: boolean;

    /**
     * Is ViewPanel opened for add or edit
     */
    isViewPanelInEditMode?: boolean;

    /**
     * UpstreamSources selected in grid
     * Don't use indices, while filtering selectionIndices will be from this array
     */
    selectedUpstreamSources: UpstreamSource[];

    /**
     * Filter for upstream sources pivot
     */
    upstreamSourceFilter: Filter;

    /**
     * True to open the AddUpstreamPanel
     */
    displayAddUpstreamPanel: boolean;

    /**
     * Required for Hub
     * When a pivot is clicked or URL associated with a pivot changes, this will be updated
     */
    hubViewState: IVssHubViewState;

    /**
     * When user lands on settings page and there is no feed, display welcome message
     * remove this when feasible
     */
    showWelcomeMessage: () => boolean;

    /**
     * List of available feeds in the collection
     */
    feeds: () => Feed[];

    internalUpstreamSettings: IInternalUpstreamSettingsState;

    retentionPolicySettings: IRetentionPolicySettingsState;

    /**
     * IdentityId of Project Collection Administrator Group
     */
    projectCollectionAdminGroupId: string;

    /**
     * While saving, captures errors if they occur to show in Panel
     */
    error: Error;

    /**
     * Props for dialog, currently used for Delete operations
     */
    dialogProps: IGeneralDialogProps;

    /**
     * Determines wheteher this feed is available for an upgrade.
     */
    upgradeAvailable: boolean;

    /**
     * Indicates if an upgrade is currently in progress
     */
    upgradeInProgress: boolean;

    /**
     * Feature flag for custom upstream sources
     */
    isCustomPublicUpstreamsFeatureEnabled: boolean;

    /**
     * Maximum number of upstream sources allowed for this feed
     */
    upstreamSourceLimit: number;
}

export interface IRetentionPolicySettingsState {
    retentionPolicy: FeedRetentionPolicy;
    retentionPolicyEnabled: boolean;
    retentionPolicyLoading: boolean;
    retentionPolicyToApply: FeedRetentionPolicy;
    retentionPolicyMinCountLimit: number;
    retentionPolicyMaxCountLimit: number;
}

export interface IInternalUpstreamSettingsState {
    /**
     * Flag to determine if current feed is v2 enabled.
     */
    isV2Feed: boolean;
    /**
     * Flag which informs whether collection visible upstreams are enabled
     */
    collectionUpstreamsEnabled: boolean;

    /**
     * Flag which informs whether organization visible upstreams are enabled
     */
    organizationUpstreamsEnabled: boolean;

    /**
     * Allows nuget protocol to be selected for internal upstream sources
     */
    nugetInternalUpstreamsEnabled: boolean;

    /**
     * Allows maven protocol to be selected for internal upstream sources
     */
    mavenInternalUpstreamsEnabled: boolean;
}

/**
 * Actions in FeedSettings has to update FeedStore's properties that aren't part of IFeedSettingsState
 * This is the list of actions that reaches out to feed store
 */
export enum DependencyAction {
    /**
     * When user deletes a feed, following happens to state in feedstore
     * 1. removed from feeds array
     * 2. removed from feed map
     * 3. display feeds[0] to user if available
     * 4. if no feeds are available then display welcome message
     */
    DeleteFeed = 0,

    /**
     * When user adds or removes views, update the list of views in feedstore
     * If a view is removed or renamed, update the packages list
     */
    UpdateViews = 1
}

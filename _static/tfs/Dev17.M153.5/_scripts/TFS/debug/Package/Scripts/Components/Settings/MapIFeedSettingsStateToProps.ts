import { findIndex } from "OfficeFabric/Utilities";

import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

import { Filter } from "VSSUI/Utilities/Filter";

import { IFeedDetailsPaneProps } from "Package/Scripts/Components/Settings/FeedDetailsPane";
import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { IPermissionsProps } from "Package/Scripts/Components/Settings/Permissions";
import { IUpstreamSettingsPaneProps } from "Package/Scripts/Components/Settings/UpstreamSettingsPane";
import { IViewsProps } from "Package/Scripts/Components/Settings/Views";
import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import { isV2Feed } from "Package/Scripts/Helpers/FeedCapabilityHelper";
import { filterUpstreamSettingsList } from "Package/Scripts/Helpers/FilterHelper";
import { RoleHelper } from "Package/Scripts/Helpers/RoleHelper";
import { getUpstreamSourceRowData } from "Package/Scripts/Helpers/UpstreamHelper";
import { FeedPermission, FeedRetentionPolicy, FeedView, UpstreamSource } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import { FeedSettingsComponents, SettingsFilterItemKey } from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";

export class MapIFeedSettingsStateToProps {
    public static ToFeedDetailsProps(state: IFeedSettingsState): IFeedDetailsPaneProps {
        if (state.feed() == null) {
            return null;
        }

        // note that we're using object destructuring here, because as we extend the retention policy
        // attributes that are supported, we will "unpack" them all in one go.
        // Keep the variable names the same as the returned object's property names
        const { retentionPolicyCountLimit } = MapIFeedSettingsStateToProps._getRetentionPolicyDisplayValues(
            state.retentionPolicySettings.retentionPolicyToApply || state.retentionPolicySettings.retentionPolicy
        );

        const feedDetailsProps: IFeedDetailsPaneProps = {
            feedName: state.feedName != null ? state.feedName : state.feed().name,
            feedNameErrorMessage: state.validationErrorBag[FeedSettingsComponents.feedName] || Utils_String.empty,
            feedDescription:
                state.feedDescription != null ? state.feedDescription : state.feed().description || Utils_String.empty,
            hideDeletedPackageVersions:
                state.hideDeletedPackageVersions != null
                    ? state.hideDeletedPackageVersions
                    : state.feed().hideDeletedPackageVersions,
            badgesEnabled: state.badgesEnabled != null ? state.badgesEnabled : state.feed().badgesEnabled,
            isUserAdmin: state.isUserAdmin(),
            hasChanges: (): boolean => {
                return this._hasFeedDetailsChanged(state);
            },
            hasValidationErrors: (): boolean => {
                return this._hasFeedDetailsValidationErrors(state);
            },
            isSavingChanges: state.isSavingChanges,
            ...state.retentionPolicySettings,
            retentionPolicyErrorMessage:
                state.validationErrorBag[FeedSettingsComponents.feedRetentionPolicyMaxVersions] || Utils_String.empty,
            retentionPolicyCountLimit,
            retentionPolicyMinCountLimit: state.retentionPolicySettings.retentionPolicyMinCountLimit,
            retentionPolicyMaxCountLimit: state.retentionPolicySettings.retentionPolicyMaxCountLimit,
            upgradeAvailable: state.upgradeAvailable,
            upgradeInProgress: state.upgradeInProgress
        };
        return feedDetailsProps;
    }

    public static ToPermissionsProps(state: IFeedSettingsState): IPermissionsProps {
        if (state.feed() == null) {
            return null;
        }

        const filteredPermissions = this._applyPermissionFilter(state.feedPermissions, state.permissionsFilter);
        const permissionsProps: IPermissionsProps = {
            isDataLoadedFromServer: state.isPermissionDataLoadedFromServer,
            isLoading: state.isLoadingPermissions,
            permissions: filteredPermissions,
            hasNoPermissions: state.feedPermissions.length === 0,
            hasNoFilterResults: filteredPermissions.length === 0,
            isUserAdmin: state.isUserAdmin(),
            collectionScopedPermissionIsDisplayed: this._isBuildPermissionDisplayed(state, true /* collection-scope */),
            projectScopedPermissionIsDisplayed: this._isBuildPermissionDisplayed(state, false /* project-scope */),
            projectScopedPermissionExists: this._doesProjectScopedPermissionExists(),
            validationErrorBag: state.validationErrorBag,
            showAddUsersOrGroupsPanel: state.showAddUsersOrGroupsPanel,
            projectCollectionAdminGroupId: state.projectCollectionAdminGroupId,
            isSavingChanges: state.isSavingChanges,
            error: state.error
        };
        return permissionsProps;
    }

    public static ToViewsProps(state: IFeedSettingsState): IViewsProps {
        if (state.feed() == null) {
            return null;
        }

        const allViews = state.views;
        const filteredViews = this._applyViewsFilter(allViews, state.viewsFilter);
        const viewsProps: IViewsProps = {
            isDataLoadedFromServer: state.isViewsDataLoadedFromServer,
            isLoading: state.isLoadingViews,
            defaultViewId: state.feed().defaultViewId,
            views: filteredViews,
            viewPermissions: this._getViewPermissions(
                allViews,
                state.viewPermissions,
                state.viewPermissionsToAdd,
                state.viewPermissionsToRemove
            ),
            hasNoViews: allViews.length === 0,
            hasNoFilterResults: filteredViews.length === 0,
            isUserAdmin: state.isUserAdmin(),
            validationErrorBag: state.validationErrorBag,
            showViewPanelDisplay: state.showViewPanel,
            selectedViews: state.selectedViews,
            isViewPanelInEditMode: state.isViewPanelInEditMode,
            isV2Feed: state.internalUpstreamSettings.isV2Feed,
            isCollectionUpstreamsFeatureEnabled: state.internalUpstreamSettings.collectionUpstreamsEnabled,
            isOrganizationUpstreamsFeatureEnabled: state.internalUpstreamSettings.organizationUpstreamsEnabled,
            isSavingChanges: state.isSavingChanges,
            error: state.error
        };
        return viewsProps;
    }

    public static ToUpstreamSettingsProps(state: IFeedSettingsState): IUpstreamSettingsPaneProps {
        if (state.feed() == null) {
            return null;
        }

        const upstreamRows = getUpstreamSourceRowData(state.feed());
        const filteredUpstreamRows = filterUpstreamSettingsList(
            state.upstreamSourceFilter,
            upstreamRows.upstreamSources
        );

        const upstreamSettingsProps: IUpstreamSettingsPaneProps = {
            description: isV2Feed(state.feed())
                ? Utils_String.format(
                      PackageResources.UpstreamSettings_Description_V2Capability,
                      PackageResources.AzureArtifacts
                  )
                : PackageResources.UpstreamSettings_Description_NoV2Capability,
            isUserAdmin: state.isUserAdmin(),
            filter: state.upstreamSourceFilter,
            protocolFilterValues: upstreamRows.protocolFilterValues,
            hasNoUpstreamSources: upstreamRows.upstreamSources.length === 0,
            hasNoFilterResults: filteredUpstreamRows.length === 0,
            upstreamSourceRows: filteredUpstreamRows,
            upstreamSourceNameInvalidMessage:
                state.validationErrorBag[FeedSettingsComponents.upstreamSourceName] || Utils_String.empty,
            upstreamSourceLocationInvalidMessage:
                state.validationErrorBag[FeedSettingsComponents.upstreamSourceLocation] || Utils_String.empty,
            displayAddUpstreamPanel: state.displayAddUpstreamPanel,
            currentFeed: state.feed(),
            availableFeeds: state.feeds,
            internalUpstreamSettings: state.internalUpstreamSettings,
            activeUpstreamSources: state
                .feed()
                .upstreamSources.filter((upstreamSource: UpstreamSource) => upstreamSource.deletedDate == null),
            isSavingChanges: state.isSavingChanges,
            error: state.error,
            isCustomPublicUpstreamsFeatureEnabled: state.isCustomPublicUpstreamsFeatureEnabled,
            upstreamSourceLimit: state.upstreamSourceLimit
        };
        return upstreamSettingsProps;
    }

    private static _hasFeedDetailsChanged(state: IFeedSettingsState): boolean {
        return (
            state.feedName != null ||
            state.feedDescription != null ||
            state.hideDeletedPackageVersions != null ||
            state.retentionPolicySettings.retentionPolicyToApply != null ||
            state.badgesEnabled != null
        );
    }

    private static _hasFeedDetailsValidationErrors(state: IFeedSettingsState): boolean {
        return (
            state.validationErrorBag[FeedSettingsComponents.feedName] != null ||
            state.validationErrorBag[FeedSettingsComponents.feedRetentionPolicyMaxVersions] != null
        );
    }

    private static _applyPermissionFilter(permissions: FeedPermission[], permissionsFilter: Filter): FeedPermission[] {
        const userOrGroupFilterKeyword = permissionsFilter.getFilterItemValue<string>(
            SettingsFilterItemKey.userOrGroup
        );
        const rolesFilter = permissionsFilter.getFilterItemValue<string[]>(SettingsFilterItemKey.role);

        if (
            (userOrGroupFilterKeyword == null || userOrGroupFilterKeyword === Utils_String.empty) &&
            (rolesFilter == null || rolesFilter.length === 0)
        ) {
            return [].concat(permissions);
        }

        const filteredPermissions = [];
        permissions.forEach((permission: FeedPermission) => {
            if (
                userOrGroupFilterKeyword != null &&
                !Utils_String.caseInsensitiveContains(permission.displayName, userOrGroupFilterKeyword)
            ) {
                return;
            }

            if (rolesFilter != null && rolesFilter.length !== 0 && !this._hasRole(permission, rolesFilter)) {
                return;
            }

            filteredPermissions.push(permission);
        });

        return filteredPermissions;
    }

    private static _hasRole(permission: FeedPermission, rolesFilter: string[]): boolean {
        return rolesFilter.some((role: string) => {
            return permission.role === RoleHelper.stringToRole(role);
        });
    }

    /**
     * Give list of view permissions that needs to be displayed in grid
     * @param viewsInFeed - Initial set of views available on feed
     * @param viewPermissions - Initial set of permissions set on feed, key is viewId
     * @param viewPermissionsToAdd - User wants to add these permissions, key is viewId
     * @param viewPermissionsToRemove - User wants to remove these permissions, key is viewId
     */
    private static _getViewPermissions(
        viewsInFeed: FeedView[],
        viewPermissions: IDictionaryStringTo<FeedPermission[]>,
        viewPermissionsToAdd: IDictionaryStringTo<FeedPermission[]>,
        viewPermissionsToRemove: IDictionaryStringTo<FeedPermission[]>
    ): IDictionaryStringTo<FeedPermission[]> {
        const permissions: IDictionaryStringTo<FeedPermission[]> = {};

        for (const view of viewsInFeed) {
            permissions[view.id] = [];

            const permissionsToRemoveMap: IDictionaryStringTo<string> = {};
            if (viewPermissionsToRemove[view.id]) {
                for (const permission of viewPermissionsToRemove[view.id]) {
                    permissionsToRemoveMap[permission.identityId] = permission.identityId;
                }
            }

            // add existing permissions, excluding those to be removed
            if (viewPermissions[view.id]) {
                for (const permission of viewPermissions[view.id]) {
                    if (permissionsToRemoveMap[permission.identityId] == null) {
                        permissions[view.id].push(permission);
                    }
                }
            }

            // add new permissions
            if (viewPermissionsToAdd[view.id]) {
                permissions[view.id] = permissions[view.id].concat(...viewPermissionsToAdd[view.id]);
            }
        }

        return permissions;
    }

    private static _applyViewsFilter(views: FeedView[], viewsFilter: Filter): FeedView[] {
        const viewsFilterKeyword = viewsFilter.getFilterItemValue<string>(SettingsFilterItemKey.views);

        if (viewsFilterKeyword == null || viewsFilterKeyword === Utils_String.empty) {
            return views;
        }

        const filteredViews: FeedView[] = [];
        views.forEach((view: FeedView) => {
            if (viewsFilterKeyword != null && !Utils_String.caseInsensitiveContains(view.name, viewsFilterKeyword)) {
                return;
            }

            filteredViews.push(view);
        });

        return filteredViews;
    }

    /**
     * Tells whether Build permission is displayed in Grid or not
     * @param state - FeedSettingsState
     * @param isCollectionScope - TRUE for collection-scope FALSE for project-scope
     */
    private static _isBuildPermissionDisplayed(state: IFeedSettingsState, isCollectionScope: boolean): boolean {
        const webPageDataService = Service.getLocalService(HubWebPageDataService);

        let identityId: string;
        if (isCollectionScope) {
            identityId = webPageDataService.getCollectionBuildIdentity().id;
        } else {
            const projectBuildIdentity = webPageDataService.getProjectBuildIdentity();
            if (projectBuildIdentity == null) {
                return false;
            }
            identityId = projectBuildIdentity.id;
        }

        return this._identityIdExists(identityId, state.feedPermissions);
    }

    /**
     * Check whether <Project Name> Build Service (<account/collection name>) identity exists or not
     * This is created on-demand based on Build Job Authorization Scope set to Project Collection or Current Project
     */
    private static _doesProjectScopedPermissionExists(): boolean {
        const webPageDataService = Service.getLocalService(HubWebPageDataService);
        return webPageDataService.getProjectBuildIdentity() != null;
    }

    private static _identityIdExists(identityId: string, permissions: FeedPermission[]): boolean {
        const index: number = findIndex(permissions, (permission: FeedPermission) => {
            return permission.identityId === identityId;
        });
        return index >= 0;
    }

    private static _getRetentionPolicyDisplayValues(
        policy: FeedRetentionPolicy
    ): { retentionPolicyCountLimit: string; retentionPolicyAgeLimit?: string } {
        let count = "";
        let age = "";

        if (policy) {
            count = policy.countLimit ? Number(policy.countLimit).toString() : "";
            age = policy.ageLimitInDays ? Number(policy.ageLimitInDays).toString() : "";
        }

        return {
            retentionPolicyCountLimit: count,
            retentionPolicyAgeLimit: age
        };
    }
}

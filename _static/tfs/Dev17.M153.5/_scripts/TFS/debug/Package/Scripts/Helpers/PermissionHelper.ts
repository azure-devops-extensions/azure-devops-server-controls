import { Feed, FeedPermission, FeedRole } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

// feed.permissions contains one entry, the current user's role
const userPermissionIndex = 0;

/**
 * Given a feed, determines if deleted packages should be displayed depending
 * on the user's permissions and the hideDeletedPackageVersions property.
 * @param feed
 */
export function isDeleted(feed: Feed): boolean {
    // If user is reader or contributor, don't request deleted (nuget) and unpublished (npm) packages
    if (
        feed.permissions &&
        feed.permissions.length > 0 &&
        feed.permissions[userPermissionIndex].role !== FeedRole.Administrator
    ) {
        return false;
    }

    // If admin has set feed settings to hideDeletedPackageVersions,
    // then don't request deleted (nuget) and unpublished (npm) packages for admin
    return feed.hideDeletedPackageVersions ? false : null;
}

/**
 * Returns true if feed's permissions role is an Administrator role.
 * @param feed
 */
export function isAdministrator(feed: Feed): boolean {
    return (
        feed.permissions &&
        feed.permissions.length > 0 &&
        feed.permissions[userPermissionIndex].role === FeedRole.Administrator
    );
}

/**
 * Returns true if role is an Administrator role.
 * @param role
 */
export function isAdministratorFromRole(role: FeedRole): boolean {
    return role === FeedRole.Administrator;
}

/**
 * Returns true if role is a Contributor role.
 * @param role
 */
export function isContributor(role: FeedRole): boolean {
    return role === FeedRole.Contributor;
}

/**
 * Given a feed, determine if the user is a feed reader.
 * @param feed
 */
export function isFeedReader(feed: Feed): boolean {
    return (
        feed.permissions &&
        feed.permissions.length > 0 &&
        feed.permissions[userPermissionIndex].role === FeedRole.Reader
    );
}

/**
 * Given a feed, determine if the user has any access to the base feed.
 * @param feed
 */
export function hasAccessToBaseFeed(feed: Feed): boolean {
    return feed && feed.permissions && feed.permissions.length > 0 && feed.permissions[0].role !== FeedRole.None;
}

/**
 * Filters out permission that aren't required for UI
 * @param permissions - list of permissions set to feed
 */
export function filterWellKnownPermissions(permissions: FeedPermission[]): FeedPermission[] {
    return permissions.filter((permission: FeedPermission) => {
        return (
            permission.role === FeedRole.Administrator ||
            permission.role === FeedRole.Contributor ||
            permission.role === FeedRole.Collaborator ||
            permission.role === FeedRole.Reader
        );
    });
}

export function getUsersRoleForFromFeed(feed: Feed): FeedRole {
    return feed && feed.permissions && feed.permissions.length > 0 ? feed.permissions[0].role : FeedRole.None;
}

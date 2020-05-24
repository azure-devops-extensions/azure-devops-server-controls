import { Identity } from "VSS/Identities/Contracts";
import * as Service from "VSS/Service";

import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { IdentityDataService } from "Package/Scripts/DataServices/IdentityDataService";
import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import { filterDefaultUpstreamSources } from "Package/Scripts/Helpers/UpstreamHelper";
import { Feed, FeedPermission, FeedRole, FeedView, FeedVisibility } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class Sources {
    public static public = "public";
    public static local = "local";
}

export class Visibility {
    /**
     * Use this value if internal organization upstreams are enabled
     */
    public static organization = "organization";

    /**
     * Use this value if internal collection upstreams are enabled
     */
    public static collection = "collection";

    /**
     * Use this value if upstreams are disabled
     */
    public static defaultProjCollValidUsers = "account";

    /**
     * Use this value if user selected private visibility
     */
    public static private = "private";
}

export interface ICreateFeedSettings {
    project: ContextIdentifier;
    feedName: string;
    sources: string;
    visibility: string;
}

class SetFeedVisibilityHelper {
    public async SetFeedVisibility(feed: Feed, visibility: string): Promise<Feed> {
        // Do nothing if visibility is set to Private
        if (visibility === Visibility.private) {
            return feed;
        }

        const feedsDataService = Service.getLocalService(FeedsDataService);
        const webPageDataService = Service.getLocalService(HubWebPageDataService);

        // If visibility is set to the default (upstreams are disabled), add the everyone group to the default View
        if (visibility === Visibility.defaultProjCollValidUsers) {
            return feedsDataService
                .setFeedPermissionsAsync(`${feed.id}@${feed.defaultViewId}`, [
                    {
                        identityDescriptor: webPageDataService.getEveryoneGroup(),
                        identityId: undefined,
                        role: FeedRole.Reader
                    } as FeedPermission
                ])
                .then(() => feed);
        }

        if (visibility === Visibility.collection || visibility === Visibility.organization) {
            const visibilityEnum =
                visibility === Visibility.organization
                    ? FeedVisibility.Organization
                    : visibility === Visibility.collection
                        ? FeedVisibility.Collection
                        : FeedVisibility.Private;
            const viewPatch: FeedView = { visibility: visibilityEnum } as FeedView;
            return feedsDataService.updateFeedViewAsync(feed.id, viewPatch, feed.defaultViewId).then(feedView => feed);
        }
    }

    public async GetFeedWithPermissions(feed: Feed): Promise<Feed> {
        const feedsDataService = Service.getLocalService(FeedsDataService);
        return feedsDataService.getFeedPermissionsAsync(feed).then(permissions => {
            feed.permissions = permissions;
            return feed;
        });
    }
}

export class CreateFeedHelper {
    public async ConstructFeed(feedSettings: ICreateFeedSettings): Promise<Feed> {
        const feed = {} as Feed;

        const webPageDataService = Service.getLocalService(HubWebPageDataService);

        // Name
        feed.name = feedSettings.feedName;
        feed.hideDeletedPackageVersions = true;

        // Permissions
        // Project Collection Build Service (collection)
        feed.permissions = [
            {
                identityDescriptor: webPageDataService.getCollectionBuildIdentity().descriptor,
                identityId: undefined,
                role: FeedRole.Contributor
            } as FeedPermission
        ];

        // Project Build Service (project)
        const projectBuildIdentity = webPageDataService.getProjectBuildIdentity();
        if (projectBuildIdentity) {
            feed.permissions.push({
                identityDescriptor: projectBuildIdentity.descriptor,
                identityId: undefined,
                role: FeedRole.Contributor
            } as FeedPermission);
        }

        // Upstream sources
        if (feedSettings.sources === Sources.public) {
            feed.upstreamEnabled = true;
            feed.upstreamSources = filterDefaultUpstreamSources();
        }

        // If visibility is set to the default (upstreams are disabled), add the everyone group to feed permissions
        // Placed here in case both upstreams flags are off
        if (feedSettings.visibility === Visibility.defaultProjCollValidUsers) {
            feed.permissions.push({
                identityDescriptor: webPageDataService.getEveryoneGroup(),
                identityId: undefined,
                role: FeedRole.Reader
            } as FeedPermission);
        }

        // If we are in a project, get the Project's groups
        if (feedSettings.project != null) {
            const identityDataService = Service.getService(IdentityDataService);
            return identityDataService.listGroups(feedSettings.project.id).then((groups: Identity[]) => {
                // Project Administrators
                const projectAdministratorsGroup = groups.filter(
                    i => i.properties.Account.$value === "Project Administrators"
                );
                projectAdministratorsGroup.forEach(identity => {
                    feed.permissions.push({
                        identityDescriptor: identity.descriptor,
                        identityId: undefined,
                        role: FeedRole.Administrator
                    } as FeedPermission);
                });

                // Project Contributors
                const projectContributorsGroup = groups.filter(i => i.properties.Account.$value === "Contributors");
                projectContributorsGroup.forEach(identity => {
                    feed.permissions.push({
                        identityDescriptor: identity.descriptor,
                        identityId: undefined,
                        role: FeedRole.Contributor
                    } as FeedPermission);
                });

                return feed;
            });
        }

        return feed;
    }

    public async SaveFeed(feedSettings: ICreateFeedSettings, feed: Feed): Promise<Feed> {
        const feedsDataService = Service.getLocalService(FeedsDataService);
        const createdFeed = await feedsDataService.createFeed(feed);
        return createdFeed;
    }
}

export function createFeed(feedSettings: ICreateFeedSettings): Promise<Feed> {
    const createFeedHelper = new CreateFeedHelper();
    return createFeedHelper.ConstructFeed(feedSettings).then(constructedFeed => {
        return createFeedHelper.SaveFeed(feedSettings, constructedFeed);
    });
}

export function setFeedVisibility(feed: Feed, visibility: string): Promise<Feed> {
    const visHelper = new SetFeedVisibilityHelper();
    return visHelper.SetFeedVisibility(feed, visibility).then(feedWithVisibilitySet => {
        return visHelper.GetFeedWithPermissions(feedWithVisibilitySet);
    });
}

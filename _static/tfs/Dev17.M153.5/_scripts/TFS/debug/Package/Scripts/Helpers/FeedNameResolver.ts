import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";

export function getFullyQualifiedFeedName(feed: Feed, viewName: string = null): string {
    if (feed == null) {
        return null;
    }

    if (viewName != null) {
        return feed.name + "@" + viewName;
    }

    if (feed.view != null && feed.view.name != null) {
        return feed.name + "@" + feed.view.name;
    }

    return feed.name;
}

export function getFullyQualifiedFeedId(feed: Feed): string {
    if (feed == null) {
        return null;
    }

    if (feed.view != null) {
        return feed.id + "@" + feed.view.id;
    }

    return feed.id;
}

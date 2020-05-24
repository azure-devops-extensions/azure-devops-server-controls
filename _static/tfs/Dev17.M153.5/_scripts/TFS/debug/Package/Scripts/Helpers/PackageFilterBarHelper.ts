import { IPickListItem } from "VSSUI/PickList";
import { IFilter, IFilterItemState, IFilterState } from "VSSUI/Utilities/Filter";

import { PackageFilterBarConstants } from "Feed/Common/Constants/Constants";
import { upstreamSourceToPickListItem } from "Package/Scripts/Helpers/UpstreamHelper";
import * as PackageResources from "Feed/Common/Resources";
import { WebPageConstants } from "Package/Scripts/Types/WebPage.Contracts";
import { FeedView, UpstreamSource, UpstreamSourceType } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class PackageFilterBarHelper {
    public static readonly allItem: IPickListItem = null;

    public static readonly localItem: IPickListItem = {
        key: WebPageConstants.DirectUpstreamSourceIdForThisFeedFilter,
        name: PackageResources.FeedSources_Local
    };

    public static getFeedViewPickListItem(feedView: FeedView): IPickListItem {
        feedView = this.getFeedViewFromObject(feedView);
        const name: string = feedView.name[0] === "@" ? feedView.name : "@" + feedView.name;
        return {
            key: feedView.id,
            name
        } as IPickListItem;
    }

    // Filter bar calls the helper methods with either a FeedView or a IPickListItem, this method
    // will aid in extracting the feedView object regardless of the initial object
    public static getFeedViewFromObject(feedView: any): FeedView {
        if (!feedView) {
            return undefined;
        }

        const hasId = feedView.hasOwnProperty("id") || !!feedView.hasOwnProperty("key");
        const hasName = feedView.hasOwnProperty("name");

        if (hasId && hasName) {
            const name: string = feedView.name;
            const resultName: string = name[0] === "@" ? name.substring(1) : name;
            return {
                id: feedView.id || feedView.key,
                name: resultName
            } as FeedView;
        }

        return undefined;
    }

    public static setFeedViewToFilterState(filterState: IFilterState, feedView: FeedView): IFilterState {
        if (!feedView) {
            return filterState;
        }

        const pickListItem = this.getFeedViewPickListItem(feedView);
        filterState[PackageFilterBarConstants.ViewFilterKey] = { value: [pickListItem] };
        return filterState;
    }

    public static getSourcePickListItem(source: UpstreamSource): IPickListItem {
        if (source == null) {
            return null;
        }

        if (source.name === PackageResources.UpstreamSourceKey_Local) {
            return this.localItem;
        }

        if (
            source.upstreamSourceType === UpstreamSourceType.Public ||
            source.upstreamSourceType === UpstreamSourceType.Internal
        ) {
            return upstreamSourceToPickListItem(source);
        }

        return null;
    }

    public static setSourceToFilterState(filterState: IFilterState, source: UpstreamSource): IFilterState {
        const pickListItem = PackageFilterBarHelper.getSourcePickListItem(source);
        if (pickListItem == null) {
            return filterState;
        }

        filterState[PackageFilterBarConstants.SourceFilterKey] = { value: [pickListItem] };
        return filterState;
    }

    public static getKeywordFilterTextFromFilter(filter: IFilter): string {
        return filter.getFilterItemValue<string>(PackageFilterBarConstants.KeywordFilterKey);
    }

    public static getKeywordFilterText(filterState: IFilterState): string {
        const filterTextState: IFilterItemState = filterState[PackageFilterBarConstants.KeywordFilterKey];

        if (filterTextState) {
            return filterTextState.value as string;
        }

        return null;
    }
}

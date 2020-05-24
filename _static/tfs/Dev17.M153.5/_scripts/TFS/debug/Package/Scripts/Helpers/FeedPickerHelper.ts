import { autobind } from "OfficeFabric/Utilities";

import { IHeaderItemPicker } from "VSSUI/Components/HubHeader/HubBreadcrumb.Props";
import { ObservableValue } from "VSS/Core/Observable";

import * as Actions from "Package/Scripts/Actions/Actions";
import * as PackageResources from "Feed/Common/Resources";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";

export class FeedPickerHelper {
    public static getFeedPicker(feeds: Feed[], selectedFeed: Feed): IHeaderItemPicker {
        const feedPicker: IHeaderItemPicker = {
            isDropdownVisible: new ObservableValue<boolean>(true),
            minItemsForSearchBox: 6,
            getItems: () => feeds,
            getListItem: (item: Feed) => ({ name: item.name, key: item.id }),
            isSearchable: true,
            selectedItem: selectedFeed,
            onSelectedItemChanged: this.onFeedPickerValueChange,
            searchTextPlaceholder: PackageResources.FeedPicker_Placeholder,
            searchNoResultsText: PackageResources.FilterList_NoResults
        };

        return feedPicker;
    }

    @autobind
    public static onFeedPickerValueChange(feed: Feed): void {
        Actions.FeedSelected.invoke(feed);
    }
}

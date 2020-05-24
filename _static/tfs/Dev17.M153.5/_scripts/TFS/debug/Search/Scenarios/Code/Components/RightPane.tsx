import * as React from "react";
import * as _PreviewCommandBarContainer from "Search/Scenarios/Code/Components/PreviewCommandBar";
import * as _FilePreviewNotificationBanner from "Search/Scenarios/Code/Components/FilePreviewNotificationBanner";
import * as Container from "Search/Scenarios/Code/Components/Container";
import { ItemContent } from "Search/Scenarios/Code/Components/ItemContent";
import { FileNameHeader } from "Search/Scenarios/Code/Components/PreviewHeader";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { css } from "OfficeFabric/Utilities";
import { SearchStatus } from "Search/Scenarios/Shared/Base/Stores/SearchStore";
import { PivotContainer } from "Search/Scenarios/Shared/Components/PivotContainer";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Code/Components/RightPane";

export const RightPaneContainer = Container.create(
    ["searchStore", "pivotTabsStore", "contextStore", "itemContentStore"],
    ({
        searchStoreState,
        selectedItem,
        pivotTabsState,
        contextStoreState
    },
    props) => {
        const { clickFileNameLink, changeActiveTab } = props.actionCreator;
        const activeTabKey = pivotTabsState.currentTab;
        const renderItemContent = typeof selectedItem !== "undefined";

        return (
            <div className={css("rightPane--container", "absolute-full", { hidden: searchStoreState.searchStatus !== SearchStatus.Success })}>
                <FilePreviewNotificationBannerContainerAsync {...props} />
                {
                    renderItemContent &&
                    <FileNameHeader item={selectedItem} onInvoked={clickFileNameLink} />
                }
                <div className="pivotAndCommand--container">
                    <PivotContainer
                        className="pivotTab"
                        pivotTabs={pivotTabsState.tabItems}
                        selectedTabId={activeTabKey}
                        onTabClick={changeActiveTab} />
                    <PreviewCommandBarContainerAsync {...props} selectedItem={selectedItem} />
                </div>
                {
                    renderItemContent &&
                    <ItemContent
                        {...props}
                        contextStoreState={contextStoreState}
                        visibleTab={activeTabKey}
                        item={selectedItem} />
                }
            </div>);
    }
);

const PreviewCommandBarContainerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Code/Components/PreviewCommandBar"],
    (previewCommandBarContainer: typeof _PreviewCommandBarContainer) => previewCommandBarContainer.PreviewCommandBarContainer);

const FilePreviewNotificationBannerContainerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Code/Components/FilePreviewNotificationBanner"],
    (FilePreviewNotificationBanner: typeof _FilePreviewNotificationBanner) => FilePreviewNotificationBanner.FilePreviewNotificationBannerContainer);

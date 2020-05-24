import * as React from "react";
import * as _WorkItemPreview from "Search/Scenarios/WorkItem/Components/WorkItemPreview";
import * as _PreviewNotificationBanner from "Search/Scenarios/WorkItem/Components/PreviewNotificationBanner";
import * as Container from "Search/Scenarios/WorkItem/Components/Container";
import { SearchStatus } from "Search/Scenarios/Shared/Base/Stores/SearchStore";
import { css } from "OfficeFabric/Utilities";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { getFieldValue } from "Search/Scenarios/WorkItem/Utils";

import "VSS/LoaderPlugins/Css!Search/Scenarios/WorkItem/Components/RightPane";

export const RightPaneContainer = Container.create(
    ["itemContentStore", "searchStore", "notificationStore"],
    ({ selectedItem, searchStoreState, notificationStoreState }, props) => {
        const selectedItemId: string = selectedItem ? getFieldValue(selectedItem.fields, "system.id") : null,
            selectedItemRev: string = selectedItem ? getFieldValue(selectedItem.fields, "system.rev") : null,
            { searchStatus } = searchStoreState,
            { showBanner, onPreviewLoaded, onPreviewLoadFailed, dismissBanner } = props.actionCreator;
        return (
            <div className={css("workItem-preview--container", {
                "hidden": searchStatus !== SearchStatus.Success
            })}>
                <PreviewNotificationBannerAsync
                    bannerType={notificationStoreState.workItemPreviewBannerState}
                    onDismiss={dismissBanner} />
                {
                    !!selectedItemId &&
                    searchStatus === SearchStatus.Success &&
                    <WorkItemPreviewAsync
                        workItemId={selectedItemId}
                        workItemRev={selectedItemRev}
                        onShowBanner={showBanner}
                        onSuccess={onPreviewLoaded}
                        onError={onPreviewLoadFailed} />
                }
            </div>);
    });

const WorkItemPreviewAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/WorkItem/Components/WorkItemPreview"],
    (workItemPreview: typeof _WorkItemPreview) => workItemPreview.WorkItemPreview);

const PreviewNotificationBannerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/WorkItem/Components/PreviewNotificationBanner"],
    (previewNotificationBanner: typeof _PreviewNotificationBanner) => previewNotificationBanner.PreviewNotificationBanner);

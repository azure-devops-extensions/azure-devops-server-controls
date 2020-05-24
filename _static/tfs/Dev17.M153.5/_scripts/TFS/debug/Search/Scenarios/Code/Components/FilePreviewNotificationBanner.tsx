import * as React from "react";
import * as Container from "Search/Scenarios/Code/Components/Container";
import * as MessageBar from "OfficeFabric/MessageBar";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { MessageBarWrapper } from "Search/Scenarios/Code/Components/MessageBar";
import { StaleFileBanner } from "Search/Scenarios/Code/Flux/Stores/NotificationStore";

export const FilePreviewNotificationBannerContainer = Container.create(
    ["notificationStore"],
    ({ notificationStoreState }, props) => {
        const { fileBannerState } = notificationStoreState,
            message =
                fileBannerState === StaleFileBanner.FileDeleted
                    ? Resources.FileDeletedBannerMessage
                    : fileBannerState === StaleFileBanner.StaleFile
                        ? Resources.StaleFileBannerMessage : "";

        return notificationStoreState.fileBannerState !== StaleFileBanner.None ? (
            <MessageBarWrapper
                messageBarType={MessageBar.MessageBarType.warning}
                isMultiline={false}
                message={message}
                onDidMount={() => {
                    props.actionCreator.publishNotificationBanner(StaleFileBanner[notificationStoreState.fileBannerState])
                }}>
            </MessageBarWrapper >
        ) : null;
    });
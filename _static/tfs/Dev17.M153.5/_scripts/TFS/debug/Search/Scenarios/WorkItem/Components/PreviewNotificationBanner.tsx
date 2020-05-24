import * as React from "react";
import * as MessageBar from "OfficeFabric/MessageBar";
import { WorkitemPreviewPaneScenario } from "Search/Scenarios/WorkItem/Flux/Stores/NotificationStore";
import { WorkItemOudatedIndexMessage, WorkItemDeletedMessage } from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";

export interface PreviewNotificiationBannerProps {
    bannerType: WorkitemPreviewPaneScenario;

    onDismiss: () => void;
}

export const PreviewNotificationBanner = (props: PreviewNotificiationBannerProps): JSX.Element => {
    const { bannerType } = props;
    return bannerType !== WorkitemPreviewPaneScenario.None ?
        <MessageBar.MessageBar
            messageBarType={MessageBar.MessageBarType.warning}
            isMultiline={false}
            onDismiss={props.onDismiss}>
            {getPreviewBannerMessage(props.bannerType)}
        </MessageBar.MessageBar>
        : null;

}

function getPreviewBannerMessage(scenario: WorkitemPreviewPaneScenario): string {
    return (scenario === WorkitemPreviewPaneScenario.Stale) ? WorkItemOudatedIndexMessage : WorkItemDeletedMessage;
}
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";
import * as React from "react";
import * as ReactDOM from "react-dom";

import {
    NotificationType,
    Notification,
} from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export type Renderers = IDictionaryStringTo<(specialContent: any) => JSX.Element>;

export function renderInto(element: HTMLElement, props: NotificationAreaProps): void {
    ReactDOM.render(
        <NotificationArea {...props}/>,
        element);
}

export function unmountComponent(element: HTMLElement): void {
    ReactDOM.unmountComponentAtNode(element);
}

export interface NotificationAreaProps {
    className?: string;
    notifications: Notification[];
    renderers?: Renderers;
    onDismiss?(notification: Notification): void;
}

/**
 * A component to display notifications.
 */
export const NotificationArea = (props: NotificationAreaProps): JSX.Element =>
    <div>
        {
            props.notifications.map(notification => {
                const message = renderSpecialContent(notification, props.renderers) || notification.message;
                return message &&
                    <MessageBar
                        key={notification.key}
                        className={css("notification-message-bar", props.className)}
                        messageBarType={mapToMessageBarType[notification.type]}
                        dismissButtonAriaLabel={VCResources.VersionControl_MessageBar_DismissButton_AriaLabel}
                        onDismiss={notification.isDismissable && props.onDismiss ? () => props.onDismiss(notification) : undefined}>
                            {message}
                    </MessageBar>;
            })
        }
    </div>;

const mapToMessageBarType: IDictionaryNumberTo<MessageBarType> = {
    [NotificationType.success]: MessageBarType.success,
    [NotificationType.info]: MessageBarType.info,
    [NotificationType.warning]: MessageBarType.warning,
    [NotificationType.error]: MessageBarType.error,
};

function renderSpecialContent(notification: Notification, renderers: Renderers): JSX.Element {
    const renderer = renderers && renderers[notification.specialType];
    return renderer && renderer(notification.specialContent);
}

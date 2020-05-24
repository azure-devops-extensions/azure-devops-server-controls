import * as React from "react";

import { PullRequestListActionCreator } from "VersionControl/Scenarios/PullRequestList/Actions/PullRequestListActionCreator";
import { NotificationSpecialType } from "VersionControl/Scenarios/PullRequestList/Stores/NotificationStore";
import { CreatePullRequestSuggestionBanner } from "VersionControl/Scenarios/Shared/Notifications/CreatePullRequestSuggestionBanner";
import { NotificationArea } from "VersionControl/Scenarios/Shared/Notifications/NotificationArea";
import { NotificationStore, NotificationState, Notification } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";

import "VSS/LoaderPlugins/Css!VersionControl/NotificationAreaControllerView";

export interface NotificationAreaControllerViewProps {
    actionCreator: PullRequestListActionCreator;
    notificationStore: NotificationStore;
}

export interface NotificationAreaControllerViewState {
    notifications: Notification[];
}

/**
 * A container to display notifications in PullRequests list page
 */
export class NotificationAreaControllerView extends React.Component<NotificationAreaControllerViewProps, NotificationAreaControllerViewState> {
    constructor(props: NotificationAreaControllerViewProps) {
        super(props);
        this.state = this._getState();
        this._onChanged = this._onChanged.bind(this);
        this._dismiss = this._dismiss.bind(this);
    }

    public componentDidMount(){
        this.props.notificationStore.addChangedListener(this._onChanged);
    }

    public componentWillUnmount(){
        this.props.notificationStore.removeChangedListener(this._onChanged);
    }

    public render(): JSX.Element {
        return this.state.notifications.length ? <div className="notification-area-container">
                <NotificationArea
                    notifications={this.state.notifications}
                    renderers={mapToRenderer}
                    onDismiss={this._dismiss} />
            </div> : null;
    }

    private _onChanged() {
        this.setState(this._getState());
    }

    private _getState(): NotificationAreaControllerViewState {
        const maxNotifications = 5;
        const notifications = this.props.notificationStore.state.notifications.slice(-maxNotifications);
        return { notifications };
    }

    private _dismiss(notification: Notification) {
        this.props.actionCreator.dismissNotification(notification);
    }
}

const mapToRenderer: IDictionaryStringTo<(specialContent: any) => JSX.Element> = {
    [NotificationSpecialType.createPullRequestSuggestion]: specialContent =>{
            return specialContent.sourceRepositoryContext && (<CreatePullRequestSuggestionBanner suggestion={specialContent} />);
    }
};

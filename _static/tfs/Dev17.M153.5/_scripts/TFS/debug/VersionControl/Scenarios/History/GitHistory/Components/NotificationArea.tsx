import * as React from "react";
import { HistoryTabActionCreator } from  "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator";
import { NotificationStore, NotificationState } from  "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { NotificationArea } from "VersionControl/Scenarios/Shared/Notifications/NotificationArea";

export interface NotificationAreaContainerProps {
    actionCreator: HistoryTabActionCreator;
    store: NotificationStore;
}

/**
 * A container to display notifications in Explorer scenario.
 */
export class NotificationAreaContainer extends React.Component<NotificationAreaContainerProps, NotificationState> {
    constructor(props: NotificationAreaContainerProps) {
        super(props);

        this.state = this.getStateFromStore(props);
    }

    public render(): JSX.Element {
        return (
            <NotificationArea
                notifications={this.state.notifications}
                onDismiss={this.props.actionCreator.flushErrorNotification}
                />);
    }

    public componentDidMount(): void {
        this.props.store.addChangedListener(this.onStoreChanged);
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this.onStoreChanged);
    }

    private onStoreChanged = (): void => {
        this.setState(this.getStateFromStore(this.props));
    }

    private getStateFromStore(props: NotificationAreaContainerProps): NotificationState {
        return props.store.state;
    }
}

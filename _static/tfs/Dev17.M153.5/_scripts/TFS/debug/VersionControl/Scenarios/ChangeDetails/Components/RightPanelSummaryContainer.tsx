import * as React from "react";
import * as ReactDOM from "react-dom";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { ErrorNotification_CloseButton_AriaLabel } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import { GitDiffItem } from "VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer";
import { FileLineDiffCountStore } from "VersionControl/Scripts/Stores/PullRequestReview/FileLineDiffCountStore";

import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import { ActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionCreator";
import { FileBar } from "VersionControl/Scenarios/ChangeDetails/Components/FileBar";
import { Notification, NotificationType } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";

import "VSS/LoaderPlugins/Css!VersionControl/RightPanelSummaryContainer";

export interface IRightPanelSummaryContainerProps extends IChangeDetailsPropsBase {
    storesHub: StoresHub;
    actionCreator: ActionCreator;
    diffCountStore?: FileLineDiffCountStore;    // if none is provided, a new store will be spun up
}

export interface IRightPanelSummaryContainerState {
    isLoading: boolean;
    repositoryContext: RepositoryContext;
    notifications: Notification[];
    selectedPath: string;
    isDirectory: boolean;
    linesAdded: number;
    linesDeleted: number;
}

export class RightPanelSummaryContainer extends React.Component<IRightPanelSummaryContainerProps, IRightPanelSummaryContainerState> {
    private _diffCountStore: FileLineDiffCountStore;

    constructor(props: IRightPanelSummaryContainerProps, context?: any) {
        super(props, context);
        this._diffCountStore = this.props.diffCountStore || new FileLineDiffCountStore();

        this.state = this._getStateFromStores();
    }

    public componentDidMount(): void {
        this.props.storesHub.contextStore.addChangedListener(this._onChange);
        this.props.storesHub.notificationStore.addChangedListener(this._onChange);
        this.props.storesHub.urlParametersStore.addChangedListener(this._onChange);
        this._diffCountStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.contextStore.removeChangedListener(this._onChange);
        this.props.storesHub.notificationStore.removeChangedListener(this._onChange);
        this.props.storesHub.urlParametersStore.removeChangedListener(this._onChange);
        this._diffCountStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        const {notifications, isDirectory, selectedPath, linesAdded, linesDeleted} = this.state;
        const {actionCreator, storesHub, customerIntelligenceData} = this.props;

        const notificationBars = notifications.map<JSX.Element>((notification: Notification) => (
            <MessageBar
                key={notification.key}
                messageBarType={MessageBarType.error}
                ariaLabel={ErrorNotification_CloseButton_AriaLabel}
                onDismiss={() => { this._onNotificationDismiss(notification) }}>
                {notification.message}
            </MessageBar>
        ));

        return (
            <div className="right-panel-summary-container">
                {
                    notificationBars.length > 0 &&
                    <div className="error-notification-area">
                        {notificationBars}
                    </div>
                }
                <FileBar
                    path={selectedPath}
                    isDirectory={isDirectory}
                    linesAdded={linesAdded}
                    linesDeleted={linesDeleted}
                    actionCreator={actionCreator}
                    storesHub={storesHub}
                    customerIntelligenceData={customerIntelligenceData && customerIntelligenceData.clone()} />
            </div>
        );
    }

    public shouldComponentUpdate(nextProps: IRightPanelSummaryContainerProps, nextState: IRightPanelSummaryContainerState): boolean {
        if (nextState.isLoading && this.state.isLoading) {
            return false;
        }

        return true;
    }

    private _onNotificationDismiss = (notification: Notification): void => {
        this.props.actionCreator.dismissNotification(notification);
    }

    private _onChange = (): void => {
        this.setState(this._getStateFromStores());
    }

    // public for unit testing
    public _getStateFromStores(): IRightPanelSummaryContainerState {
        const selectedPath = this.props.storesHub.urlParametersStore.path;
        const selectedDiffItem = this._getSelectedDiffItem();
        const repositoryContext = this.props.storesHub.contextStore.getRepositoryContext();
        let linesAdded = 0;
        let linesDeleted = 0;

        if (selectedDiffItem.mpath && selectedDiffItem.opath && selectedDiffItem.mversion && selectedDiffItem.oversion) {
            linesAdded =  this._diffCountStore.getLinesAdded(selectedPath, selectedDiffItem, repositoryContext);
            linesDeleted =  this._diffCountStore.getLinesDeleted(selectedPath, selectedDiffItem, repositoryContext);
        }

        return {
            isLoading: this.props.storesHub.contextStore.isLoading(),
            repositoryContext: repositoryContext,
            notifications: this._getErrorNotifications(),
            selectedPath: selectedPath,
            isDirectory: this._isDirectory(),
            linesAdded: linesAdded,
            linesDeleted: linesDeleted,
        } as IRightPanelSummaryContainerState;
    }

    private _getErrorNotifications(): Notification[] {
        const { notifications } = this.props.storesHub.notificationStore.state;
        return notifications.filter(notification => notification.type === NotificationType.error);
    }

    private _getSelectedDiffItem(): GitDiffItem {
        return {
            mpath: this.props.storesHub.urlParametersStore.mpath,
            opath: this.props.storesHub.urlParametersStore.opath,
            mversion: this.props.storesHub.urlParametersStore.mversion,
            oversion: this.props.storesHub.urlParametersStore.oversion,
        } as GitDiffItem;
    }

    private _isDirectory(): boolean {
        return this.props.storesHub.urlParametersStore.isSummaryAction ||
            this.props.storesHub.urlParametersStore.isDiffParentAction;
    }
}

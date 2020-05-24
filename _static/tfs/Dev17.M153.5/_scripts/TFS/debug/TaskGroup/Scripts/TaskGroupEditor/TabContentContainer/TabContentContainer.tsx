import * as React from "react";
import * as ReactDOM from "react-dom";

import { empty as emptyString } from "VSS/Utils/String";

import { css } from "OfficeFabric/Utilities";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { TabStore, ITabStoreState } from "TaskGroup/Scripts/TaskGroupEditor/TabContentContainer/TabStore";
import { TabActionCreator } from "TaskGroup/Scripts/TaskGroupEditor/TabContentContainer/TabActionCreator";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

import "VSS/LoaderPlugins/Css!TaskGroup/Scripts/TaskGroupEditor/TabContentContainer/TabContentContainer";

export interface ITabContentContainerProps extends IProps {
    tabInstanceId: string;
    fromExtension: boolean;
}

export class TabContentContainer extends Component<ITabContentContainerProps, ITabStoreState>{

    public render() {
        const classNameForExtension: string = this.props.fromExtension ? "task-group-tab-extension" : emptyString;
        return (
            <div className={css("task-group-tab", this.props.cssClass)}>
                {
                    !!this.state.errorMessage &&
                    <MessageBarComponent
                        className={css("task-group-tab-error-message", !!this.state.errorMessage ? "error-content" : null)}
                        messageBarType={MessageBarType.error}
                        onDismiss={this._onErrorBarDismiss}
                    >

                        {this.state.errorMessage}

                    </MessageBarComponent>
                }

                {
                    this.props.fromExtension &&
                    this._getMessageBarComponentForExtensionTaskGroup()
                }

                <div className={css("task-group-tab-content", classNameForExtension)}>
                    {this.props.children}
                </div>

            </div>
        );
    }

    public componentWillMount(): void {
        this._tabActionCreator = ActionCreatorManager.GetActionCreator<TabActionCreator>(TabActionCreator, this.props.tabInstanceId);
        this._tabStore = StoreManager.GetStore<TabStore>(TabStore, this.props.tabInstanceId);
        this.setState(this._tabStore.getState());
        this._tabStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmout(): void {
        this._tabStore.removeChangedListener(this._onStoreChange);
    }

    private _onStoreChange = () => {
        const state = this._tabStore.getState();
        this.setState(state);
    }

    private _onErrorBarDismiss = () => {
        this._tabActionCreator.updateErrorMessage(emptyString);
    }

    private _getMessageBarComponentForExtensionTaskGroup(): JSX.Element {
        let messageBarComponent: JSX.Element;
        messageBarComponent = this.props.fromExtension ?
            <MessageBar
                className={"message-for-extension-task-group"}
                messageBarType={MessageBarType.warning}>
                {Resources.CannotEditTaskGroupFromExtension}
            </MessageBar> : null;
        return messageBarComponent;
    }

    private _tabActionCreator: TabActionCreator;
    private _tabStore: TabStore;
}
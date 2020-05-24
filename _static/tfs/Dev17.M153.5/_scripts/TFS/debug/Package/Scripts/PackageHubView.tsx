/* tslint:disable:variable-name */
import * as React from "react";
import * as ReactDOM from "react-dom";

import { Fabric } from "OfficeFabric/Fabric";
import { Link } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { Component, Props } from "VSS/Flux/Component";

import * as Actions from "Package/Scripts/Actions/Actions";
import * as CreateFeedControllerViewAsync from "Package/Scripts/ControllerViews/CreateFeedControllerView";
import { FeedControllerView } from "Package/Scripts/ControllerViews/FeedControllerView";
import * as PackageControllerViewAsync from "Package/Scripts/ControllerViews/PackageControllerView";
import * as RecycleBinControllerViewAsync from "Package/Scripts/ControllerViews/RecycleBinControllerView";
import * as SettingsControllerViewAsync from "Package/Scripts/ControllerViews/SettingsControllerView";
import * as GeneralDialogAsync from "Package/Scripts/Dialogs/GeneralDialog";
import { FeedStore } from "Package/Scripts/Stores/FeedStore";
import { GlobalState, GlobalStore } from "Package/Scripts/Stores/GlobalStore";
import { PackageStore } from "Package/Scripts/Stores/PackageStore";
import { HubAction } from "Package/Scripts/Types/IHubState";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/PackageHubView";

const AsyncSettingsControllerView = getAsyncLoadedComponent(
    ["Package/Scripts/ControllerViews/SettingsControllerView"],
    (m: typeof SettingsControllerViewAsync) => m.SettingsControllerView
);

const AsyncRecycleBinControllerView = getAsyncLoadedComponent(
    ["Package/Scripts/ControllerViews/RecycleBinControllerView"],
    (m: typeof RecycleBinControllerViewAsync) => m.RecycleBinControllerView
);

const AsyncCreateFeedControllerView = getAsyncLoadedComponent(
    ["Package/Scripts/ControllerViews/CreateFeedControllerView"],
    (m: typeof CreateFeedControllerViewAsync) => m.CreateFeedControllerView
);

const AsyncPackageControllerView = getAsyncLoadedComponent(
    ["Package/Scripts/ControllerViews/PackageControllerView"],
    (m: typeof PackageControllerViewAsync) => m.PackageControllerView
);

const AsyncGeneralDialog = getAsyncLoadedComponent(
    ["Package/Scripts/Dialogs/GeneralDialog"],
    (m: typeof GeneralDialogAsync) => m.GeneralDialog
);
/* tslint:enable:variable-name */

export interface IPackageHubViewProps extends Props {
    globalStore: GlobalStore;
    feedStore: FeedStore;
    packageStore: PackageStore;
}

export class PackageHubView extends Component<IPackageHubViewProps, GlobalState> {
    public static render(container: HTMLElement, props: IPackageHubViewProps): void {
        ReactDOM.render(<PackageHubView {...props} />, container);
    }

    public render(): JSX.Element {
        return (
            <Fabric className="package-hub-main">
                {this.state.error != null &&
                    this.state.error.message != null && (
                        <MessageBar
                            messageBarType={this.state.error.isCritical ? MessageBarType.error : MessageBarType.warning}
                            onDismiss={() => this._onDismissError()}
                            isMultiline={false}
                        >
                            <span>{this.state.error.message}</span>
                            {this.state.error.link &&
                                this.state.error.linkText && (
                                    <Link className="error-button" onClick={() => this.state.error.link()}>
                                        {this.state.error.linkText}
                                    </Link>
                                )}
                        </MessageBar>
                    )}
                {this.state.dialogProps && <AsyncGeneralDialog {...this.state.dialogProps} />}
                {this.state.action === HubAction.Feed && <FeedControllerView store={this.props.feedStore} />}
                {this.state.action === HubAction.Package && (
                    <AsyncPackageControllerView store={this.props.packageStore} isRecycleBin={false} isPackageDependencySelected={false} />
                )}
                {this.state.action === HubAction.RecycleBin && (
                    <AsyncRecycleBinControllerView store={this.props.feedStore} />
                )}
                {this.state.action === HubAction.RecycleBinPackage && (
                    <AsyncPackageControllerView store={this.props.packageStore} isRecycleBin={true} isPackageDependencySelected={false} />
                )}
                {this.state.action === HubAction.Settings && (
                    <AsyncSettingsControllerView store={this.props.feedStore} />
                )}
                {this.state.action === HubAction.CreateFeed && (
                    <AsyncCreateFeedControllerView getSelectedFeed={() => this.props.feedStore.getCurrentFeed()} />
                )}
                {this.state.action === HubAction.PackageDependencySelected && (
                    <AsyncPackageControllerView store={this.props.packageStore} isRecycleBin={false} isPackageDependencySelected={true} />
                )}
            </Fabric>
        );
    }

    public getStore(): GlobalStore {
        return this.props.globalStore;
    }

    public getState(): GlobalState {
        return this.getStore().getGlobalState();
    }

    private _onDismissError(): void {
        Actions.ErrorDismissed.invoke({});
    }
}

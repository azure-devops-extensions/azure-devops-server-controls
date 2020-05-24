/// <reference types="react" />
/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!Notifications";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ComponentBase from "VSS/Flux/Component";

import { autobind } from "OfficeFabric/Utilities";
import { Toggle } from "OfficeFabric/Toggle";
import { DefaultGroupDeliveryPreference } from "Notifications/Contracts";
import { SubscriptionStore } from "NotificationsUI/Scripts/Stores/SubscriptionStore";
import { Creator } from "NotificationsUI/Scripts/Actions/SubscriptionActions";
import * as StringUtils from "VSS/Utils/String";
import * as NotifResources from "NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI";

export interface INotificationAdminSettingsProps extends ComponentBase.Props {
    subscriptionsStore: SubscriptionStore;
}

export interface INotificationAdminSettingsState {
    defaultGroupDeliveryPreference: DefaultGroupDeliveryPreference;
}

export class NotificationAdminSettings extends ComponentBase.Component<INotificationAdminSettingsProps, INotificationAdminSettingsState> {

    constructor(props: INotificationAdminSettingsProps) {
        super(props);

        this.state = {
            defaultGroupDeliveryPreference: props.subscriptionsStore.getAdminSettings().defaultGroupDeliveryPreference
        };
    }

    public componentDidMount(): void {
        this.props.subscriptionsStore.addChangedListener(this._onSubscriptionStoreUpdated);
    }

    public componentWillUnmount(): void {
        this.props.subscriptionsStore.removeChangedListener(this._onSubscriptionStoreUpdated);
    }

    public render(): JSX.Element {
        return <div className="notification-admin-settings-options">
            <Toggle
                checked={this.state.defaultGroupDeliveryPreference === DefaultGroupDeliveryPreference.EachMember}
                label={NotifResources.DefaultGroupDeliveryLabel}
                onAriaLabel={StringUtils.format(NotifResources.DefaultGroupDeliveryToggleLabel, NotifResources.DefaultGroupDeliveryOnText)}
                offAriaLabel={StringUtils.format(NotifResources.DefaultGroupDeliveryToggleLabel, NotifResources.DefaultGroupDeliveryOffText)}
                onText={NotifResources.DefaultGroupDeliveryOnText}
                offText={NotifResources.DefaultGroupDeliveryOffText}
                disabled={!this.props.subscriptionsStore.hasManagePermission()}
                onClick={this._onToggleDeliveryPreference} />
        </div>;
    }

    @autobind
    private _onToggleDeliveryPreference() {

        const newDeliveryPreference = this.state.defaultGroupDeliveryPreference === DefaultGroupDeliveryPreference.EachMember ? 
            DefaultGroupDeliveryPreference.NoDelivery :
            DefaultGroupDeliveryPreference.EachMember;

        Creator.setAdminDefaultGroupDeliveryPreference(newDeliveryPreference);
    }

    @autobind
    private _onSubscriptionStoreUpdated() {
        this.setState({
            defaultGroupDeliveryPreference: this.props.subscriptionsStore.getAdminSettings().defaultGroupDeliveryPreference
        });
    }
}
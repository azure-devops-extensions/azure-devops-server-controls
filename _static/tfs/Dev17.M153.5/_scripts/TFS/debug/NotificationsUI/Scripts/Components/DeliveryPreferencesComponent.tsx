/// <reference types="react" />

import "VSS/LoaderPlugins/Css!Notifications";

// React
import * as React from "react";
import { Props, State } from "VSS/Flux/Component";

// OfficeFabric
import { Panel, PanelType } from "OfficeFabric/Panel";
import { TextField } from "OfficeFabric/TextField";
import { Label } from "OfficeFabric/Label";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { ChoiceGroup } from "OfficeFabric/ChoiceGroup";
import { IChoiceGroupOption } from "OfficeFabric/components/ChoiceGroup/ChoiceGroup.types";
import { autobind, IRenderFunction } from "OfficeFabric/Utilities";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

// Notifications UI
import * as NotificationContracts from "Notifications/Contracts";
import * as SubscriptionActions from "NotificationsUI/Scripts/Actions/SubscriptionActions";
import * as NotificationResources from "NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI";
import { SubscriptionStore } from "NotificationsUI/Scripts/Stores/SubscriptionStore";
import { validateEmail } from "NotificationsUI/Scripts/Util";

// VSS
import * as UtilsString from "VSS/Utils/String";
import { IdentityRef } from "VSS/WebApi/Contracts";
import * as StringUtils from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

export interface IDeliveryPreferencesPanelComponentProps extends Props {
    subscriptionStore: SubscriptionStore;
    onClose: () => void;
}

export interface IDeliveryPreferencesPanelComponentState {
    showPanel?: boolean;
    options: IChoiceGroupOption[];
    message?: string;
    messageType?: MessageBarType;
}

export class DeliveryPreferencesPanelComponent extends React.Component<IDeliveryPreferencesPanelComponentProps, IDeliveryPreferencesPanelComponentState> {
    private _subscriberIdentity: IdentityRef;
    private _subscriber: NotificationContracts.NotificationSubscriber;

    constructor(props: IDeliveryPreferencesPanelComponentProps) {
        super(props);

        this._subscriberIdentity= this.props.subscriptionStore.getCurrentSubscriber(),
        this._subscriber= $.extend(true, {}, this.props.subscriptionStore.getNotificationSubscriber())

        let options = this._getDeliveryPreferenceOptions();
        let message: string = null;
        let messageType = MessageBarType.info;

        if ((this._subscriber.flags & NotificationContracts.SubscriberFlags.IsGroup) === 0) {
            message = NotificationResources.DeliveryPreferenceIndividualUserWarning;
        }
        else if ((this._subscriber.flags & NotificationContracts.SubscriberFlags.DeliveryPreferencesEditable) === 0) {
            message = NotificationResources.DeliveryPreferenceAADGroupWarning;
        }

        this.state = {
            showPanel: true,
            options,
            message,
            messageType
        };
    }

    public componentDidMount() {
        this.props.subscriptionStore.addChangedListener(this._onSubscriptionStoreUpdated);
        this.props.subscriptionStore.addListener("DeliveryPreferenceSaved", this._onDeliveryPreferenceSaved);
        this.props.subscriptionStore.addListener("DeliveryPreferenceSaveFailed", this._onDeliveryPreferenceSaveFailed);
    }

    public componentWillUnmount() {
        this.props.subscriptionStore.removeChangedListener(this._onSubscriptionStoreUpdated);
        this.props.subscriptionStore.removeListener("DeliveryPreferenceSaved", this._onDeliveryPreferenceSaved);
        this.props.subscriptionStore.removeListener("DeliveryPreferenceSaveFailed", this._onDeliveryPreferenceSaveFailed);
    }

    public render(): JSX.Element {

        return <Panel
            isOpen={ this.props.subscriptionStore.getDeliveryPreferencesPanelState() }
            isLightDismiss={true}
            headerClassName="delivery-preferences-panel-header"
            className="delivery-preferences-panel"
            type={PanelType.medium}
            headerText={ NotificationResources.DeliveryPreferencesPanelHeader }
            closeButtonAriaLabel={NotificationResources.CloseButtonLabel}
            onDismiss={ this._closePanel }
            >
            <div className="delivery-preferences-container">
                {
                    this.state.message ?
                        <MessageBar
                            className="delivery-preferences-message"
                            messageBarType={this.state.messageType}>{this.state.message}</MessageBar> : null
                }
                <div>
                    <ChoiceGroup
                        label={ UtilsString.format(NotificationResources.DeliveryPreferencesTitle, this._subscriberIdentity.displayName) }
                        options={ this.state.options }
                        onChange={ this._onDeliveryPreferencesChanged }/>
                </div>
                <div className="buttons-container">
                    <PrimaryButton
                        className="save-button"
                        disabled={this.state.options.length < 2 || this.state.options.every(o => o.disabled)}
                        onClick={() => this._updateDeliveryPreferences()} >{NotificationResources.SubscriptionDialogSaveButtonText}
                    </PrimaryButton>
                    <DefaultButton onClick={ () => this._closePanel() } >{NotificationResources.SubscriptionDialogCancelButtonText}</DefaultButton>
                </div>
            </div>
        </Panel>;
    }

    @autobind
    private _validateEmail(value: string): string {
        const isPreferredEmailDelivery = this._subscriber.deliveryPreference === NotificationContracts.NotificationSubscriberDeliveryPreference.PreferredEmailAddress;
        // if preferred email is not selected then skip validation
        if (!isPreferredEmailDelivery) {
            return StringUtils.empty;
        }

        return validateEmail(value, this.props.subscriptionStore.getAsciiOnlyAddresses());
    }

    @autobind
    private _onPreferredEmailChanged(text: string) {
        this._subscriber.preferredEmailAddress = text;
    }

    @autobind
    private _onSubscriptionStoreUpdated() {
        this.setState({
            options: this._getDeliveryPreferenceOptions()
        });
    }

    @autobind
    private _onDeliveryPreferencesChanged(ev: React.FormEvent<HTMLElement | HTMLInputElement>, option: IChoiceGroupOption) {
        let deliveryPreference: NotificationContracts.NotificationSubscriberDeliveryPreference = NotificationContracts.NotificationSubscriberDeliveryPreference.PreferredEmailAddress;

        if (option.key === NotificationContracts.NotificationSubscriberDeliveryPreference.EachMember.toString()) {
            deliveryPreference = NotificationContracts.NotificationSubscriberDeliveryPreference.EachMember;
        }
        else if (option.key === NotificationContracts.NotificationSubscriberDeliveryPreference.NoDelivery.toString()) {
            deliveryPreference = NotificationContracts.NotificationSubscriberDeliveryPreference.NoDelivery;
        }

        this._subscriber.deliveryPreference = deliveryPreference;
        SubscriptionActions.Creator.subscriberDeliveryPreferencesUpdated();
    }

    private _updateDeliveryPreferences() {
        if(this._subscriber.deliveryPreference !== NotificationContracts.NotificationSubscriberDeliveryPreference.PreferredEmailAddress) {
            this._subscriber.preferredEmailAddress = null;
        }
        SubscriptionActions.Creator.editSubscriberDeliveryPreferences(this._subscriber);
    }

    @autobind
    private _getDeliveryPreferenceOptions(): IChoiceGroupOption[] {
        let isIndividualSubscriber = (this._subscriber.flags & NotificationContracts.SubscriberFlags.IsGroup) === 0;
        let deliveryPreferenceOptions: IChoiceGroupOption[] = [];
        let isEachMemberDelivery = this._subscriber.deliveryPreference === NotificationContracts.NotificationSubscriberDeliveryPreference.EachMember;
        let isPreferredEmailDelivery = this._subscriber.deliveryPreference === NotificationContracts.NotificationSubscriberDeliveryPreference.PreferredEmailAddress;

        if (!isEachMemberDelivery && !isPreferredEmailDelivery) {
            this._subscriber.deliveryPreference = NotificationContracts.NotificationSubscriberDeliveryPreference.NoDelivery;
        }

        if ((this._subscriber.flags & NotificationContracts.SubscriberFlags.SupportsPreferredEmailAddressDelivery) === NotificationContracts.SubscriberFlags.SupportsPreferredEmailAddressDelivery) {
            deliveryPreferenceOptions.push({
                key: NotificationContracts.NotificationSubscriberDeliveryPreference.PreferredEmailAddress.toString(),
                text: NotificationResources.PreferredEmailDeliveryLabelText,
                checked: isPreferredEmailDelivery,
                disabled: isIndividualSubscriber,
                onRenderField: (props, render) => {
                    let preferredEmailControl: JSX.Element = <TextField
                        className="preferred-email-text-field"
                        defaultValue={this._subscriber.preferredEmailAddress}
                        onChanged={this._onPreferredEmailChanged}
                        onGetErrorMessage={this._validateEmail}
                        disabled={!isPreferredEmailDelivery}
                        readOnly={isIndividualSubscriber}
                        spellCheck={false}
                    />;

                    return <div className="preferred-email-container"> <span className="preferred-email-radio-container">{ render(props) } </span><span>{preferredEmailControl}</span></div>;
                }
            } as IChoiceGroupOption);
        }

        if ((this._subscriber.flags & NotificationContracts.SubscriberFlags.SupportsEachMemberDelivery) === NotificationContracts.SubscriberFlags.SupportsEachMemberDelivery) {
            deliveryPreferenceOptions.push({
                key: NotificationContracts.NotificationSubscriberDeliveryPreference.EachMember.toString(),
                text: NotificationResources.EachMemberDeliveryLabelText,
                checked: isEachMemberDelivery
            } as IChoiceGroupOption);
        }

        if ((this._subscriber.flags & NotificationContracts.SubscriberFlags.SupportsNoDelivery) === NotificationContracts.SubscriberFlags.SupportsNoDelivery || isIndividualSubscriber) {
            deliveryPreferenceOptions.push({
                key: NotificationContracts.NotificationSubscriberDeliveryPreference.NoDelivery.toString(),
                text: NotificationResources.NoDeliveryLabelText,
                checked: !isPreferredEmailDelivery && !isEachMemberDelivery,
                disabled: isIndividualSubscriber
            } as IChoiceGroupOption);
        }

        return deliveryPreferenceOptions;
    }

    @autobind
    private _onDeliveryPreferenceSaved() {
        this.setState({ 
            showPanel: this.props.subscriptionStore.getDeliveryPreferencesPanelState()
        });
    }

    @autobind
    private _onDeliveryPreferenceSaveFailed(error: Error) {
        this.setState({
            message: VSS.getErrorMessage(error),
            messageType: MessageBarType.error
        });
    }

    @autobind
    private _closePanel() {
        this._subscriber = $.extend(true, {}, this.props.subscriptionStore.getNotificationSubscriber());
        this.props.subscriptionStore.setDeliveryPreferencesPanelState(false);
        this.setState({ 
            showPanel: this.props.subscriptionStore.getDeliveryPreferencesPanelState()
        });

        if (this.props.onClose) {
            this.props.onClose();
        }
    }
}

/// <reference types="react" />

import React = require("react");
import * as ReactDOM from "react-dom";
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Component_Base = require("VSS/Flux/Component");
import Context = require("VSS/Context");
import Navigation_Services = require("VSS/Navigation/Services");
import Performance = require("VSS/Performance");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import * as Service from "VSS/Service";
import * as Contribution_Services from "VSS/Contributions/Services";
import { Hub } from "VSSUI/Hub";
import { IHubBreadcrumbItem, HubHeader } from "VSSUI/HubHeader";
import { VssIconType } from "VSSUI/VssIcon";
import { IPivotBarAction, PivotBarItem  } from 'VSSUI/PivotBar';
import { autobind } from "OfficeFabric/Utilities";

import { ReactRootComponent } from "VSSPreview/Controls/ReactRootComponent";
import { ContributablePivotItemProvider } from "VSSPreview/Providers/ContributablePivotItemProvider";
import { getLWPModule } from 'VSS/LWP';
import NotifResources = require("NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI");
import Stores_GenericError = require("NotificationsUI/Scripts/Stores/GenericError");
import { StatisticsTab } from "NotificationsUI/Scripts/Components/StatisticsTab";
import { SubscriptionsOverviewHubComponent } from "NotificationsUI/Scripts/Components/SubscriptionsOverview";
import { NotificationAdminSettings } from "NotificationsUI/Scripts/Components/NotificationAdminSettings";
import { DeliveryPreferencesPanelComponent } from "NotificationsUI/Scripts/Components/DeliveryPreferencesComponent";
import { IAdminNotificationHubViewState, AdminNotificationHubViewState, AdminNotificationPivotNames } from "NotificationsUI/Scripts/AdminNotificationHubViewState";
import { AdminSubscriptionStore } from "NotificationsUI/Scripts/Stores/AdminSubscriptionStore";
import * as Subscription_Actions from "NotificationsUI/Scripts/Actions/SubscriptionActions";
import * as NotificationContracts from "Notifications/Contracts";

export interface Props extends Component_Base.Props {
    pageContext: any;
}

export interface State extends Component_Base.State {
    showDeliveryPreferencesDialog?: boolean;
}

export class AdminNotificationsHub extends Component_Base.Component<Props, State> {

    private _providersSubscriptionsData: { [key: string]: NotificationContracts.NotificationSubscriptionsViewData };
    private _subscriptionsStore: AdminSubscriptionStore;
    private _hubViewState: IAdminNotificationHubViewState;
    private _pivotProvider: ContributablePivotItemProvider<any>;

    constructor(props: Props) {
        super(props);

        this.state = {};

        this._hubViewState = new AdminNotificationHubViewState({
            defaultPivot: AdminNotificationPivotNames.defaultSubscriptions
        });

        this._providersSubscriptionsData = Service.getService(Contribution_Services.WebPageDataService).getPageDataByDataType<NotificationContracts.NotificationSubscriptionsViewData>("everyone-notifications-sdk-subscriptions-view-data", NotificationContracts.TypeInfo.NotificationSubscriptionsViewData);
        this._subscriptionsStore = new AdminSubscriptionStore(this._hubViewState, this._providersSubscriptionsData);
    }
  
    public render(): JSX.Element {

        let subscriptionData = this._subscriptionsStore.getData();

        if (!subscriptionData) {
            let error = this._subscriptionsStore.getError();
            if (error) {
                return <div className="list-error">{error.message}</div>;
            }
        }

        if (!this._pivotProvider) {
            const x = getLWPModule('VSS/Features/Frame/ContributedPivotBarItemProvider');
            this._pivotProvider = new x.ContributedPivotBarItemProvider({ pageContext: this.props.pageContext, tabGroupIds: ["ms.vss-notifications-web.notifications-collection-admin-pivot.pivotbar"] });
            // this._pivotProvider = new ContributablePivotItemProvider(["ms.vss-notifications-web.notifications-collection-admin-pivot.pivotbar"], {});
        }        

        return (
            <ReactRootComponent pageContext={this.props.pageContext}>
                <Hub
                    hubViewState={this._hubViewState}
                    commands={this._getCommands()}
                    pivotProviders={[this._pivotProvider]}>

                    <HubHeader
                        breadcrumbItems={this._getHeaderItems()}
                        maxBreadcrumbItemWidth="500px" />

                    <PivotBarItem name={NotifResources.DefaultSubscriptionsTabTitle} itemKey={AdminNotificationPivotNames.defaultSubscriptions} className='detailsListPadding absolute-fill'>
                        <SubscriptionsOverviewHubComponent
                            isAdminHub={true}
                            data={subscriptionData}
                            hasGroups={true}
                            subscriptionsStore={this._subscriptionsStore}
                            hideNotifiesColumn={true}
                            actionsColumnKey="desc" />
                    </PivotBarItem>

                    <PivotBarItem name={NotifResources.SubscribersTabTitle} itemKey={AdminNotificationPivotNames.subscribers} className='detailsListPadding absolute-fill'>
                        <SubscriptionsOverviewHubComponent
                            isAdminHub={true}
                            data={subscriptionData}
                            showIdentitySelector={true}
                            identityPickerDefaultId={this._hubViewState.identityId.value}
                            hasGroups={true}
                            subscriptionsStore={this._subscriptionsStore}
                            actionsColumnKey="desc" />
                    </PivotBarItem>

                    <PivotBarItem name={NotifResources.Statistics} itemKey={AdminNotificationPivotNames.statistics} className='detailsListPadding absolute-fill'>
                        <StatisticsTab
                            data={subscriptionData}
                            subscriptionsStore={this._subscriptionsStore} />
                    </PivotBarItem>

                    <PivotBarItem name={NotifResources.Settings} itemKey={AdminNotificationPivotNames.settings} className='detailsListPadding absolute-fill'>
                        <NotificationAdminSettings
                            subscriptionsStore={this._subscriptionsStore} />
                    </PivotBarItem>

                </Hub>

                {this.state.showDeliveryPreferencesDialog ?
                    <DeliveryPreferencesPanelComponent
                        subscriptionStore={this._subscriptionsStore}
                        onClose={() => {
                            this.setState({ showDeliveryPreferencesDialog: false });
                        }}
                    />
                    : null
                }
            </ReactRootComponent>
        );
    }

    public componentDidMount(): void {
        this._subscriptionsStore.addChangedListener(this.onSubscriptionStoreChanged);

        Performance.getScenarioManager().recordPageLoadScenario("Open ALM", "Notifications.OverviewHub.Load");
    }

    public componentWillUnmount(): void {
        this._subscriptionsStore.removeChangedListener(this.onSubscriptionStoreChanged);
        this._subscriptionsStore.removeListeners();
        this._hubViewState.dispose();
    }

    @autobind
    private onSubscriptionStoreChanged(): void {
        this.forceUpdate();
    }

    private _setWindowTitle(title: string): void {
        var titleFormat = Context.getPageContext().webAccessConfiguration.isHosted ? VSS_Resources_Platform.PageTitleWithContent_Hosted : VSS_Resources_Platform.PageTitleWithContent;
        document.title = Utils_String.format(titleFormat, title || "");
    }

    private _getHeaderItems(): IHubBreadcrumbItem[] {
        return [{
            key: "notificationSettings",
            text: NotifResources.UserHubHeaderText,
            leftIconProps: { iconName: "Ringer" }
        }] as IHubBreadcrumbItem[];
    }

    private _getCommands(): IPivotBarAction[] {
        const commands: IPivotBarAction[] = [];
        const noSubscriberSelected = !this._subscriptionsStore.getCurrentSubscriber();
        if (Utils_String.equals(AdminNotificationPivotNames.subscribers, this._hubViewState.selectedPivot.value, true)) {
            let newAction: IPivotBarAction = {
                key: "new-subscription",
                name: NotifResources.NewSubscriptionDialogTitle,
                important: true,
                iconProps: { iconName: "CalculatorAddition", iconType: VssIconType.fabric },
                onClick: this._onNewClick,
                disabled: noSubscriberSelected
            }
            commands.push(newAction);

            if (this._hubViewState.identityId.value) {
                let deliveryPreferencesAction: IPivotBarAction = {
                    key: "deliverySettings",
                    name: NotifResources.DeliveryPreferencesPanelHeader,
                    important: true,
                    iconProps: { iconName: "Settings", iconType: VssIconType.fabric },
                    onClick: () => {
                        this._subscriptionsStore.setDeliveryPreferencesPanelState(true);
                        this.setState({ showDeliveryPreferencesDialog: true });
                    },
                }
                commands.push(deliveryPreferencesAction);
            }
        }
        const helpAction: IPivotBarAction = {
            key: "help",
            name: NotifResources.HelpCommandText,
            important: true,
            iconProps: { iconName: "Unknown", iconType: VssIconType.fabric },
            href: "https://aka.ms/vsts-notifications-admin",
            target: "_blank",
        };
        commands.push(helpAction);

        return commands;
    }

    private _onNewClick() {
        Subscription_Actions.Creator.createSubscription()
    }

}

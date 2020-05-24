/// <reference types="react" />
/// <reference types="react-dom" />

// CSS
import "VSS/LoaderPlugins/Css!Notifications";

// React
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ComponentBase from "VSS/Flux/Component";

// VSS
import * as ContributionServices from "VSS/Contributions/Services";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import * as NavigationServices from "VSS/Navigation/Services";
import * as Performance from "VSS/Performance";
import * as SDK from "VSS/SDK/Shim";
import * as Service from "VSS/Service";
import { IVssHubViewState, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { Hub } from "VSSUI/Hub";
import { IHubBreadcrumbItem, HubHeader } from "VSSUI/HubHeader";
import { IPivotBarAction, PivotBarItem  } from 'VSSUI/PivotBar';
import { VssIconType } from "VSSUI/VssIcon";

// Notifications
import * as NotificationContracts from "Notifications/Contracts";
import * as SubscriptionActions from "NotificationsUI/Scripts/Actions/SubscriptionActions";
import * as SubscriptionsOverview from "NotificationsUI/Scripts/Components/SubscriptionsOverview";
import * as NotificationResources from "NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI";
import { SubscriptionStore } from "NotificationsUI/Scripts/Stores/SubscriptionStore";

class NotificationsHubComponent extends ComponentBase.Component<any, ComponentBase.State> {

    private _initialSubscriptionId: string;
    private _initialSubscriptionPublisher: string;
    private _subscriptionStore: SubscriptionStore;
    private _subscriptions: NotificationContracts.NotificationSubscription[];
    private _updateStateFromStoreDelegate: { (subscription: NotificationContracts.NotificationSubscription): void };
    private _hubViewState: IVssHubViewState;
    private _verticalNav: boolean;

    constructor(props: ComponentBase.Props) {
        super(props);

        const dataSvc = Service.getService(ContributionServices.WebPageDataService);
        const subscriptionsViewData = dataSvc.getPageDataByDataType<NotificationContracts.NotificationSubscriptionsViewData>("notifications-sdk-subscriptions-view-data", NotificationContracts.TypeInfo.NotificationSubscriptionsViewData);

        this._subscriptionStore = new SubscriptionStore(subscriptionsViewData);

        this._subscriptions = this._subscriptionStore.getSubscriptions();

        // Get the target subscription id, if any, from url parameters
        var navigationState = NavigationServices.getHistoryService().getCurrentState();
        this._initialSubscriptionId = navigationState["subscriptionId"];
        this._initialSubscriptionPublisher = navigationState["publisherId"];
        var subscriptionKey: SubscriptionActions.NotificationSubscriptionKey = { subscriptionId: this._initialSubscriptionId, publisherId: this._initialSubscriptionPublisher };
        let navigationAction = navigationState["action"];

        // Check if the user is trying to unsubscribe from the target subscription.
        if (navigationAction === "unsubscribe") {
            SubscriptionActions.UnsubscribeSubscription.invoke(subscriptionKey);
        }
        else if (this._initialSubscriptionId && this._initialSubscriptionPublisher) {
            const subs = this._subscriptionStore.getSubscriptionFromId(this._initialSubscriptionId, this._initialSubscriptionPublisher);
            const subscriber = this._subscriptionStore.getCurrentSubscriber();
            if (subs && subscriber && subs.subscriber.id === subscriber.id) {
                SubscriptionActions.EditSubscription.invoke(subscriptionKey);
            } else {
                SubscriptionActions.OpenSubscription.invoke(subscriptionKey);
            }
        }

        this._hubViewState = new VssHubViewState();

        const featureManagementService = Service.getService(FeatureManagementService);
        this._verticalNav = featureManagementService.isFeatureEnabled("ms.vss-tfs-web.vertical-navigation");
    }

    public render(): JSX.Element {
        return (
            <Hub
                hubViewState={this._hubViewState}
                commands={this._getCommands()} >
                <HubHeader
                    breadcrumbItems={this._verticalNav ? undefined : this._getHeaderItems()}
                    maxBreadcrumbItemWidth="500px"
                    title={this._verticalNav ? NotificationResources.UserHubHeaderText : undefined}
                />
                <PivotBarItem name="contents" itemKey="contents" className='detailsListPadding absolute-fill'>
                    <SubscriptionsOverview.SubscriptionsOverviewHubComponent
                        actionsColumnKey={"desc"}
                        hasGroups={true}
                        initialSelectedSubscriptionId={this._initialSubscriptionId}
                        initialSelectedSubscriptionPublisher={this._initialSubscriptionPublisher}
                        subscriptionsStore={this._subscriptionStore}
                        myHub={true}
                        showEmptyMessage={true}
                    />
                </PivotBarItem>
            </Hub>
        );
    }

    public componentDidMount(): void {
        Performance.getScenarioManager().recordPageLoadScenario("Open ALM", "Notifications.UserHub.Load");
        this._updateStateFromStoreDelegate = this._updateStateFromStore.bind(this);
        this._subscriptionStore.addChangedListener(this._updateStateFromStoreDelegate);
    }

    public componentWillUnmount() {
        this._subscriptionStore.removeChangedListener(this._updateStateFromStoreDelegate);
        this._subscriptionStore.removeListeners();
    }

    private _updateStateFromStore() {
        this.setState({
            subscriptions: this._subscriptionStore.getSubscriptions()
        });
    }

    private _getCommands(): IPivotBarAction[] {
        let commands: IPivotBarAction[] = [];
        let newAction: IPivotBarAction = {
            key: "new-subscription",
            name: NotificationResources.NewSubscriptionDialogTitle,
            important: true,
            iconProps: { iconName: "CalculatorAddition", iconType: VssIconType.fabric },
            onClick: this._onNewClick
        }
        commands.push(newAction);

        const helpAction: IPivotBarAction = {
            key: "help",
            name: NotificationResources.HelpCommandText,
            important: true,
            iconProps: { iconName: "Unknown", iconType: VssIconType.fabric },
            href: "https://aka.ms/vstsmanagenotifications",
            target: "_blank",
        };
        commands.push(helpAction);

        return commands;
    }

    private _onNewClick() {
        SubscriptionActions.Creator.createSubscription()
    }

    private _getHeaderItems(): IHubBreadcrumbItem[] {
        return [{
            key: "notificationSettings",
            text: NotificationResources.UserHubHeaderText,
            leftIconProps: { iconName: "Ringer" }
        },
            {
                key: "me",
                text: NotificationResources.UserHubSubHeaderText,
            }] as IHubBreadcrumbItem[];
    }
}

SDK.registerContent("userNotifications.managementHub", (context) => {
    Performance.getScenarioManager().split("notifications.userHub.start");

    ReactDOM.render(
        <NotificationsHubComponent />,
        context.container);

    const disposable = {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };

    return disposable;
});

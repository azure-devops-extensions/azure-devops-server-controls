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
import { Hub } from "VSSUI/Hub";
import { IHubBreadcrumbItem, HubHeader } from "VSSUI/HubHeader";
import { IVssHubViewState, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { VssIconType } from "VSSUI/VssIcon";
import { IPivotBarAction, PivotBarItem } from 'VSSUI/PivotBar';

// Notifications
import * as NotificationContracts from "Notifications/Contracts";
import * as NotificationResources from "NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI";
import * as SubscriptionActions from "NotificationsUI/Scripts/Actions/SubscriptionActions";
import { SubscriptionsOverviewHubComponent } from "NotificationsUI/Scripts/Components/SubscriptionsOverview";
import { SubscriptionStore } from "NotificationsUI/Scripts/Stores/SubscriptionStore";
import { DeliveryPreferencesPanelComponent } from "NotificationsUI/Scripts/Components/DeliveryPreferencesComponent";

interface INotificationsHubComponentState {
    showDeliveryPreferencesDialog?: boolean;
}

class NotificationsHubComponent extends ComponentBase.Component<any, INotificationsHubComponentState> {

    private _initialSubscriptionId: string;
    private _initialSubscriptionPublisher: string;
    private _subscriptionStore: SubscriptionStore;
    private _updateStateFromStoreDelegate: { (subscription: NotificationContracts.NotificationSubscription): void };
    private _hubViewState: IVssHubViewState;
    private _verticalNav: boolean;

    constructor(props: ComponentBase.Props) {
        super(props);

        this.state = {};

        const dataSvc = Service.getService(ContributionServices.WebPageDataService);
        const subscriptionsViewData = dataSvc.getPageDataByDataType<NotificationContracts.NotificationSubscriptionsViewData>("notifications-sdk-subscriptions-view-data", NotificationContracts.TypeInfo.NotificationSubscriptionsViewData);
        this._subscriptionStore = new SubscriptionStore(subscriptionsViewData);

        // Get the target subscription id, if any, from url parameters
        var navigationState = NavigationServices.getHistoryService().getCurrentState();
        this._initialSubscriptionId = navigationState["subscriptionId"];
        this._initialSubscriptionPublisher = navigationState["publisherId"];
        var subscriptionKey: SubscriptionActions.NotificationSubscriptionKey = { subscriptionId: this._initialSubscriptionId, publisherId: this._initialSubscriptionPublisher };

        if (this._initialSubscriptionId) {
            SubscriptionActions.OpenSubscription.invoke(subscriptionKey);
        }

        this._hubViewState = new VssHubViewState();

        const featureManagementService = Service.getService(FeatureManagementService);
        this._verticalNav = featureManagementService.isFeatureEnabled("ms.vss-tfs-web.vertical-navigation");
    }

    public render(): React.ReactNode {
        return [
            <Hub
                key="hub"
                hubViewState={this._hubViewState}
                commands={this._getCommands()}
            >
                <HubHeader
                    breadcrumbItems={this._verticalNav ? undefined : this._getHeaderItems()}
                    maxBreadcrumbItemWidth="500px"
                    title={this._verticalNav ? NotificationResources.UserHubHeaderText : undefined}
                />
                <PivotBarItem name="contents" itemKey="contents" className='detailsListPadding absolute-fill'>
                    <SubscriptionsOverviewHubComponent
                        actionsColumnKey={"desc"}
                        hasGroups={true}
                        initialSelectedSubscriptionId={this._initialSubscriptionId}
                        initialSelectedSubscriptionPublisher={this._initialSubscriptionPublisher}
                        subscriptionsStore={this._subscriptionStore}
                        showEmptyMessage={true}
                    />
                </PivotBarItem>
            </Hub>,
            this.state.showDeliveryPreferencesDialog ? (
                <DeliveryPreferencesPanelComponent
                    key="deliveryPreferences"
                    subscriptionStore={this._subscriptionStore}
                    onClose={() => {
                        this.setState({ showDeliveryPreferencesDialog: false });
                    }}
                />
            ) : null,
        ];
    }

    public componentDidMount(): void {
        Performance.getScenarioManager().recordPageLoadScenario("Open ALM", "Notifications.TeamHub.Load");
        this._updateStateFromStoreDelegate = this._updateStateFromStore.bind(this);
        this._subscriptionStore.addChangedListener(this._updateStateFromStoreDelegate);
    }

    public componentWillUnmount() {
        this._subscriptionStore.removeChangedListener(this._updateStateFromStoreDelegate);
        this._subscriptionStore.removeListeners();
    }

    private _updateStateFromStore() {
        this.forceUpdate();
    }

    private _getHeaderItems(): IHubBreadcrumbItem[] {
        let teamName = this._subscriptionStore.getCurrentSubscriber().displayName;
        // remove the scope from the team name Ex Project1\Project1 Team will be display as "Project1 Team"
        teamName = teamName.slice(teamName.lastIndexOf('\\') + 1);
        return [{
            key: "notificationSettings",
            text: NotificationResources.UserHubHeaderText,
            leftIconProps: { iconName: "Ringer" }
        },
            {
                key: "teamName",
                text: teamName,
            }] as IHubBreadcrumbItem[];
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

        if (this._subscriptionStore.getNotificationSubscriber()) {
            const deliveryPreferencesAction: IPivotBarAction = {
                key: "deliverySettings",
                name: NotificationResources.DeliveryPreferencesPanelHeader,
                important: true,
                iconProps: { iconName: "Settings", iconType: VssIconType.fabric },
                onClick: () => {
                    this._subscriptionStore.setDeliveryPreferencesPanelState(true);
                    this.setState({ showDeliveryPreferencesDialog: true });
                },
            };
            commands.push(deliveryPreferencesAction);
        }

        const helpAction: IPivotBarAction = {
            key: "help",
            name: NotificationResources.HelpCommandText,
            important: true,
            iconProps: { iconName: "Unknown", iconType: VssIconType.fabric },
            href: "https://aka.ms/vststeamnotifications",
            target: "_blank",
        };
        commands.push(helpAction);

        return commands;
    }

    private _onNewClick() {
        SubscriptionActions.Creator.createSubscription()
    }

}

SDK.registerContent("teamNotifications.managementHub", (context) => {
    Performance.getScenarioManager().split("notifications.teamHub.start");

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

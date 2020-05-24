import * as Q from "q";
import Contribution_Services = require("VSS/Contributions/Services");
import * as NotificationContracts from "Notifications/Contracts";
import * as NotificationResources from "NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI";
import * as Service from "VSS/Service";
import * as StringUtils from "VSS/Utils/String";
import * as Subscription_Actions from "NotificationsUI/Scripts/Actions/SubscriptionActions";
import * as VSS from "VSS/VSS";

import { HubViewStateEventNames } from 'VSSUI/Utilities/HubViewState';
import { IdentityRef } from "VSS/WebApi/Contracts";
import { INotificationIdentity, SubscriptionsPayload } from "NotificationsUI/Scripts/UIContracts";
import { IAdminNotificationHubViewState, AdminNotificationPivotNames } from "NotificationsUI/Scripts/AdminNotificationHubViewState";
import { SubscriptionStore, SubscriptionData } from "NotificationsUI/Scripts/Stores/SubscriptionStore";
import { SettingsHttpClient } from "VSS/Settings/RestClient";
import { autobind } from "OfficeFabric/Utilities";

const DefaultGroupDeliveryPreferenceProperty = "NotificationDefaultGroupDeliveryPreference";
const AllowedChannelTypes = ["User", "EmailHtml", "EmailPlaintext", "Soap", "Group"];
const AllowedFilterTypes = ["Expression", "Actor", "Block"];

export class AdminSubscriptionStore extends SubscriptionStore {

    private _hubViewState: IAdminNotificationHubViewState;

    private _baseStatisticsData: NotificationContracts.SubscriptionStatisticViewData;
    private _statsServiceData: SubscriptionsPayload;

    private _subscriberIdentity: INotificationIdentity;

    constructor(hubViewState: IAdminNotificationHubViewState, providersSubscriptionsData: { [key: string]: NotificationContracts.NotificationSubscriptionsViewData }) {
        super(providersSubscriptionsData);

        this._hubViewState = hubViewState;
        this._hubViewState.subscribe(this._onPivotChanging, HubViewStateEventNames.pivotChanging);
        
        this._baseStatisticsData = Service.getService(Contribution_Services.WebPageDataService).getPageData<NotificationContracts.SubscriptionStatisticViewData>(
            "ms.vss-tfs.subscription-statistics-data-provider",
            NotificationContracts.TypeInfo.SubscriptionStatisticViewData);
            
        if (this._baseStatisticsData) {
            let publishersSubscriptions: { [key: string]: { [key: string]: NotificationContracts.NotificationSubscription; } } = {};
            publishersSubscriptions[this._commonViewData.defaultServiceInstanceType] = this._baseStatisticsData.subscriptions;
            this._statsServiceData = {
                subscriptions: publishersSubscriptions,
                statistics: this._baseStatisticsData.statistics,
                isAdmin: this._baseStatisticsData.isAdmin,
                events: this._baseStatisticsData.events,
                subscriber: null,
                eventTypes: this._baseServiceData.eventTypes,
                queryDate: this._baseStatisticsData.queryDate
            };
        }

        this._subscriber = null;

        this._loadSubscriptionDataForView(this._hubViewState.selectedPivot.value);
    }

    public addListeners() {
        super.addListeners();
        
        Subscription_Actions.IdentitySelected.addListener(this.identitySelectedChange);
        Subscription_Actions.SetAdminDefaultGroupDeliveryPreference.addListener(this._setAdminDefaultGroupDeliveryPreference);
    }

    public removeListeners() {
        super.removeListeners();

        Subscription_Actions.IdentitySelected.removeListener(this.identitySelectedChange);
        Subscription_Actions.SetAdminDefaultGroupDeliveryPreference.removeListener(this._setAdminDefaultGroupDeliveryPreference);
    }

    public getStatisticsData(): NotificationContracts.SubscriptionStatisticViewData {
        return this._baseStatisticsData;
    }

    public isDefaultSubscriptionsView(): boolean {
        return StringUtils.equals(AdminNotificationPivotNames.defaultSubscriptions, this._hubViewState.selectedPivot.value, true);
    }

    public getSubscriptions(): NotificationContracts.NotificationSubscription[] {
        if (this.isDefaultSubscriptionsView()) {
            this._subscriptions = this._initialSubscriptions;
        }
        else {
            // If there is a subscriber selected then return subscriptions
            if (this._subscriber) {
                this._subscriptions = this._getSubscriptions();
            }
            else {
                this._subscriptions = [];
            }
        }
        return this._subscriptions;
    }

    @autobind
    private _onPivotChanging(pivotValue: string) {
        this._loadSubscriptionDataForView(pivotValue);
    }

    private _loadSubscriptionDataForView(viewName: string) {

        if (StringUtils.equals(AdminNotificationPivotNames.defaultSubscriptions, viewName, true)) {
            this._loadDefaultSubscriptionData();
        }
        else if (StringUtils.equals(AdminNotificationPivotNames.subscribers, viewName, true)) {
            this._loadSubscriberData();
        }
        else if (StringUtils.equals(AdminNotificationPivotNames.statistics, viewName, true)) {
            this._loadStatisticsData();
        }
    }

    private _loadDefaultSubscriptionData() {

        let payloadData: SubscriptionsPayload = {
            statistics: null,
            isAdmin: this._baseStatisticsData.isAdmin,
            subscriber: this._subscriber,
            subscriptions: null,
            events: this._baseServiceData.eventTypes,
            eventTypes: this._baseServiceData.eventTypes,
            queryDate: this._baseStatisticsData.queryDate
        };

        this._subscriptionsViewData = payloadData;
        this.emitChanged();
    }

    private _loadStatisticsData() {
        this._subscriptionsViewData = this._statsServiceData;
        this.emitChanged();
    }

    private _loadSubscriberData() {
        this._subscriptionsViewData = null;
        this._beginGetSubscriptionOverviewPayload(null).then((payload: SubscriptionsPayload) => {
            this._subscriptionsViewData = payload;
            this.emitChanged();
        }, (reason: any) => {
            Subscription_Actions.DataLoadError.invoke(reason);
        });
    }

    protected _subscriptionEdited(updatedSubscription: NotificationContracts.NotificationSubscription, isStatusChange: boolean) {
        if (this._statsServiceData) {
            this._statsServiceData.subscriptions[this._commonViewData.defaultServiceInstanceType][updatedSubscription.id] = updatedSubscription;
            if (isStatusChange) {
                let subscriptionData = this._subscriptionDataMap[this._subscriber.id];
                // make sure that subscriptionData is populated. it only gets populated when going to the subscriptions tab
                if (subscriptionData && subscriptionData.subscriptionMap) {
                    let service = this._getSubscriptionServiceInstance(updatedSubscription);
                    subscriptionData.subscriptionMap[service][updatedSubscription.id] = updatedSubscription;
                }
            }
        }
        
        super._subscriptionEdited(updatedSubscription, isStatusChange);
    }

    @autobind
    private identitySelectedChange(identity: INotificationIdentity) {

        if ((!this._subscriberIdentity && !identity) || (this._subscriberIdentity && identity && this._subscriberIdentity.id === identity.id)) {
            // No subscriber change
            return;
        }

        this._subscriberIdentity = identity;
        this._subscriber = null;
        this._hubViewState.identityId.value = identity ? identity.id : undefined;

        if (identity) {
            this._beginGetSubscriptionOverviewPayload(identity).then((payload: SubscriptionsPayload) => {
                // Store the map
                if (payload.subscriber) {
                    var subscriptionData: SubscriptionData = {
                        subscriber: payload.subscriber,
                        subscriptionMap: payload.subscriptions
                    };
                    this._subscriptionDataMap[identity.id] = subscriptionData;

                    this._subscriptionsViewData = payload;
                    this._subscriptions = this._getSubscriptions();
                    this._subscriber = this._subscriptionsViewData.subscriber;
                    this._queryScopes();
                    this._getSubscriberDeliveryPreferences(this._subscriber.id);
                }
                else {
                    this._subscriptions = [];
                }
            }, (reason: any) => {
                Subscription_Actions.DataLoadError.invoke(reason);
            });
        }
        else {
            this._beginGetSubscriptionOverviewPayload(null).then((payload: SubscriptionsPayload) => {
                this._subscriptionsViewData = payload;
                this.emitChanged();
            });
        }
    }

    private _getSubscriberDeliveryPreferences(subscriberId: string) {
        let httpClient = this._getHttpClientForService();

        httpClient.getSubscriber(subscriberId).then((notificationsubscriber: NotificationContracts.NotificationSubscriber) => {
            this._commonViewData.subscriber = notificationsubscriber;
            this.emitChanged();
        }, (error) => {
            this.emitChanged();
        });
    }

    @autobind
    private _setAdminDefaultGroupDeliveryPreference(deliveryPreference: NotificationContracts.DefaultGroupDeliveryPreference) {
    
        let httpClient = this._getHttpClientForService();
       
        httpClient._beginGetLocation("notification", "cbe076d8-2803-45ff-8d8d-44653686ea2a").then((locationInfo) => {
            if (locationInfo) {
                this._setAdminDefaultGroupDeliveryPreferenceTheGood(deliveryPreference);
            }
            else
            {
                this._setAdminDefaultGroupDeliveryPreferenceTheUgly(deliveryPreference);
            }
        }, (error) => {
            this._setAdminDefaultGroupDeliveryPreferenceTheUgly(deliveryPreference);
        });
    }
    
    @autobind
    private _setAdminDefaultGroupDeliveryPreferenceTheGood(deliveryPreference: NotificationContracts.DefaultGroupDeliveryPreference) {

        let httpClient = this._getHttpClientForService();

        let updateParameters: NotificationContracts.NotificationAdminSettingsUpdateParameters = {
            defaultGroupDeliveryPreference: deliveryPreference
        }
        httpClient.updateSettings(updateParameters).then((settings: NotificationContracts.NotificationAdminSettings) => {
            this.getAdminSettings().defaultGroupDeliveryPreference = settings.defaultGroupDeliveryPreference;
            this.emitChanged();
        }, (error) => {
            this._showMessage(NotificationResources.SettingsErrorTitle, VSS.getErrorMessage(error));
        });
    }

    @autobind
    private _setAdminDefaultGroupDeliveryPreferenceTheUgly(deliveryPreference: NotificationContracts.DefaultGroupDeliveryPreference) {
        
        const settings = {};
        settings[DefaultGroupDeliveryPreferenceProperty] = deliveryPreference;

        const settingsRestClient = Service.getClient(SettingsHttpClient);
        settingsRestClient.setEntries(settings, "host").then(() => {
            this.getAdminSettings().defaultGroupDeliveryPreference = deliveryPreference;
            this.emitChanged();
        }, (error) => {
            this._showMessage(NotificationResources.SettingsErrorTitle, VSS.getErrorMessage(error));
        });
    }

    private _beginGetSubscriptionOverviewPayload(identity: INotificationIdentity, force: boolean = false): IPromise<SubscriptionsPayload> {

        // No cached data yet. Try to acquire service data either from page or server.
        let promise: IPromise<SubscriptionsPayload>;
        let promises: IPromise<SubscriptionsPayload>[] = [];

        // Get from the page first and see it is available
        let subscriptionMap;
        let subscriber;
        if (identity) {
            let identityData: SubscriptionData = this._subscriptionDataMap[identity.id];
            if (identityData && identityData.subscriber) {
                subscriber = identityData.subscriber;
                subscriptionMap = identityData.subscriptionMap;
            }
        }

        if ((!force && subscriptionMap) || !identity) {

            let payloadData: SubscriptionsPayload = {
                statistics: null,
                isAdmin: this._baseStatisticsData.isAdmin,
                subscriber: subscriber,
                subscriptions: subscriptionMap,
                events: this._baseServiceData.eventTypes,
                eventTypes: this._baseServiceData.eventTypes,
                queryDate: this._baseStatisticsData.queryDate
            };

            // Use existing data from the page
            promise = Q.resolve(payloadData);
            promises.push(promise);
        } else {

            for (var service in this._serviceInstanceTypes) {
                let notificationsHttpClient = this._getHttpClientForService(this._serviceInstanceTypes[service]);

                promise = notificationsHttpClient.listSubscriptions(identity.id).then(
                    (subscriptions: NotificationContracts.NotificationSubscription[]) => {
                        const subscriptionMap: { [key: string]: NotificationContracts.NotificationSubscription } = {};
                        const serviceSubscriptions: { [key: string]: { [key: string]: NotificationContracts.NotificationSubscription } } = {};
                        let currentSubscriberIdentity: IdentityRef;

                        // Filter out chat, sh and artifact subscriptions
                        subscriptions.forEach(
                            function (s) {
                                if (AllowedChannelTypes.indexOf(s.channel.type) !== -1 && AllowedFilterTypes.indexOf(s.filter.type) !== -1) {
                                    subscriptionMap[s.id] = s;
                                }
                                if (s.subscriber.id === identity.id) {
                                    currentSubscriberIdentity = s.subscriber;
                                }
                            });

                        const validSubscriptionsId = Object.keys(subscriptionMap);
                        if (validSubscriptionsId.length > 0) {
                            const subscriptionId = validSubscriptionsId[0];
                            const subscription = subscriptionMap[subscriptionId];
                            const subscriptionService = this._getSubscriptionServiceInstance(subscription);
                            serviceSubscriptions[subscriptionService] = subscriptionMap;  
                        }

                        // If the subscriber does not have personal subscriptions, query for subscriber identity
                        if (!currentSubscriberIdentity) {
                            currentSubscriberIdentity = this._getSubscriberIdentity(identity);
                        }

                        return this._createSubscriptionsPayloadData(currentSubscriberIdentity, serviceSubscriptions);
                    });
                promises.push(promise);
            }
        }

        promise.then((value: SubscriptionsPayload) => {
            return value;
        });

        return Q.all(promises).then((values: SubscriptionsPayload[]) => {
            let payloadData: SubscriptionsPayload;
            for (let index in values) {
                if (payloadData) {
                    $.each(values[index].subscriptions, (id: string, subscriptions: { [key: string]: NotificationContracts.NotificationSubscription }) => {
                        payloadData.subscriptions[id] = subscriptions;
                    });
                }
                else {
                    payloadData = values[index];
                }
            }
            return payloadData;
        });
    }

    private _getSubscriberIdentity(identity: INotificationIdentity): IdentityRef {
        let userIdentity = {
            id: identity.id,
            isContainer: this._subscriberIsGroup,
            displayName: identity.displayName
        } as IdentityRef

        return userIdentity;
    }

    private _createSubscriptionsPayloadData(subscriber: IdentityRef, subscriptions: {[key: string]: { [key: string]: NotificationContracts.NotificationSubscription; }}) {
        let payloadData: SubscriptionsPayload = {
            statistics: null,
            isAdmin: this._baseStatisticsData.isAdmin,
            subscriber: subscriber,
            subscriptions: subscriptions,
            events: this._baseServiceData.eventTypes,
            eventTypes: this._baseServiceData.eventTypes,
            queryDate: this._baseStatisticsData.queryDate
        };

        return payloadData;
    }
}
import { SubscriptionDiagnostics } from "Notifications/Contracts";
import * as NotificationContracts from "Notifications/Contracts";
import * as NotificationRestClient from "Notifications/RestClient";
import * as Subscription_Actions from "NotificationsUI/Scripts/Actions/SubscriptionActions";
import * as NotificationViewModel_Async from "NotificationsUI/Scripts/NotificationsViewModel";
import * as NotificationResources from "NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI";
import * as SubscriptionDialog_Async from "NotificationsUI/Scripts/SubscriptionDialog";
import { SubscriptionsPayload } from "NotificationsUI/Scripts/UIContracts";
import { autobind } from "OfficeFabric/Utilities";
import * as Q from "q";
import { TeamProjectReference } from "TFS/Core/Contracts";
import { CoreHttpClient3 } from "TFS/Core/RestClient";
import Contribution_Services = require("VSS/Contributions/Services");
import { Enhancement } from 'VSS/Controls';
import * as Dialogs_Async from "VSS/Controls/Dialogs";
import * as ActionBase from "VSS/Flux/Action";
import * as StoreBase from "VSS/Flux/Store";
import * as Service from "VSS/Service";
import * as ArrayUtils from "VSS/Utils/Array";
import * as StringUtils from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { toNativePromise } from "VSSPreview/Utilities/PromiseUtils";

export interface SubscriptionData {
    subscriber: IdentityRef,
    subscriptionMap: { [key: string]: { [key: string]: NotificationContracts.NotificationSubscription; } }
}

export class SubscriptionStore extends StoreBase.RemoteStore {

    protected _commonViewData: NotificationContracts.NotificationCommonViewData;
    protected _baseServiceData: NotificationContracts.NotificationSubscriptionsViewData;
    protected _subscriptionsViewData: SubscriptionsPayload;
    protected _subscriptionDataMap: { [key: string]: SubscriptionData } = {};
    protected _subscriptions: NotificationContracts.NotificationSubscription[];
    protected _initialSubscriptions: NotificationContracts.NotificationSubscription[];
    protected _serviceInstanceTypes: string[] = [];

    protected _subscriber: IdentityRef;
    protected _subscriberIsGroup: boolean;

    private _baseSubscriptionData: NotificationContracts.NotificationSubscriptionsViewData;

    private _retrievedScopes: boolean = false;
    private _lastUsedProjectId: string = null;
    private _deliveryPreferencesPanelState: boolean = false;
    private static serviceHooksChannelType: string = "ServiceHooks";

    constructor(providersSubscriptionsData: { [key: string]: NotificationContracts.NotificationSubscriptionsViewData }) {
        super();

        this.addListeners();

        this._initializeData(providersSubscriptionsData);
    }

    protected addListeners() {
        Subscription_Actions.DataLoadError.addListener(this.onError, this);
        Subscription_Actions.CreateSubscription.addListener(this._createNewSubscription);
        Subscription_Actions.EditSubscription.addListener(this._editSubscription);
        Subscription_Actions.DeleteSubscription.addListener(this._deleteSubscription);
        Subscription_Actions.OpenSubscription.addListener(this._openSubscription);
        Subscription_Actions.ToggleSubscriptionEnabled.addListener(this._toggleSubscriptionEnabled);
        Subscription_Actions.ToggleSubscriptionDiagnosticsEnabled.addListener(this._toggleSubscriptionDiagnosticsEnabled);
        Subscription_Actions.ChangeSubscriptionOptOut.addListener(this._changeSubscriptionOptOut);
        Subscription_Actions.SubscriptionDeleted.addListener(this._subscriptionDeleted);
        Subscription_Actions.UnsubscribeSubscription.addListener(this._unsubscribe);
        Subscription_Actions.FocusSubscription.addListener(this._focus);
        Subscription_Actions.EditSubscriberDeliveryPreferences.addListener(this._editSubscriberDeliveryPreferences);
        Subscription_Actions.SubscriberDeliveryPreferencesUpdated.addListener(this._subscriberDeliveryPreferencesUpdated);
    }

    public removeListeners() {
        Subscription_Actions.DataLoadError.removeListener(this.onError);
        Subscription_Actions.CreateSubscription.removeListener(this._createNewSubscription);
        Subscription_Actions.EditSubscription.removeListener(this._editSubscription);
        Subscription_Actions.DeleteSubscription.removeListener(this._deleteSubscription);
        Subscription_Actions.OpenSubscription.removeListener(this._openSubscription);
        Subscription_Actions.ToggleSubscriptionEnabled.removeListener(this._toggleSubscriptionEnabled);
        Subscription_Actions.ToggleSubscriptionDiagnosticsEnabled.removeListener(this._toggleSubscriptionDiagnosticsEnabled);
        Subscription_Actions.ChangeSubscriptionOptOut.removeListener(this._changeSubscriptionOptOut);
        Subscription_Actions.SubscriptionDeleted.removeListener(this._subscriptionDeleted);
        Subscription_Actions.UnsubscribeSubscription.removeListener(this._unsubscribe);
        Subscription_Actions.FocusSubscription.removeListener(this._focus);
        Subscription_Actions.EditSubscriberDeliveryPreferences.removeListener(this._editSubscriberDeliveryPreferences);
        Subscription_Actions.SubscriberDeliveryPreferencesUpdated.removeListener(this._subscriberDeliveryPreferencesUpdated);
    }

    public getDeliveryPreferencesPanelState(): boolean {
        return this._deliveryPreferencesPanelState;
    }

    public isDefaultSubscriptionsView(): boolean {
        return false;
    }

    public setDeliveryPreferencesPanelState(show: boolean) {
        this._deliveryPreferencesPanelState = show;
    }

    private _initializeData(providersSubscriptionsData: { [key: string]: NotificationContracts.NotificationSubscriptionsViewData }): void {
        const data = Service.getService(Contribution_Services.WebPageDataService)
            .getPageDataByDataType<NotificationContracts.NotificationCommonViewData>("notification-common-data");
        const keys = Object.keys(data);
        if (keys.length === 1) {
            this._commonViewData = data[keys[0]];
        }
        else {
            throw new Error(`Expected exactly one notification common data provider, but found ${keys.length}`);
        }

        this._baseServiceData = this._mergeProvidersViewData(providersSubscriptionsData);

        this._subscriber = this._commonViewData.subscriberIdentity;
        this._subscriberIsGroup = this._commonViewData.subscriberIdentity.isContainer;

        var subscriptionMap: { [key: string]: { [key: string]: NotificationContracts.NotificationSubscription } } = {};

        if (this._baseServiceData) {
            let that = this;
            this._baseServiceData.subscriptions.forEach(
                function (s) {
                    let service = that._getSubscriptionServiceInstance(s);
                    if (!subscriptionMap[service]) {
                        subscriptionMap[service] = {}
                    }
                    subscriptionMap[service][s.id] = s;
                });
            $.each(this._baseServiceData.publishers, (id: string, publisher: NotificationContracts.NotificationEventPublisher) => {
                let serviceInstanceType = publisher.subscriptionManagementInfo.serviceInstanceType;
                if (!StringUtils.isEmptyGuid(serviceInstanceType) && this._serviceInstanceTypes.indexOf(serviceInstanceType) < 0) {
                    this._serviceInstanceTypes.push(serviceInstanceType);
                }
            });
        }

        var subscriptionData: SubscriptionData = {
            subscriber: this._commonViewData.subscriberIdentity,
            subscriptionMap: subscriptionMap
        };

        this._subscriptionDataMap[this._commonViewData.subscriberIdentity.id] = subscriptionData;

        if (this._baseServiceData) {
            this._subscriptions = this._baseServiceData.subscriptions;
            // filter contributed subscriptions
            this._initialSubscriptions = this._baseServiceData.subscriptions.filter(s => s.flags & NotificationContracts.SubscriptionFlags.ContributedSubscription);
        }

        //populate scopes
        this._queryScopes();
    }

    public getData(): SubscriptionsPayload {
        return this._subscriptionsViewData;
    }

    public getServiceData(): NotificationContracts.NotificationSubscriptionsViewData {
        return this._baseServiceData;
    }

    public getCommonViewData(): NotificationContracts.NotificationCommonViewData {
        return this._commonViewData;
    }

    public isContributedSubscription(subscription: NotificationContracts.NotificationSubscription): boolean {
        return (subscription.flags & NotificationContracts.SubscriptionFlags.ContributedSubscription) === NotificationContracts.SubscriptionFlags.ContributedSubscription;
    }

    public sortSubscriptions(subscriptions: NotificationContracts.NotificationSubscription[]): void  {
        subscriptions.sort(
            (a, b) => {
                var eventType1 = this.getEventType(a);
                var categoryId1 = eventType1 ? eventType1.category ? eventType1.category.id : "" : "";
                var eventType2 = this.getEventType(b);
                var categoryId2 = eventType2 ? eventType2.category ? eventType2.category.id : "" : "";
                return (categoryId1 > categoryId2) ? 1 : ((categoryId2 > categoryId1) ? -1 : (a.description > b.description ? -1 : 1));
            }
        );
    }

    public isSubscriptionEnabled(subscription: NotificationContracts.NotificationSubscription): boolean {
        return subscription.status >= 0;
    }

    public isSharedSubscription(subscription: NotificationContracts.NotificationSubscription): boolean {
        return ((subscription.flags & NotificationContracts.SubscriptionFlags.GroupSubscription) === NotificationContracts.SubscriptionFlags.GroupSubscription);
    }

    public isUserOptedIn(subscription: NotificationContracts.NotificationSubscription): boolean {
        let isShared = this.isSharedSubscription(subscription);
        if (isShared) {
            return ((subscription.adminSettings && subscription.adminSettings.blockUserOptOut) || (!subscription.userSettings || !subscription.userSettings.optedOut));
        }
        return this.isSubscriptionEnabled(subscription);
    }

    public getDefaultSubscriberId(): string {
        return this._commonViewData.subscriberIdentity.id;
    }

    public getDefaultServiceInstanceType(): string {
        return this._commonViewData.defaultServiceInstanceType;
    }

    public isSubscriberTypeUser(): boolean {
        return this._commonViewData.subscriberIdentity && !this._commonViewData.subscriberIdentity.isContainer;
    }

    public isSubscriberEmailPending(): boolean {
        return this._commonViewData.isSubscriberEmailPending;
    }

    public getSubscriberEmailAddress(): string {
        return this._commonViewData.subscriberEmail;
    }

    public getAsciiOnlyAddresses(): boolean {
        return this._commonViewData.asciiOnlyAddresses;
    }

    public doesSubscriptionEventTypeSupportProjectScope(subscription: NotificationContracts.NotificationSubscription): boolean {
        var eventType: NotificationContracts.NotificationEventType = this.getEventType(subscription);
        return (eventType && eventType.supportedScopes && eventType.supportedScopes.indexOf("project") !== -1);
    }

    public getEventType(subscription: NotificationContracts.NotificationSubscription): NotificationContracts.NotificationEventType {
        return this._baseServiceData.eventTypes[subscription.filter.eventType];
    }

    public canUserOptInOut(subscription: NotificationContracts.NotificationSubscription): boolean {
        return ((subscription.flags & NotificationContracts.SubscriptionFlags.CanOptOut) === NotificationContracts.SubscriptionFlags.CanOptOut) &&
            (subscription.adminSettings && !subscription.adminSettings.blockUserOptOut);
    }

    public getScopeName(subscription: NotificationContracts.NotificationSubscription): string {
        // return empty if any of the expected values are missing
        if (!subscription) {
            return "";
        }

        const subscriptionScope = subscription.scope;
        if (!subscriptionScope || subscriptionScope.id == "00000000-0000-0000-0000-000000000000") {
            return "";
        }
        else {
            var scope = this._baseServiceData.scopes[subscriptionScope.id];
            return scope ? scope.name : "";
        }
    }

    @autobind
    private _subscriberDeliveryPreferencesUpdated() {
        this.emitChanged();
    }

    public getAdminSettings(): NotificationContracts.NotificationAdminSettings {
        if (!this._commonViewData.adminSettings) {
            this._commonViewData.adminSettings = <NotificationContracts.NotificationAdminSettings>{};
        }
        return this._commonViewData.adminSettings;
    }

    public getPublisherForSubscription(subscription: NotificationContracts.NotificationSubscription): NotificationContracts.NotificationEventPublisher {
        // in case no subscription is provided like when quering for a subscription by Id
        if (subscription && subscription.filter) {
            let publisherId = this._baseServiceData.mapEventTypeToPublisherId[subscription.filter.eventType];
            return this._baseServiceData.publishers[publisherId];
        } else {
            return null;
        }
    }

    @autobind
    private _unsubscribe(subscriptionKey: Subscription_Actions.NotificationSubscriptionKey) {
        let subscription = this.getSubscriptionFromId(subscriptionKey.subscriptionId, subscriptionKey.publisherId);

        if (subscription) {
            this._unsubscribeSubscription(subscription);
        }
        else {
            this._handleNoPermissionViewOrUnsubscribe(subscriptionKey, NotificationResources.UnsubscribeMessageTitle);
        }
    }

    public getSubscriptionFromId(subscriptionId: string, publisherId: string): NotificationContracts.NotificationSubscription {
        for (let subscription of this._subscriptions) {
            // Find subscription with this ID
            if (subscription.id === subscriptionId) {
                var subscriptionPublisher = this.getPublisherForSubscription(subscription);

                // Get event publisher for the subscription
                if (subscriptionPublisher) {
                    if (publisherId) {
                        // Check if the specified publisher ID matches the publisher of the subscription
                        if (publisherId === subscriptionPublisher.id) {
                            return subscription;
                        }
                    } else if (StringUtils.equals(subscriptionPublisher.subscriptionManagementInfo.serviceInstanceType, this._commonViewData.defaultServiceInstanceType, true)) {
                        // No publisher ID was specified, but the publisher of the subscription is on the default service instance
                        return subscription;
                    }
                }
            }
        }
    }

    public getAdminPageUrl(): string {
        return this._commonViewData.adminPageUrl;
    }

    private _unsubscribeSubscription(subscription: NotificationContracts.NotificationSubscription) {

        if (this.isSharedSubscription(subscription) && !this.canUserOptInOut(subscription)) {
            this._showMessage(NotificationResources.UnsubscribeMessageTitle, NotificationResources.SubscriptionBlockedFromUnsubscribe);
        } else if (!this.isSubscriptionEnabled(subscription) || (this.isSharedSubscription(subscription) && !this.isUserOptedIn(subscription))) {
            this._showMessage(NotificationResources.UnsubscribeMessageTitle, NotificationResources.SubscriptionIsAlreadyUnsubscribed);
        } else {
            var confirmMessage: string;
            var okButton: IMessageDialogButton;

            if (this.isSharedSubscription(subscription)) {
                confirmMessage = StringUtils.format(NotificationResources.SharedSubscriptionOptOutConfirmMessage, subscription.description);
                okButton = { id: "1", text: NotificationResources.OptoutButtonText };
            }
            else {
                confirmMessage = StringUtils.format(NotificationResources.PersonalSubscriptionDisableConfirmMessage, subscription.description);
                okButton = { id: "1", text: NotificationResources.DisableButtonText };
            }

            return VSS.requireModules(["VSS/Controls/Dialogs"]).spread((_Dialogs: typeof Dialogs_Async) => {
                this._showConfirmation(NotificationResources.UnsubscribeMessageTitle, confirmMessage).then(() => {
                    let changeRequest;
                    if (this.isSharedSubscription(subscription)) {
                        changeRequest = this._changeSubscriptionOptOut({ newValue: true, subscription: subscription, skipWarn: true });
                    } else {
                        changeRequest = this._toggleSubscriptionEnabled(subscription);
                    }
                    changeRequest.then(() => {
                        this._showMessage(NotificationResources.UnsubscribeMessageTitle, NotificationResources.UnsubscribeSuccess);
                    });
                });
            });
        }
    }

    // queries the server for that subscription basic information and displays the user a message
    private _handleNoPermissionViewOrUnsubscribe(subscriptionKey: Subscription_Actions.NotificationSubscriptionKey, dialogTitle: string) {
        var httpClient = this._getHttpClientForSubscription(null, subscriptionKey.publisherId);
        var basicSubscription: NotificationContracts.NotificationSubscription;
        var message: string = NotificationResources.SubscriptionNoLongerExists;

        httpClient.getSubscription(subscriptionKey.subscriptionId, NotificationContracts.SubscriptionQueryFlags.AlwaysReturnBasicInformation).then((subscriptionDetails: NotificationContracts.NotificationSubscription) => {
            basicSubscription = subscriptionDetails;
            if (basicSubscription) {
                if (!this.isSubscriptionEnabled(basicSubscription) || (this.isSharedSubscription(basicSubscription) && !this.isUserOptedIn(basicSubscription))) {
                    this._showMessage(NotificationResources.UnsubscribeMessageTitle, NotificationResources.SubscriptionIsAlreadyUnsubscribed);
                }
                else {
                    let url = basicSubscription._links["edit"] ? basicSubscription._links["edit"].href : basicSubscription.url;
                    message = StringUtils.format(NotificationResources.NoPermissionUnsubscribeMessage, url || "#", subscriptionKey.subscriptionId, basicSubscription.subscriber.displayName);
                    var $messageContent: JQuery = $("<div />").append(message);
                    this._showHTMLMessage(dialogTitle, $messageContent);
                }
            }
            else {
                this._showMessage(dialogTitle, message);
            }
        }, (error) => {
            this._showMessage(dialogTitle, message);
        });
    }

    private _showHTMLMessage(title: string, htmlMessage: JQuery) {
        return VSS.requireModules(["VSS/Controls/Dialogs"]).spread((_Dialogs: typeof Dialogs_Async) => {
            return _Dialogs.MessageDialog.showMessageDialog(htmlMessage, {
                title: title,
                buttons: [_Dialogs.MessageDialog.buttons.ok]
            });
        });
    }

    @autobind
    private _focus(subscriptionKey: Subscription_Actions.NotificationSubscriptionKey) {
        const subscription = this.getSubscriptionFromId(subscriptionKey.subscriptionId, subscriptionKey.publisherId);
        if (!subscription) {
            this._handleNoPermissionViewOrUnsubscribe(subscriptionKey, NotificationResources.SubscriptionNotFoundDialogTitle);
        }
    }

    protected _subscriptionEdited(updatedSubscription: NotificationContracts.NotificationSubscription, isStatusChange: boolean) {
        
        // if it is not opt out change then the subscription need to be updated for all users who can view it
        if (!isStatusChange) {
            for (let key in this._subscriptionDataMap) {
                let subscriptionData = this._subscriptionDataMap[key];
                let service = this._getSubscriptionServiceInstance(updatedSubscription);
                // make sure that subscriptionData is populated. it only gets populated when going to the subscriptions tab
                if (subscriptionData && subscriptionData.subscriptionMap && subscriptionData.subscriptionMap[service].hasOwnProperty(updatedSubscription.id)) {
                    subscriptionData.subscriptionMap[service][updatedSubscription.id] = updatedSubscription;
                }
            }
        }

        var subscriptionPublisher = this.getPublisherForSubscription(updatedSubscription);
        for (var index = 0; index < this._subscriptions.length; index++) {
            var publisher = this.getPublisherForSubscription(this._subscriptions[index]);
            if (this._subscriptions[index].id === updatedSubscription.id && ((!subscriptionPublisher && !publisher) || subscriptionPublisher.id === publisher.id)) {
                this._subscriptions[index] = updatedSubscription;
                break;
            }
        }

        this.emitChanged();
    }


    @autobind
    private _subscriptionDeleted(subscription: NotificationContracts.NotificationSubscription) {
        // delete the subscription for all users who can view it
        for (var key in this._subscriptionDataMap) {
            var subscriptionData = this._subscriptionDataMap[key];
            let service = this._getSubscriptionServiceInstance(subscription);
            // make sure that subscriptionData is populated. it only gets populated when going to the subscriptions tab
            if (subscriptionData && subscriptionData.subscriptionMap && subscriptionData.subscriptionMap[service].hasOwnProperty(subscription.id)) {
                delete subscriptionData.subscriptionMap[service][subscription.id];
            }
        }

        let subscriptionPublisher = this.getPublisherForSubscription(subscription);
        this._subscriptions = this._subscriptions.filter(s => (s.id !== subscription.id || subscriptionPublisher.id !== this.getPublisherForSubscription(s).id));

        this.emitChanged();
    }

    @autobind
    private _changeSubscriptionOptOut(optOutChange: Subscription_Actions.SubscriptionOptOutChange): IPromise<any> {
        var action: string = NotificationResources.OptoutAction;
        var confirmationMessage: string;
        if (!optOutChange.newValue) {
            action = NotificationResources.OptinAction;
        }

        if (!optOutChange.skipWarn) {
            var confirmationTitle: string = StringUtils.format(NotificationResources.ConfirmOptoutTitle, action);
            var confirmationMessage: string = StringUtils.format(NotificationResources.ConfirmOptoutMessage, this._subscriber.displayName, action, optOutChange.subscription.description);

            return this._showConfirmation(confirmationTitle, confirmationMessage).then(() => {
                let userSettings = {
                    optedOut: optOutChange.newValue
                } as NotificationContracts.SubscriptionUserSettings;

                var httpClient = this._getHttpClientForSubscription(optOutChange.subscription);

                return httpClient.updateSubscriptionUserSettings(userSettings, optOutChange.subscription.id, this._subscriber.id).then((updatedUserSettings: NotificationContracts.SubscriptionUserSettings) => {
                    var updatedSubscription: NotificationContracts.NotificationSubscription = optOutChange.subscription;
                    updatedSubscription.userSettings = updatedUserSettings;
                    this._subscriptionEdited(updatedSubscription, true);
                }, (error) => {
                    this._showMessage(NotificationResources.SubscriptionUserSettingsChangeError, error.message || error);
                });
            });
        }
        else {
            let userSettings = {
                optedOut: optOutChange.newValue
            } as NotificationContracts.SubscriptionUserSettings;

            var httpClient = this._getHttpClientForSubscription(optOutChange.subscription);

            return httpClient.updateSubscriptionUserSettings(userSettings, optOutChange.subscription.id, this._subscriber.id).then((updatedUserSettings: NotificationContracts.SubscriptionUserSettings) => {
                var updatedSubscription: NotificationContracts.NotificationSubscription = optOutChange.subscription;
                updatedSubscription.userSettings = updatedUserSettings;
                this._subscriptionEdited(updatedSubscription, true);
            }, (error) => {
                this._showMessage(NotificationResources.SubscriptionUserSettingsChangeError, error.message || error);
            });
        }
    }

    private _showConfirmation(title: string, message: string) {
        return VSS.requireModules(["VSS/Controls/Dialogs"]).spread((_Dialogs: typeof Dialogs_Async) => {
            return _Dialogs.MessageDialog.showMessageDialog(message,
                {
                    title: title,
                    buttons: [_Dialogs.MessageDialog.buttons.yes, _Dialogs.MessageDialog.buttons.no]
                });
        });
    }

    @autobind
    private _editSubscriberDeliveryPreferences(subscriber: NotificationContracts.NotificationSubscriber) {
        let httpClient = this._getHttpClientForService();
        let deliveryPreferenceUpdateParameters: NotificationContracts.NotificationSubscriberUpdateParameters = {
            deliveryPreference: subscriber.deliveryPreference,
            preferredEmailAddress: subscriber.preferredEmailAddress
        }
        httpClient.updateSubscriber(deliveryPreferenceUpdateParameters, subscriber.id).then((updatedSubscriber) => {
            this._commonViewData.subscriber = updatedSubscriber;
            this._deliveryPreferencesPanelState = false;
            this.emit("DeliveryPreferenceSaved", this);
        }, (error) => {
            this.emit("DeliveryPreferenceSaveFailed", error);
        });
    }

    public getSubscriptions(): NotificationContracts.NotificationSubscription[] {
        return this._subscriptions;
    }

    public hasManagePermission(): boolean {
        return this._commonViewData.hasManagePermission;
    }

    protected _queryScopes() {
        // query for the scopes
        if (this._subscriptions) {
            var httpCoreClientService = this._getCoreHttpClientService();
            var subscriptionsScopes: string[] = this._subscriptions.map(function (a) { if (!a.scope) { return ""; } else { return a.scope.id; } });
            return httpCoreClientService.getProjects(null, 1000).then((projects) => {

                $.each(projects, (i: number, project: TeamProjectReference) => {
                    if (subscriptionsScopes.indexOf(project.id) > -1) {
                        var scope: NotificationContracts.SubscriptionScope = {
                            id: project.id, name: project.name, type: "project"
                        };
                        this._baseServiceData.scopes[scope.id] = scope;
                    }

                    // set the last used team project id
                    if (project.name === this._commonViewData.lastUsedTeamProjectName) {
                        this._lastUsedProjectId = project.id;
                    }
                });

                // refresh to reflect the team project names
                this.emitChanged();
            });
        }
    }

    protected _getSubscriptions() {
        var subscriptions: NotificationContracts.NotificationSubscription[] = [];
        if (this._subscriptionsViewData && this._subscriptionsViewData.subscriptions) {
            for (var service in this._subscriptionsViewData.subscriptions) {
                for (var key in this._subscriptionsViewData.subscriptions[service]) {
                    if (this._subscriptionsViewData.subscriptions[service].hasOwnProperty(key)) {
                        subscriptions.push(this._subscriptionsViewData.subscriptions[service][key]);
                    }
                }
            }
        }
        return subscriptions;
    }

    public isSubscriberProjectCollectionValidUsers(subscription: NotificationContracts.NotificationSubscription): boolean {
        return (!subscription.subscriber || this._commonViewData.projectValidUsersId === subscription.subscriber.id);
    }

    public getCurrentSubscriber(): IdentityRef {
        return this._subscriber;
    }

    public getNotificationSubscriber(subscriberId?: string): NotificationContracts.NotificationSubscriber {
        if (!subscriberId || subscriberId === this._commonViewData.subscriber.id) {
            return this._commonViewData.subscriber;
        }
        else {
            return this._baseServiceData.subscribers && this._baseServiceData.subscribers[subscriberId];
        }
    }

    @autobind
    private _toggleSubscriptionEnabled(subscription: NotificationContracts.NotificationSubscription): IPromise<any> {
        let newState = subscription.status >= 0 ? NotificationContracts.SubscriptionStatus.DisabledByAdmin : NotificationContracts.SubscriptionStatus.Enabled;
        var updateParameters = { status: newState } as NotificationContracts.NotificationSubscriptionUpdateParameters;
        
        var httpClient = this._getHttpClientForSubscription(subscription);
        return httpClient.updateSubscription(updateParameters, subscription.id).then((savedSubscription: NotificationContracts.NotificationSubscription) => {
            // Description for the service hooks is created on the fly when the page loads, and after the REST call, it gets lost in the savedSubscription 
            if(subscription.channel.type === SubscriptionStore.serviceHooksChannelType) {
                savedSubscription.description = subscription.description;
            }
            this._subscriptionEdited(savedSubscription, false);
        }, (error) => {
            this._showMessage(NotificationResources.SubscriptionErrorSave, error.message || error);
        });
    }

    @autobind
    private _toggleSubscriptionDiagnosticsEnabled(diagnosticsChange: Subscription_Actions.SubscriptionDiagnosticsChange): IPromise<any> {
        var subscription : NotificationContracts.NotificationSubscription = diagnosticsChange.subscription;
        var updateParameters =
        {
            evaluationTracing : { enabled: diagnosticsChange.enabled },
            deliveryTracing : { enabled : diagnosticsChange.enabled }
        } as NotificationContracts.UpdateSubscripitonDiagnosticsParameters;
    
         var httpClient = this._getHttpClientForSubscription(subscription);
        return httpClient.updateSubscriptionDiagnostics(updateParameters, subscription.id).then((updatedDiagnostics: NotificationContracts.SubscriptionDiagnostics) => {
            subscription.diagnostics = updatedDiagnostics;
        }, (error) => {
            this._showMessage(NotificationResources.SubscriptionErrorSave, error.message || error);
        });
    }

    private _showSubscriptionDialog(title: string, subscription: NotificationContracts.NotificationSubscription, readOnly?: boolean) {
        if (subscription && subscription.status === NotificationContracts.SubscriptionStatus.PendingDeletion) {
            throw new Error(NotificationResources.DeletedSubscriptionErrorMessage);
        }

        if (this._retrievedScopes) {
            return this._openDialog(title, subscription, readOnly);
        }
        else {
            // query for the scopes
            var httpCoreClientService = this._getCoreHttpClientService();
            return httpCoreClientService.getProjects(null, 1000).then((projects) => {
                this._retrievedScopes = true;

                $.each(projects, (i: number, project: TeamProjectReference) => {
                    var scope: NotificationContracts.SubscriptionScope = {
                        id: project.id, name: project.name, type: "project"
                    };
                    this._baseServiceData.scopes[scope.id] = scope;
                });

                return this._openDialog(title, subscription, readOnly);
            });
        }
    }

    private _openDialog(title: string, subscription: NotificationContracts.NotificationSubscription, readOnly?: boolean) {
        return VSS.requireModules(["VSS/Controls/Dialogs", "NotificationsUI/Scripts/SubscriptionDialog", "NotificationsUI/Scripts/NotificationsViewModel"])
            .spread((_Dialogs: typeof Dialogs_Async, _SubscriptionDialog: typeof SubscriptionDialog_Async, _NotificationViewModel: typeof NotificationViewModel_Async) => {
                return Q.Promise((resolve, reject) => {
                    const subscriptionData: NotificationContracts.NotificationSubscriptionsViewData = {
                        eventTypes: this._baseServiceData.eventTypes,
                        publishers: this._baseServiceData.publishers,
                        scopes: this._baseServiceData.scopes,
                        mapCategoryIdToCategoryName: this._baseServiceData.mapCategoryIdToCategoryName,
                        mapCategoryIdToSubscriptionTemplates: this._baseServiceData.mapCategoryIdToSubscriptionTemplates,
                        mapEventTypeToPublisherId: this._baseServiceData.mapEventTypeToPublisherId,
                        subscriptions: [subscription],
                        subsEvaluationSettings: this._baseServiceData.subsEvaluationSettings,
                        subscribers: this._baseServiceData.subscribers,
                    };

                    _Dialogs.show(_SubscriptionDialog.SubscriptionDialog, {
                        cssClass: "notif-subscription-host",
                        height: 610,
                        width: 1000,
                        minHeight: 467,
                        minWidth: 467,
                        resizable: true,
                        okCallback: (subscription) => { resolve(subscription); },
                        title: title,
                        viewModel: new _NotificationViewModel.NotificationsViewModel(subscriptionData, this._commonViewData),
                        isTeam: subscription ? subscription.subscriber.isContainer : this._subscriberIsGroup, // TODO: dialog option attribute shouldn't include "team". This works for now.
                        selectedSubscription: subscription,
                        subscriber: subscription ? subscription.subscriber : this._subscriber,
                        isReadOnly: readOnly, //if subscription is null then user is creating a new subscription
                        isAdmin: true,
                        currentProject: this._lastUsedProjectId,
                        notificationSubscriber: this._commonViewData.subscriber
                    });
                }).catch(err => {
                     let dialog = <SubscriptionDialog_Async.SubscriptionDialog>Enhancement.getInstance(_SubscriptionDialog.SubscriptionDialog, $('.notif-subscription-host'));
                     dialog.close();
                     return Q.reject(err);
                });
            });
    }

    private _getCoreHttpClientService(): CoreHttpClient3 {
        return Service.getClient(CoreHttpClient3, undefined, this._commonViewData.defaultServiceInstanceType);
    }

    @autobind
    private _createNewSubscription(subscription: NotificationContracts.NotificationSubscription) {
        this._showSubscriptionDialog(NotificationResources.NewSubscriptionDialogTitle, subscription).then((savedSubscription: NotificationContracts.NotificationSubscription) => {
            this._onSubscriptionCreated(savedSubscription);
        }, (error) => {
            this._showMessage(NotificationResources.SubscriptionErrorCreate, error.message || error)
        });
    }


    private _onSubscriptionCreated(subscription: NotificationContracts.NotificationSubscription) {
        if (this._subscriptionsViewData) {
            let subscriptionService = this._getSubscriptionServiceInstance(subscription);
            this._subscriptionsViewData.subscriptions[subscriptionService][subscription.id] = subscription;
            this._subscriptions = this._getSubscriptions();
        }
        else {
            this._subscriptions.push(subscription);
        }

        this.emitChanged();
    }

    protected _getSubscriptionServiceInstance(subscription: NotificationContracts.NotificationSubscription) {
        let eventType = subscription.filter.eventType;
        let publisherId = this._baseServiceData.mapEventTypeToPublisherId[eventType];
        return this._baseServiceData.publishers[publisherId].subscriptionManagementInfo.serviceInstanceType;
    }

    @autobind
    private _editSubscription(subscriptionKey: Subscription_Actions.NotificationSubscriptionKey) {
        var httpClient = this._getHttpClientForPublishser(subscriptionKey.publisherId);

        httpClient.getSubscription(subscriptionKey.subscriptionId).then(
            (subscriptionDetails: NotificationContracts.NotificationSubscription) => {
                this._showSubscriptionDialog(NotificationResources.EditSubscriptionDialogTitle, subscriptionDetails).then(
                    (eventSubscription: NotificationContracts.NotificationSubscription) => this._subscriptionEdited(eventSubscription, false),
                    error => this._showMessage(NotificationResources.SubscriptionErrorOpen, error.message || error)
                );
            }, 
            error => this._showMessage(NotificationResources.SubscriptionErrorGet, error.message || error)
        );
    }

    @autobind
    private _deleteSubscription(subscription: NotificationContracts.NotificationSubscription) {
        this._showConfirmation(NotificationResources.ConfirmDeleteTitle, NotificationResources.ConfirmDeleteMessage).then(() => {
            var httpClient = this._getHttpClientForSubscription(subscription);
            httpClient.deleteSubscription(subscription.id).then(() => {
                this._subscriptionDeleted(subscription);
            }, (error) => {
                this._showMessage(NotificationResources.SubscriptionErrorDelete, error.message || error);
            });
        });
    }

    @autobind
    private _openSubscription(subscriptionKey: Subscription_Actions.NotificationSubscriptionKey) {
        var httpClient = this._getHttpClientForPublishser(subscriptionKey.publisherId);

        toNativePromise(httpClient.getSubscription(subscriptionKey.subscriptionId)).then(
            (subscriptionDetails: NotificationContracts.NotificationSubscription) => {
                this._showSubscriptionDialog(NotificationResources.ViewSubscriptionDialogTitle, subscriptionDetails, true).then(
                    null,
                    error => this._showMessage(NotificationResources.SubscriptionErrorOpen, error.message || error)
                );
            }
        ).catch(error => this._showMessage(NotificationResources.SubscriptionErrorGet, error.message || error));
    }

    private _getHttpClientForSubscription(subscription: NotificationContracts.NotificationSubscription, publisherId?: string): NotificationRestClient.NotificationHttpClient {
        let publisher = this.getPublisherForSubscription(subscription);
        var serviceInstanceId: string;

        if (publisher) {
            return this._getHttpClientForPublishser(publisher.id);
        } else {
            return this._getHttpClientForPublishser(publisherId);
        }
    }

    private _getHttpClientForPublishser(publisherId: string): NotificationRestClient.NotificationHttpClient {
        var serviceInstanceId: string;

        if (publisherId) {
            serviceInstanceId = this._baseServiceData.publishers[publisherId].subscriptionManagementInfo.serviceInstanceType;
        } else {
            serviceInstanceId = this._commonViewData.defaultServiceInstanceType;
        }

        return this._getHttpClientForService(serviceInstanceId);
    }

    protected _getHttpClientForService(serviceInstanceId?: string): NotificationRestClient.NotificationHttpClient {
        if (!serviceInstanceId) {
            serviceInstanceId = this._commonViewData.defaultServiceInstanceType;
        }

        return Service.getClient(NotificationRestClient.NotificationHttpClient, undefined, serviceInstanceId);
    }

    protected _showMessage(title: string, message: string) {
        return VSS.requireModules(["VSS/Controls/Dialogs"]).spread((_Dialogs: typeof Dialogs_Async) => {
            return _Dialogs.MessageDialog.showMessageDialog(message, {
                title: title,
                buttons: [_Dialogs.MessageDialog.buttons.ok]
            });
        });
    }

    private _mergeProvidersViewData(providersSubscriptionsData: { [key: string]: NotificationContracts.NotificationSubscriptionsViewData }): NotificationContracts.NotificationSubscriptionsViewData {

        let subscriptionsViewData: NotificationContracts.NotificationSubscriptionsViewData;
        for (const provider in providersSubscriptionsData) {
            if (!subscriptionsViewData) {
                subscriptionsViewData = providersSubscriptionsData[provider];
            }
            else {
                const data: NotificationContracts.NotificationSubscriptionsViewData = providersSubscriptionsData[provider];
                subscriptionsViewData.eventTypes = this._concatDictionaries(subscriptionsViewData.eventTypes, data.eventTypes);
                subscriptionsViewData.mapCategoryIdToCategoryName = this._concatDictionaries(subscriptionsViewData.mapCategoryIdToCategoryName, data.mapCategoryIdToCategoryName);
                subscriptionsViewData.mapCategoryIdToSubscriptionTemplates = this._concatDictionaries(subscriptionsViewData.mapCategoryIdToSubscriptionTemplates, data.mapCategoryIdToSubscriptionTemplates);
                subscriptionsViewData.mapEventTypeToPublisherId = this._concatDictionaries(subscriptionsViewData.mapEventTypeToPublisherId, data.mapEventTypeToPublisherId);
                subscriptionsViewData.publishers = this._concatDictionaries(subscriptionsViewData.publishers, data.publishers);
                subscriptionsViewData.scopes = this._concatDictionaries(subscriptionsViewData.scopes, data.scopes);
                subscriptionsViewData.subscriptions = this._concatSubscriptionsArrays(subscriptionsViewData.subscriptions, data.subscriptions, subscriptionsViewData.mapEventTypeToPublisherId);
                subscriptionsViewData.subscribers = this._concatDictionaries(subscriptionsViewData.subscribers, data.subscribers);
            }
        }

        return subscriptionsViewData;
    }

    private _concatSubscriptionsArrays(subs1: NotificationContracts.NotificationSubscription[], subs2: NotificationContracts.NotificationSubscription[], mapEventTypeToPublisherId: { [key: string]: string; }) {
        let concatenatedSubscriptionsList: NotificationContracts.NotificationSubscription[] = []
        if (!subs1) {
            return subs2;
        }

        if (!subs2) {
            return subs1;
        }

        for (let index in subs2) {
            let exists: boolean = false;
            let publisherId = mapEventTypeToPublisherId[subs2[index].filter.eventType];
            for (let index2 in subs1) {
                if (subs2[index].id === subs1[index2].id && mapEventTypeToPublisherId[subs1[index2].filter.eventType] === publisherId) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                concatenatedSubscriptionsList.push(subs2[index]);
            }
        }
        return concatenatedSubscriptionsList.concat(subs1);
    }

    private _concatDictionaries(dictionary1, dictionary2) {
        if (!dictionary1) {
            return dictionary2;
        }
        if (!dictionary2) {
            return dictionary1;
        }
        for (let key in dictionary2) {
            // avoid duplicate values
            if (!dictionary1.hasOwnProperty(key)) {
                dictionary1[key] = dictionary2[key];
            }
        }
        
        return dictionary1;
    }
}
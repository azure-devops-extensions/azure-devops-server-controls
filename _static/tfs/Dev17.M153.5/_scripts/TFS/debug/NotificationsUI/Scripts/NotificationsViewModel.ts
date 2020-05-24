/// <reference types="jquery" />
import "VSS/LoaderPlugins/Css!Notifications";

import Q = require("q");

// VSS
import Context = require("VSS/Context");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import Dialogs = require("VSS/Controls/Dialogs");
import Telemetry = require("VSS/Telemetry/Services");

// Notifications
import NotifContracts = require("Notifications/Contracts");
import NotifRestClient = require("Notifications/RestClient");

// Notifications UI
import NotifResources = require("NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI");

///////////////////////////////////////////////////////////////////////////////
// NotificationsViewModel
///////////////////////////////////////////////////////////////////////////////

export class NotificationsViewModel {

    private _webContext: any;

    private _data: NotifContracts.NotificationSubscriptionsViewData;
    private _commonData: NotifContracts.NotificationCommonViewData;

    private _mapEventTypeToPublisherId: { [key: string]: string };
    private _mapProjectIdToProjectName: { [key: string]: string };
    private _mapProjectNameToProjectId: { [key: string]: string };
    private _mapEventTypeToEventInfo: { [key: string]: NotifContracts.NotificationEventType };
    private _mapPublisherIdToPublisher: { [key: string]: NotifContracts.NotificationEventPublisher };
    private _mapEventCategoryIdToSubscriptionTemplates: { [key: string]: NotifContracts.NotificationSubscriptionTemplate[] };
    private _categories: NotifContracts.NotificationEventTypeCategory[];
    private _sortedProjectNames: string[];

    constructor(data: NotifContracts.NotificationSubscriptionsViewData, commonData: NotifContracts.NotificationCommonViewData) {
        this._data = data;
        this._commonData = commonData; 

        this._mapEventCategoryIdToSubscriptionTemplates = data.mapCategoryIdToSubscriptionTemplates;
        this._mapEventTypeToPublisherId = data.mapEventTypeToPublisherId;
        this._mapEventTypeToEventInfo = data.eventTypes;
        this._mapEventCategoryIdToSubscriptionTemplates = data.mapCategoryIdToSubscriptionTemplates;

        // Create project map from available scopes
        this._mapProjectIdToProjectName = {};
        this._mapProjectNameToProjectId = {};
        this._sortedProjectNames = [];

        $.each(data.scopes, (i: number, scope: NotifContracts.SubscriptionScope) => {
            this._mapProjectIdToProjectName[scope.id] = scope.name;
            this._mapProjectNameToProjectId[scope.name] = scope.id;
            this._sortedProjectNames.push(scope.name);
        });

        this._sortedProjectNames.sort(Utils_String.localeIgnoreCaseComparer);

        // Order within a category is shared then custom.
        var sharedSubscriptions = [];
        var personalSubscriptions = [];

        this._mapPublisherIdToPublisher = {};
        $.each(data.publishers, (i: number, publisher: NotifContracts.NotificationEventPublisher) => {
            this._mapPublisherIdToPublisher[publisher.id] = publisher;
        });

        // Set the categories
        this._categories = [];

        $.each(this._data.mapCategoryIdToCategoryName, (id: string, name: string) => {
            this._categories.push(<NotifContracts.NotificationEventTypeCategory>{
                id: id,
                name: name
            });
        });

        this._webContext = Context.getDefaultWebContext();
    }

    public getCategories(): NotifContracts.NotificationEventTypeCategory[] {
        return this._categories;
    }

    public getSubscriberEmail(): string {
        return this._commonData.subscriberEmail;
    }

    public getAsciiOnlyAddresses(): boolean {
        return this._commonData.asciiOnlyAddresses;
    }

    public getSortedTeamProjectNames(): string[] {
        return this._sortedProjectNames;
    }

    public getTeamProjectName(projectId: string) {
        return this._mapProjectIdToProjectName[projectId];
    }

    public getTeamProjectId(projectName: string) {
        return this._mapProjectNameToProjectId[projectName];
    }

    public getEventInfo(eventType: string): NotifContracts.NotificationEventType {
        return this._mapEventTypeToEventInfo[eventType];
    }

    public getSubscriptionTemplates(categoryId: string): NotifContracts.NotificationSubscriptionTemplate[] {
        var templates = this._mapEventCategoryIdToSubscriptionTemplates[categoryId];
        return templates ? templates : [];
    }

    public createSubscription(subscription: NotifContracts.NotificationSubscription, successCallback, errorCallback) {
        this._createSubscription(subscription, successCallback, errorCallback);
    }

    public updateSubscription(oldSubscription: NotifContracts.NotificationSubscription, subscriptionPatch: NotifContracts.NotificationSubscription, successCallback, errorCallback) {
        this._updateSubscription(oldSubscription, subscriptionPatch, successCallback, errorCallback);
    }

        public deleteSubscription(subscription: NotifContracts.NotificationSubscription, successCallback) {
        var httpClient: NotifRestClient.NotificationHttpClient = this._getHttpClientForSubscription(subscription);
        httpClient.deleteSubscription(subscription.id).then(
            () => {
                if ($.isFunction(successCallback)) {
                    successCallback.call();
                }
            },
            (error) => {
                this._showMessage(error.message || error);
            });
    }

    public getFieldInputValues(subscription: NotifContracts.NotificationSubscription, field: NotifContracts.NotificationEventField, successCallback) {
        var inputValues: NotifContracts.FieldInputValues[] = [];
        if (field) {
            var inputValue: NotifContracts.FieldInputValues = <NotifContracts.FieldInputValues>{
                inputId: field.id
            };
            inputValues.push(inputValue);
        }

        var fieldValuesQuery: NotifContracts.FieldValuesQuery = <NotifContracts.FieldValuesQuery>{ scope: subscription.scope ? subscription.scope.id : null, inputValues: inputValues };
        var httpClient: NotifRestClient.NotificationHttpClient = this._getHttpClientForSubscription(subscription);
        httpClient.queryEventTypes(fieldValuesQuery, subscription.filter.eventType).then(
            (values: NotifContracts.NotificationEventField[]) => {
                if ($.isFunction(successCallback)) {
                    successCallback.call(this, values);
                }
            },
            (error) => {
                this._showMessage(error.message || error);
            });
    }

    public getSubscriber(): VSS_Common_Contracts.IdentityRef {
        return this._commonData.subscriberIdentity;
    }

    public getNotificationSubscriber(): NotifContracts.NotificationSubscriber{
        return this._commonData.subscriber;
    }

    public hasManagePermission(): boolean {
        return this._commonData.hasManagePermission;
    }

    public isAdminMode(): boolean {
        return this._commonData.isAdminMode;
    }

    public isSharedSubscription(subscription: NotifContracts.NotificationSubscription): boolean {
        return (subscription && subscription.subscriber && subscription.subscriber.isContainer);
    }

    public isDefaultSubscription(subscription: NotifContracts.NotificationSubscription): boolean {
        return subscription && subscription.id && isNaN(parseInt(subscription.id));
    }

    public isEnabled(subscription: NotifContracts.NotificationSubscription): boolean {
        if (this.isAdminMode()) {
            return subscription.status >= 0;
        }
        else {
            return this._effectiveStatus(subscription) >= 0;
        }
    }

    public canToggleSubscriptionState(subscription: NotifContracts.NotificationSubscription): boolean {
        if (this.isAdminMode() || !this.isSharedSubscription(subscription)) {
            return true;
        }

        return (subscription.flags & NotifContracts.SubscriptionFlags.CanOptOut) == NotifContracts.SubscriptionFlags.CanOptOut;
    }

    public canEdit(subscription: NotifContracts.NotificationSubscription): boolean {
        if (!this.isAdminMode() && this.isSharedSubscription(subscription)) {
            // can only edit shared subscriptions when in admin mode
            return false;
        }

        return true;
    }

    public canDelete(subscription: NotifContracts.NotificationSubscription): boolean {
        if (!this.isAdminMode() && this.isSharedSubscription(subscription)) {
            // can only delete team subscriptions when in admin mode
            return false;
        }

        return true;
    }

    public getScopeName(subscription: NotifContracts.NotificationSubscription): string {
        // return empty if any of the expected values are missing
        if (!subscription) {
            return "";
        }

        const scope = subscription.scope;
        if (!scope || scope.id == "00000000-0000-0000-0000-000000000000") {
            return NotifResources.AllProjects;
        }
        else {
            const projectName = this._mapProjectIdToProjectName[scope.id];
            return projectName ? projectName : "";
        }
    }

    public getSubscriptionStateText(subscription: NotifContracts.NotificationSubscription): string {
        var status = this._effectiveStatus(subscription);

        switch (status) {
            case NotifContracts.SubscriptionStatus.DisabledAsDuplicateOfDefault:
                return NotifResources.DisabledAsDuplicateOfDefault;
            case NotifContracts.SubscriptionStatus.DisabledByAdmin:
                return NotifResources.DisabledByAdmin;
            case NotifContracts.SubscriptionStatus.Disabled:
                return NotifResources.DisabledByUser;
            case NotifContracts.SubscriptionStatus.DisabledInvalidPathClause:
                return NotifResources.DisabledInvalidPathClause;
            case NotifContracts.SubscriptionStatus.Enabled:
                return NotifResources.Enabled;
            case NotifContracts.SubscriptionStatus.EnabledOnProbation:
                return NotifResources.EnabledOnProbation;
        }

        if (status >= 0) {
            return NotifResources.Enabled;
        }
        else {
            return NotifResources.Disabled;
        }
    }

        private _showConfirmationDialog(msg: string, successCallback, errorCallback) {
        Dialogs.MessageDialog.showMessageDialog(msg,
            {
                buttons: [Dialogs.MessageDialog.buttons.ok, Dialogs.MessageDialog.buttons.cancel]
            }).then(() => {
                if ($.isFunction(successCallback)) {
                    successCallback.call(this);
                }
            },
            () => {
                if ($.isFunction(errorCallback)) {
                    errorCallback.call(this);
                }
            });
    }

    private _createSubscription(subscription: NotifContracts.NotificationSubscription, successCallback, errorCallback) {
        var httpClient = this._getHttpClientForSubscription(subscription);
        httpClient.createSubscription(subscription).then(
            (savedSubscription: NotifContracts.NotificationSubscription) => {
                this._publishCIData("subscriptionCreated", subscription);
                if ($.isFunction(successCallback)) {
                    successCallback.call(this, savedSubscription);
                }
            },
            (error) => {
                this._showMessage(error.message || error);
                if ($.isFunction(errorCallback)) {
                    errorCallback.call(this);
                }
            });
    }

    private _publishCIData(stage: string, subscription?: NotifContracts.NotificationSubscription, jobId?: string) {
        var ciData: IDictionaryStringTo<any> = {};

        if (subscription) {
            ciData["EventType"] = subscription.filter.eventType;
            ciData["Subscriber"] = subscription.subscriber.id;
            ciData["SubscriptionId"] = subscription.id;
        }

        if (jobId) {
            ciData["JobId"] = jobId;
        }

        ciData["Stage"] = stage;

        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                customerIntelligenceArea,
                customerIntelligenceFeature,
                ciData));
    }

    private _showMessage(message: string) {
        return Dialogs.MessageDialog.showMessageDialog(message, {
            buttons: [Dialogs.MessageDialog.buttons.ok]
        });
    }
        
    private _updateSubscription(oldSubscription: NotifContracts.NotificationSubscription, subscriptionPatch: NotifContracts.NotificationSubscription, successCallback, errorCallback) {
        var httpClient = this._getHttpClientForSubscription(oldSubscription);
        httpClient.updateSubscription(subscriptionPatch, oldSubscription.id).then(
            (savedSubscription: NotifContracts.NotificationSubscription) => {
                this._publishCIData("subscriptionUpdated", subscriptionPatch);
                if ($.isFunction(successCallback)) {
                    successCallback.call(this, savedSubscription);
                }
            },
            (error) => {
                this._showMessage(error.message || error);
                if ($.isFunction(errorCallback)) {
                    errorCallback.call();
                }
            }
        );
    }

    private _effectiveStatus(subscription: NotifContracts.NotificationSubscription): NotifContracts.SubscriptionStatus {
        var status = subscription.status;

        if (status >= NotifContracts.SubscriptionStatus.Enabled) {
            if (subscription.userSettings && subscription.userSettings.optedOut) {
                status = NotifContracts.SubscriptionStatus.Disabled;
            }
        }
        return status;
    }

    private _getHttpClientForSubscription(subscription: NotifContracts.NotificationSubscription): NotifRestClient.NotificationHttpClient {
        var publisherId = this._mapEventTypeToPublisherId[subscription.filter.eventType];
        var publisher = this._mapPublisherIdToPublisher[publisherId];
        var serviceInstanceId = publisher.subscriptionManagementInfo.serviceInstanceType;
        return Service.VssConnection.getConnection().getHttpClient(NotifRestClient.NotificationHttpClient, serviceInstanceId);
    }
}

const customerIntelligenceArea = "Notifications";
const customerIntelligenceFeature = "EvaluateSubscription";
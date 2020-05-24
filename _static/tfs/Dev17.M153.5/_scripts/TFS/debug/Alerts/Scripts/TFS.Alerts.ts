//Auto converted from Alerts/Scripts/TFS.Alerts.debug.js

/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Events_Document = require("VSS/Events/Document");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import AlertsResources = require("Alerts/Scripts/Resources/TFS.Resources.Alerts");
import TFS_Host_UI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");

var queueRequest = VSS.queueRequest;


export class AlertsScope {

    public static My: number = 0;
    public static Team: number = 1;
    public static All: number = 2;

    constructor() {
    }
}



export class SubscriptionType {

    public static Unknown: number = 0;
    public static WorkItemChangedEvent: number = 1;
    public static CheckinEvent: number = 2;
    public static BuildCompletionEvent: number = 3;
    public static BuildCompletionEvent2: number = 4;
    public static BuildStatusChangeEvent: number = 5;
    public static BuildResourceChangedEvent: number = 6;
    public static CodeReviewChangedEvent: number = 7;
    public static BuildCompletedEvent: number = 8;
    public static GitPushEvent: number = 9;
    public static GitPullRequestEvent: number = 10;

    constructor() {
    }
}



export class AlertAdapter {

    private static _adapters: any = null;

    public static getAdapter(subscriptionType) {

        if (!this._adapters) {

            this._adapters = {};
            this._adapters[SubscriptionType.WorkItemChangedEvent] = new WorkItemChangedAlertAdapter();
            this._adapters[SubscriptionType.CheckinEvent] = new CheckinAlertAdapter();
            this._adapters[SubscriptionType.GitPushEvent] = new GitPushAlertAdapter();
            this._adapters[SubscriptionType.GitPullRequestEvent] = new GitPullRequestAlertAdapter();
            this._adapters[SubscriptionType.BuildCompletionEvent] = new BuildCompletionAlertAdapter();
            this._adapters[SubscriptionType.BuildCompletionEvent2] = new BuildCompletion2AlertAdapter();
            this._adapters[SubscriptionType.BuildStatusChangeEvent] = new BuildStatusChangedAlertAdapter();
            this._adapters[SubscriptionType.BuildResourceChangedEvent] = new BuildResourceChangedAlertAdapter();
            this._adapters[SubscriptionType.CodeReviewChangedEvent] = new CodeReviewChangedAlertAdapter();
            this._adapters[SubscriptionType.BuildCompletedEvent] = new BuildCompletedAlertAdapter();
            this._adapters[SubscriptionType.Unknown] = new UnknownAlertAdapter();
        }

        return this._adapters[subscriptionType];
    }

    private _subscriptionType: number;
    private _fields: any;

    constructor(subscriptionType) {
        this._subscriptionType = subscriptionType;
    }

    public beginGetFilterFields(alertsManager, callback, errorCallback?) {
        queueRequest(this, this, "_fields", callback, errorCallback, function (succeeded, failed) {
            alertsManager.getFilterFields(this._subscriptionType, function (fields) {
                succeeded(fields);
            }, failed);
        });
    }

    public getFilterFieldByName(alertsManager, fieldName, callback, errorCallback?) {
        var i, l;
        this.beginGetFilterFields(alertsManager, function (fields) {
            for (i = 0, l = fields.length; i < l; i++) {
                if (Utils_String.localeIgnoreCaseComparer(fields[i].fieldName, fieldName) === 0) {
                    callback(fields[i]);
                    return;
                }
            }
            callback(null);
        }, errorCallback);
    }

    public getCategoryName(): string {
        /// <returns type="string" />
        return "CategoryName";
    }
}

VSS.initClassPrototype(AlertAdapter, {
    _subscriptionType: 0,
    _fields: null
});



class WorkItemChangedAlertAdapter extends AlertAdapter {

    constructor() {
        super(SubscriptionType.WorkItemChangedEvent);
    }

    public getCategoryName(): string {
        /// <returns type="string" />

        return AlertsResources.CategoryWorkItem;
    }
}



class CheckinAlertAdapter extends AlertAdapter {

    constructor() {
        super(SubscriptionType.CheckinEvent);
    }

    public getCategoryName(): string {
        /// <returns type="string" />

        return AlertsResources.CategoryCheckin;
    }
}

class GitPushAlertAdapter extends AlertAdapter {

    constructor() {
        super(SubscriptionType.GitPushEvent);
    }

    public getCategoryName(): string {
        /// <returns type="string" />
        return AlertsResources.CategoryGitPush;
    }
}

class GitPullRequestAlertAdapter extends AlertAdapter {

    constructor() {
        super(SubscriptionType.GitPullRequestEvent);
    }

    public getCategoryName(): string {
        /// <returns type="string" />
        return AlertsResources.CategoryGitPullRequest;
    }
}


class BuildCompletionAlertAdapter extends AlertAdapter {

    constructor() {
        super(SubscriptionType.BuildCompletionEvent);
    }

    public getCategoryName(): string {
        /// <returns type="string" />

        return AlertsResources.CategoryBuild;
    }
}



class BuildCompletion2AlertAdapter extends AlertAdapter {

    constructor() {
        super(SubscriptionType.BuildCompletionEvent2);
    }

    public getCategoryName(): string {
        /// <returns type="string" />

        return AlertsResources.CategoryBuild;
    }
}



class BuildCompletedAlertAdapter extends AlertAdapter {

    constructor() {
        super(SubscriptionType.BuildCompletedEvent);
    }

    public getCategoryName(): string {
        /// <returns type="string" />

        return AlertsResources.CategoryBuild;
    }
}



class BuildStatusChangedAlertAdapter extends AlertAdapter {

    constructor() {
        super(SubscriptionType.BuildStatusChangeEvent);
    }

    public getCategoryName(): string {
        /// <returns type="string" />

        return AlertsResources.CategoryBuild;
    }
}



class BuildResourceChangedAlertAdapter extends AlertAdapter {

    constructor() {
        super(SubscriptionType.BuildResourceChangedEvent);
    }

    public getCategoryName(): string {
        /// <returns type="string" />

        return AlertsResources.CategoryBuild;
    }
}



class CodeReviewChangedAlertAdapter extends AlertAdapter {

    constructor() {
        super(SubscriptionType.CodeReviewChangedEvent);
    }

    public getCategoryName(): string {
        /// <returns type="string" />

        return AlertsResources.CategoryCodeReview;
    }
}



class UnknownAlertAdapter extends AlertAdapter {

    constructor() {
        super(SubscriptionType.Unknown);
    }

    public getCategoryName(): string {
        /// <returns type="string" />

        return AlertsResources.CategoryUnknown;
    }
}



export class DeliveryType {

    private static _names: any = null;

    public static HTML: number = 0;
    public static PlainText: number = 1;
    public static SOAP: number = 2;
    public static ServiceHooks: number = 5;

    public static getName(type): string {
        /// <returns type="string" />

        var names;

        if (!DeliveryType._names) {
            names = {};
            names[DeliveryType.HTML] = AlertsResources.DeliveryTypeEmailHtml;
            names[DeliveryType.PlainText] = AlertsResources.DeliveryTypeEmailPlainText;
            names[DeliveryType.SOAP] = AlertsResources.DeliveryTypeSoap;
            DeliveryType._names = names;
        }
        return DeliveryType._names[type];
    }

    constructor() {
    }
}



export class DeliverySchedule {

    private static _names: any = null;

    public static Immediate: number = 0;
    public static Daily: number = 1;
    public static Weekly: number = 2;

    public static getName(schedule): string {
        /// <returns type="string" />

        var names;

        if (!DeliverySchedule._names) {
            names = {};
            names[DeliverySchedule.Immediate] = AlertsResources.DeliveryScheduleImmediate;
            names[DeliverySchedule.Daily] = AlertsResources.DeliveryScheduleDaily;
            names[DeliverySchedule.Weekly] = AlertsResources.DeliveryScheduleWeekly;
            DeliverySchedule._names = names;
        }
        return DeliverySchedule._names[schedule];
    }

    constructor() {
    }
}

export interface IAlert {
    id: number;
    eventTypeName: string;
    subscriptionType: any;
    name: string;
    deliveryPreference: {
        address: string;
        schedule: DeliverySchedule;
        type: DeliveryType;
    }
    subscriberId: string;
    ownerId: string;
    filter: {
        maxGroupLevel: number;
        clauses: any[];
        groups: any[];
    };
    metadata: {
        templateTag: string;
        parameters: any;
        isEnabled: boolean;
    };
    categoryName: string;
    adapter: AlertAdapter;
    basicTemplateTag: string;
}


export class AlertsManager extends TFS_Service.TfsService {

    private _alerts: any;
    private _alertIdsByUser: any;
    private _alertIdsByScope: any;
    private _alertIdsByChatRoom: any;
    private _alertIdsByClassification: any;
    private _subscribers: any;
    private _basicTemplates: any;
    private _customTemplates: any;
    private _myCustomNotificationAddressInfo: any;

    public tfsProjectCollection: any;
    public apiLocation: any;

    constructor() {
        super();

        Events_Document.getRunningDocumentsTable().add("AlertsManager", this);

        this._alertIdsByChatRoom = {};
        this._alertIdsByClassification = {};
        this._alerts = {};
        this._alertIdsByUser = {};
        this._alertIdsByScope = {};
        this._subscribers = {};
    }

    public getApiLocation(action?: string) {
        /// <param name="action" type="string" optional="true" />
        return this.getTfsContext().getActionUrl(action || "", "alerts", { area: "api" });
    }

    public isDirty(): boolean {
        return this.getDirtyAlerts().length > 0;
    }

    public getAlerts(scope: AlertsScope, includeTeamAlerts: boolean, callback: IResultCallback, errorCallback?: IErrorCallback, refreshCache?: boolean) {
        /// <summary>Gets the subscriptions at the specified scope</summary>
        /// <param name="scope" type="AlertsScope">Scope of subscriptions to return</param>
        /// <param name="callback" type="IResultCallback">Callback to execute whenever API call succeeds</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback to execute whenever API call fails</param>

        var that = this;
        this._ensureAlertsAtScope(scope, includeTeamAlerts, function (alertIds) {
            if ($.isFunction(callback)) {
                callback.call(that, that._getCachedAlertsByIds(alertIds));
            }
        }, errorCallback,
            typeof refreshCache === "undefined" ? false : refreshCache);
    }

    public getAlertsForClassification(classification: string, callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Gets the subscriptions for a given classification</summary>
        /// <param name="classification" type="string">Classification</param>
        /// <param name="callback" type="IResultCallback">Callback to execute whenever API call succeeds</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback to execute whenever API call fails</param>

        var that = this;
        this._ensureAlertsForClassification(classification, function (alertIds) {
            if ($.isFunction(callback)) {
                callback.call(that, that._getCachedAlertsByIds(alertIds));
            }
        }, errorCallback);
    }

    public getAlertsForUser(userId, callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Gets the subscriptions for the specified user (individual and team scoped)</summary>
        /// <param name="callback" type="IResultCallback">Callback to execute whenever API call succeeds</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback to execute whenever API call fails</param>

        var that = this;
        this._ensureAlertsForUser(userId, function (alertIds) {
            if ($.isFunction(callback)) {
                callback.call(that, that._getCachedAlertsByIds(alertIds));
            }
        }, errorCallback);
    }

    public getSubscriber(teamFoundationId) {
        return this._subscribers[teamFoundationId];
    }

    public getBasicTemplates(callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Gets the custom templates for new alerts</summary>
        /// <param name="callback" type="IResultCallback">Callback to execute whenever API call succeeds</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback to execute whenever API call fails</param>
        var i, l, template;
        queueRequest(this, this, "_basicTemplates", callback, errorCallback, function (succeeded, failed) {
            this._ajaxJson("GetBasicSubscriptionTemplates", {}, function (templates: IAlert[]) {
                for (i = 0, l = templates.length; i < l; i++) {
                    template = templates[i];
                    template.adapter = AlertAdapter.getAdapter(template.subscriptionType);
                    template.categoryName = template.adapter.getCategoryName();
                }
                succeeded(templates);
            }, failed);
        });
    }

    public getCustomTemplates(callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Gets the custom templates for new alerts</summary>
        /// <param name="callback" type="IResultCallback">Callback to execute whenever API call succeeds</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback to execute whenever API call fails</param>
        var i, l, template;
        queueRequest(this, this, "_customTemplates", callback, errorCallback, function (succeeded, failed) {
            this._ajaxJson("GetCustomSubscriptionTemplates", {}, function (templates: IAlert[]) {
                for (i = 0, l = templates.length; i < l; i++) {
                    template = templates[i];
                    template.adapter = AlertAdapter.getAdapter(template.subscriptionType);
                    template.categoryName = template.adapter.getCategoryName();
                }
                succeeded(templates);
            }, failed);
        });
    }

    public getChatRoomTemplates(callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Gets the custom templates for new alerts</summary>
        /// <param name="callback" type="IResultCallback">Callback to execute whenever API call succeeds</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback to execute whenever API call fails</param>
        var i, l, template;
        queueRequest(this, this, "_chatRoomTemplates", callback, errorCallback, function (succeeded, failed) {
            this._ajaxJson("GetChatRoomSubscriptionTemplates", {}, function (templates) {
                for (i = 0, l = templates.length; i < l; i++) {
                    template = templates[i];
                    template.adapter = AlertAdapter.getAdapter(template.subscriptionType);
                    template.categoryName = template.adapter.getCategoryName();
                }
                succeeded(templates);
            }, failed);
        });
    }

    public setMyCustomNotificationAddress(address, callback, errorCallback?) {
        var that = this, subscriber;
        this._ajaxPost("SetCustomNotificationAddress", { customNotificationAddress: address }, function (addressInfo) {
            that._myCustomNotificationAddressInfo = addressInfo;
            subscriber = that.getSubscriber(that.getTfsContext().currentIdentity.id);
            if (subscriber) {
                subscriber.email = addressInfo.customAddress;
            }
            if ($.isFunction(callback)) {
                callback.call(that, addressInfo.customAddress);
            }
        }, errorCallback);
    }

    public getMyNotificationAddress(callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Gets a string containing the notification address for the current user (custom or default)</summary>
        /// <param name="callback" type="IResultCallback">Callback to execute whenever API call succeeds</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback to execute whenever API call fails</param>
        var addressString;
        this._getMyCustomNotificationAddressInfo(function (customAddressInfo) {
            if ($.isFunction(callback)) {
                if (customAddressInfo.customAddress || customAddressInfo.customAddress === "") {
                    addressString = customAddressInfo.customAddress;
                }
                else {
                    addressString = this.getTfsContext().currentIdentity.email;
                }
                callback.call(this, addressString);
            }
        }, errorCallback);
    }

    public createNewAlertFromTemplate(template, scope, subscriberId): IAlert {
        var newAlert: IAlert,
            tfsContext,
            team;

        newAlert = <any>{};
        newAlert.id = 0;
        newAlert.eventTypeName = template.eventTypeName;
        newAlert.subscriptionType = template.subscriptionType;
        newAlert.name = template.defaultName;
        newAlert.deliveryPreference = {
            address: null,
            schedule: DeliverySchedule.Immediate,
            type: DeliveryType.HTML
        };
        
        tfsContext = this.getTfsContext();
        team = tfsContext.currentTeam;
        newAlert.ownerId = tfsContext.currentIdentity.id;
        if (subscriberId) {
            newAlert.subscriberId = subscriberId;
        }
        else if (scope === AlertsScope.Team && team) {
            newAlert.subscriberId = team.identity.id;
        }
        else {
            newAlert.subscriberId = tfsContext.currentIdentity.id;
        }

        newAlert.filter = this._cloneFilter(template.filter);
        this._extendSubsubscription(newAlert);

        return newAlert;
    }

    public getFilterFields(subscriptionType: SubscriptionType, callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Gets the fields for the specified subscription type</summary>
        /// <param name="subscriptionType" type="SubscriptionType">Type of subscription</param>
        /// <param name="callback" type="IResultCallback">Callback to execute whenever API call succeeds</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback to execute whenever API call fails</param>

        this._ajaxJson("GetSubscriptionFilterFields", { type: subscriptionType }, callback, errorCallback);
    }

    public getDirtyAlerts() {
        var dirtyAlerts = [];
        if (this._alerts) {
            $.each(this._alerts, function (i, _alert) {
                if (_alert.dirty) {
                    dirtyAlerts.push(_alert);
                }
            });
        }
        return dirtyAlerts;
    }

    public validateAlert(alert: any): string[] {
        var errors: string[] = [];

        for (var iterClause in alert.filter.clauses) {
            var clause = alert.filter.clauses[iterClause];
            if (clause.fieldName !== "") {
                alert.adapter.getFilterFieldByName(this, clause.fieldName, function (field) {
                    if (!field) {
                        errors.push(Utils_String.format(AlertsResources.InvalidField, clause.fieldName));
                    }
                    else {
                        var opFound: boolean = false;
                        for (var iterOp in field.operators) {
                            if (clause.operator === field.operators[iterOp]) {
                                opFound = true;
                                break;
                            }
                        }
                        if (!opFound) {
                            errors.push(Utils_String.format(AlertsResources.InvalidOperator, clause.operator));
                        }
                    }
                }, (e) => {
                        errors.push(e);
                    });
            }
        }

        return errors;
    }

    public saveDirtyAlerts(callback, errorCallback?, warningCallback?, validateAlerts?: boolean) {
        var alertsToSave = this.getDirtyAlerts();
        if (alertsToSave.length === 0) {
            if (jQuery.isFunction(callback)) {
                callback.call(this, []);
            }
        }
        else {
            this.saveAlerts(alertsToSave, callback, errorCallback, warningCallback, validateAlerts);
        }
    }

    public saveAlerts(alertsToSave, callback, errorCallback?, warningCallback?, validateAlerts?: boolean) {
        var result, i, l, preSaveAlert, errors = [], warnings = [], that = this;

        if (validateAlerts) {
            for (var iter = 0; iter < alertsToSave.length; iter++) {
                errors = errors.concat(this.validateAlert(alertsToSave[iter]));
            }
            if (errors.length > 0) {
                errorCallback(errors.join("\n"));
                return;
            }
        }


        this._ajaxPost("saveSubscriptions", {
            subscriptionsJson: this.getAlertsJsonForPost(alertsToSave), skipWarning: !validateAlerts
        }, function (results) {
                var j = 0;
                for (i = 0, l = alertsToSave.length; i < l; i++) {
                    result = results[i];
                    preSaveAlert = alertsToSave[j];

                    if (result.lastError) {
                        errors.push(result.lastError);
                    }
                    else
                        if (result.lastWarning) {
                            warnings.push(result.lastWarning);
                        }
                        else {
                            // remove the saved alert so that if there are warning we don't reattempt to save it
                            var alertIndex = alertsToSave.indexOf(preSaveAlert);
                            if (alertIndex !== -1) {
                                j--;
                                alertsToSave.splice(alertIndex, 1);
                                preSaveAlert.dirty = false;
                            }

                            if (preSaveAlert) {
                                if (preSaveAlert.id || !validateAlerts) {
                                    if (!validateAlerts && !preSaveAlert.id) {
                                        that._removeCachedAlert(result.id);
                                    }
                                    else {
                                        that._removeCachedAlert(preSaveAlert.id);
                                    }
                                }
                                preSaveAlert.id = result.id;
                                preSaveAlert.projectId = result.projectId;
                                if (!that._alerts[result.id]) {
                                    that._addNewCachedAlert(preSaveAlert);
                                }
                            }
                        }
                    j++;
                }

                $(window).trigger("managed-alerts-updated", { alerts: that._alerts });
                that._handleCallbackErrors(errors, AlertsResources.AlertSaveErrorFormat, errorCallback);
                that._handleCallbackWarnings(warnings, results, alertsToSave, callback, warningCallback, errorCallback);
            }, errorCallback);
    }

    public deleteAlerts(alertsToDelete, callback, errorCallback?) {
        var that = this;

        this._ajaxPost("deleteSubscriptions", { alertsToDeleteJson: this.getAlertsJsonForPost(alertsToDelete) }, function (errorModel) {

            $.each(alertsToDelete, function (i, _alert) {
                if (!Utils_Array.contains(errorModel.idsWithErrors, _alert.id)) {
                    that._removeCachedAlert(_alert.id);
                }
            });
            $(window).trigger("managed-alerts-updated", { alerts: that._alerts });
            that._handleCallbackErrors(errorModel.errors, AlertsResources.AlertDeleteErrorFormat, errorCallback, callback);
        }, errorCallback);
    }

    public revertAlerts(scope, userId, alertsToRevert, callback, errorCallback?) {
        var that = this, i, j, l1, l2, alertToRevert;

        this._ajaxJson("subscriptions", { scope: scope}, function (model) {

            for (i = 0, l1 = alertsToRevert.length; i < l1; i++) {
                alertToRevert = alertsToRevert[i];
                for (j = 0, l2 = model.subscriptions.length; j < l2; j++) {
                    if (alertToRevert.id === model.subscriptions[j].id) {
                        $.extend(alertToRevert, model.subscriptions[j]);
                        break;
                    }
                }
                alertToRevert.dirty = false;
            }

            callback(alertsToRevert);
            $(window).trigger("managed-alerts-updated", { alerts: that._alerts });

        }, errorCallback);
    }

    public getAlertsJsonForPost(alerts) {
        var i, l,
            alertsForPost = [],
            alertForPost;

        for (i = 0, l = alerts.length; i < l; i++) {
            alertForPost = $.extend({}, alerts[i]);
            alertForPost.category = null;
            alertForPost.adapter = null;
            alertsForPost.push(Utils_Core.stringifyMSJSON(alertForPost));
        }
        return alertsForPost;
    }

    public getCachedAlertsCountForScope(scope) {
        var ids = this._alertIdsByScope[scope];
        return $.isArray(ids) ? ids.length : 0;
    }

    public getCachedAlertsCountForUser(userId) {
        var ids = this._alertIdsByUser[userId];
        return $.isArray(ids) ? ids.length : 0;
    }

    public getCachedAlertsCountForChatRoom(roomId) {
        var ids = this._alertIdsByChatRoom[roomId];
        return $.isArray(ids) ? ids.length : 0;
    }

    public getCachedScopes() {
        var scopes = [];
        $.each(this._alertIdsByScope, function (scope, val) {
            if ($.isArray(val)) {
                scopes.push(scope - 0);
            }
        });
        return scopes;
    }

    public getCachedUsers() {
        var userIds = [];
        $.each(this._alertIdsByUser, function (userId, val) {
            if ($.isArray(val)) {
                userIds.push(userId);
            }
        });
        return userIds;
    }

    public getCachedChatRooms() {
        var roomIds = [];
        $.each(this._alertIdsByChatRoom, function (roomId, val) {
            if ($.isArray(val)) {
                roomIds.push(roomId);
            }
        });
        return roomIds;
    }

    public getCachedClassifications(): string[] {
        var classifications: string[] = [];
        $.each(this._alertIdsByClassification, function (classification: string, val) {
            if ($.isArray(val)) {
                classifications.push(classification);
            }
        });
        return classifications;
    }

    public dropAlertResultsForScope(scope) {
        delete this._alertIdsByScope[scope];
    }

    public dropAlertResultsForUser(userId) {
        var cache = this._alertIdsByUser[userId];
        if ($.isArray(cache)) {
            delete this._alertIdsByUser[userId];
        }
    }

    public dropAlertResultsForChatRoom(roomId) {
        var cache = this._alertIdsByChatRoom[roomId];
        if ($.isArray(cache)) {
            delete this._alertIdsByChatRoom[roomId];
        }
    }

    public dropAlertResultsForClassification(classification: string) {
        var cache = this._alertIdsByClassification[classification];
        if ($.isArray(cache)) {
            delete this._alertIdsByClassification[classification];
        }
    }

    public dropCachedAlerts() {
        var that = this;
        this._alerts = {};
        $.each(this.getCachedScopes(), function (i, scope) {
            delete that._alertIdsByScope[scope];
        });
        $.each(this.getCachedUsers(), function (i, userId) {
            delete that._alertIdsByUser[userId];
        });
        $.each(this.getCachedChatRooms(), function (i, roomId) {
            delete that._alertIdsByChatRoom[roomId];
        });
        $.each(this.getCachedClassifications(), function (i, classification) {
            delete that._alertIdsByClassification[classification];
        });
    }

    private _ajaxJson(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />

        Ajax.getMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback, ajaxOptions);
    }

    private _ajaxPost(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />

        Ajax.postMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback, ajaxOptions);
    }

    private _ensureAlertsAtScope(scope, includeTeamsAlerts: boolean, callback, errorCallback?, refreshCache?: boolean) {
        var that = this;

        refreshCache = typeof refreshCache === "undefined" ? false : refreshCache;
        if (refreshCache == true) {
            //delete all entries in the cache so that it is refreshed
            this._alertIdsByScope[scope] = null;
        }

        queueRequest(this, this._alertIdsByScope, scope, callback, errorCallback, function (succeeded, failed) {
            this._ajaxJson("subscriptions", { scope: scope, includeTeamsAlerts: includeTeamsAlerts}, function (model) {
                var resultIds = that._storeAlertResults(model);
                succeeded(resultIds);
                $(window).trigger("managed-alerts-updated", { alerts: that._alerts });
            }, failed);
        });
    }

    private _ensureAlertsForUser(userId, callback, errorCallback?) {
        var that = this;

        queueRequest(this, this._alertIdsByUser, userId, callback, errorCallback, function (succeeded, failed) {
            this._ajaxJson("subscriptions", { scope: AlertsScope.All, userId: userId }, function (model) {
                var resultIds = that._storeAlertResults(model);
                succeeded(resultIds);
                $(window).trigger("managed-alerts-updated", { alerts: that._alerts });
            }, failed);
        });
    }

    private _ensureAlertsForClassification(classification, callback, errorCallback?) {
        var that = this;

        queueRequest(this, this._alertIdsByClassification, classification, callback, errorCallback, function (succeeded, failed) {
            this._ajaxJson("subscriptions", { scope: AlertsScope.My, classification: classification }, function (model) {
                var resultIds = that._storeAlertResults(model);
                succeeded(resultIds);
                $(window).trigger("managed-alerts-updated", { alerts: that._alerts });
            }, failed);
        });
    }

    private _storeAlertResults(model) {
        var i, l, subscriber, subscription, resultIds = [];
        for (i = 0, l = model.subscribers.length; i < l; i++) {
            subscriber = model.subscribers[i];
            this._subscribers[subscriber.teamFoundationId] = subscriber;
        }

        for (i = 0, l = model.subscriptions.length; i < l; i++) {
            subscription = model.subscriptions[i];
            resultIds.push(subscription.id);
            if (!this._alerts[subscription.id]) {
                this._extendSubsubscription(subscription);
                this._alerts[subscription.id] = subscription;
            }
        }

        return resultIds;
    }

    private _getCachedAlertsByIds(alertIds) {
        var i, l, alerts = [], _alert;
        for (i = 0, l = alertIds.length; i < l; i++) {
            _alert = this._alerts[alertIds[i]];
            if (_alert) {
                alerts.push(_alert);
            }
        }
        return alerts;
    }

    private _getMyCustomNotificationAddressInfo(callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Gets the custom notification email address for the current user</summary>
        /// <param name="callback" type="IResultCallback">Callback to execute whenever API call succeeds</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback to execute whenever API call fails</param>
        queueRequest(this, this, "_myCustomNotificationAddressInfo", callback, errorCallback, function (succeeded, failed) {
            this._ajaxJson("GetCustomNotificationAddress", {}, succeeded, failed);
        });
    }

    private _addNewCachedAlert(newAlert) {
        var team, teamId;

        this._alerts[newAlert.id] = newAlert;

        if (newAlert.subscriberId === this.getTfsContext().currentIdentity.id) {
            this._addNewAlertToCache(this._alertIdsByScope[AlertsScope.My], newAlert.id);
        }
        else {
            team = this.getTfsContext().currentTeam;
            teamId = team && team.identity && team.identity.id;
            if (teamId && teamId === newAlert.subscriberId) {
                this._addNewAlertToCache(this._alertIdsByScope[AlertsScope.Team], newAlert.id);
            }
        }

        // update All scope
        this._addNewAlertToCache(this._alertIdsByScope[AlertsScope.All], newAlert.id);

        // update user cache
        this._addNewAlertToCache(this._alertIdsByUser[newAlert.subscriberId], newAlert.id);

        if (newAlert.tag) {
            // update classification cache
            this._addNewAlertToCache(this._alertIdsByClassification[newAlert.tag], newAlert.id);
        }
    }

    private _addNewAlertToCache(cache, newAlertId) {
        if ($.isArray(cache)) {
            cache.push(newAlertId);
        }
    }

    private _removeCachedAlert(alertId) {
        var that = this;
        delete this._alerts[alertId];
        $.each(this.getCachedScopes(), function (i, scope) {
            that._removeFromArray(that._alertIdsByScope[scope], alertId);
        });
        $.each(this.getCachedUsers(), function (i, userId) {
            that._removeFromArray(that._alertIdsByUser[userId], alertId);
        });
    }

    private _removeFromArray(array, value) {
        var index = $.inArray(value, array);
        if (index >= 0) {
            array.splice(index, 1);
        }
    }

    private _handleCallbackErrors(errors, errorFormat, errorCallback?, callback? ) {
        var i, l, errorDetails;

        if (errors.length > 0) {
            errorDetails = "";
            for (i = 0, l = errors.length; i < l; i++) {
                errorDetails += "\r\n" + errors[i];
            }
            errorDetails = Utils_String.format(errorFormat, errorDetails);

            if (jQuery.isFunction(errorCallback)) {
                errorCallback.call(this, errorDetails, errors);
            }
            else {
                VSS.errorHandler.show(new Error(errorDetails));
            }
        }
        else {
            if (jQuery.isFunction(callback)) {
                callback.call(this);
            }
        }
    }

    private _handleCallbackWarnings(warning, results, alertsToSave, callback, warningCallback?, errorCallback?) {
        if (warning && warning.length > 0) {
            var r = confirm(warning[0] + AlertsResources.SubscriptionSaveConfirmation);
            if (r === true) {
                this.saveAlerts(alertsToSave, callback, errorCallback, warningCallback, false);
            }
            else {
                if (warningCallback && jQuery.isFunction(warningCallback)) {
                    warningCallback.call();
                }
            }
        }
        else {
            if (jQuery.isFunction(callback)) {
                callback.call(this);
            }
        }
    }

    private _extendSubsubscription(subscription: any) {
        /// <summary>Extends the properties of a subscription returned by the server</summary>
        /// <param name="subscription" type="any" typeHint="SubscriptionModel">subscription to extend</param>

        subscription.adapter = AlertAdapter.getAdapter(subscription.subscriptionType);
        subscription.categoryName = subscription.adapter.getCategoryName();

        subscription.isValid = function () {
            return true;
        };
    }

    private _cloneFilter(filterToClone) {
        var i, l, newFilter = {
            maxGroupLevel: filterToClone.maxGroupLevel,
            clauses: [],
            groups: []
        };

        for (i = 0, l = filterToClone.clauses.length; i < l; i++) {
            newFilter.clauses.push($.extend({}, filterToClone.clauses[i]));
        }
        for (i = 0, l = filterToClone.groups.length; i < l; i++) {
            newFilter.groups.push($.extend({}, filterToClone.groups[i]));
        }

        return newFilter;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Alerts", exports);

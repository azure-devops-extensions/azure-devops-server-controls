import "VSS/LoaderPlugins/Css!WorkItemArea";

import Q = require("q");
import Diag = require("VSS/Diag");
import Events_Document = require("VSS/Events/Document");
import Events_Services = require("VSS/Events/Services");
import Utils_String = require("VSS/Utils/String");
import * as Utils_Date from "VSS/Utils/Date";
import VSS = require("VSS/VSS");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { ToolNames, ArtifactTypeNames } from "VSS/Artifacts/Constants";
import { BaseControl } from "VSS/Controls";
import { Dialog } from "VSS/Controls/Dialogs";
import { FullScreenHelper } from "VSS/Controls/Navigation";
import { domElem } from "VSS/Utils/UI";
import Service = require("VSS/Service");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { delegate, parseJsonIsland, Cancelable } from "VSS/Utils/Core";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { LinkingUtilities } from "VSS/Artifacts/Services";
import { CoreFieldRefNames, UnfollowResultStatus, FieldType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { WorkItem, WorkItemStore, WorkItemType, Project, IWorkItemChangedArgs } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { TelemetryEventData, publishEvent } from "VSS/Telemetry/Services";
import { IContributionWithSource, Contributions, ContributionService } from "WorkItemTracking/Scripts/Extensions/TFS.WorkItemTracking.Extensions";
import { IWorkItemNotificationListener, IWorkItemLoadedArgs } from "TFS/WorkItemTracking/ExtensionContracts";
import { getScenarioManager } from "VSS/Performance";
import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { WIFormCIDataHelper } from "WorkItemTracking/Scripts/Utils/WIFormCIDataHelper";
import { WorkItemDocument } from "WorkItemTracking/Scripts/Utils/WorkItemDocument";
import { WorkItemActions } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { WorkItemChangeType, ExtensionConstants } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { InitialValueHelper } from "WorkItemTracking/Scripts/Utils/InitialValueHelper";
import { ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import { PerformanceEvents, WITPerformanceScenario, WITCustomerIntelligenceArea, WITCustomerIntelligenceFeature, WITUserScenarioActions, WITPerformanceScenarioEvent } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { LoadingSpinnerOverlay } from "WorkItemTracking/Scripts/Controls/WorkItemForm/LoadingSpinnerOverlay";
import { WebPageDataService } from "VSS/Contributions/Services";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { WatchDogService } from "Presentation/Scripts/TFS/FeatureRef/TFS.WatchDogService";
import { TelemetryUtils } from "WorkItemTracking/Scripts/Utils/TelemetryUtils";

// Side effect import, to trigger permission initialization together with form code
import "WorkItemTracking/Scripts/Utils/WorkItemPermissionDataHelper";

const getErrorMessage = VSS.getErrorMessage;
const eventSvc = Events_Services.getService();

export interface IWorkItemViewBase {
    workItem: WorkItem;
    workItemType: WorkItemType;
    isDeletedView: boolean;
    controls: WorkItemControl[];
    dispose(): void;
    beginAttachLayout(callback?: () => void): void;
    detachLayout(): void;
    bind(workItem: WorkItem, isDisabledView?: boolean): void;
    unbind(isDisposing?: boolean): void;
    getWorkItem(): WorkItem;
    suppressFieldUpdates(suppress?: boolean);
    fireEventToControlContributions(notificationAction: (notificationService: IWorkItemNotificationListener, objectId: string) => void): void;
    getId(): string;
}

function witCacheKey(wit: WorkItemType, isDeletedView: boolean): string {
    return wit.path() + (isDeletedView ? "_DeletedView" : "");
}

export interface IBaseWorkItemFormOptions {
    action?: string;
    tfsContext?: TfsContext;
    sourceView?: string;
    id?: number;
    readOnly?: boolean;
    witd?: string;  // String representation of work item type.
    initialValues?: IDictionaryStringTo<any>;
    formViewType?: new (...args: any[]) => void;
    formViewOptions?: any; // Options passed down to the form view.
    close?: IResultCallback;
    workItemChanged?: IArgsFunctionR<void>;
}

export class WorkItemFormBase extends BaseControl {
    private _loadingOverlay: LoadingSpinnerOverlay;
    private _workItem: WorkItem;
    private _onWorkItemStatusChangedDelegate: IEventHandler;
    private _onWorkItemDeleteErrorDelegate: IArgsFunctionR<any>;
    private _showBusyFormDelegate: IArgsFunctionR<any>;
    private _hideBusyFormDelegate: IArgsFunctionR<any>;
    private _cancelable: Cancelable;
    private _lastShow: number;
    private _errorSection: JQuery;
    private _workItemIdBeingFetched: number;
    private _saveStartTime: number;
    private _previousDocument: WorkItemDocument;

    private _needToClearDeleteError: boolean;
    public views: { [key: string]: IWorkItemViewBase };
    public currentView: IWorkItemViewBase;
    public _options: IBaseWorkItemFormOptions;

    // Contribution related variables
    private _servicesContributionPromise: IPromise<IContributionWithSource<IWorkItemNotificationListener>[]>;

    private _servicesContributionIds: string[] = [Contributions.WORKITEM_FORM_CONTRIBUTION_SERVICE];

    constructor(options?: IBaseWorkItemFormOptions) {
        super(options);

        this.views = {};
        this._onWorkItemStatusChangedDelegate = delegate(this, this._onWorkItemStatusChanged);
    }

    public initializeOptions(options?: IBaseWorkItemFormOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "work-item-form work-item-form-main",
            readOnly: false
        }, options));
    }

    public initialize() {
        PerfScenarioManager.addSplitTiming(
            PerformanceEvents.WORKITEMFORMBASE_INITIALIZE, true);

        this._previousDocument = this._getActiveDocument();

        // Once we have loaded the work item form ensure subsequent actions can be accepted. Note that this is a bit of a kludge
        // because we want to treat the work item form as part of the class of actions that trigger dialogs.
        Dialog._dialogActionInProgress = false;

        super.initialize();

        // Load work item if specified in options
        if (this._options) {
            if (this._options.action === ActionUrl.ACTION_EDIT) {
                // Load work item if specified in options
                this.beginShowWorkItem(this._options.id, () => {
                    if (this._options.sourceView === "IDE") {
                        getScenarioManager().recordPageLoadScenario(WITCustomerIntelligenceArea.WORK_ITEM_TRACKING, WITPerformanceScenario.WORKITEM_OPENIDE_NEWLAYOUT);

                        // Remove source view property to ensure this scenario is only recorded once
                        this._options.sourceView = null;
                    }
                }, VSS.handleError);
            } else if (this._options.action === ActionUrl.ACTION_NEW) {
                // Create new work item
                if (!this._options.witd) {
                    throw new Error(Utils_String.format(VSS_Resources_Common.InvalidParameter, "witd"));
                }

                const store = ProjectCollection.getConnection(this._options.tfsContext).getService<WorkItemStore>(WorkItemStore);

                // Create blank work item
                store.beginGetProject(this._options.tfsContext.navigation.projectId, (project: Project) => {
                    project.beginGetWorkItemType(this._options.witd, (wit: WorkItemType) => {
                        const workItem = WorkItemManager.get(wit.store).createWorkItem(wit);

                        // If an id is specified, then use that id as a tempId which means
                        // it will show up in the title, e.g. if id=3 then title will be New Bug 3
                        if (this._options.id) {
                            workItem.tempId = -this._options.id;
                        }

                        InitialValueHelper.assignInitialValues(workItem, this._options.initialValues);
                        this.bind(workItem);

                        // Set current document
                        this._setActiveDocument(workItem);
                    }, VSS.handleError);
                }, VSS.handleError);
            }
        }

        PerfScenarioManager.addSplitTiming(
            PerformanceEvents.WORKITEMFORMBASE_INITIALIZE, false);
    }

    public _dispose() {
        if (this._previousDocument) {
            this._setActiveDocument(this._previousDocument.getWorkItem());
        } else {
            this._setActiveDocument(null);
        }

        this.unbind(false, true);

        if (this.views) {
            for (const key in this.views) {
                if (this.views.hasOwnProperty(key)) {
                    this.views[key].dispose();
                }
            }

            this.views = {};
        }

        if (this._loadingOverlay) {
            this._loadingOverlay.dispose();
            this._loadingOverlay = null;
        }

        super._dispose();
    }

    public bind(workItem: WorkItem, forceRebind?: boolean): IPromise<void> {
        if (this.isDisposed()) {
            return;
        }
        if (this._workItem !== workItem || forceRebind) {
            this.unbind();

            if (this._disposed) {
                return Q.resolve<void>(null);
            }

            const deferred = Q.defer<void>();

            PerfScenarioManager.addSplitTiming(
                PerformanceEvents.WORKITEMFORM_BINDWORKITEM, true);

            if (!this._servicesContributionPromise) {
                // Delay load contributions from initialize to bind minimizing impact on TTI
                this._servicesContributionPromise = ContributionService.getServiceContributions<IWorkItemNotificationListener>(this._servicesContributionIds);
            }

            this._workItem = workItem;
            WorkItemManager.get(workItem.store).pin(workItem);
            workItem.attachWorkItemChanged(this._onWorkItemStatusChangedDelegate);

            if (workItem.isSaving()) {
                this.showBusyOverlay();
            }

            const callback = () => {
                this._setActiveDocument(workItem);

                // Extensions use the active document, so once the
                // active document is set we can fire the onloaded event.
                // NOTE: The further down this event is fired in this callback
                // the higher there is a chance of the save event being fired
                // before the loaded event.  This is due to the event being
                // fired to the contribution as a promise, but the save event
                // is the legacy callback model.  Promises go in a queue, so the
                // onloaded event will be at the bottom of the list so it's very
                // likely the save will happen before the onload happens.
                this._fireEventToContributions((notificationService) => {
                    if ($.isFunction(notificationService.onLoaded)) {
                        const args: IWorkItemLoadedArgs = {
                            id: workItem.id,
                            isNew: workItem.isNew(),
                            isReadOnly: workItem.isReadOnly(),
                        };
                        notificationService.onLoaded(args);
                    }
                });

                this.currentView.bind(workItem);
                this.onBind(workItem);

                if (!this._onWorkItemDeleteErrorDelegate) {
                    this._onWorkItemDeleteErrorDelegate = (sender: any, error: Error) => {
                        if (this._workItem) {
                            this._needToClearDeleteError = true;
                            this._workItem.setError(error);
                        }
                    };
                    eventSvc.attachEvent(WorkItemActions.WORKITEM_DELETE_ERROR, this._onWorkItemDeleteErrorDelegate);
                }

                if (!this._showBusyFormDelegate || !this._hideBusyFormDelegate) {
                    this._showBusyFormDelegate = () => { this.showBusyOverlay(); };
                    this._hideBusyFormDelegate = () => { this.hideBusyOverlay(); };
                }

                eventSvc.attachEvent(WorkItemActions.ACTION_SHOW_WORKITEM_FORM_BUSY, this._showBusyFormDelegate);
                eventSvc.attachEvent(WorkItemActions.ACTION_HIDE_WORKITEM_FORM_BUSY, this._hideBusyFormDelegate);

                PerfScenarioManager.addSplitTiming(
                    PerformanceEvents.WORKITEMFORM_BINDWORKITEM, false);

                this._fire("onBind");

                this._showNotificationMessage(workItem);
                deferred.resolve(null);
            };

            this._beginAttachView(workItem.workItemType, callback, workItem.isDeleted());
            return deferred.promise;
        } else {
            return Q.resolve<void>(null);
        }
    }

    public unbind(detachLayout?: boolean, isDisposing?: boolean) {
        this.hideBusyOverlay();
        this.clearNotification();

        if (this._workItem) {
            PerfScenarioManager.addSplitTiming(
                PerformanceEvents.WORKITEMFORM_UNBINDWORKITEM, true);

            // Since _fireEventToContributions is async need to cache the id of the _workitem because _workItem will change (possibly to null).
            const id = this._workItem.id;
            this._fireEventToContributions((notificationService) => {
                if ($.isFunction(notificationService.onUnloaded)) {
                    notificationService.onUnloaded({ id: id });
                }
            });

            this._workItem.detachWorkItemChanged(this._onWorkItemStatusChangedDelegate);

            if (this._onWorkItemDeleteErrorDelegate) {
                eventSvc.detachEvent(WorkItemActions.WORKITEM_DELETE_ERROR, this._onWorkItemDeleteErrorDelegate);
                this._onWorkItemDeleteErrorDelegate = null;
            }

            if (this._showBusyFormDelegate || this._hideBusyFormDelegate) {
                eventSvc.detachEvent(WorkItemActions.ACTION_SHOW_WORKITEM_FORM_BUSY, this._showBusyFormDelegate);
                this._showBusyFormDelegate = null;

                eventSvc.detachEvent(WorkItemActions.ACTION_HIDE_WORKITEM_FORM_BUSY, this._hideBusyFormDelegate);
                this._hideBusyFormDelegate = null;
            }

            if (this.currentView) {
                this.currentView.unbind(isDisposing);
                if (detachLayout) {
                    this.currentView.detachLayout();
                }
            }

            if (this._needToClearDeleteError === true) {
                this._needToClearDeleteError = false;
                this._workItem.clearError();
            }

            WIFormCIDataHelper.workItemDisposed(this._workItem.sessionId);

            WorkItemManager.get(this._workItem.store).unpin(this._workItem);
            this._workItem = null;

            this.onUnbind();

            PerfScenarioManager.addSplitTiming(
                PerformanceEvents.WORKITEMFORM_UNBINDWORKITEM, false);
        }
    }

    /**
     * Hide the form behind a background-colored element with "Loading" element. Used when loading a form.
     * Not to be confused with saving work item changes, which tints the form, but doesn't fully hide it.
     * @param waitInMs Wait time in ms before showing spinner
     */
    public showLoadingIndicator(waitInMs: number) {
        if (!this._loadingOverlay) {
            this._loadingOverlay = new LoadingSpinnerOverlay(this._element[0]);
        }

        this._loadingOverlay.show(waitInMs);
    }

    // Undo startProgress(wait)
    public hideLoadingIndicator() {
        if (this._loadingOverlay) {
            this._loadingOverlay.hide();
        }
    }

    /**
     * Protected method to let derived classes handle work item bind
     */
    protected onBind(workItem: WorkItem) {
    }

    /**
     * Protected method to let derived classes handle work item unbind
     */
    protected onUnbind() {
    }

    /**
     * protected method to allow clients to show notifcations
     */
    protected showNotification(message: string, iconClasses?: string) {
    }

    /**
     * protected method to allow clients to hide notifcations
     */
    protected clearNotification() {
    }

    protected _onLinksChanged(workItem: WorkItem) {
    }

    public suppressFieldUpdates(suppress: boolean = true) {
        if (this.currentView) {
            this.currentView.suppressFieldUpdates(suppress);
        }
    }

    /**
     * Returns a promise which is resolved when the work item is shown.
     * @param workItem
     */
    public showWorkItem(workItem: WorkItem): IPromise<void> {
        if (this._cancelable) {
            this._cancelable.cancel();
            this._cancelable = null;
        }

        this._hideError();
        this.hideLoadingIndicator();

        const bindCallback = () => {
            // At this point, work item form is shown and binded.
            const workItemTypesMetadataStamp: string = workItem.store.getWorkItemTypesEtagForCI();

            PerfScenarioManager.endScenario(
                WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_OPENWORKITEM,
                {
                    "WorkItemTypesMetadataStamp": workItemTypesMetadataStamp
                });

            // End open query results perf scenario
            PerfScenarioManager.endScenario(
                WITPerformanceScenario.QUERY_OPENRESULTS,
                {
                    "WorkItemTypesMetadataStamp": workItemTypesMetadataStamp
                });

            const scenarioName = workItem.isNew()
                ? WITPerformanceScenario.WORKITEM_OPENFORM_CREATE_NEWLAYOUT
                : WITPerformanceScenario.WORKITEM_OPENFORM_NEWLAYOUT;

            // End open work item form perf scenario
            PerfScenarioManager.endScenario(scenarioName,
                {
                    "WorkItemType": "[NonEmail: " + workItem.workItemType.name + "]",
                    "Project": workItem.project.name,
                    "WorkItemTypesMetadataStamp": workItemTypesMetadataStamp,
                    "linkDetails": TelemetryUtils.getWorkItemLinkTelemetryDetails(workItem)
                });

            // Stop WatchDog for WORKITEM_OPENFORM_NEWLAYOUT/WORKITEM_OPENFORM_CREATE_NEWLAYOUT scenario
            Service.getService(WatchDogService, this._getTfsContext().contextData).endWatchScenario(scenarioName);

            // Start create or edit work item scenario
            PerfScenarioManager.startScenario(
                WITUserScenarioActions.WORKITEM_CREATEOREDIT, false);

            const currentController = this._getTfsContext().navigation.currentController;
            const currentAction = this._getTfsContext().navigation.currentAction;
            publishEvent(new TelemetryEventData(
                WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                WITPerformanceScenario.WORKITEM_OPENFORM,
                {
                    "workItemType": "[NonEmail: " + workItem.workItemType.name + "]",
                    "project": workItem.project.name,
                    "isNew": workItem.isNew(),
                    "workItemSessionId": workItem.sessionId,
                    "originArea": currentController + "/" + currentAction,
                    "workItemId": workItem.id,
                    "action": workItem.isNew() ? "Create" : "Edit"
                },
                Date.now()));

            this._unbind("onBind", bindCallback);
        };

        this._bind("onBind", bindCallback);

        return this.bind(workItem);
    }

    public focus(options?: any) {
        if ((options && options.force) || this._workItem.isNew()) {
            $("input:visible:not([disabled]):first", this._element).focus(200);
        }
    }

    public isFocused() {
        return $(":focus", this._element).length === 1;
    }

    /**
     * Shows a workitem for specified id
     * @param workItemId id of workitem to show
     * @param callback Optional, success callback invoked after showing the workitem
     * @param errorCallback Optional, error callback invoked if any error occurs
     * @param options Optional, options to be passed to show workitem, like forceShow, isDeleted
     * @param revision Optional, Shows a workitem with particular revision
     * @param delayCallback Optional boolean, if true invokes success callback only after binding the workitem to workitem form
     */
    public beginShowWorkItem(workItemId?: number, callback?: IFunctionPPR<WorkItemFormBase, WorkItem, void>, errorCallback?: IErrorCallback, options?: any, revision?: number) {
        const waitTime = 250;
        const store: WorkItemStore = ProjectCollection.getConnection(this._options.tfsContext).getService<WorkItemStore>(WorkItemStore);
        const workItemManager: WorkItemManager = WorkItemManager.get(store);

        const start = (id: number, isDeleted: boolean) => {
            let wait = 0;

            Diag.logTracePoint("WorkItemForm.showWorkItem.start");
            const startTime: number = Date.now();

            if (this._cancelable) {
                this._cancelable.cancel();
            }

            this._workItemIdBeingFetched = id;

            // bind asynchronously
            this.cancelDelayedFunction("bind");

            if (startTime - this._lastShow < 300) {
                wait = waitTime;
            }

            this._lastShow = startTime;

            const performAction = () => {
                this._cancelable = new Cancelable(this);

                this.showLoadingIndicator(waitTime);

                PerfScenarioManager.addSplitTiming(
                    PerformanceEvents.WORKITEMFORM_GETWORKITEM, true);
                workItemManager.beginGetWorkItem(
                    id,
                    this._cancelable.wrap(
                        (workItem) => {
                            PerfScenarioManager.addSplitTiming(
                                PerformanceEvents.WORKITEMFORM_GETWORKITEM, false);

                            this._cancelable = null;
                            this.hideLoadingIndicator();
                            this.showWorkItem(workItem);

                            if ($.isFunction(callback)) {
                                callback.call(this, this, workItem);
                            }
                            this._workItemIdBeingFetched = 0;
                        }),
                    this._cancelable.wrap(
                        (error) => {
                            this._cancelable = null;
                            this.hideLoadingIndicator();
                            this._workItemIdBeingFetched = 0;

                            if (FullScreenHelper.getFullScreen()) {
                                FullScreenHelper.setFullScreen(false, true);
                            }

                            if ($.isFunction(errorCallback)) {
                                errorCallback.call(this, error);
                            } else {
                                this.showError(error);
                            }
                        }) as IErrorCallback, isDeleted, revision);
            };

            const noDelayRenderingInitialWorkItem = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWorkItemTrackingFormNoDelayRenderingInitialWorkItem);
            if (wait === 0 && noDelayRenderingInitialWorkItem) {
                performAction();
            }
            else {
                this.delayExecute("bind", wait, true, performAction);
            }
        };

        const forceShow: boolean = options && options.forceShow;
        const isRequestedIdBeingFetched: boolean = this._workItemIdBeingFetched && this._workItemIdBeingFetched === workItemId;
        const isRequestedIdInCurrentView: boolean = this._workItem && this._workItem.id === workItemId && this.currentView && this.currentView.workItem === this._workItem;
        const cachedWorkItemFromManager = workItemManager.getWorkItem(workItemId);

        // Stop showing work item if requested work item aleady in the view and no work item is currently being fetched and the workitem is cached.
        // If the workitem is not cached and it is in current view, then it might have been removed due to revision change
        // We DO NOT honor "forceShow" for this scenario.
        if (!this._workItemIdBeingFetched && isRequestedIdInCurrentView && cachedWorkItemFromManager) {
            return;
        }

        // We will show work item when below conditions are matched:
        // 1. Another work item is being fetched (not the same as requested one) while requested work item is not currently in the view.
        // 2. No work item is being fetched while requested work item is not currently in the view.
        // 3. Honor forceShow === true unless the currently requested work item is already being fetched.
        // 4. If the workitem is not cached, then it might have been removed due to revision change so show the workitem again
        if (!isRequestedIdBeingFetched && (forceShow || !isRequestedIdInCurrentView || !cachedWorkItemFromManager)) {

            start(workItemId, (options && options.isDeleted));
        }
    }

    public showError(error: string) {
        this._clearCanvas();
        this.hideLoadingIndicator();

        this.unbind();
        this._errorSection = $(domElem("div", "error"));
        this._errorSection.text(getErrorMessage(error) || "Unknown error happened while accessing work item.");
        this._element.append(this._errorSection);
    }

    private _setActiveDocument(workItem: WorkItem) {
        let doc = null;
        if (workItem) {
            doc = new WorkItemDocument(workItem);
        }
        Events_Document.getService().setActiveDocument(doc);
    }

    private _getActiveDocument(): WorkItemDocument {
        return <WorkItemDocument>Events_Document.getService().getActiveDocument();
    }

    private _beginAttachView(wit: WorkItemType, callback: () => void, isDeletedView: boolean) {
        const cacheKey = witCacheKey(wit, isDeletedView);
        let view = this.views[cacheKey];

        if (!view) {
            const options = {
                workItemType: wit,
                form: this,
                readOnly: this._options.readOnly,
                isDeletedView: isDeletedView
            };

            view = <IWorkItemViewBase><any>BaseControl.createIn(
                this._options.formViewType,
                this._element,
                $.extend(options, this._options && this._options.formViewOptions));
            this.views[cacheKey] = view;
        }

        if (this.currentView) {
            if (witCacheKey(this.currentView.workItemType, this.currentView.isDeletedView) !== cacheKey) {
                this.currentView.detachLayout();
            }
        }

        view.beginAttachLayout(() => {
            this.currentView = view;
            if (callback) {
                callback();
            }
        });
    }

    private _publishSavingTelemetry(workItem: WorkItem) {
        try {
            const allChangedFields: string[] = [];
            const fieldsChangedByUser: string[] = [];
            let dateTimeFieldChangesByUser: number;

            for (const field of workItem.getDirtyFields()) {
                // we need to check the existence of the field in the map since during
                // change type the field may be updated but it's not in the map.
                const refname = field.fieldDefinition.referenceName;
                const fieldType = field.fieldDefinition.type;

                allChangedFields.push(refname);

                if (field.isUserChange()) {
                    fieldsChangedByUser.push(refname);

                    if (fieldType === FieldType.DateTime && !dateTimeFieldChangesByUser) {
                        dateTimeFieldChangesByUser = field.fieldDefinition.id;
                    }
                }
            }

            const ciData: IDictionaryStringTo<any> = {
                "fieldsChanged": `[NonEmail:${allChangedFields.join()}]`,
                "fieldsChangedByUser": `[NonEmail:${fieldsChangedByUser.join()}]`,
                "workItemSessionId": workItem.sessionId,
                "action": "Save"
            };

            const dateTimeCIData = this._buildDateTimeCIData(workItem, dateTimeFieldChangesByUser);
            if (dateTimeCIData) {
                $.extend(ciData, dateTimeCIData);
            }

            publishEvent(new TelemetryEventData(
                WIFormCIDataHelper.getArea(),
                WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_WIT_SAVING, ciData, this._saveStartTime));
        }
        catch (e) {
            // ignore telemety exception. It shouldn't throw, but added to be protective as logic is quite complex
        }
    }

    private _buildDateTimeCIData(workItem: WorkItem, fieldId: number): IDictionaryStringTo<any> {
        if (!fieldId) {
            return null;
        }

        const oldValue = workItem.getFieldValue(fieldId, true);
        const newValue = workItem.getFieldValue(fieldId);
        const oldDateInUserTimeZone = oldValue ? Utils_Date.convertClientTimeToUserTimeZone(oldValue, true) : null;
        const newDateInUserTimeZone = newValue ? Utils_Date.convertClientTimeToUserTimeZone(newValue, true) : null;

        let dateChanged = false;
        let timeChanged = false;
        let isToday = false;

        if (newDateInUserTimeZone) {
            dateChanged = oldDateInUserTimeZone ? Utils_Date.daysBetweenDates(oldDateInUserTimeZone, newDateInUserTimeZone, true) !== 0 : true;
            timeChanged = oldDateInUserTimeZone ?
                oldDateInUserTimeZone.getHours() !== newDateInUserTimeZone.getHours() || oldDateInUserTimeZone.getMinutes() !== newDateInUserTimeZone.getMinutes() :
                newDateInUserTimeZone.getHours() !== 0 || newDateInUserTimeZone.getMinutes() !== 0;

            isToday = Utils_Date.isGivenDayToday(newDateInUserTimeZone);
        }

        return {
            "dtDateChanged": dateChanged,
            "dtTimeChanged": timeChanged,
            "dtIsToday": isToday,
            "dtIsCleared": newDateInUserTimeZone === null
        };
    }

    private _publishSavedTelemetry(workItem: WorkItem, args: IWorkItemChangedArgs) {
        let eventName: string;
        const ciData: IDictionaryStringTo<any> = {};
        if (args.change === WorkItemChangeType.Saved) {
            eventName = "WorkItem.Save";
            ciData["projectChanged"] = args.projectChanged;
            ciData["typeChanged"] = args.typeChanged;
        } else {
            eventName = "WorkItem.SaveCompleted";
        }

        publishEvent(new TelemetryEventData(
            WIFormCIDataHelper.getArea(),
            eventName, ciData, this._saveStartTime));
    }

    private _onWorkItemStatusChanged(workItem: WorkItem, args: IWorkItemChangedArgs) {
        if (args.change === WorkItemChangeType.Saving) {
            this._saveStartTime = Date.now();
            this.showBusyOverlay();
            this._publishSavingTelemetry(workItem);
        } else if (args.change === WorkItemChangeType.Saved || args.change === WorkItemChangeType.SaveCompleted) {
            this.hideBusyOverlay();
            this.clearNotification();

            this._publishSavedTelemetry(workItem, args);
        } else if (args.change === WorkItemChangeType.Discarded) {
            if ($.isFunction(this._options.close)) {
                this._options.close.call(this);
            }
        } else if (args.change === WorkItemChangeType.TypeChanging || args.change === WorkItemChangeType.ProjectChanging) {
            // WorkItemType or project is changing.
            // This means the fields would be reset.
            // Hence, unbind the current view, before the fields dictionary is refreshed.
            // This would ensure that all the named event handlers bound using the fieldId would get unbound too.
            // Doing this after "MoveCompleted" means we are incorrectly unbinding the namedHandlers using the fields array for the new workItemType.
            // In such a case, we would try to unbind the namedHandlers using fieldName, since we can't find the appropriate field.
            // However, the namedHandlers were registered using fieldId, thus leading to bug #522753
            if (this._workItem && this.currentView) {
                this.currentView.unbind();
            }
        } else if (args.change === WorkItemChangeType.TypeChanged || args.change === WorkItemChangeType.ProjectChanged) {
            // Force the current form to rebind, since the underlying project and workitemtype have changed
            this.bind(workItem, true);
        }

        if ($.isFunction(this._options.workItemChanged)) {
            this._options.workItemChanged.call(this, args);
        }

        let changedFields: IDictionaryStringTo<Object>;
        if (args.change === WorkItemChangeType.FieldChange) {
            // Cache the changed fields here or they may be different by the time we fire the change to the contribution
            changedFields = this._extractFieldChanges(workItem, args.changedFields);

            // Update links and attachments counts if necessary
            const linkTypes: string[] = [
                CoreFieldRefNames.ExternalLinkCount,
                CoreFieldRefNames.RelatedLinkCount,
                CoreFieldRefNames.HyperLinkCount,
                CoreFieldRefNames.AttachedFileCount];

            // We don't need to recalculate if field changes contain none of the the above link types
            if (changedFields && linkTypes.some(linkTypeRefName => changedFields.hasOwnProperty(linkTypeRefName))) {
                this._onLinksChanged(workItem);
            }
        }

        this._fireEventToContributions((notificationService) => {
            switch (args.change) {
                case WorkItemChangeType.FieldChange:
                    if (changedFields && $.isFunction(notificationService.onFieldChanged)) {
                        notificationService.onFieldChanged({ id: workItem.id, changedFields: changedFields });
                    }
                    break;

                case WorkItemChangeType.SaveCompleted:
                    if ($.isFunction(notificationService.onSaved) && !args.workItem.getError()) {
                        notificationService.onSaved({ id: workItem.id });
                    }
                    break;

                case WorkItemChangeType.Reset:
                    if ($.isFunction(notificationService.onReset)) {
                        notificationService.onReset({ id: workItem.id });
                    }
                    break;

                case WorkItemChangeType.Refresh:
                    if ($.isFunction(notificationService.onRefreshed)) {
                        notificationService.onRefreshed({ id: workItem.id });
                    }
                    break;
            }
        });

        if (this._getTfsContext().isEmbedded()) {
            this.delayExecute("notify-modify", 200, true, function () {
                const modified = workItem.isDirty(true);
                if (modified !== this._previouslyModified) {
                    this._previouslyModified = modified;
                    Events_Services.getService().fire("tfs-document-modified-change", workItem, {
                        modified: modified,
                        moniker: LinkingUtilities.encodeUri({
                            tool: ToolNames.WorkItemTracking,
                            type: ArtifactTypeNames.WorkItem,
                            id: workItem.id.toString()
                        })
                    });
                }
            });
        }
    }

    private _extractFieldChanges(workItem: WorkItem, changedFields: IDictionaryNumberTo<Object>): IDictionaryStringTo<Object> {
        const extractedFieldChanges: IDictionaryStringTo<Object> = {};

        if (changedFields) {
            for (const key in changedFields) {
                const changedField: any = changedFields[key];
                const refName: string = changedField.fieldDefinition.referenceName;
                extractedFieldChanges[refName] = workItem.getFieldValue(refName);
            }
        }

        return extractedFieldChanges;
    }

    private _fireEventToContributions(notificationAction: (notificationService: IWorkItemNotificationListener) => void): void {
        // fire event to host targeting work-item-form-services
        this._fireEventToServiceContribution(notificationAction);

        if (this.currentView) {
            // fire event to host targeting work-item-form-pages
            this.currentView.fireEventToControlContributions(notificationAction);
        }
    }

    // Fires events to hosts targeting work-item-form-services (headless hosts that are global such as menu items)
    private _fireEventToServiceContribution(notificationAction: (notificationService: IWorkItemNotificationListener) => void): void {
        if (this._servicesContributionPromise) {
            this._servicesContributionPromise.then(
                (contributionSources) => {
                    contributionSources.forEach((value) => {
                        if (value.source) {
                            notificationAction(value.source);
                        }
                    });
                },
                (error) => {
                    throw new Error(error || "Error retrieving contributions");
                });
        }
    }

    private _hideCurrentView() {
        if (this.currentView) {
            this.currentView.detachLayout();
        }
    }

    private _getTfsContext(): TfsContext {
        return this._workItem
            ? this._workItem.store.getTfsContext()
            : TfsContext.getDefault();
    }

    private _hideError() {
        if (this._errorSection) {
            this._errorSection.remove();
            this._errorSection = null;
        }
    }

    protected _clearCanvas() {
        this.hideBusyOverlay();
        this.hideLoadingIndicator();
        this._hideCurrentView();
        this._hideError();
    }

    private _showNotificationMessage(workItem: WorkItem) {
        if (this._isMoveOrTypeChangeInProgress(workItem)) {
            const content = this._generateProjectMoveOrTypeChangeMessage(workItem);
            this.showNotification(content);
        }

        this._showUnfollowNotificationMessage(workItem);
    }

    /**
     * generate a notification message for move or type change
     *
     * @param workItem instance of a work item object
     * @return notification message for project move or type change. returns undefined if N/A.
     */
    private _generateProjectMoveOrTypeChangeMessage(workItem: WorkItem): string {
        let message: string;
        let className: string;
        if (workItem && workItem.isDirty()) {
            if (workItem.hasTeamProjectChanged()) {
                className = "bowtie-work-item-move";
                if (workItem.hasError() || !workItem.isValid()) {
                    message = WorkItemTrackingResources.WorkItemMoveInProgressWithErrors;
                } else {
                    message = WorkItemTrackingResources.WorkItemMoveInProgress;
                }
            } else if (workItem.hasWorkItemTypeChanged()) {
                className = "bowtie-switch";
                if (workItem.hasError() || !workItem.isValid()) {
                    message = WorkItemTrackingResources.WorkItemTypeChangeInProgressWithErrors;
                } else {
                    message = WorkItemTrackingResources.WorkItemTypeChangeInProgress;
                }
            }
        }

        if (message) {
            message = "<span class=\"icon bowtie-icon " + className + "\"/> &nbsp;" + message;
        }

        return message;
    }

    /**
     * checks if move or type change is in progress
     *
     * @param workItem instance of a work item object
     * @return true if move or type change is in progress. false otherwise.
     */
    private _isMoveOrTypeChangeInProgress(workItem: WorkItem): boolean {
        if (workItem && workItem.isDirty()) {
            return workItem.hasTeamProjectChanged() || workItem.hasWorkItemTypeChanged();
        }

        return false;
    }

    /**
     * shows the notification message if a work item is unfollowed through the email unfollow link
     *
     * @param workItem instance of a work item object
     */
    private _showUnfollowNotificationMessage(workItem: WorkItem) {
        const workItemUnfollowData: any = parseJsonIsland($(document), ".work-item-unfollow-data", true);

        if (workItemUnfollowData) {
            this._displayUnfollowStatus(workItemUnfollowData, workItem);
        } else {
            // fallback to data provider for work items hub.
            const pageDataService = Service.getService(WebPageDataService);
            const result = pageDataService.getPageData(ExtensionConstants.UnfollowsDataProvider) as string;

            if (result) {
                const status: UnfollowResultStatus = UnfollowResultStatus[result];
                this._displayUnfollowStatus(status, workItem);
            }
        }
    }

    private _displayUnfollowStatus(status: UnfollowResultStatus, workItem: WorkItem): void {
        if (status === UnfollowResultStatus.unfollowSuccess) {
            this.showNotification(WorkItemTrackingResources.SuccessfulUnfollowFromEmail, "icon bowtie-icon bowtie-watch-eye");
        } else if (status === UnfollowResultStatus.unfollowFailed) {
            const error = new Error(WorkItemTrackingResources.FailedUnfollowFromEmail);
            workItem.setError(error);
        }
    }
}

VSS.initClassPrototype(WorkItemFormBase, {
    _options: null,
    views: null,
    currentView: null,
    _workItem: null,
    _onWorkItemStatusChangedDelegate: null,
    _cancelable: null,
    _lastShow: 0,
    _statusControl: null,
    _errorSection: null,
    _workItemIdBeingFetched: 0
});

VSS.classExtend(WorkItemFormBase, TfsContext.ControlExtensions);

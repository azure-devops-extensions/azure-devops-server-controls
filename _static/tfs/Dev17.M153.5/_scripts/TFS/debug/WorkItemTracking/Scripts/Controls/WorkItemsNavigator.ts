import { DelayedFunction } from "VSS/Utils/Core";
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import Navigation = require("VSS/Controls/Navigation");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Events_Handlers = require("VSS/Events/Handlers");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Telemetry = require("VSS/Telemetry/Services");
import WorkItemsProvider = require("WorkItemTracking/Scripts/Controls/WorkItemsProvider");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";

import CustomerIntelligenceConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");

export class WorkItemsNavigator {

    public static EVENT_NAVIGATE_INDEX_CHANGED: string = "navigate-index-changed";
    public static EVENT_NAVIGATE_NEXT: string = "navigate-next";
    public static EVENT_NAVIGATE_PREVIOUS: string = "navigate-previous";
    public static EVENT_NAVIGATE_QUERY_RESULTS: string = "navigate-query-results";

    private _workItemsProvider: WorkItemsProvider.WorkItemsProvider;
    private _selectedIndex: number = -1;
    private _previousIndex: number = -1;
    private _count: number = -1;
    private _workItemId: number = -1;
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _executePrefetchWorkItemFunc: DelayedFunction;
    private _fireIndexChanged: DelayedFunction;

    public options: any;

    constructor(options?) {
        /// <summary>This object is responsible managing the navigation status of list of work items</summary>
        this.options = options || {};
    }

    public isNextAvailable(): boolean {
        /// <summary>Checks to see if a navigate next operation is available</summary>
        /// <returns type="Boolean" />
        return this._workItemsProvider && this._selectedIndex >= 0 && this._selectedIndex < this._count - 1;
    }

    public isPreviousAvailable(): boolean {
        /// <summary>Checks to see if a navigate previous operation is available</summary>
        /// <returns type="Boolean" />
        return this._workItemsProvider && this._selectedIndex > 0 && this._selectedIndex < this._count;
    }

    public getStatusText(): string {
        /// <summary>Gets a string representing the navigation status "{index} of {totalcount}"</summary>
        /// <returns type="String" />
        if (!this._workItemsProvider || this._selectedIndex < 0 || this._count < 0 || this._selectedIndex > this._count - 1) {
            return "";
        }
        return Utils_String.format(Resources.TriageSummary, (this._selectedIndex + 1), this._count);
    }

    public getCiData() {
        const ciData = {
            "FromIndex": this._previousIndex,
            "ToIndex": this._selectedIndex,
            "NumberOfWorkitems": this._count
        };
        return ciData;
    }

    public navigateNext() {
        /// <summary>Raises the "navigate-next" event</summary>
        if (this.isNextAvailable()) {
            this._fireEvent(WorkItemsNavigator.EVENT_NAVIGATE_NEXT);
        }
    }

    public navigateToQueryResults(command?: string) {
        /// <summary>Raises the "navigate-query-results" event</summary>
        /// <param name="command" type="string">The event raised to navigate back to query results (i.e., "buttonClick"/"keydown")</param>
        if (command) {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING, CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_BACK_TO_QUERY_RESULTS, {
                "BackToQueryResultsCommand": command,
                "IsFullscreen": Navigation.FullScreenHelper.getFullScreen(),
                "CurrentWorkItemIndex": this._selectedIndex,
                "WorkItemsCount": this._count
            }));
        }
        this._fireEvent(WorkItemsNavigator.EVENT_NAVIGATE_QUERY_RESULTS);
    }

    public navigatePrevious() {
        /// <summary>Raises the "navigate-previous" event</summary>
        if (this.isPreviousAvailable()) {
            this._fireEvent(WorkItemsNavigator.EVENT_NAVIGATE_PREVIOUS);
        }
    }

    public setProvider(provider: WorkItemsProvider.WorkItemsProvider) {
        /// <summary>Sets the WorkItemsProvider associated with this navigator</summary>
        if (this._workItemsProvider !== provider) {
            this._workItemsProvider = provider;
            this.reset();
        }
    }

    public getProvider(): WorkItemsProvider.WorkItemsProvider {
        /// <summary>Gets the WorkItemsProvider associated with this navigator</summary>
        return this._workItemsProvider;
    }

    public getSelectedWorkItemId(): number {
        return this._workItemId;
    }

    public getWorkItemsCount(): number {
        return this._count;
    }

    public getSelectedIndex(): number {
        return this._selectedIndex;
    }

    /**
     * Updates the count and selected index of the navigator, raises the "navigate-index-changed"
     * event should the index be different than current selected index
     * @param count The total count of items being navigated
     * @param index The row index of the current work item
     * @param workItemId The row index of the current work item
     */
    public update(count: number, index: number, workItemId: number) {
        Diag.Debug.assertParamIsInteger(count, "count");
        Diag.Debug.assertParamIsInteger(index, "index");

        this._count = count;
        this._previousIndex = this._selectedIndex;
        this._selectedIndex = index;
        this._workItemId = workItemId;

        if (!this._fireIndexChanged) {
            const indexChanged = () => {
                this._fireEvent(WorkItemsNavigator.EVENT_NAVIGATE_INDEX_CHANGED, this);
            };

            this._fireIndexChanged = new DelayedFunction(this, 250, "navigateIndexChanged", indexChanged);
        }

        this._fireIndexChanged.reset();
    }

    public reset() {
        this.update(-1, -1, null);
    }

    public prefetchNextAvailableWorkItem(tfsContext: TFS_Host_TfsContext.TfsContext): void {
        /// <summary>Prefetches the next available work item from query results</summary>
        const store: WITOM.WorkItemStore = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        const ciData = WorkItemManager.get(store).getLastRetrievedWorkitemCIData();
        if (ciData) {
            $.extend(ciData, this.getCiData());
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_PREFETCH_NEXT_WORKITEM,
                ciData));
        }

        if (this.isNextAvailable()) {
            const workItemNavigatorProvider = this.getProvider() as WorkItemsProvider.QueryResultsProvider;
            const isRecycleBinProvider = WorkItemsProvider.QueryResultsProvider.isRecycleBinQueryResultsProvider(workItemNavigatorProvider);
            const nextWorkItemIndex = this._selectedIndex + 1;

            const nextWorkItemId = workItemNavigatorProvider.getWorkItemIdAtDataIndex(nextWorkItemIndex);
            if (nextWorkItemId) {
                const funcTimerInMs = 250;
                const funcToExecute = () => {
                    WorkItemManager.get(store).beginGetWorkItem(
                        nextWorkItemId,
                        () => {
                            Diag.logTracePoint("TriageView.showWorkItem.prefetchComplete");
                        },
                        () => {
                            // This can happen if work item was deleted or user doesn't have a read permission
                            Diag.logWarning("TriageView.showWorkItem.prefetchFailed: " + nextWorkItemId);
                        },
                        isRecycleBinProvider
                    );
                };

                if (this._executePrefetchWorkItemFunc) {
                    this._executePrefetchWorkItemFunc.cancel();
                    this._executePrefetchWorkItemFunc.setDelay(funcTimerInMs);
                    this._executePrefetchWorkItemFunc.setMethod(this, funcToExecute);
                } else {
                    this._executePrefetchWorkItemFunc = new DelayedFunction(this, funcTimerInMs, "prefetchWorkItem", funcToExecute);
                }

                this._executePrefetchWorkItemFunc.reset();
                this._executePrefetchWorkItemFunc.start();
            }
        }
    }

    public fire(eventName: string, sender, eventArgs) {
        // Notifying all the subscribers
        return this._fireEvent(eventName, sender, eventArgs);
    }

    public _fireEvent(eventName: string, sender?: any, args?: any) {
        /// <summary>Invoke the specified event passing the specified arguments.</summary>
        /// <param name="eventName" type="String">The event to invoke.</param>
        /// <param name="sender" type="Object" optional="true">The sender of the event.</param>
        /// <param name="args" type="Object" optional="true">The arguments to pass through to the specified event.</param>

        if (this._events) {
            let eventBubbleCancelled;
            this._events.invokeHandlers(eventName, sender, args, (result) => {
                if (result === false) {
                    eventBubbleCancelled = true;
                    return true;
                }
            });
            if (eventBubbleCancelled) {
                return false;
            }
        }
    }

    public attachEvent(eventName: string, handler: IEventHandler) {
        /// <summary>Attatch a handler to an event.</summary>
        /// <param name="eventName" type="String">The event name.</param>
        /// <param name="handler" type="IEventHandler">The handler to attach.</param>
        if (!this._events) {
            this._events = new Events_Handlers.NamedEventCollection();
        }

        this._events.subscribe(eventName, <any>handler);
    }

    public detachEvent(eventName: string, handler: IEventHandler) {
        /// <summary>Detatch a handler from an event.</summary>
        /// <param name="eventName" type="String">The event name.</param>
        /// <param name="handler" type="IEventHandler">The handler to detach.</param>
        if (this._events) {
            this._events.unsubscribe(eventName, <any>handler);
        }
    }
}

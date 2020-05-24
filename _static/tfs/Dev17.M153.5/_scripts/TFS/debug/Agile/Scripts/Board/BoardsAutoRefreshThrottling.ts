/// <reference types="jquery" />

import BoardAutoRefreshCommon = require("Agile/Scripts/Board/BoardsAutoRefreshCommon");
import Utils_Core = require("VSS/Utils/Core");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";

/**
 * Manages Throttling of AutoRefresh events.
 */
export class AutoRefreshThrottler {
    protected _itemsRefreshedCount: number;
    protected _isProcessingEvents: boolean;
    protected _isFFEnabled: boolean;
    private _windowStartTime: number;
    private _isThrottling: boolean;
    private _boardExtensionId: string;
    private _eventsQueue: BoardAutoRefreshCommon.AutoRefreshEventPayload[][];
    private _delayedFunction: Utils_Core.DelayedFunction;
    private _autoRefreshItemsCompletedDelegate: IArgsFunctionR<void>;
    // Captures the time when we last started processing of some event.
    private _lastEventProcessStartTime: number;
    private _eventsHelper: ScopedEventHelper;

    // Should get this values from server
    // public for unit testing
    public static Items_Refresh_Threshold = 500;
    private static Window_Length_In_Milliseconds = 300000; //5 minutes
    // This is the maximum time we will wait for "ItemsAutoRefreshCompleted" event to fire (which in turn means for the previous update to complete).
    // We need this to make sure that if for any reason e.g. bug, "ItemsAutoRefreshCompleted" event doesn't fire, we don't stall the whole pipeline.
    private static MaxTimeToProcessEvent_In_Milliseconds = 500;

    constructor(boardExtensionId: string, eventsHelper: ScopedEventHelper) {
        this._boardExtensionId = boardExtensionId;
        this._eventsQueue = [];
        this._isProcessingEvents = false;
        this._windowStartTime = (new Date()).getTime();
        this._itemsRefreshedCount = 0;
        this._isThrottling = false;
        this._lastEventProcessStartTime = -1;
        this._isFFEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileKanbanBoardAutoRefreshThrottling);
        this._eventsHelper = eventsHelper;

        this._autoRefreshItemsCompletedDelegate = Utils_Core.delegate(this, this._onAutoRefreshItemsCompleted);
        if (this._isFFEnabled) {
            // We are interest is this event only when throttling is enabled.
            eventsHelper.attachEvent(BoardAutoRefreshCommon.Events.ItemsAutoRefreshCompleted, this._autoRefreshItemsCompletedDelegate);
        }
    }

    /**
     * Invoked when new updates comes from server.
     * @param workItemDataList The List of updates to be processed.
     */
    public process(workItemDataList: BoardAutoRefreshCommon.AutoRefreshEventPayload[]): void {
        this._eventsQueue.push(workItemDataList);
        this._tryProcessEvents();
    }

    /**
     * Invoked when refreshing of an item is completed.
     * @param sender The source of the event.
     * @param itemsRefreshCount Total Items that were refreshed.
     */
    private _onAutoRefreshItemsCompleted(sender: any, itemsRefreshCount: number): void {
        this._isProcessingEvents = false;
        this._itemsRefreshedCount += itemsRefreshCount;
        this._tryProcessEvents();
    }

    private _tryProcessEvents(): void {
        if (this._isFFEnabled && this._isProcessingEvents) {
            let currentTime: number = (new Date()).getTime();
            if (currentTime - this._lastEventProcessStartTime > AutoRefreshThrottler.MaxTimeToProcessEvent_In_Milliseconds) {
                // Last event should have been processed by now. Some bug is causing this. Let's not stall the pipeline
                // because of this.
                this._isProcessingEvents = false;
                BoardAutoRefreshCommon.PublishAutoRefreshTelemetry("PipelineUnblocked", this._boardExtensionId, {});
            }
        }

        if (!this._isFFEnabled) {
            // If throttling is disabled, just process the next event without any checks.
            this._processNextEvent();
        }
        else if (this._eventsQueue.length > 0 && !this._isProcessingEvents) {
            this._setWindowReference();
            if (this._itemsRefreshedCount < AutoRefreshThrottler.Items_Refresh_Threshold) {
                this._isProcessingEvents = true;
                this._lastEventProcessStartTime = (new Date()).getTime();
                this._processNextEvent();
                this._logIfThrottlingStopped();
            }
            else {
                this._delayProcessing();
            }
        }
    }

    private _processNextEvent(): void {
        var workItemDataList = this._eventsQueue.shift();
        this._eventsHelper.fire(BoardAutoRefreshCommon.Events.ItemsNeedAutoRefresh, this, workItemDataList);
    }

    /**
     * Sets a timer to process the events in queue at the start of new window.
     */
    private _delayProcessing(): void {
        if (!this._delayedFunction || !this._delayedFunction.isPending()) {
            this._delayedFunction = Utils_Core.delay(this, (this._windowStartTime + AutoRefreshThrottler.Window_Length_In_Milliseconds) - (new Date()).getTime(), this._tryProcessEvents);

            this._logIfThrottlingStarted();
        }
    }

    private _isNewWindow(): boolean {
        var currentTime = (new Date()).getTime();
        return currentTime >= this._windowStartTime + AutoRefreshThrottler.Window_Length_In_Milliseconds;
    }

    /**
     * Sets new window start time if it is new window.
     */
    private _setWindowReference(): void {
        if (this._isNewWindow()) {
            this._itemsRefreshedCount = 0;
            this._windowStartTime = (new Date()).getTime();
        }
    }

    private _logIfThrottlingStopped() {
        if (this._eventsQueue.length === 0 && this._isThrottling) {
            this._isThrottling = false;
            BoardAutoRefreshCommon.PublishAutoRefreshTelemetry("WorkItemsRefreshThrotllingStopped", this._boardExtensionId, {});
        }
    }

    private _logIfThrottlingStarted() {
        if (!this._isThrottling && this._eventsQueue.length > 0) {
            this._isThrottling = true;

            var remainingItemsToRefresh = 0;
            for (let batchedEvents of this._eventsQueue) {
                remainingItemsToRefresh += batchedEvents.length;
            }

            var ciData: IDictionaryStringTo<any> = {
                "RemainingItemsToRefresh": remainingItemsToRefresh,
            };
            BoardAutoRefreshCommon.PublishAutoRefreshTelemetry("WorkItemsRefreshThrotllingStarted", this._boardExtensionId, ciData);
        }
    }

    public dispose() {
        if (this._delayedFunction && this._delayedFunction.isPending()) {
            this._delayedFunction.cancel();
        }

        if (this._autoRefreshItemsCompletedDelegate) {
            this._eventsHelper.detachEvent(BoardAutoRefreshCommon.Events.ItemsAutoRefreshCompleted, this._autoRefreshItemsCompletedDelegate);
            this._autoRefreshItemsCompletedDelegate = null;
        }
    }
}

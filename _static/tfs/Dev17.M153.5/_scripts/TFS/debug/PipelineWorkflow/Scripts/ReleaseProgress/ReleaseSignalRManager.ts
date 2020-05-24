import * as Q from "q";

import { Singleton } from "DistributedTaskControls/Common/Factory";

import { AgentSignalRManager } from "PipelineWorkflow/Scripts/ReleaseProgress/JobRequests/AgentSignalRManager";
import { CachedReleaseSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/CachedReleaseSource";

import * as ReleaseEventManager from "ReleasePipeline/Scripts/TFS.ReleaseManagement.ReleaseHub.ConnectionManager";
import { SignalRHelper } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils";

import * as Diag from "VSS/Diag";
import { DelayedFunction } from "VSS/Utils/Core";
import * as VSS from "VSS/VSS";

export interface IInitializeReleaseData {
    releaseId: number;
    eventHandlerMap: IDictionaryStringTo<IEventHandler>;
    onInitializeComplete?: () => {};
    // delegate to call if force update is needed
    delayedForceUpdateDelegate?: () => void;
    // is the page in live mode eg: release is in progress, etc.
    isViewLiveDelegate?: () => boolean;
}

export class ReleaseSignalRManager extends Singleton {

    constructor() {
        super();

        VSS.using([ReleaseSignalRManager.c_jquerySignalr], () => {
            SignalRHelper.loadSignalrClient();
            this._eventManager = ReleaseEventManager.ReleaseHubEventManager.getInstance();
            this._signalRPromise.resolve(true);
        });

        AgentSignalRManager.instance().setSignalrNotifier(this._signalrNotifier);
    }

    public static instance(): ReleaseSignalRManager {
        return super.getInstance<ReleaseSignalRManager>(ReleaseSignalRManager);
    }

    public static dispose(): void {
        AgentSignalRManager.dispose();

        const instance = this.instance();
        if (instance) {
            if (instance._eventManager) {
                for (let eventName in instance._eventHandlerMap) {
                    if (instance._eventHandlerMap.hasOwnProperty(eventName)) {
                        instance.detachEvent(eventName, instance._eventHandlerMap[eventName]);
                    }
                }
                instance._eventManager = null;
            }
            instance._eventHandlerMap = {};

            instance.stopLiveWatch();

            instance._detachAllSignalRNotifiers();
            instance._releaseId = null;
            instance._subscribedDefinitionId = null;
            if (instance._watchedLiveJobs) {
                instance._watchedLiveJobs.length = 0;
            }

            if (instance._delayedForceUpdateTimer) {
                instance._delayedForceUpdateTimer.cancel();
                instance._delayedForceUpdateTimer = null;
            }
        }

        super.dispose();
    }

    public attachEvent(eventName: string, handler: IEventHandler): void {
        this._signalRPromise.promise.then(() => {
            this._eventManager.attachEvent(eventName, handler);
            this._eventHandlerMap[eventName] = handler;
        });
    }

    public detachEvent(eventName: string, handler: IEventHandler): void {
        if (this._eventManager) {
            this._eventManager.detachEvent(eventName, handler);
        }

        if (this._eventHandlerMap) {
            this._eventHandlerMap[eventName] = null;
        }
    }

    public markEventForAttaching(eventName: string, handler: IEventHandler): void {
        this._eventHandlerMap[eventName] = handler;
    }

    public clearAlreadyDetachedEvent(eventName: string, handler: IEventHandler): void {
        this._eventHandlerMap[eventName] = null;
    }

    public subscribeToDefinitionsReleases(definitionIds: number[]) {
        this._signalRPromise.promise.then(() => {
            if (!this._hubConnectionManager) {
                this._hubConnectionManager = ReleaseEventManager.ReleaseHubConnectionManager.getInstance();
            }

            if (this._hubConnectionManager) {
                this._hubConnectionManager.subscribeToDefinitionsReleases(definitionIds);
            }
        });
    }

    public unsubscribeFromDefinitionsReleases(definitionIds: number[]) {
        this._signalRPromise.promise.then(() => {
            if (this._hubConnectionManager) {
                this._hubConnectionManager.unsubscribeFromDefinitionsReleases(definitionIds);
            }
            this._subscribedDefinitionId = null;
        });
    }

    public subscribeToReleaseJobLogs(jobId: string) {
        this._signalRPromise.promise.then(() => {
            this._watchedLiveJobs.push(jobId);
            if (this._hubConnectionManager) {
                this._hubConnectionManager.subscribeToReleaseJobLogs(this._releaseId, jobId);
                this._updateDelayTimeIfNeeded();
            }
        });
    }

    public initializeRelease(initializeReleaseData: IInitializeReleaseData) {
        this._releaseId = initializeReleaseData.releaseId;
        this._forceUpdateDelegate = initializeReleaseData.delayedForceUpdateDelegate;
        this._isViewLiveDelegate = initializeReleaseData.isViewLiveDelegate;

        this._eventsForSignalRNotification = [
            ReleaseEventManager.ReleaseHubEvents.RELEASE_UPDATED,
            ReleaseEventManager.ReleaseHubEvents.RELEASETASKS_UPDATED,
            ReleaseEventManager.ReleaseHubEvents.RELEASETASK_LOG_UPDATED,
        ];

        const delayDurationInSec = CachedReleaseSource.instance().getReleaseForceUpdateDurationInSec() || this.c_defaultSignalrForceUpdateDurationInSec;
        this._signalrForceUpdateDurationWithLogsInSec = delayDurationInSec;
        this._signalrForceUpdateDurationWithoutLogsInSec = delayDurationInSec + this.c_signalrForceUpdateDurationWithoutLogsIncrementInSec;
        this._currentForceUpdateDurationInSec = this._signalrForceUpdateDurationWithoutLogsInSec;

        this._signalRPromise.promise.then(() => {

            this._initializeForceUpdate();
            this.startLiveWatchIfNeeded();

            for (const eventName in initializeReleaseData.eventHandlerMap) {
                if (initializeReleaseData.eventHandlerMap.hasOwnProperty(eventName)) {
                    this.attachEvent(eventName, initializeReleaseData.eventHandlerMap[eventName]);
                }
            }

            this._attachAllSignalRNotifiers();

            if (initializeReleaseData.onInitializeComplete) {
                initializeReleaseData.onInitializeComplete();
            }
        });
    }

    private restartTimerIfNeeded() {
        if (this._delayedForceUpdateTimer) {
            this._delayedForceUpdateTimer.cancel();
        }

        this._updateDelayTimeIfNeeded();
        this._startForceUpdateTimerIfNeeded();
    }

    public restartSignalRConnectionIfNeeded() {
        this.stopLiveWatch();
        this.startLiveWatchIfNeeded();
    }

    public startLiveWatchIfNeeded(forceStart: boolean = false) {
        this._liveWatchDisabled = false;

        this._signalRPromise.promise.then(() => {
            if (!this._hubConnectionManager && (forceStart || (this._isViewLiveDelegate && this._isViewLiveDelegate()))) {
                this._hubConnectionManager = ReleaseEventManager.ReleaseHubConnectionManager.getInstance();

                this._subscribeToRelease();

                if (this._watchedLiveJobs && this._watchedLiveJobs.length > 0) {
                    this._hubConnectionManager.subscribeToReleaseJobsLogs(this._releaseId, this._watchedLiveJobs);
                    this._updateDelayTimeIfNeeded();
                }

                this._startForceUpdateTimerIfNeeded();

                AgentSignalRManager.instance().startLiveWatch();
            }
        });
    }

    public stopLiveWatch() {
        this._liveWatchDisabled = true;

        this._signalRPromise.promise.then(() => {
            if (!!this._hubConnectionManager) {
                this._hubConnectionManager.stop();
                this._hubConnectionManager = null;
            }
            
            if (this._delayedForceUpdateTimer) {
                this._delayedForceUpdateTimer.cancel();
            }
            this._updateDelayTimeIfNeeded();

            AgentSignalRManager.instance().stopLiveWatch();
        });
    }

    public isLiveWatchDisabled(): boolean {
        return !!this._liveWatchDisabled;
    }

    private _resetForceUpdateTimer() {
        if (this._delayedForceUpdateTimer) {
            this._delayedForceUpdateTimer.cancel();
            this._startForceUpdateTimerIfNeeded();
        }
    }

    private _subscribeToRelease() {
        this._signalRPromise.promise.then(() => {
            if (this._hubConnectionManager) {
                this._hubConnectionManager.subscribeToRelease(this._releaseId);
            }
        });
    }

    private _initializeForceUpdate() {
        const delayDurationInMs = this._currentForceUpdateDurationInSec * 1000;
        this._delayedForceUpdateTimer = new DelayedFunction(
            this,
            delayDurationInMs,
            null,
            () => {
                Diag.logVerbose("ReleaseSignalRManager: No update since " + (this._currentForceUpdateDurationInSec * 1000) + " ms. Forcing refresh.");
                if (this._forceUpdateDelegate && this._isViewLiveDelegate && this._isViewLiveDelegate()) {
                    this._forceUpdateDelegate();
                }
                this.restartTimerIfNeeded();
            }
        );
    }

    private _startForceUpdateTimerIfNeeded() {
        if (this._delayedForceUpdateTimer && this._isViewLiveDelegate && this._isViewLiveDelegate()) {
            this._delayedForceUpdateTimer.start();
        }
    }

    private _attachAllSignalRNotifiers() {
        this._signalRPromise.promise.then(() => {
            // add signalr notifiers to all relevant events
            this._eventsForSignalRNotification.forEach((eventName: string) => {
                this._eventManager.attachEvent(eventName, this._signalrNotifier);
            });
        });
    }

    private _detachAllSignalRNotifiers() {
        // remove signalr notifiers from all relevant events
        if (this._eventManager) {
            this._eventsForSignalRNotification.forEach((eventName: string) => {
                this._eventManager.detachEvent(eventName, this._signalrNotifier);
            });
        }
    }

    private _updateDelayTimeIfNeeded() {
        let forceUpdateDurationInSec = 0;
        if (this._watchedLiveJobs && this._watchedLiveJobs.length > 0) {
            forceUpdateDurationInSec = this._signalrForceUpdateDurationWithLogsInSec;
        }
        else {
            forceUpdateDurationInSec = this._signalrForceUpdateDurationWithoutLogsInSec;
        }

        if (this._delayedForceUpdateTimer && forceUpdateDurationInSec !== this._currentForceUpdateDurationInSec) {
            this._delayedForceUpdateTimer.setDelay(forceUpdateDurationInSec * 1000);
            if (this._delayedForceUpdateTimer.isPending()) {
                // restart the delay to update duration
                this._resetForceUpdateTimer();
            }
        }

        this._currentForceUpdateDurationInSec = forceUpdateDurationInSec;
    }

    private _signalrNotifier = (sender: any, eventData: any): void => {
        this._resetForceUpdateTimer();
    }

    private _liveWatchDisabled: boolean = false;
    private _eventManager: ReleaseEventManager.ReleaseHubEventManager;
    private _hubConnectionManager: ReleaseEventManager.ReleaseHubConnectionManager;
    private _eventHandlerMap: IDictionaryStringTo<IEventHandler> = {};
    private _signalRPromise: Q.Deferred<boolean> = Q.defer<boolean>();
    private _delayedForceUpdateTimer: DelayedFunction;
    private _forceUpdateDelegate: () => void;
    private _isViewLiveDelegate: () => boolean;
    private _releaseId: number;
    private _subscribedDefinitionId: number;
    private _watchedLiveJobs: string[] = [];
    private _eventsForSignalRNotification: string[] = [];
    private _currentForceUpdateDurationInSec: number = 0;
    private _signalrForceUpdateDurationWithoutLogsInSec: number = 0;
    private _signalrForceUpdateDurationWithLogsInSec: number = 0;
    private readonly c_defaultSignalrForceUpdateDurationInSec: number = 60;
    private readonly c_signalrForceUpdateDurationWithoutLogsIncrementInSec: number = 120;
    private static readonly c_jquerySignalr: string = "jquery.signalR-vss.2.2.0";
}

import * as Q from "q";

import { Singleton } from "DistributedTaskControls/Common/Factory";

import * as TaskAgentPoolHub from "ReleasePipeline/Scripts/TFS.ReleaseManagement.TaskAgentPoolHub.ConnectionManager";
import * as RMUtils from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils";

import * as VSS_Events from "VSS/Events/Services";
import * as Utils_Number from "VSS/Utils/Number";
import * as VSS from "VSS/VSS";

export class AgentSignalRManager extends Singleton {

    public static instance(): AgentSignalRManager {
        return super.getInstance<AgentSignalRManager>(AgentSignalRManager);
    }

    public static dispose(): void {
        const instance = this.instance();
        if (instance) {
            if (instance._taskAgentEventManager) {
                instance._detachAllEvents();
                instance._taskAgentEventManager = null;
            }

            instance.stopLiveWatch();
            instance._detachAllSignalRNotifiers();

            instance._taskAgentEventHandlerMap = {};
            instance._subscribedPoolIds = {};
            instance._isSignalRInitialized = false;
        }

        super.dispose();
    }

    public initializeSignalR() {
        this._isSignalRInitialized = true;

        VSS.using([AgentSignalRManager.c_jquerySignalr],
            () => {
                RMUtils.SignalRHelper.loadSignalrClient();
                this._taskAgentEventManager = VSS_Events.getService();
                this._taskAgentPoolHub = TaskAgentPoolHub.TaskAgentPoolHub.getInstance();
                this._signalRPromise.resolve(true);
            },
            () => {
                this._isSignalRInitialized = false;
            }
        );
    }

    public setSignalrNotifier(signalrNotifier: (sender: any, eventData: any) => void) {
        this._signalrNotifier = signalrNotifier;
    }

    public attachAllTaskAgentEvents(eventHandlerMap: IDictionaryStringTo<IEventHandler>) {
        if (!this._isSignalRInitialized) {
            this.initializeSignalR();
        }
        this._signalRPromise.promise.then(() => {
            for (const eventName in eventHandlerMap) {
                if (eventHandlerMap.hasOwnProperty(eventName)) {
                    this._attachTaskAgentEvent(eventName, eventHandlerMap[eventName]);
                    this._eventsForSignalRNotification.push(eventName);
                }
            }
            this._attachAllSignalRNotifiers();
        });
    }

    public watchResourceUsageChanges() {
        if (!this._isSignalRInitialized) {
            this.initializeSignalR();
        }
        this._signalRPromise.promise.then(() => {
            this._taskAgentPoolHub.WatchResourceUsageChanges();
            this._isWatchingResourceUsageChanges = true;
        });
    }

    public unwatchResourceUsageChanges() {
        if (!this._isSignalRInitialized) {
            return;
        }
        this._signalRPromise.promise.then(() => {
            this._taskAgentPoolHub.UnwatchResourceUsageChanges();
            this._isWatchingResourceUsageChanges = false;
        });
    }

    public subscribeToPool(poolId: number) {
        if (!this._isSignalRInitialized) {
            this.initializeSignalR();
        }
        this._signalRPromise.promise.then(() => {
            if (!this._subscribedPoolIds[poolId]) {
                this._taskAgentPoolHub.subscribe(poolId).then(() => {
                    this._subscribedPoolIds[poolId] = true;
                });
            }
        });
    }

    public startLiveWatch() {
        if (this._isSignalRInitialized) {
            this._signalRPromise.promise.then(() => {
                if (!this._taskAgentPoolHub) {
                    this._taskAgentPoolHub = TaskAgentPoolHub.TaskAgentPoolHub.getInstance();

                    if (this._isWatchingResourceUsageChanges) {
                        this.watchResourceUsageChanges();
                    }

                    if (this._subscribedPoolIds) {
                        for (let poolId in this._subscribedPoolIds) {
                            if (this._subscribedPoolIds.hasOwnProperty(poolId) && this._subscribedPoolIds[poolId]) {
                                let poolIdNumber = Utils_Number.parseInvariant(poolId);
                                if (poolIdNumber > 0) {
                                    this._taskAgentPoolHub.subscribe(poolIdNumber);
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    public stopLiveWatch() {
        if (this._isSignalRInitialized) {
            this._signalRPromise.promise.then(() => {
                if (!!this._taskAgentPoolHub) {
                    this._taskAgentPoolHub.stop();
                    this._taskAgentPoolHub = null;
                }
            });
        }
    }

    private _attachTaskAgentEvent(eventName: string, handler: IEventHandler): void {
        this._signalRPromise.promise.then(() => {
            if (this._taskAgentEventManager) {
                this._taskAgentEventManager.attachEvent(eventName, handler);
                if (!this._taskAgentEventHandlerMap[eventName]) {
                    this._taskAgentEventHandlerMap[eventName] = [];
                }
                this._taskAgentEventHandlerMap[eventName].push(handler);
            }
        });
    }

    private _detachAllEvents(): void {
        if (this._taskAgentEventManager && this._taskAgentEventHandlerMap) {
            for (const eventName in this._taskAgentEventHandlerMap) {
                if (this._taskAgentEventHandlerMap.hasOwnProperty(eventName)) {
                    this._detachTaskAgentEvent(eventName, this._taskAgentEventHandlerMap[eventName]);
                }
            }
        }
    }

    private _detachTaskAgentEvent(eventName: string, handlers: IEventHandler[]): void {
        if (this._taskAgentEventManager && handlers && handlers.length > 0) {
            handlers.forEach((handler: IEventHandler) => {
                this._taskAgentEventManager.detachEvent(eventName, handler);
            });
        }

        if (this._taskAgentEventHandlerMap) {
            this._taskAgentEventHandlerMap[eventName] = [];
        }
    }

    private _attachAllSignalRNotifiers() {
        this._signalRPromise.promise.then(() => {
            // add signalr notifiers to all relevant events
            this._eventsForSignalRNotification.forEach((eventName: string) => {
                this._taskAgentEventManager.attachEvent(eventName, this._signalrNotifier);
            });
        });
    }

    private _detachAllSignalRNotifiers() {
        // remove signalr notifiers from all relevant events
        if (this._taskAgentEventManager) {
            this._eventsForSignalRNotification.forEach((eventName: string) => {
                this._taskAgentEventManager.detachEvent(eventName, this._signalrNotifier);
            });
        }
    }

    private _isSignalRInitialized: boolean;
    private _signalrNotifier: (sender: any, eventData: any) => void;
    private _taskAgentEventManager: VSS_Events.EventService;
    private _taskAgentPoolHub: TaskAgentPoolHub.TaskAgentPoolHub;
    private _taskAgentEventHandlerMap: IDictionaryStringTo<IEventHandler[]> = {};
    private _eventsForSignalRNotification: string[] = [];
    private _subscribedPoolIds: IDictionaryStringTo<boolean> = {};
    private _signalRPromise: Q.Deferred<boolean> = Q.defer<boolean>();
    private _isWatchingResourceUsageChanges: boolean = false;
    private static readonly c_jquerySignalr: string = "jquery.signalR-vss.2.2.0";
}
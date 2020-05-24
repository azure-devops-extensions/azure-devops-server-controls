import Q = require("q");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import SignalR = require("SignalR/Hubs");
import VSS_Events = require("VSS/Events/Services");
import VCContracts = require("TFS/VersionControl/Contracts");

interface IAsyncGitOperationServer {
    subscribe(operationId: number): void;
    unsubscribe(operationId: number): void;
}

export interface IAsyncGitOperationClient {
    reportProgress(notification: VCContracts.AsyncRefOperationProgressNotification): void;
    reportCompletion(notification: VCContracts.AsyncRefOperationCompletedNotification): void;
    reportFailure(notification: VCContracts.AsyncGitOperationNotification): void;
    reportTimeout(notification: VCContracts.AsyncRefOperationTimeoutNotification): void;
}

interface IAsyncGitOperationHub {
    server: IAsyncGitOperationServer;
    client: IAsyncGitOperationClient;
}

class OperationSubscriptions {
    [operationId: number]: number;

    public map<T>(callback: (count: number, operationId: number) => T): T[] {
        return Array.prototype.map.call(this, callback);
    }
}

export class AsyncRefOperationEvents {
    public static PROGRESS: string = "AsyncGitOperation.ReportProgress";
    public static COMPLETION: string = "AsyncGitOperation.ReportCompletion";
    public static FAILURE: string = "AsyncGitOperation.Failure";
    public static TIMEOUT: string = "AsyncGitOperation.Timeout";
}

/**
 * The SignalR hub through which to subscribe to async ref operations.
 */
export class AsyncGitOperationHub extends SignalR.Hub implements IAsyncGitOperationClient {
    private static hub: AsyncGitOperationHub = null;

    private _subscriptions: OperationSubscriptions;
    private _eventManager: VSS_Events.EventService;

    public static getHub(): AsyncGitOperationHub {
        if (!AsyncGitOperationHub.hub) {
            AsyncGitOperationHub.hub = new AsyncGitOperationHub();
        }

        return AsyncGitOperationHub.hub;
    }

    constructor() {
        super(
            TFS_Host_TfsContext.TfsContext.getDefault().contextData.account,
            TFS_Host_TfsContext.TfsContext.getDefault().contextData.collection,
            'asyncGitOperationHub',
            null, // connectionHub or connection string
            { useSignalRAppPool: AsyncGitOperationHub.useSignalRAppPool(TFS_Host_TfsContext.TfsContext.getDefault()) });
        this._subscriptions = new OperationSubscriptions();
        this._eventManager = VSS_Events.getService();
        this._initializeHub();
    }

    public reportProgress(notification: VCContracts.AsyncGitOperationNotification): void {
        this._eventManager.fire(AsyncRefOperationEvents.PROGRESS, this, notification);
    }

    public reportCompletion(notification: VCContracts.AsyncGitOperationNotification): void {
        this._eventManager.fire(AsyncRefOperationEvents.COMPLETION, this, notification);
    }

    public reportFailure(notification: VCContracts.AsyncGitOperationNotification): void {
        this._eventManager.fire(AsyncRefOperationEvents.FAILURE, this, notification);
    }

    public reportTimeout(notification: VCContracts.AsyncRefOperationTimeoutNotification): void {
        this._eventManager.fire(AsyncRefOperationEvents.TIMEOUT, this, notification);
    }

    public subscribe(operationId: number): Q.Promise<any> {
        return this._subscribeToOperation(operationId);
    }

    public stop() {
        this._subscriptions = [];
        super.stop();
    }

    protected onReconnect(): Q.Promise<any> {
        let promises = this._subscriptions.map((subscribers, operationId) => Q(this._getHub().server.subscribe(operationId)));
        if (promises.length == 0) {
            return super.onReconnect();
        }
        else {
            return Q.all(promises);
        }
    }

    private _subscribeToOperation(operationId: number) {
        return this.connection.start().then(() => {
            if (!this._subscriptions[operationId]) {
                this._subscriptions[operationId] = 1;
            }
            else {
                this._subscriptions[operationId]++;
            }
            return Q(this._getHub().server.subscribe(operationId));
        });
    }

    public unsubscribe(operationId: number): Q.Promise<any> {
        if (this._subscriptions[operationId] == 1) {
            return Q(this._getHub().server.unsubscribe(operationId)).then(() => {
                this._subscriptions[operationId] = 0;
            });
        }
        else if (this._subscriptions[operationId] > 1) {
            this._subscriptions[operationId]--;
        }
    }

    private _getHub(): IAsyncGitOperationHub {
        return this.hub;
    }

    private _initializeHub() {
        this._getHub().client.reportCompletion = notification => this.reportCompletion(notification);
        this._getHub().client.reportProgress = notification => this.reportProgress(notification);
        this._getHub().client.reportFailure = notification => this.reportFailure(notification);
        this._getHub().client.reportTimeout = notification => this.reportTimeout(notification);
    }
}
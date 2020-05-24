/// <reference types="jquery" />

import Q = require("q");
import BoardAutoRefreshCommon = require("Agile/Scripts/Board/BoardsAutoRefreshCommon");
import BoardAutoRefreshThrottling = require("Agile/Scripts/Board/BoardsAutoRefreshThrottling");
import SignalR = require("SignalR/Hubs");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";

/**
 * Manages SignalR hub for Kanban Board.
 */
export class KanbanBoardHub extends SignalR.Hub {
    protected _autoRefreshThrottler: BoardAutoRefreshThrottling.AutoRefreshThrottler;
    private _subscribed: boolean = false;

    private _sessionStartTime: Date;
    private _boardExtensionId: string;
    private _connectionTimeout: number;
    private _eventsHelper: ScopedEventHelper;

    private static CONNECTION_TIME_OUT_DELAY_IN_MS = 30000;

    /**
     * Creates a new hub
     * @param boardExtensionId Extension id of the board.
     */
    constructor(boardExtensionId: string, eventsHelper: ScopedEventHelper) {
        super(
            TFS_Host_TfsContext.TfsContext.getDefault().contextData.account,
            TFS_Host_TfsContext.TfsContext.getDefault().contextData.collection,
            "kanbanBoardHub",
            null, //connection string or HubConnection
            { useSignalRAppPool: KanbanBoardHub.useSignalRAppPool(TFS_Host_TfsContext.TfsContext.getDefault()) });
        this._eventsHelper = eventsHelper;
        this._boardExtensionId = boardExtensionId;
        this._initializeHub(this.hub);
    }

    public start(): Q.Promise<any> {
        if (this._subscribed) {
            return this._unsubscribe().then(() => {
                return this._subscribe();
            });
        } else {
            return this._subscribe();
        }
    }

    /**
     * Called when we want to stop the SignalR connection.
     */
    public stop() {
        this.publishSignalRSessionLength();
        this._clearTimeout();
        this._boardExtensionId = null;
        this._subscribed = false;
        if (this._autoRefreshThrottler) {
            this._autoRefreshThrottler.dispose();
            this._autoRefreshThrottler = null;
        }
        super.stop();
    }

    protected onReconnect(): Q.Promise<any> {
        if (this._boardExtensionId) {
            // Raise SignalRConnectionRevived event when signalR pipeline is re-established after network outage.
            this._eventsHelper.fire(BoardAutoRefreshCommon.Events.SignalRConnectionRevived, this);

            this._sessionStartTime = new Date();
            this._subscribed = true;
            return Q(this.hub.server.watchKanbanBoard(this._boardExtensionId)).then(() => {
                BoardAutoRefreshCommon.PublishAutoRefreshTelemetry("SignalRConnection", this._boardExtensionId,
                    {
                        "ConnectionState": "Reconnected"
                    });
            });;
        }
        return super.onReconnect();
    }

    /**
     * Initialize the hub.
     */
    private _initializeHub(hub: any) {
        hub.client.onWorkItemsUpdated = (updatePayload: { id: number, changeType: string, revision: number, stackRank: string }[]) => {
            let ciData: IDictionaryStringTo<any> = {
                "NumUpdates": updatePayload.length,
            };

            var autoRefreshUpdateEvents: BoardAutoRefreshCommon.AutoRefreshEventPayload[] = [];
            for (let index in updatePayload) {
                let updateEvent = new BoardAutoRefreshCommon.AutoRefreshEventPayload(updatePayload[index]);
                autoRefreshUpdateEvents.push(updateEvent);
                if (!ciData.hasOwnProperty(updateEvent.changeType)) {
                    ciData[updateEvent.changeType] = 1;
                } else {
                    ciData[updateEvent.changeType]++;
                }
            }
            this._autoRefreshThrottler.process(autoRefreshUpdateEvents);

            BoardAutoRefreshCommon.PublishAutoRefreshTelemetry("WorkItemsUpdated", this._boardExtensionId, ciData);
        };

        hub.client.onCommonSettingsChanged = () => {
            if (sessionStorage.getItem(BoardAutoRefreshCommon.Settings.BoardSettingsChangedInCurrentSession) === "1") {
                sessionStorage.setItem(BoardAutoRefreshCommon.Settings.BoardSettingsChangedInCurrentSession, "0");
            }
            else {
                BoardAutoRefreshCommon.PublishAutoRefreshTelemetry("SettingsChanged", this._boardExtensionId, {});
                this._eventsHelper.fire(BoardAutoRefreshCommon.Events.CommonSettingsChanged, this);
            }
        };
    }

    private _subscribe(): Q.Promise<any> {
        var deferred = Q.defer<any>();

        this._connectionTimeout = setTimeout(() => {
            // If the connection start takes more the the conenction timeout, stop the connection
            this.stop();
        }, this._getConnectionTimeoutInMS());

        this.connection.start().then((hub: SignalR.HubConnection) => {
            this._clearTimeout();
            if (hub) {
                this._autoRefreshThrottler = new BoardAutoRefreshThrottling.AutoRefreshThrottler(this._boardExtensionId, this._eventsHelper);
                this._sessionStartTime = new Date();
                this._subscribed = true;
                Q(this.hub.server.watchKanbanBoard(this._boardExtensionId)).then(() => {
                    BoardAutoRefreshCommon.PublishAutoRefreshTelemetry("SignalRConnection", this._boardExtensionId,
                        {
                            "ConnectionState": "Connected"
                        });
                    deferred.resolve(hub);
                });
            }
            else {
                // Case due to our timeout
                deferred.reject({
                    name: "Kanban.AutoRefresh.Hub.Connection.Start.Timeout",
                    message: "AutoRefresh connection start call failed due to time out"
                });
            }
        }).fail((error: Error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    private _unsubscribe(): Q.Promise<any> {
        this._clearTimeout();
        return Q(this.hub.server.unwatchKanbanBoard(this._boardExtensionId)).then(() => {
            this._subscribed = false;
        });
    }

    public publishSignalRSessionLength(): void {
        if (this._sessionStartTime) {
            BoardAutoRefreshCommon.PublishAutoRefreshTelemetry("SignalRConnection", this._boardExtensionId,
                {
                    "ConnectionState": "Disconnected",
                    "SessionLength": (new Date()).getTime() - this._sessionStartTime.getTime()
                }, true);
            this._sessionStartTime = null;
        }
    }

    private _clearTimeout(): void {
        if (this._connectionTimeout) {
            clearTimeout(this._connectionTimeout);
            this._connectionTimeout = null;
        }
    }

    /**
     * Returns the timeout delay in MS.
     * Introducing a private for the purpose of testing
     */
    private _getConnectionTimeoutInMS(): number {
        return KanbanBoardHub.CONNECTION_TIME_OUT_DELAY_IN_MS;
    }
}


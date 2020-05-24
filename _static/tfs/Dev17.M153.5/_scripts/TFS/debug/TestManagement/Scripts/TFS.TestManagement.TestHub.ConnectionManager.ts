import * as Q from "q";
import * as Diag from "VSS/Diag";
import { EventService, getService as getEventService } from "VSS/Events/Services";
import { VssConnection } from "VSS/Service";
import * as VssContext from "VSS/Context";
import * as Utils_Core from "VSS/Utils/Core";
import Authentication_Contracts = require("VSS/Authentication/Contracts");
import Authentication_RestClient = require("VSS/Authentication/RestClient");
import Utils_String = require("VSS/Utils/String");
import * as RealTimeTestHub from "TestManagement/Scripts/TFS.TestManagement.RealTimeTestHub";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";

export class TestHubConnectionManager {

    public static getInstance(): TestHubConnectionManager {
        if (!this._instance) {
            TestHubConnectionManager._instance = new TestHubConnectionManager();
        }
        return this._instance;
    }

    constructor() {
        this._collectionIdToConnect = VssContext.getDefaultWebContext().collection.id;
        this._eventManager = getEventService();
        this._initializeConnectionHub();
    }

    private _initializeConnectionHub(): void {
        TestHubConnectionManager._testHub = (<any>$).connection.testHub;
        if (!TestHubConnectionManager._testHub ||  !RealTimeTestHub.TestHubProxy.hubConnection) {
            throw "testHub proxies are not loaded properly.";
        }

        let hubClient = TestHubConnectionManager._testHub.client;

        RealTimeTestHub.TestHubProxy.hubConnection.stateChanged((e) => {
            Diag.logVerbose('TFS.TestManagement.RealTimeTestHub: state changed from ' + e.oldState + ' to ' + e.newState);
        });

        RealTimeTestHub.TestHubProxy.hubConnection.reconnected(() => {
            Diag.logVerbose('TFS.ReleaseManagement.ReleaseHub.ConnectionManager: reconnected');
            this.onReconnect();
        });

        RealTimeTestHub.TestHubProxy.hubConnection.reconnecting(() => {
            Diag.logVerbose('TFS.ReleaseManagement.ReleaseHub.ConnectionManager: reconnecting');
        });

        RealTimeTestHub.TestHubProxy.hubConnection.disconnected(() => {
            console.log('TFS.TestManagement.RealTimeTestHub: disconnected');
            let reconnectDelay = this._getRandomNumberBetweenRange(TestHubConnectionManager.MinReconnectDelayMilliseconds, TestHubConnectionManager.MaxReconnectDelayMilliseconds);
            this.onDisconnect(reconnectDelay, "Disconnected from server.", TelemetryService.testHubSignalRConnectionDisconnected);
        });

        // On a hub connection error, try a reconnect in 5-60 seconds randomly. We can be smarter about using a successively increasing timeout.
        RealTimeTestHub.TestHubProxy.hubConnection.error((err) => {
            console.log('TFS.TestManagement.RealTimeTestHub: error - ' + err);
            let reconnectDelay = this._getRandomNumberBetweenRange(TestHubConnectionManager.MinReconnectDelayMilliseconds, TestHubConnectionManager.MaxReconnectDelayMilliseconds);
            this.onDisconnect(reconnectDelay, err, TelemetryService.testHubSignalRConnectionError);
        });

        // The SignalR client has detected a slow connection
        RealTimeTestHub.TestHubProxy.hubConnection.connectionSlow(() => {
            console.log('TFS.TestManagement.RealTimeTestHub: connection slow');
        });

        hubClient.testRunStatsChangedForBuild = (buildId: number) => {
            Diag.logInfo(`testHub: Signal received for build : ${buildId}`);
            if (this._buildId === buildId) {
                const buildEventArgs = new RealTimeTestHub.BuildEventArgs();
                buildEventArgs.buildId = buildId;
                this._eventManager.fire(RealTimeTestHub.RealTimeTestEvents.BUILD_TESTRUN_STATS_CHANGED, this, buildEventArgs);
            }
            else {
                Diag.logInfo(`Discarding the signal. Expected for build : ${this._buildId}, But received for build : ${buildId}`);
            }
        };

        hubClient.testRunStatsChangedForRelease = (releaseId: number, releaseEnvironmentId: number) => {
            Diag.logVerbose(`testHub: Signal received for release : ${releaseId} and environment : ${releaseEnvironmentId}`);
            if (this._releaseEnvironmentIds.has(`${releaseId}-${releaseEnvironmentId}`)) {
                const releaseEventArgs = new RealTimeTestHub.ReleaseEventArgs();
                releaseEventArgs.environmentId = releaseEnvironmentId;
                releaseEventArgs.releaseId = releaseId;
                this._eventManager.fire(RealTimeTestHub.RealTimeTestEvents.RELEASE_TESTRUN_STATS_CHANGED, this, releaseEventArgs);
            }
            else {
                Diag.logInfo(`Discarding the signal, ${releaseId}-${releaseEnvironmentId} are no more valid`);
            }
        };

    }

    public onReconnect(): void {
        this._connected = false;

        if (!this._forceKill) {
            if (this._buildId) {
                this._subscribeToBuild(this._buildId);
            }
            else {
                this._reConnectToReleaseEnvironments();
            }
        }
    }

    public onDisconnect(reconnectDelay: number, reason: string, telemetryEvent: string): void {
        this._connected = false;
        this._startPromise = null;

        if (!this._reconnectTimeout && !this._forceKill) {
            this._reconnectCount++;
            
            // Slow down the reconnect after a few attempts
            if (this._reconnectCount >= 4 && this._reconnectCount < 7) {
                // Add a minute to the delay
                reconnectDelay = reconnectDelay + 60000;
            } else if (this._reconnectCount >= 7 && this._reconnectCount < 10) {
                // Add 3 minutes to delay
                reconnectDelay = reconnectDelay + 180000;
            } else if (this._reconnectCount >= 10 && this._reconnectCount < 15) {
                // Add 5 minutes to delay
                reconnectDelay = reconnectDelay + 300000;
            } else if (this._reconnectCount >= 15) {
                // Add 15 minutes to delay
                reconnectDelay = reconnectDelay + 900000;
            }

            if (this._reconnectCount < TestHubConnectionManager.MaxReconnectAttempts) {
                this._reconnectTimeout = Utils_Core.delay(this, reconnectDelay, () => {
                    if (!this._buildId) {
                        this._subscribeToBuild(this._buildId);
                    }
                    else {
                        this._reConnectToReleaseEnvironments();
                    }
                });
            }

            if (telemetryEvent) {
                let eventProperties: IDictionaryStringTo<string> = {};
                eventProperties[TelemetryService.signalRReConnectCount] = this._reconnectCount ? this._reconnectCount.toString() : "";
                eventProperties[TelemetryService.signalRReconnectDelay] = reconnectDelay ? reconnectDelay.toString() : "";
                eventProperties[TelemetryService.signalRErrorMessage] = reason;
                TelemetryService.publishEvents(telemetryEvent, eventProperties);
            }
        }
    }

    public subscribeToBuild(buildId: number): Q.Promise<any> {
        let deferred = Q.defer<any>();
        if (this._buildId) {
            if (this._buildId === buildId) {
                deferred.resolve();
                return deferred.promise;
            }
            return this._unsubscribeToBuild(this._buildId).then(() => {
                return this._subscribeToBuild(buildId);
            });
        }
        else {
            return this._subscribeToBuild(buildId);
        }
    }

    public subscribeToRelease(releaseId: number, environmentId: number): Q.Promise<any> {
        let deferred = Q.defer<any>();
        if (this._releaseEnvironmentIds.has(`${releaseId}-${environmentId}`)) {
                deferred.resolve();
                return deferred.promise;
        }
        else {
            return this._subscribeToRelease(releaseId, environmentId);
        }
    }

    public unsubscribeToBuild(buildId: number): Q.Promise<any> {
        return Q(this._unsubscribeToBuild(buildId)).then(() => {
            this._buildId = null;
        });
    }

    public unsubscribeToRelease(releaseId: number, environmentId: number): Q.Promise<any> {
        return Q(this._unsubscribeToRelease(releaseId, environmentId)).then(() => {
            if (this._releaseEnvironmentIds.has(`${releaseId}-${environmentId}`)) {
                this._releaseEnvironmentIds.delete(`${releaseId}-${environmentId}`);
            }
            if (this._releaseEnvironmentIds.size === 0) {
                this._stopConnection();
            }
        });
    }

    private _reConnectToReleaseEnvironments() {
        if (this._releaseEnvironmentIds.size > 0) {
            this._releaseEnvironmentIds.forEach(element => {
                const elements = element.split("-");
                this._subscribeToRelease(+elements[0], +elements[1]);
            });
        }
    }

    private _getRandomNumberBetweenRange(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    private _subscribeToBuild(buildId: number): Q.Promise<any> {
        let deferred = Q.defer<any>();

        this._startConnection().then(() => {
                Q(TestHubConnectionManager._testHub.server.watchBuild(buildId)).then(() => {
                    Diag.logVerbose(`testHub : Started watching Build : ${buildId}`);
                    console.log(`testHub : Started watching Build : ${buildId}`);
                    this._buildId = buildId;
                    deferred.resolve(TestHubConnectionManager._testHub);
                }, (error: any) => {
                    Diag.logError(`Unable to call watchBuild ${buildId}, Error : ${Error}`);
                    deferred.reject(error);
                })
                .catch((reason: any) => {
                    Diag.logError(`Unable to call watchBuild ${buildId}, Error : ${reason}`);
                    console.error(`Unable to call watchBuild ${buildId}, Error : ${reason}`);
                });
        }).catch((error: Error) => {
            Diag.logVerbose(`Unable to watch build : ${buildId}`);
            Diag.logError(`Error: ${error}`);
            console.error(`Subscribe to build error : ${error}`);
            deferred.reject(error);
        });

        return deferred.promise;
    }

    private _subscribeToRelease(releaseId: number, environmentId: number): Q.Promise<any> {
        let deferred = Q.defer<any>();

        this._startConnection().then(() => {
            Q(TestHubConnectionManager._testHub.server.watchRelease(releaseId, environmentId)).then(() => {
                Diag.logVerbose(`testHub : Started watching release : ${releaseId} and environment : ${environmentId}`);
                if (!this._releaseEnvironmentIds.has(`${releaseId}-${environmentId}`)) {
                    this._releaseEnvironmentIds.add(`${releaseId}-${environmentId}`);
                }
                deferred.resolve(TestHubConnectionManager._testHub);
            }, (error: any) => {
                Diag.logError(`Unable to invoke watchRelease ${releaseId}, Error : ${error}`);
            });
        }).catch((error: Error) => {
            Diag.logVerbose(`Unable to watch release : ${releaseId} and environment : ${environmentId}` );
            Diag.logError(`Error: ${error}`);
            deferred.reject(error);
        });

        return deferred.promise;
    }

    private _unsubscribeToBuild(buildId: number): Q.Promise<any> {
        let deferred = Q.defer<any>();
        if (this._connected && TestHubConnectionManager._testHub && TestHubConnectionManager._testHub.server) {
            return Q(TestHubConnectionManager._testHub.server.unWatchBuild(buildId)).then(() => {
                Diag.logVerbose(`testHub : Stopped Watching Build : ${buildId}`);
            }, (error: any) => {
                Diag.logError(`Unable to call unWatchBuild ${buildId}, Error : ${Error}`);
            });
        } else {
            deferred.resolve(null);
            return deferred.promise;
        }
    }

    private _unsubscribeToRelease(releaseId: number, environmentId: number): Q.Promise<any> {
        let deferred = Q.defer<any>();
        if (this._connected && TestHubConnectionManager._testHub && TestHubConnectionManager._testHub.server) {
            return Q(TestHubConnectionManager._testHub.server.unWatchRelease(releaseId, environmentId)).then(() => {
                Diag.logVerbose(`testHub : Stopped Watching release : ${releaseId} and environment : ${environmentId}`);
            }, (error: any) => {
                Diag.logError(`Unable to call unWatchRelease ${releaseId}, Error : ${Error}`);
            });
        } else {
            deferred.resolve(null);
            return deferred.promise;
        }
    }

    private _startConnection(): Q.Promise<any> {
        if (this._connected) {
            return this._startPromise;
        }

        if (!LicenseAndFeatureFlagUtils.isPublishOnTCMServiceEnabled()) {
            // This will connect to TFS
            this._startPromise =  TestHubConnectionManager._connect(this._collectionIdToConnect, null)
            .then(() => {
                this._connected = true;
            })
            .catch((error: any) => {
                console.error(`Unable to start connection with testHub : ${error}`);
            });
        }
        else {
            this._startPromise = TestHubConnectionManager._getLiveLogsAuthToken()
            .then(
                (token) => {
                    return TestHubConnectionManager._connect(this._collectionIdToConnect, token);
                },
                (error) => {
                    return  TestHubConnectionManager._connect(this._collectionIdToConnect, null);
                }
            )
            .then(() => {
                this._connected = true;
            })
            .catch((error: any) => {
                console.error(`Unable to start connection with testHub : ${error}`);
            });
        }

        return this._startPromise;
    }

    private static _getLiveLogsAuthToken(): Q.Promise<string> {
        let deferred = Q.defer<string>();
        if (!TestHubConnectionManager._isHosted) {
            deferred.resolve("");
        }
        else {
            let tokenToCreate = <Authentication_Contracts.WebSessionToken>{
                appId: Utils_String.EmptyGuidString,
                force: false,
                name: Utils_String.EmptyGuidString,
                tokenType: Authentication_Contracts.DelegatedAppTokenType.Session,
                namedTokenId: "TCM.LiveTestResults",
                validTo: null,
                token: null
            };

            const _authTokenClient: Authentication_RestClient.AuthenticationHttpClient = this._getAuthClient();
            _authTokenClient.createSessionToken(tokenToCreate).then((createdToken: Authentication_Contracts.WebSessionToken) => {
                deferred.resolve(createdToken.token);
            },
                (error) => {
                    deferred.reject(error);
                });
        }
        
        return deferred.promise;
    }

    private static _connect(collectionId: string, authToken: string): Q.Promise<any> {
        let deferred = Q.defer();
        let options: any = {};
        options.withCredentials = false;
        options.transport = "longPolling";

        if (!TestHubConnectionManager._isHosted) {
            RealTimeTestHub.TestHubProxy.hubConnection.qs = "contextToken=" + collectionId;
        }
        else {
            TestHubConnectionManager._overrideSignalRGetUrl((<any>$).signalR.transports._logic);
            RealTimeTestHub.TestHubProxy.hubConnection.qs = "contextToken=" + collectionId;

            if (!TestHubConnectionManager._isOldDomainUrl()){
                options = {};
                options.withCredentials = true;
            }
            else if (LicenseAndFeatureFlagUtils.isUseOnlyLongPollingEnabled() && authToken) {
                options.transport = "longPolling";
                (<any>$).signalR.ajaxDefaults.headers = { Authorization: "Bearer " + authToken };
            }
            else if (authToken){
                RealTimeTestHub.TestHubProxy.hubConnection.qs += "&" + "Authorization=" + authToken;
            }
        }
        
        // Logging
       RealTimeTestHub.TestHubProxy.hubConnection.logging = true;
       // NB: SignalR has a bug where it doesn't clean up the socket object if connection fails. 
       //     We set this to null ourselves to make sure start() succeeds by trying all transports
       RealTimeTestHub.TestHubProxy.hubConnection.socket = null;
       // Connect to SignalR hub
       RealTimeTestHub.TestHubProxy.hubConnection.start(options)
            .done(() => {
               console.log('TFS.TestManagement.RealTimeTestHub: Hub started. Transport = ' + RealTimeTestHub.TestHubProxy.hubConnection.transport.name);
                deferred.resolve("");
            })
            .fail((error: any) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    private static _isOldDomainUrl(): boolean {
        // Checking if the url is from old domain or new domain
        return TestHubConnectionManager.OldDomainUrlSuffix.some((suffix: string) => window.location.hostname.indexOf(suffix) > 0);
    }

    private static _getAuthClient(): Authentication_RestClient.AuthenticationHttpClient {
        if (!this.tfsConnection) {
            this.tfsConnection = new VssConnection(VssContext.getDefaultWebContext());
        }        
        return this.tfsConnection.getHttpClient(Authentication_RestClient.AuthenticationHttpClient, this.TcmServiceTypeInstanceId);
    }

    private static _overrideSignalRGetUrl(signalRLogic: any) {
        // override signalR's getUrl in order to support https://codedev.ms/{accountName}
        // see https://github.com/SignalR/SignalR/issues/3776 for more information
        const getUrl = signalRLogic.getUrl;

        signalRLogic.getUrl = (connection, transport, reconnecting, poll, ajaxPost) => {
            let url = getUrl(connection, transport, reconnecting, poll, ajaxPost);
            let startIndex = 0;
            if (transport === "webSockets") {
                // * For TCM SignalR, isPrefixMatched = true => prefix = https://vstmr.codedev.ms and connection.url = https://vstmr.codedev.ms/devfab//_apis/c8d38caa-258b-4e32-b5ff-f6c76861d036/signalr
                // * For TFS    SignalR, isPrefixMatched = false => prefix = https://codedev.ms and connection.url = devfab/_apis/c8d38caa-258b-4e32-b5ff-f6c76861d036/signalr

                const prefix: string = connection.protocol + "//" + connection.host;
                const prefixMatchIndex: number = connection.url.indexOf(prefix);
                const isPrefixMatched: boolean = prefixMatchIndex >= 0;
                startIndex = isPrefixMatched ? prefixMatchIndex + prefix.length : 0;
            }
            return connection.url.substring(startIndex) + url.substring(url.indexOf(connection.appRelativeUrl) + connection.appRelativeUrl.length);
        };
    }

    private _stopConnection(): void {
        if (RealTimeTestHub.TestHubProxy.hubConnection) {
            RealTimeTestHub.TestHubProxy.hubConnection.stop();
        }
        this._forceKill = true;
        this._connected = false;
    }

    public stop(): void {
        this._releaseEnvironmentIds.clear();
        this._buildId = null;
        this._stopConnection();
    }


    private static _isHosted: boolean = VssContext.getPageContext().webAccessConfiguration.isHosted;
    private static _testHub: any;
    private static _instance: TestHubConnectionManager;
    private static tfsConnection: VssConnection;
    private static TcmServiceTypeInstanceId: string = "00000054-0000-8888-8000-000000000000";
    private static MinReconnectDelayMilliseconds: number = 5000;
    private static MaxReconnectDelayMilliseconds: number = 60000;
    private static MaxReconnectAttempts: number = 10;
    private static readonly OldDomainUrlSuffix: string[] = ["visualstudio.com", "vsallin.net", "tfsallin.net", "vsts.me"];

    private _startPromise: Q.Promise<any>;
    private _forceKill: boolean = false;
    private _collectionIdToConnect: string;
    private _buildId: number;
    private _releaseEnvironmentIds: Set<string> = new Set();
    private _eventManager: EventService;
    private _connected: boolean = false;
    private _subscribed: boolean = false;
    private _reconnectTimeout: any;
    private _reconnectCount: number;
}
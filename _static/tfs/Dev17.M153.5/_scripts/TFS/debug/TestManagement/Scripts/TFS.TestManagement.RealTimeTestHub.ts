import * as Diag from "VSS/Diag";
import * as Q from "q";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import * as PlatformContracts from "VSS/Common/Contracts/Platform";
import * as VssContext from "VSS/Context";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as StringUtils from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

export interface ISignalRUrlData {
    connectionUrl: string;
}

export class RealTimeTestEvents {
    public static BUILD_TESTRUN_STATS_CHANGED: string = "BuildTestRunStatsChanged";
    public static RELEASE_TESTRUN_STATS_CHANGED: string = "ReleaseTestRunStatsChanged";
}

export class BuildEventArgs {
    buildId: number;
}

export class ReleaseEventArgs {
    releaseId: number;
    environmentId: number;
}

export function GetSignalRPageData(): ISignalRUrlData {
    const dataService: WebPageDataService = getService(WebPageDataService);
    const pageData = dataService.getPageData<ISignalRUrlData>("ms.vss-test-web.test-tab-signalr-data-provider");

    return pageData;
}

export class TestHubProxy {

    public static load(): IPromise<boolean> {
        let loaderPromise: Q.Deferred<boolean> = Q.defer<boolean>();
        if (TestHubProxy._loaded) {
            loaderPromise.resolve(true);
            return loaderPromise.promise;
        }
  
        const tfsContext = TfsContext.getDefault();
        const thirdPartyUrl = tfsContext.configuration.get3rdPartyStaticRootPath();
        const minified = !Diag.getDebugMode() ? "min." : "";

        // Loading jquery.signalR-vss.2.2.0-M140 instead of jquery.signalR-vss.2.2.0 
        // As it will class with release page script with same name.
        const signalRScript = StringUtils.format("{0}_scripts/jquery.signalR-vss.2.2.0-M140.{1}js", thirdPartyUrl, minified);

        // Having this as a double check, even though we have the check in jquery.signalR-vss.2.2.0-M140
        // To mitigate the prod CDN scenario if the file is not updated/reflected on time.
        if (!(<any>$).signalR) {
            VSS.requireModules([signalRScript]).then(
            () => {
                TestHubProxy._loadSignalRClient();
                loaderPromise.resolve(true);
            },
            (error: any) => {
                loaderPromise.reject(error);
            }
            );
        }
        else {
            TestHubProxy._loadSignalRClient();
            loaderPromise.resolve(true);
        }

        return loaderPromise.promise;
    }

    private static _loadSignalRClient(): void {
        if (TestHubProxy._loaded) {
            return;
        }
        TestHubProxy._loaded = true;

        let signalRConfig: any = $;

        // generated method
        function makeProxyCallback(hub, callback) {
            return function () {
                // Call the client hub method
                callback.apply(hub, $.makeArray(arguments));
            };
        }

        function registerHubProxies(instance, shouldSubscribe) {
            let key, hub, memberKey, memberValue, subscriptionMethod;

            for (key in instance) {
                if (instance.hasOwnProperty(key)) {
                    hub = instance[key];

                    if (!(hub.hubName)) {
                        // Not a client hub
                        continue;
                    }

                    if (shouldSubscribe) {
                        // We want to subscribe to the hub events
                        subscriptionMethod = hub.on;
                    } else {
                        // We want to unsubscribe from the hub events
                        subscriptionMethod = hub.off;
                    }

                    // Loop through all members on the hub and find client hub functions to subscribe/unsubscribe
                    for (memberKey in hub.client) {
                        if (hub.client.hasOwnProperty(memberKey)) {
                            memberValue = hub.client[memberKey];

                            if (!$.isFunction(memberValue)) {
                                // Not a client hub function
                                continue;
                            }

                            subscriptionMethod.call(hub, memberKey, makeProxyCallback(hub, memberValue));
                        }
                    }
                }
            }
        }

        signalRConfig.hubConnection.prototype.createHubProxies = function () {
            let proxies = {};
            this.starting(function () {
                // Register the hub proxies as subscribed
                // (instance, shouldSubscribe)
                registerHubProxies(proxies, true);

                this._registerSubscribedHubs();
            }).disconnected(function () {
                // Unsubscribe all hub proxies when we "disconnect".  This is to ensure that we do not re-add functional call backs.
                // (instance, shouldSubscribe)
                registerHubProxies(proxies, false);
            });

            proxies['testHub'] = this.createHubProxy('testHub'); 
            proxies['testHub'].client = { };
            proxies['testHub'].server = {
                unWatchBuild: function (buildId) {
                    return proxies['testHub'].invoke.apply(proxies['testHub'], $.merge(["unWatchBuild"], $.makeArray(arguments)));
                 },

                unWatchRelease: function (releaseId, environmentId) {
                    return proxies['testHub'].invoke.apply(proxies['testHub'], $.merge(["unWatchRelease"], $.makeArray(arguments)));
                 },

                watchBuild: function (buildId) {
                    return proxies['testHub'].invoke.apply(proxies['testHub'], $.merge(["watchBuild"], $.makeArray(arguments)));
                 },

                watchRelease: function (releaseId, environmentId) {
                    return proxies['testHub'].invoke.apply(proxies['testHub'], $.merge(["watchRelease"], $.makeArray(arguments)));
                 }
            };

            return proxies;
        };

        let pageContext: PlatformContracts.PageContext = VssContext.getPageContext();
        TestHubProxy._loadTcmTestHub(signalRConfig, pageContext);

    }

    private static _loadTcmTestHub(signalRConfig: any, pageContext: PlatformContracts.PageContext): void {
        TestHubProxy.hubConnection = signalRConfig.hubConnection(this._getSignalRConnectionUrl(), { useDefaultPath: false });
        $.extend(signalRConfig.signalR, TestHubProxy.hubConnection.createHubProxies());
    }

    private static _getSignalRConnectionUrl(): string {
        const signalRPageData: ISignalRUrlData = GetSignalRPageData();
        if (signalRPageData && signalRPageData.connectionUrl) {
            return signalRPageData.connectionUrl;
        } else {
            return "signalr";
        }
    }

    private static _loaded: boolean = false;

    // The testHub connection copy of the $.connection.hub
    public static hubConnection: any;
}
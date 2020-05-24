/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

/// Imports of 3rd Party ///
import Q = require("q");
/// Imports of VSS ///
import Ajax = require("VSS/Ajax");
import Bundling = require("VSS/Bundling");
import Constants_Platform = require("VSS/Common/Constants/Platform");
import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Contributions_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Events_Action = require("VSS/Events/Action");
import Events_Services = require("VSS/Events/Services");
import FeatureServices = require("VSS/FeatureAvailability/Services");
import { HubsService, HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import { getNavigationHistoryService, INavigationPopStateEvent } from "VSS/Navigation/NavigationHistoryService";
import { getDefaultPageTitle } from "VSS/Navigation/Services";
import LocalPageData = require("VSS/Contributions/LocalPageData");
import Performance = require("VSS/Performance");
import PlatformContracts = require("VSS/Common/Contracts/Platform");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Serialization = require("VSS/Serialization");
import Service = require("VSS/Service");
import Utils_File = require("VSS/Utils/File");
import Utils_String = require("VSS/Utils/String");
import Utils_Url = require("VSS/Utils/Url");
import VSS = require("VSS/VSS");

import Dialogs_Async = require("VSS/Controls/Dialogs");

const spinnerDelayName = "show-spinner";
const spinnerClassName = "spinner";

interface IHubPushState {
    hubId: string;
    urlPath: string;
}

export interface INavigatedHubEventArgs {
    navigatedHubId: string;
    navigatedHubGroupId: string;
}

export class ExternalHub extends Controls.BaseControl {

    private static HUB_SWITCH_LOAD_DELAY = 500;

    private _navigationIndex: number;
    private _hubsService: HubsService;
    private _xhrHubSwitchingEnabled: boolean;
    private _extensionHost: Contributions_Controls.IExtensionHost;

    public initialize() {
        super.initialize();
        this._navigationIndex = 0;
        this._hubsService = Service.getLocalService(HubsService);
        this._xhrHubSwitchingEnabled = null;

        Performance.getScenarioManager().split("ExternalHub.initialize");

        // Handle hub navigation events by switching to the specified hub
        Events_Action.getService().registerActionWorker("handle-hub-navigate", (actionArgs, next) => {
            return this.navigateToNewHub(actionArgs.hubId, actionArgs.url);
        });

        const navHistoryService = getNavigationHistoryService();
        Events_Action.getService().registerActionWorker("handle-hub-state-replace", (actionArgs, next) => {
            const hub: Hub = this._hubsService.getHubById(actionArgs.hubId);
            if (!this.isHubXHRNavigable(hub)) {
                return false;
            }

            // Only update the URL of the history entry
            navHistoryService.replaceState(undefined, actionArgs.url);
            return true;
        });

        // Update the current history entry so that browser-back works for the initial page that we've loaded here
        let resolvedUrl = !this._options.skipResolvedUrlUpdate && this.getNavigationSettings()["resolvedUrl"];

        let replaceStateUrl: string = null;
        if (resolvedUrl) {
            // Append the current location's hash (#) part of the url
            // to the replacement url since the server never saw it.
            replaceStateUrl = resolvedUrl + window.location.hash;
        }

        navHistoryService.replaceState(undefined, replaceStateUrl);

        // Register handler to restore hubs from push state (i.e. after browser back/forward operations)
        navHistoryService.subscribe(this.popStateSubscription);

        if (!this._options.skipInitialHubLoad) {

            var contributionId: string = this._options.contributionId;
            if (!contributionId) {
                contributionId = this._hubsService.getSelectedHubId();
            }

            if (contributionId) {
                const extensionService = Service.getService(Contributions_Services.ExtensionService);
                extensionService.getContribution(contributionId).then((contribution) => {
                    return this.createHost(contribution);
                });
            }
        }
    }

    public dispose() {
        super.dispose();
        const navHistoryService = getNavigationHistoryService();
        navHistoryService.unsubscribe(this.popStateSubscription);
    }

    private isHubXHRNavigable(hub: Hub): boolean {
        if (!hub || !hub.supportsXHRNavigate) {
            // No matching hub or it doesn't support XHR-style navigation. Return false to indicate that the navigation was not handled.
            return false;
        }

        return true;
    }

    private getNavigationSettings() {
        const dataService = Service.getService(Contributions_Services.WebPageDataService);
        const navSettings = dataService.getPageData<any>("ms.vss-tfs-web.navigation-settings-data-provider");
        return navSettings || {};
    }

    /**
     * Navigate the page to the specified hub
     *
     * @param hubId Id of the hub to navigate to
     * @param url (Optional) Specific url to navigate to. The hub's default url if not specified.
     * @param cancelCallback Callback to invoke if the navigation was cancelled by the user (after prompted with unsaved changes)
     * @returns true if the navigation was handled.
     */
    private navigateToNewHub(hubId: string, url?: string, cancelCallback?: () => void): boolean {

        const hub: Hub = this._hubsService.getHubById(hubId);
        if (!this.isHubXHRNavigable(hub)) {
            return false;
        }

        if (!url) {
            url = hub.uri;
        }

        if (this._options.handleHubNavigation) {
            this._options.handleHubNavigation(hubId, url);
            return true;
        }

        const navigateId = ++this._navigationIndex;

        let unloadText = Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_UNLOAD,
            {
                navigatedHubId: hub.id,
                navigatedHubGroupId: hub.groupId
            } as INavigatedHubEventArgs
        );
        if (unloadText) {
            VSS.requireModules(["VSS/Controls/Dialogs"]).spread((_Dialogs: typeof Dialogs_Async) => {
                if (navigateId === this._navigationIndex) {
                    _Dialogs.showConfirmNavigationDialog(unloadText)
                        .then(() => {
                            if (navigateId === this._navigationIndex) {
                                this.finishNavigateToNewHub(hub, url, navigateId);
                            }
                        }, () => {
                            // Navigate-away cancelled
                            if (navigateId === this._navigationIndex && cancelCallback) {
                                cancelCallback();
                            }
                        });
                }
            });
        }
        else {
            this.finishNavigateToNewHub(hub, url, navigateId);
        }

        return true;
    }

    private preXhrHubNavigate(hub: Hub) {

        const pageContext = Context.getPageContext();

        // Update the hubs context to reflect the newly selected hub and fire the event to let the page's navigation/header UI react.
        pageContext.hubsContext.selectedHubGroupId = hub.groupId;
        pageContext.hubsContext.selectedHubId = hub.id;
        pageContext.hubsContext.allHubs.forEach(h => h.isSelected = h.id === hub.id);

        const hubEvent = <IHubEventArgs>{
            hub: hub,
            hubId: hub.id
        };
        Events_Services.getService().fire(HubEventNames.SelectedHubChanged, this, hubEvent);

        Events_Services.getService().fire(HubEventNames.PreXHRNavigate, this, hubEvent);
        this.hubNavigateStarting();
    }

    public prepareForHubNavigate() {
        Events_Services.getService().fire(HubEventNames.XHRNavigateStarted, this);
    }

    public hubNavigateStarting() {
        this.getElement().empty();

        VSS.globalMessageIndicator.clearGlobalMessages();

        this.showSpinner();

        if (this._extensionHost) {
            this._extensionHost.dispose();
            this._extensionHost = null;
        }
    }

    private popStateSubscription = (popStateEvent: INavigationPopStateEvent) => {
        if (popStateEvent.isNewRouteId) {
            // If the history entry contains 'vssNavigationState' then this navigate event is being handled by the
            // new web platform's support and can be ignored here.
            if (!history.state || !history.state.vssNavigationState) {
                const url = window.location.href;
                const handled = this.navigateToNewHub(popStateEvent.newState.navigationElementId, url, () => {
                    // Restore URL to what it was before the pop-state event (which was cancelled)
                    // Ideally, we could restore our place in the browser history stack, however, there is
                    // not a reliable way to determine exactly where we came from. This at least restores
                    // the URL to match what the page is showing.
                    if (popStateEvent.oldState) {
                        const navHistoryService = getNavigationHistoryService();
                        navHistoryService.pushState(popStateEvent.oldState.state, popStateEvent.oldState.url, popStateEvent.oldState.routeId, popStateEvent.oldState.navigationElementId);
                    }
                });
                if (!handled) {
                    window.location.href = url;
                }
            }
        }
    }

    private postXhrHubNavigate(hub: Hub, pageData: Contracts_Platform.PageXHRData, navigateId: number, previousStaticContentVersions: IDictionaryStringTo<string>, contributionId: string) {

        const pageContext = Context.getPageContext();

        const hubEvent = <IHubEventArgs>{
            hub: hub,
            hubId: hub.id,
            pageXHRData: pageData
        };

        // Update the page context's navigation context
        pageContext.navigation = pageData.navigation;
        pageContext.diagnostics.sessionId = pageData.activityId;

        // Update bundles and page context from the page XHR response
        if (pageData.bundles) {
            Bundling.injectBundles(pageData.bundles);
        }
        Context.addFeatureAvailability(pageData.featureAvailability);
        Context.addServiceLocations(pageData.serviceLocations);

        const extensionService = Service.getService(Contributions_Services.ExtensionService);
        extensionService.registerContributionData(pageData.contributionsData, true);

        const webPageDataService = Service.getService(Contributions_Services.WebPageDataService);
        return webPageDataService.registerProviderData(pageData.dataProviderData, <any>pageData.contributionsData.contributions, true).then(() => {

            if (navigateId !== this._navigationIndex) {
                // Another navigation event has occurred. Cancel this one.
                return;
            }

            const currentStaticContentVersions = Context.getStaticContentVersionsByService();
            if (pageData.staticContentVersion !== pageContext.webAccessConfiguration.paths.staticContentVersion ||
                this.hasStaticContentVersionChanged(previousStaticContentVersions, currentStaticContentVersions)) {

                // A deployment has occurred since the time this page was loaded. Reload the page from the server in this
                // case since our client-side content may be incompatible with what the server expects.
                window.location.reload();
                return;
            }

            let resolvedUrl = (!this._options.skipResolvedUrlUpdate && this.getNavigationSettings()["resolvedUrl"]) || window.location.href;
            const navHistoryService = getNavigationHistoryService();
            navHistoryService.replaceState(undefined, resolvedUrl, pageData.navigation.routeId, hub.id);

            // Allow services to update their state/context based on the new page data
            Events_Services.getService().fire(HubEventNames.ProcessXHRNavigate, this, hubEvent);

            // Display the new UI
            return extensionService.getContribution(contributionId).then((contribution) => {

                if (navigateId !== this._navigationIndex) {
                    // Another navigation event has occurred. Cancel this one.
                    return;
                }

                return this.createHost(contribution).then((host) => {

                    if (navigateId !== this._navigationIndex) {
                        // Another navigation event has occurred. Cancel this one.
                        host.dispose();
                        return;
                    }

                    // Allow any post-UI updates to run
                    Events_Services.getService().fire(HubEventNames.PostXHRNavigate, this, hubEvent);

                    return host.getLoadPromise();
                });
            }, VSS.handleError);
        });
    }

    private finishNavigateToNewHub(hub: Hub, url: string, navigateId: number): IPromise<any> {

        const pageContext = Context.getPageContext();
        const previousStaticContentVersions = Context.getStaticContentVersionsByService();

        let uri = new Utils_Url.Uri(url);
        let urlPath = uri.path;
        if (urlPath[0] === '/') {
            urlPath = urlPath.substr(1);
        }

        // Update the browser's URL and title
        if (window.location.href !== url) {
            const navHistoryService = getNavigationHistoryService();
            navHistoryService.pushState(undefined, url, "", hub.id);
            document.title = getDefaultPageTitle(hub.name);
        }

        this.prepareForHubNavigate();
        this.preXhrHubNavigate(hub);

        // Issue the XHR request to get details of the new page
        uri.addQueryParam("_xhr", "true");

        return Ajax.issueRequest(
            uri.absoluteUri, {
                dataType: "json"
            }).then((result) => {

                if (navigateId !== this._navigationIndex) {
                    // Another navigation event has occurred. Cancel this one.
                    return;
                }

                const pageData: Contracts_Platform.PageXHRData = Serialization.ContractSerializer.deserialize(result, PlatformContracts.TypeInfo.PageXHRData);
                return this.postXhrHubNavigate(hub, pageData, navigateId, previousStaticContentVersions, hub.id);
            });
    }

    public handleNewPlatformFps(xhrData: Contracts_Platform.PageXHRData, newPageContext: PageContext, contributionId?: string): IPromise<any> {

        const hub = newPageContext.hubsContext.hubs.filter(h => h.id === newPageContext.hubsContext.selectedHubId)[0];

        if (!hub.supportsXHRNavigate) {
            window.location.reload();
            return;
        }

        const navigateId = ++this._navigationIndex;

        const pageContext = Context.getPageContext();
        const previousStaticContentVersions = Context.getStaticContentVersionsByService();

        xhrData.dataProviderData = LocalPageData.resetDataProviderResults();

        this.preXhrHubNavigate(hub);
        return this.postXhrHubNavigate(hub, xhrData, navigateId, previousStaticContentVersions, contributionId || hub.id);
    }

    private showSpinner(): void {
        this.delayExecute(spinnerDelayName, ExternalHub.HUB_SWITCH_LOAD_DELAY, true, () => {
            const $spinner = $("<div />").addClass(spinnerClassName).appendTo(this._element);
            $("<div />").addClass("spinner-circle").appendTo($spinner);
            $("<label />").addClass("spinner-label").text(Resources_Platform.LoadingHubMessage).appendTo($spinner);
        });
    }

    private hideSpinner(): void {
        if (!this._disposed) {
            this.cancelDelayedFunction(spinnerDelayName);
            this._element.find(`.${spinnerClassName}`).remove();
        }
    }

    private hasStaticContentVersionChanged(
        previousVersions: IDictionaryStringTo<string>,
        currentVersions: IDictionaryStringTo<string>): boolean {

        for (let serviceId in currentVersions) {
            const previousVersion = previousVersions[serviceId];
            if (previousVersion && previousVersion !== currentVersions[serviceId]) {
                return true;
            }
        }
        return false;
    }

    private createHost(contribution: Contributions_Contracts.Contribution): IPromise<Contributions_Controls.IExtensionHost> {
        var postData = contribution.properties["post"] ? Context.getDefaultWebContext() : null;
        var fallbackBaseUri: string = Service.getService(Contributions_Services.ExtensionService).getFallbackUri(contribution);

        let pageContext = undefined;

        if (!Contributions_Services.ExtensionHelper.isContributionTrusted(contribution)) {
            // External host handles progress indication itself
            this.hideSpinner();
        }
        else {
            // We don't want to provide the pageContext to non-trusted extensions.
            pageContext = this._options.pageContext;
        }

        const config = {
            onBeforeRender: () => {
                this.hideSpinner();
            },
            _pageContext: pageContext
        };

        return this.beginGetHubContentUri(contribution).then((uri: string) => {
            if (fallbackBaseUri) {
                return this.beginGetHubContentUri(contribution, fallbackBaseUri).then((fallbackuri: string) => {
                    this._extensionHost = Contributions_Controls.createExtensionHostForContribution(this._element, uri, contribution, config, postData, true, null, fallbackuri);
                    return this._extensionHost;
                });
            } else {
                this._extensionHost = Contributions_Controls.createExtensionHostForContribution(this._element, uri, contribution, config, postData, true);
                return this._extensionHost;
            }
        });
    }

    private beginGetHubContentUri(contribution: Contributions_Contracts.Contribution, baseUri: string = null): IPromise<string> {
        return Contributions_Services.ExtensionHelper.resolveUriTemplateProperty(contribution, Context.getDefaultWebContext(), "uri", baseUri).then((expandedUri: string) => {

            if (!expandedUri) {
                return null;
            }

            var hubUri = Utils_Url.Uri.parse(expandedUri);
            var currentUri = Utils_Url.Uri.parse(window.location.href);

            // Add an extra path segment of the current uri to the hub's url
            var currentPageParameters = Context.getPageContext().navigation.currentParameters;
            if (currentPageParameters) {
                var currentPageSegments = currentPageParameters.split("/");

                // Peel off first path segment which is the full contribution id
                currentPageSegments.shift();

                if (currentPageSegments.length > 0) {
                    hubUri.path = Utils_File.combinePaths(hubUri.path, currentPageSegments.join('/'));
                }
            }

            // Add any query parameters of the current uri to the hub's url
            if (currentUri.queryString) {
                hubUri.queryString += "&" + currentUri.queryString;
            }

            // If a hash string is supplied in the current url, apply it to the hub's url
            if (currentUri.hashString) {
                hubUri.hashString = currentUri.hashString;
            }

            return hubUri.absoluteUri;
        });
    }
}

Controls.Enhancement.registerEnhancement(ExternalHub, ".hub-external");

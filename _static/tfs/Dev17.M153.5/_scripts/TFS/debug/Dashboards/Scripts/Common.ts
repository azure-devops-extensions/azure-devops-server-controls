
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import TFS_Dashboards_RestClient = require("TFS/Dashboards/RestClient");
import TFS_Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");

import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Contribution_Contracts = require("VSS/Contributions/Contracts");
import Contribution_Services = require("VSS/Contributions/Services");
import Locations = require("VSS/Locations");
import Navigation_Services = require("VSS/Navigation/Services");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_File = require("VSS/Utils/File");
import Utils_String = require("VSS/Utils/String");
import VSS_Service = require("VSS/Service");
import VSS = require("VSS/VSS");
import Context = require("VSS/Context");
import Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import Q = require("q");
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import { getFromPage } from "Dashboards/Scripts/Common.PageHelpers";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

import Gallery_RestClient_NOREQUIRE = require("VSS/Gallery/RestClient");
import { getLWPService } from "VSS/LWP";

export function getDashboardTeamContext(): Contracts_Platform.TeamContext {
    const teamDataProviderContributionId = "ms.vss-dashboards-web.dashboards-team-data-provider";
    const webPageDataService = VSS_Service.getService(Contribution_Services.WebPageDataService);
    const webPageData: { value: any } = webPageDataService.getPageData(teamDataProviderContributionId);

    if (webPageData && webPageData.value) {
    // If data is available from the page data, use that:
        return webPageData.value;
    } else {
    // Else, try to get the data from the modern web platform contribution service:
        const contributionService = getLWPService("IVssContributionService");

        if (contributionService) {
            let lwpPageData: { value: any } = contributionService.getData(teamDataProviderContributionId);
            if (lwpPageData && lwpPageData.value) {
                return lwpPageData.value;
            }
        }
    }

    // If the data isn't available from the team data provider and we have team in the context, use that.
    const webContext = Context.getDefaultWebContext();
    if (webContext.team) {
        return webContext.team;
    }

    // This would signify a non-team dashboard once we start supporting those.
    return null;
}

export function getTeamContext(): TFS_Core_Contracts.TeamContext {
    var context = Context.getDefaultWebContext();
    var teamContext = getDashboardTeamContext();
    return <TFS_Core_Contracts.TeamContext>{
        projectId: context.project.id,
        teamId: teamContext.id,
        team: teamContext.name,
        project: context.project.name
    };
}

export class DashboardHttpClientFactory {

    private static _dashboardHttpClient: TFS_Dashboards_RestClient.DashboardHttpClient;

    public static getClient(): TFS_Dashboards_RestClient.DashboardHttpClient {
        if (!this._dashboardHttpClient) {
            var tfsConnection: VSS_Service.VssConnection = new VSS_Service.VssConnection(TFS_Host_TfsContext.TfsContext.getDefault().contextData);
            this._dashboardHttpClient = tfsConnection.getHttpClient<TFS_Dashboards_RestClient.DashboardHttpClient>(TFS_Dashboards_RestClient.DashboardHttpClient);
        }

        return this._dashboardHttpClient;
    }
}

/**
 * Give method for the page of the dashboard that can be reused everywhere.
 */
export class DashboardPageExtension {

    public static FragmentID: string = TFS_Dashboards_Constants.DashboardUrlParams.ActiveDashboardId;
    public static RouteParameterKey: string = "parameters";

    /**
     * getActiveDashboard return the dashboards ID that is currently inside the URL's address bar, or provided in the data island
     * return Empty GUID when 'Welcome' L2 is selected because there is not data island
     * @return : {string} Guid of the Dashboard.
     */
    public static getActiveDashboard(): string {
        const currentState: any = Navigation_Services.getHistoryService().getCurrentState();
        return currentState[DashboardPageExtension.FragmentID] ||
            DashboardPageExtension.getDefaultDashboardIdFromDataIsland() ||
            DashboardPageExtension.getDashboardIdFromRouteValues() ||
            Utils_String.EmptyGuidString;
    }

    public static getDashboardIdFromRouteValues(): string {
        const navHistoryService = getNavigationHistoryService();
        const state = navHistoryService.getState();
        return state[DashboardPageExtension.RouteParameterKey];
    }

    /**
    * This method sets the active dashboard to the page hash.
    * @param {string} dashboardId - the guid for the dashboard
    * @param {boolean} suppressNavigate - indicate whether the navigation handlers should be suppressed. Defaults to false.
    */
    public static setActiveDashboard(dashboardId: string, suppressNavigate: boolean = false): void {
        var currentState: any = Navigation_Services.getHistoryService().getCurrentState();
        currentState[DashboardPageExtension.FragmentID] = dashboardId;
        Navigation_Services.getHistoryService().addHistoryPoint(null, currentState, null, suppressNavigate);
    }

    /**
     * Get the default dashboard from the data island
     */
    public static getDefaultDashboardIdFromDataIsland(): string {
        return getFromPage<TFS_Dashboards_Contracts.Dashboard>(
            TFS_Dashboards_Constants.DashboardPageDataProviderKeys.Dashboard,
            TFS_Dashboards_Constants.JsonIslandDomClassNames.DefaultDashboardWidgets).id;
    }

    /**
     * Get the list of all widgets for the default dashboard from the data island.
     */
    public static getWidgetsFromDataIsland(): TFS_Dashboards_Contracts.DashboardResponse {
        return getFromPage<TFS_Dashboards_Contracts.Dashboard>(
            TFS_Dashboards_Constants.DashboardPageDataProviderKeys.Dashboard,
            TFS_Dashboards_Constants.JsonIslandDomClassNames.DefaultDashboardWidgets);
    }

    /**
     * Get the list of all dashboards from web page data
     */
    public static getDashboardsFromWebPageData(): TFS_Dashboards_Contracts.DashboardGroup {
        let webPageDataSvc = VSS_Service.getService(Contribution_Services.WebPageDataService);
        return webPageDataSvc.getPageData<TFS_Dashboards_Contracts.DashboardGroup>(
            TFS_Dashboards_Constants.DashboardProviderPropertyBagNames.DashboardsLegacy);
    }

    /**
     * Get the list of teams the user is a member of
     */
    public static getTeamsMembersOf(): IPromise<TFS_Core_Contracts.WebApiTeam[]> {
        let webPageDataSvc = VSS_Service.getService(Contribution_Services.WebPageDataService);
        const contribution = {
            id: TFS_Dashboards_Constants.DashboardProviderPropertyBagNames.TeamMemberships,
            properties: {
                "serviceInstanceType": ServiceInstanceTypes.TFS
            }
        } as Contribution_Contracts.Contribution;

        return webPageDataSvc.ensureDataProvidersResolved([contribution]).then(() => {
            return Q.resolve(webPageDataSvc.getPageData<TFS_Core_Contracts.WebApiTeam[]>(TFS_Dashboards_Constants.DashboardProviderPropertyBagNames.TeamMemberships));
        }, () => {
            return Q.resolve([]);
        })
    }

    /**
    * Maximum widgets that can be added to a dashboard
    */
    public static getMaxWidgetsPerDashboard(): number {
        return getFromPage<number>(
            TFS_Dashboards_Constants.DashboardPageDataProviderKeys.MaxWidgetsPerDashboard,
            TFS_Dashboards_Constants.JsonIslandDomClassNames.MaxWidgetsPerDashboards);
    }

    /**
    * Maximum dashboards that can be added to a group (such as a team or a user collection)
    */
    public static getMaxDashboardsPerGroup(): number {
        return getFromPage<number>(
            TFS_Dashboards_Constants.DashboardPageDataProviderKeys.MaxDashboardPerGroup,
            TFS_Dashboards_Constants.JsonIslandDomClassNames.MaxDashboardsPerGroup);
    }

    public static isNewDashboardExperience(): boolean {
        return getFromPage<boolean>(
            TFS_Dashboards_Constants.DashboardPageDataProviderKeys.IsNewDashboardFeatureEnabled);
    }

    /**
    * Indicates if the given name is unique among existing dashboards.
    * @return True if given name is unique. False if not
    */
    public static validateDashboardNameIsUnique(existingDashboards: TFS_Dashboards_Contracts.DashboardGroupEntry[], newDashboardName: string): boolean {
        var nameAlreadyExists = existingDashboards.some((val, index) => {
            return (val.name == newDashboardName);
        });

        return !nameAlreadyExists;
    }

    public static getFormattedDashboardName(name: string): string {
        var titleFormat = Context.getPageContext().webAccessConfiguration.isHosted ?
            Resources_Common.PageTitleWithContent_Hosted :
            Resources_Common.PageTitleWithContent;

        const dashboardName = Utils_String.format(TFS_Dashboards_Resources.DashboardNameForPageTitle, name);

        return Utils_String.format(titleFormat, dashboardName);
    }

    /**
     * New dashboard dialog adds isNew=true query parameter when new dashboard is created
     * @return true when Url has isNew parameter
     */
    public static isNewDashboard(): boolean {
        const navHistoryService = getNavigationHistoryService();
        const state = navHistoryService.getState();
        return !!state[TFS_Dashboards_Constants.DashboardUrlParams.IsNew] || false;
    }

    /**
     * When first navigating to a new dashboard we have isNew in the query string to indicate that
     * we should enter edit mode but we want to remove this straight away so that this doesn't happen
     * again when the user refreshes the page.
     */
    public static removeIsNewFromUrl() {
        const navHistoryService = getNavigationHistoryService();
        const state = navHistoryService.getState();

        state[TFS_Dashboards_Constants.DashboardUrlParams.IsNew] = null;
        navHistoryService.pushState(state);
    }
}

/**
 * Static method extension for the business logic classes generated by C#
 */
export class DashboardContractsExtension {
    /**
     * Sorta a list of dashboard by their position (low to high)
     * @param {DashboardGroupEntry[]} An array of dashboard
     * @returm {DashboardGroupEntry[]} An array of dashboard sorted by position
     */
    public static sortDashboardsByPosition(listToSort: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[]): TFS_Dashboards_Contracts.DashboardGroupEntryResponse[] {
        var sortedList = listToSort.sort(function (leftDashboard, rightDashboard) {
            return leftDashboard.position - rightDashboard.position;
        });
        return sortedList;
    }
}

/**
* Constants that are used only on the client
* This class holds data that is only useful on the client side, and avoids using constants generation.
*/
export class ClientConstants {
    static WidgetLoadingAnimationStartTimeoutMs = 250;
    static WidgetLoadingTimeoutErrorMs = 120000;

    // Widget ajax timeout needs to be longer than the loading timeout to ensure that the "widget failed to load"
    // experience is always triggered without being interrupted by an ajax cancellation.
    static WidgetAjaxTimeoutMs = ClientConstants.WidgetLoadingTimeoutErrorMs + 2000;
}

/**
 * Give method for the page of the dashboard that can be reused everywhere.
 */
export class CssHtmlUtilities {

    /**
     * Fake a delay instead of waiting for the animation to be loaded
     */
    private static FakeDelayInMillisecond: number = 200;

    /**
     * Indicate if CSS animation is supported
     * @returns {boolean} True if supported; False if not supported
     */
    public static isAnimationSupported(): boolean {
        var el = document.createElement("tempo");
        return ('animation' in el.style
            || 'OAnimation' in el.style
            || 'MozAnimation' in el.style
            || 'WebkitAnimation' in el.style) ;

    }

    /**
     * Attach only once an handler to a JQuery element that is trigger once animation is done
     * @param {JQuery} element - Element to attach the event
     * @param {JQueryEventObject} handler - Action to be done when the transition end
     * @returns {JQuery} element - Element that we are working on (to preserve JQuery chaining)
     */
    public static attachOneEventOnTransitionEnd(element: JQuery, handler: (eventObject: JQueryEventObject)=>any): JQuery {
        if (CssHtmlUtilities.isAnimationSupported()) {
            return element.one("webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend", handler);
        } else {
            element.delay(CssHtmlUtilities.FakeDelayInMillisecond).queue((next) => {
                handler.call(this);
                next();
            });
        }
    }

    /**
     * check if the given element is on screen
     * @param element the element to test for
     * @param parent the container to test the element in.
     *        This needs to be positioned at the top left of the viewport.
     */
    public static isInViewport(element: JQuery, parent: JQuery): boolean {
        var rect = element.get(0).getBoundingClientRect();
        var container = parent || $(window);
        return (
            rect.top >= 0 && rect.top < container.height() &&
            rect.left >= 0 && rect.left < container.width()
        );
    }
}

export class SemanticVersionExtension {
    /**
     * Verify if a semantic version is valid or not (whether each of major, minor and patch are positive non floating point numbers)
     * @param version the semantic version to test.
     */
    public static verifyVersionValid(version: TFS_Dashboards_Contracts.SemanticVersion): boolean {
        return (!!version &&
            /^(0|[1-9]\d*)$/.test(version.major.toString()) &&
            /^(0|[1-9]\d*)$/.test(version.minor.toString()) &&
            /^(0|[1-9]\d*)$/.test(version.patch.toString()));
    }

    /**
     * Verfiy if the new version is ordinally the same or after the old version (i.e. newVersion >= oldVersion).
     * @param oldVersion the old semantic version to test against.
     * @param newVersion the new semantic version to test for.
     */
    public static verifyVersionForward(oldVersion: TFS_Dashboards_Contracts.SemanticVersion, newVersion: TFS_Dashboards_Contracts.SemanticVersion): boolean {
        return (newVersion.major > oldVersion.major ||
            newVersion.major === oldVersion.major && newVersion.minor > oldVersion.minor ||
            newVersion.major === oldVersion.major && newVersion.minor === oldVersion.minor && newVersion.patch >= oldVersion.patch);
    }

    /**
     * Verifies two versions are exactly the same.
     * @param oldVersion the old semantic version to test against.
     * @param newVersion the new semantic version to test for.
     */
    public static verifyVersionsEqual(oldVersion: TFS_Dashboards_Contracts.SemanticVersion, newVersion: TFS_Dashboards_Contracts.SemanticVersion): boolean {
        return (newVersion.major === oldVersion.major &&
            newVersion.minor === oldVersion.minor &&
            newVersion.patch === oldVersion.patch);
    }

    /**
     *  convert version to string
     * @param version the version to convert in form.
     */
    public static versionToString(version: TFS_Dashboards_Contracts.SemanticVersion): string {
        return Utils_String.format("{0}.{1}.{2}", version.major, version.minor, version.patch);
    }

    public static isInitialVersion(version: TFS_Dashboards_Contracts.SemanticVersion): boolean {
        return SemanticVersionExtension.verifyVersionsEqual(SemanticVersionExtension.getInitialVersion(), version);
    }

    /**
     * Return the initial version that all settings get: 1.0.0
     */
    public static getInitialVersion(): TFS_Dashboards_Contracts.SemanticVersion {
        return {
            major: 1,
            minor: 0,
            patch: 0
        };
    }

}

export class GalleryHelper {
    /**
     * Construct the url to the extension in the marketplace for a given contributions. #516226 follow up with open ALM to see if this is something that can be made available from
     * the framework.
     * @param contribution contribution of the widget/configuration
     * @returns a promise of the url.
     */
    public static getExtensionUrl(contribution: Contribution_Contracts.Contribution): IPromise<string> {
        return GalleryHelper.getGalleryUrl().then((galleryUrl) => {
            return GalleryHelper.getExtensionUrlFromGalleryUrl(contribution, galleryUrl);
        });
    }

    /**
     * Construct the url to the extension in the marketplace for a given contribution and gallery URL. #516226 follow up with open ALM to see if this is something that can be made available from
     * @param contribution contribution of the widget/configuration
     * @param galleryUrl base URL of the gallery
     * @returns full extension URL
     */
    public static getExtensionUrlFromGalleryUrl(contribution: Contribution_Contracts.Contribution, galleryUrl: string): string {
        const publisherId = Contribution_Services.ExtensionHelper.getPublisherId(contribution);
        const extensionId = Contribution_Services.ExtensionHelper.getExtensionId(contribution);

        return Utils_File.combinePaths(
            GalleryHelper.getExtensionHomepageFromGalleryUrl(galleryUrl)
            , "/items/" + publisherId + "." + extensionId
        );
    }

    public static getExtensionHomepageFromGalleryUrl(galleryUrl: string): string {
        if (TFS_Host_TfsContext.TfsContext.getDefault().isHosted) {
            return galleryUrl;
        }
        else {
            return Utils_File.combinePaths(galleryUrl, "_gallery");
        }
    }

    /**
     * Get gallery URL from location service
     * @returns a promise of the url.
     */
    public static getGalleryUrl(): IPromise<string> {
        var deferred: Q.Deferred<string> = Q.defer<string>();
        VSS.using(["VSS/Gallery/RestClient"], (Gallery_RestClient: typeof Gallery_RestClient_NOREQUIRE) => {
            Locations.beginGetServiceLocation(
                Gallery_RestClient.GalleryHttpClient.serviceInstanceId,
                Contracts_Platform.ContextHostType.Deployment).then(deferred.resolve, deferred.reject);
        });

        return deferred.promise;
    }

    /**
     * Derive the extension message that redirects to the extension page on the marketplace that owns the widget/configuration
     * @param contribution contribution of the widget/configuration
     * @returns a promise of the url.
     */
    public static getExtensionMessage(contribution: Contribution_Contracts.Contribution): IPromise<string> {
        const publisherId = Contribution_Services.ExtensionHelper.getPublisherId(contribution);
        const providerDisplayName = VSS_Service.getService(Contribution_Services.ExtensionService).getProviderDisplayName(contribution);
        var extensionText = Utils_String.format(
            Resources_Platform.ExtensionDisplayNameFormat,
            contribution.properties["name"],
            providerDisplayName || publisherId);

        var $messageTitle = $("<div />");
        $("<span />").appendTo($messageTitle).text(Utils_String.format(TFS_Dashboards_Resources.ExternalContentErrorFormat, extensionText));
        return GalleryHelper.getExtensionUrl(contribution).then((url) => {

            var $more = $("<span />")
                .appendTo($messageTitle)
                .html(Resources_Platform.ExternalContentErrorLearnMoreContent); //trusted resource

            $more.find("a").attr("href", url).attr("target", "_blank");
            return $messageTitle.html();
        });
    }
}

/**
 * Helps with the processing of error message artifacts
 */
export class ErrorMessageHelper {
    /**
     * Converts error to error message object.
     * Defaults any missing fields.
     * @param error - The error to convert
     * @returns {ErrorMessage} The converted error
     */
    public static getErrorMessage(error: any): TFS_Dashboards_WidgetContracts.ErrorMessage {
        return {
            message: ErrorMessageHelper.parseErrorToString(error),
            isRichText: ErrorMessageHelper.getRichTextOrDefault(error),
            isUserVisible: ErrorMessageHelper.getUserVisibleOrDefault(error)
        };
    }

    /**
     * gets message object that is plaintext and can be displayed to the user.
     * @param message
     */
    public static getUserVisiblePlainTextMessage(message: any): TFS_Dashboards_WidgetContracts.ErrorMessage {
        return {
            message: ErrorMessageHelper.parseErrorToString(message),
            isUserVisible: true,
            isRichText: false
        };
    }

    /**
     * gets message object that will get displayed on the console.
     * @param message
     */
    public static getConsoleMessage(message: any): TFS_Dashboards_WidgetContracts.ErrorMessage {
        return {
            message: ErrorMessageHelper.parseErrorToString(message),
            isUserVisible: false,
            isRichText: false
        };
    }

    /**
     * Interpret message object to derive the underlying message (the message could come from the framework, the widget, the page etc)
     * @param obj
     */
    public static parseErrorToString(obj: any): string {
        var error: string = null;

        if (obj == null) {
            return error;
        }

        if (typeof obj == "string") {
            error = obj;
        }
        else if (obj.hasOwnProperty('message')) {
            if (obj.message == null) {
                error = "";
            }
            else if (typeof obj.message == "string") {
                error = obj.message;
            }
            else if (obj.message.hasOwnProperty('message')) {
                error = obj.message.message;
            }
        }

        return error;
    }

    /**
     * parse object to get whether message is user visible, other return default which is true.
     * @param obj
     */
    public static getUserVisibleOrDefault(obj: any): boolean {
        var value = true;

        if (obj != null && obj.hasOwnProperty('isUserVisible')) {
            value = obj.isUserVisible;
        }

        return value;
    }

    /**
     * parse object to get whether message is rich text, other return default which is false.
     * @param obj
     */
    public static getRichTextOrDefault(obj: any): boolean {
        var value = false;

        if (obj != null && obj.hasOwnProperty('isRichText')) {
            value = obj.isRichText;
        }

        return value;
    }
}

export class RefreshTimerEvents {
    public static ResetTimer: string = "refreshtimer.reset";
    public static StopTimer: string = "refreshtimer.stop";
    public static StartTimer: string = "refreshtimer.start";
    public static OnRefresh: string = "refreshtimer.on.refresh";
}

/**
 * Used to extract the name of a function or method as a string.
 * Useful for protecting against function/method renames that might cause run-time errors.
 */
export class FunctionNameParser {
    /**
     * Returns the name of a given function.
     * Do not use this for class methods. Instead use getMethodName.
     * @param func The function
     * @returns The name of the given function
     * @throws An error if the argument isn't a function or if this function fails to extract the name of the argument
     */
    public static getFunctionName(func: Function): string {
        var name = null;

        if ($.isFunction(func)) {
            var nameProperty = (<any>func).name;
            if (nameProperty != null) {
                name = nameProperty;
            } else {
                /*
                 * Converts function to its string representation ("function example() { [native code] }")
                 * then matches as many characters as it can before finding a '(' collecting the characters after "function" in a capture group.
                 * The resulting array contains the full match and the first capture group (["function example", "example"]).
                 */
                var funcStringRepresentation = func + "";
                var regex = /function ([^(]*)/;
                var matches = funcStringRepresentation.match(regex);

                if (matches == null || matches.length < 2) {
                    throw new Error("Failed to find function name");
                }

                name = matches[1];
            }
        } else {
            throw new Error("Argument is not a function");
        }

        return name;
    }

    /**
     * Returns the name of a method on an object as a string
     * @param object The object that contains the method
     * @param method The object's method itself (e.g., obj.foo)
     * @returns The name of the method as a string (e.g., "foo")
     * @throws When the object does not contain that method
     */
    public static getMethodName(object: Object, method: Function) {
        for (var propertyName in object) {
            // We don't check for object.hasOwnProperty(propertyName) because Typescript will
            // have compiled class methods to use the prototype chain

            var propertyValue = object[propertyName];

            if (propertyValue === method) {
                return propertyName;
            }
        }

        throw new Error("Could not find method in object");
    }
}

export class WidgetSizeValidator {
    /**
     * Returns whether or not the given widget size is valid.
     * @param widgetSize to validate
     * @returns true when the size is valid
     */
    public static isValidWidgetSize(widgetSize: TFS_Dashboards_Contracts.WidgetSize): boolean {
        return widgetSize != null
            && widgetSize.columnSpan > 0
            && widgetSize.columnSpan <= TFS_Dashboards_Constants.DashboardWidgetLimits.MaxColumnSpan
            && widgetSize.rowSpan > 0
            && widgetSize.rowSpan <= TFS_Dashboards_Constants.DashboardWidgetLimits.MaxRowSpan;
    }
}

export class FwLinks {
    public static GalleryPromotion: string = "https://go.microsoft.com/fwlink/?LinkId=785782";
    public static PermissionsOnManageDashboards: string = "https://go.microsoft.com/fwlink/?LinkID=825563&clcid=0x409 ";
    public static StakeholderLicenseOnPrem: string = "https://go.microsoft.com/fwlink/?LinkID=787012&clcid=0x409";
    public static StakeholderLicenseHosted: string = "https://go.microsoft.com/fwlink/?LinkID=787012&clcid=0x409";
    public static PublicAnonLearnMore: string = "https://go.microsoft.com/fwlink/?linkid=867452"
}

export var ClassGridster: string = "gridster";
export var ClassWidgetEditOverlayControl: string = "widget-edit-overlay-control";

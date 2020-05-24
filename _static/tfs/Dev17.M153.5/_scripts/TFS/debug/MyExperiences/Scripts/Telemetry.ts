import * as Diag from "VSS/Diag";
import * as PageEvents from "VSS/Events/Page";
import * as Telemetry from "VSS/Telemetry/Services";
import { caseInsensitiveContains, format, base64Encode } from "VSS/Utils/String";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as MyExperiencesExperiments from "MyExperiences/Scripts/Experiments";
import { InteractionTimer } from "MyExperiences/Scenarios/Shared/InteractionTimer";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants";

let interactionTimer = new InteractionTimer();
interactionTimer.RegisterForFirstInteraction(() => MyExperiencesTelemetry.LogFirstInteraction());

export class MyExperiencesTelemetry {

    private static isFilterActive = false;
    private static hubId: string = null;

    /**
     * Indicates if the current page is the Account Home. 
     * 
     * This allows us to ignore log request from other pages. Such requests can originate from
     * shared views that exist on both the Account Home and other pages. Even if such a view 
     * tries to only log telemetry when hosted on the Account Home, some telemetry is automatically
     * logged by merely loading this module, such as {LogFirstInteraction} .
     */
    private static isAccountHome = false;

    /**
     * Count of navigations since the page was loaded.
     */
    private static navigationCount = 0;

    /**
     * Publish a CI event for exception when parsing WIT Query path failed
     * @param {e} exception
     */
    public static LogFavoriteWITQueryPathParseException(e: any): void {
        let ciData: IDictionaryStringTo<string> = {
            "exception": e
        };
        this.publish(CustomerIntelligenceConstants.FEATURES.Favorite_WIT_QueryPath_Parse_Exception, ciData, false);
    }

    /**
     * Publish a CI event when the new project buttong in projects hub is clicked
     */
    public static LogProjectsHubNewProjectButtonClicked(): void {
        // No ciData is required. This is just to track the percentage of project creation from this entry point
        let ciData: IDictionaryStringTo<string> = {};

        this.publish(CustomerIntelligenceConstants.FEATURES.PROJECTS_HUB_NEW_PROJECT_BUTTON_CLICK, ciData, false);
    }

    /**
     * Publish a CI event with the source and project name on create project button clicked
     * @param source
     * @param projectName
     */
    public static LogNewProjectCreateButtonClicked(source: string, projectName: string): void {
        let ciData: IDictionaryStringTo<string> = {
            "source": source,
            "projectName": projectName
        };
        this.publish(CustomerIntelligenceConstants.FEATURES.NEW_PROJECT_CREATE_ACTION, ciData, false);
    }

    /**
     * Publish a CI event with source on cancel project creation button clicked
     * @param source
     */
    public static LogNewProjectCancelButtonClicked(source: string): void {
        let ciData: IDictionaryStringTo<any> = {
            "source": source
        };
        this.publish(CustomerIntelligenceConstants.FEATURES.NEW_PROJECT_CANCEL_ACTION, ciData, false);
    }

    /**
     * Publish a CI event when user clicks on filter box
     * @param source
     */
    public static LogFilterClick(source: string): void {
        let ciData: IDictionaryStringTo<any> = {
            "source": source
        };
        this.publish(CustomerIntelligenceConstants.FEATURES.FILTER_CLICK_ACTION, ciData, false);
    }

    /**
     * Logged when the user changes (or removes) the filter
     * @param hasValue {boolean} true if there is now a value in the text box (i.e., a filter was added), false if the text box is now empty (i.e., the filter was removed)
     */
    public static LogFilterChanged(hasValue: boolean): void {
        MyExperiencesTelemetry.isFilterActive = hasValue;
        let ciData: IDictionaryStringTo<any> = {
            "hasValue": hasValue
        };
        this.publish(CustomerIntelligenceConstants.FEATURES.FILTER_CHANGED, ciData, false);
    }

    /** Logged when the user clicks the link to view a project (only in Projects hub) 
     * @param hubGroupName {string} the hub group that the link belongs to
     * @param isTeam {boolean} true if user clicked on a team, false if it's a project link
     */
    public static LogProjectLinkClicked(hubGroupName: string, isTeam: boolean): void {
        let ciData: IDictionaryStringTo<any> = {
            "hubGroupName": hubGroupName,
            "isTeam": isTeam
        };
        this.publishNavigation(CustomerIntelligenceConstants.FEATURES.PROJECT_LINK_CLICK, ciData);
    }

    /**
     * Logged when the user clicks the expand button next to a project (only in Projects hub)
     * @param expanded {boolean} true when the toggle indicates an expand, false for a collapse
     * @param children {number} the number of children the project has (i.e., how many items are being shown / hidden)
     */
    public static LogProjectExpandToggle(expanded: boolean, children: number): void {
        let ciData: IDictionaryStringTo<any> = {
            "expanded": expanded,
            "children": children
        };
        this.publish(CustomerIntelligenceConstants.FEATURES.PROJECT_TOGGLE_EXPAND, ciData, false);
    }

    /**
     * Logged when the user clicks the link to view a favorite (only in Favorites hub)
     * @param favoriteType {string} the type of the favorite that the link points
     */
    public static LogFavoriteLinkClicked(favoriteType: string): void {
        let ciData: IDictionaryStringTo<any> = {
            "favoriteType": favoriteType
        };
        this.publishNavigation(CustomerIntelligenceConstants.FEATURES.FAVORITE_LINK_CLICK, ciData);
    }

    /**
     * Logged when the user clicks the link to the project a favorite belongs to (only in Favorites hub)
     * @param favoriteType {string} the type of the favorite that is surfacing the link
     */
    public static LogFavoriteProjectLinkClicked(favoriteType: string): void {
        let ciData: IDictionaryStringTo<any> = {
            "favoriteType": favoriteType
        };
        this.publishNavigation(CustomerIntelligenceConstants.FEATURES.FAVORITE_PROJECT_LINK_CLICK, ciData);
    }

    /**
     * Logged when the user favorites or un-favorites an items
     * @param favoriteType {string} the type of the favorite being toggled
     * @param favorited {boolean} true if the item is being favorites, false if it is being unfavorited
     */
    public static LogToggleFavoriteClicked(favoriteType: string, favorited: boolean): void {
        let ciData: IDictionaryStringTo<any> = {
            "favoriteType": favoriteType,
            "favorited": favorited
        };
        this.publish(CustomerIntelligenceConstants.FEATURES.FAVORITE_TOGGLE_CLICK, ciData, false);
    }

    /**
     * Logged when the user removes a favorite that has already been deleted
     * @param favoriteType {string} the type of the favorite being removed
     */
    public static LogDeleteFavorite(favoriteType: string): void {
        let ciData: IDictionaryStringTo<any> = {
            "favoriteType": favoriteType
        };
        this.publish(CustomerIntelligenceConstants.FEATURES.FAVORITE_DELETE_CLICK, ciData, false);
    }

    /**
     * Logged when the user clicks on a link to a project's hub
     * @param hubName {string} the hub within the project that the user is navigating to
     * @param hubGroupName {string} the hub group that the link belongs to
     * @param isTeam {boolean} true if the item removes was a team (false for project)
     */
    public static LogProjectHubLinkClicked(hubName: string, hubGroupName: string, isTeam: boolean): void {
        let ciData: IDictionaryStringTo<any> = {
            "hubName": hubName,
            "hubGroupName": hubGroupName,
            "isTeam": isTeam
        };
        this.publishNavigation(CustomerIntelligenceConstants.FEATURES.PROJECT_HUB_LINK_CLICK, ciData);
    }

    /**
     * Logged when the user scrolls, causing the nav header to collapse (when scrolling down) or expand (when scrolling back to the top)
     * @param collapsed {boolean} true when the header is now collapsed, false if it is now expanded
     */
    public static LogHeaderCollapseToggle(collapsed: boolean): void {
        let ciData: IDictionaryStringTo<any> = {
            "collapsed": collapsed
        };
        this.publish(CustomerIntelligenceConstants.FEATURES.HEADER_COLLAPSE_TOGGLE, ciData, false);
    }

    /**
     * Logged when the user removes a project or team from the MRU list
     * @param isTeam {boolean} true if the item removes was a team (false for project)
     */
    public static LogMruItemRemoved(isTeam: boolean): void {
        let ciData: IDictionaryStringTo<any> = {
            "isTeam": isTeam
        };
        this.publish(CustomerIntelligenceConstants.FEATURES.PROJECT_REMOVE_ITEM_FROM_MRU, ciData, false);
    }

    /**
     * Logged when the user visits the Account Page.
     */
    public static LogHubLoad(hubId: string): void {
        MyExperiencesTelemetry.hubId = hubId;
        MyExperiencesTelemetry.isAccountHome = true;
        return this.publish(CustomerIntelligenceConstants.FEATURES.HUB_LOAD);
    }

    /**
     * Logged when the user switches Hubs on the Account Page.
     */
    public static LogHubSwitch(newHubId: string): void {
        let ciData: IDictionaryStringTo<any> = {
            "newHubId" : newHubId
        };
        this.publish(CustomerIntelligenceConstants.FEATURES.HUB_SWITCH, ciData);

        MyExperiencesTelemetry.LogHubLoad(newHubId);
    }

    /**
     * Logged when the user interacts with the page for the first time (since page load)
     */
    public static LogFirstInteraction(): void {
        let ciData: IDictionaryStringTo<any> = {
        };

        // The first interaction may be a navigation.
        // Publish immediately to ensure the event is published.
        let immediate = true;

        this.publish(CustomerIntelligenceConstants.FEATURES.TIME_TO_INTERACTION, ciData, immediate);
    }

    /**
     * Logged when the user navigates from one of the Hubs on the Account Home
     */
    public static LogNavigation(): void {        
        let ciData: IDictionaryStringTo<any> = {            
        }
        MyExperiencesTelemetry.navigationCount++;        
        MyExperiencesTelemetry.addFrameworkCiData(ciData, 'navigationCount', MyExperiencesTelemetry.navigationCount);        
        MyExperiencesTelemetry.addFrameworkCiData(ciData, 'isFilterActive', MyExperiencesTelemetry.isFilterActive);
        
        // Since this is a navigation, publish immediately to ensure the event is published.
        let immediate = true; 

        return this.publish(CustomerIntelligenceConstants.FEATURES.NAVIGATION, ciData, immediate);
    }

    protected static publishNavigation(featureName: string, cidata: IDictionaryStringTo<any> = {}): void {
        // Since this is a navigation, publish immediately to ensure the event is published.
        let immediate = true; 
        this.publish(featureName, cidata, immediate);
        this.LogNavigation();
    }

    protected static publish(featureName: string, cidata: IDictionaryStringTo<any> = {}, immediate: boolean = false): void {
        if (!MyExperiencesTelemetry.isAccountHome) {
            return;
        }

        MyExperiencesTelemetry.addFrameworkCiData(cidata, 'hubId', MyExperiencesTelemetry.hubId);
        MyExperiencesTelemetry.addFrameworkCiData(cidata, 'timeToEventInMilliseconds', interactionTimer.getElapsedTimeInMilliseconds());
        
        let experimentStates = MyExperiencesExperiments.GetExperimentEnabledStates();
        for (var experimentKey in experimentStates) {
            MyExperiencesTelemetry.addFrameworkCiData(cidata, `experimentEnabled_${experimentKey}`, experimentStates[experimentKey]);
        }

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AREAS.MyExperiences,
            featureName,
            cidata), immediate);
    }

    private static addFrameworkCiData(ciData: IDictionaryStringTo<any>, key: string, value: any) {
        Diag.Debug.assert(ciData[key] === undefined, `{key} is reserved, and supplied automatically.`);
        ciData[key] = value;
    }
}

export function getUrlWithTrackingData(url: string, data: {
    [key: string]: any;
}): string {
    const result = url + format("{0}{1}={2}",
        caseInsensitiveContains(url,"?") ? "&" : "?",
        CustomerIntelligenceConstants.URL_PARAMETER_KEYS.TRACKING_DATA,
        _encodeTelemetryData(data));
    return result;
}

function _encodeTelemetryData(data: any): string {
    const telemetryString = encodeURIComponent(base64Encode(JSON.stringify(data)));
    return telemetryString;
}

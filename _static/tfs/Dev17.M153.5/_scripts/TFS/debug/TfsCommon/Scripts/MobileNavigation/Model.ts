import * as Service from "VSS/Service";
import * as Contributions_Services from "VSS/Contributions/Services";
import { INavigationItem } from "TfsCommon/Scripts/MobileNavigation/Navigation/Navigation.props";
import { WebPageDataService } from "VSS/Contributions/Services";

//
// This is private back-port of parts of the IVssNavigationService from the new web platform. Do not export it.
//


/**
 * These are flags that control behaviors for the navigation contributions.
 */
const enum NavigationFlags {

    /**
     * This navigation contribution is a built-in part of the product.
     */
    BuiltIn = 0x0001,

    /**
     * This navigation contribution comes from a trusted source.
     */
    Trusted = 0x0002,

    /**
     * This navigation contribution should be disabled when this is set and when
     * shown, the user should not be able to interact with this contribution.
     */
    Disabled = 0x0010,

    /**
     * This navivgation contribution should not be shown in the UI when this is set.
     */
    Hidden = 0x0020,

    /**
     * This is a hint to the system that during layout, this contribution is
     * important and should not be hidden as space becomes less available.
     * This is not a requirement, just a hint.
     */
    NonCollapsible = 0x0040,
}

/**
 * A navigation contribution is used to describe any high level object that is navigable within
 * the system. This can be things like a page, hub-group, hub, etc.
 */
interface IContributedNavigation {

    /**
     * The contributionId of the navigation object.
     */
    id: string;

    /**
     * This is the contribution type.
     */
    type: string;

    /**
     * The order this contribution should be shown when all or a sub-set of the siblings are
     * shown in a presentation.
     */
    order: number;

    /**
     * The display string for the navigation contribution.
     */
    name?: string;

    /**
     * Attributes used to describe the general state of the navigation contribution.
     */
    flags?: number;

    /**
     * This is the URL for the location of this navigation contribution. Linking to it will
     * render a page with this contribution as the selected contribution.
     */
    href?: string;

    /**
     * Navigation contributions MAY be grouped and when they are the group they are
     * associated with is defined by its navGroup.
     */
    navGroup?: string;

    /**
     * This icon is one 2 types of strings.
     *  1) It is a URL to an image that represents the icon.
     *  2) It is a set of space seperated css classes.
     */
    icon?: string;

    /**
     * Navigation contribtions MAY use a custom component for the rendering of the component
     * if one is not specified, a standard component is used
     */
    componentType?: string;

    /**
     * If the navigation contribution has children, this array will contain references to
     * them in sorted order.
     */
    children?: IContributedNavigation[];
}


/**
 * NavigationDetails describes the structure of the data sent to the client from the
 * server through the navigation data provider.
 */
interface INavigationDetails {

    /**
     * This siteId that was determined for this request.
     */
    siteId: string;

    /**
     * The hierarchy defines the relationship of all contributions. Each contribution
     * that has child contributions will have an array of its children.
     */
    hierarchy: { [contributionId: string]: string[] };

    /**
     * This is the entire set of the contributed navigation objects that are reachable
     * from the current page.
     */
    navigation: { [contributionId: string]: IContributedNavigation };

    /**
     * This is the set of displayed contributions, this is an array with the root being
     * the contribution nearest the site and the last being the most relevant
     * contribution.
     */
    displayed: string[];

    /**
     * Set of locations for each of the navigation contributions.
     */
    location: { [contributionId: string]: string };

    /**
     * If specified, this indicates the url to update the browser to using replaceState.
     * The server may determine the actual URL to be different than the processed request.
     * This allows us to display the page, get the desired URL and not have to perform
     * a client side redirect.
     */
    resolvedUrl: string;

    /* @TODO: Define the pinningPreferences */
}


class MobileNavigationModel {
    private _navigationData: INavigationDetails;

    constructor() {
        const webPageDataService = Service.getService(Contributions_Services.WebPageDataService);
        const navData = webPageDataService.getPageData<INavigationDetails>("ms.vss-web.navigation-data");

        if (navData && navData.navigation) {
            // Update the location for each of the navigation contributions.
            if (navData.location) {
                for (let contributionId in navData.navigation) {
                    const navigation = navData.navigation[contributionId];
                    navigation.href = navData.location[navigation.id];
                }
            }

            // Update the children for each of the navigation contributions.
            // We need to filter out any that are "hidden", we need to sort
            // the children, and perform all other preperations before use.
            if (navData.hierarchy) {

                for (let parentId in navData.hierarchy) {
                    const parentNavigation = navData.navigation[parentId];
                    const children = navData.hierarchy[parentId];
                    const groups: { [navGroup: string]: number } = {};

                    parentNavigation.children = [];

                    for (let child of children) {
                        const childNavigation = navData.navigation[child];

                        if (((childNavigation.flags || 0) & NavigationFlags.Hidden) !== NavigationFlags.Hidden) {
                            parentNavigation.children.push(childNavigation);
                        }
                    }

                    // Navigation child sorting, first we sort by order, then group by navGroup.
                    parentNavigation.children.sort((child1, child2) => {
                        let result = child1.order - child2.order;
                        if (result === 0) {
                            result = child1.id.toUpperCase().localeCompare(child2.id.toUpperCase());
                        }
                        return result;
                    });

                    // Ensure each navGroup defined in this set of children have an order Id.
                    let groupId = 1;
                    for (let childNavigation of parentNavigation.children) {
                        const navGroup = childNavigation.navGroup || "";
                        if (!groups[navGroup]) {
                            groups[navGroup] = groupId++;
                        }
                    }

                    // Navigation contribution sorting, first we sort by order, then group by navGroup.
                    parentNavigation.children.sort((child1, child2) => {
                        let result = groups[child1.navGroup || ""] - groups[child2.navGroup || ""];
                        if (result === 0) {
                            result = child1.order - child2.order;
                            if (result === 0) {
                                result = child1.id.localeCompare(child2.id);
                            }
                        }
                        return result;
                    });

                    // If no link is available for this contribution, we will use our first child that has an href.
                    if (!parentNavigation.href) {
                        for (let childNavigation of parentNavigation.children) {
                            if (childNavigation.href) {
                                parentNavigation.href = childNavigation.href;
                                break;
                            }
                        }
                    }
                }
            }
        }

        this._navigationData = navData;
    }

    public checkForResolvedUrl() {
        // If the request was "redirected" to another location, we will update our current state.
        if (this._navigationData.resolvedUrl) {
            window.history.replaceState(this._navigationData.resolvedUrl, document.title);
        }
    }

    public getNavigationElement(contributionId: string): IContributedNavigation | undefined {
        return this._navigationData.navigation[contributionId];
    }

    public isDisplayed(contributionId: string): boolean {
        return (this._navigationData.displayed.indexOf(contributionId) !== -1);
    }

    public getDisplayedNavigation(): string[] {
        return this._navigationData.displayed;
    }
}

/** Current user's profile */
export interface IMobileNavigationProfile {
    /** Source uri of user profile picture */
    imageSrc: string;

    /** User id */
    id: string;

    /** User name */
    name: string;
}

export interface IMobileNavigationStaticItems {
    /** Current user's profile information */
    profile: IMobileNavigationProfile;

    /** Href for signout link */
    signOutHref: string;
}

/**
 * Model for mobile navigation
 */
export interface IMobileNavigation {
    /** Navigation items to display for current page */
    navigationItems: INavigationItem[];

    /** Currently selected navigation element */
    selectedKey: string;

    /** Static navigation items, present on every page */
    staticNavigationItems: IMobileNavigationStaticItems;
}

function getStaticNavigationItems(): IMobileNavigationStaticItems {
    const webPageDataService = Service.getService(WebPageDataService);

    const navigationContextData: any = webPageDataService.getPageData("ms.vss-tfs-web.navigation-context-data-provider");
    const userElement: any = navigationContextData["rightMenu"]["rightMenuBar"]["actions"]["user"];
    const signOutElement: any = navigationContextData["rightMenu"]["rightMenuBar"]["actions"]["signOut"];

    return {
        profile: {
            imageSrc: userElement.url,
            id: userElement.title,
            name: userElement.text
        },

        signOutHref: signOutElement.url
    };
}

/**
 * Checks whether the url should be updated as a result of a "client-side" redirect
 */
export function checkForResolvedUrl() {
    const nav = new MobileNavigationModel();
    nav.checkForResolvedUrl();
}

/**
 * Get the mobile navigation model for the current page
 * @param displayIndex Index into primary/selected navigation elements, sub-hierarchy of index will be provided in model
 */
export function getModel(displayIndex: number): IMobileNavigation {
    const nav = new MobileNavigationModel();

    // Map items
    let selectedKey: string = null;
    const mapItem = (element: IContributedNavigation): INavigationItem => {
        const selected = nav.isDisplayed(element.id);
        if (selected) {
            // Store the last selected element we encounter
            selectedKey = element.id;
        }

        // If there is only one child, which in turn doesn't have any children, collapse the current navigation
        // item and the child into one. 
        const { children } = element;
        const hasOnlyOneChild = children && children.length === 1;
        if (hasOnlyOneChild) {
            const onlyChild = children[0];
            const descendantIds = Object.keys(onlyChild.children || {});
            const oneLevelHierarchy = !descendantIds || descendantIds.length === 0;
            if (oneLevelHierarchy) {
                // Merge child into parent
                return mapItem(onlyChild);
            }
        }

        return {
            id: element.id,
            href: element.href,
            title: element.name,
            icon: element.icon,
            items: children && children.map(mapItem),
            initialExpanded: selected // If selected, expand to ensure children are visible. Navigation is not too deep, so this simple check is enough
        };
    };

    // Skip the page, start with the first hub group collection
    const currentRoot = nav.getNavigationElement(nav.getDisplayedNavigation()[displayIndex]);
    const mappedItem = mapItem(currentRoot);

    return {
        navigationItems: mappedItem.items,
        selectedKey,
        staticNavigationItems: getStaticNavigationItems()
    };
}

import { combineUrl, IParsedRoute, parseRouteTemplate, routeUrl } from "VSS/Utils/Url";
import { getPageContext, getDefaultWebContext } from "VSS/Context";
import * as LocalPageData from "VSS/Contributions/LocalPageData";
import { ILocalService, VssService } from "VSS/Service";

export class LocationService implements ILocalService {
    private _parsedRoutes: IDictionaryStringTo<IParsedRoute[]> = {};

    /**
     * Gets the route templates for a given route
     * 
     * @param routeId Id of the route
     */
    public routeTemplates(routeId: string): IParsedRoute[] {
        // Check to see if we have parsed routes for this route id
        let routeCollection: IParsedRoute[] = this._parsedRoutes[routeId];

        // If we have not yet parsed routes for this ID, attempt to parse them now.
        if (!routeCollection) {
            // Look for the route templates
            const routeData = LocalPageData.getSharedData<IDictionaryStringTo<string[]>>("_routes");

            let routes: string[];
            // If we found route templates, then look for ones matching the specified id.
            if (routeData) {
                routes = routeData[routeId];
            }

            if (!routes) {
                const pageContext = getPageContext();
                if (routeId === pageContext.navigation.routeId) {
                    routes = pageContext.navigation.routeTemplates;
                }
            }

            if (routes) {
                // Parse the available templates
                routeCollection = routes.map(parseRouteTemplate);

                // Cache the parsed routes for subsequent calls
                this._parsedRoutes[routeId] = routeCollection;
            }
        }

        // If we were able to find a set of route templates for the route id, then attempt to create a url.
        if (routeCollection) {
            return routeCollection;
        }

        throw new Error(`Could not find route for route id ${routeId}. Ensure that the requested route is added to routes shared data.`);
    }

    /**
     * Generate a url for the given route id with the given route values
     * 
     * @param routeId Id of the route to generate a url for
     * @param routeValues Dictionary of route values
     */
    public routeUrl(routeId: string, routeValues: IDictionaryStringTo<string>, hostPath?: string): string {
        const routeCollection = this.routeTemplates(routeId);

        // If we were able to find a set of route templates for the route id, then attempt to create a url.
        if (routeCollection) {
            // Get the relative url for this route collection and values
            const relativeUrl = routeUrl(routeCollection, routeValues);

            // Add the host path
            if (!hostPath) {
                hostPath = getDefaultWebContext().host.relativeUri;
            }

            return combineUrl(encodeURI(hostPath), relativeUrl);
        }

        throw new Error(`Could not find route templates for route id ${routeId}. Ensure that the requested route is added to routes shared data.`);
    }
}

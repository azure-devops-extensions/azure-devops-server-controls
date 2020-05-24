import * as Q from "q";
import { ICacheableQuery } from "Analytics/Scripts/QueryCache/ICacheableQuery"
import * as VSS_Service from "VSS/Service";
import * as Contribution_Services from "VSS/Contributions/Services";
import { WidgetDataProviderPropertyBagNames } from "Dashboards/Scripts/Generated/Constants";

export interface LegacyProjectInformation{
    ProjectUsesKnownBugCategoryName: boolean;
}

/** Encapsulates contributed page service for legacy information about current Project.
 *  Drives compatability behaviors in widget rendering and configuration.  */
export class LegacyProjectDataHelper {
    
    public static getResults(): LegacyProjectInformation {
        var pageDataService = VSS_Service.getService(Contribution_Services.WebPageDataService);
        
        //Extract the secured object content. If it doesn't fit the pattern due to a break, we want to know early, hence no compensating for erors.
        var legacyProjectInformation = pageDataService.getPageData<{value:LegacyProjectInformation}>(WidgetDataProviderPropertyBagNames.LegacyProjectData).value;
        return legacyProjectInformation;
    }
}

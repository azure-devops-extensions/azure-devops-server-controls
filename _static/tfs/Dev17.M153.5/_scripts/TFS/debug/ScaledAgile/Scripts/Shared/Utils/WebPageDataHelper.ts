
import Service = require("VSS/Service");
import Contribution_Services = require("VSS/Contributions/Services");

/**
 * The helper class to read the web page data sent by the PlansHubDataProvider.
 */
export class WebPageDataHelper {
    private static PlansHubContributionId = "ms.vss-plans.plans-hub-data-provider";
    /**
     * Returns the collection of the feature flag states.
     * This leverages the IPlansHubData sent by the PlansHubDataProvider.
     * To add more feature flag values to the result collection,
     * add those to the Microsoft.TeamFoundation.Server.WebAccess.ScaledAgile.FeatureFlagConstants.Names array.
     * @return {IDictionaryStringTo<boolean>} The collection of the feature flag states
     */
    public static getFeatureFlagStates(): IDictionaryStringTo<boolean> {
        const dataSvc = Service.getService(Contribution_Services.WebPageDataService);
        let pageData = dataSvc.getPageData<IPlansHubData>(WebPageDataHelper.PlansHubContributionId);
        if (pageData) {
            return pageData.featureFlagStates;
        }

        return null;
    }

    public static getPlanId(): string {
        const dataSvc = Service.getService(Contribution_Services.WebPageDataService);
        let pageData = dataSvc.getPageData<IPlansHubData>(WebPageDataHelper.PlansHubContributionId);
        if (pageData) {
            return pageData.planId;
        }

        return null;
    }

    public static getMruTab(): string {
        const dataSvc = Service.getService(Contribution_Services.WebPageDataService);
        let pageData = dataSvc.getPageData<IPlansHubData>(WebPageDataHelper.PlansHubContributionId);
        if (pageData) {
            return pageData.mruTab;
        }

        return null;
    }
}

/**
 * The interface that defines the type of the object returned by the PlansHubDataProvider.
 */
export interface IPlansHubData {
    /**
     * The states of the Feature Flags, retrieved from the PlansHubDataProvider
     */
    featureFlagStates: IDictionaryStringTo<boolean>;
    
    /**
     * The ID for the content page.
     */
    planId: string;

    /**
    * The last visited tab for directory page.
    */
    mruTab: string;
}

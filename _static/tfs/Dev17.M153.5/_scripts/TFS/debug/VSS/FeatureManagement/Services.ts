
import LocalPageData = require("VSS/Contributions/LocalPageData");
import Diag = require("VSS/Diag");
import Service = require("VSS/Service");

/**
* Service to manage feature availability data
*/
export class FeatureManagementService extends Service.VssService {

    /**
     * Returns whether or not a feature is enabled. Checks features sent through JSON island data via IClientFeatureProviderService.AddFeatureState
     * 
     * @param featureName Feature name
     */
    public isFeatureEnabled(featureId: string): boolean {

        const sharedFeatures = LocalPageData.getSharedData<IDictionaryStringTo<boolean>>("_features");
        if (sharedFeatures && sharedFeatures[featureId] !== undefined) {
            return sharedFeatures[featureId];
        }

        Diag.logWarning(`Requested feature '${featureId}' could not be found in local data island. Ensure that the feature is added using IClientFeatureProviderService.AddFeatureState.`);
        return false;
    }
}

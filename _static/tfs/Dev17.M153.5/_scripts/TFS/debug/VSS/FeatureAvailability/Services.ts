
import Context = require("VSS/Context");
import Diag = require("VSS/Diag");
import LocalPageData = require("VSS/Contributions/LocalPageData");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

import FeatureAvailability_RestClient_NoRequire = require("VSS/FeatureAvailability/RestClient");

/**
* Service to manage feature availability data
*/
export class FeatureAvailabilityService extends Service.VssService {

    private _featureStatesCache: IDictionaryStringTo<boolean>;

    constructor() {
        super();
        this._featureStatesCache = {};
    }

    /**
     * Uses the default service to perform a local-only check to determine if the feature is enabled.
     * This requires the feature to be present on the the page scope feature-availability-data island.
     * 
     * @param featureName Feature name
     * @param defaultValue Value to return if the feature is not present in page context data.
     */
    public static isFeatureEnabled(featureName: string, defaultValue?: boolean): boolean {
        return Service.getService(FeatureAvailabilityService).isFeatureEnabledLocal(featureName, defaultValue);
    }

    /**
     * Returns whether or not a feature is enabled. 
     * 
     * @param featureName Feature name
     * @param callback 
     * Success callback, taking one parameter (boolean) - the feature availability state
     * 
     * @param errorCallback Error callback
     */
    public beginIsFeatureEnabled(featureName: string, callback: IResultCallback, errorCallback?: IErrorCallback) {

        Diag.Debug.assertParamIsString(featureName, "featureName");
        Diag.Debug.assertParamIsFunction(callback, "callback");

        var that = this;
        var cachedState = this._readLocalState(featureName);

        if (cachedState !== undefined && cachedState !== null) { // cachedState is boolean
            callback(cachedState);
            return;
        }

        VSS.requireModules(["VSS/FeatureAvailability/RestClient"]).spread((_FeatureAvailabilityClient: typeof FeatureAvailability_RestClient_NoRequire) => {
            var client = Service.getApplicationClient(_FeatureAvailabilityClient.FeatureAvailabilityHttpClient, this.getWebContext());
            client.getFeatureFlagByName(featureName)
                .then((featureFlag) => {
                    var featureEnabled = featureFlag.effectiveState === "On";
                    this._featureStatesCache[featureName] = featureEnabled;
                    callback(featureEnabled);
                }, errorCallback || VSS.handleError);
        });
    }

    /**
     * Performs a local-only check to determine if the feature is enabled. This requires the feature to be present on the the page scope feature-availability-data island.
     * 
     * @param featureName Feature name
     * @param defaultValue Value to return if the feature is not present in page context data.
     */
    public isFeatureEnabledLocal(featureName: string, defaultValue?: boolean): boolean {
        Diag.Debug.assertParamIsString(featureName, "featureName");

        var cachedState = this._readLocalState(featureName);
        if (cachedState === undefined || cachedState === null) {
            if (typeof defaultValue === "undefined") {
                Diag.Debug.fail(Utils_String.format("Requested feature {0} could not be found in local data island.", featureName));
            }
            else {
                return defaultValue;
            }
        }
        return cachedState;
    }

    /**
     * Returns the cache state for the supplied feature after ensuring the data island has been read.
     */
    private _readLocalState(featureName: string): boolean {
        Diag.Debug.assertParamIsString(featureName, "featureName");

        // Check in page context data first
        var pageContext = Context.getPageContext();
        if (pageContext.featureAvailability && pageContext.featureAvailability.featureStates) {
            var state = pageContext.featureAvailability.featureStates[featureName];
            if (typeof state !== "undefined") {
                return state;
            }
        }

        // Check shared contribution data
        const sharedFeatures = LocalPageData.getSharedData<IDictionaryStringTo<boolean>>("_featureFlags");
        if (sharedFeatures && sharedFeatures[featureName] !== undefined) {
            return sharedFeatures[featureName];
        }

        // Check already-cached states
        return this._featureStatesCache[featureName];
    }
}

VSS.tfsModuleLoaded("VSS.FeatureAvailbility", exports);

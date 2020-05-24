/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\genclient.json
 */

export interface FeatureFlag {
    description: string;
    effectiveState: string;
    explicitState: string;
    name: string;
    uri: string;
}

/**
 * This is passed to the FeatureFlagController to edit the status of a feature flag
 */
export interface FeatureFlagPatch {
    state: string;
}

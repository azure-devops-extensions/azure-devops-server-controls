/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\hostacquisition.genclient.json
 */

export interface NameAvailability {
    /**
     * True if the name is available; False otherwise. See the unavailability reason for an explanation.
     */
    isAvailable: boolean;
    /**
     * Name requested.
     */
    name: string;
    /**
     * The reason why IsAvailable is False or Null
     */
    unavailabilityReason: string;
}

export interface Region {
    /**
     * Display name for the region.
     */
    displayName: string;
    /**
     * Whether the region is default or not
     */
    isDefault: boolean;
    /**
     * Name identifier for the region.
     */
    name: string;
    /**
     * Short name used in Microsoft Azure. Ex: southcentralus, westcentralus, southindia, etc.
     */
    nameInAzure: string;
}

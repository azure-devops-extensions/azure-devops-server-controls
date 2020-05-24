import * as _VSS_Contributions_Contracts from "VSS/Contributions/Contracts";
import * as _VSS_Gallery_Contracts from "VSS/Gallery/Contracts";

/**
* Contract for extension management  data
*/
export interface ExtensionManagementDefaultServiceData {
    /**
    * Account token to use when communicating with the gallery
    */
    accountToken: string;
    /**
    * Extensions installed in the current context
    */
    installedExtensions: _VSS_Contributions_Contracts.InstalledExtension[];
    /**
    * The list of full PublishedExtensions for all installed extensions in the current context
    */
    installedPublishedExtensions: _VSS_Gallery_Contracts.PublishedExtension[];
    marketplaceUrl: string;
    /**
    * Requested extensions for the current context
    */
    requestedExtensions: _VSS_Contributions_Contracts.RequestedExtension[];
    serverKey: string;
    /**
    * The list of private published extensions shared with the current collection
    */
    sharedExtensions: _VSS_Gallery_Contracts.PublishedExtension[];
    /**
    * Extension management related Permissions for the current user
    */
    userPermissions: { [key: string]: boolean; };
}

export var TypeInfo = {
    ExtensionManagementDefaultServiceData: {
        fields: <any>null
    }
}
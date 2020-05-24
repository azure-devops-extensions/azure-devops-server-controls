import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");

/** 
 * Returns a properly formed widget from the catalog and dragged from the catalog item control
 */

export function createInitialWidgetState(metadata: TFS_Dashboards_Contracts.WidgetMetadata): TFS_Dashboards_Contracts.WidgetResponse {
    var defaultSizeIndex: number = getFirstValidSize(metadata);

    // Instantiates a concrete widget from the supplied Metadata
    return <TFS_Dashboards_Contracts.WidgetResponse>{
        allowedSizes: metadata.allowedSizes,
        isEnabled: metadata.isEnabled,
        _links: null,
        contentUri: metadata.contentUri,
        contributionId: metadata.contributionId,
        configurationContributionId: metadata.configurationContributionId,
        configurationContributionRelativeId: metadata.configurationContributionRelativeId,
        isNameConfigurable: metadata.isNameConfigurable,
        url: null,

        name: metadata.name,
        id: null,
        size: metadata.allowedSizes[defaultSizeIndex],
        position: {
            column: null,
            row: null
        },
        settings: metadata.defaultSettings,
        typeId: metadata.typeId,
        lightboxOptions: metadata.lightboxOptions
    };
}

// Find first valid allowed size
function getFirstValidSize(metadata: TFS_Dashboards_Contracts.WidgetMetadata): number {
    for (let i = 0; i < metadata.allowedSizes.length; ++i) {
        if (TFS_Dashboards_Common.WidgetSizeValidator.isValidWidgetSize(metadata.allowedSizes[i])) {
            return i;
        }
    }
}

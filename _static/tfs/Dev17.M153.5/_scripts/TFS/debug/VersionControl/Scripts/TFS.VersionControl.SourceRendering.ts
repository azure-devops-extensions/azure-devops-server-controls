import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import VSS = require("VSS/VSS");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");

export module WikiRelativeLinkEnablement {

    export function isWikiLinkTransformationEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlWikiLinkTransformation);
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.VersionControl.SourceRendering", exports);

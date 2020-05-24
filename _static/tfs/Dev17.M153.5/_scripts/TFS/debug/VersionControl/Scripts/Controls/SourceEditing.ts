import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

/**
* Encoding constants for TFVC content.
*/
export module TfvcEncodingConstants {
    export let UTF8 = 65001;
    export let UTF16_BE = 1201;
    export let UTF16_LE = 1200;
    export let UTF32_BE = 12001;
    export let UTF32_LE = 12000;
    export let Binary = -1;
    export let Unchanged = -2;
}

/**
* Source-editing related constants.
*/
export module Constants {

    // Set max file size to edit at 20 MB. The maximum size of the payload on the server is 25 MB. Use something
    // less to account for JSON payload overhead + allowing for some unicode characters (transferred as multiple bytes).
    // This is not exact. We may be enforcing a slightly lower limit here than what would normally be allowed.
    // We could also not detect this state if the file contained a whole bunch of unicode text. That's okay, in that
    // case the server will reject the request. This just helps us have a better experience where we fail earlier and
    // give a better error message.
    export let MAX_EDIT_FROM_WEB_CONTENT_SIZE = 20 * 1024 * 1024;
}

/**
* Static helper methods for determining whether or not Editing should be enabled.
*/
export module EditingEnablement {

    export function isSourceEditingFeatureEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlEditing);
    }

    export function isEditableVersionType(repositoryContext: RepositoryContext, version: string): boolean {
        let versionSpec = VCSpecs.VersionSpec.parse(version);
        if (repositoryContext.getRepositoryType() === RepositoryType.Git) {
            return versionSpec instanceof VCSpecs.GitBranchVersionSpec;
        }
        else {
            return versionSpec instanceof VCSpecs.LatestVersionSpec || versionSpec as any instanceof VCSpecs.TipVersionSpec;
        }
    }

    export function showEditingActions(repositoryContext: RepositoryContext, version: string): boolean {
        return isSourceEditingFeatureEnabled() && isEditableVersionType(repositoryContext, version);
    }
}

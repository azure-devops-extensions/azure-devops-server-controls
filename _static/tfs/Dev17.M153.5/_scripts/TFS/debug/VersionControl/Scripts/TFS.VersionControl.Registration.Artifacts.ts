/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Artifacts_Plugins = require("Presentation/Scripts/TFS/TFS.ArtifactPlugins");

// Modules for compilation/type support only (no direct require statement)
import TFS_VersionControl_NO_REQUIRE = require("VersionControl/Scripts/TFS.VersionControl");
import TFS_VersionControl_RelatedArtifacts_NO_REQUIRE = require("VersionControl/Scripts/TFS.VersionControl.RelatedArtifacts");

Artifacts_Services.ClientLinking.registerArtifactResolver(Artifacts_Constants.ToolNames.VersionControl, (artifactIds, options, callback, errorCallback) => {
    VSS.using(['VersionControl/Scripts/TFS.VersionControl'], (_TFS_VersionControl: typeof TFS_VersionControl_NO_REQUIRE) => {
        _TFS_VersionControl.VersionControlArtifactHandler.beginResolve(artifactIds, options, callback, errorCallback);
    });
});

Artifacts_Services.ClientLinking.registerArtifactResolver(Artifacts_Constants.ToolNames.Git, (artifactIds, options, callback, errorCallback) => {
    VSS.using(['VersionControl/Scripts/TFS.VersionControl'], (_TFS_VersionControl: typeof TFS_VersionControl_NO_REQUIRE) => {
        _TFS_VersionControl.GitArtifactHandler.beginResolve(artifactIds, options, callback, errorCallback);
    });
});

Artifacts_Plugins.registerArtifactPluginAsync("git", (callback: Function) => {
    VSS.using(['VersionControl/Scripts/TFS.VersionControl.RelatedArtifacts'], (_TFS_VersionControl: typeof TFS_VersionControl_RelatedArtifacts_NO_REQUIRE) => {
        callback(_TFS_VersionControl.VCArtifactPlugin);
    });
});
// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.VersionControl.Registration.Artifacts", exports);

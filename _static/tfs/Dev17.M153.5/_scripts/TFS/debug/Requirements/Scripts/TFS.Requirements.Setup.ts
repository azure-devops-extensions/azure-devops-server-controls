//Auto converted from Requirements/Scripts/TFS.Requirements.Setup.debug.js

/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import TFS_Requirements_Utils = require("Requirements/Scripts/TFS.Requirements.Utils");
import Artifacts_Services = require("VSS/Artifacts/Services");


Artifacts_Services.ClientLinking.registerArtifactResolver(Artifacts_Constants.ToolNames.Requirements, function (artifactIds, options, callback, errorCallback) {
    VSS.using(['Requirements/Scripts/TFS.Requirements.Utils'], (_TFS_Requirements_Utils: typeof TFS_Requirements_Utils) => {
        _TFS_Requirements_Utils.RequirementsArtifactHandler.beginResolve(artifactIds, options, callback, errorCallback);
    });
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Requirements.Setup", exports);

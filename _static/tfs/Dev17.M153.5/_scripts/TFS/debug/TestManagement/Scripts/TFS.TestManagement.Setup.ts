//Auto converted from TestManagement/Scripts/TFS.TestManagement.Setup.debug.js

/// <reference types="jquery" />










import TFS_TestManagement = require("TestManagement/Scripts/TFS.TestManagement.TestManagementHandler");

import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Artifacts_Services = require("VSS/Artifacts/Services");
import VSS = require("VSS/VSS");

Artifacts_Services.ClientLinking.registerArtifactResolver(Artifacts_Constants.ToolNames.TestManagement, function (artifactIds, options, callback, errorCallback) {
    VSS.using(["TestManagement/Scripts/TFS.TestManagement.TestManagementHandler"], (_TFS_TestManagement: typeof TFS_TestManagement) => {
        _TFS_TestManagement.TestManagementArtifactHandler.beginResolve(artifactIds, options, callback, errorCallback);
    });
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.Setup", exports);

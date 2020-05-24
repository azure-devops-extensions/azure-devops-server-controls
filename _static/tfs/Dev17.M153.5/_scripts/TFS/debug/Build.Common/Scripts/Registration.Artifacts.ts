/// <reference types="jquery" />

import BuildArtifacts_NO_REQUIRE = require("Build.Common/Scripts/BuildArtifacts");

import {ToolNames} from "VSS/Artifacts/Constants";
import {ClientLinking} from "VSS/Artifacts/Services";
import {tfsModuleLoaded, using} from "VSS/VSS";

ClientLinking.registerArtifactResolver(ToolNames.TeamBuild, (artifactIds, options, callback, errorCallback) => {
    using(['Build.Common/Scripts/BuildArtifacts'], (BuildArtifacts: typeof BuildArtifacts_NO_REQUIRE) => {
        BuildArtifacts.BuildArtifactResolver.beginResolve(artifactIds, options, callback, errorCallback);
    });
});

// TFS plugin model requires this call for each tfs module.
tfsModuleLoaded("Registration.Artifacts", exports);

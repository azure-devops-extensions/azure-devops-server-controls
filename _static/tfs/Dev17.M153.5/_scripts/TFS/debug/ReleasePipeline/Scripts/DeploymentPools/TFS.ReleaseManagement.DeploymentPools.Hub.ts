// Copyright (c) Microsoft Corporation.  All rights reserved.

import VSSControls = require("VSS/Controls");
import VSS = require("VSS/VSS");
import SDK_Shim = require("VSS/SDK/Shim");
import * as DeploymentPoolsHub from "ReleasePipeline/Scripts/DeploymentPools/Components/DeploymentPoolsHub"
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");
import RMUtils = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils");

interface IDeploymentPoolsOptions {
}

class DeploymentPoolsTab extends VSSControls.Control<IDeploymentPoolsOptions> {
    public initialize() {
        super.initialize();
        DeploymentPoolsHub.start($(".deployment-pools-hub-view")[0]);
    }
    public initializeOptions(options: IDeploymentPoolsOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "hub-view deployment-pools-hub-view"
        }, options));

        VSS.using(["jquery.signalR-vss.2.2.0"], () => {
            RMUtils.SignalRHelper.loadSignalrClient();
            Model.resolveSignalRPromise();
        });
    }
}
SDK_Shim.registerContent("releaseManagement.deploymentPoolsHub", (context) => {
    return VSSControls.create(DeploymentPoolsTab, context.$container, context.options);
});
// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <amd-dependency path='VSS/LoaderPlugins/Css!RM:DistributedTasksLibrary' />
/// <amd-dependency path='VSS/LoaderPlugins/Css!fabric' />

import VSSControls = require("VSS/Controls");
import VSS = require("VSS/VSS");
import SDK_Shim = require("VSS/SDK/Shim");
import Component_MachineGroupsHub = require("ReleasePipeline/Scripts/MachineGroup/Components/MachineGroupsHub");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import RMUtils = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils");

interface IMachineGroupOptions {
}

class MachineGroupHub extends VSSControls.Control<IMachineGroupOptions> {
    public initialize() {
        super.initialize();

        Component_MachineGroupsHub.start($(".machinegroup-view")[0]);
    }

    public initializeOptions(options: IMachineGroupOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "hub-view machinegroup-view"
        }, options));

        VSS.using(["jquery.signalR-vss.2.2.0"], () => {
            RMUtils.SignalRHelper.loadSignalrClient();
            Model.resolveSignalRPromise();
        });
    }
}

SDK_Shim.registerContent("releaseManagement.machineGroupHub", (context) => {
    return VSSControls.create(MachineGroupHub, context.$container, context.options);
});

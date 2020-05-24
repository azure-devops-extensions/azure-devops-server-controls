import SDK_Shim = require("VSS/SDK/Shim");
import VSS = require("VSS/VSS");
import VSSControls = require("VSS/Controls");
import AdminBuildAndReleaseHub = require("Build/Scripts/AdminBuildAndRelease/Components/AdminBuildAndReleaseHub");

export interface IBuildAndReleaseHub {
}

export class Admin_BuildAndReleaseHub extends VSSControls.Control<IBuildAndReleaseHub> {

    public initialize(): void {
        super.initialize();
        AdminBuildAndReleaseHub.load($(".build-release-hub-view")[0]);
    }

    public initializeOptions(options: IBuildAndReleaseHub): void {
        super.initializeOptions($.extend({
            coreCssClass: "hub-view build-release-hub-view"
        }, options));
    }
}

SDK_Shim.VSS.register("admin.buildAndReleaseHub", (context) => {
    return VSSControls.create(Admin_BuildAndReleaseHub, context.$container, context.options);
});
/// <reference types="react" />
/// <reference types="react-dom" />

// React
import * as React from "react";
import * as ReactDOM from "react-dom";

import * as SDK_Shim from "VSS/SDK/Shim";
import Service = require("VSS/Service");
import { DeviceTypeService } from "VSS/DeviceTypeService";

import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as HeaderUtilities from "Presentation/Scripts/TFS/TFS.MyExperiences.HeaderHelper";
import { SettingsService } from "MyExperiences/Scenarios/Shared/SettingsService";
import * as Account_Settings_Service from "MyExperiences/Scenarios/Shared/SettingsService";
import * as MyWorkComponent from "MyExperiences/Scenarios/MyWork/Components/MyWorkComponent";
import { Store } from "MyExperiences/Scenarios/MyWork/Stores/Store";
import { ActionsHub } from "MyExperiences/Scenarios/MyWork/Actions/ActionsHub";
import { ActionsCreator } from "MyExperiences/Scenarios/MyWork/Actions/ActionsCreator";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

SDK_Shim.registerContent("myWorkView.initialize", (context) => {
    const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
    const actionsHub = new ActionsHub();

    const deviceTypeService = Service.getService(DeviceTypeService);
	const isMobile = deviceTypeService.isMobile();
    if (!isMobile) {
        HeaderUtilities.updateHeaderState();
    }

    const workComponentProps: MyWorkComponent.IWorkComponentProps = {
        store: new Store(actionsHub),
        actionsCreator: new ActionsCreator(actionsHub),
        isFollowsEnabled: tfsContext.configuration && tfsContext.configuration.getMailSettings().enabled,
        initialPivot: Service.getLocalService(SettingsService).getSavedPivot(),
        isRecentActivityEnabled: FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.MyWorkShowRecentActivity),
        isMobile: isMobile,
        isMentionedPivotEnabled: FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.MyWorkShowMentioned),
    };

    context.$container.addClass("my-work-view");

    HeaderUtilities.TopLevelReactManager.renderTopLevelReact(React.createElement(MyWorkComponent.MyWorkComponent, workComponentProps, null), context.container);

    HeaderUtilities.TopLevelReactManager.attachCleanUpEvents();

    Service.getLocalService(Account_Settings_Service.SettingsService).updateHubSelection();
});
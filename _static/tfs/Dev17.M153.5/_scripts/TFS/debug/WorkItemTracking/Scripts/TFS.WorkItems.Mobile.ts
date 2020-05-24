/// <reference types="jquery" />

import "VSS/LoaderPlugins/Css!WorkItemArea";

import VSS = require("VSS/VSS");
import Performance = require("VSS/Performance");
import { getPageContext } from "VSS/Context";
import { getHistoryService } from "VSS/Navigation/Services";
import Controls = require("VSS/Controls");
import Events_Action = require("VSS/Events/Action");
import SDK_Shim = require("VSS/SDK/Shim");
import * as Utils_String from "VSS/Utils/String";
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import { IReactWorkItemViewConfigurationOptions, ReactWorkItemView } from "WorkItemTracking/Scripts/Form/React/ReactWorkItemView";
import { MobileReactFormRenderer } from "WorkItemTracking/Scripts/Form/Mobile/MobileReactFormRenderer";
import { MobileLayoutTransformation } from "WorkItemTracking/Scripts/Form/LayoutTransformations/MobileLayoutTransformation";
import { WorkItemActions, openWorkItemInNewTabActionWorker } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";
import { WorkItemFormBase, IBaseWorkItemFormOptions } from "WorkItemTracking/Scripts/Controls/WorkItemFormBase";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

// Side effect import so we can override some control types.
import "WorkItemTracking/Scripts/ControlRegistration/Form.Mobile";

const actionSvc = Events_Action.getService();

SDK_Shim.VSS.register("work-mobile", (context) => {
    WitFormModeUtility.isMobileForm = true;

    Performance.getScenarioManager().split("BeginWorkMobileRender");
    
    const options: IBaseWorkItemFormOptions = {
        tfsContext: TfsContext.getDefault(),
        formViewType: ReactWorkItemView,
        formViewOptions: <IReactWorkItemViewConfigurationOptions>{
            rendererType: MobileReactFormRenderer,
            additionalLayoutTransformations: [new MobileLayoutTransformation()]
        }
    };

    const pageContext = getPageContext();
    const idRouteValue = pageContext.navigation.routeValues["id"];
    const workItemId = parseInt(idRouteValue, 10);

    // Remove any query string, if set
    const historyService = getHistoryService();
    if (!!historyService.getCurrentQueryString()) {
        historyService.replaceState(document.location.href.replace(document.location.search, ""));
    }

    const workItemForm = <WorkItemFormBase>Controls.BaseControl.createIn(WorkItemFormBase, context.$container, options);
    workItemForm.beginShowWorkItem(workItemId);

    // Linked work items should always be opened in a new tab
    actionSvc.registerActionWorker(WorkItemActions.ACTION_WORKITEM_OPEN, openWorkItemInNewTabActionWorker, 1);
});

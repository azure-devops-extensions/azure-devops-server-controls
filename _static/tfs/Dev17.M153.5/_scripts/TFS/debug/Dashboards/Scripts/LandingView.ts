import { AdminView } from "Dashboards/Scripts/AdminView";
import { BaseView } from "Dashboards/Scripts/BaseView";
import {Enhancement} from "VSS/Controls";
import * as UserPermissionsHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";
import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import { domElem } from "VSS/Utils/UI";

// the goal is to load into the UI the view (and associated controls) based on what the user can actually interact with
// avoid pushing into DOM elements that ae not needed.

(() => {

    if (UserPermissionsHelper.CanEditDashboard()) {
        Enhancement.registerEnhancement(AdminView, "." + BaseView.CssClassDashboardView);
    }

    else {
        Enhancement.registerEnhancement(BaseView, "." + BaseView.CssClassDashboardView);
    }

})();
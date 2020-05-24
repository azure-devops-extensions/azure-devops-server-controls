/// <reference types="jquery" />

import TFS_AGILE_CONTROLS = require("Agile/Scripts/Common/Controls");
import UI_CONTROLS = require("VSS/Controls");
import PERFORMANCE = require("VSS/Performance");
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import Events_Services = require("VSS/Events/Services");
import TFS_Admin = require("Admin/Scripts/TFS.Admin");
import Events_Action = require("VSS/Events/Action");

$(() => {
    UI_CONTROLS.Enhancement.enhance(TFS_AGILE_CONTROLS.SprintViewControl, ".team-iteration-view");
    UI_CONTROLS.Enhancement.enhance(TFS_AGILE_CONTROLS.BacklogViewControl, ".team-backlog-view");
    PERFORMANCE.getScenarioManager().startScenarioFromNavigation(
        CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
        "IterationBoard.Open.Empty").end();

    Events_Services.getService().attachEvent(TFS_Admin.Notifications.CLASSIFICATION_CHANGED, function () {
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_RELOAD);
    });
});
/// <reference types="jquery" />

import TFS_AGILE_CONTROLS = require("Agile/Scripts/Common/Controls");
import TFS_AGILE_CONTRIBUTABLETABSUTILS = require("Agile/Scripts/Common/ContributableTabsUtils");
import UI_CONTROLS = require("VSS/Controls");
import PERFORMANCE = require("VSS/Performance");
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import UTILS_Core = require("VSS/Utils/Core");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import { ShowParents } from "Agile/Scripts/Backlog/ProductBacklogMru";
import { BacklogContext } from "Agile/Scripts/Common/Agile";

$(() => {

    UI_CONTROLS.Enhancement.enhance(TFS_AGILE_CONTROLS.SprintViewControl, ".team-iteration-view");
    UI_CONTROLS.Enhancement.enhance(TFS_AGILE_CONTROLS.BacklogViewControl, ".team-backlog-view");
    const contributionModel = UTILS_Core.parseJsonIsland($(document), ".agile-tab-contributions-model");
    TFS_AGILE_CONTRIBUTABLETABSUTILS.ContributableTabHelper.displayContributedTab("productbacklog-view-tabs", "hub-pivot-content", "contributed-tab-content-container",
        "product-contributed-tab-title", contributionModel.ContributionId, contributionModel.SelectedPivot, contributionModel.ContributionContext);

    const $menubar = $(".backlogs-common-menubar");
    if ($menubar.length > 0) {
        $menubar.toggleClass("agile-important-hidden", false);
        const menuBar = UI_CONTROLS.Enhancement.enhance(Menus.MenuBar, $menubar) as Menus.MenuBar;
        // Initialize fullscreen menuitem
        Navigation.FullScreenHelper.initialize(menuBar);
    }

    // Setup Pivot Links
    const showParents = ShowParents.getMRUState();
    const backlogContext = BacklogContext.getInstance();
    TFS_AGILE_CONTRIBUTABLETABSUTILS.PivotViewHelper.enhanceBacklogPivotView("productbacklog-view-tabs", backlogContext.level.name, showParents.toString(), TFS_AGILE_CONTROLS.BacklogViewControlModel.backlogPivot, {
        level: backlogContext.level.name,
        workItemTypes: backlogContext.level.workItemTypes
    });

    PERFORMANCE.getScenarioManager().startScenarioFromNavigation(
        CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
        "ProductBacklog.ContributedTab").end();
});
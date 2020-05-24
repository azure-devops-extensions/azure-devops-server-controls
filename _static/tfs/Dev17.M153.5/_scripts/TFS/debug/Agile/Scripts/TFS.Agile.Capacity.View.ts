/// <reference types="jquery" />

import TFS_AGILE_SPRINTPLANNING = require("Agile/Scripts/TFS.Agile.SprintPlanning");
import TFS_UI_CONTROLS = require("VSS/Controls");

$(() => {
    TFS_UI_CONTROLS.Enhancement.enhance(TFS_AGILE_SPRINTPLANNING.SprintPlanningPageView, $(".capacity-main-content"), { pageName: TFS_AGILE_SPRINTPLANNING.SprintPlanningPageView.CAPACITY_PAGE });
});
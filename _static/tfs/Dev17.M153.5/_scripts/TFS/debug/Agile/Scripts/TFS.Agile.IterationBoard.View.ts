/// <reference types="jquery" />

import TFS_AGILE_TASKBOARD = require("Agile/Scripts/TFS.Agile.TaskBoard");
import TFS_UI_CONTROLS = require("VSS/Controls");

$(() => {
    TFS_UI_CONTROLS.Enhancement.registerEnhancement(TFS_AGILE_TASKBOARD.SprintPlanningBoardView, ".board-view");
});
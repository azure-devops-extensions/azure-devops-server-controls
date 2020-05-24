/// <reference types="jquery" />

import TFS_AGILE_CONTROLS = require("Agile/Scripts/Common/Controls");
import TFS_UI_CONTROLS = require("VSS/Controls");

$(() => {
    TFS_UI_CONTROLS.Enhancement.enhance(TFS_AGILE_CONTROLS.SprintViewControl, ".team-iteration-view");
    TFS_UI_CONTROLS.Enhancement.enhance(TFS_AGILE_CONTROLS.BacklogViewControl, ".team-backlog-view");
});
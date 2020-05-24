/// <reference types="jquery" />

import ContributableTabsUtils = require("Agile/Scripts/Common/ContributableTabsUtils");
import Utils_Core = require("VSS/Utils/Core");

$(() => {
    const selectedIteration = Utils_Core.parseJsonIsland($(document), ".iteration-backlog-selected-iteration");
    const selectedPivot = Utils_Core.parseJsonIsland($(document), ".iteration-backlog-selected-pivot");
    const contributionModel = Utils_Core.parseJsonIsland($(document), ".agile-tab-contributions-model");

    ContributableTabsUtils.PivotViewHelper.enhanceIterationPivotView("sprintplanning-view-tabs", selectedIteration, selectedPivot, contributionModel.ContributionContext);
});
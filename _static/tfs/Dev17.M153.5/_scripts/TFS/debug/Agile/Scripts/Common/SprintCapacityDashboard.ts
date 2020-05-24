/// <reference types="jquery" />

import "VSS/LoaderPlugins/Css!Agile/Common/Dashboards";

import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_ProgressControl = require("Presentation/Scripts/TFS/FeatureRef/ProgressControl");
import { DatabaseCoreFieldRefName } from "Agile/Scripts/Common/Utils";
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import Capacity_Models = require("Agile/Scripts/Capacity/CapacityModels");
import { IterationDateUtil } from "Agile/Scripts/Common/IterationDateUtil";

interface ISprintCapacityDashboardData {
    aggregatedCapacity: Capacity_Models.IAggregatedCapacity;
    capacityOptions: Capacity_Models.ICapacityOptions;
    sprintName?: string;
    hideTitle?: boolean;
    addTitleToParent?: boolean;
    startDate: Date;
    finishDate: Date;
    backlogIterationPath?: string;
    iterationPath?: string;
    defaultWorkItemType: string;
    hasItems: boolean;
    // Sprint Progress Data
    storiesPlural: string;
    storiesNotStarted: number;
    storiesInProgress: number;
}

class SprintCapacityDashboard extends Controls.BaseControl {

    /**
     * Creates a dashboard control showing summary information for the current iteration.
     *
     * @param options Additional options including the current TFS context.
     */
    constructor(options?: any) {

        super(options);
    }

    /**
     * OVERRIDE: builds the content of the control based on the embedded data island containing current iteration data.
     */
    public initialize() {

        Diag.logTracePoint("SprintCapacityDashboard.initialize.start");
        super.initialize();

        Diag.Debug.assertIsJQueryObject(this._element, "_element is missing");

        var $rootElement = $(this._element),
            teamCapacity: Capacity_Models.TeamCapacityModel,
            teamProgressControl,
            $content = $("<div/>"),
            aggregatedCapacity,
            current,
            total,
            maxValue,
            text = "Work",
            sprintTitle,
            $sprintTitle = $("<div/>"),
            $sprintDates = $("<div/>"),
            $sprintProgress = $("<div/>"),
            sprintProgressText,
            notStartedLabel,
            inProgressLabel;

        //TODO: Check for feature flag
        // Extract the data island containing the capacity
        var payload = <ISprintCapacityDashboardData>Utils_Core.parseMSJSON($rootElement.children().eq(0).html(), false);

        Diag.Debug.assert(!!payload, "Missing capacity payload");

        $rootElement.append($content);
        var capacityDataService = Capacity_Models.getService();
        teamCapacity = capacityDataService.getCapacityModelFromPayload(<any>payload);

        aggregatedCapacity = new Capacity_Models.AggregatedCapacity(payload.aggregatedCapacity.aggregatedCapacity);
        current = aggregatedCapacity.getAggregatedValue(DatabaseCoreFieldRefName.AssignedTo, Capacity_Models.AggregatedCapacity.TEAM_USERID);
        total = teamCapacity.getTotalRemainingCapacity();
        maxValue = Math.max(current, total);

        // Sprint title (name + date range)
        sprintTitle = payload.sprintName || "";

        if (payload.hideTitle) {
            $sprintTitle.hide();
            $sprintDates.hide();
        }

        $sprintTitle.text(sprintTitle)
            .addClass("sprint-summary-tile-sprint-name")
            .attr("title", sprintTitle)
            .appendTo($content);

        // Sprint dates
        let dateDisplayString = IterationDateUtil.getSprintDatesDisplay(teamCapacity.getIterationStartDate(), teamCapacity.getIterationEndDate());
        $sprintDates.text(dateDisplayString)
            .addClass("sprint-summary-tile-sprint-dates")
            .attr("title", dateDisplayString)
            .appendTo($content);

        // TODO:kunalr remove this code and replace by sprint name loaded with tile zone.
        if (payload.addTitleToParent) {
            try {
                var parent = this._element.closest(".tile-zone").parent().find(".grid-cell-title");
                var infoMessage = parent.find(".tile-info-message");
                parent.find(".cell-title").html(sprintTitle);

                $("<span></span>").prependTo(infoMessage)
                    .addClass("sprint-summary-tile-sprint-dates")
                    .css({ "margin-right": "16px", "line-height": "0" })
                    .html(dateDisplayString || "");
            }
            catch (e) { }
        }

        // Sprint progress text
        sprintProgressText = "";
        notStartedLabel = Utils_String.format(AgileControlsResources.StoriesNotStarted, payload.storiesNotStarted);
        inProgressLabel = Utils_String.format(AgileControlsResources.StoriesInProgress, payload.storiesInProgress);

        if (payload.storiesNotStarted && payload.storiesInProgress) {
            sprintProgressText = Utils_String.format(AgileControlsResources.StoriesWithTwoStatusesLabel,
                payload.storiesPlural,
                notStartedLabel,
                inProgressLabel);
        }
        else if (payload.storiesNotStarted) {
            sprintProgressText = Utils_String.format(AgileControlsResources.StoriesWithOneStatusLabel,
                payload.storiesPlural,
                notStartedLabel);
        }
        else if (payload.storiesInProgress) {
            sprintProgressText = Utils_String.format(AgileControlsResources.StoriesWithOneStatusLabel,
                payload.storiesPlural,
                inProgressLabel);
        }

        $sprintProgress.text(sprintProgressText)
            .attr("title", sprintProgressText)
            .addClass("sprint-summary-tile-sprint-progress-text")
            .appendTo($content);

        // Sprint progress chart
        teamProgressControl = <TFS_ProgressControl.ProgressControl>Controls.BaseControl.createIn(TFS_ProgressControl.ProgressControl, $content, {
            current: current,
            total: total,
            maxTotal: maxValue,
            text: text,
            suffixFormat: payload.capacityOptions.suffixFormat,
            height: 30
        });
        $(".display-text", teamProgressControl.getElement()).remove();
        var progress = $(".progress-text", teamProgressControl.getElement());
        $(".progress-text", teamProgressControl.getElement()).remove();
        $content.prepend(progress);
        var progressText = progress.text();
        if (progressText[0] === "(" && progressText[progressText.length - 1] === ")") {
            progress.text(progressText.substring(1, progressText.length - 1));
        }
        progress.show();

        $rootElement.hide();
        $rootElement.fadeIn("fast");

        Diag.logTracePoint("SprintCapacityDashboard.initialize.complete");
    }
}

VSS.classExtend(SprintCapacityDashboard, TFS_Host_TfsContext.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(SprintCapacityDashboard, ".sprint-capacity-summary-control");


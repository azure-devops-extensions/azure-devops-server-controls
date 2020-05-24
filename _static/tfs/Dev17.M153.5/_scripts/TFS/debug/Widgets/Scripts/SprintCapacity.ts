import Capacity_Models = require("Agile/Scripts/Capacity/CapacityModels");
import { SprintsUrls } from "Agile/Scripts/Common/HubUrlUtilities";
import { SprintsHubRoutingConstants } from "Agile/Scripts/Generated/HubConstants";

import ActionRequiredControl = require("Dashboards/Scripts/ActionRequiredControl");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import HostUIActions = require("Presentation/Scripts/TFS/TFS.Host.UI.Actions");

import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Controls = require("VSS/Controls");
import Host = require("VSS/Events/Action");
import Locations = require("VSS/Locations");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");

import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import SprintControls = require("Presentation/Scripts/TFS/FeatureRef/ProgressControl");
import TFS_Widget_Utilities = require("Widgets/Scripts/TFS.Widget.Utilities");
import VSS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import Widget_Utils = require("Widgets/Scripts/TFS.Widget.Utilities");
import Widget_Utils_Sprint = require("Widgets/Scripts/Shared/TFS.Widget.Utils.Sprint");
import Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";

export class SprintCapacityControl extends VSS_Control_BaseWidget.BaseWidgetControl<ISprintCapacityControlOptions>
                                   implements Dashboards_WidgetContracts.IWidget {
    private container: SprintCapacityContainer;
    private sprintCapacitySummary: Widget_Utils_Sprint.ISprintCapacitySummary;

    constructor(options = <ISprintCapacityControlOptions>{}) {
        super(options);

        var sprintCapacityModelFactory = options.sprintCapacityModelFactory || new SprintCapacityModelFactory();

        this.sprintCapacitySummary = options.sprintCapacitySummary || Widget_Utils_Sprint.getSprintCapacitySummarySingleton();

        this.container = new SprintCapacityContainer(
            { sprintCapacityModelFactory: sprintCapacityModelFactory },
            options.typeId
        );
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "sprint-capacity-summary-widget"
        }, options));
    }

    /*
     * Main function used to render the sprint capacity widget
     * @param {ISprintCapacitySummaryData} html response from data island
     * @return {void}
     */
    public renderSprintCapacity(response: Widget_Utils_Sprint.ISprintCapacitySummaryData): void {
        if (this.hasData(response)) {
            var linkUrl = SprintsUrls.getExternalSprintContentUrl(
                this.teamContext.name,
                response.value.iterationPath,
                SprintsHubRoutingConstants.SprintBacklogPivot
            );
            this.getElement().append(
                this.container.build(response, linkUrl));

            // Add the class that enables the widget to take advantage of the styles from the widget sdk
            this.getElement()
                .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.WidgetContainer)
                .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.ClickableWidgetContainer);
        }
        else {
            this.paintZeroState(response);
        }
    }

    public preload(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public load(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return this.initializeWithData();
    }

    /**
     * Initialize the widget with data.
     */
    private initializeWithData(): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        let forceRequest = true; // Widget data may become stale over time, especially in our "always open, auto refresh, team room" scenario
        var promise: IPromise<Widget_Utils_Sprint.ISprintCapacitySummaryData> = this.sprintCapacitySummary.get(forceRequest);
        return promise.then((data: Widget_Utils_Sprint.ISprintCapacitySummaryData) => {
            this.renderSprintCapacity(data);
            this.publishLoadedEvent({});
            return WidgetHelpers.WidgetStatusHelper.Success();
        }, (e) => {
            let isHtmlError = Widget_Utils.ErrorParser.isHtmlError(e);
            let error = isHtmlError ? e.html : TFS_Widget_Utilities.ErrorParser.stringifyError(e);
            return WidgetHelpers.WidgetStatusHelper.Failure(error, true /* isUserVisible */, isHtmlError);
        });

    }

    private hasData(content: Widget_Utils_Sprint.ISprintCapacitySummaryData): boolean {
        //If capacity is absent, the widget is meaningless, and we should present the "zero" state.
        var hasData: boolean = false;
        if (content.configured && content.value.iterationPath) {
            var factory = this._options.sprintCapacityModelFactory || new SprintCapacityModelFactory();
            var sprintCapacity = factory.createFromPayload(content);
            var maxValue = Math.max(sprintCapacity.current, sprintCapacity.total);
            hasData = (maxValue > 0);
        }
        return hasData;
    }

    public paintZeroState(content: Widget_Utils_Sprint.ISprintCapacitySummaryData): void{
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var linkToSetIterations = tfsContext.getActionUrl("", "work", { area: "admin", team: null, project: tfsContext.contextData.project.name, _a: "iterations" } as TFS_Host_TfsContext.IRouteData);
        var actionRequiredOptions = <Dashboard_Shared_Contracts.IActionRequiredControlOptions>{
            titleName: Resources.SprintCapacity_GenericTitle,
            message: Resources.SprintCapacity_SetupIterationMessage,
            linkText: Resources.SprintCapacity_SetupIterationLink,
            ariaLabel: Resources.SprintCapacity_SetupIterationMessage,
            // We're not actually using an image, but the css rules also use this for applying text layout
            cssClass: "with-loading-img",
            linkUrl: linkToSetIterations
        };

        //If the iteration dates have been set up, user is redirected to: Work/Backlog/Current Sprint/Capacity
        if (content.configured && content.value.sprintDateRange) {

                var linkUrl: string = Locations.urlHelper.getMvcUrl(<Locations.MvcRouteOptions>{
                    webContext: this.webContext,
                    controller: "sprints",
                    action: "capacity",
                    parameters: [ this.teamContext.name ],
                });
                actionRequiredOptions.linkUrl = linkUrl;
                actionRequiredOptions.message = Resources.SprintCapacity_NoCapacityMessage;
                actionRequiredOptions.linkText = Resources.SprintCapacity_ScheduleWorkLink;
                actionRequiredOptions.ariaLabel = Resources.SprintCapacity_NoCapacityMessage;
        }

        Controls.BaseControl.createIn(ActionRequiredControl.ActionRequiredControl, this.getElement(), actionRequiredOptions);
    }
}

/**
 * Options passed to SprintCapacityControl (used for dependency injection).
 */
export interface ISprintCapacityControlOptions extends Dashboard_Shared_Contracts.WidgetOptions {
    sprintCapacityModelFactory: ISprintCapacityModelFactory;
    sprintCapacitySummary?: Widget_Utils_Sprint.ISprintCapacitySummary; // used in UTs
}

/**
 * Options passed to SprintCapacityContainer (used for dependency injection).
 */
export interface ISprintCapacityContainerOptions {
    sprintCapacityModelFactory: ISprintCapacityModelFactory;
}

/*
* The class is used to build the container for the widget, here the most outside layer is an a tag link.
*/
export class SprintCapacityContainer {
    private sprintCapacityModelFactory: ISprintCapacityModelFactory;
    private typeId: string;

    public $link: JQuery;

    constructor(options: ISprintCapacityContainerOptions, typeId: string) {
        this.sprintCapacityModelFactory = options.sprintCapacityModelFactory;
        this.typeId = typeId;
    }

    public build(content: Widget_Utils_Sprint.ISprintCapacitySummaryData, linkUrl: string): JQuery {
        this.$link = $('<a>').attr('href', linkUrl);
        if (WidgetLinkHelper.mustOpenNewWindow()) {
            this.$link.attr("target", "_blank");
        }

        Widget_Telemetry.WidgetTelemetry.setupWidgetClickTelemetry(this.$link, this.typeId);

        this.$link.append(this.constructSprintProgressTitle(content));

        var chartWithProgress = this.constructCapacityChart(content);
        this.$link.append(this.constructCapacityProgressText(chartWithProgress));
        this.$link.append(this.constructSprintProgressText(content));
        this.$link.append(chartWithProgress);

        return this.$link;
    }

    private constructSprintProgressTitle(content: Widget_Utils_Sprint.ISprintCapacitySummaryData): JQuery {
        var sprintTitle: string = content.value.sprintName || "";
        var $title: JQuery = $("<h2 />")
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.Title)
            .attr("title", sprintTitle)
            .text(sprintTitle);
        var $subTitle = this.constructSprintProgressDatesText(content);
        $title.append($subTitle);
        return $title;
    }

    private constructSprintProgressDatesText(content: Widget_Utils_Sprint.ISprintCapacitySummaryData): JQuery {
        var $sprintDateRange: JQuery = $("<div/>")
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.SubTitle)
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.TruncatedTextWithEllipsis);

        if (content.value.sprintDateRange) {
            $sprintDateRange.text(content.value.sprintDateRange);
        }
        return $sprintDateRange;
    }

    private constructSprintProgressText(content: Widget_Utils_Sprint.ISprintCapacitySummaryData): JQuery {
        // Sprint progress text
        var sprintProgressText = "";
        var notStartedLabel = Utils_String.format(Resources.SprintCapacity_StoriesNotStarted, content.value.storiesNotStarted);
        var inProgressLabel = Utils_String.format(Resources.SprintCapacity_StoriesInProgress, content.value.storiesInProgress);

        if (content.value.storiesNotStarted && content.value.storiesInProgress) {
            sprintProgressText = Utils_String.format(Resources.SprintCapacity_StoriesWithTwoStatusesLabel,
                content.value.storiesPlural,
                notStartedLabel,
                inProgressLabel);
        } else if (content.value.storiesNotStarted) {
            sprintProgressText = Utils_String.format(Resources.SprintCapacity_StoriesWithOneStatusLabel,
                content.value.storiesPlural,
                notStartedLabel);
        } else if (content.value.storiesInProgress) {
            sprintProgressText = Utils_String.format(Resources.SprintCapacity_StoriesWithOneStatusLabel,
                content.value.storiesPlural,
                inProgressLabel);
        }

        var $element = $('<div>');
        $element.text(sprintProgressText)
            .attr("title", sprintProgressText)
            .addClass("user-story-progress")
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.TruncatedTextWithEllipsis);

        return $element;
    }

    private constructCapacityProgressText(teamProgressControl: JQuery): JQuery {
        var progress = $(".progress-text", teamProgressControl);
        $(".progress-text", teamProgressControl).remove();

        var progressText = progress.text();
        if (progressText[0] === '(' && progressText[progressText.length - 1] === ')') {
            progress.text(progressText.substring(1, progressText.length - 1));
        }
        progress.show();
        return progress;
    }

    private constructCapacityChart(content: Widget_Utils_Sprint.ISprintCapacitySummaryData) : JQuery {
        var sprintCapacity = this.sprintCapacityModelFactory.createFromPayload(content);

        var maxValue = Math.max(sprintCapacity.current, sprintCapacity.total);

        // Sprint progress chart
        var teamProgressControl = <SprintControls.ProgressControl>Controls.BaseControl.createIn(SprintControls.ProgressControl, this.$link, {
            current: sprintCapacity.current,
            total: sprintCapacity.total,
            maxTotal: maxValue,
            text: "Work",
            suffixFormat: content.value.capacityOptions.suffixFormat,
            height: 30
        });
        $(".display-text", teamProgressControl.getElement()).remove();
        return teamProgressControl.getElement();
    }
}

/**
 * Represents a snapshot of the team's sprint capacity
 */
export interface ISprintCapacityModel {
    current: number;
    total: number;
}

/**
 * Creates a sprint capacity snapshots
 */
export interface ISprintCapacityModelFactory {
    /**
     * Creates a snapshot of the team's sprint capacity from the sprintCapacitySummary response payload
     */
    createFromPayload(payload: Widget_Utils_Sprint.ISprintCapacitySummaryData): ISprintCapacityModel;
}

/**
 * Creates a sprint capacity snapshots
 */
export class SprintCapacityModelFactory implements ISprintCapacityModelFactory {
    /**
     * Creates a snapshot of the team's sprint capacity from the sprintCapacitySummary response payload
     */
    public createFromPayload(payload: Widget_Utils_Sprint.ISprintCapacitySummaryData): ISprintCapacityModel {
        let ignoreCache = true; // Data may become stale over time, especially in our "always open, auto refresh, team room" scenario
        var teamCapacity = Capacity_Models.getService().getCapacityModelFromPayload(payload.value, ignoreCache);

        var aggregatedCapacity = new Capacity_Models.AggregatedCapacity(payload.value.aggregatedCapacity.aggregatedCapacity);

        return {
            current: aggregatedCapacity.getAggregatedValue("System.AssignedTo", Capacity_Models.AggregatedCapacity.TEAM_USERID),
            total: teamCapacity.getTotalRemainingCapacity()
        };
    }
}

SDK.VSS.register("dashboards.sprintCapacity", () => SprintCapacityControl);
SDK.registerContent("dashboards.sprintCapacity-init", (context) => {
    return Controls.create(SprintCapacityControl, context.$container, context.options);
});

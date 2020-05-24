import Q = require("q");

import ActionRequiredControl = require("Dashboards/Scripts/ActionRequiredControl");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import HostUIActions = require("Presentation/Scripts/TFS/TFS.Host.UI.Actions");
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import TFS_Rest_Utils = require("Presentation/Scripts/TFS/TFS.Rest.Utils");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Ajax = require("VSS/Ajax");

import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import RestClient = require("TFS/Core/RestClient");
import Contracts = require("TFS/Core/Contracts");
import WorkContracts = require("TFS/Work/Contracts");
import WorkItemTracking = require("TFS/WorkItemTracking/RestClient");
import WorkRestClient = require("TFS/Work/RestClient");
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import Events_Action = require("VSS/Events/Action");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Work_Contracts = require("TFS/Work/Contracts");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import VSS_Service = require("VSS/Service");
import VSS_Locations = require("VSS/Locations");

import BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import Widget_Ncolor_Bar = require("Widgets/Scripts/Shared/NcolorBarControl");
import Widget_Utils = require("Widgets/Scripts/TFS.Widget.Utilities");
import Widget_Utils_Sprint = require("Widgets/Scripts/Shared/TFS.Widget.Utils.Sprint");
import TFS_Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import { AgileSettingsHelper } from "Widgets/Scripts/Shared/AgileSettingsHelper";
import Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import TFS_Widget_Utilities = require("Widgets/Scripts/TFS.Widget.Utilities");
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { BacklogsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Service from "VSS/Service";

export interface ISprintOverviewControlOptions extends Dashboard_Shared_Contracts.WidgetOptions {
    backlog: Widget_Utils_Sprint.IBacklog;
    sprintCapacitySummary: Widget_Utils_Sprint.ISprintCapacitySummary;
}

export interface Team {
    /**
    * identifier of the team
    */
    id: string;
    /**
    * Name of the team
    */
    name: string;
}

export interface SprintOverViewSettings {
    /**
    * The Actual team data
    */
    team: Team;
    /**
    * The actual selected units
    */
    units: string;
    /**
    * Eneable and disable weekends
    */
    includeDaysOff: boolean;
}


export class SprintOverview extends BaseWidget.BaseWidgetControl<ISprintOverviewControlOptions>
    implements Dashboards_WidgetContracts.IWidget {

    public static EnhancementName: string = "dashboards.sprintOverview";
    public static DomCoreCssClass: string = "widget-sprint-overview";
    public static Effort: string;

    private static TopTeamCount = 500; // Assuming team count will not approach or exceed 500.

    public $link: JQuery;
    private $progressTitle: JQuery;
    private $progressDayBarDescription: JQuery;
    private $progressDayBar: JQuery;
    private $progressWorkBarDescription: JQuery;
    private $progressWorkBar: JQuery;
    private selectedTeamContext;

    private _backlog: Widget_Utils_Sprint.IBacklog = null;
    private bugsBehavior;
    private _sprintCapacitySummary: Widget_Utils_Sprint.ISprintCapacitySummary;
    public _sprintCapacitySummaryData: Widget_Utils_Sprint.ISprintCapacitySummaryData;
    public _teamDaysOff: WorkContracts.DateRange[];
    public _daysRemaining;

    public _sprintSettings: SprintOverViewSettings = {
        includeDaysOff: false,
        units: Resources.SprintOverview_CountOfWorkItems
        , team: { id: "", name: "" }
    };

    constructor(options = <ISprintOverviewControlOptions>{}) {
        super(options);
        this._sprintCapacitySummary = !Widget_Utils.isUndefinedOrNull(options.sprintCapacitySummary)
            ? options.sprintCapacitySummary
            : Widget_Utils_Sprint.getSprintCapacitySummarySingleton();
    }

    public preload(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public load(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {

        var promises: IPromise<any>[] = [];
        var getSprintTeams: IPromise<Contracts.WebApiTeam[]>;
        var sprintSummaryPromise: IPromise<Widget_Utils_Sprint.ISprintCapacitySummaryData>;
        if (state.customSettings.data !== null) {
            this._sprintSettings = SprintOverview.parseFromSettings(state); //if we have data this will take it
        }

        if (this._sprintSettings.team.id === Utils_String.empty || this._sprintSettings.team.name === Utils_String.empty || state.customSettings.data === null) {
            this._sprintSettings.team.id = this.teamContext.id;
            this._sprintSettings.team.name = this.teamContext.name;
        }

        var projectProcessConfiguration: TFS_AgileCommon.ProjectProcessConfiguration = null;
        var projectProcessConfigurationPromise: Q.IPromise<TFS_AgileCommon.ProjectProcessConfiguration> = AgileSettingsHelper.getProjectProcessConfiguration();

        return projectProcessConfigurationPromise.then(
            (data: TFS_AgileCommon.ProjectProcessConfiguration) => {// get the fields for the unit combo box
                projectProcessConfiguration = data;
                SprintOverview.Effort = projectProcessConfiguration.getTypeField(
                    TFS_AgileCommon.ProjectProcessConfiguration.FieldType.Effort).name;
                this.selectedTeamContext = jQuery.extend(true, {}, this.webContext);
                if (!this.selectedTeamContext.team) {
                    this.selectedTeamContext.team = {};
                }

                this.selectedTeamContext.team.id = this._sprintSettings.team.id; // choose  the team we want to get the data
                this.selectedTeamContext.team.name = this._sprintSettings.team.name;
                sprintSummaryPromise = this._sprintCapacitySummary.get(true, this.selectedTeamContext.team.id);
                return sprintSummaryPromise.then(
                    (data: Widget_Utils_Sprint.ISprintCapacitySummaryData) => {
                        this._sprintCapacitySummaryData = data;
                        if (!this._sprintCapacitySummaryData.configured) {
                            // no iterations configured.  We required full configuration before we'll load.
                            this.renderNeedsConfiguration();
                            this.publishLoadedEvent({});
                            return WidgetHelpers.WidgetStatusHelper.Success();
                        }
                        this._backlog = this._options.backlog || new Widget_Utils_Sprint.Backlog(
                            projectProcessConfiguration,
                            this.selectedTeamContext,
                            null,
                            this.selectedTeamContext.team);
                        return this._backlog.initialize(this._sprintCapacitySummaryData.value.IterationId).then(
                            () => {// now we should have enough data to draw the controls.
                                return this.render();
                            }) as any;
                    }, (e) => {
                        let isHtmlError = Widget_Utils.ErrorParser.isHtmlError(e);
                        let error = isHtmlError ? e.html : TFS_Widget_Utilities.ErrorParser.stringifyError(e);
                        return WidgetHelpers.WidgetStatusHelper.Failure(error, true /* isUserVisible */, isHtmlError);
                    });
            }, (e) => {
                var error: string = Widget_Utils.ErrorParser.stringifyError(e);
                return WidgetHelpers.WidgetStatusHelper.Failure(error);
            });
    }

    public reload(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {

        this.getElement().empty();
        return this.load(settings);
    }

    public static parseFromSettings(widgetSettings: Dashboards_WidgetContracts.WidgetSettings): SprintOverViewSettings {

        var settings: SprintOverViewSettings = null;

        try {
            settings = JSON.parse(widgetSettings.customSettings.data);
        }
        catch (e) {
            // suppressing exception as we handle null configuration within load and Render. 
        }

        return settings;
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: SprintOverview.DomCoreCssClass
        }, options));
    }

    public static getTeamDaysOff(sprintSettings: SprintOverViewSettings, webContext: Contracts_Platform.WebContext): IPromise<WorkContracts.TeamSettingsDaysOff> {

        var deferred: Q.Deferred<WorkContracts.TeamSettingsDaysOff> = Q.defer<WorkContracts.TeamSettingsDaysOff>();
        var options: VSS_Locations.MvcRouteOptions = {
            area: "api",
            action: "teamSettings",
            controller: "teamConfiguration",
            team: sprintSettings.team.name,
            project: webContext.project.id,
            queryParams: {
                "teamid": sprintSettings.team.name
            }
        } // get team settings
        var url = VSS_Locations.urlHelper.getMvcUrl(options);

        var ajaxOptions: JQueryAjaxSettings = {
            type: "get",
            dataType: "json"
        };

        Ajax.issueRequest(url, ajaxOptions).then((teamSettings: TFS_AgileCommon.ITeamSettings) => {
            WorkRestClient.getClient().getTeamDaysOff(
                {
                    team: sprintSettings.team.name, teamId: sprintSettings.team.id,
                    project: webContext.project.name, projectId: webContext.project.id
                }, teamSettings.currentIteration.id)
                .then((teamsDaysoff) => { // with the team setting we get team days off
                    deferred.resolve(teamsDaysoff);
                }, (e) => {
                    deferred.reject(e);
                });
        });
        return deferred.promise;
    }

    private renderNeedsConfiguration() {
        var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var linkToSetIterations: string = tfsContext.getActionUrl("", "work", { area: "admin", team: null, project: this.webContext.project.name, _a: "iterations" } as TFS_Host_TfsContext.IRouteData);
        var actionRequiredOptions: Dashboard_Shared_Contracts.IActionRequiredControlOptions = <Dashboard_Shared_Contracts.IActionRequiredControlOptions>{
            titleName: Resources.SprintOverview_GenericTitle,
            message: Resources.SprintOverview_SetupIterationsMessage,
            linkText: Resources.SprintOverview_SetupIterationsLink,
            ariaLabel: Resources.SprintOverview_SetupIterationsMessage,
            linkUrl: linkToSetIterations,
            cssClass: "with-loading-img"
        };
        Controls.BaseControl.createIn(ActionRequiredControl.ActionRequiredControl, this.getElement(), actionRequiredOptions);
    }

    private constructSprintProgressTitle(sprintName: string, dateRange: string): JQuery {
        var $head: JQuery = $("<div/>");
        var $title: JQuery = $("<div />")
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.Title)
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.TruncatedTextWithEllipsis)
            .addClass("team-title")
            .text(this._sprintSettings.team.name);
        var $subtitle: JQuery = $("<div/>")
            .addClass("sprint-iteration");
        var $sprintName: JQuery = $("<div/>")
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.SubTitle)
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.TruncatedTextWithEllipsis)
            .text(sprintName);
        var sprintRange: JQuery = $("<div/>")
            .addClass("sprint-iteration")
            .addClass("date-range")
            .text(dateRange);
        $head.append($title);
        $head.append($subtitle);
        $subtitle.append($sprintName);
        $subtitle.append(sprintRange)
        return $head;
    }

    private constructProgressDescriptionText(remaingUnits: any, units: any, titleClass: string): JQuery {
        if (remaingUnits < 0) {
            remaingUnits = 0;
        }
        var progressText = $('<div>')
            .attr("aria-hidden", "true")
            .addClass(titleClass)
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.TruncatedTextWithEllipsis);

        if (units) {
            progressText.text((remaingUnits !== 0 ? remaingUnits : Utils_String.empty) + " " + units);
            RichContentTooltip.addIfOverflow(progressText.text(), progressText);
        }
        else {
            progressText.html("&nbsp;");
        }

        return progressText;
    }

    private constructProgressBar(): JQuery {
        var workItemsCompleted: number;
        var workItemsInProgress: number;
        var workItemsProposedOrCommitted: number;

        if (this._sprintSettings.units == Resources.SprintOverview_CountOfWorkItems) { // check the units we want and read data
            workItemsCompleted = this._backlog.getRequirementsCompleted();
            workItemsInProgress = this._backlog.getRequirementsInProgress();
            workItemsProposedOrCommitted = this._backlog.getRequirementsProposedOrCommitted();
            if (this.bugsBehavior === 1) {
                workItemsCompleted += this._backlog.getBugsCompleted();
                workItemsInProgress += this._backlog.getBugsInProgress();
                workItemsProposedOrCommitted += this._backlog.getBugsProposedOrCommitted();
            }
        } else {
            workItemsCompleted = this._backlog.getRequirementsEffortCompleted();
            workItemsInProgress = this._backlog.getRequirementsEffortInProgress();
            workItemsProposedOrCommitted = this._backlog.getRequirementsEffortProposedOrCommitted();
            if (this.bugsBehavior === 1) {
                workItemsCompleted += this._backlog.getBugsEffortCompleted();
                workItemsInProgress += this._backlog.getBugsEffortInProgress();
                workItemsProposedOrCommitted += this._backlog.getBugsEffortProposedOrCommitted();
            }
        }

        workItemsCompleted = workItemsCompleted < 0 ? 0 : workItemsCompleted;
        workItemsInProgress = workItemsInProgress < 0 ? 0 : workItemsInProgress;
        workItemsProposedOrCommitted = workItemsProposedOrCommitted < 0 ? 0 : workItemsProposedOrCommitted;

        var workItems: Array<Widget_Ncolor_Bar.NcolorBarCounts> = [];// creates the color bar
        workItems.push(<Widget_Ncolor_Bar.NcolorBarCounts>{ count: workItemsCompleted, hover: workItemsCompleted + " " + Resources.SprintOverview_Completed, color: "green" });
        workItems.push(<Widget_Ncolor_Bar.NcolorBarCounts>{ count: workItemsInProgress, hover: workItemsInProgress + " " + Resources.SprintOverview_InProgress, color: "blue" });
        workItems.push(<Widget_Ncolor_Bar.NcolorBarCounts>{ count: workItemsProposedOrCommitted, hover: workItemsProposedOrCommitted + " " + Resources.SprintOverview_NotStarted, color: "gray" });

        return (Controls.BaseControl.createIn(Widget_Ncolor_Bar.NcolorBarControl,
            this.getElement(),
            <Widget_Ncolor_Bar.NcolorBarControlOptions>{ counts: workItems, size: 310 }))//310 is the size of the actual bar
            .getElement();
    }

    public _calculateWorkingDays(): number {
        var daysCompleted: number;
        var iterationDateData = this._sprintCapacitySummaryData.value;
        var totalDays: number = 1 + this.datesToDays(iterationDateData.IterationEndDate, iterationDateData.IterationStartDate);
        if (this._sprintSettings.includeDaysOff) { //If we include weekends the day completed and remaining include teams days off
            daysCompleted = this.datesToDays(iterationDateData.CurrentDate, iterationDateData.IterationStartDate);
            this._daysRemaining = 1 + this.datesToDays(iterationDateData.IterationEndDate, iterationDateData.CurrentDate);
        } else { //otherwise the complete days already exclude team days off
            daysCompleted = iterationDateData.workDaysTotal - iterationDateData.workDaysRemaining;
            this._daysRemaining = iterationDateData.workDaysRemaining;
        }

        if (this._daysRemaining < 0) {
            this._daysRemaining = 0;
        }
        if (daysCompleted < 0) {
            daysCompleted = 0;
        }
        if (this._daysRemaining > totalDays) {
            this._daysRemaining = totalDays;
        }
        if (daysCompleted > totalDays) {
            daysCompleted = totalDays;
        }

        return daysCompleted;
    }

    /**
     * Compute the number of days between two dates
     * @param endDate - The end date
     * @param startDate - the start date
     */
    private datesToDays(endDate: Date, startDate: Date): number {
        return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    }

    private percentageWorkDaysCompleted(): JQuery {
        var days: Array<Widget_Ncolor_Bar.NcolorBarCounts> = [];
        var daysCompleted: number = this._calculateWorkingDays();
        days.push(<Widget_Ncolor_Bar.NcolorBarCounts>{ count: daysCompleted, hover: daysCompleted + " " + (daysCompleted > 1 ? Resources.SprintOverview_DaysCompleted : Resources.SprintOverview_DaysCompleted), color: "purple" });
        days.push(<Widget_Ncolor_Bar.NcolorBarCounts>{ count: this._daysRemaining, hover: this._daysRemaining + " " + (this._daysRemaining > 1 ? Resources.SprintOverview_DaysRemaining : Resources.SprintOverview_DayRemaining), color: "gray" });
        return (Controls.BaseControl.createIn(Widget_Ncolor_Bar.NcolorBarControl,
            this.getElement(), <Widget_Ncolor_Bar.NcolorBarControlOptions>{ counts: days, size: 310 }))//310 is the size of the actual bar
            .getElement();
    }

    public static getSprintOverviewUnits(projectProcessConfigurationPromise: Q.IPromise<TFS_AgileCommon.ProjectProcessConfiguration>): IPromise<string[]> {
        var defer = Q.defer<string[]>();
        var projectProcessConfiguration: TFS_AgileCommon.ProjectProcessConfiguration = null;
        projectProcessConfigurationPromise = AgileSettingsHelper.getProjectProcessConfiguration();
        projectProcessConfigurationPromise.then(
            (data: TFS_AgileCommon.ProjectProcessConfiguration) => {// get the fields for the unit combo box
                projectProcessConfiguration = data;
                WorkItemTracking.getClient().getField(projectProcessConfiguration.getTypeField(
                    TFS_AgileCommon.ProjectProcessConfiguration.FieldType.Effort).name)
                    .then((effort: TFS_AgileCommon.ITypeField) => {
                        SprintOverview.Effort = effort.name;
                        defer.resolve([Resources.SprintOverview_CountOfWorkItems, SprintOverview.Effort]);
                    });
            });
        return defer.promise;
    }

    public static getSprintOverviewTeams(projectId: string): IPromise<Contracts.WebApiTeam[]> {
        var restClient = VSS_Service.getClient(RestClient.CoreHttpClient4);
        var getTeams = (top: number, skip: number) => restClient.getTeams(projectId, top, skip);

        return TFS_Rest_Utils.batchGet(getTeams, SprintOverview.TopTeamCount)
            .then((teams: Contracts.WebApiTeam[]) => {
                if (teams.length === 0) {
                    // No Workitem Types have been configured for this project
                    return Q.reject(Resources.SprintOverview_MissingTeams);
                } else {
                    return teams;
                }
            });
    }

    private render(): IPromise<TFS_Dashboards_WidgetContracts.WidgetStatus> {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var linkToBacklog = tfsContext.getActionUrl("", "backlogs", { area: null, team: this._sprintSettings.team.name, project: this.webContext.project.name });

        this.$link = $('<a>');
        this.$progressTitle = this.constructSprintProgressTitle(this._sprintCapacitySummaryData.value.sprintName, this._sprintCapacitySummaryData.value.sprintDateRange);
        this.$link.attr('href', linkToBacklog);
        this.$link.append(this.$progressTitle);

        if (WidgetLinkHelper.mustOpenNewWindow()) {
            this.$link.attr("target", "_blank");
        }
        else {
            this.$link.click((e: JQueryEventObject) => {
                if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAllowFpsWidgets, false)) {
                    Service.getLocalService(HubsService).navigateToHub(BacklogsHubConstants.HUB_CONTRIBUTION_ID, this.$link.linkToBacklog);
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }

        this.getElement().append(this.$link);

        Widget_Telemetry.WidgetTelemetry.setupWidgetClickTelemetry(this.$link, this.getTypeId());

        // Add the class that enables the widget to take advantage of the styles from the widget sdk
        this.getElement()
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.WidgetContainer)
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.ClickableWidgetContainer);
        return SprintOverview.getTeamDaysOff(this._sprintSettings, this.selectedTeamContext).then((teamsDaysoff) => {

            var daysOffLength: number = teamsDaysoff.daysOff.length;
            var length: number = teamsDaysoff.daysOff.length;
            this._teamDaysOff = teamsDaysoff.daysOff;
            for (var i: number = 0; i < length; i++) {
                this._teamDaysOff[i].start = Utils_Date.shiftToUTC(this._teamDaysOff[i].start);
                this._teamDaysOff[i].end = Utils_Date.shiftToUTC(this._teamDaysOff[i].end);
            }

            this.$progressDayBar = this.percentageWorkDaysCompleted();

            var days: string;
            if (this._daysRemaining <= 0) {
                days = Resources.SprintOverview_NoDayRemaining;
            } else if (this._daysRemaining === 1) {
                days = Resources.SprintOverview_DayRemaining;
            } else {
                days = Resources.SprintOverview_DaysRemaining;
            }
            this.$progressDayBarDescription = this.constructProgressDescriptionText(
                this._daysRemaining,
                days,
                TFS_Dashboards_Constants.WidgetDomClassNames.DaysRemaining);
            this.$progressDayBarDescription.addClass("progress-day-bar-description");

            return WorkRestClient.getClient().getTeamSettings({
                project: this.selectedTeamContext.project.name,
                projectId: this.selectedTeamContext.project.id,
                team: this.selectedTeamContext.team.name,
                teamId: this.selectedTeamContext.team.id
            }).then((teamSettings: Work_Contracts.TeamSetting) => {
                this.bugsBehavior = teamSettings.bugsBehavior;

                var requirments: number =
                    this._sprintSettings.units === Resources.SprintOverview_CountOfWorkItems ?
                        this.bugsBehavior === 1 ?
                            this._backlog.getRequirementsProposedOrCommitted() + this._backlog.getBugsProposedOrCommitted() :
                            this._backlog.getRequirementsProposedOrCommitted() :
                        this.bugsBehavior === 1 ?
                            this._backlog.getRequirementsEffortProposedOrCommitted() + this._backlog.getBugsEffortProposedOrCommitted() :
                            this._backlog.getRequirementsEffortProposedOrCommitted();

                var countOfWorkStarted = this._backlog.getRequirementsInProgress() + this._backlog.getRequirementsCompleted();

                var units: string;
                if (this._sprintSettings.units == Resources.SprintOverview_CountOfWorkItems) {
                    if (this._backlog.getRequirementsProposedOrCommitted() === 0) {
                        units = countOfWorkStarted === 0 ? Resources.SprintOverview_WorkNotStarted : "";
                    } else if (this._backlog.getRequirementsProposedOrCommitted() === 1) {
                        units = Resources.SprintOverview_WorkRemaining;
                    } else {
                        units = Resources.SprintOverview_WorksRemaining;
                    }
                } else {
                    if (this._backlog.getRequirementsEffortProposedOrCommitted() <= 0) {
                        units = countOfWorkStarted === 0 ? Resources.SprintOverview_WorkNotStarted : "";
                    } else {
                        units = this._sprintSettings.units.toLowerCase() + " not started";
                    }
                }

                this.$progressWorkBarDescription = this.constructProgressDescriptionText(requirments, units, TFS_Dashboards_Constants.WidgetDomClassNames.UserStoryProgress);

                this.$progressWorkBarDescription.addClass("progress-work-bar-description");
                this.$progressWorkBar = this.constructProgressBar();
                this.$link.append(this.$progressDayBarDescription);
                this.$link.append(this.$progressDayBar);
                this.$link.append(this.$progressWorkBarDescription);
                this.$link.append(this.$progressWorkBar);
                return WidgetHelpers.WidgetStatusHelper.Success("success");
            });
        });
    }
}


SDK.VSS.register(SprintOverview.EnhancementName, () => SprintOverview);
SDK.registerContent("dashboards.sprintOverview-init", (context) => {
    return Controls.create(SprintOverview, context.$container, context.options);
});

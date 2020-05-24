import Q = require("q");

import {BuildLinks} from "Build.Common/Scripts/Linking";
import {BuildResult} from "Build.Common/Scripts/BuildResult";
import {BuildStatus} from "Build.Common/Scripts/BuildStatus";

import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");

import Build_Contracts = require("TFS/Build/Contracts");
import Build_RestClient = require("TFS/Build/RestClient");
import WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Artifacts_Services = require("VSS/Artifacts/Services");
import Contribution_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Histogram = require("VSS/Controls/Histogram");
import Locations = require("VSS/Locations");
import Navigation_Services = require("VSS/Navigation/Services");
import SDK = require("VSS/SDK/Shim");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Culture = require("VSS/Utils/Culture");
import Utils_String = require("VSS/Utils/String");
import VSS_Service = require("VSS/Service");
import Events_Action = require("VSS/Events/Action");

import Resources_Widgets = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import TFS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import Widget_Utils = require("Widgets/Scripts/TFS.Widget.Utilities");
import WidgetLiveTitle = require("Widgets/Scripts/Shared/WidgetLiveTitle");
import Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";

/**
* Describes the contract of the data being shared by the widget and the configuration
*/
export interface BuildDefinitionReference extends WidgetLiveTitle.ITrackName{
    /**
    * project where the build was created.
    */
    projectId: string;

    /**
    * artifact url for the build definition of the form vstfs:///Build/Definition/<x>
    */
    uri: string;

    /**
    * Type of build definition
    */
    type: Build_Contracts.DefinitionType;

    /**
    * identifier for the build definition.
    */
    id: number;

    /**
    * name of the build definition
    */
    name: string;

    /**
    * Name of the configuration data provider for the definition.
    * Useful for distinguishing definitions that are under multiple providers (like xaml, favorities etc) on loading configuration experience.
    */
    providerName: string;
}

/**
* Holds the DOM classes used within the build widget.
*/
export class BuildCssClasses {
    /**
    * css class for histogram container
    */
    public static DomClass_BuildHistogramContainer = "build-histogram definition-histogram";

    /**
    * css class for footer of build widget
    */
    public static DomClass_BuildFooter = "footer";

    /**
    * css class for content of build widget
    */
    public static DomClass_BuildContent = "content";

    /**
    * css class for build status icon
    */
    public static DomClass_BuildStatusIcon = "icon-tfs-build-status-";

    /**
    * css class for  icon
    */
    public static DomClass_Icon = "icon";
}

/**
* Class that encapsulates business logic and rendering for the build chart widget
* @extends VSS_Control_BaseWidget.BaseWidget
*/
export class BuildChartControl
    extends TFS_Control_BaseWidget.BaseWidgetControl<Dashboard_Shared_Contracts.WidgetOptions>
    implements WidgetContracts.IConfigurableWidget {

    /**
    * A reference to the definition whose builds are being rendered by the widget.
    */
    public _definitionReference: BuildDefinitionReference = null;

    /**
    * Current list of builds being displayed.
    */
    private builds: Build_Contracts.Build[];

    /**
    * Name associated with the build chart.
    */
    private widgetName: string;

    /**
     * The settings for the widget as stored by dashboard service and provided through the widget context.
     */
    private settings: string;

    /**
    * The container that holds the widgets rendered content.
    */
    private container: JQuery;

    /**
    * representation of the name artifact
    */
    private artifactName: string;

   /**
    * Passes relevant options to the BaseWidget control
    * and setup instance properties
    * @constructor
    */
    public constructor(options?: any) {
        super(options);
        }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "buildchart-container"
        }, options));
    }

    /**
    * Receive initial data from widget context and parse/store it in local state.
    */
    public parseInitialState(settings: WidgetContracts.WidgetSettings): void {
        if (settings != null) {
            this.settings = settings.customSettings.data;
            this.widgetName = settings.name;
            this._definitionReference = this._parseSettings(this.settings);
        }
    }

    /**
    * Paint the widget with whatever initial information was available from the host.
    * No network calls are made at this time.
    * @param {WidgetContracts.WidgetSettings} settings with name and configuration artifacts used by the widget to render.
    * @returns a promise with the state of the operation.
    */
    public preload(settings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {

        this.parseInitialState(settings);

        if (this.isUnconfigured()) {
            this.showUnConfiguredControl(settings.size, this.widgetName);
            return WidgetHelpers.WidgetStatusHelper.Unconfigured();
        }
        else if (Widget_Utils.isUndefinedOrNull(this._definitionReference)) {
            return WidgetHelpers.WidgetStatusHelper.Failure(Resources_Widgets.InvalidConfiguration);
        }
        else {
            this.setContainerToDefaultState();
        }

        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    /**
    * Setup data and renders the widget
    * @param {WidgetContracts.WidgetSettings} settings with name and configuration artifacts used by the widget to render.
    * @returns a promise with the state of the operation.
    */
    public load(settings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {
        if (this.isUnconfigured()) {
            return WidgetHelpers.WidgetStatusHelper.Success();
        }
        else if (Widget_Utils.isUndefinedOrNull(this._definitionReference)) {
            return WidgetHelpers.WidgetStatusHelper.Failure(Resources_Widgets.InvalidConfiguration);
        }
        else {
            return this._getBuildsForBuildDefinition(
                this._definitionReference.id,
                this._definitionReference.type,
                this._definitionReference.projectId).
                then((builds: Build_Contracts.Build[]) => {
                    this.builds = builds;
                    this.render(this._definitionReference.id, this.builds);
                    this.publishLoadedEvent({});
                    return WidgetHelpers.WidgetStatusHelper.Success();
                }, () => {
                    return WidgetHelpers.WidgetStatusHelper.Failure(Resources_Widgets.BuildChart_LoadingBuildsFailed);
                });
        }
    }

    /**
    * Refresh the widget when settings are provided by the configuration experience.
    * @param {WidgetContracts.WidgetSettings} settings with name and configuration artifacts used by the widget to render.
    */
    public reload(settings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {
        // update widget name with whats returned from configuration general section.
        this.widgetName = settings.name;

        // if settings hasn't changed (but name or general settings might have) re-render with existing data.
        if (this._isSettingsUnchanged(settings.customSettings.data)) {

            // recreate container
            if (!Widget_Utils.isUndefinedOrNull(this._definitionReference)) {
                this.setContainerToDefaultState();

                // render histogram and footer with existing data.
                this.render(this._definitionReference.id, this.builds);
            }

            else if (this.isUnconfigured()) {
                this.showUnConfiguredControl(settings.size, this._getWidgetName(this._getArtifactName()));
                return WidgetHelpers.WidgetStatusHelper.Unconfigured();
            }
            return WidgetHelpers.WidgetStatusHelper.Success();

        } else {

            // load latest settings
            this.settings = settings.customSettings.data;

            // parse settings into definition object
            this._parseSettings(this.settings);

            // paint and render with the latest settings information.
            return this.preload(settings).then(() => {
                // render histogram and footer with existing data.
                return this.load(settings);
            });
        }

        // Unreachable code below causes compiler error (TypeScript 1.8+)
        // this.hideUnConfiguredControl();
    }

    /**
    * Checks if the widget is in an unconfigured state.
    * @returns boolean
    */
    public isUnconfigured(): boolean {
        return Widget_Utils.isUndefinedOrNull(this.settings);
    }

    /**
     * Parse settings into a definition reference object
     * @param {string} customSettings: Settings to be parsed into a build definition reference
     * @returns {BuildDefinitionReference} : Parsed settings. Can be null if no settings
    */
    public _parseSettings(customSettings: string): BuildDefinitionReference {
        var buildDefinitionReference: BuildDefinitionReference = null;

        if (Widget_Utils.isUndefinedOrNull(customSettings)) {
            return buildDefinitionReference;
        }

        try {
            // parse json representation of the settings.
            buildDefinitionReference = <BuildDefinitionReference>(JSON.parse(customSettings));

            // parse the definitionId from the its url
            buildDefinitionReference.id = buildDefinitionReference.id || parseInt(Artifacts_Services.LinkingUtilities.decodeUri(buildDefinitionReference.uri).id);
        }
        catch (e) {
            // we notify that parsing the configuration has failed by returning null
            buildDefinitionReference = null;
        }

        if (!Widget_Utils.isUndefinedOrNull(buildDefinitionReference)) {
            // in case of xaml builds, project Id may not be available in the settings, use current project context in lieu as all build definitions
            // require a project.
            buildDefinitionReference.projectId = buildDefinitionReference.projectId || this.webContext.project.id;
        }

        return buildDefinitionReference;
    }

    /**
    * Overrides default behavior, by allowing use of the *current* Build definition name in place of the name last saved to the widget
    * The widgetLiveTitle service only applies this, if the user has not customized the name.
    * @returns string representing the name of the widget.
    */
    public _getWidgetName(artifactName:string): string {
        var widgetName = this.widgetName;
        if (artifactName && this._definitionReference) {
            widgetName = WidgetLiveTitle.WidgetLiveTitleViewer.getLiveTitle(
                widgetName,
                this._definitionReference,
                artifactName);
        }

        return widgetName;
    }

    /**
    * Checks if settings has been updated or remain unchanged
    * @param {string} new settings provided to the widget
    * @returns boolean
    */
    public _isSettingsUnchanged(newSettings: string): boolean {

        // if both have valid strings, compare to identify change.
        if (this.settings && newSettings) {
            return this.settings === newSettings;
        }

        // if both are empty or undefined.
        else if (!this.settings && !newSettings) {
            return true;
        }

        // if one if null but not the other, settings has changed.
        else {
            return false;
        }
    }

    /**
     * setup container element and initiate it with data that is already available in the widget.
     */
    private setContainerToDefaultState(): void {
        // clear of any existing controls
        this.getElement().empty();

        // assign the artifact to the current name from the definition reference.
        this.artifactName = this._definitionReference.name;

        // Add the class that enables the widget to take advantage of the styles from the widget sdk
        this.getElement()
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.WidgetContainer)
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.ClickableWidgetContainer);

        // setup container and add the title to it.
        this.container = this._getContainer(this._definitionReference.id);
        Widget_Telemetry.WidgetTelemetry.setupWidgetClickTelemetry(this.container, this.getTypeId());

        let nameOfBuildDefinition = this._getWidgetName(this.artifactName);
        let $title = $("<h2/>")
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.Title)
            .text(nameOfBuildDefinition)
            .appendTo(this.container);

        this.container.appendTo(this.getElement());

        this.addTooltipIfOverflow($title);
    }

    /**
    * Renders the widget if this one has builds defined
    * @param {number} unique identifier for the build definition being rendered.
    * @param {Build_Contracts.Build[]} a list of builds associated with the definition.
    */
    private render(definitionId: number, builds: Build_Contracts.Build[]): void {
        if (builds) {
            this._updateArtifactNameFromLatestBuildData(builds);

            // sort the builds to show them in increasing order of time.
            builds.sort((a: Build_Contracts.Build, b: Build_Contracts.Build) => {
                return Utils_Date.defaultComparer(a.startTime, b.startTime);
            });

            this._renderContent(this._setupData(builds)).appendTo(this.container);
            this._renderFooter(builds.length, builds.length > 0 ?
                builds[builds.length - 1] : null).appendTo(this.container);
        }
    }

    /**
    * The artifact is updated to reflect the latest name of the build definition in the event where there as a definition rename
    * @param {Build_Contracts.Build[]} a list of builds associated with the definition.
    */
    public _updateArtifactNameFromLatestBuildData(builds: Build_Contracts.Build[]): void {
        if (builds && builds.length > 0) {
            var firstBuild = builds[0];
            if (firstBuild.definition && firstBuild.definition.name) {
                // we pick the name from the first build as we want a definition reference without making a second round trip for it.
                // all builds have their definition information encoded in them.
                this.artifactName = builds[0].definition.name;
            }
        }
    }

    /**
    * Setup data to pass to the underlying histogram control for the widget.
    * @param {Build_Contracts.Build[]} a list of builds associated with the definition.
    * @returns each build mapped to a bar in the histogram, or returns an empty items array
    */
    public _setupData(builds: Build_Contracts.Build[]): Histogram.HistogramBarData[]{
        var barData: Histogram.HistogramBarData[] = [];
        var maxDuration: number = Number.MIN_VALUE;

        if (builds && builds.length > 0) {
            // setup the items array to pass to the histogram control to render.
            $.each(builds, (index: number, build: Build_Contracts.Build) => {

                // end time is when the build finished or the latest time if the build is still running.
                var endTime: Date = (build.status === Build_Contracts.BuildStatus.InProgress) ? (new Date(Date.now())) : build.finishTime;
                var duration: number = endTime.getTime() - build.startTime.getTime();

                maxDuration = Math.max(maxDuration, duration);

                barData[barData.length] = <Histogram.HistogramBarData>{
                    value: duration,
                    state: BuildResult.getName(build.result),
                    action: (item: Build_Contracts.Build) => {
                        Widget_Telemetry.WidgetTelemetry.onWidgetClick(this.getTypeId(), "OpenIndividualBuild", {
                            WhichButton: 1 /* only left clicks can make it to here */ });
                        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
                            url: item._links["web"].href
                        });
                    },
                    actionArgs: build,
                    title: this._getBuildTooltipText(build)
                };
            });

            // normalize the value (time) for the chart
            $.each(barData, function (index, item) {
                item.value = ((item.value / maxDuration) * 1000) / 10;
            });
        }
        return barData;
    }

    /*
    * setup the histogram for the build chart as the primary container for the chart content
    * in the widget
    * @param {Histogram.HistogramBarData[]}  each build mapped to a bar in the histogram
    * @returns the render histogram within a jquery object.
    */
    private _renderContent(barData: Histogram.HistogramBarData[]): JQuery {
        var $histogramElement = $("<div/>");
        var histogram: Histogram.Histogram = <Histogram.Histogram>Controls.BaseControl.createIn(
            Histogram.Histogram,
            $histogramElement, {
                cssClass: BuildCssClasses.DomClass_BuildHistogramContainer,
                barCount: 25,
                renderDefaultBars: false,
                barWidth: 10,
                barHeight: 60,
                barSpacing: 2,
                hoverState: "hover",
                allowInteraction: true
            });
        histogram.refresh(barData);
        var $content = $("<div/>").addClass(BuildCssClasses.DomClass_BuildContent);
        $histogramElement.appendTo($content);

        return $content;
    }

    /**
    * setup the footer for the build chart.
    * @param {number} total number of builds in the data
    * @param {Build_Contracts.Build} the most recent build data.
    * @returns the rendered footer within a jquery object.
    */
    private _renderFooter(noOfBuilds: number, latestBuild: Build_Contracts.Build): JQuery {
        var $footer = $("<div/>")
            .addClass(BuildCssClasses.DomClass_BuildFooter)
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.TruncatedTextWithEllipsis);

        if (noOfBuilds === 0 || Widget_Utils.isUndefinedOrNull(noOfBuilds)) {
            $footer.append(
                $('<span/>').
                    addClass(BuildCssClasses.DomClass_Icon));
            $footer.append(Resources_Widgets.BuildChart_NoBuildsFound);
        }
        else {
            $footer.append(
                $('<span/>').
                    addClass(this._getBuildStatusIcon(latestBuild.result)));
            $footer.append("  ");

            $footer.append(BuildStatus.getName(latestBuild.status, true));
            if (latestBuild.finishTime) {
                $footer.append("  ");
                var formattedFinishTime = Utils_Date.localeFormat(latestBuild.finishTime, Utils_Culture.getDateTimeFormat().ShortDatePattern, true);
                $footer.append(formattedFinishTime);
                $footer.attr("title", $footer.text());
            }
        }
        return $footer;
    }


    /**
     * Get the icon class string to use for showing the build result
     * @param buildResult - build result
     */
    private _getBuildStatusIcon(buildResult: Build_Contracts.BuildResult): string {
        // Default is the in progress
        var iconClassString = "bowtie-icon bowtie-status-run bow bowtie-warning-color";
        if (buildResult === Build_Contracts.BuildResult.Succeeded) {
            iconClassString = "bowtie-icon bowtie-status-success";
        } else if (buildResult === Build_Contracts.BuildResult.PartiallySucceeded) {
            iconClassString = "bowtie-icon bowtie-status-success bowtie-warning-color";
        } else if (buildResult === Build_Contracts.BuildResult.Failed) {
            iconClassString = "bowtie-icon bowtie-status-failure";
        } else if (buildResult === Build_Contracts.BuildResult.Canceled) {
            iconClassString = "bowtie-icon bowtie-status-stop";
        }
        return iconClassString;
    }

    /**
    * Create the rendering container of the widget, the widget as a whole is clickable.
    * @param {number}  identifier for the build definition which is going to be the click target.
    * @returns {JQuery} a Jquery a tag object with a link to the definition uri
    */
    private _getContainer(id: number): JQuery {
        let url = BuildLinks.getDefinitionLink(id);
        let link = $("<a/>").attr("href", url);
        if (WidgetLinkHelper.mustOpenNewWindow()) {
            link.attr("target", "_blank");
        }
        return link;
    }

    /**
    * Creates the text needed to show when the user hovers over the build. It is a summary of the build result.
    * @param {Build_Contracts.Build} information about the build.
    * @returns {string} formatted string representing the build summary.
    */
    private _getBuildTooltipText(build: Build_Contracts.Build): string {
        var finishTime: Date = build.finishTime;
        var startTime: Date = build.startTime;

        if ((build.status != Build_Contracts.BuildStatus.InProgress)) {
            // is min date condition is to ensure that in cases where finishTime is not available
            // we present a bar for the histogram with a tooltip.
            return this._constructMultiLineToolTipText(
                build.buildNumber,
                this._getFormattedDuration(
                    startTime,
                    Utils_Date.isMinDate(finishTime) ? startTime : finishTime),
                    BuildResult.getName(build.result, true));
        }
        else {
            return this._constructMultiLineToolTipText(
                build.buildNumber,
                this._getFormattedDuration(startTime, new Date(Date.now())),
                BuildResult.getName(build.result, true)
                );
        }
    }

    /**
    * Constructs a multiline tooltip to display on build hover.
    * @param {string} name of the build
    * @param {string} duration of the build
    * @param {string} result of the build
    * @returns a string with the constructed tooltip.
    */
    private _constructMultiLineToolTipText(buildName: string, duration: string, result: string): string {
        var buildNamePart: string = Utils_String.format(Resources_Widgets.BuildChart_ToolTipTextBuildName, buildName);
        var buildDurationPart: string = Utils_String.format(Resources_Widgets.BuildChart_ToolTipTextRunTime, duration);
        var buildResultPart: string = Utils_String.format(Resources_Widgets.BuildChart_ToolTipTextResult, result);
        return buildNamePart + Utils_String.newLine +
            buildDurationPart + Utils_String.newLine +
            buildResultPart;
    }

    /**
    * Calculates difference between dates and returns it in the form of
    * x days, x.y hours, x.y minutes, x.y seconds.
    * @params {Date} The first date in the comparison
    * @params {Date} The second date in the comparison
    * @returns formatted string difference between date1 and date2
    */
    public _getFormattedDuration(date1: Date, date2: Date): string {
        if (date1 == null) {
            throw new Error("The first date must be defined");
        }
        if (date2 == null) {
            throw new Error("The second date must be defined");
        }
	var diff: number = date2.getTime() - date1.getTime();
        var seconds: number = diff / 1000;
        var minutes: number = seconds / 60;
        var hours: number = minutes / 60;
        var days: number = hours / 24;
        if (minutes < 2) {
            return Utils_String.format(Resources_Widgets.BuildChart_DurationFormatSeconds, Math.round(seconds));
        }
        if (hours < 2) {
            return Utils_String.format(Resources_Widgets.BuildChart_DurationFormatMinutes, Math.round(minutes * 10) / 10);
        }
        if (days < 2) {
            return Utils_String.format(Resources_Widgets.BuildChart_DurationFormatHours, Math.round(hours * 10) / 10);
        }
        return Utils_String.format(Resources_Widgets.BuildChart_DurationFormatDays, Math.round(days));
    }

    /**
    * Get builds for build definition from REST API for Xaml definitions
    * Also @see {@link https://www.visualstudio.com/integrate/api/build/builds}
    * @param {number} definitionId holding the build configuration
    * @param {Build_Contracts.DefinitionType}  indicates if it is a vnext or xaml build.
    * @param {string}project associated with vnext build.
    * @returns {IPromise<Build_Contracts.Build>} deferred response of the REST API call
    */
    private _getBuildsForBuildDefinition(
        buildDefinitionId: number,
        definitionType: Build_Contracts.DefinitionType,
        projectId: string): IPromise<Build_Contracts.Build[]>{
            var totalHistogramsToShow: number = 25;

            return VSS_Service.getClient(Build_RestClient.BuildHttpClient2_3, undefined, undefined, undefined, { timeout: TFS_Dashboards_Common.ClientConstants.WidgetAjaxTimeoutMs }).getBuilds(
                projectId,   // project
                [buildDefinitionId], // build definition list
                null, //queues
                null, // build numbers
                null, // min finish time
                null, // max finish time
                null, // requested for
                null, // reason filters
                Build_Contracts.BuildStatus.Completed, // build status filters
                null, // result filter
                null, // tag filters
                null, // properties
                definitionType, // build type
                totalHistogramsToShow // top count.
                );
        }

    /**
     * For unit test purpose only. Getter method that protect to set value even in UT.
     * @returns {}
     */
    public _getArtifactName(): string {
        return this.artifactName;
    }
}

// register control as an enhancement to allow the contribution model to associate it with the widget host.
SDK.registerContent("dashboards.buildChart-init", (context) => {
    return Controls.create(BuildChartControl, context.$container, context.options);
});

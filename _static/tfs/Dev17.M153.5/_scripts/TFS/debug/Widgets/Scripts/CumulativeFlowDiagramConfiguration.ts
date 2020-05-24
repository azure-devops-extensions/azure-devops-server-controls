import * as Q from "q";

import * as AgileResources from "Agile/Scripts/Resources/TFS.Resources.AgileControls";
import { ErrorParser } from "Analytics/Scripts/AnalyticsExceptionUtilities";
import { DateSKParser } from "Analytics/Scripts/DateSKParser";

import { WidgetConfigurationOptions } from "Dashboards/Scripts/Contracts";
import { Selector, SelectorControl } from "Dashboards/Scripts/Selector";
import { SettingsField, SettingsFieldOptions } from "Dashboards/Scripts/SettingsField";

import * as WidgetContracts from "TFS/Dashboards/WidgetContracts";
import * as WidgetHelpers from "TFS/Dashboards/WidgetHelpers";

import * as Controls from "VSS/Controls";
import * as Combos from "VSS/Controls/Combos";
import * as SDK from "VSS/SDK/Shim";
import { DelayedFunction } from "VSS/Utils/Core";
import * as CultureUtils from "VSS/Utils/Culture";
import * as DateUtils from "VSS/Utils/Date";
import * as StringUtils from "VSS/Utils/String";

import * as AnalyticsPickers from "Widgets/Scripts/Shared/AnalyticsPickers";
import * as TimeZoneUtils from "Widgets/Scripts/Shared/TimeZoneUtilities";
import { CumulativeFlowDiagramSettings, CumulativeFlowHistoryOptions, TimePeriodFieldIdentifiers } from "Widgets/Scripts/CumulativeFlowDiagramContracts";
import { CumulativeFlowDiagram } from "Widgets/Scripts/CumulativeFlowDiagram";
import { PlaceholderBoardUnsupportedError } from "Widgets/Scripts/CumulativeFlowDiagramErrors";
import * as WidgetResources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";
import { ChartColorPalettes } from "Widgets/Scripts/Shared/ChartColorPalettes";
import { Checkbox, CheckboxOptions } from "Widgets/Scripts/Shared/Checkbox";
import * as WidgetLiveTitle from "Widgets/Scripts/Shared/WidgetLiveTitle";
import { BaseWidgetConfiguration } from "Widgets/Scripts/VSS.Control.BaseWidgetConfiguration";
import { WidgetTelemetry } from "Widgets/Scripts/VSS.Widget.Telemetry";
import { TimePeriodPicker, RollingPeriodOptions, RollingPeriod, StartDatePickerOptions, StartDatePicker} from "Widgets/Scripts/Shared/TimePickers";
import { Board, LaneIdentity} from "Widgets/Scripts/DataServices/Legacy/AnalyticsChartingClient";
import { TeamIdentity } from "Analytics/Scripts/CommonClientTypes";


export class CumulativeFlowDiagramConfiguration
    extends BaseWidgetConfiguration<WidgetConfigurationOptions>
    implements WidgetContracts.IWidgetConfiguration {

    public static readonly featureName: string = "CumulativeFlowDiagramConfiguration";
    public static readonly learnLink: string = "https://go.microsoft.com/fwlink/?LinkID=724313";
    public static readonly includeFirstColumnCheckboxElementId: string = "include-first-column";
    public static readonly notifyThrottleMs: number = 750;

    private teamSettingsField: SettingsField<AnalyticsPickers.TeamPicker>;
    private boardSettingsField: SettingsField<AnalyticsPickers.BoardPicker>;
    private swimlaneSettingsField: SettingsField<AnalyticsPickers.SwimlanePicker>;
    private timePeriodSelector: TimePeriodPicker;
    private rollingPeriodSettingsField: SettingsField<RollingPeriod>;
    private startDateSettingsField: SettingsField<StartDatePicker>;
    private firstColumnCheckbox: Checkbox;
    private themeSettingsField: SettingsField<ThemePicker>;

    private liveTitleState: WidgetLiveTitle.WidgetLiveTitleEditor;
    private widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext;

    private delayedNotify: DelayedFunction;
    private latestNotifyArgs: WidgetContracts.EventArgs<WidgetContracts.CustomSettings>;

    private onSaveTelemetryPacket: IDictionaryStringTo<string | number | boolean>;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "cumulative-flow-diagram-configuration"
        }, options));
    }

    public load(widgetSettings: WidgetContracts.WidgetSettings,
        widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext)
        : IPromise<WidgetContracts.WidgetStatus> {

        var reconfiguring = widgetSettings.customSettings.data != null;
        this.onSaveTelemetryPacket = {
            "IsReconfiguration": reconfiguring
        };

        var load = () => {
            var initialSettings: CumulativeFlowDiagramSettings = JSON.parse(widgetSettings.customSettings.data);
            this.widgetConfigurationContext = widgetConfigurationContext;

            this.delayedNotify = new DelayedFunction(this,
                CumulativeFlowDiagramConfiguration.notifyThrottleMs,
                "notifySettings",
                this.notifySettings);

            this.createSettingsFieldsAndRender();

            // Populate the settings fields with data and set the initial selections
            return this.populateDataAndSetSelections(initialSettings)
                .then(() => WidgetHelpers.WidgetStatusHelper.Success(),
                    e => WidgetHelpers.WidgetStatusHelper.Failure(ErrorParser.stringifyODataError(e), true));
        };

        return WidgetTelemetry.executeAndTimeAsync(CumulativeFlowDiagramConfiguration.featureName, "load", load, {
            "IsReconfiguration": reconfiguring
        });
    }

    private static packWidgetCustomSettings(settings: CumulativeFlowDiagramSettings): WidgetContracts.CustomSettings {
        return {
            data: JSON.stringify(settings)
            // Currently no version
        };
    }

    /**
     * Constructs the calculated widget title from the provided values.
     * Team name + Board name + "Backlog Cumulative Flow Diagram (" + Swimlane name + ")".
     * @param teamName - The name of the selected team
     * @param boardName - The name of the selected board
     * @param swimlaneName - The name of the selected swimlane
     * @returns The calculated widget title.
     */
    private static calculateWidgetTitle(teamName: string, boardName: string, swimlaneName?: string): string {
        var title: string;

        if (swimlaneName) {
            title = StringUtils.format(WidgetResources.CumulativeFlowDiagram_TitleWithSwimlaneFormat,
                teamName,
                boardName,
                swimlaneName);
        } else {
            title = StringUtils.format(WidgetResources.CumulativeFlowDiagram_TitleWithoutSwimlaneFormat,
                teamName,
                boardName);
        }

        return title;
    }

    /**
     * Creates the config controls, wraps them in settings fields, and renders them.
     */
    private createSettingsFieldsAndRender(): void {
        var $container = this.getElement();

        this.teamSettingsField = CFDConfigFieldFactory.createTeamSettingsField(
            () => this.onTeamChange(true),
            $container);
        this.boardSettingsField = CFDConfigFieldFactory.createBoardSettingsField(
            () => this.onBoardChange(true),
            $container);
        this.swimlaneSettingsField = CFDConfigFieldFactory.createSwimlaneSettingsField(
            () => this.onSwimlaneChange(true),
            $container);

        var cultureDateTimeFormat = CultureUtils.getDateTimeFormat();
        this.rollingPeriodSettingsField = CFDConfigFieldFactory.createRollingPeriodSettingsField(
            () => this.onRollingPeriodChange(),
            null,
            cultureDateTimeFormat.ShortDatePattern
        );
        var startDatePicker = StartDatePicker.create(StartDatePicker, null, {
            onChange: () => this.onStartDateChange(),
            maxDays: CumulativeFlowDiagram.maxAllowedTimePeriodDays,
            minDays: CumulativeFlowDiagram.minAllowedTimePeriodDays,
            datePattern: cultureDateTimeFormat.ShortDatePattern,
            defaultStartDateDaysOffset: CumulativeFlowDiagram.defaultTimePeriodDays
        });
        this.startDateSettingsField = SettingsField.createSettingsField({
            control: startDatePicker,
            hasErrorField: true,
            labelText: WidgetResources.StartDatePicker_StartDate
        }, $container);

        var timePeriodDictionary: IDictionaryStringTo<SettingsField<SelectorControl>> = {};
        timePeriodDictionary[TimePeriodFieldIdentifiers.RollingPeriod] = this.rollingPeriodSettingsField;
        timePeriodDictionary[TimePeriodFieldIdentifiers.StartDate] = this.startDateSettingsField;
        this.timePeriodSelector = TimePeriodPicker.create(TimePeriodPicker, $container, {
            settingsFields: timePeriodDictionary,
            labelText: WidgetResources.CumulativeFlowDiagram_TimePeriodLabel,
            onChange: (identifier, field) => {
                if (identifier === TimePeriodFieldIdentifiers.RollingPeriod) {
                    this.onRollingPeriodChange();
                } else {
                    this.onStartDateChange();
                }
            },
            radioButtonGroupName: "time-period"
        });

        this.firstColumnCheckbox = new Checkbox(
            $container, {
                headerText: WidgetResources.CumulativeFlowDiagram_ColumnOptionsLabel,
                checkboxId: CumulativeFlowDiagramConfiguration.includeFirstColumnCheckboxElementId,
                checkboxLabel: WidgetResources.CumulativeFlowDiagram_IncludeFirstColumnLabel,
                onChange: () => {
                    this.packNotifyArgs();
                    this.notifySettings(); // Since we cache results and always pull down the first column data we can just notify
                }
            });

        this.themeSettingsField = CFDConfigFieldFactory.createThemeSettingsField(
            () => {
                this.packNotifyArgs();
                this.notifySettings(); // Theme reload is fast, so just notify instead of using timer
            },
            $container);

        this.createLearnAboutLink($container);
    }

    private createLearnAboutLink($container: JQuery) {
        let $link = $("<a>")
            .attr("href", CumulativeFlowDiagramConfiguration.learnLink)
            .attr("target", "_blank") // Open in new tab
            .text(WidgetResources.CumulativeFlowDiagram_LearnLink);

        let $externalIcon = $("<span>")
            .addClass("bowtie-icon")
            .addClass("bowtie-navigate-external")
            .attr("title", WidgetResources.CumulativeFlowDiagram_LearnLink);

        let $linkContainer = $("<p>")
            .addClass("bowtie")
            .append($link)
            .append($externalIcon);

        $container.append($linkContainer);
    }

    /**
     * 1) Initializes live title state.
     * 2) Populates theme selector
     * 3) Sets the selection for the theme selector.
     * 4) Populates and sets fetched-data fields.
     *    a) Fetches teams and populates the team selector with that data.
     *    b) Sets the selected team which fires an onChange event which starts a chain of changes.
     *    c) The changes triggered by step 4b populate the other fetched-data selectors and set the selections.
     *    d) Notifies the widget of the selections if there were no problems in previous steps.
     * @returns A promise that resolves once all steps are completed
     */
    private populateDataAndSetSelections(settings?: CumulativeFlowDiagramSettings): IPromise<void> {
        var projectId = this.tfsContext.project.id;

        this.liveTitleState = WidgetLiveTitle.WidgetLiveTitleEditor.fromSettings(settings,
            WidgetResources.CumulativeFlowDiagram_DefaultWidgetName);

        this.setSelectedTheme(settings);
        this.setRollingPeriod(settings);
        this.setStartDate(settings);
        this.setFirstColumnCheckbox(settings);

        this.teamSettingsField.toggleControlBusyOverlay(true);
        this.boardSettingsField.toggleControlBusyOverlay(true);
        this.swimlaneSettingsField.toggleControlBusyOverlay(true);
        return this.teamSettingsField.getControl().setContext(projectId)
            .then(() => {
                this.teamSettingsField.toggleControlBusyOverlay(false);
                return this.setSelectedTeam(settings);
            }, e => {
                this.teamSettingsField.toggleControlBusyOverlay(false);
                this.boardSettingsField.toggleControlBusyOverlay(false);
                this.swimlaneSettingsField.toggleControlBusyOverlay(false);
                return Q.reject(e);
            })
            .then(() => {
                if (settings != null) {
                    this.liveTitleState.updateTitleOnLatestArtifact(
                        this.configureName,
                        this.getCalculatedWidgetTitle(settings.chartDataSettings));
                }
            });
    }

    private setSelectedTeam(settings?: CumulativeFlowDiagramSettings): IPromise<void> {
        var promise: IPromise<void> = Q();

        var teamPicker = this.teamSettingsField.getControl();
        if (settings && settings.chartDataSettings && settings.chartDataSettings.team) {
            // Select team from settings
            var teamWasSet = teamPicker.setSelectedByPredicate(
                team => team.TeamId === settings.chartDataSettings.team,
                false);

            if (teamWasSet) {
                promise = this.onTeamChange(false, settings); // Don't notify when we're loading from settings
            } else {
                this.teamSettingsField.showError(WidgetResources.CumulativeFlowDiagram_PreviouslySelectedTeamNotFoundError);

                this.boardSettingsField.toggleControlBusyOverlay(false);
                this.swimlaneSettingsField.toggleControlBusyOverlay(false);

                WidgetTelemetry.onConfigurationFailureToAutoPopulateField(this.getWidgetTypeId(),
                    teamPicker.getName(),
                    "SavedSetting");
            }
        } else {
            // Select default team value
            var teamWasSet = teamPicker.setSelectedByPredicate(
                team => team.TeamId === this.teamContext.id,
                false);

            if (!teamWasSet) {
                WidgetTelemetry.onConfigurationFailureToAutoPopulateField(this.getWidgetTypeId(),
                    teamPicker.getName(),
                    "SmartDefault");
            }

            // Calling setSelectedByPredicate(<func>, true) doesn't call the onChange handler for the control
            // if the value of the selected item doesn't change. We always want the onChange handler to be
            // called to propogate changes to other fields so we call the onChange handler ourselves.
            promise = this.onTeamChange(true); // We notify here because Team is the top level selector
        }

        return promise;
    }

    /**
     * Finds the board level of the lowest level board.
     * NOTE: Kind of confusing, but the lowest level board has the highest level number.
     * For example,
     *     Epics: 0
     *     Features: 1
     *     User Stories: 2
     * User Stories is the lowest level board because Features contain User Stories and Epics contain Features, but
     * User Stories has the largest board level number.
     */
    private getLevelOfLowestLevelBoard(): number {
        var maxBoardLevel: number;
        this.boardSettingsField.getControl().firstOrDefault((board, i, boards) => {
            // Get max board level
            if (maxBoardLevel == null) {
                var boardLevels = boards.map(b => b.BoardLevel);
                maxBoardLevel = Math.max.apply(null, boardLevels); // Spread operator (ES6) isn't supported in IE
            }

            return true; // We're not actually searching for a board so exit as soon as possible
        });

        return maxBoardLevel;
    }

    private setSelectedBoard(settings?: CumulativeFlowDiagramSettings): IPromise<void> {
        var promise: IPromise<void> = Q();

        var boardPicker = this.boardSettingsField.getControl();
        if (settings && settings.chartDataSettings && settings.chartDataSettings.board) {
            var boardWasSet = boardPicker.setSelectedByPredicate(
                board => board.BoardId === settings.chartDataSettings.board,
                false);

            if (boardWasSet) {
                promise = this.onBoardChange(false, settings);
            } else {
                this.boardSettingsField.showError(WidgetResources.CumulativeFlowDiagram_PreviouslySelectedBoardNotFoundError);

                this.swimlaneSettingsField.toggleControlBusyOverlay(false);

                WidgetTelemetry.onConfigurationFailureToAutoPopulateField(this.getWidgetTypeId(),
                    boardPicker.getName(),
                    "SavedSetting");
            }
        } else {
            // Try to keep current selection before attempting to select default
            if (boardPicker.getValue() == null) {
                // Select the lowest level board.
                var minBoardLevel = this.getLevelOfLowestLevelBoard();
                var wasSet = boardPicker.setSelectedByPredicate(b => b.BoardLevel === minBoardLevel);

                if (!wasSet) {
                    WidgetTelemetry.onConfigurationFailureToAutoPopulateField(this.getWidgetTypeId(),
                        boardPicker.getName(),
                        "SmartDefault");
                }
            }

            // Calling setSelectedIndex(<number>, true) doesn't call the onChange handler for the control
            // if the value of the selected item doesn't change. We always want the onChange handler to be
            // called to propogate changes to other fields so we call the onChange handler ourselves.
            promise = this.onBoardChange(false);
        }

        return promise;
    }

    private setSelectedSwimlane(settings?: CumulativeFlowDiagramSettings): IPromise<void> {
        var promise: IPromise<void> = Q(null);

        var swimlanePicker = this.swimlaneSettingsField.getControl();
        if (settings && settings.chartDataSettings && settings.chartDataSettings.boardLane) {
            var swimlaneWasSet = swimlanePicker.setSelectedByPredicate(
                swimlane => swimlane.LaneName === settings.chartDataSettings.boardLane,
                false);

            if (swimlaneWasSet) {
                promise = this.onSwimlaneChange(false, settings);
            } else {
                this.swimlaneSettingsField.showError(WidgetResources.CumulativeFlowDiagram_PreviouslySelectedSwimlaneNotFoundError);
                WidgetTelemetry.onConfigurationFailureToAutoPopulateField(this.getWidgetTypeId(),
                    swimlanePicker.getName(),
                    "SavedSetting");
            }
        } else {
            // Try to keep current selection before attempting to select default
            if (swimlanePicker.getValue() == null) {
                var wasSet = swimlanePicker.setSelectedByPredicate(
                    swimlane => swimlane === AnalyticsPickers.SwimlanePicker.AllOption,
                    false);

                if (!wasSet) {
                    WidgetTelemetry.onConfigurationFailureToAutoPopulateField(this.getWidgetTypeId(),
                        swimlanePicker.getName(),
                        "SmartDefault");
                }
            }

            // Calling setSelectedByPredicate(<func>, true) doesn't call the onChange handler for the control
            // if the value of the selected item doesn't change. We always want the onChange handler to be
            // called to propogate changes to other fields so we call the onChange handler ourselves.
            promise = this.onSwimlaneChange(false);
        }

        return promise;
    }

    private setRollingPeriod(settings?: CumulativeFlowDiagramSettings) {
        var rollingPeriod: number;
        var rollingPeriodPicker = this.rollingPeriodSettingsField.getControl();
        if (settings && settings.chartDataSettings && settings.chartDataSettings.timePeriod) {
            if (settings.chartDataSettings.timePeriod.identifier === TimePeriodFieldIdentifiers.RollingPeriod) {
                rollingPeriod = <number>settings.chartDataSettings.timePeriod.settings;
                this.timePeriodSelector.selectField(TimePeriodFieldIdentifiers.RollingPeriod, false);
            } else {
                var startDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(<string>settings.chartDataSettings.timePeriod.settings);
                rollingPeriod = DateUtils.daysBetweenDates(startDate, TimeZoneUtils.getTodayInAccountTimeZone(), true);
            }

            rollingPeriodPicker.setDays(rollingPeriod, false);
        }
    }

    private setStartDate(settings?: CumulativeFlowDiagramSettings) {
        let startDatePicker = this.startDateSettingsField.getControl();
        if (settings && settings.chartDataSettings && settings.chartDataSettings.timePeriod) {
            if (settings.chartDataSettings.timePeriod.identifier === TimePeriodFieldIdentifiers.StartDate) {
                let startDate = <string>settings.chartDataSettings.timePeriod.settings;
                startDatePicker.setDate(startDate, false);
                this.timePeriodSelector.selectField(TimePeriodFieldIdentifiers.StartDate, false);

                // We validate immediately because a previously saved valid value may no longer be valid if enough
                // time has passed that the start date is now more than the max allowed number of days in the past.
                var errMessage = startDatePicker.validate();
                if (errMessage != null) {
                    this.startDateSettingsField.showError(errMessage);
                }
            } else {
                let startDate = DateUtils.addDays(TimeZoneUtils.getTodayInAccountTimeZone(), -<number>settings.chartDataSettings.timePeriod.settings, true /* Adjust DST Offset*/);
                startDatePicker.setDate(startDate, false);
            }
        }
    }

    private setFirstColumnCheckbox(settings?: CumulativeFlowDiagramSettings) {
        if (settings && settings.chartDataSettings && settings.chartDataSettings.includeFirstBoardColumn) {
            this.firstColumnCheckbox.setChecked(settings.chartDataSettings.includeFirstBoardColumn, false);
        }
    }

    private setSelectedTheme(settings?: CumulativeFlowDiagramSettings) {
        if (settings && settings.themeName) {
            this.themeSettingsField.getControl().setText(settings.themeName, false);
        } else {
            this.themeSettingsField.getControl().setSelectedIndex(0, false);
        }
    }

    /**
     * Called when the value of the team selector changes.
     * Propogates changes to other selectors and notifies the widget about the changes once the other selectors have finished setting their data.
     * @param notifyChanges - Whether or not this change should notify the widget about changes after propogation
     * @returns A promise that resolves when all propogated changes triggered by this change are completed
     */
    private onTeamChange(notifyChanges: boolean, settings?: CumulativeFlowDiagramSettings): IPromise<void> {
        this.teamSettingsField.hideError();

        var errMessage = this.teamSettingsField.getControl().validate();
        if (errMessage == null) {
            var selectedTeam = this.teamSettingsField.getControl().getValue();

            this.boardSettingsField.toggleControlBusyOverlay(true);
            this.swimlaneSettingsField.toggleControlBusyOverlay(true);
            return this.boardSettingsField.getControl().setContext(this.tfsContext.project.id, selectedTeam.TeamId)
                .then(() => {
                    this.boardSettingsField.toggleControlBusyOverlay(false);
                    return this.setSelectedBoard(settings);
                }, e => {
                    this.boardSettingsField.toggleControlBusyOverlay(false);
                    this.swimlaneSettingsField.toggleControlBusyOverlay(false);
                    return Q.reject(e);
                })
                .then(() => {
                    if (notifyChanges) {
                        this.packNotifyArgs();
                        this.delayedNotify.reset();
                    }
                });
        } else {
            this.teamSettingsField.showError(errMessage);

            this.boardSettingsField.toggleControlBusyOverlay(false);
            this.swimlaneSettingsField.toggleControlBusyOverlay(false);

            // We only reject if populating dependent fields fails
            // so we don't show field specific errors in the general error section.
            return Q(null);
        }
    }

    /**
     * Called when the value of the board selector changes.
     * Propogates changes to other selectors.
     * @param notifyChanges - Whether this change was the root trigger of a series of propogated changes and should notify the widget about changes
     * @returns A promise that resolves when all propogated changes triggered by this change are completed
     */
    private onBoardChange(notifyChanges: boolean, settings?: CumulativeFlowDiagramSettings): IPromise<void> {
        this.boardSettingsField.hideError();

        var errMessage = this.boardSettingsField.getControl().validate();
        if (errMessage == null) {
            var selectedBoard = this.boardSettingsField.getControl().getValue();

            this.swimlaneSettingsField.toggleControlBusyOverlay(true);
            return this.swimlaneSettingsField.getControl().setContext(this.tfsContext.project.id, selectedBoard.BoardId)
                .then(() => {
                    this.swimlaneSettingsField.toggleControlBusyOverlay(false);
                    return this.setSelectedSwimlane(settings);
                }, e => {
                    this.swimlaneSettingsField.toggleControlBusyOverlay(false);
                    return Q.reject(e);
                })
                .then(() => {
                    if (notifyChanges) {
                        this.packNotifyArgs();
                        this.delayedNotify.reset();
                    }
                });
        } else {
            this.boardSettingsField.showError(errMessage);

            this.swimlaneSettingsField.toggleControlBusyOverlay(false);

            // We only reject if populating dependent fields fails
            // so we don't show field specific errors in the general error section.
            return Q(null);
        }
    }

    /**
     * Called when the value of the swimlane selector changes.
     * Propogates changes to other selectors.
     * @param notifyChanges - Whether this change was the root trigger of a series of propogated changes and should notify the widget about changes
     * @returns A promise that resolves when all propogated changes triggered by this change are completed
     */
    private onSwimlaneChange(notifyChanges: boolean, settings?: CumulativeFlowDiagramSettings): IPromise<void> {
        this.swimlaneSettingsField.hideError();

        var errMessage = this.swimlaneSettingsField.getControl().validate();
        if (errMessage == null) {
            var selectedSwimlane = this.swimlaneSettingsField.getControl().getValue();
            var allOrDefaultIsSelected = selectedSwimlane === AnalyticsPickers.SwimlanePicker.AllOption || selectedSwimlane.IsDefaultLane;
            this.firstColumnCheckbox.setEnabled(allOrDefaultIsSelected);

            if (notifyChanges) {
                this.packNotifyArgs();
                this.delayedNotify.reset();
            }
        } else {
            this.swimlaneSettingsField.showError(errMessage);
        }

        return Q(null);
    }

    private onRollingPeriodChange(): void {
        this.rollingPeriodSettingsField.hideError();
        var rollingPeriodPicker = this.rollingPeriodSettingsField.getControl();

        var errMessage = rollingPeriodPicker.validate();
        if (errMessage == null) {
            // Update start date picker to match
            var startDate = DateUtils.addDays(TimeZoneUtils.getTodayInAccountTimeZone(), -rollingPeriodPicker.getSettings(), true /* Adjust DST Offset */);
            var startDatePicker = this.startDateSettingsField.getControl();
            startDatePicker.setDate(startDate, false);

            this.packNotifyArgs();
            this.delayedNotify.reset();
        } else {
            this.rollingPeriodSettingsField.showError(errMessage);
        }
    }

    private onStartDateChange(): void {
        this.startDateSettingsField.hideError();
        var startDatePicker = this.startDateSettingsField.getControl();

        var errMessage = startDatePicker.validate();
        if (errMessage == null) {
            // Update rolling period to match
            var startDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(startDatePicker.getSettings());
            var daysBetween = DateUtils.daysBetweenDates(startDate, TimeZoneUtils.getTodayInAccountTimeZone(), true);
            this.rollingPeriodSettingsField.getControl().setDays(daysBetween, false);

            this.packNotifyArgs();
            this.delayedNotify.reset();
        } else {
            this.startDateSettingsField.showError(errMessage);
        }
    }

    /**
     * Uses the provided settings to look up the names of the settings properties
     * in their associated fields and calculates a widget title.
     * @param settings - The settings to use for calculating a widget title
     * @returns The calculated widget title.
     */
    private getCalculatedWidgetTitle(settings: CumulativeFlowHistoryOptions): string {
        var selectedTeam = this.teamSettingsField.getControl().firstOrDefault(o => settings.team === o.TeamId);
        var teamName = (selectedTeam != null) ? selectedTeam.TeamName : "";

        var selectedBoard = this.boardSettingsField.getControl().firstOrDefault(o => settings.board === o.BoardId);
        var boardName = (selectedBoard != null) ? selectedBoard.BoardName : "";

        var swimlaneName = "";
        if (settings.boardLane != null) { // Don't include "All" in title
            var selectedSwimlane = this.swimlaneSettingsField.getControl().firstOrDefault(o => settings.boardLane === o.LaneName);
            if (selectedSwimlane != null) {
                if (selectedSwimlane.IsDefaultLane && selectedSwimlane.LaneName === AnalyticsPickers.SwimlanePicker.AnalyticsUnnamedDefaultSwimlaneName) {
                    // Replace unnamed default with localized text
                    swimlaneName = AgileResources.Swimlane_Settings_DefaultLaneName;
                    // Strip "(" and ")" from the string
                    swimlaneName = swimlaneName.replace(/^\(|\)$/g, "");
                } else {
                    swimlaneName = selectedSwimlane.LaneName;
                }
            }
        }

        return CumulativeFlowDiagramConfiguration.calculateWidgetTitle(teamName, boardName, swimlaneName);
    }

    /**
     * Compiles the values of the controls/selectors representing the current settings
     * @returns The current configuration
     */
    private getSettings(): CumulativeFlowDiagramSettings {
        // Construct settings object
        var currentSettings = {
            chartDataSettings: this.getChartDataSettings(),
            themeName: this.themeSettingsField.getControl().getSettings()
        };

        // Add live title information
        this.liveTitleState.appendToSettings(currentSettings as WidgetLiveTitle.ITrackName);

        return currentSettings;
    }

    private getChartDataSettings(): CumulativeFlowHistoryOptions {
        var chartDataSettings = <CumulativeFlowHistoryOptions>{
            project: this.tfsContext.project.id
        };

        // Team
        var selectedTeam = this.teamSettingsField.getControl().getValue() as TeamIdentity;
        if (selectedTeam != null) {
            chartDataSettings.team = selectedTeam.TeamId;
        }

        // Board
        var selectedBoard = this.boardSettingsField.getControl().getValue() as Board;
        if (selectedBoard != null) {
            chartDataSettings.board = selectedBoard.BoardId;
        }

        // Swimlane
        var selectedSwimlane = this.swimlaneSettingsField.getControl().getValue() as LaneIdentity;
        if (selectedSwimlane != null) {
            if (selectedSwimlane === AnalyticsPickers.SwimlanePicker.AllOption) {
                chartDataSettings.boardLane = null;
            } else {
                chartDataSettings.boardLane = selectedSwimlane.LaneName;
            }
        }

        // Time period
        var timePeriod = this.timePeriodSelector.getSettings();
        if (timePeriod != null) {
            chartDataSettings.timePeriod = timePeriod;
        }

        // First column
        chartDataSettings.includeFirstBoardColumn = this.firstColumnCheckbox.getSettings();

        return chartDataSettings;
    }

    /**
     * Validates the controls/selectors and displays any errors.
     * @returns True if the config is valid. False otherwise.
     */
    private isValid(): boolean {
        if (this.teamSettingsField.getControl().validate() != null) {
            return false; // Return early to avoid validating dependent fields
        }

        if (this.boardSettingsField.getControl().validate() != null) {
            return false; // Return early to avoid validating dependent fields
        }

        if (this.swimlaneSettingsField.getControl().validate() != null) {
            return false; // Return early to avoid validating dependent fields
        }

        if (this.timePeriodSelector.validate() != null) {
            return false;
        }

        return true;
    }

    /**
     * Called when settings are changed in the config.
     * Updates live title and prepares the current config settings for being notified to the widget.
     */
    private packNotifyArgs(): void {
        if (this.isValid()) {
            var settings = this.getSettings();

            this.liveTitleState.updateTitleOnLatestArtifact(this.configureName, this.getCalculatedWidgetTitle(settings.chartDataSettings));

            var customSettings = CumulativeFlowDiagramConfiguration.packWidgetCustomSettings(settings);
            this.latestNotifyArgs = WidgetHelpers.WidgetEvent.Args(customSettings);
        }
    }

    /**
     * Notifies the widget of a config change with the latest packed widget event args.
     */
    private notifySettings(): void {
        if (this.latestNotifyArgs != null) {
            this.widgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, this.latestNotifyArgs);
        }
    }

    private packAdditionalOnSaveTelemetry(cfdSettings: CumulativeFlowDiagramSettings): void {
        var selectedBoard = this.boardSettingsField.getControl().firstOrDefault(b => b.BoardId === cfdSettings.chartDataSettings.board);
        this.onSaveTelemetryPacket["BacklogLevel"] = selectedBoard.BoardLevel;

        this.onSaveTelemetryPacket[cfdSettings.chartDataSettings.timePeriod.identifier] = cfdSettings.chartDataSettings.timePeriod.settings;

        this.onSaveTelemetryPacket["IncludeFirstColumn"] = cfdSettings.chartDataSettings.includeFirstBoardColumn;

        this.onSaveTelemetryPacket["Theme"] = cfdSettings.themeName;

        this.onSaveTelemetryPacket["TeamDefaultUsed"] = cfdSettings.chartDataSettings.team === this.teamContext.id;

        var minBoardLevel = this.getLevelOfLowestLevelBoard();
        this.onSaveTelemetryPacket["BacklogDefaultUsed"] = selectedBoard.BoardLevel === minBoardLevel;

        this.onSaveTelemetryPacket["SwimlaneDefaultUsed"] = !cfdSettings.chartDataSettings.boardLane; // null/undefined/empty string is the default
    }

    /**
     * Called when the user clicks the save button in the config blade.
     * @returns A promise that resolves with the latest settings.
     */
    public onSave(): IPromise<WidgetContracts.SaveStatus> {
        if (this.isValid()) {
            var cfdSettings = this.getSettings();
            this.packAdditionalOnSaveTelemetry(cfdSettings);
            var customSettings = CumulativeFlowDiagramConfiguration.packWidgetCustomSettings(cfdSettings);
            return WidgetHelpers.WidgetConfigurationSave.Valid(customSettings);
        } else {
            return WidgetHelpers.WidgetConfigurationSave.Invalid();
        }
    }

    /**
     * Called after user clicks the save button in the config blade if the status returned by onSave was valid.
     */
    public onSaveComplete(): void {
        WidgetTelemetry.onConfigurationSave(this.getWidgetTypeId(), this.onSaveTelemetryPacket);
    }
}

SDK.VSS.register("dashboards.cumulativeFlowDiagramConfiguration", () => CumulativeFlowDiagramConfiguration);
SDK.registerContent("dashboards.cumulativeFlowDiagramConfiguration-init", (context) => {
    return Controls.create(CumulativeFlowDiagramConfiguration, context.$container, context.options);
});

export class CFDConfigFieldFactory {
    private static createSettingsField<T extends SelectorControl>(options: SettingsFieldOptions<T>, $container?: JQuery): SettingsField<T> {
        return SettingsField.createSettingsField(<SettingsFieldOptions<T>>$.extend({
            labelAlign: "top",
            hasErrorField: true,
        }, options), $container);
    }

    /**
     * Creates an unparented rolling period selector.
     * @returns A rolling period selector.
     */
    private static createRollingPeriodPicker(onChange: () => void, datePattern: string): RollingPeriod {
        return RollingPeriod.create(RollingPeriod,
            null, {
                onChange: onChange,
                datePattern: datePattern,
                maxDays: CumulativeFlowDiagram.maxAllowedTimePeriodDays,
                minDays: CumulativeFlowDiagram.minAllowedTimePeriodDays,
                defaultTimePeriodDays: CumulativeFlowDiagram.defaultTimePeriodDays
            });
    }

    /**
     * Creates an unparented settings field with team selector control
     * @param onChange - A handler that gets called when the change event of the control is fired
     * @returns A settings field with team selector
     */
    public static createTeamSettingsField(onChange: () => void, $container?: JQuery): SettingsField<AnalyticsPickers.TeamPicker> {
        var control = AnalyticsPickers.TeamPicker.createInstance(null, {
            change: onChange
        });

        return this.createSettingsField({
            control: control,
            labelText: WidgetResources.CumulativeFlowDiagram_TeamLabel
        }, $container);
    }

    /**
     * Creates an unparented settings field with board selector control
     * @param onChange - A handler that gets called when the change event of the control is fired
     * @returns A settings field with board selector
     */
    public static createBoardSettingsField(onChange: () => void, $container: JQuery): SettingsField<AnalyticsPickers.BoardPicker> {
        var control = AnalyticsPickers.BoardPicker.createInstance(null, {
            change: onChange
        });

        return this.createSettingsField({
            control: control,
            labelText: WidgetResources.CumulativeFlowDiagram_BoardLabel
        }, $container);
    }

    /**
     * Creates an unparented settings field with swimlane selector control
     * @param onChange - A handler that gets called when the change event of the control is fired
     * @returns A settings field with swimlane selector
     */
    public static createSwimlaneSettingsField(onChange: () => void, $container: JQuery): SettingsField<AnalyticsPickers.SwimlanePicker> {
        var control = AnalyticsPickers.SwimlanePicker.createInstance(null, {
            enhanceDefaultSwimlaneDisplayName: true,
            includeAllOption: true,
            change: onChange
        });

        return this.createSettingsField({
            control: control,
            labelText: WidgetResources.CumulativeFlowDiagram_SwimlaneLabel,
            toolTipText: WidgetResources.CumulativeFlowDiagram_SwimlaneBadge
        }, $container);
    }

    /**
     * Creates an unparented settings field with theme selector control
     * @param onChange - A handler that gets called when the change event of the control is fired
     * @returns A settings field with theme selector
     */
    public static createThemeSettingsField(onChange: () => void, $container: JQuery): SettingsField<ThemePicker> {
        var control = ThemePicker.create(ThemePicker,
            null, {
                change: onChange
            });

        return this.createSettingsField({
            labelText: WidgetResources.CumulativeFlowDiagram_ChartColorLabel,
            hasErrorField: false,
            control: control,
        }, $container);
    }

    public static createRollingPeriodSettingsField(onChange: () => void, $container: JQuery, datePattern: string): SettingsField<RollingPeriod> {
        return this.createSettingsField({
            control: this.createRollingPeriodPicker(onChange, datePattern),
            labelText: WidgetResources.RollingPeriod_DaysPrompt
        }, $container);
    }
}


export class ThemePicker extends Combos.Combo implements Selector {
    public initialize(): void {
        super.initialize();

        var palettes = ChartColorPalettes.getInstance();
        this.setSource(palettes.getLocalizedPaletteNames());
    }

    public initializeOptions(options: Combos.IComboOptions) {
        super.initializeOptions($.extend(options, {
            cssClass: "theme-picker",
            mode: "drop",
            allowEdit: false
        }));
    }

    public getSettings() {
        // Map the invariant palette name to use when saving settings.
        var colorPalettes = ChartColorPalettes.getInstance();
        var localizedPaletteName = this.getValue<string>();
        return colorPalettes.getInvariantNameFromLocalizedName(localizedPaletteName);
    }

    public validate(): string { return null; }
}

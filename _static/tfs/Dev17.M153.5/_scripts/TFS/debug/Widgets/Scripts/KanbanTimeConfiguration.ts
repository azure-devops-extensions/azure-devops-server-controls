import * as Q from "q";

import { DateSKParser } from "Analytics/Scripts/DateSKParser";
import { ErrorParser } from "Analytics/Scripts/AnalyticsExceptionUtilities";

import { WidgetConfigurationOptions } from "Dashboards/Scripts/Contracts";
import {SettingsField, SettingsFieldOptions} from "Dashboards/Scripts/SettingsField";

import * as WidgetContracts from "TFS/Dashboards/WidgetContracts";
import * as WidgetHelpers from "TFS/Dashboards/WidgetHelpers";

import * as Controls from "VSS/Controls";
import * as SDK from "VSS/SDK/Shim";
import { DelayedFunction } from "VSS/Utils/Core";

import { TeamPicker } from "Widgets/Scripts/Shared/AnalyticsPickers";
import { Selector, SelectorControl } from "Dashboards/Scripts/Selector";
import { BaseWidgetConfiguration } from "Widgets/Scripts/VSS.Control.BaseWidgetConfiguration";
import { WidgetTelemetry } from "Widgets/Scripts/VSS.Widget.Telemetry";
import { KanbanTimeSettings, KanbanTimeDataSettings, TimePeriodFieldIdentifiers } from "Widgets/Scripts/KanbanTimeContracts";
import * as WidgetResources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";
import { TimePeriodPicker, RollingPeriodOptions, RollingPeriod, StartDatePickerOptions, StartDatePicker } from "Widgets/Scripts/Shared/TimePickers";
import { WITSelector, WorkItemTypeFilterMode } from "Widgets/Scripts/Shared/WorkItemTypePicker";
import * as WidgetLiveTitle from "Widgets/Scripts/Shared/WidgetLiveTitle";
import * as CultureUtils from "VSS/Utils/Culture";
import * as DateUtils from "VSS/Utils/Date";
import * as TimeZoneUtils from "Widgets/Scripts/Shared/TimeZoneUtilities";
import { Board, LaneIdentity } from "Widgets/Scripts/DataServices/Legacy/AnalyticsChartingClient";
import * as StringUtils from "VSS/Utils/String";
import { KanbanTime } from "Widgets/Scripts/KanbanTime";
import { TeamIdentity } from "Analytics/Scripts/CommonClientTypes";


export interface KanbanTimeConfigurationOptions extends WidgetConfigurationOptions{
    defaultTitle: string;
    titleFormat: string;
}

export class KanbanTimeConfiguration
    extends BaseWidgetConfiguration<KanbanTimeConfigurationOptions>
    implements WidgetContracts.IWidgetConfiguration {

    public static get maxAllowedTimePeriodDays(): number { return 180; }

    public static get defaultTimePeriodDays(): number { return 30; }

    public static get minAllowedTimePeriodDays(): number { return 14; }


    private onSaveTelemetryPacket: IDictionaryStringTo<string | number | boolean>;
    private widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext;
    private delayedNotify: DelayedFunction;
    private latestNotifyArgs: WidgetContracts.EventArgs<WidgetContracts.CustomSettings>;

    private liveTitleState: WidgetLiveTitle.WidgetLiveTitleEditor;
    private teamSettingsField: SettingsField<TeamPicker>;
    private timePeriodSelector: TimePeriodPicker;
    private witSelector: WITSelector;
    private rollingPeriodSettingsField: SettingsField<RollingPeriod>;
    private startDateSettingsField: SettingsField<StartDatePicker>;

    private static notifyThrottleMs: number = 750;

    public initializeOptions(options?: any) {
        super.initializeOptions(
            $.extend({
                coreCssClass: "kanban-time-configuration"
            }, options));
    }

    public load(
        widgetSettings: WidgetContracts.WidgetSettings,
        widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext)
        : IPromise<WidgetContracts.WidgetStatus> {

        KanbanTime.convertWidgetSettingsToNewestVersion(widgetSettings);

        let reconfiguring = widgetSettings.customSettings.data !== null;
        this.latestNotifyArgs = null;
        this.onSaveTelemetryPacket = {
            "IsReconfiguration": reconfiguring
        };

        let load = () => {
            let initialSettings: KanbanTimeSettings = JSON.parse(widgetSettings.customSettings.data);
            this.widgetConfigurationContext = widgetConfigurationContext;



            this.delayedNotify = new DelayedFunction(
                this,
                KanbanTimeConfiguration.notifyThrottleMs,
                "notifySettings",
                this.notifySettings);

            this.createSettingsFieldsAndRender();

            // Populate the settings fields with data and set the initial selections
            return this.populateDataAndSetSelections(initialSettings)
                .then(() => WidgetHelpers.WidgetStatusHelper.Success(),
                    e => WidgetHelpers.WidgetStatusHelper.Failure(ErrorParser.stringifyODataError(e), true));
        };

        return WidgetTelemetry.executeAndTimeAsync("LeadTimeChartConfiguration", "load", load, {
            "IsReconfiguration": reconfiguring
        });
    }

    public onSave(): IPromise<WidgetContracts.SaveStatus> {
        if (this.isValid()) {
            var kanbanSettings = this.getSettings();
            this.packAdditionalOnSaveTelemetry(kanbanSettings);
            var customSettings = this.packWidgetCustomSettings(kanbanSettings);
            return WidgetHelpers.WidgetConfigurationSave.Valid(customSettings);
        } else {
            return WidgetHelpers.WidgetConfigurationSave.Invalid();
        }
    }

    private populateDataAndSetSelections(settings?: KanbanTimeSettings): IPromise<any> {

        this.liveTitleState = WidgetLiveTitle.WidgetLiveTitleEditor.fromSettings(settings, this._options.defaultTitle)
        let projectId = this.tfsContext.project.id;

        this.teamSettingsField.toggleControlBusyOverlay(true);
        this.witSelector.backlogSettingsField.toggleControlBusyOverlay(true);
        this.witSelector.workItemTypeSettingsField.toggleControlBusyOverlay(true);

        var promises = <IPromise<any>[]>[];

        promises.push(this.teamSettingsField.getControl().setContext(projectId).then(() => {
            this.teamSettingsField.toggleControlBusyOverlay(false);
            return this.setSelectedTeam(settings);
        }).then(() => {
            // Live title only depends on team name, so we don't have to wait for other promises to finish
            let settings = this.getSettings();
            this.liveTitleState.updateTitleOnLatestArtifact(
                this.configureName,
                this.getCalculatedWidgetTitle(settings.dataSettings));
        }));

        promises.push(this.witSelector.workItemTypeSettingsField.getControl().setContext(projectId).then(() => {
            this.witSelector.workItemTypeSettingsField.toggleControlBusyOverlay(false);
            return this.setSelectedWorkitemType(settings);
        }));

        this.setTimePeriod(settings);

        return Q.all(promises).then(null, (e) => {
            // Stop all loading overlays on error
            this.witSelector.backlogSettingsField.toggleControlBusyOverlay(false);
            this.witSelector.workItemTypeSettingsField.toggleControlBusyOverlay(false);
            this.teamSettingsField.toggleControlBusyOverlay(false);
            return Q.reject(e);
        });
    }

    private setSelectedTeam(settings?: KanbanTimeSettings): IPromise<{}> {
        var promise: IPromise<{}> = Q({});

        var teamPicker = this.teamSettingsField.getControl();
        if (settings && settings.dataSettings && settings.dataSettings.teamIds) {
            // Select teams from settings
            var teamWasSet = teamPicker.setSelectedByPredicate(
                team => settings.dataSettings.teamIds.indexOf(team.TeamId) >= 0,
                false);

            if (teamWasSet) {
                promise = this.onTeamChange(false, settings); // Don't notify when we're loading from settings
            } else {
                this.teamSettingsField.setErrorMessage(WidgetResources.KanbanTime_PreviouslySelectedTeamNotFoundError);
                this.teamSettingsField.showError();
                promise = Q.reject(null);
            }
        }
        else {
            var teamWasSet = teamPicker.setSelectedByPredicate(
                team => team.TeamId === this.teamContext.id,
                false);

            if (!teamWasSet) {
                WidgetTelemetry.onConfigurationFailureToAutoPopulateField(this.getWidgetTypeId(),
                    teamPicker.getName(),
                    "SmartDefault");
            }
            promise = this.onTeamChange(true);
        }
        return promise;
    }

    private setSelectedBacklog(settings?: KanbanTimeSettings): IPromise<{}> {
        var promise: IPromise<{}> = Q({});

        var backlogPicker = this.witSelector.backlogSettingsField.getControl();
        if (settings && settings.dataSettings && settings.dataSettings.witSelector.identifier === WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory]) {

            this.witSelector.selectField(WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory], false);

            var backlogWasSet = backlogPicker.setSelectedByPredicate(
                backlog => backlog.Category === settings.dataSettings.witSelector.settings,
                false);

            if (backlogWasSet) {
                promise = this.onBacklogChange(false, settings);
            } else {
                this.witSelector.backlogSettingsField.setErrorMessage(WidgetResources.LeadTime_PreviouslySelectedBacklogNotFoundError);
                this.witSelector.backlogSettingsField.showError();

                WidgetTelemetry.onConfigurationFailureToAutoPopulateField(this.getWidgetTypeId(),
                    backlogPicker.getName(),
                    "SavedSetting");
            }
        } else {
            // Try to keep current selection before attempting to select default
            if (backlogPicker.getValue() == null) {
                // Select the lowest level backlog.
                var wasSet = backlogPicker.setSelectedByPredicate(b => b.Category === "Microsoft.RequirementCategory");

                if (!wasSet) {
                    WidgetTelemetry.onConfigurationFailureToAutoPopulateField(this.getWidgetTypeId(),
                        backlogPicker.getName(),
                        "SmartDefault");
                }
            }

            if (this.witSelector.getSettings().identifier === WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory] ) {
                promise = this.onBacklogChange(false);
            }
        }

        return promise;
    }

    private setSelectedWorkitemType(settings?: KanbanTimeSettings): IPromise<{}> {
        var promise: IPromise<{}> = Q({});

        var workItemTypePicker = this.witSelector.workItemTypeSettingsField.getControl();
        if (settings && settings.dataSettings && settings.dataSettings.witSelector.identifier === WorkItemTypeFilterMode[WorkItemTypeFilterMode.WorkItemType]) {

            this.witSelector.selectField(WorkItemTypeFilterMode[WorkItemTypeFilterMode.WorkItemType], false);

            var typeWasSet = workItemTypePicker.setSelectedByPredicate(
                workItem => workItem === settings.dataSettings.witSelector.settings,
                false);

            if (typeWasSet) {
                promise = this.onWorkItemTypeChange(false, settings); // Don't notify when we're loading from settings
            } else {
                this.witSelector.workItemTypeSettingsField.setErrorMessage(WidgetResources.KanbanTime_PreviouslySelectedWitTypeNotFoundError);
                this.witSelector.workItemTypeSettingsField.showError();
                promise = Q.reject(null);
            }
        } else {
            // Default selection to first item
            this.witSelector.workItemTypeSettingsField.getControl().setSelectedIndex(0, false);
        }
        return promise;
    }

    private setTimePeriod(settings?: KanbanTimeSettings) {
        if (settings && settings.dataSettings && settings.dataSettings.timePeriod) {
            const timePeriodIdentifier = settings.dataSettings.timePeriod.identifier;
            
            if (timePeriodIdentifier === TimePeriodFieldIdentifiers.RollingPeriod) {
                var rollingPeriod = <number>settings.dataSettings.timePeriod.settings;
                var rollingPeriodPicker = this.rollingPeriodSettingsField.getControl();
                rollingPeriodPicker.setDays(rollingPeriod, false);
                this.syncStartDateToRollingPeriod();
            } 
            else {
                var startDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(<string>settings.dataSettings.timePeriod.settings);
                var startDatePicker = this.startDateSettingsField.getControl();
                startDatePicker.setDate(startDate, false);
                this.syncRollingPeriodToStartDate();
            }

            this.timePeriodSelector.selectField(timePeriodIdentifier, false);
        }
    }

    private createSettingsFieldsAndRender() {
        let $container = this.getElement();

        this.teamSettingsField = this.createSettingsField({
            control: TeamPicker.createInstance(null, {
                change: () => this.onTeamChange(true)
            }),
            labelText: WidgetResources.KanbanTime_TeamLabel,
        }, $container);

        this.witSelector = WITSelector.create(WITSelector, $container, {
            labelText:  WidgetResources.AnalyticsWidgetsCommonConfig_WorkItemsLabel,
            onChange: (identifier, field) => {
                if (identifier === WorkItemTypeFilterMode[WorkItemTypeFilterMode.WorkItemType]) {
                    this.onWorkItemTypeChange(true);
                } else {
                    this.onBacklogChange(true);
                }
            },
            onBacklogChange: () => this.onBacklogChange(true),
            onWorkItemTypeChange: () => this.onWorkItemTypeChange(true)
        });

        var cultureDateTimeFormat = CultureUtils.getDateTimeFormat();
        this.rollingPeriodSettingsField = this.createSettingsField({
            control: RollingPeriod.create(RollingPeriod,
                null, <RollingPeriodOptions>{
                    onChange: () => this.onRollingPeriodChange(),
                    datePattern: cultureDateTimeFormat.ShortDatePattern,
                    maxDays: KanbanTimeConfiguration.maxAllowedTimePeriodDays,
                    minDays: KanbanTimeConfiguration.minAllowedTimePeriodDays,
                    defaultTimePeriodDays: KanbanTimeConfiguration.defaultTimePeriodDays
                }),
                labelText: WidgetResources.RollingPeriod_DaysPrompt
        });

        this.startDateSettingsField = SettingsField.createSettingsField({
            control: StartDatePicker.create(StartDatePicker, null, <StartDatePickerOptions>{
                onChange: () => this.onStartDateChange(),
                maxDays: KanbanTimeConfiguration.maxAllowedTimePeriodDays,
                minDays: KanbanTimeConfiguration.minAllowedTimePeriodDays,
                datePattern: cultureDateTimeFormat.ShortDatePattern,
                defaultStartDateDaysOffset: KanbanTimeConfiguration.defaultTimePeriodDays
            }),
            labelText: WidgetResources.StartDatePicker_StartDate,
            hasErrorField: true
        });


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

    }

    private onTeamChange(notifyChanges: boolean, settings?: KanbanTimeSettings): IPromise<any> {
        this.teamSettingsField.hideError();

        let errMessage = this.teamSettingsField.getControl().validate();
        if (errMessage === null) {
            var selectedTeam = this.teamSettingsField.getControl().getValue() as TeamIdentity;

            this.witSelector.backlogSettingsField.toggleControlBusyOverlay(true);
            return this.witSelector.backlogSettingsField.getControl().setContext(this.tfsContext.project.id, [selectedTeam.TeamId])
                .then(() => {
                    this.witSelector.backlogSettingsField.toggleControlBusyOverlay(false);
                    return this.setSelectedBacklog(settings);
                }, e => {
                    this.witSelector.backlogSettingsField.toggleControlBusyOverlay(false);
                    return Q.reject(e);
                })
                .then(() => {
                    if (notifyChanges) {
                        this.packNotifyArgs();
                        this.delayedNotify.reset();
                    }
                });
        } else {
            this.teamSettingsField.setErrorMessage(errMessage);
            this.teamSettingsField.showError();
        }

        return Q.resolve(null);
    }

    private onBacklogChange(notifyChanges: boolean, settings?: KanbanTimeSettings): IPromise<{}> {
        this.witSelector.backlogSettingsField.hideError();

        var errMessage = this.witSelector.backlogSettingsField.getControl().validate();
        if (errMessage == null) {
            if (notifyChanges) {
                this.packNotifyArgs();
                this.delayedNotify.reset();
            }
            return Q({});
        }
        else {
            this.witSelector.backlogSettingsField.setErrorMessage(errMessage);
            this.witSelector.backlogSettingsField.showError();
            return Q({});
        }
    }

    private onWorkItemTypeChange(notifyChanges: boolean, settings?: KanbanTimeSettings): IPromise<{}> {
        this.witSelector.workItemTypeSettingsField.hideError();

        var errMessage = this.witSelector.workItemTypeSettingsField.getControl().validate();
        if (errMessage == null) {
            if (notifyChanges) {
                this.packNotifyArgs();
                this.delayedNotify.reset();
            }
        }
        else {
            this.witSelector.workItemTypeSettingsField.setErrorMessage(errMessage);
            this.witSelector.workItemTypeSettingsField.showError();
            return Q({});
        }
    }


    private onRollingPeriodChange(): void {
        this.rollingPeriodSettingsField.hideError();
        var rollingPeriodPicker = this.rollingPeriodSettingsField.getControl();

        var errMessage = rollingPeriodPicker.validate();
        if (errMessage == null) {
            this.syncStartDateToRollingPeriod();
            this.packNotifyArgs();
            this.delayedNotify.reset();
        } else {
            this.rollingPeriodSettingsField.setErrorMessage(errMessage);
            this.rollingPeriodSettingsField.showError();
        }
    }

    private onStartDateChange(): void {
        this.startDateSettingsField.hideError();
        var startDatePicker = this.startDateSettingsField.getControl();

        var errMessage = startDatePicker.validate();
        if (errMessage == null) {
            this.syncRollingPeriodToStartDate();
            this.packNotifyArgs();
            this.delayedNotify.reset();
        } else {
            this.startDateSettingsField.setErrorMessage(errMessage);
            this.startDateSettingsField.showError();
        }
    }

    private syncStartDateToRollingPeriod() {
        var rollingPeriodPicker = this.rollingPeriodSettingsField.getControl();
        var startDate = DateUtils.addDays(TimeZoneUtils.getTodayInAccountTimeZone(), -rollingPeriodPicker.getSettings(), true /* Adjust DST Offset */);
        var startDatePicker = this.startDateSettingsField.getControl();
        startDatePicker.setDate(startDate, false);
    }

    private syncRollingPeriodToStartDate() {
        var startDatePicker = this.startDateSettingsField.getControl();
        var startDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(startDatePicker.getSettings());
        var daysBetween = DateUtils.daysBetweenDates(startDate, TimeZoneUtils.getTodayInAccountTimeZone(), true);
        this.rollingPeriodSettingsField.getControl().setDays(daysBetween, false);
    }

    /**
     * Notifies the widget of a config change with the latest packed widget event args.
     */
    private notifySettings(): void {
        if (this.latestNotifyArgs !== null) {
            this.widgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, this.latestNotifyArgs);
        }
    }

    /**
     * Called when settings are changed in the config.
     * Updates live title and prepares the current config settings for being notified to the widget.
     */
    private packNotifyArgs(): void {
        if (this.isValid()) {
            let settings = this.getSettings();

            this.liveTitleState.updateTitleOnLatestArtifact(this.configureName, this.getCalculatedWidgetTitle(settings.dataSettings));

            let customSettings = this.packWidgetCustomSettings(settings);
            this.latestNotifyArgs = WidgetHelpers.WidgetEvent.Args(customSettings);
        }
    }

    private packWidgetCustomSettings(settings: KanbanTimeSettings): WidgetContracts.CustomSettings {
        return {
            data: JSON.stringify(settings),
            version: KanbanTime.latestSettingsVersion
        };
    }

    private getCalculatedWidgetTitle(settings: KanbanTimeDataSettings): string {
        const selectedTeam = this.teamSettingsField.getControl().getValue() as TeamIdentity;
        const teamName = selectedTeam.TeamName;

        const title = StringUtils.format(this._options.titleFormat, teamName);

        return title;
    }

    private isValid(): boolean {
        if (this.teamSettingsField.getControl().validate() != null) {
            return false; // Return early to avoid validating dependent fields
        }

        if (this.witSelector.validate() != null) {
            return false;
        }

        if (this.timePeriodSelector.validate() != null) {
            return false;
        }

        return true;
    }

    private getSettings(): KanbanTimeSettings {
        let currentSettings: KanbanTimeSettings = {
            dataSettings: this.getChartDataSettings()
        };

        // Add live title information
        this.liveTitleState.appendToSettings(currentSettings);

        return currentSettings;
    }

    private createSettingsField<T extends SelectorControl>(
        options: SettingsFieldOptions<T>,
        $container?: JQuery): SettingsField<T> {
        return SettingsField.createSettingsField(
            <SettingsFieldOptions<T>>$.extend({
                labelAlign: "top",
                hasErrorField: true,
            }, options),
            $container);
    }

    private getChartDataSettings(): KanbanTimeDataSettings {
        let chartDataSettings = <KanbanTimeDataSettings>{
            project: this.tfsContext.project.id
        };

        chartDataSettings.teamIds = [this.teamSettingsField.getControl().getSettings()];
        chartDataSettings.witSelector = this.witSelector.getSettings();

        // Time period
        let timePeriod = this.timePeriodSelector.getSettings();
        if (timePeriod !== null) {
            chartDataSettings.timePeriod = timePeriod;
        }

        return chartDataSettings;
    }

    private packAdditionalOnSaveTelemetry(cfdSettings: KanbanTimeSettings): void {
        this.onSaveTelemetryPacket[cfdSettings.dataSettings.timePeriod.identifier] = cfdSettings.dataSettings.timePeriod.settings;
        this.onSaveTelemetryPacket["WITSelector"] = cfdSettings.dataSettings.witSelector.identifier;
        this.onSaveTelemetryPacket["WITIdentifier"] = cfdSettings.dataSettings.witSelector.settings;
    }

    /**
     * Called after user clicks the save button in the config blade if the status returned by onSave was valid.
     */
    public onSaveComplete(): void {
        WidgetTelemetry.onConfigurationSave(this.getWidgetTypeId(), this.onSaveTelemetryPacket);
    }
}

SDK.VSS.register("dashboards.LeadTimeConfiguration", () => KanbanTimeConfiguration);
SDK.registerContent("dashboards.leadTimeConfiguration-init", (context) => {
    let options = <KanbanTimeConfigurationOptions>context.options;
    options.defaultTitle = WidgetResources.LeadTime_DefaultTitle;
    options.titleFormat = WidgetResources.LeadTime_TitleFormat;

    return Controls.create(KanbanTimeConfiguration, context.$container, options);
});

SDK.VSS.register("dashboards.CycleTimeConfiguration", () => KanbanTimeConfiguration);
SDK.registerContent("dashboards.cycleTimeConfiguration-init", (context) => {
    let options = <KanbanTimeConfigurationOptions>context.options;
    options.defaultTitle = WidgetResources.CycleTime_DefaultTitle;
    options.titleFormat = WidgetResources.CycleTime_TitleFormat;

    return Controls.create(KanbanTimeConfiguration, context.$container, options);
});
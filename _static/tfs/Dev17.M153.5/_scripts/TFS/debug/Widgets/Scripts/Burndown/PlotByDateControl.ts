import * as Controls from "VSS/Controls";
import { StartDatePicker} from "Widgets/Scripts/Shared/TimePickers";
import { SimpleControlPicker, PickerOption, PickerOptionValue } from 'Widgets/Scripts/Burndown/SimpleControlPicker';
import CultureUtils = require("VSS/Utils/Culture");
import WidgetResources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import * as TimeZoneUtils from "Widgets/Scripts/Shared/TimeZoneUtilities";
import { SettingsField } from "Dashboards/Scripts/SettingsField";
import { DateSampleMode, TimePeriodConfiguration, DateSampleInterval, DateSamplingConfiguration} from 'Widgets/Scripts/Burndown/BurndownSettings';
import { TimePeriodPickerValues } from 'Widgets/Scripts/Burndown/TimePeriodPickerValues';
import { DayOfWeek } from "VSS/Common/Contracts/System";
import * as DateUtils from "VSS/Utils/Date";
import * as StringUtils from "VSS/Utils/String";
import { DateSKParser } from "Analytics/Scripts/DateSKParser";

export interface PlotByDateOptions extends Controls.EnhancementOptions {
    hidePlotUnitsSettingsField?: boolean,
    dropdownValue: TimePeriodConfiguration;
    currentStartDate: StartDatePicker, // need the Start Date settings field control to accurately evaluate date range
    onChange: () => void;
}

export class PlotByDateControl extends Controls.Control<PlotByDateOptions> {
    public endDateSettingsField: SettingsField<StartDatePicker>;
    private plotUnitsSettingsField: SettingsField<SimpleControlPicker>;
    private lastDayOfWeekSettingsField: SettingsField<SimpleControlPicker>;
    
    private $lastDayOfWeekContainer: JQuery;
    private $plotPointsOverflowAddedMessage: JQuery;
    public static plotPointMessage = "plot-points-message";
    public static minOverflowPlotPoints = 50;
    public static maxPlotPoints = 180;
    public static minDaysRequired = 1;

    constructor(options: PlotByDateOptions) {
        super(options);
    }

    public initializeOptions(options: PlotByDateOptions) {
        options.cssClass = "burndown-date-mode-panel";        
        super.initializeOptions(options);
    }

    public initialize() {
        const $container = this.getElement();
        this.$lastDayOfWeekContainer = $("<div>").addClass("last-day-container");
        let cultureDateTimeFormat = CultureUtils.getDateTimeFormat();
        let samplingConfigurationOptions = this._options.dropdownValue.samplingConfiguration.settings as DateSamplingConfiguration;

        /* End Date picker */
        let endDatePicker = StartDatePicker.create(StartDatePicker, $container, {
            onChange: () => this.onEndDateChange(),
            cssClass: "end-date",
            maxDays: 30,
            minDays: 1,
            datePattern: cultureDateTimeFormat.ShortDatePattern,
            defaultStartDateDaysOffset: 1,
        });

        this.endDateSettingsField = SettingsField.createSettingsField({
            control: endDatePicker,
            hasErrorField: true,
            labelText: WidgetResources.TimePeriod_EndDateLabel,
            layout: "single-line end-date-field",
            collapseOnHide: true
        }, $container);

        /* Setting initial data for end date field and/or setting any saved data */
        let endDateValue: Date = TimeZoneUtils.getTodayInAccountTimeZone();
        let currentEndDate: string = samplingConfigurationOptions.endDate;
        let offsetEndDate: Date;

        if (this._options.dropdownValue && currentEndDate) {
            // Factoring offset with date value to handle different timezones based on minutes
            offsetEndDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(currentEndDate)
            this.endDateSettingsField.getControl().setDate(offsetEndDate);
        } else {
            let startDate: string = this._options.currentStartDate.getSettings();
            let configuredStartDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(startDate)
            // By default, End Date should be Start Date + 1 day
            this.endDateSettingsField.getControl().setDate(DateUtils.addDays(configuredStartDate, PlotByDateControl.minDaysRequired, true));
        }

        /* Plot units picker */
        let plotUnitsPicker = SimpleControlPicker.createInstance(null, {
            change: () => this.toggleLastDayOfWeek()
        })

        this.plotUnitsSettingsField = SettingsField.createSettingsField({
            control: plotUnitsPicker,
            hasErrorField: true,
            labelText: WidgetResources.TimePeriod_PlotIntervalLabel,
            layout: "single-line plot-units-field",
            collapseOnHide: true
        }, $container)

        if (this._options.hidePlotUnitsSettingsField) {
            this.plotUnitsSettingsField.hideElement();
        }

        /* Setting initial data for plot units field */
        this.plotUnitsSettingsField.getControl().setSource(TimePeriodPickerValues.getPlotUnitsValues(), (value) => value.labelText);
        let sampleIntervalIdentifier: number = samplingConfigurationOptions.sampleInterval;

        if (!isNaN(sampleIntervalIdentifier)) {
            this.plotUnitsSettingsField.getControl().setSelectedByPredicate((value) => value.identifier == sampleIntervalIdentifier, false);
        } else {
            this.plotUnitsSettingsField.getControl().setText(WidgetResources.TimePeriod_PlotUnitsDaysValue);
        }

        $container.append(this.$lastDayOfWeekContainer);
        this.createPlotUnitContainer();
        this.onPlotUnitsChange(sampleIntervalIdentifier);

        this.$plotPointsOverflowAddedMessage = $("<div>")
            .addClass("plot-points-overflow-container")
            .attr("role", "status")
            .append($("<span>").addClass("bowtie-icon bowtie-status-info"))
            .append($("<span>").addClass("bowtie " + PlotByDateControl.plotPointMessage));
        
        $container.append(this.$plotPointsOverflowAddedMessage);

        this.updatePlotPointsMessage();
    }

     public createPlotUnitContainer(): void {
         let samplingConfigurationOptions = this._options.dropdownValue.samplingConfiguration.settings as DateSamplingConfiguration;
        /* Last Day of the Week picker */
        let dayOfWeekPicker = SimpleControlPicker.createInstance(null, {
            change: () => this._options.onChange()
        })

        this.lastDayOfWeekSettingsField = SettingsField.createSettingsField({
            control: dayOfWeekPicker,
            hasErrorField: true,
            labelText: WidgetResources.TimePeriod_LastDayOfWeekLabel,
            layout: "single-line last-day-of-week",
            collapseOnHide: true
        }, this.$lastDayOfWeekContainer)

        /* setting initial data for plot units field */
        this.lastDayOfWeekSettingsField.getControl().setSource(TimePeriodPickerValues.getLastDayOfWeekValues(), (value) => value.labelText);
        let lastDayOfWeekValue: number = samplingConfigurationOptions.lastDayOfWeek;

        if (isNaN(lastDayOfWeekValue)) {
            lastDayOfWeekValue = DayOfWeek.Friday;
        }

        this.lastDayOfWeekSettingsField.getControl().setSelectedByPredicate((value) => value.identifier == lastDayOfWeekValue, false);
    }

    public updatePlotPointsMessage() {
        this.togglePlotPointsMessage();
        let plotUnitValue: PickerOptionValue = this.plotUnitsSettingsField.control.getSettings()
        let plotUnitSingularValue: string = this.getSingularPlotUnitValue(plotUnitValue);
        let calculatedTotalPlotPoints: number = this.calculateTotalPlotPoints(plotUnitValue.identifier)

        let plotPointMessage: string = StringUtils.format(
            WidgetResources.TimePeriod_OverFiftyPlotPointsFormat, plotUnitSingularValue, calculatedTotalPlotPoints);

        $("." + PlotByDateControl.plotPointMessage).text(plotPointMessage);
    }

    private getSingularPlotUnitValue(plotUnit: PickerOptionValue) {
        let plotUnitSingularValue: string;

        switch (plotUnit.identifier) {
            case DateSampleInterval.Days:
                plotUnitSingularValue = WidgetResources.TimePeriod_OverFiftyPlotPointsDayWarning;
                break;
            case DateSampleInterval.Weeks:
                plotUnitSingularValue = WidgetResources.TimePeriod_OverFiftyPlotPointsWeekWarning;
                break;
            case DateSampleInterval.Months:
                plotUnitSingularValue = WidgetResources.TimePeriod_OverFiftyPlotPointsMonthWarning;
        }

        return plotUnitSingularValue;
    }

    /* Calculating total number of plot points, which is mainly used to check if there are more than 50 plot points */
    public calculateTotalPlotPoints(option: number): number {
        try {
            var totalPlotPoints: number;
            let startDate = this.retrieveStartDate();
            let endDate = this.retrieveEndDate();
            let timeDifference = Math.abs(startDate.getTime() - endDate.getTime()) / 1000;
            const secondsInADay: number = 86400;
            let totalDays = Math.floor(timeDifference / secondsInADay);

            switch (option) {
                case DateSampleInterval.Days:
                    totalPlotPoints = totalDays;
                    break;
                case DateSampleInterval.Weeks:
                    totalPlotPoints = Math.ceil(totalDays / 7);
                    break;
                case DateSampleInterval.Months:
                    totalPlotPoints = Math.abs(Math.ceil(startDate.getMonth() - endDate.getMonth() + (12 * (startDate.getFullYear() - endDate.getFullYear()))));
            }
        } catch (err) {
            this.endDateSettingsField.setErrorMessage(WidgetResources.StartDatePicker_IterationModeError);
        }

        return totalPlotPoints;
    }

    public togglePlotPointsMessage() {
        let isOverflowReached = (this.calculateTotalPlotPoints(this.plotUnitsSettingsField.control.getSettings().identifier) >= PlotByDateControl.minOverflowPlotPoints);
        this.$plotPointsOverflowAddedMessage.toggle(isOverflowReached);
    }

     public toggleLastDayOfWeek(): void {
        this.updatePlotPointsMessage();
        this.onPlotUnitsChange(this.plotUnitsSettingsField.control.getSettings().identifier);
        this._options.onChange();
    }

    public onPlotUnitsChange(identifier: DateSampleInterval): void {
        // on initial load, if default is set to iterations, picker is turned off
        let toggleValue = (identifier == DateSampleInterval.Weeks)
        this.$lastDayOfWeekContainer.toggle(toggleValue);

        // need to validate date range to check if there are more than 180 plot points
        this.endDateSettingsField.hideError();
        let errMessage = this.validateDateRange();

        if (errMessage == null) {
            this._options.onChange();
        } else {
            this.endDateSettingsField.setErrorMessage(errMessage);
            this.endDateSettingsField.showError();
        }
    }

    private onEndDateChange(): void {
        this.updatePlotPointsMessage();
        this.endDateSettingsField.hideError();

        let errMessage = this.validateDateRange();
        if (errMessage == null) {
            this._options.onChange();

        } else {
            this.endDateSettingsField.setErrorMessage(errMessage);
            this.endDateSettingsField.showError();
        }
    }

    /** Validating the date range, and also verifying that the number of plot points are within the 180 max threshold */
    public validateDateRange(): string {
        let errMessage = null;

        try {
            var endDate = this.retrieveEndDate();
        } catch (err) {
            // we skip logging the error message as we only care about end date. 
        }

        try { 
            var startDate = this.retrieveStartDate();
        } catch(err) {
            // we skip logging the error message as we only care about start date. 
        }

        if (endDate == null) {
            errMessage = WidgetResources.PlotByControl_NoEndDate;
        }

        else if (startDate == null && endDate != null) {
            // the error message is not specific to the plot by Control and is managed within the time period control, however we cannot perform an evaluation on the range
            errMessage = null; 
        }

        else if (endDate != null && startDate != null) {
            if (DateUtils.defaultComparer(startDate, endDate) > 0) {
                errMessage = WidgetResources.EndDate_AfterStartDateError;
            } else if (DateUtils.defaultComparer(endDate, startDate) == 0) {
                errMessage = StringUtils.format(
                    WidgetResources.DatePicker_NeedMinDayPlusOneFormat,
                    PlotByDateControl.minDaysRequired
                )
            } else {
                let plotValue: PickerOptionValue = this.plotUnitsSettingsField.control.getSettings();
                let totalCalculatedPlotPoints: number = this.calculateTotalPlotPoints(plotValue.identifier);

                if (totalCalculatedPlotPoints > PlotByDateControl.maxPlotPoints) {
                    switch (plotValue.identifier) {
                        case DateSampleInterval.Days:
                            errMessage = StringUtils.format(
                                WidgetResources.DatePicker_MaxDaysAllowed,
                                PlotByDateControl.maxPlotPoints);
                            break;
                        case DateSampleInterval.Weeks:
                            errMessage = StringUtils.format(
                                WidgetResources.DatePicker_MaxWeeksAllowed,
                                PlotByDateControl.maxPlotPoints);
                            break;
                        case DateSampleInterval.Months:
                            errMessage = StringUtils.format(
                                WidgetResources.DatePicker_MaxMonthsAllowed,
                                PlotByDateControl.maxPlotPoints);
                            break;
                    }
                }
            }
        }

        return errMessage;
    }

    /** Provides the user's last configured start date from settings*/
    private retrieveStartDate(): Date {
        let startDate: string = this._options.currentStartDate.getSettings();
        let configuredStartDate: Date = DateSKParser.parseDateStringAsLocalTimeZoneDate(startDate);

        return configuredStartDate;
    }

    /** Provides the user's last configured end date from settings*/
    private retrieveEndDate(): Date {
        let endDate: string = this.endDateSettingsField.control.getSettings();
        let configuredStartDate: Date = DateSKParser.parseDateStringAsLocalTimeZoneDate(endDate);

        return configuredStartDate;
    }

    public getSettings(): DateSamplingConfiguration {
        let settings: DateSamplingConfiguration;
        let endDate: string = this.endDateSettingsField.control.getSettings(); 
        let plotUnitValue: PickerOptionValue = this.plotUnitsSettingsField.control.getSettings();
        let lastDayOfWeekValue: PickerOptionValue = this.lastDayOfWeekSettingsField.control.getSettings();
        
        settings = {
            endDate: endDate,
            lastDayOfWeek: lastDayOfWeekValue.identifier,
            sampleInterval: plotUnitValue.identifier
        }

        return settings;
    }

    public validate(): string {
        let dataError = null;
        let dateRangeError = this.validateDateRange();

        if (dateRangeError != null) {
            dataError = dateRangeError;
        }

        return dataError;
    }
}
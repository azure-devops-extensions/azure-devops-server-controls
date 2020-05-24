import "VSS/LoaderPlugins/Css!Widgets/Styles/TimePeriodControl";

import * as Controls from "VSS/Controls";
import { DateSKParser } from "Analytics/Scripts/DateSKParser";
import * as TimeZoneUtils from "Widgets/Scripts/Shared/TimeZoneUtilities";
import * as StringUtils from "VSS/Utils/String";

import { SettingsField } from "Dashboards/Scripts/SettingsField";

import { StartDatePicker } from "Widgets/Scripts/Shared/TimePickers";
import { SimpleControlPicker, PickerOptionValue } from 'Widgets/Scripts/Burndown/SimpleControlPicker';
import CultureUtils = require("VSS/Utils/Culture");
import { DateSampleInterval, DateSampleMode, TimePeriodConfiguration } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { TimePeriodPickerValues } from 'Widgets/Scripts/Burndown/TimePeriodPickerValues';
import { PlotByDateControl, PlotByDateOptions } from 'Widgets/Scripts/Burndown/PlotByDateControl';
import { IterationPickerList, IterationPickerListOptions } from 'Widgets/Scripts/Burndown/IterationPickerList';

import WidgetResources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");

export interface TimePeriodControlOptions extends Controls.EnhancementOptions {
    hideIterationPickerList?: boolean,
    dropdownValue: TimePeriodConfiguration;
    labelText: string;
    onChange: () => void;
}

// populating all pickers within Time Period panel
export class TimePeriodControl extends Controls.Control<TimePeriodControlOptions> {
    private startDateSettingsField: SettingsField<StartDatePicker>;
    private plotBySettingsField: SettingsField<SimpleControlPicker>;
    private plotByDateControl: PlotByDateControl;
    private iterationPickerList: IterationPickerList;
    private currentProjects: string[];
    public static needOneMinDay = 1;
    public static maxPlotPoints = 180;

    constructor(options: TimePeriodControlOptions) {
        super(options);
    }

    public initializeOptions(options: TimePeriodControlOptions) {
        options.cssClass = "burndown-time-period-panel";
        super.initializeOptions(options);
    }

    public initialize() {
        var $container = this.getElement();

        var cultureDateTimeFormat = CultureUtils.getDateTimeFormat()

        // Create Time Period label
        SettingsField.createSettingsFieldForJQueryElement({
            labelText: WidgetResources.BurndownWidget_TimePeriodHeader,
        }, null, $container);

        /* Start Date picker */
        let startDatePicker = StartDatePicker.create(StartDatePicker, null, {
            onChange: () => this.onStartDateChange(),
            datePattern: cultureDateTimeFormat.ShortDatePattern,
            defaultStartDateDaysOffset: 1,
            cssClass: "start-date",
            maxDays: 30,
            minDays: 1
        });

        this.startDateSettingsField = SettingsField.createSettingsField({
            control: startDatePicker,
            hasErrorField: true,
            labelText: WidgetResources.StartDatePicker_StartDate,
            layout: "single-line",
            collapseOnHide: true
        }, $container);

        /* Setting initial data for start date field and/or setting any saved data */
        var configuredStartDate: Date = TimeZoneUtils.getTodayInAccountTimeZone();

        if (this._options.dropdownValue && this._options.dropdownValue.startDate.length > 0) {
            let startDate: string = this._options.dropdownValue.startDate;
            configuredStartDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(startDate);
        }

        this.startDateSettingsField.getControl().setDate(configuredStartDate);
        this.startDateSettingsField.control.setEnabled(false);

        /* Plot Widget By picker */
        let plotByPicker = SimpleControlPicker.createInstance(null, {
            change: () => this.togglePlotBy(),
        })

        this.plotBySettingsField = SettingsField.createSettingsField({
            control: plotByPicker,
            hasErrorField: true,
            labelText: this._options.labelText,
            layout: "single-line plot-by-settings",
            collapseOnHide: true
        }, $container)

        /* Setting initial data for plot by field */
        this.plotBySettingsField.getControl().setSource(TimePeriodPickerValues.getPlotByValues(), (value) => value.labelText);
        
        let identifier = this._options.hideIterationPickerList ? DateSampleMode.ByDateInterval : this._options.dropdownValue.samplingConfiguration.identifier;
        this.plotBySettingsField.getControl().setSelectedByPredicate((value) => value.identifier == identifier, false)

        this.plotBySettingsField.control.setEnabled(false);

        this.plotByDateControl = PlotByDateControl.create<PlotByDateControl, PlotByDateOptions>(PlotByDateControl, $container, {
            hidePlotUnitsSettingsField: this._options.hideIterationPickerList,
            dropdownValue: this._options.dropdownValue,
            currentStartDate: this.startDateSettingsField.control,
            onChange: () => this._options.onChange(),
        });

        this.iterationPickerList = IterationPickerList.create<IterationPickerList, IterationPickerListOptions>(IterationPickerList, $container, {
            dropdownValue: this._options.dropdownValue,
            currentStartDate: this.startDateSettingsField.control,
            onChange: () => this._options.onChange()
        });

        this.onPlotByChange(this.plotBySettingsField.control.getSettings().identifier)
    }

    public setContext(projects: string[]) {
        this.currentProjects = projects;

        this.startDateSettingsField.control.setEnabled(true);
        this.plotBySettingsField.control.setEnabled(true);
        this.updateIterationPicker();
        // On initialization, if there are customized settings, toggle the the date/iterations containers
        this.onPlotByChange(this.plotBySettingsField.control.getSettings().identifier);
    }

    public getSettings(): TimePeriodConfiguration {
        var timePeriodCtrl: TimePeriodConfiguration;
        var plotByValueSettings: PickerOptionValue = this.plotBySettingsField.getControl().getSettings();
        var startDateSettings: string = this.startDateSettingsField.getControl().getSettings();

        if (plotByValueSettings.identifier === DateSampleMode.ByDateInterval) {
            timePeriodCtrl = {
                startDate: startDateSettings,
                samplingConfiguration: {
                    identifier: plotByValueSettings.identifier,
                    settings: this.plotByDateControl.getSettings(),
                }
            }
        } else if (plotByValueSettings.identifier === DateSampleMode.ByIterations) {
            timePeriodCtrl = {
                startDate: startDateSettings,
                samplingConfiguration: {
                    identifier: plotByValueSettings.identifier,
                    settings: this.iterationPickerList.getSettings(),
                }
            }
        }

        return timePeriodCtrl;
    }

    private onStartDateChange(): void {
        this.onDateOrRangeChange();
        this._options.onChange();
    }

    private togglePlotBy() {
        this.onPlotByChange(this.plotBySettingsField.control.getSettings().identifier);
        this._options.onChange();
    }

    private onPlotByChange(identifier: DateSampleMode): void {
        // on initial load, if default is set to iterations, pickers are turned off
        if (identifier == DateSampleMode.ByIterations) {
            this.plotByDateControl.hideElement();
            this.iterationPickerList.showElement();
        } else {
            this.plotByDateControl.showElement();
            this.iterationPickerList.hideElement();
        }

        if (this._options.hideIterationPickerList) {
            this.iterationPickerList.hideElement();
            this.plotByDateControl.showElement();
            this.plotBySettingsField.hideElement();
        }

        /* Validation is needed to verify that selected dates are still within acceptable range after toggling between DateSampleModes,
        and the iteration picker also needs to be updated even if the range of dates are in an error state **/
        this.onDateOrRangeChange();
    }

    /** Regardless of the current DateSampleMode, the start date must be verified, start date and end date must stay within range, and the iteration picker values must always be updated */
    private onDateOrRangeChange(): void {
        this.plotByDateControl.updatePlotPointsMessage();
        this.startDateSettingsField.hideError();
        this.plotByDateControl.endDateSettingsField.hideError();

        // Always check the startDateSettingsField. This is used in both modes.
        let errMessageForStartDate = this.startDateSettingsField.getControl().validate(true);
        if (errMessageForStartDate) {
            this.startDateSettingsField.setErrorMessage(errMessageForStartDate);
            this.startDateSettingsField.showError();
        }

        if (this.plotBySettingsField.control.getSettings().identifier == DateSampleMode.ByIterations) {
            this.updateIterationPicker();
        } else {
            this.plotByDateControl.endDateSettingsField.hideError();

            let errMessageForPlotBy = this.plotByDateControl.validateDateRange();

            if (errMessageForPlotBy) {
                this.plotByDateControl.endDateSettingsField.setErrorMessage(errMessageForPlotBy);
                this.plotByDateControl.endDateSettingsField.showError();
            }
        }
    }

    /** Populating and updating the iteration picker when a project/team is selected and start date changes */
    private updateIterationPicker(): void {
        let startDate: string;
        let configuredStartDate: Date

        try {
            startDate = this.startDateSettingsField.getControl().getSettings();
        } catch (err) {
            this.startDateSettingsField.setErrorMessage(WidgetResources.StartDatePicker_IterationModeError);
            this.startDateSettingsField.showError();
        }

        if (startDate && this.currentProjects) {
            configuredStartDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(startDate);
            this.iterationPickerList.setContext(this.currentProjects, configuredStartDate);
        }
    }

    public validate(): string {
        let skipCurrentDayValidation = true;
        if (this.plotBySettingsField.control.getSettings().identifier === DateSampleMode.ByDateInterval) {
            return this.plotByDateControl.validateDateRange() || this.startDateSettingsField.getControl().validate(skipCurrentDayValidation);
        } else {
            return this.startDateSettingsField.getControl().validate(skipCurrentDayValidation) || this.iterationPickerList.validate();
        }
    }
}
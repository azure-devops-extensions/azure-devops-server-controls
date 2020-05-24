import * as Controls from "VSS/Controls";
import * as Combos from "VSS/Controls/Combos";
import * as StringUtils from "VSS/Utils/String";
import * as DateUtils from "VSS/Utils/Date";

import { DateSKParser } from "Analytics/Scripts/DateSKParser";

import { SettingsField, SettingsFieldOptions } from "Dashboards/Scripts/SettingsField";
import { Selector, SelectorControl } from "Dashboards/Scripts/Selector";

import { RadioSettingsFieldPicker, RadioSettingsFieldPickerOptions } from "Widgets/Scripts/Shared/RadioSettingsFieldPicker";
import * as WidgetResources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";
import * as TimeZoneUtils from "Widgets/Scripts/Shared/TimeZoneUtilities";

export class TimePeriodPicker extends RadioSettingsFieldPicker<number | string> { }

/** The options for the RollingPeriod. */
export interface RollingPeriodOptions {
    /**
     * A handler to be called whenever the state of the control changes.
     */
    onChange: () => void;

    /**
     * (Optional)
     * The format string to use for displaying the date hint.
     * Uses the browser default if none is provided.
     */
    datePattern?: string;

    /**
     * The max value that can be entered in the control for the rolling period length.
     */
    maxDays?: number;

    /**
     * The min value that can be entered in the control for the rolling period length.
     */
    minDays?: number;


    /** Default number of days to populate in the day box */
    defaultTimePeriodDays: number;
}

/** A selector for defining a rolling period. */
export class RollingPeriod
    extends Controls.Control<RollingPeriodOptions>
    implements Selector {

    public static cssClass = "rolling-period-selector";
    public static rollingPeriodCssClass = "rolling-period";
    public static rollingPeriodInputCssClass = "rolling-period-input";

    private days: Combos.Combo;

    public initializeOptions(options?: RollingPeriodOptions) {
        super.initializeOptions($.extend({
            coreCssClass: RollingPeriod.cssClass
        }, options));
    }

    public initialize() {
        this.days = this.createDaysInput();

        var $container = this.getElement();
        $container.append(this.days.getElement());

        this.setDays(this._options.defaultTimePeriodDays, false);
    }

    /**
     * Sets the enabled state of the control. 
     * @param value - The enabled state to set
     */
    public setEnabled(value: boolean): void {
        this.days.setEnabled(value);
    }

    /**
     * Sets the number entered in the days input.
     * @param days - The value to set.
     * @param fireEvent - Whether or not to fire the onChange event for the input.
     */
    public setDays(days: number, fireEvent?: boolean): void {
        this.days.setText(days.toString(), fireEvent);
    }

    /**
     * Validates the control and returns a message.
     * @returns An error message if the control is in an invalid state. Otherwise null.
     */
    public validate(): string {
        var errorMessage = null;
        var rollingDays = this.getSettings();

        if (!$.isNumeric(rollingDays) || rollingDays <= 0 || rollingDays % 1 != 0) {
            errorMessage = WidgetResources.RollingPeriod_InvalidInputError;
        }
        else if (this._options.maxDays != null && rollingDays > this._options.maxDays) {
            errorMessage = StringUtils.format(
                WidgetResources.RollingPeriod_MaxAllowedDaysErrorFormat,
                this._options.maxDays);

        }
        else if (this._options.minDays != null && rollingDays < this._options.minDays) {
            errorMessage = StringUtils.format(
                WidgetResources.RollingPeriod_MinAllowedDaysErrorFormat,
                this._options.minDays);

        }
        return errorMessage;
    }

    /**
     * Gets the number of days entered in the text box.
     * @returns The number in the days input. NaN if the input isn't a number.
     */
    public getSettings(): number {
        var val = this.days.getValue<string>();

        if ($.isNumeric(val)) {
            return +val;
        } else {
            return Number.NaN;
        }
    }

    /**
     * Creates an unparented text input for entering a number of days.
     * @returns A combo text box.
     */
    private createDaysInput(): Combos.Combo {
        var combo = Combos.Combo.create(Combos.Combo,
            null, {
                cssClass: RollingPeriod.rollingPeriodCssClass,
                inputCss: RollingPeriod.rollingPeriodInputCssClass,
                mode: "text",
                change: () => this.onDaysChange(),
            });

        // Set maxlength
        combo.getElement().find("." + RollingPeriod.rollingPeriodInputCssClass).prop("maxlength", 3);

        return combo;
    }

    /**
     * Called when the days input value is changed.
     * Updates the date hint and calls the onChange handler passed to the control.
     */
    private onDaysChange(): void {
        this._options.onChange();
    }
}

export interface StartDatePickerOptions extends Combos.IComboOptions {
    onChange: () => void;
    datePattern: string;
    maxDays: number;
    minDays: number;

    /** Default number of days to go back for default start date box */
    defaultStartDateDaysOffset: number;
}

export class StartDatePicker extends Controls.Control<StartDatePickerOptions> implements Selector {
    private picker: Combos.Combo;

    public initializeOptions(options: StartDatePickerOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "start-date-picker"
        }, options));
    }

    public initialize() {
        super.initialize();

        this.picker = Combos.Combo.create(Combos.Combo,
            null, {
                type: "date-time",
                mode: "drop",
                change: () => this._options.onChange()
            });

        var today = TimeZoneUtils.getTodayInAccountTimeZone();
        var initialStartDate = DateUtils.addDays(today, -this._options.defaultStartDateDaysOffset, true /* Adjust DST Offset */);
        this.setDate(initialStartDate, false);

        this.getElement().append(this.picker.getElement());
    }

    public validate(skipCurrentDayValidation: boolean = false): string {
        var today = TimeZoneUtils.getTodayInAccountTimeZone();
        var date = this.picker.getValue<Date>();
        var errMessage = null;

        if (date != null && !skipCurrentDayValidation) {
            if (DateUtils.defaultComparer(date, today) >= 0) {
                errMessage = WidgetResources.StartDatePicker_MustBePastDateError;
            } else {
                var daysBetween = DateUtils.daysBetweenDates(date, today, true);
                if (daysBetween > this._options.maxDays) {
                    errMessage = StringUtils.format(
                        WidgetResources.RollingPeriod_MaxAllowedDaysErrorFormat,
                        this._options.maxDays);
                }
                else if (daysBetween < this._options.minDays) {
                    errMessage = StringUtils.format(
                        WidgetResources.RollingPeriod_MinAllowedDaysErrorFormat,
                        this._options.minDays);
                }
            }
        }

        if (date === null) {
            errMessage = WidgetResources.StartDatePicker_NoDateSelectedError;
        }

        return errMessage;
    }

    /**
     * Retrieves the selected value of the picker
     * @returns a date string in the format "yyyy-MM-dd", or empty string if the picker does not have a properly formed date.
     */
    public getSettings(): string {
        var date = this.picker.getValue<Date>();
        return (date) ? DateUtils.format(date, DateSKParser.dateStringFormat) : "";
    }

    /**
     * Sets the selected date.
     * @param date is a string or Date object representing the date that should be selected.
     * @param fireEvent calls the onChange handler if set to true.
     */
    public setDate(date: Date, fireEvent?: boolean): void;
    public setDate(date: string, fireEvent?: boolean): void;
    public setDate(date: any, fireEvent?: boolean): void {
        if (typeof date == "string") {
            date = DateSKParser.parseDateStringAsLocalTimeZoneDate(date);
        }

        this.picker.setText(this.formatDateToString(date), fireEvent);
    }

    public setEnabled(value: boolean): void {
        this.picker.setEnabled(value);
    }

    /**
     * Formats a date to a string following supplied date pattern.
     * Defaults to browser defined date pattern.
     * @param date - The date to format.
     * @returns A formatted string representing the date given.
     */
    private formatDateToString(date: Date): string {
        try {
            if (this._options && this._options.datePattern) {
                return DateUtils.format(date, this._options.datePattern);
            } else {
                return date.toLocaleDateString();
            }
        } catch (e) {
            return "";
        }
    }
}
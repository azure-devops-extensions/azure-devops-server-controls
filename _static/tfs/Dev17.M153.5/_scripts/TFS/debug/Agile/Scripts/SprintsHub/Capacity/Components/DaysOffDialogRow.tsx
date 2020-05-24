import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/Capacity/Components/DaysOffDialog";
import { IFormFieldState } from "Agile/Scripts/Common/ValidationContracts";
import * as CapacityPivotResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.CapacityPivot";
import { IDaysOff } from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { ActionButton, IButtonProps } from "OfficeFabric/Button";
import { DatePicker, IDatePicker } from "OfficeFabric/DatePicker";
import { Label } from "OfficeFabric/Label";
import * as Culture from "VSS/Utils/Culture";
import * as DateUtilities from "VSS/Utils/Date";
import { datePickerStrings } from "VSSPreview/OfficeFabric/Helpers";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

export interface IDaysOffDialogRowProps {
    daysOff: IFormFieldState<IDaysOff>;
    index: number;
    isLastRow: boolean;
    onChanged: (index: number, start: Date, end: Date) => void;
    onRemove: (index: number) => void;
    autoFocus: boolean;
}

export class DaysOffDialogRow extends React.Component<IDaysOffDialogRowProps> {
    private _startDatePicker: IDatePicker;

    public componentDidUpdate() {
        if (this.props.autoFocus) {
            this._focus();
        }
    }

    public componentDidMount() {
        if (this.props.autoFocus) {
            this._focus();
        }
    }
    public render(): JSX.Element {
        const addRowProps: IButtonProps = {
            className: "capacity-column-remove",
            iconProps: { iconName: "Clear" },
            onClick: this._onRemove,
            ariaLabel: CapacityPivotResources.Capacity_RemoveActivity
        };
        return (
            <div>
                <div className="capacity-days-off-row">
                    <DatePicker
                        ref={this._setStartDateRef}
                        ariaLabel={CapacityPivotResources.Header_StartDateAria}
                        className="capacity-column-date date-picker capacity-days-off-row-start-date"
                        allowTextInput={true}
                        formatDate={this._formatDate}
                        onSelectDate={this._startDateChanged}
                        parseDateFromString={this._parseDate}
                        value={this.props.daysOff.value.start}
                        // Set resource strings (error strings / names / etc )
                        strings={datePickerStrings()}
                    />
                    <DatePicker
                        ariaLabel={CapacityPivotResources.Header_EndDateAria}
                        className="capacity-column-date date-picker"
                        allowTextInput={true}
                        formatDate={this._formatDate}
                        onSelectDate={this._endDateChanged}
                        parseDateFromString={this._parseDate}
                        value={this.props.daysOff.value.end}
                        // Set resource strings (error strings / names / etc )
                        strings={datePickerStrings()}
                    />
                    <div className="capacity-column-days-off">
                        <Label>
                            {this.props.daysOff.value.netDaysOff}
                        </Label>
                    </div>
                    <ActionButton {...addRowProps} />
                </div>
                <div className={this.props.isLastRow ? "days-off-row-error-placeholder-footer" : "days-off-row-error-placeholder"}>
                    {this._renderDaysOffError()}
                </div>
            </div>
        );
    }

    private _focus(): void {
        if (this._startDatePicker) {
            this._startDatePicker.focus();
        }
    }

    private _setStartDateRef = (datePicker: IDatePicker) => {
        this._startDatePicker = datePicker;
    }

    private _renderDaysOffError() {
        if (this.props.daysOff.validationResult.isValid || this.props.daysOff.pristine) {
            return null;
        }
        return (
            <div className="date-picker-error" aria-live="assertive">
                <VssIcon iconType={VssIconType.fabric} iconName="Error" />
                {this.props.daysOff.validationResult.errorMessage}
            </div>
        );

    }

    private _onRemove = (): void => {
        this.props.onRemove(this.props.index);
    }

    private _endDateChanged = (date: Date): void => {
        if (date) {
            // DST bug: Fabric DatePicker can return dates with nonzero hours over DST boundaries.
            // Zero out the date hours
            date.setHours(0);
        }

        this.props.onChanged(this.props.index, this.props.daysOff.value.start, date);
    }

    private _startDateChanged = (date: Date): void => {
        if (date) {
            // DST bug: Fabric DatePicker can return dates with nonzero hours over DST boundaries.
            // Zero out the date hours
            date.setHours(0);
        }

        this.props.onChanged(this.props.index, date, this.props.daysOff.value.end);
    }

    private _formatDate = (date: Date): string => {
        if (!date) {
            return "";
        }
        const dateTimeFormat = Culture.getDateTimeFormat();
        return DateUtilities.localeFormat(date, dateTimeFormat.ShortDatePattern, true);
    }

    private _parseDate = (value: string): Date => {
        const dateTimeFormat = Culture.getDateTimeFormat();
        return DateUtilities.parseDateString(value, dateTimeFormat.ShortDatePattern, true);
    }
}
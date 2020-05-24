// React & Fabric
import * as React from "react";
import { Fabric } from "OfficeFabric/Fabric";
import { DatePicker, IDatePickerStrings } from "OfficeFabric/DatePicker";
import { TooltipHost } from "VSSUI/Tooltip";

// VSS Framework
import * as Utils_UI from "VSS/Utils/UI";
import * as Utils_Date from "VSS/Utils/Date";
import * as Culture from "VSS/Utils/Culture";
import * as OfficeFabricHelpers from "VSSPreview/OfficeFabric/Helpers";

// Presentation
import { DefinedPaletteColorPicker } from "Presentation/Scripts/TFS/Components/DefinedPaletteColorPicker";

// Scaled Agile
import { TextBox } from "ScaledAgile/Scripts/Shared/Components/TextBox";
import { ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { DeliveryTimeLineViewClassNameConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import { IMarkersSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/IDeliveryTimelineMarkersInterfaces";

// Resources
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

export interface IMarkersSettingRowProps extends React.Props<void> {
    /**
     * Marker data values for this row - label, date, color, and id
     */
    markerData: IMarkersSettingData;

    /**
     * The callback when date is changed 
     */
    onDateChanged: IArgsFunctionR<void>;

    /**
     * The callback when label is changed 
     */
    onLabelChanged: IArgsFunctionR<void>;

    /**
     * The callback when color is changed 
     */
    onColorChanged: IArgsFunctionR<void>;

    /**
     * If the settings should be disabled
     */
    disabled: boolean;

    /**
     * The callback whenever a marker setting row is asked to be deleted
     */
    onDeleteRow: IArgsFunctionR<void>;

    /**
     * Sets focus on this row's textbox
     */
    focusOnMount?: boolean;
}

export class MarkersSettingRow extends React.Component<IMarkersSettingRowProps, {}> {
    public static SETTING_ROW_CONTAINER = "wizard-setting-row";
    public static SETTING_CONTAINER = "wizard-setting";
    public static MARKERS_SETTING_CONTAINER = "markers-setting-container";
    public static SETTING_DELETE_CONTAINER = "wizard-delete-icon-container";
    public static SETTING_DELETE_ICON = "bowtie-icon bowtie-math-multiply";
    public static SETTING_FIELD_CLASS = "wizard-field";
    public static SETTINGS_FIELD_CONTROL = "field-control";
    public static SETTINGS_COLOR_CONTROL = "color-control";
    public static SETTING_GRIP = "wizard-grip";

    public static DatePickerWidth = 280;
    public static LabelWidth = 320;
    public static ColorPickerWidth = 100;

    private static CALENDAR_STRINGS: IDatePickerStrings;

    private static getCalendarStrings(): IDatePickerStrings {
        if (!MarkersSettingRow.CALENDAR_STRINGS) {
            MarkersSettingRow.CALENDAR_STRINGS = OfficeFabricHelpers.datePickerStrings();
        }
        return MarkersSettingRow.CALENDAR_STRINGS;
    }

    private _deleteButtonDom: HTMLDivElement;

    constructor(props: IMarkersSettingRowProps) {
        super(props);
        this._onDateChanged = this._onDateChanged.bind(this);
        this._onLabelChanged = this._onLabelChanged.bind(this);
        this._onColorChanged = this._onColorChanged.bind(this);
    }

    private _onDateChanged(value: Date) {
        // If value is null/undefined then the DatePicker couldn't parse the date. If we don't trigger onDateChanged resetting the user's input value to null then
        // the DatePicker will display an error message that we don't want.
        if (!value || !Utils_Date.equals(this.props.markerData.date.value, value)) {
            this.props.onDateChanged(this.props.markerData.id, value);
        }
    }

    private _onLabelChanged(value: string) {
        this.props.onLabelChanged(this.props.markerData.id, value);
    }

    private _onColorChanged(value: string) {
        this.props.onColorChanged(this.props.markerData.id, value);
    }

    public render(): JSX.Element {
        return <div className={MarkersSettingRow.SETTING_ROW_CONTAINER} id={this.props.markerData.id}>
            {this._renderMarkerSettingsRow()}
        </div>;
    }

    /**
     * Render a complete line that represents a marker that will show on this plan   
     */
    private _renderMarkerSettingsRow(): JSX.Element {
        const calendarStrings = MarkersSettingRow.getCalendarStrings();

        return <Fabric>
            <div className={`${MarkersSettingRow.SETTING_CONTAINER} ${MarkersSettingRow.MARKERS_SETTING_CONTAINER}`}>
                <div className={MarkersSettingRow.SETTING_GRIP}></div>
                <div className={`${MarkersSettingRow.SETTING_FIELD_CLASS} ${MarkersSettingRow.SETTINGS_FIELD_CONTROL}`} style={{ minWidth: MarkersSettingRow.DatePickerWidth }}>
                    <DatePicker
                        strings={calendarStrings}
                        isMonthPickerVisible={false}
                        allowTextInput={true}
                        value={this.props.markerData.date.value}
                        ariaLabel={ScaledAgileResources.ConfigurationMarkerDateLabel}
                        disabled={this.props.disabled}
                        onSelectDate={this._onDateChanged}
                        formatDate={(date) => Utils_Date.localeFormat(date, Culture.getDateTimeFormat().LongDatePattern, /*ignore timezone*/ true)}
                        parseDateFromString={(str) =>
                            // The date is already at 00:00, ignore the time zone and do not convert it to local time on parse 
                            Utils_Date.parseDateString(str, null, /*ignore time zone*/ true)} />
                    <div aria-live="assertive" className="input-error-tip"
                        hidden={this.props.markerData.date.validationState === ValidationState.Success}>{this.props.markerData.date.message}</div>
                </div>
                <div className={`${MarkersSettingRow.SETTING_FIELD_CLASS} ${MarkersSettingRow.SETTINGS_FIELD_CONTROL}`} style={{ width: MarkersSettingRow.LabelWidth }}>
                    <TextBox
                        onChange={this._onLabelChanged}
                        value={this.props.markerData.label.value}
                        isValid={this.props.markerData.label.validationState === ValidationState.Success}
                        errorMessage={<span>{this.props.markerData.label.message}</span>}
                        disabled={this.props.disabled}
                        placeholderText={ScaledAgileResources.ConfigurationMarkerNamePlaceholder}
                        focusOnMount={this.props.focusOnMount} />
                </div>
                <div className={`${MarkersSettingRow.SETTING_FIELD_CLASS} ${MarkersSettingRow.SETTINGS_COLOR_CONTROL}`} style={{ width: MarkersSettingRow.ColorPickerWidth }}>
                    <DefinedPaletteColorPicker
                        id={this.props.markerData.id + "_color"}
                        allowNonPaletteDefaultColor={true}
                        ariaLabel={ScaledAgileResources.ConfigurationMarkerColorLabel}
                        color={this.props.markerData.color}
                        onChanged={this._onColorChanged}
                        comboHeight={32}
                        disabled={this.props.disabled}
                    />
                </div>
                {!this.props.disabled && this._renderDeleteButton()}

            </div>
        </Fabric>;
    }

    private _renderDeleteButton(): JSX.Element {
        return <div className={MarkersSettingRow.SETTING_DELETE_CONTAINER + " " + DeliveryTimeLineViewClassNameConstants.propagateKeydownEvent}
            ref={(element) => { this._deleteButtonDom = element; }}
            tabIndex={0}
            role="button"
            aria-label={ScaledAgileResources.DeleteMarkerTooltip}
            onClick={(e) => { this._onDeleteButtonClick(e); }}
            onKeyDown={(e) => { this._onDeleteButtonKeyDown(e); }}>
            <TooltipHost content={ScaledAgileResources.DeleteMarkerTooltip}>
                <i className={MarkersSettingRow.SETTING_DELETE_ICON} />
            </TooltipHost>
        </div>;
    }

    private _onDeleteButtonClick(e: React.MouseEvent<HTMLElement>) {
        this._onDeleteButtonHandler();
    }

    private _onDeleteButtonKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._onDeleteButtonHandler();
        }
        return false;
    }

    private _onDeleteButtonHandler() {
        if (!this.props.disabled) {
            this.props.onDeleteRow(this.props.markerData.id);
        }
    }
}
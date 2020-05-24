/// <reference types="react" />
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";

import { DatePicker } from "OfficeFabric/DatePicker";
import { IDropdownOption } from "OfficeFabric/Dropdown";
import { Fabric } from "OfficeFabric/Fabric";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { ReleaseProgressDataHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseProgressData";
import { TimeZone } from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import * as VssContext from "VSS/Context";
import * as Utils_Date from "VSS/Utils/Date";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalsDeploymentTime";
import { localeFormat } from "VSS/Utils/String";

export namespace ReleaseApprovalsDeploymentTimeDefaults {
    export const keyForZeroHours: number = 0;
}

export interface IReleaseApprovalsDeploymentTimeProps extends Base.IProps {
    time: Date;
    isDisabled: boolean;
    onUpdateTime: (time: Date) => void;
}

export class ReleaseApprovalsDeploymentTime extends Base.Component<IReleaseApprovalsDeploymentTimeProps, Base.IStateless> {

    constructor(props: IReleaseApprovalsDeploymentTimeProps) {
        super(props);
        this._setData(props);
    }

    public componentWillReceiveProps(props: IReleaseApprovalsDeploymentTimeProps) {
        this._setData(props);
    }

    public render(): JSX.Element {

        return (
            <Fabric>
                <div className="pipeline-approval-defer-deployment-time">
                    <DatePicker
                        disabled={!!this.props.isDisabled}
                        disableAutoFocus={true}
                        ariaLabel={Resources.ReleaseApprovalDatePickerAriaLabel}
                        onSelectDate={this._onSelectDate}
                        className="pipeline-approval-defer-deployment-datepicker"
                        value={this._dateInUserTimeZone} />
                    <div className="pipeline-hours-minutes-component">
                        <div className="hours-component">
                            {this._getDeferDeploymentHoursComponent(this._dateInUserTimeZone)}
                        </div>
                        <div className="minutes-component">
                            {this._getDeferDeploymentMinutesComponent(this._dateInUserTimeZone)}
                        </div>
                        <div className="pipeline-approval-timezone-text">
                            {this._userTimeZoneText}
                        </div>
                    </div>
                </div>
            </Fabric>
        );
    }

    private _getDeferDeploymentHoursComponent(time: Date): JSX.Element {

        const hours = time.getHours();

        return (
            <DropDownInputControl
                disabled={!!this.props.isDisabled}
                ariaLabel={Resources.ReleaseApprovalHoursSelectorAriaLabel}
                label={Utils_String.empty}
                options={this._getHoursDropdown()}
                onValueChanged={(val: IDropDownItem) => { this._handleHoursChange(val.option, val.index); }}
                selectedKey={hours}
                dropdownWidth={70}
                calloutClassName={"dropdown-style-overrides"} />
        );
    }

    private _getDeferDeploymentMinutesComponent(time: Date): JSX.Element {

        const minutes = time.getMinutes();

        return (
            <DropDownInputControl
                disabled={!!this.props.isDisabled}
                ariaLabel={Resources.ReleaseApprovalMinutesSelectorAriaLabel}
                label={Utils_String.empty}
                options={this._getMinutesDropDown()}
                onValueChanged={(val: IDropDownItem) => { this._handleMinutesChange(val.option, val.index); }}
                selectedKey={minutes}
                dropdownWidth={74}
                calloutClassName={"dropdown-style-overrides"} />
        );
    }

    private _getHoursDropdown(): IDropdownOption[] {
        let options = [{ key: ReleaseApprovalsDeploymentTimeDefaults.keyForZeroHours, text: localeFormat(Resources.HourSuffix, "00") }];

        for (let i = 1; i <= 9; i++) {
            options.push({ key: i, text: localeFormat(Resources.HourSuffix, ("0" + i)) });
        }

        for (let i = 10; i <= 23; i++) {
            options.push({ key: i, text: localeFormat(Resources.HourSuffix, i.toString()) });
        }

        return options;
    }

    private _getMinutesDropDown(): IDropdownOption[] {
        let options: IDropdownOption[] = [];
        let key = 0;
        for (let i = 0; i <= 5; i++) {
            for (let j = 0; j <= 9; j++) {
                let text = i.toString() + j.toString();
                options.push({ key: key, text: localeFormat(Resources.MinutesSuffix, text) });
                key++;
            }
        }
        return options;
    }

    private _onSelectDate = (date: Date): void => {
        this._dateInUserTimeZone.setDate(date.getDate());
        this._dateInUserTimeZone.setMonth(date.getMonth());
        this._dateInUserTimeZone.setFullYear(date.getFullYear());
        this._handleDateInUserTimeZoneChange();
    }

    private _handleHoursChange = (options: IDropdownOption, hours: number): void => {
        this._dateInUserTimeZone.setHours(hours);
        this._handleDateInUserTimeZoneChange();
    }

    private _handleMinutesChange = (options: IDropdownOption, minutes: number): void => {
        this._dateInUserTimeZone.setMinutes(minutes);
        this._handleDateInUserTimeZoneChange();
    }

    private _handleDateInUserTimeZoneChange() {
        if (this.props.onUpdateTime) {
            let dateInClientTimeZone = Utils_Date.convertUserTimeToClientTimeZone(this._dateInUserTimeZone);
            this.props.onUpdateTime(dateInClientTimeZone);
        }
    }

    private _setData(props: IReleaseApprovalsDeploymentTimeProps) {

        let timezones = ReleaseProgressDataHelper.instance().getTimeZones();

        this._userTimeZoneText = timezones
            && Utils_Array.first(timezones.validTimeZones, (zone: TimeZone) => {
                return zone.id === VssContext.getPageContext().globalization.timeZoneId;
            }).displayName;

        let date = new Date(props.time);
        this._dateInUserTimeZone = Utils_Date.convertClientTimeToUserTimeZone(date);
    }

    private _userTimeZoneText: string;
    private _dateInUserTimeZone: Date;
}
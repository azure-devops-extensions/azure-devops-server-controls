/// <reference types="react" />

import * as React from "react";

import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { IInputControlPropsBase, IInputControlStateBase, InputControlType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";
import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

import { css } from "OfficeFabric/Utilities";
import { IDropdownOption } from "OfficeFabric/Dropdown";

export interface IDurationInputComponentProps extends IInputControlPropsBase<IDuration> {
    errorMessage?: string;
    showHour?: boolean;
    showDay?: boolean;
    showMinute?: boolean;
    inputAriaDescription?: string;
    inputAriaLabel?: string;
    unitAriaLabel?: string;
}

export interface IDurationInputComponentState<T> extends IInputControlStateBase<T> {
    errorMessage?: string;
}

export interface IDuration {
    value: string;
    unit: TimeUnits;
}

export namespace TimeConstants {
    export const MinutesInDay: number = 24 * 60;
    export const MinutesInMonth: number = 30 * 24 * 60;
    export const MinutesInHour: number = 60;
    export const MinutesInYear: number = 365 * 24 * 60;
    export const HoursInYear: number = 365 * 24;
    export const HoursInDay: number = 24;
    export const DaysInYear: number = 365;
    export const DaysInMonth: number = 30;
}

export enum TimeUnits {
    Minutes = 1,
    Hours,
    Days
}

export class DurationInputComponent extends InputBase<IDuration, IDurationInputComponentProps, IDurationInputComponentState<IDuration>> {

    public componentDidMount(): void {
        this.setState({
            value: this.props.value,
            errorMessage: this.props.errorMessage
        });
    }

    public componentWillReceiveProps(nextProps: IDurationInputComponentProps): void {
        this.setState({
            value: nextProps.value,
            errorMessage: nextProps.errorMessage
        });
    }

    public getType(): string {
        return InputControlType.INPUT_TYPE_DURATION_CONTROL;
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[DurationInputComponent.getControl]: Method called.");
        return this._renderTimeComponent();
    }

    private _renderTimeComponent(): JSX.Element {
        if (!!this.props.showDay || !!this.props.showHour || !!this.props.showMinute) {
            return (
                <div className="time-container">
                    <div className="time-container-content">
                        {this._getTimeValueInputContainer()}
                        {this._getTimeUnitContainer()}
                    </div>
                    {this._getErrorMessageElement()}
                </div>
            );
        }
        else {
            return null;
        }
    }

    private _getTimeValueInputContainer(): JSX.Element {
        let selectedUnit: string = this._getSelectedUnit();
        let inputAriaLabel: string = !!this.props.inputAriaLabel ? Utils_String.format(this.props.inputAriaLabel, selectedUnit) : Utils_String.empty;
        return (
            <div className="time-value-input-container">
                <StringInputComponent
                    borderless={true}
                    inputClassName={css("time-input-textfield", { "invalid": !!this.state.errorMessage })}
                    value={!!this.state.value ? this.state.value.value : Utils_String.empty}
                    onValueChanged={this._onValueChanged}
                    ariaDescription={this.props.inputAriaDescription}
                    ariaDescribedBy={this.state.errorMessage ? this.errorElementId : null}
                    ariaLabel={inputAriaLabel}
                    disabled={this.props.disabled}
                />
            </div>
        );
    }

    private _getTimeUnitContainer(): JSX.Element {
        let selectedUnit: string = this._getSelectedUnit();
        return (
            <div className="time-unit-container" >
                {
                    this._showDropDown() ?
                        <DropDownInputControl
                            cssClass={"timeunit-dropdown"}
                            options={this._getTimeUnits()}
                            onValueChanged={(val: IDropDownItem) => { this._onUnitChanged(val.option, val.index); }}
                            selectedKey={!!this.state.value ? this.state.value.unit : this._getTimeUnits()[0].key}
                            disabled={this.props.disabled}
                            ariaLabel={this.props.unitAriaLabel} /> :
                        <div>{selectedUnit}</div>
                }
            </div>
        );
    }

    private _getTimeUnits(): IDropdownOption[] {
        let options: IDropdownOption[] = [];

        if (!!this.props.showDay) {
            options.push({ key: TimeUnits.Days, text: Resources.Days });
        }
        if (!!this.props.showHour) {
            options.push({ key: TimeUnits.Hours, text: Resources.Hours });
        }
        if (!!this.props.showMinute) {
            options.push({ key: TimeUnits.Minutes, text: Resources.Minutes });
        }

        return options;
    }

    private _getErrorMessageElement(): JSX.Element {
        return (
            !!this.state.errorMessage ?
                <ErrorComponent errorMessage={this.state.errorMessage} id={this.errorElementId} /> : null
        );
    }

    private _onValueChanged = (value: string): void => {
        let duration: IDuration = { value: value, unit: this.state.value.unit };
        this.setState({
            errorMessage: Utils_String.empty
        }, () => { this.onValueChanged(duration); });
    }

    private _onUnitChanged = (option: IDropdownOption, index: number): void => {
        let duration: IDuration = { value: this.state.value.value, unit: option.key as TimeUnits };
        this.setState({
            errorMessage: Utils_String.empty
        }, () => { this.onValueChanged(duration); });
    }

    /* 
        returns true when more than one time units are to be displayed.
    */
    private _showDropDown(): boolean {
        let unitsToDisplayCount: number = 0;

        if (this.props.showDay) {
            unitsToDisplayCount++;
        }
        if (this.props.showHour) {
            unitsToDisplayCount++;
        }
        if (this.props.showMinute) {
            unitsToDisplayCount++;
        }

        if (unitsToDisplayCount > 1) {
            return true;
        }
        else {
            return false;
        }
    }

    private _getSelectedUnit(): string {
        if (!!this.state.value) {
            switch (this.state.value.unit) {
                case TimeUnits.Days:
                    return Resources.Days;
                case TimeUnits.Hours:
                    return Resources.Hours;
                case TimeUnits.Minutes:
                    return Resources.Minutes;
            }
        }
        else {
            return this._getTimeUnits()[0].text;
        }
    }

    private errorElementId = Utils_String.format("{0}{1}{2}", this.getType(), "-errorcomponent-", Utils_String.generateUID());

}

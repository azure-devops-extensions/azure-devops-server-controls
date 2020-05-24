import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/Capacity/Components/CapacityGrid";
import * as SprintPlanningResources from "Agile/Scripts/Resources/TFS.Resources.AgileSprintPlanning";
import { CapacityActionsCreator as ActionsCreator } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityActionsCreator";
import * as Contracts from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { CapacityHelper } from "Agile/Scripts/SprintsHub/Capacity/CapacityHelper";
import { CapacityActionsButton } from "Agile/Scripts/SprintsHub/Capacity/Components/CapacityActionsButton";
import { ACTIVITY_HEADER_ID, CAPACITY_PER_DAY_HEADER_ID } from "Agile/Scripts/SprintsHub/Capacity/Components/CapacityComponentConstants";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { TextField } from "OfficeFabric/TextField";
import { css } from "OfficeFabric/Utilities";
import * as Utils_Number from "VSS/Utils/Number";

export interface IAllowedActivity {
    key: string;
    text: string;
}

export interface IActivityRowProps {
    /**
     * When true sets focus on Activity dropdown
     */
    autoFocus: boolean;

    /**
     * User Capacity object
     */
    userCapacity: Contracts.IUserCapacity;

    /**
     * Activity to render
     */
    activity: Contracts.IActivity;
    /**
     * Index of the activity in the list of activities for the user
     */
    index: number;

    /**
     * List of allowed activities to show in the Activity Dropdown
     */
    allowedActivities: IAllowedActivity[];

    /**
     * The Actions Creator
     */
    actionsCreator: ActionsCreator;

    /**
     * Does the user have permission to edit
     */
    isEditable: boolean;
}

export interface IActivityRowState {
    /** Is one of the elements in this row focused */
    isRowFocused: boolean;
}

/**
 * Renders activity row for the capacity (Activity Dropdown, CapacityPerday and Actions context menu)
 */
export class ActivityRow extends React.PureComponent<IActivityRowProps, IActivityRowState> {
    private _activityDropdown: Dropdown;

    constructor(props: IActivityRowProps) {
        super(props);
        this.state = { isRowFocused: false };
    }

    public componentDidMount() {
        if (this.props.autoFocus) {
            this._focusActivityDropdown();
        }
    }

    public render(): JSX.Element {

        const {
            userCapacity,
            activity,
            allowedActivities,
            index
        } = this.props;

        return (
            <div className={css("activity-row", { "activity-row--focused": this.state.isRowFocused })}>
                <div className="activity">
                    {this._renderActivityDropdown(activity, allowedActivities)}
                </div>
                <div className="capacityperday">
                    {this._renderCapacityPerDay(activity)}
                </div>
                <div className="actions">
                    {this._renderRowActions(userCapacity, index)}
                </div>
            </div>
        );
    }

    private _focusActivityDropdown() {
        if (this._activityDropdown) {
            this._activityDropdown.focus();
        }
    }

    private _renderActivityDropdown(
        activity: Contracts.IActivity,
        allowedActivities: IAllowedActivity[]): JSX.Element {

        return (
            <Dropdown
                ref={this._setActivityDropdown}
                aria-labelledby={ACTIVITY_HEADER_ID}
                selectedKey={activity.name}
                options={allowedActivities}
                onChanged={this._onActivityChange}
                disabled={!this.props.isEditable}
                onFocus={this._onFocus}
                onBlur={this._onBlur}
                onRenderTitle={this._onRenderTitle}
                onRenderOption={this._onRenderOption}
            />
        );
    }

    private _renderCapacityPerDay(activity: Contracts.IActivity): JSX.Element {
        return (
            <TextField
                aria-labelledby={CAPACITY_PER_DAY_HEADER_ID}
                value={activity.displayValue}
                onFocus={this._handleCapacityPerDayFocus}
                onChanged={this._onCapacityChanged}
                onGetErrorMessage={this._validateAndGetError}
                disabled={!this.props.isEditable}
                onBlur={this._onBlur}
            />
        );
    }

    /**
     * Update activity type for this activity row
     * @param option Chosen option
     */
    private _onActivityChange = (option: IDropdownOption) => {
        this.props.actionsCreator.updateActivity(this.props.userCapacity.teamMember, this.props.index, {
            ...this.props.activity,
            name: option.key as string
        });
    }

    /**
     * Update capacity for this activity row
     * @param value string value of capacity
     */
    private _onCapacityChanged = (value: string) => {
        // Pass back a capacityPerDay and capacityPerDayLocalString to the action creator. We update the store on each key stroke.
        // This is so that store data is always correct (save may be pressed at any moment via shortcut ctrl+s).
        // Local string and number must be maintained separatly because converting string -> number -> string in flux cycle can lose data.
        // For example, "1," is converted to the number 1 and saved in the store. We also have to store the value "1," so we can maintain
        // the comma character.

        this.props.actionsCreator.updateActivity(this.props.userCapacity.teamMember, this.props.index, {
            ...this.props.activity,
            capacityPerDay: this._getNumberFromLocalFormat(value),
            displayValue: value
        });
    }

    private _renderRowActions(userCapacity: Contracts.IUserCapacity, index: number): JSX.Element {

        if (this.props.isEditable) {
            return (
                <CapacityActionsButton
                    className="capacity-actions-button"
                    teamMember={userCapacity.teamMember}
                    actionsCreator={this.props.actionsCreator}
                    index={index}
                    allowRemoveActivity={userCapacity.activities.length > 1}
                />
            );
        }
    }

    private _onRenderTitle = (options: IDropdownOption[]): JSX.Element => {
        // Since we don't allow multi-select, 
        // the first option is always the one we want to render
        return this._onRenderOption(options[0]);
    }

    private _onRenderOption = (option: IDropdownOption): JSX.Element => {
        const className = !option.key ? "unassigned-capacity-activity-option" : "capacity-activity-option";
        return <div className={className} >{option.text}</div>;
    }

    private _handleCapacityPerDayFocus = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        this._onFocus();
        const area = event.target as HTMLTextAreaElement;
        area.select();
    }

    private _setActivityDropdown = (dropdown: Dropdown) => {
        this._activityDropdown = dropdown;
    }

    /**
     * Validate that input is valid positive number (localized)
     * @param value to validate (local string)
     * @returns string - error message to display
     */
    private _validateAndGetError(value: string): string {
        const num = Utils_Number.parseLocale(value);
        return CapacityHelper.isCapacityNumberValid(num) ? "" : SprintPlanningResources.Capacity_ValueNotValid;
    }

    /**
     * Get valid number from input.  Will convert from local format (i.e. 1,3 to 1.3).  Returns NaN if not valid input.
     * @param value number in string format
     * @returns value as number or NaN if value is not a valid number
     */
    private _getNumberFromLocalFormat(value: string): number {
        return Utils_Number.parseLocale(value);
    }

    private _onFocus = () => {
        this.setState({ isRowFocused: true });
    }

    private _onBlur = () => {
        this.setState({ isRowFocused: false });
    }
}

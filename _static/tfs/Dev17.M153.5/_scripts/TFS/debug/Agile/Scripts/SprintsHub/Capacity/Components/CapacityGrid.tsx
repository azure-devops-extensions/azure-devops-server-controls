import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/Capacity/Components/CapacityGrid";
import { IFormFieldState } from "Agile/Scripts/Common/ValidationContracts";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import * as CapacityPivotResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.CapacityPivot";
import { CapacityActionsCreator } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityActionsCreator";
import * as Contracts from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import * as Constants from "Agile/Scripts/SprintsHub/Capacity/Components/CapacityComponentConstants";
import { CapacityRow, ICapacityRowFocusProps } from "Agile/Scripts/SprintsHub/Capacity/Components/CapacityRow";
import { DaysOffDialog } from "Agile/Scripts/SprintsHub/Capacity/Components/DaysOffDialog";
import { DaysOffRenderer } from "Agile/Scripts/SprintsHub/Capacity/Components/DaysOffRenderer";
import { DaysOffValidators } from "Agile/Scripts/SprintsHub/Capacity/Components/DaysOffValidators";
import * as DaysOffUtils from "Agile/Scripts/SprintsHub/Capacity/DaysOffUtils";
import { ISprintCapacityOptions } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { List } from "OfficeFabric/List";
import { Debug } from "VSS/Diag";

export interface ICapacityGridProps {
    capacity: Contracts.ICapacity;
    capacityOptions: ISprintCapacityOptions;
    actionsCreator: CapacityActionsCreator;
    iteration: Iteration;
    focusDetails: Contracts.ICapacityGridFocusDetails;
}

export interface ICapacityGridState {
    dialogState: IDialogState;
}

export interface IDialogState {
    dialogIsHidden: boolean;
    daysOff: Contracts.IDaysOff[];
    user?: Contracts.IUser;
}

export class CapacityGrid extends React.Component<ICapacityGridProps, ICapacityGridState> {
    constructor(props: ICapacityGridProps) {
        super(props);

        this.state = {
            dialogState: {
                dialogIsHidden: true,
                daysOff: [],
                user: null
            }
        } as ICapacityGridState;
    }

    public render() {
        const {
            capacity,
            capacityOptions
        } = this.props;

        const {
            dialogIsHidden,
            daysOff,
            user
        } = this.state.dialogState;

        if (capacity && capacityOptions) {
            let dialog = null;

            if (!dialogIsHidden) {
                dialog = (
                    <DaysOffDialog
                        dateRangeValidator={this._dateRangeValidator}
                        validateDaysOff={this._validateDaysOff}
                        isHidden={dialogIsHidden}
                        daysOff={daysOff}
                        currentUser={user}
                        onDismiss={this._onDismissed}
                        onSave={this._onDaysOffUpdated}
                    />
                );
            }

            return (
                <div className="capacity-grid" data-is-scrollable={true}>
                    <div className="capacity-grid-header">
                        {this._renderHeader()}
                    </div>
                    <List
                        className="capacity-grid-body"
                        items={capacity.userCapacities}
                        onRenderCell={this._renderCell}
                    />
                    {this._renderTeamDaysOff()}
                    {dialog}
                </div>
            );
        }

        return null;
    }

    private _renderHeader(): JSX.Element {
        const {
            capacityOptions
        } = this.props;

        return (
            <div className="capacity-header">
                <div className="user-header">{CapacityPivotResources.Header_User}</div>
                <div id={Constants.DAYS_OFF_HEADER_ID} className="daysoff-header">{CapacityPivotResources.Header_DaysOff}</div>
                <div id={Constants.ACTIVITY_HEADER_ID} className="activity-header">{capacityOptions.activityFieldDisplayName}</div>
                <div id={Constants.CAPACITY_PER_DAY_HEADER_ID} className="capacityperday-header">{CapacityPivotResources.Header_CapacityPerDay}</div>
            </div>
        );
    }

    private _renderTeamDaysOff(): JSX.Element {
        return (
            <div className="capacity-row team-days-off-row">
                <div className="user">{CapacityPivotResources.TeamDaysOff}</div>
                <DaysOffRenderer
                    daysOff={this.props.capacity.teamDaysOff}
                    onOpenDaysOff={this._daysOffClick}
                />
                <div className="activity-row-container">
                    {CapacityPivotResources.TeamDaysOffDescriptionText}
                </div>
            </div>
        );
    }

    private _renderCell = (userCapacity: Contracts.IUserCapacity, index: number): JSX.Element => {
        let focusProps: ICapacityRowFocusProps = null;
        if (this.props.focusDetails) {
            const autoFocus = userCapacity.teamMember.id === this.props.focusDetails.teamMember.id;

            if (autoFocus) {
                focusProps = {
                    focusDaysOff: this.props.focusDetails.focusDaysOff,
                    focusedActivityIndex: this.props.focusDetails.focusedActivityIndex
                };
            }
        }

        return (
            <CapacityRow
                focusProps={focusProps}
                key={userCapacity.teamMember.id}
                userCapacity={userCapacity}
                actionsCreator={this.props.actionsCreator}
                allowedActivities={this.props.capacityOptions.allowedActivities}
                onDaysOffClicked={this._daysOffClick}
                isEditable={this.props.capacityOptions.isEditable}
            />
        );
    }

    private _dateRangeValidator = (currentState: IFormFieldState<Contracts.IDaysOff>[], indexModified: number, newStart: Date, newEnd: Date): IFormFieldState<Contracts.IDaysOff>[] => {
        if (indexModified === currentState.length - 1 && currentState[indexModified].pristine && !newStart && !newEnd) {
            return currentState;
        }

        const iterationStartDate = this.props.iteration.startDateUTC;
        const iterationEndDate = this.props.iteration.finishDateUTC;
        // First validate this new date range is acceptable
        const validationResult = DaysOffValidators.getDaysOffValidationResult(iterationStartDate, iterationEndDate, newStart, newEnd);
        currentState[indexModified] = {
            pristine: false,
            validationResult,
            value: {
                start: newStart,
                end: newEnd,
                netDaysOff: DaysOffUtils.calculateNetTeamDaysOff({ start: newStart, end: newEnd, ratio: 1 }, this.props.capacityOptions.weekends, iterationStartDate, iterationEndDate)
            } as Contracts.IDaysOff
        };

        if (!validationResult.isValid) {
            return currentState;
        }

        // Next validate all date ranges aren't within each other
        return DaysOffValidators.runDateRangeOverlapValidation(currentState);
    }

    private _validateDaysOff = (daysOff: Contracts.IDaysOff[]): IFormFieldState<Contracts.IDaysOff>[] => {
        return daysOff.map((d) => {
            return {
                pristine: false,
                value: { ...d },
                validationResult: DaysOffValidators.getDaysOffValidationResult(this.props.iteration.startDateUTC, this.props.iteration.finishDateUTC, d.start, d.end)
            } as IFormFieldState<Contracts.IDaysOff>;
        });
    }

    private _daysOffClick = (daysOff: Contracts.IDaysOff[], user?: Contracts.IUser): void => {
        this.setState({ dialogState: { dialogIsHidden: false, daysOff, user } });
    }

    private _onDaysOffUpdated = (newDaysOff: Contracts.IDaysOff[], user?: Contracts.IUser): void => {
        Debug.assertIsNotNull(newDaysOff);

        if (user) {
            this.props.actionsCreator.updateUserDaysOff(user, newDaysOff);
        } else {
            this.props.actionsCreator.updateTeamDaysOff(newDaysOff);
        }

        this._hideDialog();
    }

    private _onDismissed = (): void => {
        this._hideDialog();
    }

    private _hideDialog() {
        this.setState({ dialogState: { dialogIsHidden: true, daysOff: [], user: null } });
    }
}

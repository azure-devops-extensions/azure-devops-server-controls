import { CapacityActionsCreator } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityActionsCreator";
import * as Contracts from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { CapacityHelper } from "Agile/Scripts/SprintsHub/Capacity/CapacityHelper";
import { ActivityRow, IAllowedActivity } from "Agile/Scripts/SprintsHub/Capacity/Components/ActivityRow";
import { CapacityUser } from "Agile/Scripts/SprintsHub/Capacity/Components/CapacityUser";
import { DaysOffRenderer } from "Agile/Scripts/SprintsHub/Capacity/Components/DaysOffRenderer";
import { Capacity_Unassigned } from "Agile/Scripts/Resources/TFS.Resources.AgileSprintPlanning";
import * as React from "react";

export interface ICapacityRowProps {
    userCapacity: Contracts.IUserCapacity;
    allowedActivities: string[];
    actionsCreator: CapacityActionsCreator;
    onDaysOffClicked: (daysOff: Contracts.IDaysOff[], user?: Contracts.IUser) => void;
    isEditable: boolean;
    focusProps?: ICapacityRowFocusProps;
}

export interface ICapacityRowFocusProps {
    /**
     * When true focuses on daysOff
     */
    focusDaysOff: boolean;

    /**
     * Sets focus on activity dropdown of given activityIndex, ignored if focusDaysOff is true
     */
    focusedActivityIndex: number;
}

export class CapacityRow extends React.Component<ICapacityRowProps> {
    constructor(props: ICapacityRowProps) {
        super(props);
    }

    public render() {
        const userCapacity = this.props.userCapacity;
        return (
            <div
                className="capacity-row"
                role="group"
                aria-label={userCapacity.teamMember.displayName}
            >
                {this._renderUserControl(userCapacity)}
                {this._renderDaysOffCell(userCapacity)}
                {this._renderActivityRowContainer(userCapacity)}
            </div>
        );
    }

    public shouldComponentUpdate(nextProps: ICapacityRowProps) {
        const {
            teamMember
        } = this.props.userCapacity;

        return teamMember.id !== nextProps.userCapacity.teamMember.id ||
            !this._activitiesMatch(nextProps.userCapacity.activities) ||
            !this._daysOffMatch(nextProps.userCapacity.daysOff);
    }

    /**
     * Displays "Activity" and "Capacity Per Day" cells for the user
     */
    private _renderActivityRowContainer(userCapacity: Contracts.IUserCapacity): JSX.Element {
        const allowedActivities = this.props.allowedActivities.slice(0).map((a) => {
            return {
                key: a,
                text: a
            };
        });

        allowedActivities.unshift({
            key: "",
            text: Capacity_Unassigned
        });

        const activityRows = userCapacity.activities.map((activity, index) => {
            return this._renderActivityRow(userCapacity, activity, index, allowedActivities);
        });

        return (
            <div className="activity-row-container">
                {activityRows}
            </div>
        );
    }

    private _renderActivityRow(userCapacity: Contracts.IUserCapacity, activity: Contracts.IActivity, index: number, allowedActivities: IAllowedActivity[]): JSX.Element {
        return (
            <ActivityRow
                autoFocus={this.props.focusProps && this.props.focusProps.focusedActivityIndex === index}
                key={userCapacity.teamMember.id + index}
                userCapacity={userCapacity}
                activity={activity}
                index={index}
                allowedActivities={allowedActivities}
                actionsCreator={this.props.actionsCreator}
                isEditable={this.props.isEditable}
            />);
    }

    /**
     * Gets the control to display the user
     */
    private _renderUserControl(userCapacity: Contracts.IUserCapacity): JSX.Element {
        return <CapacityUser {...userCapacity.teamMember} />;
    }

    /**
     * Displays Days Off cell for the user
     */
    private _renderDaysOffCell(userCapacity: Contracts.IUserCapacity): JSX.Element {
        return (
            <DaysOffRenderer
                autoFocus={this.props.focusProps && this.props.focusProps.focusDaysOff}
                user={userCapacity.teamMember}
                daysOff={userCapacity.daysOff}
                onOpenDaysOff={this.props.onDaysOffClicked}
            />
        );
    }

    private _activitiesMatch(other: Contracts.IActivity[]) {
        if (this.props.userCapacity.activities.length !== other.length) {
            return false;
        }

        let ret = true;
        this.props.userCapacity.activities.forEach((act, index) => {
            if (!CapacityHelper.isActivityEqual(act, other[index])) {
                ret = false;
            }
        });

        return ret;
    }

    private _daysOffMatch(other: Contracts.IDaysOff[]) {
        if (this.props.userCapacity.daysOff.length !== other.length) {
            return false;
        }

        let ret = true;
        this.props.userCapacity.daysOff.forEach((dayOff, index) => {
            //We do not care about start and end dates as we only display netDaysOff
            if (dayOff.netDaysOff !== other[index].netDaysOff) {
                ret = false;
            }
        });

        return ret;
    }
}
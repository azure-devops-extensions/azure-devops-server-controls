import * as React from "react";

import * as Resources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.CapacityPivot";
import { CapacityActionsCreator as ActionsCreator } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityActionsCreator";
import * as Contracts from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import * as Diag from "VSS/Diag";
import { MoreActionsButton } from "VSSUI/ContextualMenuButton";

export interface ICapacityActionsButtonProps {
    /** Class name for the control */
    className: string;

    /** User Capacity */
    teamMember: Contracts.IUser;

    /** Index of the activity the actions menu is for */
    index: number;

    /** The actions creator */
    actionsCreator: ActionsCreator;

    /** Allows remove activity */
    allowRemoveActivity: boolean;
}

const ADD_ACTIVITY_KEY = "ADD_ACTIVITY_KEY";
const REMOVE_ACTIVITY_KEY = "REMOVE_ACTIVITY_KEY";
const REMOVE_USER_KEY = "REMOVE_USER_KEY";

export class CapacityActionsButton extends React.Component<ICapacityActionsButtonProps> {
    public render() {
        return (
            <MoreActionsButton
                title={Resources.Actions}
                className={this.props.className}
                allocateSpaceWhileHidden={true}
                getItems={this._getItems}
            />
        );
    }

    public shouldComponentUpdate(nextProps: ICapacityActionsButtonProps) {
        const props = this.props;
        return props.teamMember.id !== nextProps.teamMember.id ||
            props.index !== nextProps.index ||
            props.allowRemoveActivity !== nextProps.allowRemoveActivity;
    }

    private _getItems = (): IContextualMenuItem[] => {
        const items: IContextualMenuItem[] = [
            {
                name: Resources.Capacity_AddActivity,
                key: ADD_ACTIVITY_KEY,
                data: this.props,
                iconProps: { iconName: "Add" },
                onClick: this._onRowActionClicked
            },
            {
                name: Resources.Capacity_RemoveUser,
                key: REMOVE_USER_KEY,
                data: this.props,
                iconProps: { iconName: "Clear" },
                onClick: this._onRowActionClicked
            }
        ];

        // Insert remove activity item if remove Activity is allowed
        if (this.props.allowRemoveActivity) {
            items.splice(1, 0, {
                name: Resources.Capacity_RemoveActivity,
                key: REMOVE_ACTIVITY_KEY,
                data: this.props,
                iconProps: { iconName: "Clear" },
                onClick: this._onRowActionClicked
            });
        }

        return items;
    }

    private _onRowActionClicked = (ev?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem): void => {
        if (!item) {
            Diag.Debug.fail("Context menu item is null.");
            return;
        }

        if (item.key === ADD_ACTIVITY_KEY) {
            this.props.actionsCreator.insertEmptyActivity(this.props.teamMember, this.props.index + 1);
        } else if (item.key === REMOVE_ACTIVITY_KEY) {
            this.props.actionsCreator.removeActivity(this.props.teamMember, this.props.index);
        } else if (item.key === REMOVE_USER_KEY) {
            this.props.actionsCreator.removeUser(this.props.teamMember);
        }
    }
}
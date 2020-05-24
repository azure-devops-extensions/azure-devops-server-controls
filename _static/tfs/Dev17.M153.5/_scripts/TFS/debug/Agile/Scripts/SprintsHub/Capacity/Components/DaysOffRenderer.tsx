import * as React from "react";

import * as CapacityPivotResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.CapacityPivot";
import { IDaysOff, IUser } from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { DAYS_OFF_HEADER_ID } from "Agile/Scripts/SprintsHub/Capacity/Components/CapacityComponentConstants";
import { getTotalDaysOff } from "Agile/Scripts/SprintsHub/Capacity/DaysOffUtils";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

export interface IDaysOffRendererProps {
    daysOff: IDaysOff[];
    onOpenDaysOff: (daysOff: IDaysOff[], user?: IUser) => void;
    user?: IUser;
    autoFocus?: boolean;
}

export class DaysOffRenderer extends React.Component<IDaysOffRendererProps> {
    private _anchor: HTMLAnchorElement;

    public componentDidMount() {
        this._tryFocus();
    }

    public componentDidUpdate() {
        this._tryFocus();
    }

    public render() {
        const numDaysOff = getTotalDaysOff(this.props.daysOff);

        const formatString = numDaysOff === 1 ? CapacityPivotResources.Capacity_DayOff : CapacityPivotResources.Capacity_DaysOff;
        const daysOffMessage = Utils_String.format(formatString, numDaysOff);

        return (
            <div className="daysoff">
                <a
                    ref={this._setAnchorRef}
                    role="button"
                    onClick={this._OnOpenDaysOff}
                    onKeyPress={this._onKeyPress}
                    tabIndex={0}
                    aria-labelledby={DAYS_OFF_HEADER_ID}
                >
                    {daysOffMessage}
                </a >
            </div>
        );
    }

    private _onKeyPress = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.charCode === KeyCode.ENTER ||
            e.charCode === KeyCode.SPACE) {
            this._OnOpenDaysOff();
            // Stop the browser from POSTing back by default
            e.preventDefault();
            e.stopPropagation();
        }
    }

    private _tryFocus() {
        if (this.props.autoFocus && this._anchor) {
            this._anchor.focus();
        }
    }

    private _setAnchorRef = (anchor: HTMLAnchorElement): void => {
        this._anchor = anchor;
    }

    private _OnOpenDaysOff = () => {
        this.props.onOpenDaysOff(this.props.daysOff, this.props.user);
    }
}
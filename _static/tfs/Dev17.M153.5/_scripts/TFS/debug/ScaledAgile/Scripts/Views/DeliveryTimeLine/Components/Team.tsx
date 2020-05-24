/// <reference types="react" />

import * as React from "react";

import { TeamSidePanel } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/TeamSidePanel";
import { Intervals } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Intervals";
import { ITeam } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { IDeliveryTimeLineActionsCreator } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActionsCreator";
import { ICardRenderingOptions } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { IDeliveryTimeLineStoreData } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";

export interface ITeamProps {
    actionsCreator: IDeliveryTimeLineActionsCreator;
    storeData: IDeliveryTimeLineStoreData;
    key: string;
    team: ITeam;
    scrollingLeftOffset: number;
    worldStartDate: Date;
    zoomLevelInPixelPerDay: number;
    cardRenderingOptions: ICardRenderingOptions;
    isCardBeingDragged?: (isDragged: boolean) => void;
}

/**
 * Represent a single team. The Delivery Timeline container a collection of team. It has a side panel
 * to display information about the team as well as its own collection of interval. This allow team
 * to have different sprint/interation time.
 */
export class Team extends React.Component<ITeamProps, {}> {
    /**
     * This field indicates whether this team is in view port or not.
     * Right now, before we reach to componentShouldUpdate, the props have already been updated to nextProps,
     * so we could not compare the previous state and next state. Once immutable is introduced, these field can be removed.
     */
    private _isInViewport: boolean = true;
    /**
     * This field indicates this team's current height.
     * Right now, before we reach to componentShouldUpdate, the props have already been updated to nextProps,
     * so we could not compare the previous state and next state. Once immutable is introduced, these field can be removed.
     */
    private _height: number = 0;

    public render(): JSX.Element {
        return <div className="team" style={{ height: this.props.team.height }}>
            {this._renderTeam()}
        </div>;
    }

    private _renderTeam(): JSX.Element[] {
        if (this.props.team.isInViewport) {
            return [
                <TeamSidePanel
                    key={"teamSidePanel-" + this.props.team.key}
                    actionsCreator={this.props.actionsCreator}
                    storeData={this.props.storeData}
                    scrollingLeftOffset={this.props.scrollingLeftOffset}
                    team={this.props.team}
                    height={this.props.team.height} />,
                <Intervals
                    actionsCreator={this.props.actionsCreator}
                    storeData={this.props.storeData}
                    key={"intervals-" + this.props.team.key}
                    team={this.props.team}
                    worldStartDate={this.props.worldStartDate}
                    zoomLevelInPixelPerDay={this.props.zoomLevelInPixelPerDay}
                    cardRenderingOptions={this.props.cardRenderingOptions}
                    isCardBeingDragged={this.props.isCardBeingDragged}
                    />
            ];
        }
        return null;
    }

    /**
     * Component is updated only if:
     * 1. The team height has been changed. Or
     * 2. The team has a portion or fully in the viewport. Or
     * 3. The team is previous in view port, and now it is being moved out of viewport.
     * If team height change, we always re-render the team no matter it is in viewport or not.
     *
     * @param {ITeamProps} nextProps - The next props of the team
     * @param {any} nextState - Not used
     */
    public shouldComponentUpdate(nextProps: ITeamProps, nextState: any): boolean {
        if (this._height !== nextProps.team.height) {
            this._height = nextProps.team.height;
            this._isInViewport = nextProps.team.isInViewport;
            return true;
        }

        let shouldUpdate = nextProps.team.isInViewport || this._isInViewport;
        this._isInViewport = nextProps.team.isInViewport;
        return shouldUpdate;
    }
}

/// <reference types="react" />

import * as React from "react";

import { IDeliveryTimeLineStoreData } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { Interval } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Interval";
import { IDeliveryTimeLineActionsCreator } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActionsCreator";
import { ITeam, IntervalFocusIdentifier, LoadMoreFocusIdentifier, AddNewItemFocusIdentifier } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { DeliveryTimeLineViewConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import { ICardRenderingOptions } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { DeliveryTimelineFocusUtils } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelineFocusUtils";
import { KeyCode } from "VSS/Utils/UI";
import { Movement, KeyToMovementMap } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineModels";
import { autobind } from "OfficeFabric/Utilities";

export interface IIntervalsProps {
    actionsCreator: IDeliveryTimeLineActionsCreator;
    storeData: IDeliveryTimeLineStoreData;
    key: string;
    team: ITeam;
    worldStartDate: Date;
    zoomLevelInPixelPerDay: number;
    cardRenderingOptions: ICardRenderingOptions;
    isCardBeingDragged?: (isDragged: boolean) => void;
}

/**
 * Contains multiple interval. Each team has a collection of interval which can be a sprint or iteration.
 */
export class Intervals extends React.Component<IIntervalsProps, {}> {

    public render() {
        const intervalToFocus: IntervalFocusIdentifier = DeliveryTimelineFocusUtils.getCurrentIntervalFocusIdentifier(this.props.storeData);
        const loadMoreItemToFocus: LoadMoreFocusIdentifier = DeliveryTimelineFocusUtils.getCurrentLoadMoreFocusIdentifier(this.props.storeData);
        const addNewItemMenuToFocus: AddNewItemFocusIdentifier = DeliveryTimelineFocusUtils.getCurrentAddNewItemFocusIdentifier(this.props.storeData);

        let intervalComponents: JSX.Element[] = [];
        const { team } = this.props;
        if (team) {
            const { intervals } = this.props.team;
            if (intervals && intervals.length > 0) {
                intervals.forEach(interval => {
                    intervalComponents.push(<Interval
                        actionsCreator={this.props.actionsCreator}
                        storeData={this.props.storeData}
                        key={team.key + "-" + interval.id}
                        interval={interval}
                        team={this.props.team}
                        zoomLevelInPixelPerDay={this.props.zoomLevelInPixelPerDay}
                        cardRenderingOptions={this.props.cardRenderingOptions}
                        isCardBeingDragged={this.props.isCardBeingDragged}
                        focusContainerOnRender={intervalToFocus && intervalToFocus.intervalId == interval.id && intervalToFocus.teamKey == team.key}
                        focusLoadMoreOnRender={loadMoreItemToFocus && loadMoreItemToFocus.intervalId == interval.id && loadMoreItemToFocus.teamKey == team.key}
                        focusNewItemMenuOnRender={addNewItemMenuToFocus && addNewItemMenuToFocus.intervalId == interval.id && addNewItemMenuToFocus.teamKey == team.key}
                        onKeyDown={this._onIntervalKeyDown}
                        />);
                });
            }
        }

        return <div className="intervals" style={{ marginLeft: DeliveryTimeLineViewConstants.teamSidebarWidth }}>
            {intervalComponents}
        </div>;
    }

    @autobind
    private _onIntervalKeyDown(interval: Interval, e: React.KeyboardEvent<HTMLElement>) {
        const eventHandled = () => {
            e.stopPropagation();
            e.preventDefault();
        };
        
        if (e.shiftKey && e.keyCode === KeyCode.PAGE_UP) {
            eventHandled();
            this.props.actionsCreator.focusAdjacentObjectToTeam(this.props.team, Movement.Up);
        }
        else if (e.shiftKey && e.keyCode === KeyCode.PAGE_DOWN) {
            eventHandled();
            this.props.actionsCreator.focusAdjacentObjectToTeam(this.props.team, Movement.Down);
        }

        if (e.isPropagationStopped() || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
            return;
        }

        let direction: Movement = KeyToMovementMap[e.keyCode] || Movement.None;
        if (direction !== Movement.None) {
            eventHandled();
            this.props.actionsCreator.focusAdjacentObjectToInterval(this.props.team, interval.props.interval, direction);
        }
    }
}

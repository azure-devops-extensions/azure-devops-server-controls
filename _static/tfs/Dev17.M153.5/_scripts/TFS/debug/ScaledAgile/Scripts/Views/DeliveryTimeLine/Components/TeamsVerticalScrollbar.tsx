/// <reference types="react" />

import * as React from "react";
import { DeliveryTimeLineViewConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import { DelayedQueue } from "ScaledAgile/Scripts/Shared/Utils/DelayedQueue";
import { IViewportMovedDelta, Movement, MovementType } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineModels";

export interface ITeamsVerticalScrollbarProps {
    /**
     * Callback when a vertical change is produced by the scrollbar
     */
    onScroll: (scrollTop: number) => void;
    /**
     * World height in pixel to set the fake scroll bar's container height.
     */
    worldHeight: number;
    /**
     * Viewport height in pixel to be able to setup the height of the scrollbar.
     */
    viewportHeight: number;
    /**
     * Viewport top position to set the elevator of the scroll at the right position.
     */
    top: number;

    /**
     * Callback when the scroll is "done"
     */
    scrollDone: (movement: Movement, movementType: MovementType) => void;
}

/**
 * Vertical scrollbar for Teams component
 *
 * This use the default browser scrollbar in a fake div which is synchronized with the world height.
 * Hence, the scrollbar height is representing the delivery time line container without being inside
 * the container.
 */
export class TeamsVerticalScrollbar extends React.Component<ITeamsVerticalScrollbarProps, {}> {

    /**
     * The scrollbar's DOM. We bind to the scroll event to be able to trigger a vertical movement.
     */
    private _scrollbarDom: HTMLDivElement;

    /**
     * True when the scrollbar position is updated by the user using the escalator of the scroll.
     * False when the scrollbar position is updated by mousewheel, drag, or other mechanism else than the scroll.
     */
    private _scrollbarUpdatedByScrollBar: boolean = false;

    private _scrollQueue: DelayedQueue<IViewportMovedDelta>;

    constructor(props: ITeamsVerticalScrollbarProps, context?: any) {
        super(props, context);
        this._scrollQueue = new DelayedQueue<IViewportMovedDelta>((e) => this._notifyTelemetry(e), 2000); //This is set to a bigger tempo to not spam the telemetry
    }


    /**
     * This is called with a big delay on the onScroll to avoid spamming the telemetry
     */
    private _notifyTelemetry(queueData: IViewportMovedDelta[]): void {
        if (queueData) {
            const len = queueData.length;
            if (len > 0) {
                let sumMovement = 0;
                for (let i = 0; i < len; i++) {
                    sumMovement += queueData[i].vertical;
                }
                const movement = sumMovement >= 0 ? Movement.Down : Movement.Up;
                this.props.scrollDone(movement, MovementType.Scrollbar);
            }
        }
    }

    /**
     * Synchronize the scrollbar position when top position of Teams got updated 
     */
    public componentDidUpdate() {
        // synchronize the scrollTop position of Teams component only if when updating from the UI (not the scrollbar itself)
        if (this._scrollbarDom) {
            if (!this._scrollbarUpdatedByScrollBar) {
                if (this.props.top !== this._scrollbarDom.scrollTop) {
                    this._scrollbarDom.scrollTop = this.props.top; // [Warning]: This is expensive in term of performance
                }
            }
            else {
                this._scrollbarUpdatedByScrollBar = false;
            }
        }
    }

    /**
     * Lifecycle override to stop unneccessary re-rendering.
     * We render only if the height has changed or the vertical position has changed.
     *
     * @param nextProps the props the component will receive
     * @param nextState the state the component will receive
     */
    public shouldComponentUpdate(nextProps: ITeamsVerticalScrollbarProps, nextState: any): boolean {
        // this can happen when you are already bottom of screen and trying to scroll down. Same is true when going up after reaching top
        if (nextProps.worldHeight === this.props.worldHeight &&
            nextProps.viewportHeight === this.props.viewportHeight &&
            nextProps.top === this.props.top) {
            return false;
        }

        return true;
    }

    private _handleScrollEvent = (e: React.UIEvent<HTMLDivElement>): void => {
        this._scrollbarUpdatedByScrollBar = true;
        const scrollTop = this._scrollbarDom.scrollTop;
        this.props.onScroll(scrollTop);
        const verticalMovement = scrollTop - this.props.top;
        if (verticalMovement !== 0) {
            this._scrollQueue.add({ horizontal: 0, vertical: verticalMovement } as IViewportMovedDelta);
        }
    };

    public render(): JSX.Element {
        const shouldShowScrollbar = this.props.worldHeight > this.props.viewportHeight;
        if (!shouldShowScrollbar) {
            return null;
        }

        const componentSytle: React.CSSProperties = {
            top: DeliveryTimeLineViewConstants.teamsVerticalScrollbarTop,
            height: this.props.viewportHeight
        };

        return <div ref={(div: HTMLDivElement) => this._scrollbarDom = div}
            className="vertical-scrollbar-container"
            style={componentSytle}
            onScroll={this._handleScrollEvent}>
            <div className="content" style={{ height: this.props.worldHeight }} />
        </div>;
    }

    /**
     * Kill the Delayed Queue
     */
    public componentWillUnmount() {
        this._scrollQueue.end();
    }
}

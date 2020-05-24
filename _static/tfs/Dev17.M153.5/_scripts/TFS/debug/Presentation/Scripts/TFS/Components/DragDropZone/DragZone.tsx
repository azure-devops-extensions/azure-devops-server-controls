///<amd-dependency path="jQueryUI/effect"/>
///<amd-dependency path="jQueryUI/sortable"/>
/// <reference types="jqueryui" />

import * as React from "react";
import { DragDropContext, IDragPayload } from "Presentation/Scripts/TFS/Components/DragDropZone/DragDropContext";
import * as Diag from "VSS/Diag";
import { DragDropUtils } from "Presentation/Scripts/TFS/Components/DragDropZone/DragDropUtils";

/**
 * What: Props for DragZone
 * Why: Needs configuration about what we are dragging to have the DropZone connected accordingly.
 */
export interface IDragZoneProps extends React.Props<void> {
    /**
     * What: Unique identifier for the DragZone
     * Why: Needed because the Drag and Drop mechanism rely on getting the Dom with ID 
     */
    id: string;

    idContext: string;

    /**
     * What: Drag zone types. Can be single one or multiple one but needs at least one.
     * Why: Will link to zoneType of DropZone to know if the drag element is acceptable.
     */
    zoneTypes: string[];

    /**
     * What: Data passed to the DragDropContext when a drag starts
     * Why: We can do logic when dropped from the payload to know if it's valid or to save the element and have a React re-render.  
     */
    payload: any;

    /**
     * What: Allows to have custom style by CSS's class
     * Why: DragZone wraps a component and we can define a more accurate selector depending if the children is draggable
     */
    className?: string;

    /**
     * What: Allows to have CSS style directly into the DragZone
     * Why: Entry point to have dynamic dimension associated with TypeScript
     */
    style?: any;

    /**
     * What: Method invoked before onStart
     * Why: Allow to cancel or not
     *      Return true = start; false = cancel
     */
    shouldCancelStartDrag?: () => boolean;
}

/**
 * What: A DragZone is a component that wrap and existing React component. It supports two mode which is an immediate drag or a delayed one.
 *      The configuration for immediate or delay is setup by setting a delay in the DragDropContext
 * Why: It allows an existing component to be moved without altering this one.
 */
export class DragZone extends React.Component<IDragZoneProps, {}> {
    public static DRAG_ZONE_CSS: string = "drag-zone";

    public refs: {
        [key: string]: Element;
        sortableDom: HTMLDivElement;
    };

    /**
     * Make sure we only have one timeout per press
     */
    private _isPressed: boolean = false;

    /**
     * What: Events that the DragZone listen. The notifier is a DropZone. It allows the DragZone to react to
     *      a completed drop and reseting some values
     * Why: We need to have the React's DragZone to get awareness of when a drop is done.
     */
    private _dropStopListener: (payload: IDragPayload) => void;

    /**
     * What: Instance to the timer to be able to cancel this one. 
     * Why: Clearing the timer remove the possibility to quicky stop a drag and start a new one within the window of the timer.
     */
    private _timeout: number;

    public render(): JSX.Element {
        const classDragDrop = DragZone.DRAG_ZONE_CSS + " " + DragDropUtils.arrayTypesToStringClasses(this.props.zoneTypes) + " " + (this.props.className || "");
        const styleDragDrop = this.props.style || {};
    return <div ref="sortableDom"
            id={this.props.id}
            className={classDragDrop}
            style={styleDragDrop}
            >
            {this.props.children}
        </div>;
    }

    /**
     * After component is mounted, wrap the component with sortable with provided sortable options.
     */
    public componentDidMount() {
        this._dropStopListener = (payload: IDragPayload) => { this._resetDrag(); };
        DragDropContext.getInstance(this.props.idContext).dropZoneStop.addObserver(this._dropStopListener);
        if (DragDropContext.getInstance(this.props.idContext).isDelayEnabled()) {
            $(this.refs.sortableDom)
                .mousedown((e: JQueryMouseEventObject) => { this._mouseDown(e); })
                .mouseup((e: JQueryMouseEventObject) => { this._mouseUp(e); });
        }

    }

    public componentWillUnmount() {
        DragDropContext.getInstance(this.props.idContext).dropZoneStop.removeObserver(this._dropStopListener);
        $(this.refs.sortableDom).off(); // Clean all events
        Diag.Debug.logVerbose("DragZone unmount");
    }

    private _mouseDown(event: Event): void {
        if (DragDropContext.getInstance(this.props.idContext).isDelayEnabled()) {
            if (!this._isPressed) {
                this._isPressed = true;
                Diag.Debug.logInfo("DropZone: Attach mouse move on");
                this._timeout = setTimeout(() => {
                    const shouldCancelDrag = this.props.shouldCancelStartDrag && this.props.shouldCancelStartDrag();
                    Diag.Debug.logInfo("DropZone: Click Timeout. DragZonePressed [" + this._isPressed + "], shouldCancelDragZone [" + shouldCancelDrag + "]");
                    if (this._isPressed && !shouldCancelDrag) {
                        Diag.Debug.logInfo("DropZone: Click Timeout + Ready to init Sortable");
                        DragDropContext.getInstance(this.props.idContext).dragZoneStart.notify({ event: event } as IDragPayload);
                    }
                }, DragDropContext.getInstance(this.props.idContext).delayIsMsBeforeDrag);
            }
            else {
                Diag.Debug.logInfo("DropZone: Already pressed");
            }
        }
        else {
            DragDropContext.getInstance(this.props.idContext).dragZoneStart.notify({ event: event } as IDragPayload);
        }
    }

    /**
     * What: The user release the drag
     * Why: Reset some delayed drag information + notify that the drag from the DragZone perspective is over
     */
    private _mouseUp(event: Event): void {
        if (DragDropContext.getInstance(this.props.idContext).isDelayEnabled()) {
            Diag.Debug.logInfo("DropZone: mouseUp");
            this._resetDrag();
        }
        DragDropContext.getInstance(this.props.idContext).dragZoneStop.notify({ event: event } as IDragPayload);
    }

    /**
     * What: Clear flag and timeout
     * Why: Allows to have subsequent drag in a clean state
     */
    private _resetDrag(): void {
        Diag.Debug.logInfo("DropZone: _resetDelayedDrag");
        if (DragDropContext.getInstance(this.props.idContext).isDelayEnabled) {
            window.clearTimeout(this._timeout);
        }
        this._isPressed = false;
    }
}

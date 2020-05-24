import { Observable } from "Presentation/Scripts/TFS/Components/DragDropZone/Observable";

/**
 * Payload we pass along with the Observable
 */
export interface IDragPayload {
    /**
     * What: Event that is given by the drag/dropZoneStop
     * Why: Get basic information like X, Y of the mouse but also required to be able to manually invoke event. This is the case
     *      when we have a delay on the drag where we invoke the drag manually after x milliseconds.
     */
    event: Event;
}

/**
 * What: This class is used for storing dragged data while dragging session.
 * Why: Need communication between components
 */
export class DragDropContext {
    private idContext: string;
    private static instances: DragDropContext[] = [];

    public static getInstance(id: string): DragDropContext {

        if (DragDropContext.instances[id] == null) {
            DragDropContext.instances[id] = new DragDropContext();
            DragDropContext.instances[id].idContext = id;
        }
        return DragDropContext.instances[id];
    }

    /**
     * What: Marks the possible drop zone target of a drag zone
     * Why: Indicates every potential place where we can drop a drag zone. Works with "type" of zone
     */
    public showPossibleDropOnDragStart: boolean = true;

    /**
    * What: If the drag drop zone should be disabled or not
    * Why: Sometimes we want to disable drag drop for a certain zone (permission denied team settings rows)
    */
    public disabled: boolean = false;

    /**
     * What: Marks over the possible drop zone (see configuration "showPossibleDropOnDragStart") that we allow to drop.
     * Why: Indicates to the user clearly where the item will be placed
     */
    public showPlaceHolderOnHover: boolean = true;

    /**
     * What: JQuery selector to block the drag
     * Why: Limit to the enclosure the drag
     */
    public enclosureDomSelector: string = null;

    /**
     * What: When using the drag and drop with delay, this is the value to wait before the drag start
     * Why: We need the timer and CSS animation to share the same delay
     */
    public delayIsMsBeforeDrag: number = 0;

    /**
     * What: Any kind of data we want the DropZone to know from the DragZone.
     * Why: At this moment, with the time we had, we use the old system of passing the payload here. It's any since it can be card Item but could be anything.
     */
    public payload: any = null;

    /**
     * What: Event invoked when the drag start.
     * Why: Allows to have DropZone to listen to when a DragZone start to activate on-demand DropZone to listen. This is useful with dynamic
     *      Drag and Drop. For example, if you do not want to have all intervals to be DropZone activated and wait that a card got pressed for few ms.
     * When: DragZone start drag
     */
    public dragZoneStart: Observable<IDragPayload> = new Observable<IDragPayload>();

    /**
     * What: Event invoked when the drag stop : This is when the DragZone stop being dragged. It's on mouse up, when the user release the click.
     * When: DragZone stop drag, invoked before the dropZoneStop.
     */
    public dragZoneStop: Observable<IDragPayload> = new Observable<IDragPayload>();

    /**
     * What: Event invoked when a DragZone is dropped in a DropZone
     * When: After the dragZoneStop observable, but at the beginning of the drop. This is invoked before the DropZone invokes its props stop callback.
     */
    public dropZoneStop: Observable<IDragPayload> = new Observable<IDragPayload>();

    /**
     * What: Indicate if the delay is enabled
     * Why: If not configured, by default it's 0 which mean no delay to start dragging
     */
    public isDelayEnabled(): boolean {
        return this.delayIsMsBeforeDrag > 0;
    }

    /**
     * What: Reset all events that listen to  this context
     * Why: We want to make sure no one is listening disposed context
     */
    public reset(): void {
        this.dragZoneStart.reset();
        this.dragZoneStop.reset();
        this.dropZoneStop.reset();
        delete DragDropContext.instances[this.idContext];
    }

    /**
     * This is a collection of all initialized dom nodes. It's a collection because when we start dragging, all DropZone attached got notified and start listening to drag-drop.
     * The problem is that when we stop Drag, JQuery gets notified for the DropZone where the DragZone got dropped. That means only a single DropZone knows to
     * reset the Drag-drop which make all others DropZone still active in the perspective of JQuery. The consequence is that the user can move other DragZone
     * event if at React level it said it shouldn't.
     */
    public $allNodes: JQuery[] = [];

    /**
     * All coordinates are static because they are shared between interval. This need to stay this way
     * until refactor the code to not having individual interval handling global data.
     */
    public static lastMouseDownCoordinate: ICoordinate = { x: 0, y: 0 } as ICoordinate;
    public static currentMouseCoordinate: ICoordinate = { x: 0, y: 0 } as ICoordinate;
}


export class ICoordinate {
    x: number;
    y: number;
}
///<amd-dependency path="jQueryUI/effect"/>
///<amd-dependency path="jQueryUI/droppable"/>
///<reference types="jqueryui" />
import * as React from "react";
import * as Diag from "VSS/Diag";
import { DragDropContext, IDragPayload } from "Presentation/Scripts/TFS/Components/DragDropZone/DragDropContext";
import { DragDropUtils } from "Presentation/Scripts/TFS/Components/DragDropZone/DragDropUtils";
import * as Events_Services from "VSS/Events/Services";

/**
 * What: Internal state of the drop zone that allow to handle rendering of different class depending of the state
 * Why: We want to add classes through React to have them always rendered even if it's not JQuery who is rendering
 *      the component. Without it, JQuery could add the required class but a React's render could get rid of it which
 *      would cause problem with JQuery library. 
 */
export interface IDropZoneStates {
    /**
     * What: Determine if the drag zone is over a drop zone
     * Why: Make sure the zone is highlighted in a particular way when we drag over to create a difference between activated zone and notify the user
     *      that we release will drop the DragZone at this particular position.
     */
    isDragZoneOver?: boolean;

    /**
     * What: Determine if a drop zone is ready to receive a drag zone.
     * Why: When we start to drag a DragZone, we want to highlight all DropZone that can receive the dragged element.
     */
    isDragZoneActivated?: boolean;
}

export interface IDropZoneProps {

    idContext: string;
    /**
     * What: Determine which type of zone can be dropped here.
     * Why: We want to filter what can be drop and allow more than one type to be dropped
     */
    zoneTypes: string[];

    /**
     * What: Restraint movement to Y axis
     * Why: Some list are just for ordering purpose and doesn't need to move in all directions.
     */
    restraintToYAxis?: boolean;

    /**
     * Called when item drop.
     * @param {any} dragData - Data shared between the DragZone and the DropZone
     */
    onDrop?: (payload: any) => void;

    /**
     * Specified callback function that return true if the drop target is valid. 
     * If not specified, default to return true.
     * This will apply to onDrop callback if specified, as well as default hover over effect on drop target.
     * @param {IDictionaryStringTo<any>} dragData - The stored draggable related data
     */
    isValidDropTarget?: (payload: any) => boolean;

    // ---Sortable
    /**
     * What: Temporary block the resorting some kind of Dom element by this selector
     * Why: When we are saving an item, the item has a specific class. This allow to block
     * the sort until the item is saved.
     */
    blockingDomSelectors?: string;

    /**
     * Specifies which mode to use for testing whether the item being moved is hovering over another item.
     * If not specified, the default tolerance (intersect) will be used
     */
    tolerance?: DropZoneTolerance;

    /**
     * Specifies if sort movement is animated or not
     */
    isMovementAnimated?: boolean;

    /**
     * Callback when drag/sort started.
     * Consumer can store dragged data for the current sorting.
     * @param id - the id of the item that was changed.
     * @param dragData - drag data.
     */
    onSortStart?: (id: string, dragData: any) => void;

    /**
     * What: Event that is raised when the drag move
     * Why: Allow to get notified if we are moving when dragging
     * When: After Start, before Stop
     * @param dragData - drag data.
     * @param {event} e - Give detail about the move (x,y)
     */
    onSortMove?: (id: string, dragData: any, e: Event) => void;

    /**
     * What: Event that is raised when the drag stop (drop the component)
     * @param dragData - the drag data that was set.
     */
    onSortStop?: (id: string, dragData: any) => void;

    /**
     * What: Callback after drag is stopped and DOM position has changed.
     * Why: DragDropComponent will revert back dom manipulation from jquery ui sortable and let consumer using onChange callback to perform the update.
     * When: This is called after the stop
     * @param id - the id of the item that was changed.
     * @param newIndex - the new index that the item changed to.
     * @param dragData - the drag data that was set.
     */
    onSortCompleted?: (id: string, newIndex: number, dragData: any) => void;
}

/**
 * Specifies which mode to use for testing whether the item being moved is hovering over another item
 */
export enum DropZoneTolerance {
    /**
     *  The item overlaps the other item by at least 50%
     */
    Intersect,

    /**
     *  The mouse pointer overlaps the other item
     */
    Pointer
}

export class DropZone extends React.Component<IDropZoneProps, IDropZoneStates> {
    public static DEFAULT_DRAG_OVER_CLASS = "drag-over";
    public static DEFAULT_DRAG_HIGHLIGHT_CLASS = "highlight";
    public static DEFAULT_DROP_CLASS = "drop-zone";

    /**
     * What: Internal flag that ensure that we initialize only once at a timer
     * Why: I can occurs that the DropZone got mounted twice
     * Protected for unit testing
     */
    protected _jqueryInitialized: boolean = false;
    /**
     * Keep reference to the last X position while dragging. This is used to know to determine which direction we are moving
     */
    private prevX: number = -1;

    public refs: {
        [key: string]: Element;
        dom: HTMLDivElement;
    };

    private _dragStartListener: (payload: IDragPayload) => void;
    private _dragStopListener: (payload: IDragPayload) => void;

    constructor(props: IDropZoneProps) {
        super(props);

        this._dragStartListener = (payload: IDragPayload) => { this._initJQuerySortable(payload.event); };
        this._dragStopListener = (payload: IDragPayload) => { this._resetDrag(); };
    }

    public render(): JSX.Element {
        return <div className={this._getClasses()} ref="dom">
            {this.props.children}
        </div>;
    }

    private _getClasses(): string {
        let classDragDrop = DropZone.DEFAULT_DROP_CLASS + " " + DragDropUtils.arrayTypesToStringClasses(this.props.zoneTypes);
        if (this.state && this.state.isDragZoneActivated) {
            classDragDrop += " " + DropZone.DEFAULT_DRAG_HIGHLIGHT_CLASS;
        }
        if (this.state && this.state.isDragZoneOver) {
            classDragDrop += " " + DropZone.DEFAULT_DRAG_OVER_CLASS;
        }
        return classDragDrop;
    }

    /**
     * After component is mounted, wrap the component with provided droppable options.
     */
    public componentDidMount() {
        this.setState({ isDragZoneActivated: false, isDragZoneOver: false } as IDropZoneStates);
        this._initDroppable();
        const context = DragDropContext.getInstance(this.props.idContext);
        context.dragZoneStart.addObserver(this._dragStartListener);
        context.dragZoneStop.addObserver(this._dragStopListener);
        if (!context.isDelayEnabled()) {
            this._initJQuerySortable(null);
        }
    }

    public componentWillUnmount() {
        const context = DragDropContext.getInstance(this.props.idContext);
        context.dragZoneStart.removeObserver(this._dragStartListener);
        context.dragZoneStop.removeObserver(this._dragStopListener);
        this._resetDrag();
        this._destroyDroppable();
        Diag.Debug.logVerbose("DropZone unmount");
    }


    /**
     * We do not use the option classes.ui-droppable and hoverClass because it doesn't work in out case. We manually handle classes with activate, desactivate, out
     */
    private _initDroppable() {


        const $node = $(this._getWrapperContainer());
        const acceptedClasses = DragDropUtils.arrayTypesToStringSelectorClasses(this.props.zoneTypes);
        const options = {
            accept: acceptedClasses,
            drop: this._onDrop,
            over: this._onOver,
            out: this._onOut,
            activate: this._onActivate,
            deactivate: this._onDeactivate
        } as JQueryUI.DroppableOptions;
        $node.droppable(options);
    }

    private _destroyDroppable() {
        const $node = $(this._getWrapperContainer());
        const options = {
            drop: null,
            over: null,
            out: null,
            activate: null,
            deactivate: null
        } as JQueryUI.DroppableOptions;
        $node.droppable(options);
        $node.droppable("destroy");
    }

    /**
     * Default Drop handler.
     * 1. Remove drag over style on the target if any.
     * 2. Trigger onDrop callback if any.
     * 3. Clear the stored drag data.
     */
    protected _onDrop = (e: JQueryEventObject, ui: JQueryUI.DroppableEventUIParam) => {
        if (this._jqueryInitialized) {
            const context = DragDropContext.getInstance(this.props.idContext);
            const dragData = context.payload;
            if (this._isValidDropTarget(dragData, ui.helper)) {
                if ($.isFunction(this.props.onDrop)) {
                    this.props.onDrop(dragData);
                }
                context.payload = null;
            }
        }
    }

    /**
     * Call the isValidDropTarget from the property to have a more granular validation
     * from the user of the drag/drop.
     *
     * A zone type must be defined, otherwise it won't be valid. This is the minimum requirement.
     * If a property define a method to add additional validation, this one will handle the validation,
     * but still will need to have the zone validated first.
     *
     * @param {any} oayload - The stored draggable related data
     * @param {JQuery} dragZone - The dragZone that we moved
     * @return {boolean} - True if valid to drop; False if invalid
     */
    protected _isValidDropTarget(payload: any, $dragZone: JQuery): boolean {
        let isValid = true;

        // 1- By target which is the strict minimum to respect
        if (!this._containsZoneTypeClass($dragZone)) {
            isValid = false;
        } else {
            // 2- Custom code if the basic validation pass
            if ($.isFunction(this.props.isValidDropTarget)) {
                isValid = this.props.isValidDropTarget(payload);
            }
        }
        return isValid;
    }

    protected _containsZoneTypeClass($dragZone: JQuery): boolean {
        const dragZoneClasses = $dragZone.attr("class").split(" ");
        const dropZoneClasses = DragDropUtils.arrayTypesToStringClasses(this.props.zoneTypes).split(" ");

        const dragZoneClassesLength = dragZoneClasses.length;
        const dropZoneClassesLength = dropZoneClasses.length;

        for (let i = 0; i < dropZoneClassesLength; i++) {
            for (let j = 0; j < dragZoneClassesLength; j++) {
                if (dropZoneClasses[i] === dragZoneClasses[j]) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * When the draggable over the drop target. Set drag over style to the wrapper DOM iff the drag event is on a valid drop target.
     */
    protected _onOver = (e: JQueryEventObject, ui: JQueryUI.DroppableEventUIParam) => {
        if (this._jqueryInitialized) {
            e.preventDefault();
            const dragData = DragDropContext.getInstance(this.props.idContext).payload;
            if (this._isValidDropTarget(dragData, ui.helper)) {
                this._refreshPosition();
                this._setDragOverStyle();
            }
        }
    }

    /**
     * This is fix a known issue of jquery droppable, it does not work well with dynamic drag & drop behavior especially when page location changed.
     * Root Cause: The position of the droptargets were cached when a drag starts.
     * Fix: refresh the location.
     * Related Reading: http://ryreitsma.blogspot.com/2011/11/jquery-ui-dynamic-drag-drop-behaviour.html
     */
    protected _refreshPosition() {
        const ui: any = $.ui; // Cast to any since ddmanager is not expo;sed.
        ui.ddmanager.prepareOffsets(ui.ddmanager.current, null);
    }

    /**
     * When the draggable leave the drop target. Remove any drag over style to the wrapper DOM.
     */
    protected _onOut = (e: JQueryEventObject, ui: JQueryUI.DroppableEventUIParam) => {
        if (this._jqueryInitialized) {
            e.preventDefault();
            this._refreshPosition();
            this._removeDragOverStyle();
        }
    }

    protected _getWrapperContainer(): HTMLDivElement {
        return this.refs.dom;
    }

    private _setDragOverStyle() {
        if (DragDropContext.getInstance(this.props.idContext).showPlaceHolderOnHover) {
            this.setState({ isDragZoneOver: true });
        }
    }

    private _removeDragOverStyle() {
        if (DragDropContext.getInstance(this.props.idContext).showPlaceHolderOnHover) {
            this.setState({ isDragZoneOver: false });
        }
    }

    protected _onActivate = (e: JQueryEventObject, ui: JQueryUI.DroppableEventUIParam) => {
        if (this._jqueryInitialized) {
            if (DragDropContext.getInstance(this.props.idContext).showPossibleDropOnDragStart) {
                this.setState({ isDragZoneActivated: true });
            }
        }
    }

    protected _onDeactivate = (e: JQueryEventObject, ui: JQueryUI.DroppableEventUIParam) => {
        if (this._jqueryInitialized) {
            if (DragDropContext.getInstance(this.props.idContext).showPossibleDropOnDragStart) {
                this.setState({ isDragZoneActivated: false });
            }
            this._removeDragOverStyle();
        }
    }

    // ---Sortable
    private _initJQuerySortable(event: Event) {
        if (this._jqueryInitialized) {
            Diag.Debug.logVerbose("===JQUERY== : DropZone: _initJQuerySortable -> Get out!, It's already sortable!");
            return;
        }
        this._jqueryInitialized = true;

        Diag.Debug.logVerbose("===JQUERY== : DropZone: _initJQuerySortable");
        const $node = $(this.refs.dom);
        const acceptedDomElementSelector = DragDropUtils.arrayTypesToStringSelectorClasses(this.props.zoneTypes);
        const context = DragDropContext.getInstance(this.props.idContext);
        const options = {
            items: acceptedDomElementSelector,
            containment: context.enclosureDomSelector,
            appendTo: context.enclosureDomSelector,
            placeholder: "ui-state-highlight",
            helper: "clone",
            start: this._onStart,
            sort: this._onSort,
            stop: this._onStop,
            update: this._onUpdate,
            disabled: context.disabled
        } as JQueryUI.SortableOptions;
        $node.sortable(options);
        context.$allNodes.push($node);
        if (this.props.blockingDomSelectors) {
            $node.sortable("option", "cancel", this.props.blockingDomSelectors);
        }

        if (this.props.tolerance) {
            $node.sortable("option", "tolerance", DropZoneTolerance[this.props.tolerance].toLowerCase());
        }

        if (!!this.props.restraintToYAxis && this.props.restraintToYAxis) {
            $node.sortable("option", "axis", "y");
        }

        if (event) // In the case of the timer we trigger the drag
        {
            Diag.Debug.logInfo("DropZone: Node triggered");
            $node.trigger(event as JQueryEventObject);
        }
    }

    private _resetDrag() {
        this._jqueryInitialized = false;
        Diag.Debug.logInfo("===JQUERY== : DropZone: _resetDragDrop ");
        if (DragDropContext.getInstance(this.props.idContext).isDelayEnabled()) {
            while (DragDropContext.getInstance(this.props.idContext).$allNodes.length > 0) {
                const $node = DragDropContext.getInstance(this.props.idContext).$allNodes.pop();
                this._destroyJQuerySortable($node);
            }
        } else {
            this._destroyJQuerySortable($(this.refs.dom));
        }
    }

    private _destroyJQuerySortable($element: JQuery): void {
        Diag.Debug.logVerbose("DropZone: _resetDragDrop DESTROY");

        // Ensure sortable is initialized on this element before removing
        if ($element.sortable("instance")) {
            $element.sortable("cancel");
            // Sortable destroy doesn't cleanup the references to the handlers. So, we need to explicitly set those to null, in order to clean those up.
            const options = {
                start: null,
                sort: null,
                stop: null,
                update: null
            } as JQueryUI.SortableOptions;
            $element.sortable(options);
            $element.sortable("destroy"); // call widget-function destroy
        }
    }

    private _onStart = (e: JQueryEventObject, ui: JQueryUI.SortableUIParams): void => {
        if (this._jqueryInitialized) {
            Diag.Debug.logInfo("DropZone: _onStart");
            Events_Services.getService().fire("dialog-move"); // We always want to close combo or dialog when we start dragging
            ui.placeholder.height(ui.helper.outerHeight()); // Placeholder will have the same height of the helper (DragZone)
            if (this.props.onSortStart instanceof Function) {
                const itemId = ui.item.attr("id");
                this.props.onSortStart(itemId, (value: any) => { DragDropContext.getInstance(this.props.idContext).payload = value; });
            }
        }
    }

    private _onSort = (e: JQueryEventObject, ui: JQueryUI.SortableUIParams): void => {
        if (this._jqueryInitialized) {
            if (this.props.onSortMove instanceof Function) {
                const itemId = ui.item.attr("id");
                this.props.onSortMove(itemId, (value) => { DragDropContext.getInstance(this.props.idContext).payload = value; }, e);
            }

            if (this.props.isMovementAnimated) {
                const $player = ui.helper; // Get the draggable element
                const currentMouseX = (event as any).pageX;
                if (this.prevX > currentMouseX) {
                    $player.removeClass("rightdrag").addClass("leftdrag");
                } else if (this.prevX < currentMouseX) { // dragged right
                    $player.removeClass("leftdrag").addClass("rightdrag");
                }

                this.prevX = currentMouseX;
            }
        }
    }

    // This is when the DragEnd begin
    private _onStop = (e: JQueryEventObject, ui: JQueryUI.SortableUIParams): void => {
        if (this._jqueryInitialized) {
            Diag.Debug.logInfo("DropZone: _onStop");
            if (DragDropContext.getInstance(this.props.idContext).isDelayEnabled()) {
                Diag.Debug.logInfo("DropZone: _onDragDropStopBegin");
                DragDropContext.getInstance(this.props.idContext).dragZoneStop.notify({ event: e } as IDragPayload); // Drag done here since the mouseUp of DragZone is swallowed by the onStop. No call this._resetDrag() because needs to notify ALL DropZone
                DragDropContext.getInstance(this.props.idContext).dropZoneStop.notify({ event: e } as IDragPayload);
            }
            if (this.props.onSortStop instanceof Function) {
                const itemId = ui.item.attr("id");
                this.props.onSortStop(itemId, (value) => { DragDropContext.getInstance(this.props.idContext).payload = value; });
            }
        }
    }

    /**
     * This is when the DragEnd end
     * This event is triggered when the user stopped sorting / dropping and DOM position has changed.
     */
    private _onUpdate = (e: JQueryEventObject, ui: JQueryUI.SortableUIParams) => {
        if (this._jqueryInitialized && $.isFunction(this.props.onSortCompleted)) {
            const $node = $(this.refs.dom);
            // get sorted array of elements from jQuery UI sortable, remove empty id caused by placeholder
            const newIdsList = (($node.sortable("toArray", { attribute: "id" } as JQueryUI.SortableOptions)) as string[]).filter(f => f !== "");
            const itemId = ui.item.attr("id");
            for (let i = 0; i < newIdsList.length; i++) {
                if (newIdsList[i] === itemId) {
                    // cancel sortable just before onChange callback to revert back dom manipulation from jquery sortable and let onChange callback perform the update.
                    $node.sortable("cancel");
                    let dragData = DragDropContext.getInstance(this.props.idContext).payload;
                    this.props.onSortCompleted(itemId, i, dragData);
                    DragDropContext.getInstance(this.props.idContext).payload = null;
                    break;
                }
            }
        }
    }

}

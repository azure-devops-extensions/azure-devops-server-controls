///<amd-dependency path="jQueryUI/droppable"/>

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");

export interface JQueryDroppableEnhancementOptions {
    accept?: string | Function;
    activeClass?: string;
    addClasses?: boolean;
    disabled?: boolean;
    greedy?: boolean;
    hoverClass?: string;
    scope?: string;
    tolerance?: string;
}

export interface IWorkItemUpdateParams {
    success: boolean;
    fieldName: string;
    workItems: any[]
}

export interface DroppableWorkItemChangeOptions extends JQueryDroppableEnhancementOptions {
    fieldName?: string;
    text?: string;

    /** Retrieve ids of work items being dragged */
    getDraggedWorkItemIds?: (draggable?: JQuery) => number[];

    /** Determine if the control is a valid drop target for the given work item ids and the field */
    isValidDropTarget?: (workItemIds: number[], fieldName: string) => boolean;

    /** Delegate to retrieve work items */
    beginGetWorkItems?: (workItemIds: number[], callback: (workItem: any) => void) => void;

    /** Called after drop to save/react to the work item updates */
    workItemUpdate?: (params: IWorkItemUpdateParams) => void;
}

export class DroppableWorkItemChangeEnhancement extends Controls.Enhancement<DroppableWorkItemChangeOptions> {

    constructor(options?: any) {
        /// <summary>Constructs the DroppableWorkItemChangeEnhancement enhancement, this allows controls to be made droppable and to update workItem fields</summary>
        /// <param name="options" type="object" />

        super(options);
    }

    public initialize() {
        const $element = this.getElement();
        const text = this._options.text;
        const fieldName = this._options.fieldName;

        $element.droppable({
            scope: this._options.scope,
            hoverClass: this._options.hoverClass,
            tolerance: this._options.tolerance,
            drop: (event, ui) => {
                this._dropHandler(text, fieldName, ui? ui.draggable: null);
            },
            accept: (draggable?: JQuery) => {
                const workItemIds: number[] = this._options.getDraggedWorkItemIds(draggable); //Get work item ids
                if (workItemIds && workItemIds.length > 0) {
                    return this._options.isValidDropTarget(workItemIds, fieldName);
                }

                return false; // workItemIds has 'falsy' value
            }
        });
    }

    /**
     * Invoked when items are dropped on an enhanced control.  Will retrieve the work item and update the appropriate field.
     * @param text The update text coming from the control.
     * @param fieldToBeUpdated The workitem field to be updated e.g AssignedTo, Activity.
     * @param draggable (optional) jQuery draggable object
     */
    private _dropHandler(text: string, fieldToBeUpdated: string, draggable?: JQuery) {
        Diag.Debug.assertParamIsString(text, "text");
        Diag.Debug.assertParamIsString(fieldToBeUpdated, "fieldToBeUpdated");

        var workItemIds: number[] = this._options.getDraggedWorkItemIds(draggable); //Get work item ids

        if (workItemIds && workItemIds.length > 0) { //Ensure workItemIds is valid
            this._options.beginGetWorkItems(workItemIds, (workItems: any[]) => {
                let success = false;

                for (let workItem of workItems) {
                    // Do update
                    let field = workItem.getField(fieldToBeUpdated);
                    if (field) {
                        field.setValue(text);

                        success = true;
                    }
                }

                // Notify caller about the operation
                this._options.workItemUpdate({
                    success: success,
                    fieldName: fieldToBeUpdated,
                    workItems: workItems
                });
            });
        }
    }
}

export interface UpdateControlOnHoverOptions extends JQueryDroppableEnhancementOptions {
    onOverCallback?: () => void;
    onOutCallBack?: () => void;
}

export class UpdateControlOnHoverEnhancement extends Controls.Enhancement<UpdateControlOnHoverOptions> {

    constructor(options?: UpdateControlOnHoverOptions) {
        /// <summary>Constructs the UpdateControlOnHoverEnhancement enhancement, this allows controls to be changed when a draggable hovers on them</summary>
        /// <param name="options" type="object">
        ///     The options object contents
        ///     {
        ///         onOverCallback: This callback function (passed in by the caller) determines the modifications made on the controls when a draggable hovers over it
        ///         onOutCallBack: This callback function (passed in by the caller) determines the modifications made on the controls when the draggable is dragged out of it
        ///     }
        /// </param>

        super(options);
    }

    public initialize() {
        var that = this,
            $element = this.getElement();

        $element.droppable({
            scope: this._options.scope,
            hoverClass: this._options.hoverClass,
            tolerance: this._options.tolerance,
            over: function (event, ui) {
                //Ensure the callback is a function else don't do anything
                if (typeof that._options.onOverCallback === "function") {
                    that._options.onOverCallback();
                }
            },
            out: function (event, ui) {
                //Ensure the callback is a function else don't do anything
                if (typeof that._options.onOutCallBack === "function") {
                    that._options.onOutCallBack();
                }
            }
        });
    }
}


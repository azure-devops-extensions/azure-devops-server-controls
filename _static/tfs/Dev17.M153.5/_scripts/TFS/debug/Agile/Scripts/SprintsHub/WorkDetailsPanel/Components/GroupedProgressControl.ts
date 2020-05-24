/// <reference types="jquery" />
import { GroupedProgressControlConstants } from "Agile/Scripts/Backlog/Constants";
import * as WorkDetailsPanelResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.WorkDetailsPanel";
import { GroupedProgressDataProvider, IGroupedProgressDataChange } from "Agile/Scripts/SprintsHub/WorkDetailsPanel/WorkDetailsDataProviders";
import { ProgressControl } from "Presentation/Scripts/TFS/FeatureRef/ProgressControl";
import { BaseControl, Enhancement } from "VSS/Controls";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { Debug, logTracePoint } from "VSS/Diag";
import { NamedEventCollection } from "VSS/Events/Handlers";
import { DelayedFunction, delegate } from "VSS/Utils/Core";
import { format, localeComparer } from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

export interface IGroupedProgressControlOptions {
    suffixFormat?: string;
    dataProvider: GroupedProgressDataProvider;
    headerText: string;
    dropHandler?: IEventHandler;
    expandOnHoverHandler: IEventHandler;
    renderDisplayContents: boolean | ((displayText: any) => JQuery);
    fixedTopText?: string;
}

export class GroupedProgressControl extends BaseControl {

    public static enhancementTypeName: string = "VSS.Agile.SprintPlanning.GroupedProgressControl";

    public static CSSCLASS_GROUP: string = "capacity-pane-progress-group";
    public static CSSCLASS_GROUP_HEADING: string = "capacity-pane-progress-group-heading";
    public static CSSCLASS_GROUP_HEADING_TABLE: string = "capacity-pane-progress-group-heading-table";
    public static CSSCLASS_EXPAND_COLLAPSE_CELL: string = "capacity-pane-progress-expand-collapse-cell";
    public static CSSCLASS_EXPAND_COLLAPSE: string = "capacity-expand-collapse bowtie-icon";
    public static CSSCLASS_EXPAND: string = "bowtie-triangle-left";
    public static CSSCLASS_COLLAPSE: string = "bowtie-triangle-down";
    public static CSSCLASS_GROUPEDPROGRESSCONTROL: string = "grouped-progress-control";
    public static DATA_SORT_LABEL: string = "sort-label";
    public static EVENT_PROGRESS_CONTROL_CREATED: string = "progress-control-created";
    public static EVENT_GROUPED_PROGRESS_CONTROL_HEADER_TABLE_CREATED: string = "grouped-progress-control-header-table-created";
    public static HEADER_TABLE_EXPANSION_DELAY: number = 500;

    private _$container: JQuery;
    private _$internalContainer: JQuery;
    private _$expandCollapse: JQuery;
    private _fixedTopText: string;
    private _dataProvider: GroupedProgressDataProvider;
    private _suffixFormat: string;
    private _maxTotal: number;
    private _controlMap: IDictionaryStringTo<JQuery>;
    private _headerText: string;
    private _events: NamedEventCollection<any, any>;
    private _expandFunction: DelayedFunction;
    private _isExpanded: boolean;
    private _dragDroptoProgressControlHandler: IEventHandler;
    private _headerTableAutoExpansionHandler: IEventHandler;

    /**
     * Instantiate a GroupedProgressControl
     * @param $container The container to create the control in
     * @param dataProvider The data provider
     * @param options
     *     {
     *         suffixFormat: "{0} hours"
     *     }
     */
    constructor(options?: IGroupedProgressControlOptions) {

        super(options);

        Debug.assertParamIsObject(options, "options");

        this._suffixFormat = options.suffixFormat || "{0}";
        this._dataProvider = options.dataProvider;

        this._fixedTopText = options.fixedTopText;
        this._headerText = options.headerText;
        this._isExpanded = true; // Grouped Progress control is initially expanded

        this._dragDroptoProgressControlHandler = options.dropHandler;
        this._headerTableAutoExpansionHandler = options.expandOnHoverHandler;
    }

    /**
     * Initialize data use by this control
     */
    public initialize() {

        this._$container = this.getElement();

        this._$container.addClass(GroupedProgressControl.CSSCLASS_GROUPEDPROGRESSCONTROL);

        // Register for changes with the data provider
        this._dataProvider.registerForChanges(delegate(this, this._handleDataChanged));

        //Attach behaviour event handlers if they exist
        if ($.isFunction(this._dragDroptoProgressControlHandler)) {
            this.attachEvent(GroupedProgressControl.EVENT_PROGRESS_CONTROL_CREATED, this._dragDroptoProgressControlHandler);
        }
        //TODO: Review potential move of _headerTableAutoExpansionHandler function out of the groupedProgressControls
        if ($.isFunction(this._headerTableAutoExpansionHandler)) {
            this.attachEvent(GroupedProgressControl.EVENT_GROUPED_PROGRESS_CONTROL_HEADER_TABLE_CREATED, this._headerTableAutoExpansionHandler);
        }

        this._expandFunction = new DelayedFunction(this,
            GroupedProgressControl.HEADER_TABLE_EXPANSION_DELAY,
            "autoExpandGroupProgressControlHeaders",
            this._toggleExpandedState);

        this._draw();
    }

    public fire(eventName, sender, eventArgs) {
        // Notifying all the subscribers
        return this._fireEvent(eventName, sender, eventArgs);
    }

    /**
     * Invoke the specified event passing the specified arguments.
     * @param eventName The event to invoke.
     * @param sender The sender of the event.
     * @param args The arguments to pass through to the specified event.
     */
    public _fireEvent(eventName: string, sender?: any, args?: any) {
        if (this._events) {
            // Invoke handlers until a handler returns false to cancel handler chain.
            let eventBubbleCancelled;
            this._events.invokeHandlers(eventName, sender, args, (result) => {
                if (result === false) {
                    eventBubbleCancelled = true;
                    return true;
                }
            });
            if (eventBubbleCancelled) {
                return false;
            }
        }
    }

    /**
     * Attatch a handler to an event.
     *
     * @param eventName The event name.
     * @param handler The handler to attach.
     */
    public attachEvent(eventName: string, handler: IEventHandler) {
        if (!this._events) {
            this._events = new NamedEventCollection();
        }

        this._events.subscribe(eventName, <any>handler);
    }

    /**
     * Detatch a handler from an event.
     * @param eventName The event name.
     * @param handler The handler to detach.
     */
    public detachEvent(eventName: string, handler: IEventHandler) {
        if (this._events) {
            this._events.unsubscribe(eventName, <any>handler);
        }
    }

    /**
     * Initialize the GroupedProgressControl
     */
    private _draw() {
        // Draw can be called in the case where max total increases and all data has to be retrieved again, so clear all controls here
        this._$container.empty();

        this._$internalContainer = $("<div/>");
        this._controlMap = {};

        // Ask data provider for initial data
        const data = this._dataProvider.getData();

        this._maxTotal = this._calculateMaxTotal(data);

        // Iterate over data, drawing and storing a reference to the control as we go
        for (const tuple of data) {
            // Draw the control for this tuple
            this._drawControlForTuple(tuple);
        }

        // Add the group header.
        const $groupHeaderMessage = $("<div />")
            .addClass(GroupedProgressControl.CSSCLASS_GROUP_HEADING)
            .text(this._headerText);

        const labelString: string = format(WorkDetailsPanelResources.ExpandCollapseSection_AriaLabel, this._headerText);

        // Add the expand collapse image.
        this._$expandCollapse = $("<div/>")
            .addClass(GroupedProgressControl.CSSCLASS_COLLAPSE)
            .addClass(GroupedProgressControl.CSSCLASS_EXPAND_COLLAPSE)
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr("aria-label", labelString)
            .attr("aria-expanded", this._isExpanded.toString())
            .bind("keydown.VSS.Agile",
                (event) => {
                    if (event.keyCode === KeyCode.ENTER) {
                        this._$expandCollapse.click();
                        return false; // Block event propagation
                    }
                });

        RichContentTooltip.add(labelString, this._$expandCollapse);

        // Build the heading table containing the title and expand/collapse button.
        const $headerTable = $("<table cellpadding='0'/>")
            .addClass(GroupedProgressControl.CSSCLASS_GROUP_HEADING_TABLE)
            .append($("<tr />")
                .append($("<td />")
                    .append($groupHeaderMessage)
                )
                .append($("<td />")
                    .addClass(GroupedProgressControl.CSSCLASS_EXPAND_COLLAPSE_CELL)
                    .append(this._$expandCollapse)
                )
                .bind("click.VSS.Agile",
                    () => {
                        // Show/Hide the progress.
                        this._toggleExpandedState();
                    })
            );

        this._$container.append($headerTable);

        this._$container.append(this._$internalContainer);

        // Raise this event so that newly-created/updated header tables get enhanced with the expansion behaviour
        this._fireEvent(GroupedProgressControl.EVENT_GROUPED_PROGRESS_CONTROL_HEADER_TABLE_CREATED, this, {
            control: $headerTable,
            onOverCallback: delegate(this, this._headerAutoExpandOverHandler),
            onOutCallBack: delegate(this, this._headerAutoExpandOutHandler)
        });
    }

    /**
     * Handles expansion of the header table when a draggable is dragged over it.
     */
    private _headerAutoExpandOverHandler() {
        if (!this._isExpanded) {
            this._expandFunction.reset();
        }
    }

    /**
     * Handles the out event when a draggable is dragged out of the header table.
     */
    private _headerAutoExpandOutHandler() {
        this._expandFunction.cancel();
    }

    /**
     * Shows/Hides the progress.
     */
    private _toggleExpandedState() {
        const cssClassCollapsed = "collapsed";

        this._isExpanded = !this._isExpanded; //Toggle Expansion state

        // Change the icon if the icon should be different for expanded and collapsed state.
        if (GroupedProgressControl.CSSCLASS_COLLAPSE !== GroupedProgressControl.CSSCLASS_EXPAND) {
            this._$expandCollapse.toggleClass(GroupedProgressControl.CSSCLASS_COLLAPSE, this._isExpanded);
            this._$expandCollapse.toggleClass(GroupedProgressControl.CSSCLASS_EXPAND, !this._isExpanded);
            this._$expandCollapse.attr("aria-expanded", this._isExpanded.toString());
        }

        // Show/Hide all of the progress controls.
        this._$internalContainer.toggle(this._isExpanded);

        this._$container.toggleClass(cssClassCollapsed, !this._isExpanded); //If expanded, remove cssCollapsed style
    }

    /**
     * Calculates the maximum total that will be passed to the ProgressControl
     * @param data The information retrieved from the data provider
     * @return number
     */
    private _calculateMaxTotal(data: IGroupedProgressDataChange[]): number {
        Debug.assertParamIsArray(data, "data");

        let maxTotal = 0;
        for (const tuple of data) {
            maxTotal = Math.max(Math.max(tuple.total, tuple.current), maxTotal);
        }

        return maxTotal;
    }

    /**
     * Add the control to the container
     *
     * @param $control The control to add
     * @param key The key to use in the controlMap for storing a reference to the control
     */
    private _addControl($control: JQuery, key: string) {

        Debug.assertParamIsObject($control, "$control");
        Debug.assertParamIsString(key, "key");

        const labelToInsert = $control.data(GroupedProgressControl.DATA_SORT_LABEL);
        const $progressControls = $("." + GroupedProgressControlConstants.CSSCLASS_PROGRESS_CONTROL, this._$internalContainer);

        if ($progressControls.length === 0 || labelToInsert === this._fixedTopText) {
            this._$internalContainer.prepend($control);
        } else {
            let insertAfter = true;
            let $insertionControl = null;
            $progressControls.each((i, element) => {
                $insertionControl = $(element);
                const label = $insertionControl.data(GroupedProgressControl.DATA_SORT_LABEL);
                if (label === undefined || (this._fixedTopText !== label && localeComparer(labelToInsert, label) < 0)) {
                    //if (label === undefined || (fixedTopText !== label && labelToInsert < label)) {
                    insertAfter = false;
                    return false;
                }
            });

            if (insertAfter) {
                $control.insertAfter($insertionControl);
            } else {
                $control.insertBefore($insertionControl);
            }
        }

        // Update the control map with <id, control> key value pair
        const normalizedKey = this._normalizeControlKey(key);
        this._controlMap[normalizedKey] = $control;
    }

    /**
     * Replaces a control with a new one
     *
     * @param $control The new control that we want to replace the old one with
     * @param key The key to replace in the control map
     */
    private _replaceControl($control: JQuery, key: string) {

        Debug.assertParamIsObject($control, "$control");
        Debug.assertParamIsString(key, "key");

        const normalizedKey = this._normalizeControlKey(key);
        this._controlMap[normalizedKey].replaceWith($control);
        this._controlMap[normalizedKey] = $control;
    }

    /**
     * Inserts control, handling insertion or replacement as needed
     *
     * @param $control The new control that we want to replace the old one with
     * @param key The key to replace in the control map
     */
    private _insertControl($control: JQuery, key: string) {

        Debug.assertParamIsObject($control, "$control");
        Debug.assertParamIsString(key, "key");

        const normalizedKey = this._normalizeControlKey(key);
        if (normalizedKey in this._controlMap) {
            this._replaceControl($control, normalizedKey);
        } else {
            this._addControl($control, normalizedKey);
        }
    }

    /**
     * Draw the control for a tuple
     * @param tuple of type IGroupedProgressDataChange
     */
    private _drawControlForTuple(tuple: IGroupedProgressDataChange) {

        Debug.assertParamIsObject(tuple, "tuple");

        const control = this._drawControl(tuple.text, tuple.current, tuple.total);
        const fieldName = this._dataProvider.getGroupFieldName();
        let text = tuple.text;

        this._insertControl(control.getElement(), tuple.id);

        if (text === WorkDetailsPanelResources.Capacity_Unassigned) {
            //This is the unassigned progress control so text is supposed to be an empty string
            text = "";
        }

        // Raise this event so that newly-created/updated progress controls get enhanced with the droppable behaviour
        this._fireEvent(GroupedProgressControl.EVENT_PROGRESS_CONTROL_CREATED, this, {
            control: control,
            value: text,
            fieldName: fieldName
        });
    }

    /**
     * Removes the control associated with the tuple
     * @param tuple of type IGroupedProgressDataChange
     */
    private _removeTuple(tuple: IGroupedProgressDataChange) {

        Debug.assertParamIsObject(tuple, "tuple");

        const normalizedKey = this._normalizeControlKey(tuple.id);

        if (normalizedKey in this._controlMap) {
            // Remove control from DOM
            this._controlMap[normalizedKey].remove();

            // Delete control from the control lookup
            delete this._controlMap[normalizedKey];
        }
    }

    /**
     * Draw an individual progress control
     *
     * @param text Text to display
     * @param current Current progress
     * @param total Total available progress for this tuple
     * @return The created progressControl
     */
    private _drawControl(text: string, current: number, total: number): ProgressControl {

        Debug.assertParamIsString(text, "text");
        Debug.assertParamIsNumber(current, "current");
        Debug.assertParamIsNumber(total, "total");

        const $container = $("<div/>").addClass(GroupedProgressControlConstants.CSSCLASS_PROGRESS_CONTROL);

        // Add the text as the sort label for alphabetical ordering
        $container.data(GroupedProgressControl.DATA_SORT_LABEL, text);

        const control = <ProgressControl>Enhancement.enhance(ProgressControl, $container, {
            current: current,
            total: total,
            maxTotal: this._maxTotal,
            text: text,
            suffixFormat: this._suffixFormat,
            renderDisplayContents: this._options.renderDisplayContents
        });

        return control;
    }

    /**
     * Event handler for when data provider notifies of changes that require redrawing of a single tuple
     *
     * @param changeType Represents the type of change. I.e. Update, Remove
     * @param data
     *     The information about the tuple that changed and needs to be redrawn
     *     {
     *         id: [ID of the item]
     *         text: [Text to display for the item]
     *         current: [The current progress]
     *         total: [The total available progress]
     *     }
     *
     */
    private _handleDataChanged(changeType: string, data: IGroupedProgressDataChange) {

        Debug.assertParamIsString(changeType, "changeType");
        Debug.assertParamIsObject(data, "data");

        const maxTotal = this._maxTotal;

        switch (changeType) {
            case GroupedProgressDataProvider.CHANGETYPE_UPDATE:
                // If maxTotal increased then we have to redraw everything
                if (data.total > maxTotal || data.current > maxTotal) {
                    this._maxTotal = Math.max(data.total, data.current);
                    this._draw();
                } else {
                    this._maxTotal = this._calculateMaxTotal(this._dataProvider.getData());

                    // If the max total decreased then we have to redraw everything
                    if (this._maxTotal !== maxTotal) {
                        this._draw();
                    } else {
                        this._drawControlForTuple(data);
                    }
                }
                break;
            case GroupedProgressDataProvider.CHANGETYPE_REMOVE:
                this._removeTuple(data);

                this._maxTotal = this._calculateMaxTotal(this._dataProvider.getData());

                // Anytime we remove and the maxTotal changes we need to redraw everything
                if (this._maxTotal !== maxTotal) {
                    this._draw();
                }

                break;
            default:
                Debug.fail("Unknown changeType provided to _handleDataChanged");
                break;
        }

        logTracePoint("CapacityPane.update.complete");
    }

    /**
     * Returns a normalized string that can be used as a control map key.
     * @param key   The key to normalize.
     */
    private _normalizeControlKey(key: string): string {
        return key.toLocaleLowerCase();
    }
}
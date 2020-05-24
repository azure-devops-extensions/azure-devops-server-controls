/// <reference types="jquery" />

import Diag = require("VSS/Diag");
import Agile = require("Agile/Scripts/Common/Agile");
import Boards = require("Agile/Scripts/TFS.Agile.Boards");
import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import { ITeam } from "Agile/Scripts/Models/Team";

export enum AnnotationDetailPaneState {
    /**
     * Action pane of the annotation is opened
     */
    OPENED,
    /**
     * Action pane of the annotation is closed
     */
    CLOSED
}

export interface IAnnotationBadgeOptions {
    /**
     * The css class for the container 
     */
    cssClass: string;
    /**
     * The annotation icon element 
     */
    $annotationIcon: JQuery;
    /**
     * The click event handler binded to the annotation container, it is optional
     */
    clickEventHandler?: IArgsFunctionR<any>;
}

export interface IAnnotationAdapterOptions {
    /** Id of the team that owns the board this annotation is displayed on */
    team: ITeam;

    /**
     * WorkItemItemAdapter associated with the annotation.
     */
    source: Boards.WorkItemItemAdapter;
    /**
     * Container for the badge (Summary of an annotation).
     */
    $badgeContainer?: JQuery;
    /**
     * Container for the action pane (Detail of an annotation).
     */
    $annotationDetailPaneContainer?: JQuery;
    /**
     * Identifier for the annotation adapter.
     */
    id?: string;
    /**
     * Order of the appearance of badge in the badge area on the tile.
     */
    priority?: number;
    /**
     * Callback to tell annotation manager if adapter has active/closed action pane.
     */
    onAnnotationDetailPaneStateChange: Function;

    /**
     * Boards scoped event helper
     */
    eventsHelper: ScopedEventHelper;

    /**
     * Annotation identifier for supporting all children backlog level work item types.
     */
    annotationId?: string;

    /**
     * Work item type identifier, used for testing. Could replace annotationId.
     */
    workItemType?: string;
}

export interface IAnnotationAdapter {
    /**
     * Control for the badge of the annotation
     */
    badgeControl: AnnotationBadge;
    /**
     * Control for the action pane of the annotation
     */
    $annotationDetailPaneControl: JQuery;
    /**
     * Menu items pertaining to the annotation
     */
    menuItems: Menus.IMenuItemSpec[];
    /**
     * Call to refresh annotation. It should involve creating/updating/removing annotation
     * Called when board is created/refreshed or associated WI changes.
     */
    refreshAnnotation(): void;
    /**
     * Dispose method for annotation adapter
     */
    dispose(): void;
}

export var annotationAdapterFactory = new TFS_Core_Utils.TypeFactory();

export class AnnotationAdapter implements IAnnotationAdapter {
    public static DRAG_SCOPE_ANNOTATION_ITEM = Agile.DragDropScopes.WorkItem;
    public static TILE_CONTENT_DETAILS = "board-content-details";

    public badgeControl: AnnotationBadge;
    public $annotationDetailPaneControl: JQuery;
    public menuItems: Menus.IMenuItemSpec[];
    public options: IAnnotationAdapterOptions;

    protected _eventsHelper: ScopedEventHelper;

    constructor(options: IAnnotationAdapterOptions) {
        Diag.Debug.assert(!!options.eventsHelper, "Events helper is not provided.");
        this.options = options;
        this._eventsHelper = options.eventsHelper
        this.menuItems = [];
    }

    public acceptHandler($item: JQuery): boolean {
        return false;
    }

    public dropHandler(event: JQueryEventObject, ui: any): void { }

    /**
     * Refresh annotation associated with this adapter.
     */
    public refreshAnnotation(): void { }

    /**
     * Disposes elements associated with the adapter.
     */
    public dispose(): void {
        if (this.badgeControl) {
            this.badgeControl.dispose();
            this.badgeControl = null;
        }

        if (this.$annotationDetailPaneControl) {
            this.$annotationDetailPaneControl.remove();
            this.$annotationDetailPaneControl = null;
        }
    }

    /**
     * Creates a control in the action pane area.
     * @param {JQuery} $control
     */
    public createDetailPane($control: JQuery) {
        this.$annotationDetailPaneControl = $("<div/>").addClass(AnnotationAdapter.TILE_CONTENT_DETAILS);
        this.$annotationDetailPaneControl.append($control);

        // ensure board height before appending element to tile, and fire board height changed event.
        this.ensureBoardHeight();

        this.options.$annotationDetailPaneContainer.append(this.$annotationDetailPaneControl);

        // append element to the tile.
        this.options.onAnnotationDetailPaneStateChange(this, AnnotationDetailPaneState.OPENED);
    }

    /**
    * Removes a control from the action pane area.
    */
    public removeDetailPane() {
        if (this.$annotationDetailPaneControl && this.$annotationDetailPaneControl.length > 0) {
            this.$annotationDetailPaneControl = null;
            this.options.onAnnotationDetailPaneStateChange(this, AnnotationDetailPaneState.CLOSED);
        }

        // Fix swimlane height when remove the checklist container.
        this._eventsHelper.fire(Boards.Notifications.BoardHeightChanged);
    }

    /**
     * Set the focus back to tile.
     */
    public setFocusToTile() {
        if (this.options.$badgeContainer && this.options.$badgeContainer.length > 0) {
            this.options.$badgeContainer.parents(".board-tile").focus();
        }
    }

    //TODO: handle refactoring to consume this in other annotations
    protected ensureBoardHeight() {
        var $board = this.getScrollableContentContainer();
        var $boardContent = $board.children(".horizontal-table");
        if ($boardContent.outerHeight() <= $board.outerHeight()) {
            // Before appending action pane container to the tile.
            // If board vertical content is not overflow, hide scrollbar until BoardHeightChanged event is executed.
            // This is to avoid scrollbar to show up for a split second.
            // This can happen when action pane container is appended to the tile causing scrollbar to appear,
            // and the BoardHeightChanged calculation then adjusted/removed height causing scrollbar to disappear.
            $board.css("overflow-y", "hidden");
        }
        // Fix swimlane height when append checklist container.
        this._eventsHelper.fire(Boards.Notifications.BoardHeightChanged);
    }

    protected getScrollableContentContainer(): JQuery {
        return $(".agile-content-container.scrollable");
    }
}

export class AnnotationBadge extends Controls.Control<IAnnotationBadgeOptions>{
    private static BADGE_SELECTED_CLASS = "selected";

    protected $container: JQuery;

    /**
     * Display and manage annotations on card.
     * @param {IAnnotationOptions} options?
     */
    constructor(options: IAnnotationBadgeOptions) {
        super(options);
    }

    public applySelectedStyle() {
        this.getElement().addClass(AnnotationBadge.BADGE_SELECTED_CLASS);
        this.getElement().attr("aria-selected", "true");
    }

    public removeSelectedStyle() {
        this.getElement().removeClass(AnnotationBadge.BADGE_SELECTED_CLASS);
        this.getElement().attr("aria-selected", "false");
    }

    /**
     * Initialize the control.
     */
    public initialize(): void {
        super.initialize();
        this.createLayout();
    }

    /**
     * Intializes annotation with provided options
     * @param {IAnnotationOptions} options?
     */
    public initializeOptions(options?: IAnnotationBadgeOptions): void {
        super.initializeOptions($.extend({
            coreCssClass: options.cssClass
        }, options));
    }

    /**
     * Update control with source data.
     * @param {any} source
     */
    public update(source: any): void {
    }

    /**
     * Dispose elements associated with this annotation
     */
    public dispose(): void {
        this.$container.unbind("click");
        super.dispose();
    }

    public createLayout(): void {
        this.$container = this.getElement();
        this.$container[0].appendChild(this._options.$annotationIcon[0]);
        if (this._options.clickEventHandler) {
            this.$container.unbind("click");
            this.$container.bind("click", this._options.clickEventHandler);
        }

        this.getElement().attr({ "tabindex": "0", "role": "button", "aria-selected": "false" });
    }
}


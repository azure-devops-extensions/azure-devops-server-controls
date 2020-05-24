///<amd-dependency path="VSS/Utils/Draggable"/>
///<amd-dependency path="jQueryUI/droppable"/>
/// <reference types="jquery" />

import ChecklistAnnotationAdapter_NO_REQUIRE = require("Agile/Scripts/Card/Annotations/ChecklistAnnotationAdapter");
import TestAnnotationAdapter_NO_REQUIRE = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationAdapter");
import TestAnnotationSource_NO_REQUIRE = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationSource");

import Boards = require("Agile/Scripts/TFS.Agile.Boards");
import Annotations = require("Agile/Scripts/Card/CardsAnnotationsCommon");
import Diag = require("VSS/Diag");
import Menus = require("VSS/Controls/Menus");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");
import VSS_FeatureAvailability = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import { ITeam } from "Agile/Scripts/Models/Team";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";

var delegate = Utils_Core.delegate;

// TODO: generic registration for any descendant work item type specified by "annotationId"
export function registerChecklistAnnotation(annotationId: string = Boards.BoardAnnotationsIdentifier.ChecklistAnnotation) {
    AnnotationManager.registerAdapterInitializationFunction(annotationId, (callback?: Function) => {
        VSS.using(["Agile/Scripts/Card/Annotations/ChecklistAnnotationAdapter"], (ChecklistAnnotationAdapter: typeof ChecklistAnnotationAdapter_NO_REQUIRE) => {
            Annotations.annotationAdapterFactory.registerConstructor(annotationId, ChecklistAnnotationAdapter.ChecklistAnnotationAdapter);

            if ($.isFunction(callback)) {
                callback();
            }
        });
    });
}

export function registerTestAnnotation() {
    var isTestAnnotationEnabled = VSS_FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAddInlineTest);
    if (isTestAnnotationEnabled) {
        Boards.ItemSource.registerItemSourceInitializationFunction("testSuite", (callback?: Function) => {
            VSS.using(["Agile/Scripts/Card/CardsAnnotationsTestAnnotationSource"], (TestAnnotationSource: typeof TestAnnotationSource_NO_REQUIRE) => {
                Boards.annotationItemSourceTypeFactory.registerConstructor(TestAnnotationSource.TestSuiteSource.sourceType, TestAnnotationSource.TestSuiteSource);

                if ($.isFunction(callback)) {
                    callback();
                }
            });
        });

        AnnotationManager.registerAdapterInitializationFunction(Boards.BoardAnnotationsIdentifier.TestAnnotation, (callback?: Function) => {
            VSS.using(["Agile/Scripts/Card/CardsAnnotationsTestAnnotationAdapter"], (TestAnnotationAdapter: typeof TestAnnotationAdapter_NO_REQUIRE) => {
                Annotations.annotationAdapterFactory.registerConstructor(TestAnnotationAdapter.testAnnotationId, TestAnnotationAdapter.TestAnnotationAdapter);

                if ($.isFunction(callback)) {
                    callback();
                }
            });
        });
    }
}

export interface IAnnotationManagerOptions {
    /**
     * Workitem associated with the tile
     */
    source: Boards.WorkItemItemAdapter;
    /**
     * Badge area on the tile where annotations shall render their badges
     */
    $badgeArea: JQuery;
    /**
     * Shared area among annotations for action pane on the tile
     */
    $annotationDetailPaneArea: JQuery;
    /**
     * Callback for tile to let it know if action pane is open or closed
     */
    onAnnotationDetailPaneStateChange: (state: Annotations.AnnotationDetailPaneState) => void;

    /**
     * Boards scoped event helper
     */
    eventsHelper: ScopedEventHelper;

    team: ITeam;
}

export class AnnotationManager implements IDisposable {
    private static ORIGINAL_ANNOTATION_ITEM_CLASS = "original-item";
    private static _adapterModuleMap: IDictionaryStringTo<Function> = {};

    private _annotationAdapters: Annotations.AnnotationAdapter[];
    private _activeAdapterId: string;
    private _dropAcceptingAdapterId: string;
    private _options: IAnnotationManagerOptions;
    private _disposed: boolean;
    private _eventsHelper: ScopedEventHelper;

    /**
     * Returns the initialization function to be called which downloads the required modules and then executes the passed callback
     * @param id: Annotation id
     */
    public static getAdapterInitializationFuntion(id: string): Function {
        if (!AnnotationManager._adapterModuleMap[id]) {
            Diag.Debug.fail("Initialization function is not registered yet for Annotation " + id);
        }

        return AnnotationManager._adapterModuleMap[id];
    }

    /**
     * Sets the initialization function in the map
     * @param id: Annotation id
     * @param initializationCallback: Adapter intialization function
     */
    public static registerAdapterInitializationFunction(id: string, initializationCallback: Function): void {
        AnnotationManager._adapterModuleMap[id] = initializationCallback;
    }

    constructor(options: IAnnotationManagerOptions) {
        Diag.Debug.assert(!!options.eventsHelper, "Events helper should not be null.");
        this._options = options;
        this._annotationAdapters = [];
        this._eventsHelper = options.eventsHelper;
        var isAllChildAnnotationEnabled = VSS_FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileCardAnnotations);

        // Get the applicable annotations as per current board settings and construct them accordingly.
        const annotationIds = Boards.Board.BoardAnnotationSettings.getApplicableAnnotationIds();
        for (let i = 0, length = annotationIds.length; i < length; i++) {
            if (Annotations.annotationAdapterFactory.getConstructor(annotationIds[i])) {
                if (isAllChildAnnotationEnabled) {
                    const annotationNames = Boards.Board.BoardAnnotationSettings.getApplicableAnnotationNames();
                    this._createAdapterInstance(annotationIds[i], i, annotationNames[i]);
                } else {
                    this._createAdapterInstance(annotationIds[i], i);
                }
                this._initializeOptions();
            } else {
                const initializeAdapter = AnnotationManager.getAdapterInitializationFuntion(annotationIds[i]);
                if ($.isFunction(initializeAdapter)) {
                    initializeAdapter(() => {
                        if (!this._disposed) {
                            if (isAllChildAnnotationEnabled) {
                                const annotationNames = Boards.Board.BoardAnnotationSettings.getApplicableAnnotationNames();
                                this._createAdapterInstance(annotationIds[i], i, annotationNames[i]);
                            } else {
                                this._createAdapterInstance(annotationIds[i], i);
                            }
                            this._initializeOptions();
                            this._annotationAdapters[i].refreshAnnotation();
                        }
                    });
                }
            }
        }
    }

    /**
     * Disposes the elements in AnnotationManager
     */
    public dispose(): void {
        for (let index = 0, length = this._annotationAdapters.length; index < length; index++) {
            this._annotationAdapters[index].dispose();
        }

        this._annotationAdapters = null;

        this._clearAnnotations();
        this._disposed = true;
    }

    /**
     * Accumulates menu items from annotation adapters
     * @returns {Menus.IMenuItemSpec[]}
     */
    public menuItems(): Menus.IMenuItemSpec[] {
        var allMenuItems: Menus.IMenuItemSpec[] = [];

        for (var index = 0, length = this._annotationAdapters.length; index < length; index++) {
            if (this._annotationAdapters[index].menuItems &&
                this._annotationAdapters[index].menuItems.length > 0) {

                allMenuItems = allMenuItems.concat(this._annotationAdapters[index].menuItems);
            }
        }

        return allMenuItems;
    }

    /**
     * Refreshes all annotations on the tile
     * @param {IAnnotationManagerOptions} options
     */
    public refresh(options: IAnnotationManagerOptions): void {
        this._clearAnnotations();

        this._options = options;
        this._initializeOptions();

        this.refreshAnnotations();
    }

    /**
     * Refreshes annotations for all annotation adapters.
     * It includes creation/updation/removal of the annotations.
     * @param {Boards.ItemChangeEventArgs} args?
     */
    public refreshAnnotations(args?: Boards.ItemChangeEventArgs): void {
        if (args) {
            Diag.Debug.assertIsNotNull(args.change, "args.change is null");

            if (args.change === Boards.ItemSource.ChangeTypes.ChecklistChanged) {
                this._annotationAdapters.some((annotationAdapter: Annotations.AnnotationAdapter) => {
                    var isAllChildAnnotationEnabled = VSS_FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileCardAnnotations)
                    if (isAllChildAnnotationEnabled) {
                        if (annotationAdapter.options.workItemType === args.workItemType) {
                            annotationAdapter.refreshAnnotation();
                            return true;
                        }
                    } else {
                        if (annotationAdapter.options.id === Boards.BoardAnnotationsIdentifier.ChecklistAnnotation) {
                            annotationAdapter.refreshAnnotation();
                            return true;
                        }
                    }
                });
            }
            else if (args.change === Boards.ItemSource.ChangeTypes.AnnotationItemSourceChanged) {
                var annotationItemSource = args.annotationItemSource;
                Diag.Debug.assertIsNotNull(annotationItemSource, "annotationItemSource is null");

                this._annotationAdapters.forEach((annotationAdapter: Annotations.AnnotationAdapter) => {
                    let annotationItemSources = Boards.Board.BoardAnnotationSettings.getAnnotationItemSources(annotationAdapter.options.id);
                    if (Utils_Array.contains(annotationItemSources, annotationItemSource.type())) {
                        annotationAdapter.refreshAnnotation();
                    }
                });
            }
        }
        else {
            this._annotationAdapters.forEach((annotationAdapter: Annotations.AnnotationAdapter) => {
                annotationAdapter.refreshAnnotation();
            });
        }
    }

    /**
     * Opens the last active action pane before refresh.
     */
    public openActiveAnnotationDetailPane(): boolean {
        if (this._isDetailPaneOpen()) {
            return true;
        }

        // Look for the annotation adapter which was active before refresh
        var toClickAnnotationAdapter: Annotations.AnnotationAdapter = this._getAnnotationAdapterById(this._activeAdapterId);

        // Click on the badge associated with that adapter to open the action pane.
        if (toClickAnnotationAdapter &&
            toClickAnnotationAdapter.options.$annotationDetailPaneContainer &&
            toClickAnnotationAdapter.badgeControl) {

            toClickAnnotationAdapter.badgeControl.getElement()[0].click();

            return true;
        }

        return false;
    }

    /**
     * This method sets the umbrella handlers to handle drop scenarios from different annotations.
     * Each adapter will be checked in their priority order if it's accepting the dropped item
     * The first one accepting will be handling the drop.
     * @param $droppableArea: Area where objects will be dropped
     */
    public setDroppable($droppableArea: JQuery): void {
        $droppableArea.droppable({
            scope: Annotations.AnnotationAdapter.DRAG_SCOPE_ANNOTATION_ITEM,
            accept: delegate(this, this._droppableAcceptHandler),
            hoverClass: "agileDragTargetHoverColor",
            out: delegate(this, this._droppableOutHandler),
            drop: delegate(this, this._droppableDropHandler),
            tolerance: "pointer"
        });
    }

    /**
     * Removes the drag drop related handlers attached to the droppable UI element
     * @param $droppableArea Area where objects was able to be dropped
     */
    public removeDroppable($droppableArea: JQuery): void {
        $droppableArea.droppable("destroy");
    }

    /**
     * Purges all annotation adapters and related objects.
     */
    private _clearAnnotations(): void {
        // Before clearing annotations, cache the annotation adapter id that is active now.
        // We make it active again when we do the refresh.
        var cachedActiveAdapterId = this._activeAdapterId;

        if (this._options.$annotationDetailPaneArea) {
            this._options.$annotationDetailPaneArea.detach();
            this._options.$annotationDetailPaneArea = null;
        }
        if (this._options.$badgeArea) {
            this._options.$badgeArea.detach();
            this._options.$badgeArea = null;
        }

        this._options = null;

        this._activeAdapterId = cachedActiveAdapterId;
    }

    private _createAdapterInstance(id: string, position: number, type?: string): void {
        var isAllChildAnnotationEnabled = VSS_FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileCardAnnotations);
        var annotationAdapter: Annotations.AnnotationAdapter;
        if (isAllChildAnnotationEnabled) {
            annotationAdapter = Annotations.annotationAdapterFactory.createInstance(id,
                [{
                    team: this._options.team,
                    source: this._options.source,
                    onAnnotationDetailPaneStateChange: delegate(this, this._onAnnotationDetailPaneStateChange),
                    eventsHelper: this._eventsHelper,
                    annotationId: id,
                    workItemType: type
                }]
            );
        } else {
            annotationAdapter = Annotations.annotationAdapterFactory.createInstance(id,
                [{
                    team: this._options.team,
                    source: this._options.source,
                    onAnnotationDetailPaneStateChange: delegate(this, this._onAnnotationDetailPaneStateChange),
                    eventsHelper: this._eventsHelper
                }]
            );
        }

        if (annotationAdapter) {
            this._annotationAdapters[position] = annotationAdapter;
        }
    }

    private _droppableAcceptHandler($item: JQuery): boolean {
        if (!this._annotationAdapters) {
            return false;
        }

        for (var index = 0, length = this._annotationAdapters.length; index < length; index++) {
            if (this._annotationAdapters[index].acceptHandler($item) === true) {
                this._dropAcceptingAdapterId = this._annotationAdapters[index].options.id;
                return true;
            }
        }

        this._dropAcceptingAdapterId = null;

        return false;
    }

    private _droppableDropHandler(event: JQueryEventObject, ui: any) {
        let acceptingAdapter = this._getAnnotationAdapterById(this._dropAcceptingAdapterId);
        if (acceptingAdapter) {
            acceptingAdapter.dropHandler(event, ui);
        }

        this._dropAcceptingAdapterId = null;
    }

    private _droppableOutHandler(event: JQueryEventObject, ui: any) {
        ui.draggable.addClass(AnnotationManager.ORIGINAL_ANNOTATION_ITEM_CLASS);
    }

    /**
     * Initializes AnnotationManager with the provided options
     * @param {IAnnotationManagerOptions} options?
     */
    private _initializeOptions(): void {
        // Append all annotations' containers in badge area in tile
        // Providers shall fill their badge controls in their containers
        if (this._options.$badgeArea) {
            this._annotationAdapters.forEach((adapter: Annotations.AnnotationAdapter) => {
                this._options.$badgeArea.append(adapter.options.$badgeContainer);
            });
        }

        if (this._options.$annotationDetailPaneArea && this._activeAdapterId) {
            let lastActiveAdapter = this._getAnnotationAdapterById(this._activeAdapterId);
            this._options.$annotationDetailPaneArea.append(lastActiveAdapter.$annotationDetailPaneControl);
        }
    }

    private _onAnnotationDetailPaneStateChange(annotationAdapter: Annotations.AnnotationAdapter, annotationDetailPaneState: Annotations.AnnotationDetailPaneState): void {
        switch (annotationDetailPaneState) {
            case Annotations.AnnotationDetailPaneState.OPENED:
                let detailPaneRetained: boolean = false;

                if (this._isDetailPaneOpen()) {
                    if (annotationAdapter.options.id === this._activeAdapterId) {
                        detailPaneRetained = true;
                    } else {
                        this._closeAnnotationDetailPane();
                    }
                }

                if (!detailPaneRetained) {
                    this._options.$annotationDetailPaneArea.append(annotationAdapter.options.$annotationDetailPaneContainer);
                    this._options.onAnnotationDetailPaneStateChange(Annotations.AnnotationDetailPaneState.OPENED);
                    this._activeAdapterId = annotationAdapter.options.id;
                }

                if (annotationAdapter.badgeControl) {
                    annotationAdapter.badgeControl.applySelectedStyle();
                }

                break;

            case Annotations.AnnotationDetailPaneState.CLOSED:
                this._closeAnnotationDetailPane();
                this._options.onAnnotationDetailPaneStateChange(Annotations.AnnotationDetailPaneState.CLOSED);
                this._activeAdapterId = null;
                break;
        }
    }

    private _isDetailPaneOpen(): boolean {
        if (this._options.$annotationDetailPaneArea) {
            let annotationDetailPaneAreaChildren = this._options.$annotationDetailPaneArea.children();
            if (annotationDetailPaneAreaChildren && annotationDetailPaneAreaChildren.length > 0) {
                return true;
            }
        }

        return false;
    }

    private _closeAnnotationDetailPane() {
        var lastActiveAnnotationAdapter = this._getAnnotationAdapterById(this._activeAdapterId);
        if (!lastActiveAnnotationAdapter) {
            return;
        }

        if (lastActiveAnnotationAdapter.badgeControl) {
            lastActiveAnnotationAdapter.badgeControl.removeSelectedStyle();
        }

        this._options.$annotationDetailPaneArea.children().detach();
        if (lastActiveAnnotationAdapter.$annotationDetailPaneControl) {
            lastActiveAnnotationAdapter.$annotationDetailPaneControl.remove();
            lastActiveAnnotationAdapter.$annotationDetailPaneControl = null;
        }
    }

    private _getAnnotationAdapterById(id: string): Annotations.AnnotationAdapter {
        var result: Annotations.AnnotationAdapter;

        for (var index = 0, length = this._annotationAdapters.length; index < length; index++) {
            if (this._annotationAdapters[index] && this._annotationAdapters[index].options.id === id) {
                result = this._annotationAdapters[index];
                break;
            }
        }

        return result;
    }
}

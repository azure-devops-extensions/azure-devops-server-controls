///<amd-dependency path="VSS/Utils/Draggable"/>
///<amd-dependency path="jQueryUI/droppable"/>
///<amd-dependency path="jQueryUI/sortable"/>
/// <reference types="jquery" />

import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import AgileUtils = require("Agile/Scripts/Common/Utils");
import Annotations = require("Agile/Scripts/Card/CardsAnnotationsCommon");
import Badge = require("Agile/Scripts/Card/Annotations/ChecklistAnnotationBadge");
import ViewModels = require("Agile/Scripts/Card/Annotations/ChecklistAnnotationViewModels");
import Boards = require("Agile/Scripts/TFS.Agile.Boards");
import Cards = require("Agile/Scripts/Card/Cards");
import Controls = require("VSS/Controls");
import ko = require("knockout");
import Diag = require("VSS/Diag");
import TFS_Agile = require("Agile/Scripts/Common/Agile");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Util_Cards = require("Agile/Scripts/Card/CardUtils");
import View = require("Agile/Scripts/Card/Annotations/ChecklistAnnotationView");
import { IBacklogLevelConfiguration, BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import { ITeam } from "Agile/Scripts/Models/Team";
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

TFS_Knockout.overrideDefaultBindings()

var delegate = Utils_Core.delegate;
var DatabaseCoreFieldRefName = AgileUtils.DatabaseCoreFieldRefName;
var domElem = Utils_UI.domElem;

export class ChecklistAnnotationAdapter extends Annotations.AnnotationAdapter {
    public $actionPaneControl: JQuery;

    public static CHECKLIST_ANNOTATION_ID: string = "Microsoft.VSTS.Agile.ChecklistAnnotation";

    private static boardTileClass = "board-tile";
    private static DataKeyId = "item-id";
    private static DataKeyItemDroppedOnTile = "droppedOnTile";
    private static DataKeyItemList = "itemList";
    private static DataKeyItemVM = "itemVM";
    private static DataKeyParentItemList = "parentItemList"; // Key name should match with the value in the Knockout template WorkItemListView.ascx
    private static HIDE_PLACEHOLDER_CLASS = "hide-placeholder";
    private static ORIGINAL_CHECKLIST_ITEM_CLASS = "original-item";
    private static CHILD_WORK_ITEMS_SUMMARY_CLASS = "child-work-items-summary";
    private static WORK_ITEM_CLASS = "work-item";
    private static WORK_ITEM_SELECTOR = "." + ChecklistAnnotationAdapter.WORK_ITEM_CLASS;
    private static WORK_ITEM_LIST_CONTAINER_SELECTOR = ".work-item-list-container";
    private static WORK_ITEM_LIST_CONTAINER_SORTABLE_SELECTOR = ChecklistAnnotationAdapter.WORK_ITEM_LIST_CONTAINER_SELECTOR + ".ui-sortable";
    private static TILE_START_DRAG = "tile-start-drag";

    private _descendentBacklogConfiguration: IBacklogLevelConfiguration;
    private _isThisWorkItemEnabled: boolean;
    private _isCheckListAnnotationApplicable: boolean;
    private _beginEditWorkItemListHandler: Function;
    private _endEditWorkItemListHandler: Function;
    private _workItemListAddChildHandler: Function;
    private _checklistControl: View.WorkItemChecklistControl;
    private _$annotationIcon: JQuery;
    private _team: ITeam;
    private _workItemType: string;

    constructor(options: Annotations.IAnnotationAdapterOptions) {
        Diag.Debug.assertIsNotNull(options.eventsHelper, "Events helper is not assigned.");

        var isAllChildAnnotationEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileCardAnnotations);
        if (isAllChildAnnotationEnabled) {
            super($.extend(options, {
                id: options.annotationId,
                priority: 10,
                $annotationDetailPaneContainer: $(domElem("div", "checklist-action-pane")),
                $badgeContainer: $(domElem("div", "badge checklist-badge")),
            }));
        } else {
            super($.extend(options, {
                id: Boards.BoardAnnotationsIdentifier.ChecklistAnnotation,
                priority: 10,
                $annotationDetailPaneContainer: $(domElem("div", "checklist-action-pane")),
                $badgeContainer: $(domElem("div", "badge checklist-badge")),
            }));
        }
        this._isCheckListAnnotationApplicable = Boards.Board.BoardAnnotationSettings.isAnnotationApplicable(options.id);
        this._team = options.team;

        if (this._isCheckListAnnotationApplicable) {
            let currentBacklogLvlDisplayName = TFS_Agile.BacklogContext.getInstance().level.name;
            this._descendentBacklogConfiguration = AgileUtils.BacklogLevelUtils.getDescendentBacklogLevelConfigurationForLevelName(currentBacklogLvlDisplayName);

            // Field workItemType is unique only if CardAnnotations feature flag is on.
            // Otherwise, it is set to the default type in Backlog configuration.
            if (isAllChildAnnotationEnabled) {
                this._workItemType = options.workItemType;
            } else {
                this._workItemType = this._descendentBacklogConfiguration.defaultWorkItemType;
            }

            // Hide this menu item if the child work item has been disabled for the current process
            AgileUtils.WorkItemCategoriesUtils.removeHiddenWorkItemTypeNames([this._workItemType]).then((validWorkItemTypes: string[]) => {
                // Each CardAnnotationAdapter instance has one workItemType associated with it.
                // validWorkItemTypes only has one element in the array which corresponds to this instance's workItemType only.
                // TODO: Fix validWorkItems and all its refs to be one field instead of an array.
                if (validWorkItemTypes && validWorkItemTypes.length > 0) {
                    this._isThisWorkItemEnabled = (this._workItemType == validWorkItemTypes[0]);
                }

                if (this._isThisWorkItemEnabled) {
                    this.menuItems.push({
                        id: "add-child",
                        text: Utils_String.format(AgileControlsResources.BoardCard_ContextMenu_AddChild, validWorkItemTypes[0]),
                        icon: "bowtie-icon bowtie-math-plus",
                        setTitleOnlyOnOverflow: true,
                        groupId: "modify",
                        action: () => {
                            this._addNewChildItem();
                        }
                    });
                }
            });

            this._attachAddChildHandler();
        }
    }

    /**
     * Checks whether this object belongs to checklist annotation and whether this is a valid reparenting.
     * @param $workItem: ui control being dropped
     */
    public acceptHandler($workItem: JQuery): boolean {
        if (!$workItem.hasClass(ChecklistAnnotationAdapter.WORK_ITEM_CLASS)) {
            return false;
        }

        // don't accept if item gets dropped on its parent
        var workItemViewModel = <ViewModels.WorkItemViewModel>ko.dataFor($workItem[0]);
        if (workItemViewModel) {
            var parentId = workItemViewModel.item.getParentId();
            if (this.options.source.id() === parentId) {
                return false;
            }

            return true;
        }

        return false;
    }

    public dispose() {
        this.disposeElement();
        this._detachAddChildHandler();
    }


    /**
     * Disposes the elements associated with checklist adapter
     */
    public disposeElement() {
        let didRemove = this._removeWorkItemListContainer();

        super.dispose();

        if (this._$annotationIcon) {
            AgileUtils.ControlUtils.disposeColorElement(this._$annotationIcon[0]);
            this._$annotationIcon = null;
        }

        if (this.options.$annotationDetailPaneContainer.children()) {
            this.options.$annotationDetailPaneContainer.children().detach();
        }

        if (this.options.$badgeContainer.children()) {
            this.options.$badgeContainer.children().detach();
        }

        // if we actually had a checklist that we removed lets set focus onto the tile. On initial load, we set file to first tile, then refresh all of the tiles
        // annotations. If the annotation has no checklist items then we do this dispose and set focus back to the tile. On initial load however, if there are no items
        // we don't need to remove anything/set focus anywhere, so we guard around the focus with a flag here
        if (didRemove) {
            this.setFocusToTile();
        }
    }

    public dropHandler(event: JQueryEventObject, ui: any): void {
        this._onChecklistItemDrop(ui);
        ui.draggable.data(ChecklistAnnotationAdapter.DataKeyItemDroppedOnTile, true);
    }

    /**
     * Refreshes the badge control. It creates a new control if not present already
     * otherwise updates/deletes it as required.
     */
    public refreshAnnotation() {
        super.refreshAnnotation();

        if (this._isCheckListAnnotationApplicable) {
            var childItems = this._getValidItems(this.options.source.children(), BacklogConfigurationService.getBacklogConfiguration().getStatesForWorkItems(this._descendentBacklogConfiguration.workItemTypes));
            if (childItems && childItems.length > 0) {

                // Create the annotation if not created already, or just update it
                if (this.options.$badgeContainer.children().length === 0) {
                    this._ensureAnnotation(childItems);

                    // This is required when work item creation was started from context menu option
                    // We had action pane already before we created badge. Mark the created badge selected
                    if (this.options.$annotationDetailPaneContainer.children().length !== 0) {
                        this.options.onAnnotationDetailPaneStateChange(this, Annotations.AnnotationDetailPaneState.OPENED);
                    }
                }
                else {
                    this._updateChecklistAnnotation(childItems);
                    if (this.options.$annotationDetailPaneContainer.children(".board-content-details").length !== 0) { // if the work item list is open
                        this._applyEllipsis(childItems);
                    }
                }
            }
            else {
                this.disposeElement();
            }
        }
    }

    private _attachAddChildHandler() {
        this._workItemListAddChildHandler = (sender, args) => {
            if (this.options.source && (this.options.source.id() === args.id)) {
                this._addNewChildItem();
            }
        }
        this._eventsHelper.attachEvent(Cards.Notifications.CardWorkItemListAddChild, this._workItemListAddChildHandler);
    }

    private _detachAddChildHandler() {
        if (this._workItemListAddChildHandler) {
            this._eventsHelper.detachEvent(Cards.Notifications.CardWorkItemListAddChild, this._workItemListAddChildHandler);
            this._workItemListAddChildHandler = null;
        }
    }

    private _ensureAnnotation(items: Boards.Item[]) {
        if (!this.badgeControl) {
            this._createAnnotation(items);
        }
        this.badgeControl.update(items);
    }

    private _createAnnotation(items: Boards.Item[]) {
        var clickEventHandler = (e) => {
            Boards.KanbanTelemetry.recordChecklistTelemetry(this._workItemType, this.options.$annotationDetailPaneContainer ? "Collapse" : "Expand", "Annotation");

            if (!this.$annotationDetailPaneControl) {
                this.options.source.beginGetChildren().then(
                    (items: Boards.Item[]) => {
                        if (this.$annotationDetailPaneControl) {
                            return;
                        }
                        this._bindTemplateWithWorkItemListContainer(items);
                        this._checklistControl.focus();
                    });
            }
            else {
                this._removeWorkItemListContainer();
            }
            e.preventDefault();
        };

        this._$annotationIcon = AgileUtils.ControlUtils.buildColorElement(this._workItemType);
        this.badgeControl = Controls.Control.create(Badge.ChecklistAnnotationBadge, this.options.$badgeContainer, <Badge.IChecklistAnnotationBadgeOptions>{
            source: items,
            cssClass: ChecklistAnnotationAdapter.CHILD_WORK_ITEMS_SUMMARY_CLASS,
            $annotationIcon: this._$annotationIcon,
            isComplete: delegate(this, this._isStateComplete),
            clickEventHandler: clickEventHandler,
            backlogConfiguration: this._descendentBacklogConfiguration,
            workItemType: this._workItemType
        });

        this.options.$badgeContainer.append(this.badgeControl.getElement()[0]);
    }

    private _addNewChildItem() {
        if (!this.$annotationDetailPaneControl) {
            this.options.source.beginGetChildren().
                then((childItems: Boards.Item[]) => {
                    if (!childItems) {
                        // If there are no children, start with empty child item list
                        childItems = [];
                    }
                    this._bindTemplateWithWorkItemListContainer(childItems);
                    this._addNewWorkItemToWorkItemListCollectionViewModel();
                });
        }
        else if (!this._checklistControl.viewModel.disableAdd()) {
            this._addNewWorkItemToWorkItemListCollectionViewModel();
        }
    }

    private _addNewWorkItemToWorkItemListCollectionViewModel() {
        this._checklistControl.viewModel.addNewWorkItem(this._workItemType);
        Boards.KanbanTelemetry.recordChecklistTelemetry(this._workItemType, "Add", "ContextMenu");
    }

    private _isStateComplete(item: Boards.Item) {
        return AgileUtils.WorkItemUtils.isStateComplete(item.id(),
            item.fieldValue(DatabaseCoreFieldRefName.State),
            item.fieldValue(DatabaseCoreFieldRefName.WorkItemType));
    }

    private _getValidItems(items: Boards.Item[], validStates: string[]): Boards.Item[] {
        var allowedItems: Boards.Item[] = [];
        for (var i = 0; i < items.length; i++) {
            var item = items[i];

            if (Utils_String.equals(item.type(), this._workItemType, true)) {
                for (var j = 0; j < validStates.length; j++) {
                    if (Utils_String.ignoreCaseComparer(validStates[j], item.fieldValue(DatabaseCoreFieldRefName.State)) === 0) {
                        allowedItems.push(item);
                        break;
                    }
                }
            }
        }

        return allowedItems;
    }

    private _onChecklistItemDrop(ui: any) {
        var $item = ui.draggable;
        var itemId: number = $item.attr("id");
        var itemType: string = $item.attr("itemType");

        var parentId = this.options.source.id();

        this._beginReparentWorkItem(itemId, itemType, parentId);
    }

    /**
     * Create work item list view model and bind the template to append work item container to the tile.
     */
    private _bindTemplateWithWorkItemListContainer(items: Boards.Item[]) {
        if (TFS_Agile.areAdvancedBacklogFeaturesEnabled(true)) {
            this._bindSortable();
        }

        // create view model.
        items = this._getValidItems(items, BacklogConfigurationService.getBacklogConfiguration().getStatesForWorkItems(this._descendentBacklogConfiguration.workItemTypes));
        let options: View.IWorkItemChecklistControlOptions = {
            parentWorkItem: this.options.source,
            items: items,
            team: this._team,
            workItemType: this._workItemType,
            workItemCreationEnabled: this._isThisWorkItemEnabled,
            eventScope: this.options.eventsHelper.getScope()
        };

        // bind template.
        this.$annotationDetailPaneControl = $("<div/>").addClass(Annotations.AnnotationAdapter.TILE_CONTENT_DETAILS);
        this._checklistControl = Controls.Control.create(View.WorkItemChecklistControl, this.$annotationDetailPaneControl, options);

        // ensure board height before appending element to tile, and fire board height changed event.
        this._ensureBoardHeight();

        this.options.$annotationDetailPaneContainer.append(this.$annotationDetailPaneControl);
        // append element to the tile.
        this.options.onAnnotationDetailPaneStateChange(this, Annotations.AnnotationDetailPaneState.OPENED);

        this._applyEllipsis(items);

        // bind event handler.
        this._attachChecklistHandlers();
    }

    private _applyEllipsis(items: Boards.Item[]) {
        var $workItems = this.$annotationDetailPaneControl.find(ChecklistAnnotationAdapter.WORK_ITEM_SELECTOR);

        if (items.length !== 0) {
            var lastEllipsisIndex = items[items.length - 1].id() > 0 ? items.length : items.length - 1;
            for (var i = 0; i < lastEllipsisIndex; i++) {
                var $workItem = $($workItems.get(i));
                var $titleContainer = $workItem.find(".title");
                var $clickableTitle = $titleContainer.children();
                Util_Cards.applyEllipsis($titleContainer, $clickableTitle);
            }
        }
    }

    private _ensureBoardHeight() {
        var $board = this.getScrollableContentContainer();
        var $boardContent = $board.children(".horizontal-table");
        if ($boardContent.outerHeight() <= $board.outerHeight()) {
            // Before appending workItem container to the tile.
            // If board vertical content is not overflow, hide scrollbar until BoardHeightChanged event is executed.
            // This is to avoid scrollbar to show up for a split second.
            // This can happen when checklist container is appended to the tile causing scrollbar to appear,
            // and the BoardHeightChanged calculation then adjusted/removed height causing scrollbar to disappear.
            $board.css("overflow-y", "hidden");
        }
        // Fix swimlane height when append checklist container.
        this._eventsHelper.fire(Boards.Notifications.BoardHeightChanged);
    }

    private _attachChecklistHandlers() {
        this._beginEditWorkItemListHandler = (sender, args) => {
            if (this.$annotationDetailPaneControl && this.options.source && (this.options.source.id() === args.id)) {
                // Disable dragging and dropping of checklist items
                var $workItemListSortable = this.$annotationDetailPaneControl.find(ChecklistAnnotationAdapter.WORK_ITEM_LIST_CONTAINER_SORTABLE_SELECTOR);
                if ($workItemListSortable && $workItemListSortable.length > 0) {
                    $workItemListSortable.sortable("disable");
                }
            }
        };
        this._eventsHelper.attachEvent(Cards.Notifications.CardWorkItemListBeginEdit, this._beginEditWorkItemListHandler);
        this._endEditWorkItemListHandler = (sender, args) => {
            if (this.options.source && (this.options.source.id() === args.id)) {
                // Enable dragging and dropping of checklist items
                var $workItemListSortable = this.$annotationDetailPaneControl.find(ChecklistAnnotationAdapter.WORK_ITEM_LIST_CONTAINER_SORTABLE_SELECTOR);
                if ($workItemListSortable && $workItemListSortable.length > 0) {
                    $workItemListSortable.sortable("enable");
                }
            }
        };
        this._eventsHelper.attachEvent(Cards.Notifications.CardWorkItemListEndEdit, this._endEditWorkItemListHandler);
    }

    private _bindSortable() {
        var tile = this, scrollingSensitivity = 60, scrollingSpeed = 10;
        var $scrollContainer = this.getScrollableContentContainer();
        var errorHandler = (exception: any) => {
            this.refreshAnnotation();
        };

        (<any>ko.bindingHandlers).sortableChecklistItem = {
            init: function (element, valueAccessor) {
                var options = valueAccessor();
                $(element).data(ChecklistAnnotationAdapter.DataKeyItemVM, options.item);
                $(element).data(ChecklistAnnotationAdapter.DataKeyParentItemList, options.parentItemList);
            }
        };

        (<any>ko.bindingHandlers).sortableChecklistContainer = {
            init: (element, valueAccessor) => {
                $(element).data(ChecklistAnnotationAdapter.DataKeyItemList, valueAccessor());
                var movedToNewPosition = false;
                $(element).sortable({
                    items: ChecklistAnnotationAdapter.WORK_ITEM_SELECTOR,
                    tolerance: "pointer",
                    helper: (event: JQueryEventObject, ui) => {
                        var $helper = (<any>ui).clone();
                        $helper.find(".clickable-title").attr("title", "");
                        $helper.data(ChecklistAnnotationAdapter.DataKeyId, ko.dataFor(ui[0]).id());
                        return $helper;
                    },
                    zIndex: 1000,
                    appendTo: document.body,
                    containment: ".agile-board",
                    scope: Annotations.AnnotationAdapter.DRAG_SCOPE_ANNOTATION_ITEM,
                    start: (event: JQueryEventObject, ui) => {
                        ui.helper.width(ui.placeholder.width());
                        this._eventsHelper.fire(ChecklistAnnotationAdapter.TILE_START_DRAG, this);
                    },
                    stop: (event: JQueryEventObject, ui) => {
                        // on cancellation/completion revert to the original style
                        ui.item.removeClass(ChecklistAnnotationAdapter.ORIGINAL_CHECKLIST_ITEM_CLASS);

                        if (ui.item.data(ChecklistAnnotationAdapter.DataKeyItemDroppedOnTile)) {
                            // if item was dropped on a tile && there was no update event (while dragging there was no DOM change),
                            // delete the original item
                            ko.removeNode(ui.item[0]);
                        }
                        else if (!movedToNewPosition) {
                            //!!!THIS IS A WORKAROUND
                            // Using ko and jquery sortable together can lead to binding issues in ko which then causes 
                            // some additional items are getting disappeared while performing reorder.
                            // As a workaround, refresh the ko bindings (remove and add back the view model from the observable array)
                            // This is a pattern used in CSC tabs, field settings and etc. 
                            var item = ko.dataFor(ui.item[0]);
                            var index = ui.item.index();
                            var itemList = $(event.target).data(ChecklistAnnotationAdapter.DataKeyItemList);
                            itemList.remove(item);
                            itemList.splice(index, 0, item);

                            ko.removeNode(ui.item[0]);
                            var $workItems = $(element).find(ChecklistAnnotationAdapter.WORK_ITEM_SELECTOR);
                            var $workItem = $($workItems.get(index));
                            var $clickableTitle = $workItem.find(".clickable-title");
                            var $titleContainer = $workItem.find(".title");
                            Util_Cards.applyEllipsis($titleContainer, $clickableTitle);
                        }

                        movedToNewPosition = false;
                    },
                    update: (event: JQueryEventObject, ui) => {
                        // update event may get fired twice (once for source and another for target) if there was DOM change.
                        // ui.sender will be undefined when being called for source which is when we handle the event.
                        // ui.sender will be source container when called for target and it will be ignored.
                        if (!ui.sender) {
                            if (ui.placeholder.hasClass(ChecklistAnnotationAdapter.HIDE_PLACEHOLDER_CLASS)) {
                                // if item was dropped outside of sortable containers, cancel sort
                                // default behavior of sortable is placing back to the last placeholder position in the last container,
                                // but we want to revert back to the original placeholder position in that case
                                return false;
                            }

                            var itemVM: ViewModels.ItemViewModel = ui.item.data(ChecklistAnnotationAdapter.DataKeyItemVM);
                            if (itemVM) {
                                var sourceItemList: KnockoutObservableArray<ViewModels.ItemViewModel> = ui.item.data(ChecklistAnnotationAdapter.DataKeyParentItemList);
                                var targetItemList: KnockoutObservableArray<ViewModels.ItemViewModel> = ui.item.parent().data(ChecklistAnnotationAdapter.DataKeyItemList);
                                var targetPosition = ko.utils.arrayIndexOf<any>((<any>ui).item.parent().children(), ui.item[0]);
                                if (targetPosition >= 0) {
                                    // Optimistically update VM collections
                                    movedToNewPosition = true;
                                    var parentId = ui.item.closest("." + ChecklistAnnotationAdapter.boardTileClass).data(ChecklistAnnotationAdapter.DataKeyId);

                                    // remove original item
                                    ko.removeNode(ui.item[0]);
                                    sourceItemList.remove(itemVM);
                                    targetItemList.splice(targetPosition, 0, itemVM);

                                    if (sourceItemList !== targetItemList) {
                                        tile._beginReparentWorkItem(itemVM.item._id, itemVM.itemType, parentId,
                                            () => {
                                                tile._beginReorderChecklist(targetItemList(), itemVM, targetPosition, errorHandler);
                                            },
                                            (exception: TfsError) => {
                                                // If the checklist item was already moved to the new collection, revert it since the server operation failed
                                                targetItemList.remove(itemVM);
                                            });
                                    }
                                    else {
                                        tile._beginReorderChecklist(targetItemList(), itemVM, targetPosition, errorHandler);
                                    }
                                }
                            }
                        }
                    },
                    opacity: 0.8,
                    cursor: "move",
                    connectWith: ChecklistAnnotationAdapter.WORK_ITEM_LIST_CONTAINER_SELECTOR,
                    refreshPositions: true,
                    sort: (event: JQueryEventObject, ui) => {
                        var scrolled = false;

                        // Handle the scroll across connected lists: http://stackoverflow.com/questions/24257746/sortable-scroll-issue-with-connected-lists
                        // Also scroll the scrollable content container
                        var scrollContainers: HTMLElement[] = [$scrollContainer[0], ui.placeholder[0].parentElement];
                        for (var i = 0, len = scrollContainers.length; i < len; i++) {
                            var scrollContainer = scrollContainers[i];
                            if (typeof (scrollContainer) !== "undefined") {
                                //The referenced scrollable container does not exist on this page
                                var overflowOffset = $(scrollContainer).offset();
                                if ((overflowOffset.top + scrollContainer.offsetHeight) - event.pageY < scrollingSensitivity) {
                                    scrollContainer.scrollTop = scrollContainer.scrollTop + scrollingSpeed;
                                    scrolled = true;
                                }
                                else if (event.pageY - overflowOffset.top < scrollingSensitivity) {
                                    scrollContainer.scrollTop = scrollContainer.scrollTop - scrollingSpeed;
                                    scrolled = true;
                                }
                                if ((overflowOffset.left + scrollContainer.offsetWidth) - event.pageX < scrollingSensitivity) {
                                    scrollContainer.scrollLeft = scrollContainer.scrollLeft + scrollingSpeed;
                                    scrolled = true;
                                }
                                else if (event.pageX - overflowOffset.left < scrollingSensitivity) {
                                    scrollContainer.scrollLeft = scrollContainer.scrollLeft - scrollingSpeed;
                                    scrolled = true;
                                }

                                if (scrolled && i === 0) {
                                    // Sortable.refreshPositions doesn't recaclulate the positions of the containers scrolled partially into view.
                                    // So, we need to force it to be refreshed explicitly.
                                    // We need to recalculate the positions of all the droppable tiles, as per the revised layout on scrolling
                                    // Recalculate only for the content container and not for the work item list container
                                    ui.item.parent().sortable("refresh");
                                    // No need to reset the value of scrolled as we don't need to recalculate the positions of the droppable containers
                                    // on scrolling through the work item containers
                                }
                            }
                        }
                    }
                } as JQueryUI.SortableOptions)
                    .keydown((event: JQueryKeyEventObject) => {
                        if ((event.ctrlKey || event.metaKey) && (event.keyCode === Utils_UI.KeyCode.UP || event.keyCode === Utils_UI.KeyCode.DOWN)) {
                            try {
                                const target = $(event.target);
                                // Get the parent list so we can focus the moved item.
                                const workItemListSortable = target.parent(ChecklistAnnotationAdapter.WORK_ITEM_LIST_CONTAINER_SORTABLE_SELECTOR)
                                if (!workItemListSortable || workItemListSortable.length === 0) {
                                    // Item isn't part of a sortable control... just ignore it.
                                    return false;
                                }

                                // Get the item we are going to move.
                                const itemVM: ViewModels.ItemViewModel = target.data(ChecklistAnnotationAdapter.DataKeyItemVM);
                                if (itemVM.isSaving()) {
                                    // Save in progress... if this save is a reorder wit will throw if we try to reorder again. Just ignore their keypress.
                                    return false;
                                }

                                // Get the list that contains this item.
                                const observable = target.data(ChecklistAnnotationAdapter.DataKeyParentItemList);
                                const targetItemList = observable();
                                if (!targetItemList || targetItemList.length === 0) {
                                    // No items... just ignore.
                                    return false;
                                }

                                // Get current and target positions.
                                const currentPosition = targetItemList.indexOf(itemVM);
                                if (currentPosition < 0) {
                                    // Couldn't find the item... perhaps a refresh removed it. Just ignore.
                                    return false;
                                }
                                const targetPosition = (event.keyCode === Utils_UI.KeyCode.DOWN) ? currentPosition + 1 : currentPosition - 1;
                                if (targetPosition < 0 || targetPosition >= targetItemList.length) {
                                    // Can't move past the 1st or last item. Just ignore.
                                    return false;
                                }

                                // Eagerly update the UI to reflect new position and reset focus.
                                observable.remove(itemVM);
                                observable.splice(targetPosition, 0, itemVM);
                                $(workItemListSortable[0].children[targetPosition]).focus();

                                // Save.
                                tile._beginReorderChecklist(observable(), itemVM, targetPosition, errorHandler);
                                return false;
                            }
                            finally {
                                event.preventDefault();
                                event.stopPropagation();
                            }

                        }

                        return true;
                    });

                // make the container droppable to track the dragged item.
                // we can't use sortable over/out events to track the dragged item in all scenarios with connected sortable containers.
                // Delay the initialize of droppable to improve load performance.
                var sortableItemPlaceholderSelector = ChecklistAnnotationAdapter.WORK_ITEM_SELECTOR + ".ui-sortable-placeholder";
                Utils_Core.delay(this, 0, () => {
                    $(element).droppable({
                        over: (event: JQueryEventObject, ui) => {
                            var $placeHolder = $(sortableItemPlaceholderSelector);
                            $placeHolder.removeClass(ChecklistAnnotationAdapter.HIDE_PLACEHOLDER_CLASS);

                            // remove original item only if it's over its original container
                            if (ui.draggable.parent()[0] === $placeHolder.parent()[0]) {
                                ui.draggable.removeClass(ChecklistAnnotationAdapter.ORIGINAL_CHECKLIST_ITEM_CLASS);
                            }
                        },
                        out: (event: JQueryEventObject, ui) => {
                            $(sortableItemPlaceholderSelector).addClass(ChecklistAnnotationAdapter.HIDE_PLACEHOLDER_CLASS);
                            ui.draggable.addClass(ChecklistAnnotationAdapter.ORIGINAL_CHECKLIST_ITEM_CLASS);
                        },
                        scope: Annotations.AnnotationAdapter.DRAG_SCOPE_ANNOTATION_ITEM,
                        accept: ChecklistAnnotationAdapter.WORK_ITEM_SELECTOR,
                        tolerance: "pointer"
                    });
                });
            }
        };
    }

    private _beginReorderChecklist(targetItemList: ViewModels.ItemViewModel[], checklistItem: ViewModels.ItemViewModel, targetPosition: number, errorHandler?: Function) {
        var previousId: number, nextId: number;
        if (targetPosition === 0) {
            // Set the nextId if the item was dropped to the top
            nextId = targetItemList[1].id();
        }
        else {
            previousId = targetItemList[targetPosition - 1].id();
            if (previousId <= 0) {
                return;
            }
        }

        var changes: TFS_Agile.IReorderOperation = {
            ParentId: checklistItem.item.getParentId(), // we need to set ParentId. Otherwise reordering with completed item wouldn't work
            Ids: [checklistItem.id()],
            PreviousId: previousId,
            NextId: nextId
        };

        var completeCallback = (elapsedTime: number) => {
            var item: Boards.WorkItemItemAdapter = checklistItem.item;
            var itemSource = item.source();
            var parentId = item.getParentId();
            itemSource.sortChildrenIds(parentId);
            this.refreshAnnotation();
            checklistItem.isSaving(false);
            Boards.KanbanTelemetry.recordChecklistTelemetry(item.type(), "Reorder");
        };

        checklistItem.isSaving(true);
        checklistItem.item.beginReorder(changes, completeCallback, errorHandler);
    }

    private _beginReparentWorkItem(workItemId: number, itemType: string, parentId: number, successCallback?: Function, errorCallback?: Function) {
        AgileUtils.WorkItemUtils.beginReparentWorkItems([workItemId], parentId).then(
            (value: number[]) => {
                if ($.isFunction(successCallback)) {
                    successCallback(value);
                }
                Boards.KanbanTelemetry.recordChecklistTelemetry(itemType, "Reparent");
            },
            (exception: TfsError) => {
                // Fire the checklist reparent operation failed event, so that the board view displays appropriate error message
                this._eventsHelper.fire("checklist-reparent-failed", Utils_String.htmlEncode(exception.message));

                this.refreshAnnotation();

                if ($.isFunction(errorCallback)) {
                    errorCallback(exception);
                }
            });
    }

    // returns true if the annotation detail pane was removed, false otherwise
    private _removeWorkItemListContainer(): boolean {
        if (this.$annotationDetailPaneControl && this.$annotationDetailPaneControl.length > 0) {
            this._detachChecklistHandlers();
            ko.removeNode(this.$annotationDetailPaneControl[0]);
            this.$annotationDetailPaneControl = null;
            this.options.onAnnotationDetailPaneStateChange(this, Annotations.AnnotationDetailPaneState.CLOSED);
            this._checklistControl.dispose();
            this._checklistControl = null;
            // Fix swimlane height when remove the checklist container.
            this._eventsHelper.fire(Boards.Notifications.BoardHeightChanged);
            return true;
        }

        return false;
    }

    private _detachChecklistHandlers() {
        if (this._beginEditWorkItemListHandler) {
            this._eventsHelper.detachEvent(Cards.Notifications.CardWorkItemListBeginEdit, this._beginEditWorkItemListHandler);
            this._beginEditWorkItemListHandler = null;
        }
        if (this._endEditWorkItemListHandler) {
            this._eventsHelper.detachEvent(Cards.Notifications.CardWorkItemListEndEdit, this._endEditWorkItemListHandler);
            this._endEditWorkItemListHandler = null;
        }
    }

    private _updateChecklistAnnotation(items: Boards.Item[]) {
        this._ensureAnnotation(items);

        if (this._checklistControl && this._checklistControl.viewModel) {
            var checklistItems: ViewModels.ItemViewModel[] = this._checklistControl.viewModel.listItems();

            // remove
            var itemsToRemove: ViewModels.ItemViewModel[] = [];
            for (var i = 0, len = checklistItems.length; i < len; i++) {
                var currentChecklistItem = checklistItems[i];
                var found = false;
                for (var j = 0, itemLength = items.length; j < itemLength; j++) {
                    var currentItem = items[j];
                    if (currentItem.id() === currentChecklistItem.id()) {
                        // Update state, title and isValid state
                        currentChecklistItem.isComplete(this._isStateComplete(currentItem));
                        currentChecklistItem.name(currentItem.fieldValue(DatabaseCoreFieldRefName.Title));
                        currentChecklistItem.isValid(!currentItem.message());
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    itemsToRemove.push(currentChecklistItem);
                }
            }
            for (var i = 0, len = itemsToRemove.length; i < len; i++) {
                this._checklistControl.viewModel.removeItemFromCollection(itemsToRemove[i].id());
            }

            // add new items
            if (items.length !== checklistItems.length) {
                var indexesToInsert: number[] = [];
                var checklistIndex = 0;
                for (var i = 0, itemLength = items.length; i < itemLength; i++) {
                    if (checklistItems.length && checklistItems[checklistIndex].id() !== items[i].id()) {
                        indexesToInsert.push(i);
                        continue;
                    }

                    if (checklistIndex < checklistItems.length - 1) {
                        checklistIndex++;
                    }
                }

                for (var i = 0, len = indexesToInsert.length; i < len; i++) {
                    var indexToInsert = indexesToInsert[i];
                    this._checklistControl.viewModel.insertItem(indexToInsert, items[indexToInsert]);
                }
            }
        }
    }
}

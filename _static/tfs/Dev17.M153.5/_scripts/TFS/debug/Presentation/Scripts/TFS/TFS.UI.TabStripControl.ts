/// <amd-dependency path="jQueryUI/sortable"/>
/// <reference types="jquery" />
/// <reference types="knockout" />

import Controls = require("VSS/Controls");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Diag = require("VSS/Diag");
import ko = require("knockout");
import Menus = require("VSS/Controls/Menus");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import TFS_TabStrip_ViewModels = require("Presentation/Scripts/TFS/TFS.ViewModels.TabStripControl");
import TFS_ArrowControl = require("Presentation/Scripts/TFS/TFS.UI.ArrowScrollBar");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");

TFS_Knockout.overrideDefaultBindings()

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

/**
 * @interface 
 * Interface for tab strip control options
 */
export interface ITabStripControlOptions<T extends TFS_TabStrip_ViewModels.TabCollectionViewModel<TFS_TabStrip_ViewModels.TabViewModel>> {
    /**
     * onValid: Callback function when valid state of the control changed. 
     */
    onValid?: Function;
    /**
     * onDirtyStateChanged: Callback function on dirty state changed.
     */
    onDirtyStateChanged?: Function;
    /**
     * onValidStateChanged: Callback function on valid state changed.
     */
    onValidStateChanged?: Function;
    /**
     * onTabSelect: Callback function when tab is selected.
     */
    onTabSelected?: Function;
    /**
     * canEdit: Flag indicates whether this control is editable. 
     */
    canEdit?: boolean;
    /**
     * align: Tab control alignment. Valid value are "horizontal", "vertical".
     */
    align?: string;
    /**
     * contentTemplateClassName: Name of the knockout template to bind to the tab content area.
     */
    contentTemplateClassName: string;
    /**
     * tabCollection: The tab collection view model for the control.
     */
    tabCollection: T;
    /**
     * extraMenuItems: Extra menu items to be shown in the tab.
     */
    extraMenuItems?: Menus.IMenuItemSpec[];
    /**
    * overrideTemplateBinding: Flag indicating whether we want to use knockout template binding or not
    */
    overrideTemplateBinding?: boolean;
    /**
    * enableContainment: Enable the draggable containment support of sortable.
    */
    enableContainment?: boolean;
    /**
    * disablePopupMenuFocus: Disable focussing the popup menu on tabs
    */
    disablePopupMenuFocus?: boolean;
    /**
    * useArrowKeysSwitchTab: Enable use arrow keys (LEFT/RIGHT/UP/DOWN) to switch betweeen tabs than TAB key
    */
    useArrowKeysSwitchTab?: boolean;
}

/**
 * Tab strip control using knockout template binding with tab collection view model and tab view model.
 */
export class TabStripControl<T extends TFS_TabStrip_ViewModels.TabCollectionViewModel<TFS_TabStrip_ViewModels.TabViewModel>> extends Controls.Control<ITabStripControlOptions<T>> {
    public static HORIZONTAL_ALIGN = "horizontal";
    public static VERTICAL_ALIGN = "vertical";

    private static SORT_ANIMATION_DURATION_TIME: number = 50;
    private static TAB_TEMPLATE = "tabstrip-collection-template";

    public static TAB_SORTED_EVENT = "tab-sorted";
    public static TAB_MENU_ITEM_CLASS = "tabstrip-menu-item";

    private static TAB_CONTROL_CLASS = "tabstrip-control";
    private static TAB_ADD_BUTTON_CLASS = "add-control";
    private static TAB_CONTROL_CONTAINER_CLASS = "tabstrip-control-container";
    private static TAB_COLLECTION_CONTAINER_CLASS = "tabstrip-collection-container";
    private static TAB_CONTENT_CONTAINER_CLASS = "tabstrip-content-container";
    private static TAB_SORTABLE_SELECTOR = "div.tabstrip-collection.ui-sortable";
    private static TAB_CONTENT_FIRST_INPUTBOX_SELECTOR = "." + TabStripControl.TAB_CONTENT_CONTAINER_CLASS + " input:first";
    private static TAB_ACTIVE_SELECTOR = ".tabstrip.active";
    private static TAB_SELECTOR = ".tabstrip";
    private static TAB_POPUP_MENU_SELECTOR = "." + TabStripControl.TAB_CONTROL_CLASS + " .menu-popup";
    private static TAB_ACTIVE_GRIPPER_SELECTOR = TabStripControl.TAB_ACTIVE_SELECTOR + " .header-gripper";
    private static TAB_MENU_SELECTOR = ".tabstrip-menu";
    private static TAB_SORTABLE_HELPER_CLASS = "tabstrip-sortable-helper";
    private static TAB_MESSAGE_AREA_CONTAINER_CLASS = "tabstrip-message-area-container";
    private static TAB_COLLECTION_SELECTOR = ".tabstrip-collection";

    private _isDirty: boolean;
    private _isValid: boolean;
    private _canEdit: boolean;

    private _$controlOverlay: JQuery;
    private _$contentContainer: JQuery;
    private _$tabCollectionContainer: JQuery;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _tabCollectionViewModel: T;
    private _menu: Menus.PopupMenu;
    private _menuClickHandler: Function;
    private _arrowScrollbar: TFS_ArrowControl.ArrowScrollbar;
    private _disposables: KnockoutDisposable[];

    constructor(options?: ITabStripControlOptions<T>) {
        super($.extend(
            {
                canEdit: true,
                align: TabStripControl.VERTICAL_ALIGN,
            }, options));
    }

    /**
     * Initialize the control.
     */
    public initialize() {
        super.initialize();
        this.getElement().addClass(TabStripControl.TAB_CONTROL_CLASS);
        this._disposables = [];
        this._isValid = true;
        this._isDirty = false;
        this._canEdit = this._options.canEdit;

        this._createTab();

        this._toggleControl(this._canEdit);
        if (!this._canEdit) {
            this._disableContentControls();
        }

        this._inititalizeMenuClickHandler();
    }

    /**
     * Dispose the control.
     */
    public dispose() {
        if (this._menu) {
            this._menu.dispose();
            this._menu = null;
        }

        for (var i = 0, len = this._disposables.length; i < len; i++) {
            this._disposables[i].dispose();
        }
        this._disposables = [];

        if (this._tabCollectionViewModel) {
            this._tabCollectionViewModel.dispose();
            this._tabCollectionViewModel = null;
        }
        delete ko.bindingHandlers["selectTabHandler"];
        delete ko.bindingHandlers["sortable"];
        delete ko.bindingHandlers["tabMenuClickHandler"];
        delete ko.bindingHandlers["tabMenuRightClickHandler"];
        delete ko.bindingHandlers["hidden"];
        delete ko.bindingHandlers["titleHandler"];

        // This will clean up binding context. 
        ko.cleanNode(this.getElement()[0]);

        super.dispose();
    }

    /**
     * Bind the customized handler in knockout template.
     */
    public bindCustomHandlers() {
        this.bindTabMenuClickHandler();
        this.bindTabMenuRightClickHandler();
        this.bindHidden();
        this.bindSortable();
        this.bindSelectTabHandler();
        this.bindTitleHandler();
    }

    /**
     * Enable or disable the control.
     * @param isEnabled True to enable. False to disable.
     */
    private _toggleControl(isEnabled: boolean) {
        var $element = this.getElement();
        $element.find("." + TabStripControl.TAB_ADD_BUTTON_CLASS).toggleClass("disabled", !isEnabled);
        this._toggleSortableControl(isEnabled, $element);
    }

    private _toggleSortableControl(isEnabled: boolean, $controlElement: JQuery) {
        var tabs = $controlElement.find(TabStripControl.TAB_SORTABLE_SELECTOR);
        if (isEnabled && this._tabCollectionViewModel.tabs().length > 1) {
            tabs.removeClass("disabled");
            tabs.sortable({ "disabled": false });
        }
        else {
            tabs.addClass("disabled");
            tabs.sortable({ "disabled": true });
        }
    }

    /**
     * Create tab control.
     */
    private _createTab() {
        var $element = this.getElement();

        // Create container for tab control and bind to knockout template.
        var $tabControlContainer = $(domElem("div", TabStripControl.TAB_CONTROL_CONTAINER_CLASS));
        var $tabCollectionContainer = $(domElem("div", TabStripControl.TAB_COLLECTION_CONTAINER_CLASS))
            .attr("data-bind", "template: { name: '" + TabStripControl.TAB_TEMPLATE + "' }");
        this._$tabCollectionContainer = $tabCollectionContainer;
        var $tabContentContainer = $(domElem("div", TabStripControl.TAB_CONTENT_CONTAINER_CLASS))
            .attr("data-bind", "template: { name: '" + this._options.contentTemplateClassName + "' }");
        this._$contentContainer = $tabContentContainer;
        // Create tab collection view model and bind template to the view model.
        this._tabCollectionViewModel = this._options.tabCollection;

        // Append dom element to the control.
        $tabControlContainer.append($tabCollectionContainer);
        $tabControlContainer.append($tabContentContainer);
        $element.append($tabControlContainer);

        // Bind tab template.
        this.bindTemplate();

        // Set alignment.
        $("." + TabStripControl.TAB_CONTROL_CONTAINER_CLASS, $element).addClass(this._options.align);

        var subscription = ko.computed(() => {
            if (this._canEdit) {
                var isValid = this._tabCollectionViewModel.isValid();
                var isDirty = this._tabCollectionViewModel.isDirty();

                if ($.isFunction(this._options.onValid)) {
                    // Call onValid callback only when it is valid and dirty.
                    this._options.onValid(isValid && isDirty);
                }

                this._onDirtyStateChanged(isDirty);
                this._onValidStateChanged(isValid);
            }
        });

        var sortableSubscription = ko.computed(() => {
            this._toggleSortableControl(this._canEdit, this.getElement());
        });
        this._disposables.push(subscription);
        this._disposables.push(sortableSubscription);
        this._addScrollSupport();
    }

    /*
     * Rebind the control.
     */
    public rebind() {
        this.bindTemplate();
        this._addScrollSupport();
    }

    private _addScrollSupport() {
        var options: TFS_ArrowControl.IArrowScrollSupport = {
            align: this.isHorizontal() ? TFS_ArrowControl.ScrollAlign.HORIZONTAL : TFS_ArrowControl.ScrollAlign.VERTICAL,
            scrollContainer: this._$tabCollectionContainer,
            scrollContent: this._$tabCollectionContainer.children(TabStripControl.TAB_COLLECTION_SELECTOR)
        };
        this._arrowScrollbar = new TFS_ArrowControl.ArrowScrollbar(options);
        this._arrowScrollbar.initialize();
    }

    /**
     * Bind the tab view model to the template.
     */
    public bindTemplate() {
        this._updateKoBindingHandlers(this._tabCollectionViewModel, this._$tabCollectionContainer[0]);
        var activeTabVM = this._tabCollectionViewModel.getActiveTab();
        this._selectTab(activeTabVM);
    }

    private _onDirtyStateChanged(newValue: boolean) {
        if (this._isDirty !== newValue) {
            this._isDirty = newValue;
            if ($.isFunction(this._options.onDirtyStateChanged)) {
                this._options.onDirtyStateChanged();
            }
        }
    }

    private _onValidStateChanged(newValue: boolean) {
        if (this._isValid !== newValue) {
            this._isValid = newValue;
            if ($.isFunction(this._options.onValidStateChanged)) {
                this._options.onValidStateChanged();
            }
        }
    }

    private _updateKoBindingHandlers(viewModel: T, element: HTMLElement) {
        this.bindCustomHandlers();
        ko.applyBindings(viewModel, element);
    }

    /**
     * Set tabstrip's tab content height based on common configration setting tab content height.
     */
    public setTabContentHeight() {
        var totalContainerHeight = this.getElement().parents(".tab-content").outerHeight();
        var topOffset = this.getElement().position().top;
        var warningMessageHeight = this.getElement().parents(".field-settings-container").find(".message-area-control").height();
        var tabstripHeight = this.isHorizontal() ? this._$tabCollectionContainer.outerHeight() : 0;
        var newHeight = totalContainerHeight - topOffset - tabstripHeight - warningMessageHeight;
        this._$contentContainer.outerHeight(newHeight);
        if (this._options.align === TabStripControl.VERTICAL_ALIGN) {
            // resize the vertical tabs container to match the content container.
            this._$tabCollectionContainer.outerHeight(newHeight);
        }
        this._arrowScrollbar.onContainerResize();
    }

    /**
     * Bind select tab event handler knockout custom binding.
     * Refer to tabstrip-collection-template in Board.aspx.
     */
    public bindSelectTabHandler() {
        (<any>ko.bindingHandlers).selectTabHandler = {
            init: (element, valueAccessor, allBindings, viewModel, bindingContext) => {
                var tabViewModel = valueAccessor();
                var $element = $(element);
                var isHorizontal = this.isHorizontal();
                var selectTabEventHandler = (e?: JQueryEventObject) => {
                    var activeTabVM = this._tabCollectionViewModel.getActiveTab();
                    if (activeTabVM !== tabViewModel) {
                        this._selectTab(tabViewModel);
                        if (!this._canEdit) {
                            this._disableContentControls();
                        }
                    }
                };

                var moveTabEventHandler = (isMoveBefore: boolean, isFocusOnActiveTab: boolean = false) => {
                    var fromIndex = $element.index();
                    if (isMoveBefore && this._tabCollectionViewModel.canMoveBefore(fromIndex)) {
                        this._moveTab(fromIndex, fromIndex - 1, isFocusOnActiveTab);
                    }
                    else if (!isMoveBefore && this._tabCollectionViewModel.canMoveAfter(fromIndex)) {
                        this._moveTab(fromIndex, fromIndex + 1, isFocusOnActiveTab);
                    }
                };

                var keyboardSelectTab = (index: number) => {
                    let targetTab = this._tabCollectionViewModel.tabs()[index];
                    if (targetTab) {
                        this._selectTab(targetTab);
                        this.focusOnActiveTab();
                    }
                };

                $element.bind("click", (e?: JQueryEventObject) => {
                    this._focusTab($element);
                    selectTabEventHandler(e);
                }).bind("keydown", (e?: JQueryEventObject) => {
                    if (!this._options.useArrowKeysSwitchTab && e.keyCode === Utils_UI.KeyCode.ENTER) {
                        selectTabEventHandler(e);
                    }
                    else if (e.keyCode === Utils_UI.KeyCode.UP || e.keyCode === Utils_UI.KeyCode.LEFT) {
                        if (e.ctrlKey) {
                            moveTabEventHandler(true, true);
                        }
                        else if (this._options.useArrowKeysSwitchTab) {
                            keyboardSelectTab(this._tabCollectionViewModel.getActiveTabIndex() - 1);
                        }
                        else if (e.currentTarget) {
                            this._focusTab($(e.currentTarget).prev());
                        }
                    }
                    else if (e.keyCode === Utils_UI.KeyCode.DOWN || e.keyCode === Utils_UI.KeyCode.RIGHT) {
                        if (e.ctrlKey) {
                            moveTabEventHandler(false, true);
                        }
                        else if (this._options.useArrowKeysSwitchTab) {
                            keyboardSelectTab(this._tabCollectionViewModel.getActiveTabIndex() + 1);
                        }
                        else if (e.currentTarget) {
                            this._focusTab($(e.currentTarget).next());
                        }
                    }
                });
            }
        };
    }

    /**
     * Bind sortable event handler knockout custom binding.
     * Refer to tabstrip-collection-template in Board.aspx.
     */
    public bindSortable() {
        if (this._canEdit) {
            (<any>ko.bindingHandlers).sortable = {
                init: (element, valueAccessor) => {
                    var list = valueAccessor();
                    var movedToNewPosition = false;
                    $(element).sortable({
                        items: ".tabstrip:not(.unsortable)",
                        tolerance: "pointer",
                        axis: this.isHorizontal() ? "x" : "y",
                        containment: this._options.enableContainment ? `.${TabStripControl.TAB_COLLECTION_CONTAINER_CLASS}` : null,
                        update: (event, ui) => {
                            // retrieve actual data item.
                            Diag.Debug.assert(ui.item.length === 1, "In reorder scenario, we should only find one and only one match for the ui item being reordered");
                            movedToNewPosition = true;
                            var item = <TFS_TabStrip_ViewModels.TabViewModel>ko.dataFor(ui.item[0]);
                            // get old and new position.
                            var oldIndex = ui.item.data("initial-index");
                            var newIndex = ui.item.index();
                            // JQUERY Sortable doesn't work well with Knockout, we need to 
                            // modify the observableArray twice to make it work.
                            // we also have the business rule to handle when there is only one 
                            // item in the collection, so we add the item to the array first and 
                            // then remove it to by pass that business rule.
                            if (newIndex > oldIndex) {
                                //move down
                                list.splice(newIndex + 1, 0, item);
                                list.splice(oldIndex, 1);

                            }
                            else {
                                //move up
                                list.splice(newIndex, 0, item);
                                list.splice(oldIndex + 1, 1);
                            }
                            ko.removeNode(ui.item[0]);
                            // Knockout should automatically computes, but we observed bug indicate it may not be triggered in some case cause a temp error message not cleared, force flush
                            list.notifySubscribers();
                            this._selectTab(item);

                            this._fire(TabStripControl.TAB_SORTED_EVENT, {
                                tab: item,
                                fromIndex: oldIndex,
                                toIndex: newIndex
                            });
                        },
                        revert: TabStripControl.SORT_ANIMATION_DURATION_TIME,
                        opacity: 0.8,
                        cursor: "move",
                        start: (event: JQueryEventObject, uiElement: any) => {
                            uiElement.helper.addClass(TabStripControl.TAB_SORTABLE_HELPER_CLASS);

                            // hide popup menu.
                            $(TabStripControl.TAB_POPUP_MENU_SELECTOR).hide();

                            //store the inital position
                            uiElement.item.data("initial-index", uiElement.item.index());
                        },
                        stop: (event: JQueryEventObject, uiElement: any) => {
                            // show popup menu.
                            $(TabStripControl.TAB_POPUP_MENU_SELECTOR).show();
                            uiElement.item.removeClass(TabStripControl.TAB_SORTABLE_HELPER_CLASS);

                            if (!movedToNewPosition) {
                                //!!!THIS IS A WORKAROUND
                                //when user drag the item and drop it to the original space, jQuery made some modification on DOM (get rid of extra space between tabs)
                                //Knockout can't work without spaces and don't know how to sync the VM
                                //Remove the item and add it back can force knockout to refresh DOM, similar approach as what we did in update 
                                //(we can't reuse the same logic in update because new index and old index are the same and knockout will remove the tab)

                                var item = <TFS_TabStrip_ViewModels.TabViewModel>ko.dataFor(uiElement.item[0]);
                                var index = uiElement.item.index();
                                list.remove(item);
                                list.splice(index, 0, item);
                                ko.removeNode(uiElement.item[0]);
                            }
                            movedToNewPosition = false;
                        }
                    });
                }
            };
        }
    }

    /**
     * Bind tab popup menu event handler knockout custom binding. 
     * Refer to tabstrip-collection-template in Board.aspx.
     */
    public bindTabMenuClickHandler() {
        if (this._canEdit) {
            (<any>ko.bindingHandlers).tabMenuClickHandler = {
                init: (element, valueAccessor, allBindings, viewModel, bindingContext) => {
                    var tabVM = valueAccessor();
                    var $element = $(element);

                    if (!this._hasPopupMenuItems(tabVM)) {
                        // if there are no item in the context menu, hide the ellipsis icon on the tab and not bind handlers.
                        $element.hide();
                    }
                    else {
                        $element.bind("click", (e?: JQueryEventObject) => {
                            $element.focus();
                            this._menuClickHandler(e, tabVM);
                        }).bind("keydown", (e?: JQueryEventObject) => {
                            if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                                this._menuClickHandler(e, tabVM);
                            }
                        });
                    }
                }
            };
        }
    }

    /**
     * Bind tab popup menu right click event handler knockout custom binding.
     */
    public bindTabMenuRightClickHandler() {
        if (this._canEdit) {
            (<any>ko.bindingHandlers).tabMenuRightClickHandler = {
                init: (element, valueAccessor, allBindings, viewModel, bindingContext) => {
                    var tabVM = valueAccessor();
                    var $element = $(element);
                    if (this._hasPopupMenuItems(tabVM)) {
                        $element.bind("contextmenu", (event: JQueryEventObject) => this._onContextMenu(event, tabVM));
                        $element.keydown((event: JQueryKeyEventObject) => {
                            var keyCode = Utils_UI.KeyCode;
                            if (event.keyCode === keyCode.F10 && event.shiftKey) {
                                return this._onContextMenu(event, tabVM);
                            }
                        });
                    }
                }
            };
        }
    }

    /**
     * Bind title hanlder to set smart tooltip on tab name
     */
    public bindTitleHandler() {
        (<any>ko.bindingHandlers).titleHandler = {
            init: (element, valueAccessor, allBindings, viewModel, bindingContext) => {
                var tabVM = valueAccessor();
                var $element = $(element);
                Utils_UI.tooltipIfOverflow($element[0], { titleText: tabVM.tabName });
            }
        };
    }

    private _onContextMenu(e: JQueryKeyEventObject, tabVM: any): Boolean {
        var $anchorElement = $(e.currentTarget).find(TabStripControl.TAB_MENU_SELECTOR);
        this._menuClickHandler(e, tabVM, $anchorElement);
        e.preventDefault();
        return false;
    }
    /**
     * Bind hidden knockout custom binding to hide menu popup icon.
     * Refer to tabstrip-collection-template in Board.aspx.
     */
    public bindHidden() {
        (<any>ko.bindingHandlers).hidden = {
            update: (element, valueAccessor) => {
                var hidden = ko.utils.unwrapObservable(valueAccessor());
                $(element).css("visibility", hidden ? "hidden" : "");
            }
        };
    }

    private _inititalizeMenuClickHandler() {
        this._menuClickHandler = delegate(this, (e: JQueryEventObject, tabVM: TFS_TabStrip_ViewModels.TabViewModel, $anchorElement?: JQuery) => {
            if (this._menu) {
                this._menu.dispose();
                this._menu = null;
            }
            this._menu = this._createPopupMenu(tabVM, this.getElement());
            if (this._menu) {
                var $anchor = $anchorElement || $(e.currentTarget);
                this._menu.popup($anchor, $anchor);
                if (!this._options.disablePopupMenuFocus) {
                    this._menu.focus();
                }
                e.stopPropagation();
            }
        });
    }

    private _createPopupMenu(tabViewModel: TFS_TabStrip_ViewModels.TabViewModel, $element: JQuery): Menus.PopupMenu {
        var items: Menus.IMenuItemSpec[] = this._createPopupMenuItems(tabViewModel);
        if (items.length <= 0) {
            return null;
        }
        var menuOptions = {
            align: "left-bottom",
            items: [{ childItems: items }],
            onDeactivate: () => {
                $(TabStripControl.TAB_POPUP_MENU_SELECTOR, this.getElement()).css("visibility", "hidden");
            }
        };
        var menu = <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, $element, menuOptions);
        return menu;
    }

    private _createPopupMenuItems(tabViewModel: TFS_TabStrip_ViewModels.TabViewModel): any[] {
        var menuItems: Menus.IMenuItemSpec[] = [];
        var tabIndex = this._tabCollectionViewModel.tabs().indexOf(tabViewModel);

        if ($.isArray(this._options.extraMenuItems) && this._options.extraMenuItems.length > 0) {
            $.each(this._options.extraMenuItems, (i: number, menuItem: Menus.IMenuItemSpec) => {
                if (tabViewModel.canExecuteCommand(menuItem.id)) {
                    menuItem.arguments = tabViewModel;
                    menuItems.push(menuItem);
                }
            });
        }

        if (tabViewModel.canDelete()) {
            menuItems.push({
                id: "delete-command",
                text: PresentationResources.TabStrip_Menu_Remove,
                setDefaultTitle: false,
                cssClass: TabStripControl.TAB_MENU_ITEM_CLASS,
                noIcon: false,
                icon: "bowtie-icon bowtie-edit-delete",
                arguments: tabViewModel,
                action: () => {
                    this._deleteTab(tabIndex);
                }
            });
        }

        var isHorizontal = this.isHorizontal();
        if (this._tabCollectionViewModel.canMoveBefore(tabIndex)) {
            menuItems.push({
                id: "moveup-command",
                text: isHorizontal ? PresentationResources.TabStrip_Menu_MoveLeft : PresentationResources.TabStrip_Menu_MoveUp,
                setDefaultTitle: false,
                icon: isHorizontal ? "bowtie-icon bowtie-arrow-left" : "bowtie-icon bowtie-arrow-up",
                cssClass: TabStripControl.TAB_MENU_ITEM_CLASS,
                noIcon: false,
                arguments: tabViewModel,
                action: () => {
                    this._moveTab(tabIndex, tabIndex - 1);
                }
            });
        }

        if (this._tabCollectionViewModel.canMoveAfter(tabIndex)) {
            menuItems.push({
                id: "movedown-command",
                text: isHorizontal ? PresentationResources.TabStrip_Menu_MoveRight : PresentationResources.TabStrip_Menu_MoveDown,
                setDefaultTitle: false,
                icon: isHorizontal ? "bowtie-icon bowtie-arrow-right" : "bowtie-icon bowtie-arrow-down",
                cssClass: TabStripControl.TAB_MENU_ITEM_CLASS,
                noIcon: false,
                arguments: tabViewModel,
                action: () => {
                    this._moveTab(tabIndex, tabIndex + 1);
                }
            });
        }

        if (this._tabCollectionViewModel.canInsertBefore(tabIndex)) {
            menuItems.push({
                id: "insert-above-command",
                text: isHorizontal ? PresentationResources.TabStrip_Menu_InsertLeft : PresentationResources.TabStrip_Menu_InsertAbove,
                setDefaultTitle: false,
                cssClass: TabStripControl.TAB_MENU_ITEM_CLASS,
                noIcon: true,
                arguments: tabViewModel,
                action: () => {
                    this.insertTab(tabIndex);
                }
            });
        }

        if (this._tabCollectionViewModel.canInsertAfter(tabIndex)) {
            menuItems.push({
                id: "insert-below-command",
                text: isHorizontal ? PresentationResources.TabStrip_Menu_InsertRight : PresentationResources.TabStrip_Menu_InsertBelow,
                setDefaultTitle: false,
                cssClass: TabStripControl.TAB_MENU_ITEM_CLASS,
                noIcon: true,
                arguments: tabViewModel,
                action: () => {
                    this.insertTab(tabIndex + 1);
                }
            });
        }

        return menuItems;
    }

    private _hasPopupMenuItems(tabViewModel: TFS_TabStrip_ViewModels.TabViewModel): boolean {
        var tabIndex = this._tabCollectionViewModel.tabs().indexOf(tabViewModel);

        return tabViewModel.canDelete()
            || this._tabCollectionViewModel.canMoveBefore(tabIndex)
            || this._tabCollectionViewModel.canMoveAfter(tabIndex)
            || this._tabCollectionViewModel.canInsertBefore(tabIndex)
            || this._tabCollectionViewModel.canInsertAfter(tabIndex)
            || ($.isArray(this._options.extraMenuItems) && this._options.extraMenuItems.length > 0);
    }

    /**
     * Return isValid state.
     */
    public isValid(): boolean {
        return this._isValid;
    }

    /**
     * Return isDirty state.
     */
    public isDirty(): boolean {
        return this._isDirty;
    }

    public isHorizontal(): boolean {
        return Utils_String.ignoreCaseComparer(this._options.align, TabStripControl.HORIZONTAL_ALIGN) === 0;
    }

    private _focusTab($tab: JQuery) {
        this._setTabIndexAttrs($tab);
        $tab.focus();
    }

    private _selectTab(tabViewModel: TFS_TabStrip_ViewModels.TabViewModel) {
        this._tabCollectionViewModel.selectTab(tabViewModel);
        if (!this._options.overrideTemplateBinding) {
            this._bindTabContentTemplate();
        }
        const $activeTab = $(TabStripControl.TAB_ACTIVE_SELECTOR, this.getElement());
        if (this._arrowScrollbar) {
            this._arrowScrollbar.scrollElementIntoView($activeTab);
        }

        this._setTabIndexAttrs($activeTab);

        if ($.isFunction(this._options.onTabSelected)) {
            this._options.onTabSelected();
        }
    }

    private _setTabIndexAttrs($selectedTab: JQuery) {
        $selectedTab.attr("tabindex", 0);
        $selectedTab.siblings().attr("tabindex", -1);
    }

    /**
     * Insert new tab.
     * @param start - start index to insert.
     */
    public insertTab(start: number) {
        var tabViewModel = this._tabCollectionViewModel.createTabViewModel(start - 1); // reference tab index is the previous one.
        this._tabCollectionViewModel.insertTab(tabViewModel, start);
        if (!this._options.overrideTemplateBinding) {
            this._bindTabContentTemplate();
        }
        this._highlightInputBox();
        this._arrowScrollbar.scrollElementIntoView($(TabStripControl.TAB_ACTIVE_SELECTOR, this.getElement()));
        if ($.isFunction(this._options.onTabSelected)) {
            this._options.onTabSelected();
        }
    }

    private _moveTab(fromIndex: number, toIndex: number, isFocusOnActiveTab: boolean = false) {
        this._tabCollectionViewModel.moveTab(fromIndex, toIndex);
        if (!this._options.overrideTemplateBinding) {
            this._bindTabContentTemplate();
        }
        if (isFocusOnActiveTab) {
            this.focusOnActiveTab();
        }
    }

    private _deleteTab(index: number) {
        var deleteAction = () => {
            this._tabCollectionViewModel.deleteTab(index);
            if (!this._options.overrideTemplateBinding) {
                this._bindTabContentTemplate();
            }
            this._arrowScrollbar.onContainerResize();
            this.focusOnActiveTab();
        };
        var tabViewModel: TFS_TabStrip_ViewModels.TabViewModel = this._tabCollectionViewModel.tabs()[index];

        if (tabViewModel.confirmBeforeDelete()) {
            tabViewModel.confirmDelete(() => {
                deleteAction();
            });
        }
        else {
            deleteAction();
        }
    }

    private _bindTabContentTemplate() {
        var tabViewModel = this._tabCollectionViewModel.getActiveTab();
        ko.applyBindings(tabViewModel, this._$contentContainer[0]);
        this.focusInputBox();
        this._tabCollectionViewModel.message.valueHasMutated();
    }

    /**
     * Set focus on first input box.
     */
    public focusInputBox() {
        var inputElem = $(TabStripControl.TAB_CONTENT_FIRST_INPUTBOX_SELECTOR, this.getElement());
        if (inputElem.length > 0) {
            inputElem.focus();
        }
        else {
            $(TabStripControl.TAB_ACTIVE_SELECTOR, this.getElement()).focus();
        }
    }

    /**
     * Highlight text in the first input box.
     */
    private _highlightInputBox() {
        var inputElem = $(TabStripControl.TAB_CONTENT_FIRST_INPUTBOX_SELECTOR, this.getElement());
        if (inputElem.length > 0) {
            inputElem.select();
        }
    }

    /**
     * Disabled all controls in content Container.
     */
    private _disableContentControls() {
        this._$contentContainer.find("input, textarea, select, .input-text-box").attr("disabled", "disabled");
    }

    public focusOnActiveTab() {
        this._focusTab($(TabStripControl.TAB_ACTIVE_SELECTOR, this.getElement()));
    }
}

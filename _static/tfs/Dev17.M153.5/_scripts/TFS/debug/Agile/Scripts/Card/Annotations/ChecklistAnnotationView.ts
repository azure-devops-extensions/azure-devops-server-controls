/// <reference types="jquery" />

import ko = require("knockout");

import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

import Menus = require("VSS/Controls/Menus");
import Utils_String = require("VSS/Utils/String");
import VSS_Controls = require("VSS/Controls");
import VSS_Core = require("VSS/Utils/Core");
import VSS_Menus = require("VSS/Controls/Menus");

import Agile = require("Agile/Scripts/Common/Agile");
import Agile_Boards = require("Agile/Scripts/TFS.Agile.Boards");
import Agile_Controls_Resources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import ViewModels = require("Agile/Scripts/Card/Annotations/ChecklistAnnotationViewModels");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";

import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import { loadHtmlTemplate } from "Agile/Scripts/Board/Templates";
import { ITeam } from "Agile/Scripts/Models/Team";

TFS_Knockout.overrideDefaultBindings()

var delegate = VSS_Core.delegate;

/**
 * @interface
 * An interface for IWorkItemChecklistControlOptions options
 */
export interface IWorkItemChecklistControlOptions {

    /**
     * parentWorkItem: Parent Work Item
     */
    parentWorkItem: Agile_Boards.Item;
    /**
     * items: An array of work items
     */
    items: Agile_Boards.Item[];
    /**
     * defaultWorkItemType: Default work item type
     */
    defaultWorkItemType?: string;
    /**
     * workItemType: Work Item this view instance represents
     */
    workItemType?: string;
    /**
     * workItemCreationEnabled: Should users be able to create new work items from this list
     */
    workItemCreationEnabled: boolean;

    team: ITeam;
    /**
     * eventScope: Scope for events for the checklist
     */
    eventScope: string;
}

export class WorkItemChecklistControl extends VSS_Controls.Control<IWorkItemChecklistControlOptions> {
    public viewModel: ViewModels.WorkItemListCollectionViewModel;

    // Public for testing 
    public _menu: ChecklistItemMenu;
    private _managedTitleTooltipsMap: IDictionaryNumberTo<RichContentTooltip>;
    private _managedErrorTooltipsMap: IDictionaryNumberTo<RichContentTooltip>;
    private static template = "work_item_list_template";
    private static templateClass = "work-item-list-template";
    private static workItemContextMenu = ".work-item-context-menu";
    private static workItemContainer = ".work-item-list-container .work-item";
    private static workItemError = WorkItemChecklistControl.workItemContainer + " .error-message-icon"

    constructor(options: IWorkItemChecklistControlOptions) {
        super(options);

        var workItemListCollectionViewModelOptions: ViewModels.IWorkItemListCollectionViewModelOptions = {
            teamId: options.team.id,
            parentWorkItem: options.parentWorkItem,
            workItems: options.items,
            workItemCreationEnabled: options.workItemCreationEnabled,
            workItemType: options.workItemType,
            defaultWorkItemType: "Task",
            onCreateContextMenu: delegate(this, this._onCreateContextMenu),
            eventScope: options.eventScope
        };

        this._managedTitleTooltipsMap = {};
        this._managedErrorTooltipsMap = {};
        this.viewModel = new ViewModels.WorkItemListCollectionViewModel(workItemListCollectionViewModelOptions);
    }

    /**
     * Initializes the control
     */
    public initialize(): void {
        super.initialize();

        var $element = loadHtmlTemplate(WorkItemChecklistControl.template, WorkItemChecklistControl.templateClass);
        if ($element) {
            this._bindIconControl();
            ko.applyBindings(this.viewModel, $element[0]);
            this.getElement().append($element);
            this.enhanceTooltips();
            this._initMenu();
        }

    }

    private enhanceTooltips(): void {

        this.viewModel.listItems.subscribe(this._addTooltipToItems);
        this._addTooltipToItems(this.viewModel.listItems());
    }

    private _bindIconControl() {
        (<any>ko.bindingHandlers).icon = {
            init: (element, valueAccessor, allBindings, viewModel, bindingContext) => {
                const input = allBindings().icon as { project: string, type: string, containerSelector: string };
                const $container = $(element).find(input.containerSelector);
                if (input.type && input.project) {
                    WorkItemTypeIconControl.renderWorkItemTypeIcon(
                        $container[0],
                        input.type,
                        input.project);
                }

                ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
                    WorkItemTypeIconControl.unmountWorkItemTypeIcon($container[0]);
                });
            }
        };
    }

    private _updateTooltipname = (index: number, newTitle: string): void => {
        if (newTitle) {
            var titleTooltip = this._managedTitleTooltipsMap[index];
            if (titleTooltip) {
                titleTooltip.setTextContent(newTitle);
            }
            else {
                const $element = this.getElement();
                const elements = $element.find(WorkItemChecklistControl.workItemContainer);
                // TODO MSENG 963892 add this only on overflow. Can't use addIfOverflow since this is not using browser overflow
                titleTooltip = RichContentTooltip.add(newTitle, elements[index]);

                this._managedTitleTooltipsMap[index] = titleTooltip;
            }
        }
    }

    private _updateErrorMessageTooltip = (index: number, newError: string): void => {
        if (newError) {
            var errorTooltip = this._managedErrorTooltipsMap[index];
            if (errorTooltip) {
                errorTooltip.setTextContent(newError);
            }
            else {
                const $element = this.getElement();
                const elements = $element.find(WorkItemChecklistControl.workItemError);
                errorTooltip = RichContentTooltip.addIfOverflow(newError, elements[index], { setAriaDescribedBy: true });

                this._managedErrorTooltipsMap[index] = errorTooltip;
            }
        }
    }

    private _addTooltipToItems = (newItems: ViewModels.ItemViewModel[]): void => {
        this._disposeManagedTooltips();
        for (var x = 0; x < newItems.length; x++) {
            const item = newItems[x];
            const nameObservable = item.name;
            this._updateTooltipname(x, nameObservable());
            nameObservable.subscribe(VSS_Core.curry(this._updateTooltipname, x));
            this._updateErrorMessageTooltip(x, item.message());
        }
    }

    /**
     * Disposes the elements associated with the control.
     */
    public dispose(): void {
        if (this._menu) {
            this._menu.dispose();
            this._menu = null;
        }
        if (this.viewModel) {
            this.viewModel.dispose();
            this.viewModel = null;
        }
        this._disposeManagedTooltips();
        super.dispose();
    }

    private _disposeManagedTooltips() {
        for (let titleTooltip in this._managedTitleTooltipsMap) {
            if (this._managedTitleTooltipsMap[titleTooltip]) {
                this._managedTitleTooltipsMap[titleTooltip].dispose();
            }
        }

        for (let titleTooltip in this._managedErrorTooltipsMap) {
            if (this._managedErrorTooltipsMap[titleTooltip]) {
                this._managedErrorTooltipsMap[titleTooltip].dispose();
            }
        }

        this._managedTitleTooltipsMap = {};
        this._managedErrorTooltipsMap = {};
    }

    /**
     * Set focus to this container - sets the focus to the first element in this container.
     */
    public focus(): void {
        const $element = this.getElement();
        const tabbableElements = $element.find("[tabindex='0']");
        if (tabbableElements && tabbableElements.length > 0) {
            tabbableElements[0].focus();
        }
    }

    private _initMenu(): void {
        this.getElement().click((e) => {

            if (!$(e.currentTarget).hasClass("work-item-menu")) {
                this._disposeChecklistItemMenu();
            }
        });
    }

    private _onCreateContextMenu(e: JQueryEventObject, workItem: ViewModels.WorkItemViewModel): void {
        this._disposeChecklistItemMenu();

        let options: IChecklistItemMenuOptions = {
            align: "left-bottom",
            workItem: workItem,
            team: this._options.team,
            onHide: () => { workItem.isContextMenuOpen(false) }
        };

        this._menu = VSS_Controls.Control.create(ChecklistItemMenu, this.getElement(), options);

        if (this._menu) {
            workItem.isContextMenuOpen(true);
            var $anchor = $(e.currentTarget);
            var $container = $anchor.find(WorkItemChecklistControl.workItemContextMenu);
            if ($container && $container.length > 0) {
                // case to handle right click on anywhere on the task annotation
                this._menu.popup($anchor, $container);
            }
            else {
                // default case to handle left click on the context menu icon
                this._menu.popup($anchor, $anchor);
            }

            this._menu.focus();
            e.stopPropagation();
        }
    }

    private _disposeChecklistItemMenu(): void {
        if (this._menu) {
            let checklistItemMenuOptions = <IChecklistItemMenuOptions>this._menu._options;
            checklistItemMenuOptions.workItem.isContextMenuOpen(false);
            this._menu.dispose();
            this._menu = null;
        }
    }
}

/**
 * @interface
 * An interface for IChecklistItemMenuOptions options
 */
export interface IChecklistItemMenuOptions extends VSS_Menus.PopupMenuOptions {

    /**
     * Team
     */
    team: ITeam;

    /**
     * item: A work item
     */
    workItem: ViewModels.WorkItemViewModel;
    /**
     * onHide: Callback on hide of work item context menu
     */
    onHide: () => void;
}

export class ChecklistItemMenu extends VSS_Menus.PopupMenu {
    constructor(options: IChecklistItemMenuOptions) {
        super(options);
    }

    public initializeOptions(options?: IChecklistItemMenuOptions): void {
        var menuItems = this._createPopupMenuItems(options);
        $.extend(options, {
            align: "left-bottom",
            items: [{ childItems: menuItems }],
            contributionIds: ["ms.vss-work-web.work-item-context-menu"],
            getContributionContext: (): Agile.ContibutionContexts.ICardContextMenu => {
                return {
                    team: options.team,
                    id: options.workItem.id(),
                    workItemType: options.workItem.itemType
                };
            },
            arguments: {
                telemetry: {
                    area: CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                    feature: CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_CARD_CHECKLIST_CONTEXT_MENU_CLICK
                }
            }
        });

        super.initializeOptions(options);
    }

    private _createPopupMenuItems(options: IChecklistItemMenuOptions): Menus.IMenuItemSpec[] {
        var menuItems: Menus.IMenuItemSpec[] = [];
        var workItem = options.workItem;

        menuItems.push({
            id: "open-item",
            text: Agile_Controls_Resources.BoardCard_ContextMenu_OpenItem,
            icon: "bowtie-icon bowtie-arrow-open",
            groupId: "open",
            setTitleOnlyOnOverflow: true,
            action: () => {
                workItem.openItem();
            }
        });

        menuItems.push({
            id: "edit-title",
            text: Agile_Controls_Resources.EditTitle,
            icon: "bowtie-icon bowtie-edit",
            groupId: "modify",
            setTitleOnlyOnOverflow: true,
            action: () => {
                var workItemTitlejQuerySelector = Utils_String.format(".work-item-list-container #{0} .work-item-title-container .title", workItem.id());
                workItem.onStartEditWorkItem($(workItemTitlejQuerySelector));
            }
        });

        return menuItems;
    }
}

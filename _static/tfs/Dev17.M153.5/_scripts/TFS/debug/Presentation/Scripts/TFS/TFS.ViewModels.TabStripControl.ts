/// <reference types="jquery" />
/// <reference types="knockout" />

import ko = require("knockout");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

TFS_Knockout.overrideDefaultBindings()

/**
 * @interface 
 * Interface for result of tab validate function.
 */
export interface ITabValidateResult {
    /**
     * isValid: True if it is valid. False otherwise. 
     */
    isValid: boolean;
    /**
     * message: The validation message. 
     */
    message: string;
}

/**
 * @interface 
 * Interface for tab collection validator.
 */
export interface ITabCollectionValidator {
    /**
     * validate: Validate function for tab collection. 
     * @param tabCollectionViewModel 
     * @return Result whether it is valid and the error message. 
     */
    validate: (tabCollectionViewModel: TabCollectionViewModel<TabViewModel>) => ITabValidateResult;
}

/**
 * Tab collection validator class.
 */
export class TabCollectionValidator implements ITabCollectionValidator {
    /**
     * validate: Validate function for tab collection. 
     * @param tabCollectionViewModel 
     * @return Result whether it is valid and the error message. 
     */
    public validate(tabCollectionViewModel: TabCollectionViewModel<TabViewModel>): ITabValidateResult {
        Diag.Debug.fail("validate must be overriden by derived classes");
        return null;
    }
}

/**
 * @interface 
 * Interface for tab view model.
 */
export interface ITabViewModelOptions {
    /**
     * Tab id.
     */
    id: string;
    /**
     * Tab name.
     */
    name: string;
    /**
     * Reference to tabCollection.
     */
    tabCollection?: TabCollectionViewModel<TabViewModel>;
}

/**
 * View model for tab.
 */
export class TabViewModel {
    public id: string;
    public tabCollection: TabCollectionViewModel<TabViewModel>;
    public name: KnockoutObservable<string>;
    public message: KnockoutObservable<string>;
    public isDirty: KnockoutObservable<boolean>;
    public isValid: KnockoutObservable<boolean>;

    private _originalName: string;
    protected _disposables: KnockoutDisposable[];

    constructor(options?: ITabViewModelOptions) {
        options = $.extend({ id: null, name: "" }, options);
        if (options.name === null) {
            options.name = "";
        }
        this.id = options.id;
        this.tabCollection = options.tabCollection;
        this.name = ko.observable(options.name);
        this._originalName = options.name;
        this.message = ko.observable("");
        this.isValid = ko.observable(true);
        this.isDirty = ko.observable(true);

        this._disposables = [];
        var nameChangedSubscription = ko.computed(() => {
            var name = this.name();
            var isNameChanged = Utils_String.localeComparer(this._originalName, name) !== 0;
            this.isDirty(isNameChanged);
        });
        this._disposables.push(nameChangedSubscription);
    }

    /**
     * Dispose the view model.
     */
    public dispose() {
        for (var i = 0, len = this._disposables.length; i < len; i++) {
            this._disposables[i].dispose();
        }
        this._disposables = [];
    }

    /**
     * @return True if the tab is allowed to be deleted.
     */
    public canDelete(): boolean {
        return true;
    }

    /**
     * @return True if the tab is allowed to execute extra menu items.
     */
    public canExecuteCommand(commandName: string): boolean {
        return true;
    }

    /**
     * @return false is we should confirm before deleting this tab.
     */
    public confirmBeforeDelete(): boolean {
        return false;
    }

    /**
     * @the confirm function to be called before deleting the tab
     */
    public confirmDelete(okCallback: () => void): void {
        okCallback();
    }

    /**
     * @return True if the tab can be sortable.
     */
    public isSortable(): boolean {
        return true;
    }

    /**
     * Reset the view model.
     * @param options - data used to reset the view model.
     */
    public reset(options: ITabViewModelOptions) {
        this.isDirty(false);
        this._originalName = options.name;
    }
}

/**
 * View model for tab collection.
 */
export class TabCollectionViewModel<T extends TabViewModel> {
    private static DEFAULT_TAB_INDEX = 0;
    private static SORT_ANIMATION_DURATION_TIME: number = 50;

    public tabCollectionValidator: TabCollectionValidator;
    public tabs: KnockoutObservableArray<T>;
    public activeTabIndex: KnockoutObservable<number>;
    public isValid: KnockoutObservable<boolean>;
    public isDirty: KnockoutObservable<boolean>;
    public message: KnockoutObservable<string>;

    protected _disposables: KnockoutDisposable[];
    private _originalTabIdsOrder: string[];

    constructor(private type, tabViewModelOptions: ITabViewModelOptions[], tabCollectionValidator?: TabCollectionValidator) {
        this._disposables = [];
        this.tabs = ko.observableArray([]);
        this.activeTabIndex = ko.observable(TabCollectionViewModel.DEFAULT_TAB_INDEX);
        this._originalTabIdsOrder = [];
        this.tabCollectionValidator = tabCollectionValidator;

        $.each(tabViewModelOptions, (index: number, tabViewModel: ITabViewModelOptions) => {
            tabViewModel.tabCollection = this;
            this._originalTabIdsOrder.push(tabViewModel.id);
            this.tabs.push(new this.type(tabViewModel));
        });

        this.message = ko.observable("");
        this.isValid = ko.observable(true);
        this.isDirty = ko.observable(false);

        var tabsChangedSubscription = ko.computed(() => {
            var tabs = this.tabs();

            // Computed isDirty flag.
            var isDirty = false;
            // If tab counts are different, treat it as dirty
            if (tabs.length !== this._originalTabIdsOrder.length) {
                isDirty = true;
            }
            for (var i = 0, len = tabs.length; i < len; i++) {
                // return immediately is it is dirty
                if (tabs[i].isDirty()) {
                    isDirty = true;
                }
                if (Utils_String.ignoreCaseComparer(this._originalTabIdsOrder[i], tabs[i].id) !== 0) {
                    isDirty = true;
                }
            }
            this.isDirty(isDirty);

            // Computed isValid flag.
            var isValid = true;
            var message = "";
            for (var i = 0, len = tabs.length; i < len; i++) {
                var tab = tabs[i];
                isValid = tabs[i].isValid() && isValid;
                message = tabs[i].message();
                if (!isValid) {
                    // if any of the tab is invalid, the collection is invalid.
                    this.message(message);
                    this.isValid(isValid);
                    return;
                }
            }

            if (this.tabCollectionValidator) {
                var validateResult = this.tabCollectionValidator.validate(this);
                isValid = validateResult.isValid;
                message = validateResult.message;
            }
            this.isValid(isValid);
            this.message(message);
        });
        this._disposables.push(tabsChangedSubscription);
    }

    /**
     * Dispose the view model.
     */
    public dispose() {
        if (this.tabCollectionValidator) {
            delete this.tabCollectionValidator;
        }

        for (var i = 0, len = this._disposables.length; i < len; i++) {
            this._disposables[i].dispose();
        }
        this._disposables = [];

        var tabs = this.tabs();
        for (var j = 0, length = tabs.length; j < length; j++) {
            tabs[j].dispose();
        }
        this.tabs.removeAll();
    }


    /**
     * Return active tab view model.
     */
    public getActiveTab(): T {
        return this.tabs()[this.getActiveTabIndex()];
    }

    /**
     * Return active tab view model.
     */
    public getActiveTabIndex(): number {
        if (this.activeTabIndex() < 0) {
            this.activeTabIndex(TabCollectionViewModel.DEFAULT_TAB_INDEX);
        }
        return this.activeTabIndex();
    }

    /**
     * Insert tab.
     * @param newTab Tab to be inserted.
     * @param start Index to be inserted.
     */
    public insertTab(tabViewModel: T, start: number) {
        if (start < 0 || start > this.tabs().length) {
            throw new Error("Invalid start index.");
        }
        this.tabs.splice(start, 0, tabViewModel);
        this._selectTabInternal(tabViewModel);
    }

    /**
     * Insert tab before active tab.
     */
    public insertBeforeActiveTab(newTab: T) {
        this.insertTab(newTab, this.getActiveTabIndex());
    }

    /**
     * @params tabIndex - the current tabIndex
     * @return True if the tab is allowed to be moved before.
    */
    public canMoveBefore(tabIndex: number): boolean {
        var length = this.tabs().length;
        return length > 1 && tabIndex > 0 && tabIndex < length;
    }

    /**
     * @params tabIndex - the current tabIndex
     * @return True if the tab is allowed to be moved after.
    */
    public canMoveAfter(tabIndex: number): boolean {
        var length = this.tabs().length;
        return length > 1 && tabIndex >= 0 && tabIndex < length - 1;
    }

    /**
     * @params tabIndex - the current tabIndex
     * @return True if the tab is allowed to be insert before.
    */
    public canInsertBefore(tabIndex: number): boolean {
        var length = this.tabs().length;
        return tabIndex >= 0 && tabIndex < length;
    }

    /**
     * @params tabIndex - the current tabIndex
     * @return True if the tab is allowed to be insert after.
    */
    public canInsertAfter(tabIndex: number): boolean {
        var length = this.tabs().length;
        return tabIndex >= 0 && tabIndex < length;
    }

    /**
     * Delete tab.
     * @param start Index to be deleted.
     */
    public deleteTab(index: number) {
        if (index < 0 || index >= this.tabs().length) {
            // invalid delete index.
            throw new Error("Invalid delete index.");
        }

        var deletedTab = this.tabs()[index];
        if (deletedTab.canDelete()) {
            this.tabs.splice(index, 1);

            //maintain active index
            var activeTabIndex = this.activeTabIndex();
            if (index < activeTabIndex) {
                //if the deleted item is before the activeTab, reduce the active index
                activeTabIndex--;
            }
            var tabsLength = this.tabs().length;
            if (activeTabIndex >= tabsLength) {
                // if active tab index is greater than number of tabs, set it to the end of the list.
                activeTabIndex = tabsLength - 1;
            }

            this.activeTabIndex(activeTabIndex);
            deletedTab.dispose();
        }
    }

    /**
     * Set the tab to be activated.
     * @param tab The tab view model.
     */
    public selectTab(tabViewModel: T) {
        this._selectTabInternal(tabViewModel);
    }

    private _selectTabInternal(tabViewModel: T) {
        var tabIndex = this.tabs.indexOf(tabViewModel);
        this.activeTabIndex(tabIndex);
    }

	/**
     * Move tab from fromIndex to toIndex
     * @param fromIndex the index of the tab that needs to move.
	 * @param toIndex the index of the tab that needs to move to.
     */
    public moveTab(fromIndex: number, toIndex: number) {
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= this.tabs().length || toIndex >= this.tabs().length) {
            // invalid index.
            return;
        }

        var items = this.tabs();
        var item = items[fromIndex];

        items.splice(fromIndex, 1);
        items.splice(toIndex, 0, item);
        this.tabs(items);
        this.activeTabIndex(toIndex);
    }

    /**
     * Generate new tab view model.
     * @param referenceTabIndex a reference tab index to be used for cloning a new tab view model.
     * @param name (optional) the name to be used for the tab view model.
     * @return new tab view model.
     */
    public createTabViewModel(referenceTabIndex: number, name?: string): TabViewModel {

        var options = {
            id: null,
            name: name || ""
        };

        return new TabViewModel(options);
    }

    /**
     * Reset the view model.
     * @param options - data used to reset the view model.
     */
    public reset(options: ITabViewModelOptions[]) {
        this._originalTabIdsOrder = [];
        var tabs = this.tabs();

        $.each(options, (index: number, tabViewModelOption: ITabViewModelOptions) => {
            this._originalTabIdsOrder.push(tabViewModelOption.id);
            tabViewModelOption.tabCollection = this;
            tabs[index].reset(tabViewModelOption);
        });

        this.message("");
        this.isValid(true);
        this.isDirty(false);
    }
}

///<amd-dependency path="jQueryUI/button"/>
///<amd-dependency path="jQueryUI/droppable"/>

import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Navigation = require("VSS/Controls/Navigation");
import Q = require("q");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import VSSError = require("VSS/Error");
var delegate = Utils_Core.delegate;

/**
 * The tab groups with tabs for the tab control 
 */
export interface ITabGroup {
    /**
     * The registered group id that uniquely identify a group 
     */
    id: string;
    /**
     * The group title that displays on the tab collection 
     */
    title: string;
    /**
     * The order of the tab group that shows on the tab control
     */
    order: number;
    /**
     * The tabs for the tab group 
     */
    tabs: ITab<any>[];
}

/**
 * The tabs in a tab group 
 */
export interface ITab<T> {
    /**
     * The registered tab id that uniquely identify a tab 
     */
    id: string;
    /**
     * The tab title that displays on the tab control 
     */
    title: string;
    /**
     * The order of the tab that shows within the tab group.  
     */
    order: number;    
    /**
     * Retrieves the ITabContent instance for the content tab  
     */
    tabContent: new (options?: T) => ITabContent;    
    /**
     * The options object of the tab content.  
     */
    tabContentOptions?: T;
}

/**
 * The interface for user to register a tab to a tab control 
 */
export interface ITabRegistration<T> {
    /**
     * The registered group id that uniquely identify a group 
     */
    groupId: string;
    /**
     * The registered tab id that uniquely identify a tab. When it is not defined, a GUID will be generated to be the id.
     */
    id?: string;
    /**
     * The tab title that displays on the tab control. When it is not defined, it will append to the existing tabs in the tab group.
     */
    title: string;
    /**
     * The order of the tab that shows within the tab group.  
     */
    order?: number;    
    /**
     * Retrieves the ITabContent instance for the content tab  
     */
    tabContent: new (options?: T) => ITabContent;
    /**
     * The option object of the tab content.  When it is not defined, an empty object will be created.
     */
    tabContentOptions?: T;
}

/**
 * The interface for user to register a tab group 
 */
export interface ITabGroupRegistration {
    /**
     * The id for the targeted tab control
     */
    tabControlId: string;

    /**
     * The group id that uniquely identify a group 
     */
    id: string;

    /**
     * The group title  
     */
    title: string;
    /**
     * The order of the tab group that shows on the tab control. When it is not defined, it will append to the existing groups.
     */
    order?: number;

}

/**
 * The tab page content instantiate when a tab is registered to the control.
 */
export interface ITabContent {
    /**
     * This method is called when user clicks on the tab for the first time. 
     */
    beginLoad?($container: JQuery): IPromise<any>;
    /**
     * Begin persisting user changes
     * Returns a promise that in turn returns a boolean flag, indicating whether the current save operation requires page refresh or not
     */
    beginSave?(): IPromise<boolean>;
    /**
     * Indicates if the control is dirty
     */
    isDirty(): boolean;   
    /**
     * Accepts the event handlers for onDirtyStateChanged and onValidStateChanged events
     */
    registerStateChangedEvents?(eventHandler: Function): void;
    /**
     * Optional method. When navigation mode for tab control is set to "CUSTOMIZED", 
     * the method is called to see if user is allowed to leave the tab. 
     */
    onTabChanging?(): boolean;
    /**
     * Optional method. When defined, it is called when user clicks back to the tab. 
     * This method will NOT be called for the first time user clicks the tab, use beginLoad($container) instead. 
     */
    onTabActivated?(initialLoad: boolean): void;
    /**
     * Optional method. Called when the control is getting resized. 
     */
    onResize?(): void; 
    /**
    * This is the callback after content has been saved.
    */
    applyChanges?: Function;
    /**
     * Optional method. Called when the control is getting disposed. 
     */
    dispose?(): void;
}

/**
 * The interface for tab control saving result 
 */
interface ITabControlSavingResult {
    /**
     * Indicator from the content control save operation, informing whether the page needs to be refreshed or not
     */
    refreshPage: boolean;
    /**
     * Saving status  
     */
    status: TabSavingStatus;
    /**
     * tab information associate with the saving  
     */
    tab: TabPage;
}

/**
* The enum for tab control saving result status
*/
export enum TabSavingStatus {
    /**
     * user input in invalid, no server saving is issued.
     */
    INVALID_USER_INPUT,
    /**
     * error in server saving
     */
    SERVER_SAVING_ERROR,
    /**
     * server saving succeeded
     */
    SUCCEEDED,
    /**
     * dirty flag is clean, no server saving is issued.
     */
    NO_CHANGE
}

/**
* The enum for tab control saving mode
*/
export enum TabControlSavingMode {
    /**
     * Content control is responsible for saving, tab control doesn't provide any saving mechanizm  
     */
    NONE,
    /**
     * Saving is on tab level 
     */
    APPLY_ON_TAB,
    /**
     * Saving is on control level, user needs to call beginSave method on tabControl  
     */
    SAVE_ON_CONTROL
}

/**
* The enum for tab control navigation mode
*/
export enum TabControlNavigationMode {
    /**
     * Always allow user to navigate away from current tab
     */
    ALWAYS_NAVIGATE,
    /**
     * Call tabContentControl onTabChanging() to determine if user can navigate away from current tab. If onTabChanging()
     * is not defined, allow user to navigate away. 
     */
    CUSTOMIZED
}

/**
* The tab control option
*/
export interface ITabControlOption {    
    /**
     * The tab groups and tabs for the control to render tabs. 
     * When it is not defined, the control will try to get the tab groups from tab registration.
     */
    groups?: ITabGroup[];
    /**
     * The saving mode for the control.
     */
    savingMode: TabControlSavingMode;
    /**
     * The generic saving error message. Displayed when TabControlSavingMode is set to SAVE_ON_CONTROL.
     */
    errorMessage?: string;
    /**
     * Used to get the tab groups from tab registration.
     * User has to specify either groups or id, when both specified, it will use groups for tab generation.
     */
    id?: string;
    /**
     * Used to set the default tab while initializing the control.
     * If not specified, the default tab would be the first tab in the list.
     */
    defaultTabId?: string;
    /**
     * Hides the tabs titles area if true
     */
    hideTabsPane?: boolean;

}

/**
 * A control for content across multiple tabs. 
 */
export class TabControl extends Controls.Control<ITabControlOption> {
    public static EVENT_DIRTY_STATE_CHANGED: string = "event-dirty-state-changed";
    public static EVENT_VALID_STATE_CHANGED: string = "event-valid-state-changed";
    public static EVENT_SAVING_STATE_CHANGED: string = "event-saving-state-changed";

    private _activeTab: TabPage;
    private _groups: ITabGroup[] = null;
    private _tabPages = new Array<TabPage>();
    private _$tabControlOverlay: JQuery;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _$settingsMessageArea: JQuery;
    private _$settingsMessageTextArea: JQuery;
    private _$contentContainerElement: JQuery;
    private _navigationMode: TabControlNavigationMode;
    private _savingMode: TabControlSavingMode;
    private _isDirty: boolean = false;
    private _isSaving: boolean = false;
    private _$tabTitles: JQuery;
    private _$tabTitleContainer: JQuery;
    private _refreshOnClose: boolean = false;
    private _onSavedCallbackList: Function[] = [];
    private _arrowScrollbar: ArrowScrollbar;

    /**
     * @param options 
     */
    public initializeOptions(options?: ITabControlOption) {
        super.initializeOptions($.extend({
            coreCssClass: "platform-tab-collection",
            errorMessage: Resources_Platform.ErrorMessage_GenericServerError
        }, options));
    }

    /**
     * Initialize the control
     */
    public initialize() {
        super.initialize();

        var defaultTab: TabPage;

        if (!this._options.groups && !this._options.id) {
            throw Error("Please provide either groups or id.");
        }

        this._navigationMode = TabControlNavigationMode.CUSTOMIZED;
        this._savingMode = this._options.savingMode;

        var $element = this.getElement();
        this._groups = this._getTabGroup();

        this._$contentContainerElement = $("<div>").addClass("tab-collection-container");
        this._$tabTitleContainer = $("<div>").addClass("tabs-titles-container");
        if (this._options.hideTabsPane) {
            this._$contentContainerElement.addClass("hide-tabs-pane");
        }
        this._$tabTitles = $("<ul>").addClass("tabs-titles");

        //Create and load Tab content container
        var $tabContentsContainer = $("<div>").addClass("tabs-contents-container");
        let first = true;
        this._groups.forEach((group) => {
            if (group && group.title) {
                var $group = $("<h2>").addClass("group-title").text(group.title).attr("title", group.title);
                this._$tabTitles.append($group);
            }

            var tabs = group.tabs;
            tabs.forEach((tab) => {
                const tabPage = this._createTabControl(group.title, tab, this._$tabTitles, $tabContentsContainer, this._savingMode, this._navigationMode, first ? 0 : -1);
                if (first) {
                    first = false;
                }
                this._tabPages.push(tabPage);
                if (!defaultTab && this._options.defaultTabId && Utils_String.localeIgnoreCaseComparer(this._options.defaultTabId, tab.id) === 0) {
                    defaultTab = tabPage;
                }
            });
        });
        this._$tabTitleContainer.append(this._$tabTitles);

        this._$contentContainerElement.append(this._$tabTitleContainer);
        this._$contentContainerElement.append($tabContentsContainer);
        $element.append(this._$contentContainerElement);

        this._addScrollSupport(this._$tabTitleContainer, this._$tabTitles);

        if (this._tabPages.length > 0) {
            if (defaultTab) {
                // Select the default tab
                this._activeTab = defaultTab;
            }
            else {
                // Select the first tab
                this._activeTab = this._tabPages[0];
            }
            this._activeTab.select();
        }

    }

    private _addScrollSupport($scrollContainer: JQuery, $scrollContent: JQuery) {
        var options: IArrowScrollSupport = {
            align: ScrollAlign.VERTICAL,
            scrollContainer: $scrollContainer,
            scrollContent: $scrollContent
        };
        this._arrowScrollbar = new ArrowScrollbar(options);
        this._arrowScrollbar.initialize();
    }

    private _getTabGroup(): ITabGroup[] {
        if (this._options.groups) {
            return this._options.groups;
        }
        else {
            return TabControlsRegistration.getRegisteredTabGroups(this._options.id);
        }
    }

    private _createMessageArea($element: JQuery) {      
        // Div to display server errors
        this._$settingsMessageArea = $("<div>").addClass("settings-message-area");
        this._$settingsMessageTextArea = $("<div>").addClass("error-message");
        this._$settingsMessageArea.append(this._$settingsMessageTextArea);
        this._$settingsMessageArea.hide();
        $element.prepend(this._$settingsMessageArea);
    }
    
    /**
     * Recalculate the size and update the navigation buttons
     */
    public onResize() {
        this._arrowScrollbar.onContainerResize();
        $.each(this._tabPages, (index, tabPage) => {
            tabPage.onResize();
        });
    }
    
    /**
     * Check the dirty states for the all tab pages 
     * @return True if any of the tab pages is dirty
     */
    public isDirty(): boolean {
        for (var i = 0, len = this._tabPages.length; i < len; i++) {
            var tab = this._tabPages[i];
            if (tab.isDirty()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check the saving states for the all tab pages 
     * @return True if any of the tab pages is saving
     */
    public isSaving(): boolean {
        for (var i = 0, len = this._tabPages.length; i < len; i++) {
            var tab = this._tabPages[i];
            if (tab.isSaving()) {
                return true;
            }
        }
        return false;
    }

    public invokeSaveCallbacks(): void {
        $.each(this._onSavedCallbackList, (index, onSavedCallback) => {
            onSavedCallback();
        });
        this.clearOnSavedCallbackList();
    }

    public clearOnSavedCallbackList(): void {
        this._onSavedCallbackList = [];
    }

    public getRefreshOnCloseStatus() {
        return this._refreshOnClose;
    }

    private _createTabControl(groupTitle: string, tab: ITab<any>, titleContainer: JQuery, contentContainer: JQuery, savingMode: TabControlSavingMode, navigationMode: TabControlNavigationMode, tabIndex: 0 | -1): TabPage {
        var tabControlOption: ITabPageOption = {
            tab: tab,
            titleContainer: titleContainer,
            contentContainer: contentContainer,
            onTabChanged: delegate(this, this._onTabChanged),
            onTabChanging: delegate(this, this._onTabChanging),
            onTabSaved: delegate(this, this._onTabSaved),
            onSavingStateChanged: delegate(this, this._onSavingStateChanged),
            onDirtyStateChanged: delegate(this, this._onDirtyStateChanged),
            navigationMode: navigationMode,
            savingMode: savingMode,
            tabIndex: tabIndex,
        };
        var tabControl = new TabPage(tabControlOption);
        tabControl.initialize();
        return tabControl;
    }

    private _onTabChanged(tab: TabPage) {
        this._activeTab = tab;
    }

    private _onTabChanging(): boolean {
        switch (this._navigationMode) {
            case TabControlNavigationMode.ALWAYS_NAVIGATE:
                return true;
            case TabControlNavigationMode.CUSTOMIZED:
                return this._activeTab.onTabChanging();
            default:
                return true;
        }
    }

    private _onTabSaved(result: ITabControlSavingResult) {
        if (result.status !== TabSavingStatus.SUCCEEDED) {
            this._showError();
        }
    }

    private _onSavingStateChanged() {
        var newValue = this.isSaving();
        if (this._isSaving !== newValue) {
            this._isSaving = newValue;
            this._fire(TabControl.EVENT_SAVING_STATE_CHANGED);
        }
    }

    private _onDirtyStateChanged() {
        var newValue = this.isDirty();
        if (this._isDirty !== newValue) {
            this._isDirty = newValue;
            this._fire(TabControl.EVENT_DIRTY_STATE_CHANGED);
        }
    }

    private _showError(message?: string) {
        if (this._savingMode === TabControlSavingMode.SAVE_ON_CONTROL) {
            if (!message) {
                message = this._options.errorMessage;
            }
            if (!this._$settingsMessageArea) {
                this._createMessageArea(this.getElement());
            }
            this._$settingsMessageTextArea.text(message);
            var messageHeight = this._$settingsMessageArea.outerHeight();
            this._$settingsMessageArea.show();
            this._$contentContainerElement.css('height', 'calc(100% - ' + messageHeight + 'px)');
            this.onResize();
        }
    }

    private _hideError() {
        if (this._savingMode === TabControlSavingMode.SAVE_ON_CONTROL) {
            if (this._$settingsMessageArea) {
                this._$settingsMessageArea.hide();
                this._$contentContainerElement.css('height', '100%');
                this.onResize();
            }
        }
    }

    /**
     * Check if there is an invalid page. Focus on the first invalid page if there is any. 
     * Begin to persist user changes by iterate all the tab pages and call the beginSave() for each page if it is dirty and valid
     * @param e The event that trigger the saving
     * @return JQueryPromise for saving content. Fullfilled when all the pages are saved successfully and rejected when any one of them get rejected.
     */
    public beginSave(e?: JQueryEventObject): IPromise<TabSavingStatus> {
        var deferred = Q.defer<TabSavingStatus>();
        this._hideError();
        //Trigger saving on dirty tabs
        this._showOverlay(Resources_Platform.Saving);
        var savePromises: IPromise<ITabControlSavingResult>[] = [];

        // Filter out the non-dirty pages
        var dirtyTabPages = $.grep(this._tabPages, (currentPage: TabPage) => {
            return (currentPage.isDirty());
        });
        
        // Invoke the beginSave promises for the dirty tabs
        dirtyTabPages.forEach(
            (currentTab: TabPage) => {
                savePromises.push(currentTab.beginSave(e, false));
            });

        var onAllSettled = (results: any, hadError?: boolean): boolean => {
            if (!this._refreshOnClose && results && results.length > 0) {
                var hasError: boolean;
                for (var index = 0; index < results.length; index++) {
                    var currentResult = results[index];
                    if (currentResult.state === "fulfilled") {
                        var currentValue = currentResult.value;
                        if (currentValue.refreshPage) {
                            this._refreshOnClose = true;
                            break;
                        }
                        else if (currentValue.tab) {
                            var currentTabContent = currentValue.tab.getTabContent();
                            if (currentTabContent.applyChanges && $.isFunction(currentTabContent.applyChanges) && $.inArray(currentTabContent.applyChanges, this._onSavedCallbackList) === -1) {
                                this._onSavedCallbackList.push(currentTabContent.applyChanges);
                            }
                        }
                    }
                    else if (!hasError) {
                        // Select the tab with error, only if there was no error, prior to this in the previous set of beginSave calls for dirty tabs
                        if (!hadError) {
                            var tab: TabPage = currentResult.reason.tab;
                            tab.select();
                            this._showError();
                        }
                        hasError = true;
                    }
                }
                return hasError;
            }
        };

        var onSucceeded = (): void => {
            this._hideOverlay();

            deferred.resolve(TabSavingStatus.SUCCEEDED);
        };

        var onRejected = (): void => {
            this._hideOverlay();
            deferred.reject(TabSavingStatus.SERVER_SAVING_ERROR);
        };

        Q.allSettled(savePromises).then(
            (results) => {
                if (onAllSettled(results)) {
                    onRejected();
                }
                onSucceeded();
            });
        return deferred.promise;
    }

    private _showOverlay(text: string, options?: any) {
        if (!this._$tabControlOverlay) {
            this._$tabControlOverlay = $("<div />").addClass("control-busy-overlay tab-control-overlay").appendTo(this.getElement());
        }

        var statusOptions = options ||
            {
                center: true,
                imageClass: "big-status-progress",
                message: text,
                throttleMinTime: 0
            };
        this._statusIndicator = Controls.Control.create(StatusIndicator.StatusIndicator, this._$tabControlOverlay, statusOptions);
        this._statusIndicator.start();

        this._$tabControlOverlay.show();
    }

    private _hideOverlay() {
        if (this._$tabControlOverlay) {
            this._statusIndicator.complete();
            this._$tabControlOverlay.hide();
            this._$tabControlOverlay.empty();
        }
    }

    public dispose() {
        if (this._statusIndicator) {
            this._statusIndicator.dispose();
        }
        $.each(this._tabPages, (index, tabPage) => {
            tabPage.dispose();
        });
        super.dispose();
    }
}

/**
 * The tab page option
 */
export interface ITabPageOption {
    /**
     * The tab information associated with tab page
     */
    tab: ITab<any>;
    /**
     * Dom element to host the tab title
     */
    titleContainer: JQuery;
    /**
     * Dom element to host the tab content
     */
    contentContainer: JQuery;
    /**
     * callback function after tab changed
     */
    onTabChanged: Function;
    /**
     * callback function when tab changing
     */
    onTabChanging: Function;
    /**
     * callback function after tab saved
     */
    onTabSaved: Function;
    /**
     * callback function when saving state changes
     */
    onSavingStateChanged: Function;
    /**
     * callback function when dirty state changes
     */
    onDirtyStateChanged: Function;
    /**
     * navigation mode from tab control
     */
    navigationMode: TabControlNavigationMode;
    /**
     * saving mode from tab control
     */
    savingMode: TabControlSavingMode;
    /**
     * If set to true, the control will handle the server errors and the individual tabs should handle only the client-side validation errors
     */
    handleServerError?: boolean;
    /**
     * The first tab should have tabindex 0, the remaining -1.
     */
    tabIndex: 0 | -1;
}

class TabPage {
    private _tab: ITab<any>;
    private _$tabOverlay: JQuery;
    private _tabContent: ITabContent;
    private _$contentRoot: JQuery;
    private _$contentElement: JQuery;
    private _$contentMain: JQuery;
    private _$settingsContainer: JQuery;
    private _$titleElement: JQuery;
    private _$commonMessageArea: JQuery;
    private _$commonMessageTextArea: JQuery;
    private _$savePanel: JQuery;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _navigationMode: TabControlNavigationMode;
    private _savingMode: TabControlSavingMode;
    private _options: ITabPageOption;
    private _hasAttemptLoading: boolean = false;
    private _isLoaded: boolean = false;
    private _isSaving: boolean = false;
    private _hasServerError: boolean = false;

    constructor(options: ITabPageOption) {
        this._options = <ITabPageOption>$.extend({}, options);
    }

    public initialize() {
        this._tab = this._options.tab;
        this._navigationMode = this._options.navigationMode;
        this._savingMode = this._options.savingMode;

        var $titleContainer = this._options.titleContainer; //From the tab collection
        var $contentContainer = this._options.contentContainer; //From the tab collection

        this._$titleElement = $("<li>").addClass("tab-title").attr("tabindex", this._options.tabIndex).attr("title", this._tab.title).keydown(this._onKeydown.bind(this));
        this._$titleElement[0].addEventListener("focus", this._onFocus.bind(this), true);
        this._$titleElement.append($("<div>").addClass("tab-title-text").text(this._tab.title));
        $titleContainer.append(this._$titleElement);

        this._$contentRoot = $("<div>").addClass("tab-content-container");

        if (this._savingMode === TabControlSavingMode.APPLY_ON_TAB) {
            var $applyBtn = $("<div>").addClass("tab-content-apply-btn").attr("tabindex", "0").text(Resources_Platform.TabPageApplyChanges);
            this._$savePanel = $("<div>").addClass("tab-content-apply-panel");
            this._$savePanel.append($applyBtn);
            this._$contentRoot.append(this._$savePanel);
            $applyBtn.click(delegate(this, this.beginSave, true));
        }

        this._$contentElement = $("<div>").addClass("tab-content");
        this._$contentMain = $("<div>").addClass("tab-content-main");
        this._$settingsContainer = $("<div>").addClass("common-settings-container"); // Div to be used by the individual tabs as a container
        this._$contentMain.append(this._$settingsContainer);
        this._$contentElement.append(this._$contentMain);

        this._$contentRoot.append(this._$contentElement);
        $contentContainer.append(this._$contentRoot);

        this._$titleElement.click((event: JQueryEventObject) => {
            event.preventDefault();
            this._onTabTitleSelect();
        });
    }

    /**
     * select current tab
     */
    public select() {
        this._onTabTitleSelect();
    }
    
    /**
     * Set the focus on the first input in the tab content. If consumers want to override focus they can do so in onTabActivated
     * @fallbackToTabbable boolean If set to true and no input found will set focus on first tabbable element in container
     */
    private _focus(fallbackToTabbable = false) {
        var $elementToFocus = this._$contentElement.find("input:visible:first");

        if ($elementToFocus.length === 0 && fallbackToTabbable) {
            $elementToFocus = this._$contentElement.find(":visible:tabbable:first");
        }

        if ($elementToFocus.length > 0) {
            $elementToFocus.focus();
        }
    }

    /**
     * Return the dirty state for the content tab 
     * @return boolean
     */
    public isDirty(): boolean {
        if (this._isLoaded && this._tabContent) {
            try {
                return this._tabContent.isDirty();
            } catch (error) {
                Diag.Debug.fail("There is an error on tab isDirty. Tab: " + this._tab.title + " Error: " + error.message);
                throw error;
            }
        }
        return false;
    }
    
    /**
     * Return the saving state for the content tab 
     * @return boolean
     */
    public isSaving(): boolean {
        return this._isSaving;
    }

    /**
     * Return the tab registration data for the content tab 
     * @return ITabContent
     */
    public getTab(): ITab<any> {
        return this._tab;
    }

    /**
    * Return the tab content instance for the content tab 
    * @return ITabContent
    */
    public getTabContent(): ITabContent {
        return this._tabContent;
    }
    /**
     * When navigation mode for tab control is set to "CUSTOMIZED", 
     * the method is called to see if user is allowed to leave the tab
     * @return boolean to indicate if it is allowed to navigate away
     */
    public onTabChanging(): boolean {
        if (this._isLoaded && this._tabContent && $.isFunction(this._tabContent.onTabChanging)) {
            try {
                return this._tabContent.onTabChanging();
            } catch (error) {
                Diag.Debug.fail("There is an error on tab onTabChanging. Tab: " + this._tab.title + " Error: " + error.message);
                throw error;
            }
        }
        return true;
    }

    private _onKeydown(e: JQueryEventObject) {
        if (e.ctrlKey || e.altKey || e.metaKey) {
            return;
        }
        
        const $target = $(e.target);
        let $liToFocus: JQuery;

        if (e.keyCode === Utils_UI.KeyCode.DOWN) {
            $liToFocus = $target.next("li");
            if ($liToFocus.length === 0) {
                $liToFocus = $target.parent().children("li").first();
            }
        }
        else if (e.keyCode === Utils_UI.KeyCode.UP) {
            $liToFocus = $target.prev("li");
            if ($liToFocus.length === 0) {
                $liToFocus = $target.parent().children("li").last();
            }
        }
        else if (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE) {
            this._onTabTitleSelect(true);
            return false;
        }

        if ($liToFocus) {
            $liToFocus.focus();
            return false;
        }
    }

    private _onFocus(e: FocusEvent) {
        const target = <HTMLElement>e.target;
        const $parent = $(target.parentElement);

        if (target.tagName.toUpperCase() === "LI" && target.getAttribute("tabindex") === "-1") {
            $parent.find("li").attr("tabindex", "-1");
            target.setAttribute("tabindex", "0");
        }
    }

    private _onTabTitleSelect(keyboardInvoked = false) {
        if ($.isFunction(this._options.onTabChanging) && !this._options.onTabChanging()) {
            return;
        }

        this._$titleElement.addClass("current");
        this._$titleElement.siblings().removeClass("current");
        $(".tabs-contents-container .tab-content-container").not(this._$contentRoot).css("display", "none");
        this._$contentRoot.show();
        if (!this._hasAttemptLoading) {

            // Mark tab has been loaded. If there is an error during load, it will not try to reload again to avoid potential memory leak.
            this._hasAttemptLoading = true;
            try {
                this._tabContent = new this._tab.tabContent(this._tab.tabContentOptions);

                //Activate
                this._tabContent.beginLoad(this._$settingsContainer).then(() => {
                    this._focus(keyboardInvoked);

                    if ($.isFunction(this._tabContent.onTabActivated)) {
                        this._tabContent.onTabActivated(true);
                    }

                    // Div to display server errors
                    this._$commonMessageArea = $("<div>").addClass("common-message-area");
                    this._$commonMessageTextArea = $("<div>").addClass("error-message");
                    this._$commonMessageArea.append(this._$commonMessageTextArea);
                    this._$commonMessageArea.hide();
                    this._$contentMain.prepend(this._$commonMessageArea);
                    if ($.isFunction(this._tabContent.registerStateChangedEvents)) {
                        this._tabContent.registerStateChangedEvents(delegate(this, this._onDirtyStateChanged));
                    }

                    this._isLoaded = true;
                }, (error: TfsError) => {
                    VSS.handleError(error);
                });
            } catch (error) {
                Diag.Debug.fail("There is an error on tab content loading. Tab: " + this._tab.title + " Error: " + error.message);
                throw error;
            }
        }
        else {
            //Reactivate
            if (this._isLoaded) {
                try {
                    this._focus(keyboardInvoked);

                    if ($.isFunction(this._tabContent.onTabActivated)) {
                        this._tabContent.onTabActivated(false);
                    }
                } catch (error) {
                    Diag.Debug.fail("There is an error on tab onTabActivated. Tab: " + this._tab.title + " Error: " + error.message);
                    throw error;
                }
            }
        }
    }

    private _onSavingStateChanged(isSaving: boolean) {
        this._isSaving = isSaving;
        this._refreshStyle();
        if ($.isFunction(this._options.onSavingStateChanged)) {
            this._options.onSavingStateChanged();
        }
    }

    private _onDirtyStateChanged() {
        this._refreshStyle();
        if ($.isFunction(this._options.onDirtyStateChanged)) {
            this._options.onDirtyStateChanged();
        }
    }

    private _refreshStyle() {
        var hasIndicator = false;
        var isDirty = this.isDirty();

        if (!hasIndicator && this.isSaving()) {
            hasIndicator = true;
            this._$titleElement.addClass("isSaving");
        }
        else {
            this._$titleElement.removeClass("isSaving");
        }

        if (!hasIndicator && isDirty) {
            hasIndicator = true;
            this._$titleElement.addClass("isDirty");
        }
        else {
            this._$titleElement.removeClass("isDirty");
        }

        if (this._savingMode === TabControlSavingMode.APPLY_ON_TAB) {
            if (isDirty) {
                this._$savePanel.fadeIn();
                this._$contentElement.css('height', 'calc(100 % - 28px)');
            }
            else {
                this._$savePanel.css("display", "none");
                this._$contentElement.css('height', '100%');
            }
        }
        if (this._$commonMessageArea && !this._hasServerError) {
            this._$commonMessageArea.hide();
        }
    }

    /**
     * Check if the content is valid, stop processing when it is invalid. 
     * Check if the content is dirty, stop processing when it is not dirty. 
     * Begin to persist user changes calling the beginSave() in the content control
     * @param e The event that trigger the saving
     * @return JQueryPromise for saving content. Result is wrapped with tab information and saveing status.
     */
    public beginSave(e: JQueryEventObject, showOverlay: boolean): IPromise<ITabControlSavingResult> {
        var deferred = Q.defer<ITabControlSavingResult>();
        var result = null;
        if (!this.isDirty()) {
            result = this._createSavingResult(this, TabSavingStatus.NO_CHANGE, false);
            deferred.resolve(result);
            return deferred.promise;
        }

        if (showOverlay) {
            this._showOverlay(Resources_Platform.Saving);
        }

        this._onSavingStateChanged(true);

        var onSaveCompleted = (status: TabSavingStatus, result?: any) => {
            this._hideOverlay();
            var resultwithTab = this._createSavingResult(this, status, result);
            this._onSavingStateChanged(false);
            if ($.isFunction(this._options.onTabSaved)) {
                this._options.onTabSaved(resultwithTab);
            }
            if (status === TabSavingStatus.SERVER_SAVING_ERROR) {
                deferred.reject(resultwithTab);
            }
            else {
                deferred.resolve(resultwithTab);
            }
        };

        this._hasServerError = false;
        try {
            this._tabContent.beginSave().then(
                (refreshPage?) => {
                    onSaveCompleted(TabSavingStatus.SUCCEEDED, refreshPage);
                },
                (result) => {
                    if (result !== TabSavingStatus.INVALID_USER_INPUT) {
                        this._hasServerError = true;
                    }
                    this.showError(result);
                    onSaveCompleted(TabSavingStatus.SERVER_SAVING_ERROR, result);
                });
        } catch (error) {
            Diag.Debug.fail("There is an error on tab save. Tab: " + this._tab.title + " Error: " + error.message);
            throw error;
        }
        return deferred.promise;
    }

    /**
     * Displays the error in the commong message area on the individual tab
     * @param error Details about the error to be displayed
     */
    public showError(error?: any) {
        if (this._$commonMessageArea && error && error.message && typeof error.message === "string") {
            this._$commonMessageTextArea.text(error.message);
            this._$commonMessageArea.show();
        }
    }

    private _createSavingResult(tab: TabPage, status: TabSavingStatus, refreshPage: boolean): ITabControlSavingResult {
        return { tab: tab, status: status, refreshPage: refreshPage };
    }

    private _showOverlay(text: string, options?: any) {
        if (!this._$tabOverlay) {
            this._$tabOverlay = $("<div />").addClass("control-busy-overlay tab-control-overlay").appendTo(this._$contentElement);
        }

        var statusOptions = options ||
            {
                center: true,
                imageClass: "big-status-progress",
                message: text,
                throttleMinTime: 0
            };
        this._statusIndicator = Controls.Control.create(StatusIndicator.StatusIndicator, this._$tabOverlay, statusOptions);
        this._statusIndicator.start();

        this._$tabOverlay.show();
    }

    private _hideOverlay() {
        if (this._$tabOverlay) {
            this._statusIndicator.complete();
            this._$tabOverlay.hide();
            this._$tabOverlay.empty();
        }
    }

    public onResize() {
        if (this._isLoaded && this._tabContent && this._tabContent.onResize && $.isFunction(this._tabContent.onResize)) {
            try {
                this._tabContent.onResize();
            } catch (error) {
                Diag.Debug.fail("There is an error on tab onResize. Tab: " + this._tab.title + " Error: " + error.message);
                throw error;
            }
        }
    }

    public dispose() {
        if (this._tabContent && this._tabContent.dispose && $.isFunction(this._tabContent.dispose)) {
            try {
                this._tabContent.dispose();
            } catch (error) {
                Diag.Debug.fail("There is an error on tab dispose. Tab: " + this._tab.title + " Error: " + error.message);
                throw error;
            }
        }
        if (this._statusIndicator) {
            this._statusIndicator.dispose();
        }
    }
}

/**
 * A base class for the all the tab content classes that implement the ITabContent. 
 * You can start with other class, but make sure you implement ITabContent. 
 */
export class TabContentBaseControl extends Controls.BaseControl implements ITabContent {
    private _isDirty: boolean = false;
    private _isValid: boolean = true;
    private _onDirtyStateChanged: Function;

    constructor(options?: any) {
        super(options);
    }

    /**
     * Gets the dirty state for the content control
     * @return boolean
     */
    public isDirty(): boolean {
        return this._isDirty;
    }

    /**
     * Method that lets the container specify the delegates to be called on state change in the tab content
     * @param onDirtyStateChanged The delegate for the dirty state transition
     */
    public registerStateChangedEvents(onDirtyStateChanged: Function): void {
        this._onDirtyStateChanged = onDirtyStateChanged;
    }

    /**
     * Method that renders the actual control
     * @param $container The DOM element, to which the control should be added
     * @return IPromise Resolve if render successfully, reject if failed
     */
    public beginLoad($container: JQuery): IPromise<any> {
        this.createIn($container);
        return Q.resolve(null);
    }

    /**
     * Set the dirty state for the content control, make sure call this for any dirty state change
     * @param isDirty
     */
    public fireDirtyFlagChange(isDirty: boolean) {
        if (this._isDirty !== isDirty) {
            this._isDirty = isDirty;
            if ($.isFunction(this._onDirtyStateChanged)) {
                this._onDirtyStateChanged();
            }
        }
    }

    /**
     * Begin to persist user changes, make sure you overwrite this
     * @return JQueryPromise for saving content.
     */
    public beginSave(): IPromise<boolean> {
        Diag.Debug.fail("this method should not be called, sub classes need to override beginSave()");
        return Q.resolve(false);
    }

    public dispose() {
        super.dispose();
    }
}

/**
 * Page scoped registration for tab controls, this is the place for tabControl to get tab group when group is not specified in the option.
 */
export class TabControlsRegistration {
    private static _tabControlRegistrations: IDictionaryStringTo<ITabGroup[]> = {};
    private static _orderGap: number = 10;
    private static _orderInitValue: number = 0;

    /**
     * Register a group to a tabControl
     * If the groupId has been registered to the control, it will error out
     * @param groupRegistration The group that needs to be registered
     */
    public static registerTabGroup(groupRegistration: ITabGroupRegistration) {
        //check if the group Id has been registered for the tabControl
        if (this._tabControlRegistrations[groupRegistration.tabControlId]) {
            var tabGroups = this._tabControlRegistrations[groupRegistration.tabControlId];
            if (tabGroups.some(group => Utils_String.ignoreCaseComparer(group.id, groupRegistration.id) === 0)) {
                throw new Error("The tab group id has been registered, please remove it first.");
            }
        }

        if (!this._tabControlRegistrations[groupRegistration.tabControlId]) {
            this._tabControlRegistrations[groupRegistration.tabControlId] = new Array<ITabGroup>();
        }

        var groups = this._tabControlRegistrations[groupRegistration.tabControlId];
        groups.push({
            id: groupRegistration.id,
            title: groupRegistration.title,
            order: groupRegistration.order || this._getNextGroupOrder(groups),
            tabs: []
        });
        this._sortTabGroups(groups);
    }

    /**
     * Get a list of tab groups for a tab control
     * @param tabControlId 
     * @return a list of tab groups
     */
    public static getRegisteredTabGroups(tagControlId: string): ITabGroup[] {
        if (this._tabControlRegistrations[tagControlId]) {
            return this._tabControlRegistrations[tagControlId];
        }
        else {
            return new Array<ITabGroup>();
        }
    }
    
    /**
     * Register a tab for tab group. 
     * The groupId is not registered, call registerTabGroup first
     * If id is provided, the tab will be registered with that id. If not, the tab will get a generated Guid as id.
     * If the provided id has been registered for that group, the request will error out.
     * @param registration a tab and group
     * @return id of the tab
     */
    public static registerTab<T>(registration: ITabRegistration<T>): string {
        var tabControlId: string;
        var tabgroup: ITabGroup = null;
        var tabGroups: ITabGroup[] = null;

        //check for all tabControl instances, if the group Id has been registered
        for (var controlId in this._tabControlRegistrations) {
            if (this._tabControlRegistrations.hasOwnProperty(controlId)) {
                tabGroups = this._tabControlRegistrations[controlId];
                tabGroups.forEach((group) => {
                    if (Utils_String.ignoreCaseComparer(group.id, registration.groupId) === 0) {
                        tabgroup = group;
                        tabControlId = controlId;
                        return;
                    }
                });
            }
        }

        if (!tabgroup) {
            throw new Error("The tab group has not been registered yet, please register first.");
        }

        tabGroups = this._tabControlRegistrations[tabControlId];

        var tab: ITab<T> = null;

        // check if the registration Id has been registered 
        if (registration.id) {
            tabGroups.forEach((group) => {
                group.tabs.forEach((t) => {
                    if (Utils_String.ignoreCaseComparer(t.id, registration.id) === 0) {
                        tab = t;
                        return;
                    }
                });
            });
        }

        // tab has been registered
        if (tab) {
            throw new Error("The tab Id has been registered, please remove it first or register with an different Id.");
        }  

        //new tab
        tab = this._createNewTab(tabgroup, registration);
        tabgroup.tabs.push(tab);
        this._sortTabs(tabgroup);
        return tab.id;
    }

    /**
     * Remove a tab by Id for a tab control
     * @param tabControlId for the targeted tab control
     * @param id for tab 
     */
    public static removeTab(tabControlId: string, id: string) {
        var tabGroups = this._tabControlRegistrations[tabControlId];
        var bFound = false;
        if (tabGroups) {
            tabGroups.forEach((group, groupIndex) => {
                group.tabs.forEach((tab, tabIndex) => {
                    if (Utils_String.ignoreCaseComparer(tab.id, id) === 0) {
                        group.tabs.splice(tabIndex, 1);
                        bFound = true;
                        return;
                    }
                });
                if (bFound) {
                    return;
                }
            });
        }
    }

    /**
     * Remove a tab group by group Id for a tab control
     * @param tabControlId for the targeted tab control
     * @param groupId for tab group
     */
    public static removeTabGroup(tabControlId: string, groupId: string) {
        var tabGroups = this._tabControlRegistrations[tabControlId];
        if (tabGroups) {
            tabGroups.forEach((group, groupIndex) => {
                if (Utils_String.ignoreCaseComparer(group.id, groupId) === 0) {
                    tabGroups.splice(groupIndex, 1);
                    return;
                }
            });
        }
    }

    /**
     * Remove tab registrations for a tab control when tabControlId is provided
     * Remove all tab registrations if tabControlId is not present
     * @param tabControlId for the targeted tab control
     */
    public static clearRegistrations(tabControlId?: string) {
        if (!tabControlId) {
            this._tabControlRegistrations = {};
        }
        else {
            delete this._tabControlRegistrations[tabControlId];
        }
    }

    private static _sortTabGroups(groups: ITabGroup[]) {
        groups.sort((group1: ITabGroup, group2: ITabGroup) => {
            if (group1.order !== group2.order) {
                return group1.order - group2.order;
            }
            else {
                return Utils_String.ignoreCaseComparer(group1.title, group2.title);
            }
        });
    }

    private static _sortTabs(tabGroup: ITabGroup) {
        tabGroup.tabs.sort((tab1: ITab<any>, tab2: ITab<any>) => {
            if (tab1.order !== tab2.order) {
                return tab1.order - tab2.order;
            }
            else {
                return Utils_String.ignoreCaseComparer(tab1.title, tab2.title);
            }
        });
    }

    private static _getNextGroupOrder(groups: ITabGroup[]): number {
        var max = this._orderInitValue;
        groups.forEach((group) => {
            if (group.order > max) {
                max = group.order;
            }
        });
        return max === this._orderInitValue ? max : max + this._orderGap;
    }

    private static _getNextTabOrder(tabgroup: ITabGroup): number {
        var max = this._orderInitValue;
        tabgroup.tabs.forEach((tab) => {
            if (tab.order > max) {
                max = tab.order;
            }
        });
        return max === this._orderInitValue ? max : max + this._orderGap;
    }

    private static _createNewTab<T>(tabGroup: ITabGroup, tabRegistration: ITabRegistration<T>): ITab<T> {
        if (!tabRegistration.id) {
            throw new Error("Cannot create a tab without an ID");
        }
        return {
            id: tabRegistration.id,
            title: tabRegistration.title,
            tabContent: tabRegistration.tabContent,
            tabContentOptions: tabRegistration.tabContentOptions || <T>{},
            order: tabRegistration.order || this._getNextTabOrder(tabGroup)
        };
    }

}

/**
 * The interface for each button on a TabbedDialog
 */
export interface ITabbedDialogButton {
    /**
     * The id for the button, unique within the control
     */
    id: string;
    /**
     * Display text of the button
     */
    text: string
    /**
     * Handler for click event
     */
    click: () => void
    /**
     * Indicates the button should be disabled until changes are made in the dialog
     */
    enableOnDirty?: boolean
    /**
     * Indicates the button is currently disabled
     */
    disabled?: string;
}

/**
 * The TabbedDialog options
 */
export interface TabbedDialogOptions extends Dialogs.IModalDialogOptions {
    /**
     * Id for the TabControl
     */
    tabControlId: string
    /**
     * Id of the default tab selected when the dialog opens
     */
    defaultTabId?: string
    /**
     * List of tab groups on the dialog
     */
    groups?: ITabGroup[];
    /**
     * Optional: custom button set to override the default
     */
    customButtons?: ITabbedDialogButton[];
    /**
     * Indicates whether the dialog should prompt the user to save changes before closing
     */
    confirmUnsavedChanges?: boolean;
    /**
     * Indicates whether the dialog should display the tabs on the side. Defaults to false.
     */
    hideTabsPane?: boolean;
}

/**
 * Modal dialog which implements TabContent
 */
export class TabbedDialog extends Dialogs.ModalDialogO<TabbedDialogOptions> {
    private _control: TabControl;
    private static ON_RESIZE_THROTTLE_TIME = 20;
    private _resizeThrottleDelegate: IArgsFunctionR<any>;
    private _groups: ITabGroup[];

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            beforeClose: delegate(this, this.beforeClose),
            buttons: this._options.customButtons ? this._options.customButtons : this._getDefaultButtons(),
            cssClass: 'tabbed-dialog',
            useBowtieStyle: true,
            bowtieVersion: 2,
            contentMargin: false,
        }, options));
    }

    public initialize() {
        super.initialize();
        var okButton = this.getElement().parent().find("#ok");
        if (okButton) {
            okButton.removeClass("button-standard")
                .addClass("button-primary btn-cta");
        }

        var tabCollectionOption: ITabControlOption = {
            id: this._options.tabControlId,
            defaultTabId: this._options.defaultTabId,
            savingMode: TabControlSavingMode.NONE,
            hideTabsPane: this._options.hideTabsPane
        };

        this._groups = this._options.groups;
        if (this._groups) {
            $.each(this._groups, (groupIndex: number, group: ITabGroup) => {
                this._registerTabGroup(group);
                $.each(group.tabs, (tabIndex: number, tab: ITab<any>) => {
                    this._registerTab(tab, group.id);
                });

            });
        }

        this._control = <TabControl>Controls.Control.createIn<ITabControlOption>(TabControl, this.getElement(), tabCollectionOption);

        this._control._bind(TabControl.EVENT_DIRTY_STATE_CHANGED, delegate(this, this._refreshButton));
        this._resizeThrottleDelegate = Utils_Core.throttledDelegate(this._control, TabbedDialog.ON_RESIZE_THROTTLE_TIME, this._control.onResize);
        this._bind("dialogresize", this._resizeThrottleDelegate);
        this._bind(window, "resize", this._resizeThrottleDelegate);
    }


    private _registerTabGroup(group: ITabGroup) {
        var tabGroups = TabControlsRegistration.getRegisteredTabGroups(this._options.tabControlId);
        var matchedGroups = tabGroups.filter(tabGroup => tabGroup.id === group.id);
        if (matchedGroups.length === 0) {
            var registeredGroup: ITabGroupRegistration = {
                tabControlId: this._options.tabControlId,
                id: group.id,
                title: group.title,
            }
            TabControlsRegistration.registerTabGroup(registeredGroup);
        }
        else {
            group = matchedGroups[0];
            group.tabs = [];
        }
    }

    private _registerTab(tab: ITab<any>, groupId: string) {
        var registeredTab: ITabRegistration<any> = {
            groupId: groupId,
            id: tab.id,
            order: tab.order,
            title: tab.title,
            tabContent: tab.tabContent,
            tabContentOptions: tab.tabContentOptions,
        };
        TabControlsRegistration.registerTab(registeredTab);
    }

    private _refreshButton() {
        var buttons = this._getButtons(this._control.isDirty());
        var dialog = this.getElement().parent();
        $.each(buttons, (index: number, button: ITabbedDialogButton) => {
            dialog.find("#" + button.id).button("option", "label", button.text);
            this._updateButton(button.id, button.disabled !== "disabled");
        });
    }

    private _getButtons(editModeOn: boolean): ITabbedDialogButton[] {
        var buttons = [];
        for (var i = 0; i < this._options.buttons.length; i++) {
            var button = this._options.buttons[i];
            if (button.enableOnDirty) {
                if (editModeOn) {
                    button.disabled = null;
                }
                else {
                    button.disabled = "disabled";
                }
            }
            buttons.push(button);
        }
        return buttons;
    }

    private _getDefaultButtons(): ITabbedDialogButton[] {
        return [
            {
                id: "ok",
                text: Resources_Platform.SaveButtonLabelText,
                click: delegate(this, this.onOkClick),
                enableOnDirty: true,
                disabled: "disabled"

            },
            {
                id: "exit",
                text: Resources_Platform.CloseButtonLabelText,
                click: delegate(this, this.onCancelClick)
            }
        ];
    }

    /**
     * Updates button's status
     * @param button The button Id
     * @param enabled True if the button needs to be enabled
     */
    private _updateButton(button: string, enabled: boolean) {
        this._element.trigger(Dialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { button: button, enabled: enabled });
    }

    public beforeClose(e?, ui?): boolean {
        var closeReady = true;
        if (this._options.confirmUnsavedChanges) {
            closeReady = (!this._control || !this._control.isDirty() || window.confirm(Resources_Platform.DialogUnsavedChanges));
        }
        return (closeReady && this._evaluateOnCloseStrategy());
    }

    private _evaluateOnCloseStrategy(): boolean {
        if (this._control) {
            if (this._control.getRefreshOnCloseStatus()) {
                Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_RELOAD);
            }
            else {
                this._control.invokeSaveCallbacks();
            }
        }
        return true; // Return true to ensure that the dialog close always evaluates this
    }

    public onOkClick(e?: JQueryEventObject) {
        this.updateOkButton(false);
        this._updateButton("close", false);
        var savingCompleted = () => {
            this._refreshButton();
        };
        var savingError = () => {
            this._refreshButton();
        };
        this._control.beginSave(e).then(savingCompleted, savingError);
    }

    public onCancelClick(e?: JQueryEventObject) {
        this.beforeClose();
        this.dispose();
    }

    public dispose() {
        if (this._control) {
            this._control.dispose();
            this._control = null;
        }
        this._unbind("dialogresize", this._resizeThrottleDelegate);
        this._unbind(window, "resize", this._resizeThrottleDelegate);
        this._resizeThrottleDelegate = null;
        super.dispose();
    }
}

/*
 * Identifies the scroll direction.
 */
enum ScrollDirection {
    LEFT,
    RIGHT,
    TOP,
    BOTTOM
}

/*
 * Identifies the scroll alignment.
 */
enum ScrollAlign {
    HORIZONTAL,
    VERTICAL
}

/*
 * @interface for arrow scroll support class.
 */
interface IArrowScrollSupport {
    align: ScrollAlign;
    scrollContainer: JQuery;
    scrollContent: JQuery;
}

/*
 * Class for creating and binding arrow scroll support on a specified container.
 */
class ArrowScrollbar {
    private static SCROLL_PRESS_AND_HOLDER_INTERVAL = 200;
    private static SCROLL_CALCULATION_DELTA = 3;
    private static SCROLL_ANIMATE_DELTA = 100;
    private static SCROLL_MOUSEWHEEL_DELTA = 20;
    private static SCROLL_SCROLLBUTTON_WIDTH = 18;
    private static SCROLL_SCROLLBUTTON_HEIGHT = 15;

    private static TAB_SCROLL_PREV_SELECTOR = ".arrow-scroll-button.prev";
    private static TAB_SCROLL_NEXT_SELECTOR = ".arrow-scroll-button.next";

    private _align: ScrollAlign;
    private _$scrollContainer: JQuery;
    private _$scrollContent: JQuery;
    private _$navButtonPrev: JQuery;
    private _$navButtonNext: JQuery;

    constructor(options: IArrowScrollSupport) {
        this._align = options.align;
        this._$scrollContainer = options.scrollContainer;
        this._$scrollContent = options.scrollContent;

        // create navigation button.
        var alignClass: string;
        switch (this._align) {
            case ScrollAlign.HORIZONTAL:
                alignClass = "horizontal";
                break;
            case ScrollAlign.VERTICAL:
                alignClass = "vertical";
                break;
        }

        this._$navButtonPrev = $("<div>").addClass("arrow-scroll-button").addClass("prev").addClass(alignClass);
        this._$navButtonNext = $("<div>").addClass("arrow-scroll-button").addClass("next").addClass(alignClass);
        this._$scrollContainer.append(this._$navButtonPrev);
        this._$scrollContainer.append(this._$navButtonNext);
    }

    /*
     * Initialize the arrow scrollbar.
     */
    public initialize() {
        this._initializedScrollSupport();
        this._updateNavigationButtons();
    }

    /*
     * Update the visibility of arrow scrollbar.
     */
    public onContainerResize() {
        this._updateNavigationButtons();
    }

    /*
    * Update the the navigation button visibility based on need.
    */
    private _updateNavigationButtons() {
        if (this._isScrollContainerTopMost()) {
            this._$navButtonPrev.hide();
        }
        else {
            this._$navButtonPrev.show();
        }

        if (this._isScrollContainerBottomMost()) {
            this._$navButtonNext.hide();
        }
        else {
            this._$navButtonNext.show();
        }
    }

    /*
     * Scroll to ensure the given element fully visible
     * @param element - jQuery selector for the element
     */
    public scrollElementIntoView(element: JQuery) {
        switch (this._align) {
            case ScrollAlign.HORIZONTAL:
                {
                    var elemLeft = element.position().left;
                    var elemRight = elemLeft + element.outerWidth();
                    var containerLeft = this._$scrollContainer.position().left;
                    var containerRight = containerLeft + this._$scrollContainer.outerWidth();
                    var pixelToScroll = 0;
                    if (elemRight > containerRight - ArrowScrollbar.SCROLL_SCROLLBUTTON_WIDTH) {
                        pixelToScroll = elemRight - containerRight + ArrowScrollbar.SCROLL_SCROLLBUTTON_WIDTH;
                    }
                    else if (elemLeft < containerLeft + ArrowScrollbar.SCROLL_SCROLLBUTTON_WIDTH) {
                        pixelToScroll = elemLeft - containerLeft - ArrowScrollbar.SCROLL_SCROLLBUTTON_WIDTH;
                    }
                    if (pixelToScroll !== 0) {
                        var currentScrollLeft = this._$scrollContainer.scrollLeft();
                        this._$scrollContainer.scrollLeft(currentScrollLeft + pixelToScroll);
                    }
                    break;
                }
            case ScrollAlign.VERTICAL:
                {
                    var elemTop = element.position().top;
                    var elemBottom = elemTop + element.outerHeight();
                    var containerTop = this._$scrollContainer.position().top;
                    var containerBottom = containerTop + this._$scrollContainer.outerHeight();
                    var pixelToScroll = 0;
                    if (elemBottom > containerBottom - ArrowScrollbar.SCROLL_SCROLLBUTTON_HEIGHT) {
                        pixelToScroll = elemBottom - containerBottom + ArrowScrollbar.SCROLL_SCROLLBUTTON_HEIGHT;
                    }
                    else if (elemTop < containerTop + ArrowScrollbar.SCROLL_SCROLLBUTTON_HEIGHT) {
                        pixelToScroll = elemTop - containerTop - ArrowScrollbar.SCROLL_SCROLLBUTTON_HEIGHT;
                    }
                    if (pixelToScroll !== 0) {
                        var currentScrollTop = this._$scrollContainer.scrollTop();
                        this._$scrollContainer.scrollTop(currentScrollTop + pixelToScroll);
                    }
                    break;
                }
        }
        this._updateNavigationButtons();
    }

    private _initializedScrollSupport() {
        switch (this._align) {
            case ScrollAlign.HORIZONTAL:
                this._bindScrollContainer(ScrollDirection.LEFT);
                this._bindScrollContainer(ScrollDirection.RIGHT);
                break;
            case ScrollAlign.VERTICAL:
                this._bindScrollContainer(ScrollDirection.TOP);
                this._bindScrollContainer(ScrollDirection.BOTTOM);
                break;
        }
        this._bindScrollContent();
    }

    private _bindScrollContainer(direction: ScrollDirection) {
        var scrollButton: JQuery;
        var scrollButtonCssSelector: string;
        switch (direction) {
            case ScrollDirection.LEFT:
            case ScrollDirection.TOP:
                scrollButton = this._$navButtonPrev;
                scrollButtonCssSelector = ArrowScrollbar.TAB_SCROLL_PREV_SELECTOR;
                break;
            case ScrollDirection.RIGHT:
            case ScrollDirection.BOTTOM:
                scrollButton = this._$navButtonNext;
                scrollButtonCssSelector = ArrowScrollbar.TAB_SCROLL_NEXT_SELECTOR;
                break;
        }

        // Interval when pressed and hold down the arrow scrollbar.
        var buttonPressedAndHoldInterval: number;
        var buttonPressedAndHoldStartTimer = () => {
            buttonPressedAndHoldInterval = setInterval(() => {
                if (this._isScrollContainerAtTheEnd(direction)) {
                    buttonPressedStop();
                }
                this._scroll(direction);
            }, ArrowScrollbar.SCROLL_PRESS_AND_HOLDER_INTERVAL);
        };

        // Function to start pressing the arrow scrollbar.
        var buttonPressedStart = (e: JQueryMouseEventObject) => {
            if (this._$scrollContainer.find(scrollButtonCssSelector + ":visible").length === 1) {
                scrollButton.addClass('pressed');
                this._scroll(direction);
                e.preventDefault();
                e.stopPropagation();
                buttonPressedAndHoldStartTimer();
            }
        };

        // Function to stop pressing the arrow scrollbar.
        var buttonPressedStop = () => {
            scrollButton.removeClass('pressed');
            clearInterval(buttonPressedAndHoldInterval);
        };

        scrollButton.mousedown((e: JQueryMouseEventObject) => {
            buttonPressedStart(e);
        }).bind("mouseup mouseleave", () => {
            buttonPressedStop();
        }).droppable({
            over: (e, ui) => {
                buttonPressedStart(<any>e);
            },
            out: (e, ui) => {
                buttonPressedStop();
            }
        });
    }

    private _bindScrollContent() {
        var scrollContent = this._$scrollContent;

        // Mouse wheel support
        scrollContent.bind("mousewheel DOMMouseScroll", delegate(this, this._onMouseWheel));

        // bind tab support to update the navigation bar.
        scrollContent.keydown((e?: JQueryEventObject) => {
            if (e.keyCode === Utils_UI.KeyCode.TAB) {
                this._updateNavigationButtons();
            }
        });
    }

    private _onMouseWheel(e: JQueryEventObject) {
        var delta = Utils_UI.getWheelDelta(e);

        if (delta !== 0) {
            var start: number;
            switch (this._align) {
                case ScrollAlign.HORIZONTAL:
                    start = this._$scrollContainer.scrollLeft();
                    this._$scrollContainer.scrollLeft(start - delta * ArrowScrollbar.SCROLL_MOUSEWHEEL_DELTA);
                    break;
                case ScrollAlign.VERTICAL:
                    start = this._$scrollContainer.scrollTop();
                    this._$scrollContainer.scrollTop(start - delta * ArrowScrollbar.SCROLL_ANIMATE_DELTA);
                    break;
            }
            this._updateNavigationButtons();
        }
        e.stopPropagation();
    }

    private _scroll(direction: ScrollDirection) {
        switch (direction) {
            case ScrollDirection.LEFT:
            case ScrollDirection.TOP:
                this._scrollTop();
                break;
            case ScrollDirection.RIGHT:
            case ScrollDirection.BOTTOM:
                this._scrollBottom();
                break;
        }
    }

    private _isScrollContainerAtTheEnd(direction: ScrollDirection): boolean {
        switch (direction) {
            case ScrollDirection.LEFT:
            case ScrollDirection.TOP:
                return this._isScrollContainerTopMost();
            case ScrollDirection.RIGHT:
            case ScrollDirection.BOTTOM:
                return this._isScrollContainerBottomMost();
        }
    }

    private _scrollTop() {
        var start: number;
        var animateProperties: any;
        switch (this._align) {
            case ScrollAlign.HORIZONTAL:
                start = this._$scrollContainer.scrollLeft();
                animateProperties = { scrollLeft: (start - ArrowScrollbar.SCROLL_ANIMATE_DELTA) + 'px' };
                break;
            case ScrollAlign.VERTICAL:
                start = this._$scrollContainer.scrollTop();
                animateProperties = { scrollTop: (start - ArrowScrollbar.SCROLL_ANIMATE_DELTA) + 'px' };
                break;
        }
        this._$scrollContainer.animate(animateProperties, ArrowScrollbar.SCROLL_PRESS_AND_HOLDER_INTERVAL, delegate(this, () => { this._updateNavigationButtons(); }));
    }

    private _scrollBottom() {
        var start: number;
        var animateProperties: any;
        switch (this._align) {
            case ScrollAlign.HORIZONTAL:
                start = this._$scrollContainer.scrollLeft();
                animateProperties = { scrollLeft: (start + ArrowScrollbar.SCROLL_ANIMATE_DELTA) + 'px' };
                break;
            case ScrollAlign.VERTICAL:
                start = this._$scrollContainer.scrollTop();
                animateProperties = { scrollTop: (start + ArrowScrollbar.SCROLL_ANIMATE_DELTA) + 'px' };
                break;
        }
        this._$scrollContainer.animate(animateProperties, ArrowScrollbar.SCROLL_PRESS_AND_HOLDER_INTERVAL, delegate(this, () => { this._updateNavigationButtons(); }));
    }

    private _isScrollContainerTopMost(): boolean {
        switch (this._align) {
            case ScrollAlign.HORIZONTAL:
                var containerLeftPosition = this._$scrollContainer.scrollLeft();
                if (containerLeftPosition <= ArrowScrollbar.SCROLL_CALCULATION_DELTA) {
                    return true;
                }
                return false;
            case ScrollAlign.VERTICAL:
                var containerTopPosition = this._$scrollContainer.scrollTop();
                if (containerTopPosition <= ArrowScrollbar.SCROLL_CALCULATION_DELTA) {
                    return true;
                }
                return false;
        }
    }

    private _isScrollContainerBottomMost(): boolean {
        switch (this._align) {
            case ScrollAlign.HORIZONTAL:
                var containerLeftPosition = this._$scrollContainer.scrollLeft();
                var contentWidth = this._$scrollContent[0].scrollWidth;
                if (containerLeftPosition + ArrowScrollbar.SCROLL_CALCULATION_DELTA >= contentWidth - this._$scrollContainer.outerWidth()) {
                    return true;
                }
                return false;
            case ScrollAlign.VERTICAL:
                var containerTopPosition = this._$scrollContainer.scrollTop();
                var contentHeight = this._$scrollContent[0].scrollHeight;
                if (containerTopPosition + ArrowScrollbar.SCROLL_CALCULATION_DELTA >= contentHeight - this._$scrollContainer.outerHeight()) {
                    return true;
                }
                return false;
        }
    }
}
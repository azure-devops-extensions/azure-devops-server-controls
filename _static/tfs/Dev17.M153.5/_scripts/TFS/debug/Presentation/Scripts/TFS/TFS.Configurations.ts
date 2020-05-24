///<amd-dependency path="jQueryUI/droppable"/>
///<amd-dependency path="jQueryUI/button"/>
import ConfigurationsResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Configurations");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Q = require("q");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import TFS_ArrowControl = require("Presentation/Scripts/TFS/TFS.UI.ArrowScrollBar");
import ConfigurationsConstants = require("Presentation/Scripts/TFS/TFS.Configurations.Constants");

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
    /**
     * Optional. The tab can specify if the save operation depends on any other tabs.
     * This ensures that, in case of concurrent save operations, the save operation of this tab will be delayed
     * until the save call for the tabs specified in dependentOn list has been completed.
     * IMPORTANT: Only one-level of dependency is supported.
     * Attempt to have a chain of dependent tabs wil be blocked at the registration time.
     */
    dependentOn?: string[];
    /**
     * Optional. The Tab Content CSS class
     */
    tabContentClass?: string;
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
    /**
     * Optional. The tab can specify if the save operation depends on any other tabs.
     * This ensures that, in case of concurrent save operations, the save operation of this tab will be delayed
     * until the save call for the tabs specified in dependentOn list has been completed
     * IMPORTANT: Only one-level of dependency is supported.
     * Attempt to have a chain of dependent tabs wil be blocked at the registration time.
     */
    dependentOn?: string[];
    /**
     * Optional. The Tab Content CSS class
     */
    tabContentClass?: string;
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

export interface ITabContent {
    /**
     * This method should be used when you don't want the user to access the control that has been disposed.
     * For example, clicking a tab that does some server processing before loading the content. 
     * This method would prevent loading the control if it has been disposed.
     * 
     * @param actionDelegate The function to execute.
     */
    beginExecuteAction?(actionDelegate: Function): void;
    /**
     * This method is called when user clicks on the tab for the first time. 
     */
    beginLoad($container: JQuery): IPromise<any>;
    /**
     * Begin persisting user changes
     * Returns a promise that in turn returns a boolean flag, indicating whether the current save operation requires page refresh or not
     * Optional because if we save mode with save for the full configuration instead per tab, this one is not used
     */
    beginSave?(): IPromise<boolean>;
    /**
     * Indicates if the control is dirty
     */
    isDirty(): boolean;
    /**
     * Indicates if the control is valid
     */
    isValid(): boolean;
    /**
     * Accepts the event handlers for onDirtyStateChanged and onValidStateChanged events
     */
    registerStateChangedEvents(onDirtyStateChanged: Function, onValidStateChanged: Function): void;
    /**
     * If set to true, the CSC framework will not handle the server errors and the individual tabs would handle those alongwith the client-side validation errors
     */
    displayServerErrorOnTab?: boolean;
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
     * Optional method. Called when the control is rendered. 
     */
    onRender?(): void;
    /**
     * This is the callback after content has been saved. For CSC dialog, the callback will queued and executed once the dialog has been closed.  
     */
    applyChanges?: Function;
    /**
     * Optional method. Called when the control is getting disposed. 
     */
    dispose?(): void;

    /**
     * Allow to have a hook on the configuration from the tab
     */
    registerShowErrorCallback?(onShowError: Function);

    /**
     * Manually show an error at the configuration level from a tab
     */
    showError?(errorMessage: string): void;
}

/**
 * The interface for tab control saving result 
 * Exported for unit testing purposes
 */
export interface ITabControlSavingResult {
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
     * Saving is on tab level, a "Apply Change" button will show when state is dirty  
     */
    APPLY_ON_TAB,
    /**
     * Saving is on control level, user needs to call beginSave method on tabControl. That mean
     * that multiple saves are performed : one per tab.
     */
    SAVE_ON_CONTROL,

    /**
     * Saving is invoked once for the whole control, not for each individual tab page. That mean
     * that a single SAVE will be done.
     */
    SAVE_ON_DIALOG
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
     * Allow user to navigate away from current tab only when current tab is valid
     */
    NAVIGATE_ON_VALID,
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
     * The generic saving error message. Displayed when TabControlSavingMode is set to SAVE_ON_CONTROL.
     */
    errorMessage?: string;
    /**
     * A generic warning message to be displayed during the lifetime of this control
     */
    warningMessage?: string;
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

    savingMode?: TabControlSavingMode;

    onSave?: () => IPromise<ITabControlSavingResult>;

}

export class TabControl extends Controls.Control<ITabControlOption> {
    public static enhancementTypeName: string = "tfs.tabCollectionControl";
    public static EVENT_DIRTY_STATE_CHANGED: string = "event-dirty-state-changed";
    public static EVENT_VALID_STATE_CHANGED: string = "event-valid-state-changed";
    public static EVENT_SAVING_STATE_CHANGED: string = "event-saving-state-changed";

    private _activeTab: TabPage;
    private _groups: ITabGroup[] = null;
    private _tabPages = new Array<TabPage>();
    private _$tabControlOverlay: JQuery;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _$settingsErrorArea: JQuery;
    private _$settingsWarningArea: JQuery;
    private _$settingsWarningMessageTextArea: JQuery;
    private _$settingsErrorMessageTextArea: JQuery;
    private _$contentContainerElement: JQuery;
    private _navigationMode: TabControlNavigationMode;
    private _savingMode: TabControlSavingMode;
    private _isDirty: boolean = false;
    private _isSaving: boolean = false;
    private _isValid: boolean = true;
    private _$tabTitles: JQuery;
    private _$tabTitleContainer: JQuery;
    private _refreshOnClose: boolean = false;
    private _onSavedCallbackList: Function[] = [];
    private _arrowScrollbar: TFS_ArrowControl.ArrowScrollbar;

    /**
     * @param options 
     */
    public initializeOptions(options?: ITabControlOption) {
        super.initializeOptions($.extend({
            coreCssClass: "tab-collection",
            errorMessage: ConfigurationsResources.CSC_GENERIC_SERVER_ERROR
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
        this._savingMode = TabControlSavingMode.SAVE_ON_CONTROL;

        var $element = this.getElement();
        this._groups = this._getTabGroup();

        this._$contentContainerElement = $("<div>").addClass("tab-collection-container");
        this._$tabTitleContainer = $("<div>").addClass("tabs-titles-container");
        this._$tabTitles = $("<ul>").addClass("tabs-titles");

        //Create and load Tab content container
        var $tabContentsContainer = $("<div>").addClass("tabs-contents-container");
        this._groups.forEach((group) => {
            var $group = $("<li>").addClass("group-title").text(group.title).attr("role", "tablist");
            this._$tabTitles.append($group);

            var tabs = group.tabs;
            tabs.forEach((tab) => {
                var tabPage = this._createTabPageControl(group.title, tab, this._$tabTitles, $tabContentsContainer, this._savingMode, this._navigationMode);
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

        if (this._options.warningMessage) {
            this._showMessage(this._options.warningMessage, false);
        }

    }

    private _addScrollSupport($scrollContainer: JQuery, $scrollContent: JQuery) {
        var options: TFS_ArrowControl.IArrowScrollSupport = {
            align: TFS_ArrowControl.ScrollAlign.VERTICAL,
            scrollContainer: $scrollContainer,
            scrollContent: $scrollContent
        };
        this._arrowScrollbar = new TFS_ArrowControl.ArrowScrollbar(options);
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
        this._$settingsErrorArea = $("<div>").addClass("settings-message-area");
        this._$settingsErrorArea.append($("<div>").addClass("icon bowtie-icon bowtie-status-error"));
        this._$settingsErrorMessageTextArea = $("<div>").addClass("error-message");
        this._$settingsErrorArea.append(this._$settingsErrorMessageTextArea);
        this._$settingsErrorArea.hide();
        $element.prepend(this._$settingsErrorArea);
    }

    private _createWarningMessageArea($element: JQuery) {
        // Div to display persistent warning
        this._$settingsWarningArea = $("<div>").addClass("settings-message-area");
        this._$settingsWarningArea.append($("<div>").addClass("icon bowtie-icon bowtie-status-warning"));
        this._$settingsWarningMessageTextArea = $("<div>").addClass("warning-message");
        this._$settingsWarningArea.append(this._$settingsWarningMessageTextArea);
        this._$settingsWarningArea.hide();
        $element.prepend(this._$settingsWarningArea);
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
     * Check the valid states for the all tab pages 
     * @return True if all of the tab pages are valid
     */
    public isValid(): boolean {
        for (var i = 0, len = this._tabPages.length; i < len; i++) {
            var tab = this._tabPages[i];
            if (!tab.isValid()) {
                return false;
            }
        }
        return true;
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

    public getOnSavedCallbackList(): Function[] {
        return this._onSavedCallbackList;
    }

    public clearOnSavedCallbackList(): void {
        this._onSavedCallbackList = [];
    }

    public refreshOnClose() {
        return this._refreshOnClose;
    }

    private _createTabPageControl(groupTitle: string, tab: ITab<any>, titleContainer: JQuery, contentContainer: JQuery, savingMode: TabControlSavingMode,
        navigrationMode: TabControlNavigationMode): TabPage {
        const tabControlOption: ITabPageOption = {
            tab: tab,
            titleContainer: titleContainer,
            contentContainer: contentContainer,
            onTabChanged: delegate(this, this._onTabChanged),
            onTabChanging: delegate(this, this._onTabChanging),
            onTabSaved: delegate(this, this._onTabSaved),
            onSavingStateChanged: delegate(this, this._onSavingStateChanged),
            onDirtyStateChanged: delegate(this, this._onDirtyStateChanged),
            onValidStateChanged: delegate(this, this._onValidStateChanged),
            onShowError: delegate(this, this._onShowError),
            navigationMode: navigrationMode,
            savingMode: savingMode
        };
        const tabControl = new TabPage(tabControlOption);
        tabControl.initialize();
        return tabControl;
    }

    private _onShowError(message: string) {
        this._showMessage(message, true);
    }

    private _onTabChanged(tab: TabPage) {
        this._activeTab = tab;
    }

    private _onTabChanging(): boolean {
        switch (this._navigationMode) {
            case TabControlNavigationMode.ALWAYS_NAVIGATE:
                return true;
            case TabControlNavigationMode.NAVIGATE_ON_VALID:
                return this._activeTab.isValid();
            case TabControlNavigationMode.CUSTOMIZED:
                return this._activeTab.onTabChanging();
            default:
                return true;
        }
    }

    private _onTabSaved(result: ITabControlSavingResult) {
        //CAN BE EXTENDED TO HANDLE BOTH SUCCEEDED AND FAILURE
        if (this._savingMode === TabControlSavingMode.SAVE_ON_CONTROL && result.status !== TabSavingStatus.SUCCEEDED) {
            this._showMessage(null, true);
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

    private _onValidStateChanged() {
        var newValue = this.isValid();
        if (newValue) {
            this._hideError();
        }
        if (this._isValid !== newValue) {
            this._isValid = newValue;
            this._fire(TabControl.EVENT_VALID_STATE_CHANGED);
        }
    }

    private _showMessage(message?: string, isError?: boolean) {
        if (!message) {
            message = isError ? this._options.errorMessage : this._options.warningMessage;
        }
        if (isError) {

            if (!this._$settingsErrorArea) {
                this._createMessageArea(this.getElement());
            }
            this._$settingsErrorMessageTextArea.text(message);
            this._$settingsErrorArea.show();
        }
        else {
            if (!this._$settingsWarningArea) {
                this._createWarningMessageArea(this.getElement());
            }
            this._$settingsWarningMessageTextArea.text(message);
            this._$settingsWarningArea.show();
        }

        this._resizeContentContainerElement();
        this.onResize();
    }

    private _hideError() {
        if (this._$settingsErrorArea) {
            this._$settingsErrorArea.hide();
            this._resizeContentContainerElement();
            this.onResize();
        }
    }

    private _resizeContentContainerElement(): void {
        var heightOffset = (this._$settingsWarningArea ? this._$settingsWarningArea.outerHeight() : 0)
            + (this._$settingsErrorArea ? this._$settingsErrorArea.outerHeight() : 0);

        this._$contentContainerElement.css('height', 'calc(100% - ' + heightOffset + 'px)');
    }

    private _focusInvalidTab(): boolean {
        for (var i = 0, len = this._tabPages.length; i < len; i++) {
            var tab = this._tabPages[i];
            if (!tab.isValid()) {
                tab.select();
                //TODO: GET CORRECT MESSGAE FROM PM OR MAKE IT FROM OPTION
                this._showMessage(ConfigurationsResources.CSC_INVALID_TAB_ERROR, true);
                return true;
            }
        }
        return false;
    }

    /**
     * Public for unit testing.
     * Sort dependent and independent tab pages into different groups  
     * @param dirtyTabPages The set of pages to be classified
     * @param independentTabs The set of pages that are independent
     * @param dependentTabs The set of pages which are dependent on other tabs
     */
    public _classifyDependents(dirtyTabPages: TabPage[], independentTabs: TabPage[], dependentTabs: TabPage[]): void {
        // Classify dirty tabs as dependent and independent
        for (var i = 0, len = dirtyTabPages.length; i < len; i++) {
            var currentTab = dirtyTabPages[i];
            var currentTabData = currentTab.getTab();
            var hasDirtyPredecessors: boolean = false;

            // Assuming no circular and multi-level dependency
            if (currentTabData.dependentOn && currentTabData.dependentOn.length > 0) {
                currentTabData.dependentOn.forEach((currentTabId: string) => {
                    // Check if the current tab is present in the dirty pages list
                    var predecessorTab = dirtyTabPages.filter(
                        (currentPage: TabPage) => {
                            return (Utils_String.localeIgnoreCaseComparer(currentTabId, currentPage.getTab().id) === 0);
                        });
                    if (predecessorTab.length > 0) {
                        // TabPage is in the dirty pages list, exit the loop
                        hasDirtyPredecessors = true;
                        return false;
                    }
                });
            }
            if (hasDirtyPredecessors) {
                // We have a dirty predecessor for the current tab, so add it to the dependent tab
                dependentTabs.push(currentTab);
            }
            else {
                // No dirty predecessors found
                independentTabs.push(currentTab);
            }
        }
    }

    /**
     * Save every tabs in 1 operation.
     * @return IPromise<ITabControlSavingResult>: Allow to set the refresh experience
     */
    public beginSingleSave(e?: JQueryEventObject): IPromise<ITabControlSavingResult> {
        this._hideError();
        const deferred = Q.defer<ITabControlSavingResult>();
        this._options.onSave().then(
            (value: ITabControlSavingResult) => {
                this._refreshOnClose = value.refreshPage;
                deferred.resolve(value);
            },
            (message?: string) => {
                this._showMessage(message, true);
                deferred.reject(message);
            });

        return deferred.promise;
    }

    /**
     * Check if there is an invalid page. Focus on the first invalid page if there is any. 
     * Begin to persist user changes by iterate all the tab pages and call the beginSave() for each page if it is dirty and valid
     * @param e The event that trigger the saving
     * @return JQueryPromise for saving content. Fullfilled when all the pages are saved successfully and rejected when any one of them get rejected.
     */
    public beginSave(e?: JQueryEventObject): IPromise<TabSavingStatus> {
        var deferred = Q.defer<TabSavingStatus>();
        if (this._focusInvalidTab()) {
            deferred.reject(TabSavingStatus.INVALID_USER_INPUT);
            return deferred.promise;
        }
        this._hideError();

        // Trigger saving on dirty tabs
        this._showOverlay(ConfigurationsResources.CustomizeColumnsSaving);
        var independentTabs: TabPage[] = [];
        var dependentTabs: TabPage[] = [];
        var independentPromises: IPromise<ITabControlSavingResult>[] = [];


        // Filter out the non-dirty pages
        const dirtyTabPages = $.grep(this._tabPages, (currentPage: TabPage) => {
            return (currentPage.isDirty());
        });

        // Split dependent and independent tab pages into different groups  
        this._classifyDependents(dirtyTabPages, independentTabs, dependentTabs);

        // Invoke the beginSave promises for the independent tabs
        independentTabs.forEach(
            (currentIndependentTab: TabPage) => {
                if (currentIndependentTab.beginSave) {
                    independentPromises.push(currentIndependentTab.beginSave(e, false));
                }
            });

        const onAllSettled = (results: Q.PromiseState<ITabControlSavingResult>[], hadError?: boolean): boolean => {
            if (!this._refreshOnClose && results && results.length > 0) {
                let hasError: boolean = false;
                for (let index = 0; index < results.length; index++) {
                    const currentResult = results[index];
                    if (currentResult.state === "fulfilled") {
                        const currentValue = currentResult.value;
                        if (currentValue.refreshPage) {
                            this._refreshOnClose = true;
                            break;
                        }
                        else if (currentValue.tab) {
                            const currentTabContent = currentValue.tab.getTabContent();
                            if (currentTabContent.applyChanges
                                && $.isFunction(currentTabContent.applyChanges)
                                && $.inArray(currentTabContent.applyChanges, this._onSavedCallbackList) === -1) {
                                this._onSavedCallbackList.push(currentTabContent.applyChanges);
                            }
                        }
                    }
                    else if (!hasError) {
                        // Select the tab with error, only if there was no error, prior to this in the previous set of beginSave calls for independent tabs
                        if (!hadError) {
                            var tab: TabPage = currentResult.reason.tab;
                            tab.select();
                            this._showMessage(null, true);
                        }
                        hasError = true;
                    }
                }
                return hasError;
            }
        };

        const onSucceeded = (): void => {
            this._hideOverlay();
            deferred.resolve(TabSavingStatus.SUCCEEDED);
        };

        const onRejected = (): void => {
            this._hideOverlay();
            deferred.reject(TabSavingStatus.SERVER_SAVING_ERROR);
        };

        Q.allSettled(independentPromises).then((results: Q.PromiseState<ITabControlSavingResult>[]) => {
            // Defer rejecting the promise until the second batch, in case of a failure
            var hasError = onAllSettled(results);
            if (dependentTabs.length > 0) {
                var promises: IPromise<ITabControlSavingResult>[] = [];
                // Trigger beginSave calls for the dependent tabs
                dependentTabs.forEach((currentTab) => {
                    if (currentTab.beginSave) {
                        promises.push(currentTab.beginSave(e, false));
                    }
                });
                Q.allSettled(promises).then(
                    (results) => {
                        // If any independent or dependent promise was rejected, reject the current promise
                        if (onAllSettled(results, hasError) || hasError) {
                            onRejected();
                        }
                        onSucceeded();
                    });
            }
            else {
                if (hasError) {
                    // Reject the promise right away if there are no dependent tabs
                    onRejected();
                }
                onSucceeded();
            }
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
     * callback function when valid state changes
     */
    onValidStateChanged: Function;
    /**
     * navigation mode from tab control
     */
    navigationMode: TabControlNavigationMode;
    /**
     * saving mode from tab control
     */
    savingMode: TabControlSavingMode;
    /**
     * If set to true, the CSC framework will handle the server errors and the individual tabs should handle only the client-side validation errors
     */
    handleServerError?: boolean;
    /**
     * callback function when error to display
     */
    onShowError(message: string): void;
}

// Exporting for unit testing purposes
export class TabPage {
    private _tab: ITab<any>;
    private _$tabOverlay: JQuery;
    private _tabContent: ITabContent;
    private _$contentRoot: JQuery;
    private _$contentElement: JQuery;
    private _$contentMain: JQuery;
    private _$settingsContainer: JQuery;
    private _$titleElement: JQuery;
    private _$titleErrorIcon: JQuery;
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
        this._$titleErrorIcon = $("<div>").addClass("icon bowtie-icon bowtie-status-error").hide();

        this._$titleElement = $("<li>").addClass("tab-title").attr("tabindex", -1).attr("role", "tab").keydown((e?: JQueryEventObject) => {
            if (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE) {
                this._onTabTitleSelect(true);
                return false;
            }
            else if (e.keyCode === Utils_UI.KeyCode.DOWN) {
                this._$titleElement.nextAll(".tab-title").first().focus();
            }
            else if (e.keyCode === Utils_UI.KeyCode.UP) {
                this._$titleElement.prevAll(".tab-title").first().focus();
            }
        });
        this._$titleElement.append(this._$titleErrorIcon);
        this._$titleElement.append($("<div>").addClass("tab-title-text").text(this._tab.title));
        $titleContainer.append(this._$titleElement);

        this._$contentRoot = $("<div>").addClass("tab-content-container");

        if (this._savingMode === TabControlSavingMode.APPLY_ON_TAB) {
            var $applyBtn = $("<div>").addClass("tab-content-apply-btn").attr("tabindex", "0").text(ConfigurationsResources.TabPageApplyChanges);
            this._$savePanel = $("<div>").addClass("tab-content-apply-panel");
            this._$savePanel.append($applyBtn);
            this._$contentRoot.append(this._$savePanel);
            $applyBtn.click(delegate(this, this.beginSave, true));
        }

        this._$contentElement = $("<div>").addClass("tab-content");
        if (this._tab.tabContentClass) {
            this._$contentElement.addClass(this._tab.tabContentClass);
        }
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
     * Set the focus on the first tabbable input in the tab content. If consumers want to override focus they can do so in onTabActivated
     * @fallbackToTabbable boolean If set to true and no input found will set focus on first tabbable element in container
     */
    private _focus(fallbackToTabbable = false) {
        let $elementToFocus = this._$contentElement.find("input[tabindex!='-1']:visible:first");

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
     * Return the valid state for the content tab 
     * @return boolean
     */
    public isValid(): boolean {
        if (this._isLoaded && this._tabContent) {
            try {
                return this._tabContent.isValid();
            } catch (error) {
                Diag.Debug.fail("There is an error on tab isValid. Tab: " + this._tab.title + " Error: " + error.message);
                throw error;
            }
        }
        return true;
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

    private _onTabTitleSelect(keyboardInvoked = false) {
        if ($.isFunction(this._options.onTabChanging) && !this._options.onTabChanging()) {
            return;
        }

        this._$titleElement.addClass("current").attr("tabindex", 0);
        this._$titleElement.siblings(".tab-title").removeClass("current").attr("tabindex", -1);
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
                    if (!this._tabContent.displayServerErrorOnTab) {
                        // Div to display server errors
                        this._$commonMessageArea = $("<div>").addClass("common-message-area");
                        this._$commonMessageArea.append($("<div>").addClass("icon bowtie-icon bowtie-status-error"));
                        this._$commonMessageTextArea = $("<div>").addClass("error-message");
                        this._$commonMessageArea.append(this._$commonMessageTextArea);
                        this._$commonMessageArea.hide();
                        this._$contentMain.prepend(this._$commonMessageArea);
                    }

                    this._tabContent.registerStateChangedEvents(delegate(this, this._onDirtyStateChanged), delegate(this, this._onValidStateChanged));
                    if (this._tabContent.registerShowErrorCallback) {
                        this._tabContent.registerShowErrorCallback(delegate(this, this._onShowError));
                    }
                    this._isLoaded = true;
                    this._onRenderContent(this._$contentRoot);
                    // after first loaded of the tab content, it now knows whether itself is valid or not. It then needs to refresh its style and call proper action for the change in its valid state.
                    this._onValidStateChanged();
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
                this._onRenderContent(this._$contentRoot);
            }
        }
    }

    private _onShowError(message: string) {
        if ($.isFunction(this._options.onShowError)) {
            this._options.onShowError(message);
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

    private _onValidStateChanged() {
        this._refreshStyle();
        if ($.isFunction(this._options.onValidStateChanged)) {
            this._options.onValidStateChanged();
        }
    }

    private _onRenderContent($contentRoot: JQuery) {
        this._$titleElement.blur();
        this.onResize();
        this.onRender();
        if ($.isFunction(this._options.onTabChanged)) {
            this._options.onTabChanged(this);
        }
    }

    private _refreshStyle() {
        const isValid = this.isValid();
        const isDirty = this.isDirty();

        let hasIndicator = false;
        let ariaLabel = "";

        if (!isValid) {
            hasIndicator = true;
            this._$titleElement.addClass("invalid");
            ariaLabel = Utils_String.format(ConfigurationsResources.CSC_GENERIC_SERVER_ERROR_TOOLTIP, this._tab.title);
            this._$titleErrorIcon.show();
        }
        else {
            this._$titleElement.removeClass("invalid");
        }

        if (!hasIndicator && this.isSaving()) {
            hasIndicator = true;
            this._$titleElement.addClass("isSaving");
        }
        else {
            this._$titleElement.removeClass("isSaving");
        }

        if (!hasIndicator && isDirty) {
            hasIndicator = true;
            if (!ariaLabel) {
                ariaLabel = Utils_String.format(ConfigurationsResources.CSC_UNSAVED_CHANGES, this._tab.title);
            }
            this._$titleElement.addClass("isDirty");
        }
        else {
            this._$titleElement.removeClass("isDirty");
        }

        this._$titleElement.attr("aria-label", ariaLabel);
        if (this._savingMode === TabControlSavingMode.APPLY_ON_TAB) {
            if (isDirty && isValid) {
                this._$savePanel.fadeIn();
                this._$contentElement.css("height", "calc(100 % - 28px)");
            }
            else {
                this._$savePanel.css("display", "none");
                this._$contentElement.css("height", "100%");
            }
        }
        if (isValid && this._$commonMessageArea && !this._hasServerError) {
            this._$commonMessageArea.hide();
            this._$commonMessageArea.removeClass("visible");
            this._$titleErrorIcon.hide();
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
        var result: ITabControlSavingResult = null;
        if (!this.isValid()) {
            result = this._createSavingResult(this, TabSavingStatus.INVALID_USER_INPUT, false);
            deferred.reject(result);
            return deferred.promise;
        }
        if (!this.isDirty()) {
            result = this._createSavingResult(this, TabSavingStatus.NO_CHANGE, false);
            deferred.resolve(result);
            return deferred.promise;
        }

        if (showOverlay) {
            this._showOverlay(ConfigurationsResources.CustomizeColumnsSaving);
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
            this._$commonMessageArea.addClass("visible");
            this._$titleErrorIcon.show();
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

    public onRender() {
        if (this._tabContent && this._tabContent.onRender && $.isFunction(this._tabContent.onRender)) {
            this._tabContent.onRender();
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
export class TabContentBaseControl<TOptions> extends Controls.Control<TOptions> implements ITabContent {
    private _isDirty: boolean = false;
    private _isValid: boolean = true;
    private _onDirtyStateChanged: Function;
    private _onValidStateChanged: Function;

    constructor(options?: TOptions) {
        super(options);
    }

    public beginExecuteAction(actionDelegate: Function) {
        if (!this.isDisposed() && $.isFunction(actionDelegate)) {
            actionDelegate();
        }
    }

    /**
     * Gets the dirty state for the content control
     * @return boolean
     */
    public isDirty(): boolean {
        return this._isDirty;
    }

    /**
     * Gets the valid state for the content control
     * @return boolean
     */
    public isValid(): boolean {
        return this._isValid;
    }

    /**
     * Method that lets the CSC specify the delegates to be called on state change in the tab content
     * @param onDirtyStateChanged The delegate for the dirty state transition
     * @param onValidStateChanged The delegate for the valid state transition
     */
    public registerStateChangedEvents(onDirtyStateChanged: Function, onValidStateChanged: Function): void {
        this._onDirtyStateChanged = onDirtyStateChanged;
        this._onValidStateChanged = onValidStateChanged;
    }

    /**
     * Method that renders the actual control, on called by the CSC framework
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
     * Set the valid state for the content control, make sure call this for any valid state change
     * @param isValid
     */
    public fireValidFlagChange(isValid: boolean) {
        if (this._isValid !== isValid) {
            this._isValid = isValid;
            if ($.isFunction(this._onValidStateChanged)) {
                this._onValidStateChanged();
            }
        }
    }

    /**
     * Begin to persist user changes, make sure you overwrite this
     * @return JQueryPromise for saving content.
     */
    public beginSave(): IPromise<boolean> {
        Diag.Debug.fail("this method should not be called, sub classes need to override beginSave()");
        var deferred = Q.defer<boolean>();
        deferred.resolve(false);
        return deferred.promise;
    }

    public dispose() {
        this._onValidStateChanged = null;
        this._onDirtyStateChanged = null;

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

        // check if the dependency list is not multi-level Id
        if (registration.dependentOn && registration.dependentOn.length > 0) {
            registration.dependentOn.forEach((predecessorTabId) => {
                var predecessorTabList: ITab<T>[] = [];
                // Look for the predecessor tab in all the groups
                tabGroups.forEach((group: ITabGroup) => {
                    predecessorTabList = predecessorTabList.concat(
                        group.tabs.filter(
                            (currentTab: ITab<any>) => {
                                return (Utils_String.localeIgnoreCaseComparer(predecessorTabId, currentTab.id) === 0);
                            }));
                });
                if (predecessorTabList.length === 1) {
                    var predecessorTab = predecessorTabList[0];
                    // The predecessor tab in turn should not have any other predecessors
                    if (predecessorTab.dependentOn && predecessorTab.dependentOn.length > 0) {
                        // Block the multi-level dependency
                        throw new Error("The dependentOn list has a tab Id that already has predecessors.");
                    }
                    return;
                }
                else {
                    throw new Error("The dependentOn list has a tab Id that has not been registered yet. Please register the predecessors first.");
                }
            });
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
        return {
            id: tabRegistration.id || TFS_Core_Utils.GUIDUtils.newGuid(),
            title: tabRegistration.title,
            tabContent: tabRegistration.tabContent,
            tabContentOptions: tabRegistration.tabContentOptions || <T>{},
            order: tabRegistration.order || this._getNextTabOrder(tabGroup),
            dependentOn: tabRegistration.dependentOn,
            tabContentClass: tabRegistration.tabContentClass || ""
        };
    }

}

interface IButton {
    id: string;
    text: string;
    click: () => void;
    disabled?: string;
    class?: string;
}

export interface ConfigurationSettingsDialogOptions extends Dialogs.IModalDialogOptions {
    defaultTabId?: string;
    savingMode?: TabControlSavingMode;
    onSave?: () => IPromise<ITabControlSavingResult>;
    warningMessage?: string;
    ignoreChangesOnNavigation?: boolean;
}

export interface ICloseCommonConfigurationActionArgs {
    skipConfirmationDialog: boolean
}

export class ConfigurationSettingsDialog extends Dialogs.ModalDialogO<ConfigurationSettingsDialogOptions> {
    public static enhancementTypeName: string = "tfs.agile.configurationSettingsDialog";
    private static _isInitialized: boolean = false;
    protected static _testHookSkipParentInitialization: boolean = false;
    private static ON_RESIZE_THROTTLE_TIME = 20;
    private _control: TabControl;
    private _resizeThrottleDelegate: IArgsFunctionR<any>;
    private _skipConfirmCloseDialog: boolean;

    public static show(options?: any /* ConfigurationSettingsDialogOptions */): any {
        if (ConfigurationSettingsDialog._isInitialized) {
            return;
        }
        options = $.extend({
            dynamicSize: true,
            widthPct: 0.60,
            minWidth: 600,
            heightPct: 0.75,
            minHeight: 500,
            attachResize: true,
            dialogClass: "configuration-dialog",
            useBowtieStyle: true,
            bowtieVersion: 2,
            contentMargin: false,
        }, options);

        return Dialogs.show(ConfigurationSettingsDialog, options);
    }

    constructor(options?: ConfigurationSettingsDialogOptions) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            beforeClose: delegate(this, this.beforeClose),
            buttons: this._getButtons(false, true)
        }, options));
    }

    public initialize() {
        ConfigurationSettingsDialog._isInitialized = true;
        if (!ConfigurationSettingsDialog._testHookSkipParentInitialization) {
            super.initialize();
        }

        this.setTitle(ConfigurationsResources.CSC_DIALOG_TITLE);

        var tabCollectionOption: ITabControlOption = {
            id: ConfigurationsConstants.RegistrationIds.COMMON_CONFIG_SETTING_INSTANCE_ID,
            defaultTabId: this._options.defaultTabId,
            savingMode: this._options.savingMode,
            onSave: this._options.onSave,
            warningMessage: this._options.warningMessage
        };

        this._control = <TabControl>Controls.Control.createIn<ITabControlOption>(TabControl, this.getElement(), tabCollectionOption);

        this._control._bind(TabControl.EVENT_DIRTY_STATE_CHANGED, delegate(this, this._refreshButton));
        this._control._bind(TabControl.EVENT_VALID_STATE_CHANGED, delegate(this, this._refreshButton));
        this._resizeThrottleDelegate = Utils_Core.throttledDelegate(this._control, ConfigurationSettingsDialog.ON_RESIZE_THROTTLE_TIME, this._control.onResize);
        this._bind("dialogresize", this._resizeThrottleDelegate);
        this._bind(window, "resize", this._resizeThrottleDelegate);
        this._registerCloseDialogActionWorker();
    }

    private _refreshButton() {
        const buttons = this._getButtons(this._control.isDirty(), this._control.isValid());
        const dialog = this.getElement().parent();
        $.each(buttons, (index: number, button: IButton) => {
            dialog.find("#" + button.id).button("option", "label", button.text);
            this._updateButton(button.id, button.disabled !== "disabled");
        });
    }

    private _getButtons(editModeOn: boolean, isValid: boolean): IButton[] {
        return [
            {
                id: "save",
                text: ConfigurationsResources.CSC_SAVE_BUTTON_TEXT,
                click: delegate(this, this._onSaveClick),
                disabled: (editModeOn && isValid) ? null : "disabled",
                "class": "btn-cta"
            },
            {
                id: "cancel",
                text: ConfigurationsResources.CSC_CANCEL_BUTTON_TEXT,
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

    /**
     * Called before closing the dialog.
     * When in a close after a save, we skip the confirmation
     */
    public beforeClose(e?: JQueryEventObject): boolean {
        if (!this._skipConfirmCloseDialog && this._options.ignoreChangesOnNavigation) {
            this._skipConfirmCloseDialog = this._closedByNavigation;
        }

        if (this._control && this._control.isDirty() && !this._skipConfirmCloseDialog) {
            Dialogs.MessageDialog.showMessageDialog(ConfigurationsResources.CustomizeConfigurationUnsavedChanges,
                {
                    title: ConfigurationsResources.ConfirmCancelTitle
                }).then(() => {
                    this._skipConfirmCloseDialog = true;
                    this.close();
                });
            return false;
        }

        this._evaluateOnCloseStrategy();
        return true;
    }

    private _evaluateOnCloseStrategy(): void {
        if (this._control) {
            if (this._control.refreshOnClose()) {
                Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_RELOAD);
            } else {
                $.each(this._control.getOnSavedCallbackList(), (index, onSavedCallback) => {
                    onSavedCallback();
                });
                this._control.clearOnSavedCallbackList();
            }
        }
    }

    private _onSaveClick(e?: JQueryEventObject) {
        this._updateButton("save", false);
        const savingCompleted = () => {
            this._evaluateOnCloseStrategy();
            this._skipConfirmCloseDialog = true;
            this.close();
        };
        const savingError = () => {
            this._refreshButton();
        };
        if (this._options.savingMode === TabControlSavingMode.SAVE_ON_DIALOG) {
            this._control.beginSingleSave(e).then(savingCompleted, savingError);
        }
        else {
            this._control.beginSave(e).then(savingCompleted, savingError);
        }
    }

    private _registerCloseDialogActionWorker() {
        Events_Action.getService().registerActionWorker(
            ConfigurationsConstants.Actions.CLOSE_COMMON_CONFIGURATION,
            (actionArgs: any, next: Function) => {
                let closeArgs: ICloseCommonConfigurationActionArgs = actionArgs;
                this._skipConfirmCloseDialog = closeArgs.skipConfirmationDialog;
                this.close();
            },
            Events_Action.ActionService.MaxOrder);
    }

    private _unregisterCloseDialogActionWorker() {
        Events_Action.getService().unregisterActionWorkers(
            ConfigurationsConstants.Actions.CLOSE_COMMON_CONFIGURATION);
    }

    public onCancelClick(e?: JQueryEventObject) {
        this._evaluateOnCloseStrategy();
        this._skipConfirmCloseDialog = false;
        this.close();
    }

    public dispose() {
        ConfigurationSettingsDialog._isInitialized = false;
        if (this._control) {
            this._control.dispose();
            this._control = null;
        }
        this._unbind("dialogresize", this._resizeThrottleDelegate);
        this._unbind(window, "resize", this._resizeThrottleDelegate);
        this._resizeThrottleDelegate = null;
        this._unregisterCloseDialogActionWorker();
        super.dispose();
    }
}

// We have a function to be able to call it in situation where the EventService got flushed
export function registerConfigurationSettingsDialog() {
    // Register default action worker as the last in the chain
    Events_Action.getService().registerActionWorker(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, (actionArgs: any, next: Function) => {
        ConfigurationSettingsDialog.show(actionArgs as ConfigurationSettingsDialogOptions);

        // record telemetry if any.
        if (actionArgs && actionArgs.perfScenario && $.isFunction(actionArgs.perfScenario.end)) {
            actionArgs.perfScenario.end();
        }
    }, Events_Action.ActionService.MaxOrder);

};
registerConfigurationSettingsDialog();

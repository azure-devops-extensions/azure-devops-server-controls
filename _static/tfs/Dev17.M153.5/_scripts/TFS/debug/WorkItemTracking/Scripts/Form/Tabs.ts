import Controls = require("VSS/Controls");
import Models = require("WorkItemTracking/Scripts/Form/Models");
import FormRenderer = require("WorkItemTracking/Scripts/Form/Renderer");
import Grids = require("WorkItemTracking/Scripts/Form/Grids");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import Menus = require("VSS/Controls/Menus");
import Events_Services = require("VSS/Events/Services");
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { ILayoutPage } from "WorkItemTracking/Scripts/Form/Layout";
import { WIFormCIDataHelper } from "WorkItemTracking/Scripts/Utils/WIFormCIDataHelper";
import { createPageContribution } from "WorkItemTracking/Scripts/Form/Contributions";
import { WorkItemActions } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { ContributionLoadedCallbacks } from "WorkItemTracking/Scripts/Form/ContributionLoadedCallbacks";

const eventSvc = Events_Services.getService();

export class WorkItemFormTabsControl extends Controls.Control<IWorkItemFormTabOptions> {
    public static TAB_ACTIVATED_EVENT: string = "work-item-form-tab-activated";

    private _tabsWrapper: JQuery;
    private _tabs: WorkItemFormTab[];
    private _toolbar: Menus.MenuBar;
    private _toolbarContainer: JQuery;
    private _activeTab: WorkItemFormTab;
    private static FORM_TAB_MARGIN_RIGHT: number = 17;
    private static FORM_TAB_BUFFER: number = 10;

    constructor(options: IWorkItemFormTabOptions) {
        super(options);
        this._tabsWrapper = $("<ul />").attr("role", "tablist");
        this._tabs = [];
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({ coreCssClass: "work-item-form-tabs" }, options));
    }

    public initialize(): void {
        super.initialize();
        this._element.append(this._tabsWrapper);
        this._buildTabDropDownToolBar();

        this._element.keydown((e: JQueryEventObject) => {
            this._onKeyDown(e);
        });
        eventSvc.attachEvent(WorkItemActions.WORKITEM_MAXIMIZE_STATE_CHANGED, this._workItemFormResizedCallback);
    }

    public resize() {
        // Use element[0].getBoundingClientRect().width instead of outerWidth(true) to get exact number of width since outerWidth(true) will round the number to neariest integer.
        // This is to make the width calculation more accurate.
        const availableWidth = this._getAvailableWidth();
        const hiddenTabs: WorkItemFormTab[] = [];

        this._toolbarContainer.show();
        this._toolbarContainer.css("display", "inline-block");
        let width = this._toolbarContainer[0].getBoundingClientRect().width;

        // Instead of pre-checking visibleTabsWidth >= availableWidth, we always process all tabs which nearly has no impact on performance.
        // Previously we show all tabs when visibleTabsWidth < availableWidth which will trigger resize again and recalculate the hidden tabs.
        // Which makes the tabs feel jumpy and even more jumpier when using exact width number.
        width += this._activeTab ? this._activeTab.width() : 0;

        // Add all non-custom tabs (attachments,history,links) widths first since we never hide these
        $.each(this._tabs, (i: number, tab: WorkItemFormTab) => {
            if (tab !== this._activeTab && tab.page.pageType !== Models.PageType.custom) {
                tab.show();
                width += tab.width();
            }
        });

        $.each(this._tabs, (i: number, tab: WorkItemFormTab) => {
            if (tab !== this._activeTab && tab.page.pageType === Models.PageType.custom) {
                tab.show();
                width += tab.width();
                if (width >= availableWidth) {
                    width -= tab.width();
                    tab.hide();
                    hiddenTabs.push(tab);
                }
            }
        });

        if (hiddenTabs.length > 0) {
            this._updateToolbarItems(hiddenTabs);
        }
        else {
            this._toolbarContainer.hide();
        }
    }

    public getTabs(): WorkItemFormTab[] {
        return this._tabs;
    }

    public setActiveTab(activeTab: WorkItemFormTab): void {        
        for (let i = 0; i < this._tabs.length; i++) {
            let tab: WorkItemFormTab = this._tabs[i];
            tab.formGrid.hide();
            tab.setSelected(false);

            /* note aria-posinset should be greater than 1 to work */
            tab.setTabPosition(i+1, this._tabs.length);            
        }

        activeTab.setSelected(true);

        this._activeTab = activeTab;
        this.resize();

        eventSvc.fire(WorkItemFormTabsControl.TAB_ACTIVATED_EVENT, this);

        WIFormCIDataHelper.workItemTabClick(activeTab.page.label, { });
    }

    public addTab(page: ILayoutPage, pageIndex: number, grid: Grids.FormGrid, bodyRenderer: FormRenderer.FormRenderer): WorkItemFormTab {
        const tabOptions: IWorkItemFormTabOptions = {
            pageIndex: pageIndex,
            page: page,
            renderer: bodyRenderer,
            formGrid: grid,
            tabsControl: this
        }

        const tab = <WorkItemFormTab>Controls.BaseControl.createIn(WorkItemFormTab, this._tabsWrapper, tabOptions);
        this._tabs.push(tab);
        this._tabsWrapper.append(this._toolbarContainer);
        return tab;
    }

    public getResponsiveToolbarItems(tabs: WorkItemFormTab[]) {
        const childItems = [];
        const items = [];

        $.each(tabs || [], (i: number, tab: WorkItemFormTab) => {
            if (tab.page.pageType !== Models.PageType.custom) {
                childItems.push({ id: tab.page.label, showText: true, text: tab.page.label, title: tab.page.label, hidden: false, tab: tab, icon: tab.getIconName() });
            }
            else {
                childItems.push({ id: tab.page.label, showText: true, text: tab.page.label, title: tab.page.label, hidden: false, tab: tab });
            }
        });

        items.push(
            {
                id: "actions",
                idIsAction: false,
                icon: "bowtie-icon bowtie-ellipsis",
                hideDrop: true,
                showText: false,
                childItems: childItems,
                extraOptions: { align: "right-bottom" }
            });

        return items;
    }

    public getActiveTab(): WorkItemFormTab {
        return this._activeTab;
    }

    public getToolbar(): Menus.MenuBar {
        return this._toolbar;
    }

    protected _dispose() {
        // Detach events
        eventSvc.detachEvent(WorkItemActions.WORKITEM_MAXIMIZE_STATE_CHANGED, this._workItemFormResizedCallback);

        // Dispose tabs
        if (this._tabs) {
            for (let tab of this._tabs) {
                tab.dispose();
            }
            this._tabs = null;
            this._activeTab = null;
        }

        super._dispose();
    }

    public navigateTabs(command: string): void {
        const tabs = this.getTabs();
        const self = this;
        if (tabs && tabs.length > 0) {
            switch (command) {
                case Resources.KeyboardShortcutDescription_LeftTab:
                    const left = tabs.indexOf(this.getActiveTab());
                    left > 0 ? this.setActiveTab(tabs[left - 1]) : this.setActiveTab(tabs[tabs.length - 1]);
                    this.getActiveTab().getElement().click();
                    break;
                case Resources.KeyboardShortcutDescription_RightTab:
                    const right = tabs.indexOf(this.getActiveTab());
                    this.getActiveTab().focus();
                    right < tabs.length - 1 ? this.setActiveTab(tabs[right + 1]) : this.setActiveTab(tabs[0]);
                    this.getActiveTab().getElement().click();
                    break;
                case Resources.KeyboardShortcutDescription_HistoryTab:
                    tabs.some(function (tab) {
                        if (tab.page.pageType == Models.PageType.history) {
                            self.setActiveTab(tab);
                            return true;
                        }
                    })
                    break;
                case Resources.KeyboardShortcutDescription_LinksTab:
                    tabs.some(function (tab) {
                        if (tab.page.pageType == Models.PageType.links) {
                            self.setActiveTab(tab);
                            return true;
                        }
                    })
                    break;
                case Resources.KeyboardShortcutDescription_AttachmentsTab:
                    tabs.some(function (tab) {
                        if (tab.page.pageType == Models.PageType.attachments) {
                            self.setActiveTab(tab);
                            return true;
                        }
                    })
                    break;
            }
        }
    }

    private _getAvailableWidth(): number {
        let availableWidth: number = 0;

        if (this._options.getAvailableWidth) {
            availableWidth = this._options.getAvailableWidth();
            // Space for form tab is the core content width minus the controls width minus the margin of form tab and reserve some buffer.
            // Buffer here is in case there's a small calculation error (eg rounding) or a small margin change in CSS it won't run into another line.
            availableWidth = availableWidth - WorkItemFormTabsControl.FORM_TAB_MARGIN_RIGHT - WorkItemFormTabsControl.FORM_TAB_BUFFER;
            availableWidth = availableWidth > 0 ? availableWidth : 0;
        }

        return availableWidth;
    }

    private _buildTabDropDownToolBar(): void {

        this._toolbarContainer = $("<li />").addClass("work-item-form-tabs-toolbar");
        this._element.append(this._toolbarContainer);

        this._toolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this._toolbarContainer, {
            hideTimeout: 100,
            items: this.getResponsiveToolbarItems(this._tabs),
            executeAction: this._onToolbarItemClickCallback
        });

        this._tabsWrapper.append(this._toolbarContainer);
    }

    private _onKeyDown(e: JQueryEventObject) {
        //  Ctrl left and Ctrl right is a shortcut for navigating tabs
        // so only navigating when the key is left/right
        if (!e.ctrlKey && e.keyCode === Utils_UI.KeyCode.LEFT) {
            let currTab = this._tabs.indexOf(this._activeTab);
            if (currTab > 0) {
                this.setActiveTab(this._tabs[currTab - 1]);
                e.preventDefault();
            }
        }
        if (!e.ctrlKey && e.keyCode === Utils_UI.KeyCode.RIGHT) {
            let currTab = this._tabs.indexOf(this._activeTab);
            if (currTab > -1 && currTab < this._tabs.length - 1) {
                this.setActiveTab(this._tabs[currTab + 1]);
                e.preventDefault();
            }
        }
    }

    private _updateToolbarItems(tabs: WorkItemFormTab[]): void {
        this._toolbar.updateItems(this.getResponsiveToolbarItems(tabs));
    }

    private _onToolbarItemClickCallback = (args?) => {
        if (args) {
            let item = args.get_commandSource()._item;
            let tab: WorkItemFormTab = <WorkItemFormTab>item.tab;
            tab._element.click();
        }
    }

    private _workItemFormResizedCallback = () => {
        this.resize();
    }
}

export class WorkItemFormTabEvents {
    public static WorkItemFormTabSelected = "wiTabSelected";
}

export interface IWorkItemFormTabOptions {
    pageIndex: number;

    formGrid: Grids.FormGrid;

    page: ILayoutPage;

    renderer: FormRenderer.FormRenderer;

    tabsControl: WorkItemFormTabsControl;

    /** Optional callback to calculate available width */
    getAvailableWidth?(): number;
}

export class WorkItemFormTab extends Controls.BaseControl {
    public formGrid: Grids.FormGrid;
    public page: ILayoutPage;
    public renderer: FormRenderer.FormRenderer;
    public tabLabel: JQuery;
    private _pageIndex: number;
    private _tabContentRenderer: () => void;
    private _isInitialized: boolean;
    private _tabsControl: WorkItemFormTabsControl;

    constructor(options: IWorkItemFormTabOptions) {
        super(options);
        this.tabLabel = $("<span />").addClass("page-button");
        this._pageIndex = options.pageIndex;
        this.formGrid = options.formGrid;
        this.page = options.page;
        this._tabsControl = options.tabsControl;

        this.renderer = options.renderer;
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({ coreCssClass: "work-item-form-tab", tagName: "li" }, options));
    }

    public getIconName(): string {
        switch (this.page.pageType) {
            case Models.PageType.history:
                return "bowtie-icon bowtie-navigate-history";
            case Models.PageType.links:
                return "bowtie-icon bowtie-link";
            case Models.PageType.attachments:
                return "bowtie-icon bowtie-attach";
        }
        return "";
    }

    public getCountingTabClass(): string {
        switch (this.page.pageType) {
            case Models.PageType.links:
                return "link-count";
            case Models.PageType.attachments:
                return "attachment-count";
        }
        return "";
    }

    public setIsValid(valid: boolean) {
        this._element.toggleClass("invalid", !valid);
        if (valid) {
            this.tabLabel.attr("aria-label", this.page.label);
        } else {
            this.tabLabel.attr("aria-label", Utils_String.format(WITResources.TabErrorAriaLabel, this.page.label));
        }
    }

    public initialize(): void {
        super.initialize();

        this._element.attr("tabindex", 0);

        let tabLabelId = Controls.getId();
        this._element.attr("role", "tab");

        this.tabLabel.appendTo(this._element);
        this.tabLabel.attr("id", tabLabelId);

        let countElemId = Controls.getId();
        let countElem = $("<span/>").addClass(this.getCountingTabClass()).appendTo(this._element).attr("id", countElemId);

        if (this.page.pageType !== Models.PageType.custom) {
            this.tabLabel.addClass("icon");
            this.tabLabel.addClass(this.getIconName());
            countElem.addClass("icon-tab");
            switch (this.page.label) {
                case WITResources.WorkItemLogControlHistoryHeader:
                case WITResources.WorkItemLogControlAttachmentsHeader:
                case WITResources.WorkItemLogControlLinksHeader:
                    RichContentTooltip.add(Utils_String.format(WITResources.TabHeaderTooltip, this.page.label), this._element);
                    break;
            }
            this._element.addClass("icon-tab").attr("aria-labelledby", `${tabLabelId} ${countElemId}`);
        }
        else {
            this.tabLabel.text(this.page.label);
            this._element.attr("aria-labelledby", tabLabelId);
        }


        if (!this.page.visible) {
            this.hide();
        }

        this._element.click(() => {
            this._tabsControl.setActiveTab(this);
        });
        Utils_UI.accessible(this._element);
    }

    public show() {
        if (this.page && this.page.visible === true) {
            this._element.show();
            this._element.css("display", "inline-block");
        }
    }

    public hide() {
        this._element.hide();
    }

    public width(): number {
        // Use element[0].getBoundingClientRect().width instead of outerWidth(true) to get exact number of width since outerWidth(true) will round the number to neariest integer.
        // This is to make the width calculation more accurate.
        return this._element[0].getBoundingClientRect().width;
    }

    public setSelected(selected: boolean) {
        this._setSelectedState(selected);

        if (selected === true) {
            this._initializeTab();
            this._element.focus();

            this.formGrid.show();
            this.formGrid.adjustGridSections();
            this.formGrid.getElement().find(".work-item-control").trigger(WorkItemFormTabEvents.WorkItemFormTabSelected);
            this.show();
        }
    }
    
    /* sets position of tab enables screen reader to read which tab is selected along with number*/
    public setTabPosition(pos: number, size: number){
        this._element.attr("aria-posinset", pos);
        this._element.attr("aria-setsize", size);
    }

    /**
     * Sets a callback which renders the contents of the page.  This is used to lazily initialize the tab contents.
     */
    public setTabContentRenderer(tabContentRenderer: () => void) {
        this._tabContentRenderer = tabContentRenderer;
    }

    public isBodyDrawn() {
        return $(".control", this.formGrid.getElement()).length > 0;
    }

    /**
     * Create content for the tab.
     */
    private _initializeTab() {
        if (!this._isInitialized) {

            this._isInitialized = true;

            // _tabContentRenderer is null for the first page because it doesn't get delay rendered.
            if (this._tabContentRenderer) {
                this._tabContentRenderer();
            }

            if (this.page.isContribution) {
                const callbacks = new ContributionLoadedCallbacks(this.page).getCallBacks(this.page);
                this.formGrid._element.append(createPageContribution(this.renderer.getContributionManager(), this.page, callbacks));
            }
        }
    }

    private _setSelectedState(selected: boolean): void {
        if (selected === true) {
            this._element.attr("aria-selected", "true");
            this._element.addClass("selected-tab");
            this._element.attr("tabindex", "0");
        }
        else {
            this._element.attr("aria-selected", "false");
            this._element.removeClass("selected-tab");
            this._element.removeAttr("tabindex");
        }
    }

    public dispose() {
        this._options = null;
        this.renderer = null;
        super.dispose();
    }
}



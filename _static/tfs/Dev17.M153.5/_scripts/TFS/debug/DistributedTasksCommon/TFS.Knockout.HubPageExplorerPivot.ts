import ko = require("knockout");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Controls = require("VSS/Controls");
import * as Navigation_NO_REQUIRE from "VSS/Controls/Navigation";
import { getHistoryService } from "VSS/Navigation/Services";
import { DisposalManager } from "VSS/Utils/Core";
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");


/**
 * Represents a tab in the UI
 */
export interface PivotTab {
    /**
     * The tab id
     */
    id: string;

    /**
     * The template name
     */
    templateName: string;

    /**
     * Indicates whether the tab is selected
     */
    isSelected: KnockoutObservable<boolean>;

    /**
     * Indicates whether the tab is visible
     */
    isVisible: KnockoutComputed<boolean>;

    /**
     * The tab text
     */
    text: KnockoutObservable<string>;

    /**
     * The tab title
     */
    title: KnockoutObservable<string>;

    /**
     * The position in which the tab is displayed from left to right.
     */
    order: number;

    /**
     * Called when the tab is clicked
     * Return false to prevent the default action from running.
     */
    onClick: () => boolean;

    /**
     * Dispose of subscriptions used by the tab
     */
    dispose(): void;
}


/**
 * Tab clicked event args
 */
export interface TabClickedEvent {
    /**
     * The tab name
     */
    tabName: string;
}


/**
 * Base class for pivot tabs
 */
export class PivotTabBase implements PivotTab {
    /**
     * The tab id
     */
    public id: string;

    /**
     * The template name
     */
    public templateName: string;

    /**
     * Indicates whether the tab is selected
     */
    public isSelected: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * The tab text
     */
    public text: KnockoutObservable<string> = ko.observable("");

    /**
     * The tab title
     */
    public title: KnockoutObservable<string> = ko.observable("");

    /**
     * Indicates whether the tab is visible (for PivotTab interface)
     */
    public isVisible: KnockoutComputed<boolean>;

    /**
     * Indicates whether the tab is visible
     */
    public visible: KnockoutObservable<boolean> = ko.observable(true);

    /**
     * The position in which the tab is displayed from left to right.
     */
    public order: number = 0;

    /**
     * Manager to add disposable
     */
    public disposableManager = new DisposalManager();

    /**
     * Called when the tab is clicked
     * Return false to prevent the default action from running.
     */
    public onClick: () => boolean;

    constructor(options?: any) {
        options = $.extend(options || {}, {
            // default isVisible implementation
            isVisible: ko.computed({
                read: () => {
                    return this.visible();
                }
            }),

            // default onClick implementation
            onClick: () => {
                return true;
            }
        });

        this.isVisible = options.isVisible;
        this.onClick = options.onClick;
    }

    public dispose() {
        this.disposableManager.dispose();
    }
}


/**
 * Basic pivot tab
 */
export class BasicPivotTab extends PivotTabBase {

    constructor(id: string, text: string, templateName: string, order?: number) {
        super();

        this.id = id;
        this.templateName = templateName;
        this.title(text);
        this.text(text);
        this.order = order || 0;
    }
}


/**
 * Describes a pivot control for the main tab strip
 */
export interface HubPageExplorerPivot {
    /**
     * The hub title content
     */
    hubTitleContent: KnockoutObservable<string>;

    /**
     * The tabs
     */
    tabs: KnockoutObservableArray<PivotTab>;

    /**
     * The selected tab
     */
    selectedTab: KnockoutComputed<string>;
}


/**
 * Base class for the main tab strip
 */
export class HubPageExplorerPivotBase implements HubPageExplorerPivot {
    public _options: any;

    /**
     * The hub title content
     */
    public hubTitleContent: KnockoutObservable<string> = ko.observable("");

    /**
     * List of tabs
     */
    public tabs: KnockoutObservableArray<PivotTab> = ko.observableArray<PivotTab>([]);

    public _onTabClick: (tab: PivotTab) => void;

    /**
     * An observable whose value changes when a tab is clicked
     */
    public tabClicked: KnockoutObservable<TabClickedEvent> = ko.observable(null);

    private _selectedTab: KnockoutObservable<string> = ko.observable("");

    /**
     * Indicates whether the tab strip should be displayed
     */
    public showTabs: KnockoutComputed<boolean>;

    /**
     * Indicates whether the whole content should be displayed
     */
    public showContent: KnockoutObservable<boolean> = ko.observable(true);


    public static PIVOT_HOLDER_CLASS = ".tfs_knockout_hubpageexplorerpivot_holder";

    private _pivotView: Navigation_NO_REQUIRE.PivotView;

    constructor(options?: any) {
        this._options = options || {};

        // select a tab via ko binding
        this._onTabClick = (tab: PivotTab) => {
            var selectTab: boolean = true;
            if ($.isFunction(tab.onClick)) {
                selectTab = tab.onClick();
            }

            if (selectTab) {
                var tabName: string = !!tab ? tab.id : "";

                this.selectedTab(tabName);
            }
        };

        // only show tabs if there are more than one
        this.showTabs = ko.computed({
            read: () => {
                var visibleCount: number = 0;

                $.each(this.tabs(), (index: number, tab: PivotTab) => {
                    if (tab.isVisible()) {
                        visibleCount++;
                    }
                });

                return visibleCount > 1;
            }
        });
    }

    /**
     * Dispose
     */
    public dispose() {
        if (this._pivotView) {
            this._pivotView._unbind("changed", this._onPivotTabChanged);
            this._pivotView.dispose();
            this._pivotView = null;
        }
    }

    /**
     * The selected tab
     */
    public selectedTab: KnockoutComputed<string> = ko.computed({
        read: () => {
            return this._selectedTab();
        },
        write: (value: string) => {
            this._selectedTab(value);

            $.each(this.tabs(), (index: number, tab: PivotTab) => {
                tab.isSelected(tab.id === value);
            });

            this.tabClicked({ tabName: value });
        }
    });

    /**
     * Gets the link for the current tab
     */
    public getLink(tab: PivotTab) {
        let currentState = getHistoryService().getCurrentState();
        if (currentState) {
            return getHistoryService().getFragmentActionLink(tab.id, currentState);
        }

        return "";
    }

    /**
     * Creates pivot view strip using platform control, uses well-known className PIVOT_HOLDER_CLASS ("tfs_knockout_hubpageexplorerpivot_holder") to render tab strip into
     */
    public renderPivotView(element: JQuery) {
        VSS.using(["VSS/Controls/Navigation"], (_Navigation: typeof Navigation_NO_REQUIRE) => {
            let tabs = this.tabs.peek();
            tabs = tabs.filter((tab) => {
                return tab && tab.isVisible();
            });

            let pivotItems: Navigation_NO_REQUIRE.IPivotViewItem[] = tabs.map((tab) => {
                return {
                    id: tab.id,
                    text: tab.text.peek(),
                    value: tab,
                    selected: tab.isSelected.peek()
                } as Navigation_NO_REQUIRE.IPivotViewItem;
            });

            if (!this._pivotView) {
                this._pivotView = <Navigation_NO_REQUIRE.PivotView>Controls.BaseControl.create(_Navigation.PivotView, element.find(HubPageExplorerPivotBase.PIVOT_HOLDER_CLASS), {
                    items: pivotItems
                });

                this._pivotView._bind("changed", this._onPivotTabChanged);
            }
            else {
                this._pivotView._options.items = pivotItems;
                this._pivotView.updateItems(true);
            }
        });
    }

    private _onPivotTabChanged = (event, item: Navigation_NO_REQUIRE.IPivotViewItem) => {
        this._onTabClick(item.value);
    }
}

// Represents the view model for the content that is rendered in tab.
export class TabContentViewModel extends Adapters_Knockout.TemplateViewModel {

    public onTabSelected: KnockoutObservable<boolean> = ko.observable(false);
}

export class BaseTabViewModel extends HubPageExplorerPivotBase {

    constructor(options?: any) {
        super(options);

        // select a tab via ko binding
        this._onTabClick = (tab: PivotTab) => {
            var tabId: string = !!tab ? tab.id : "";
            this.selectedTab(tabId);
            this._onSelectedTabChanged(tabId);
        };
    }

    protected _onSelectedTabChanged(tabId: string) {
    }

    public refresh() {
    }
}

export class BasePivotTab extends BasicPivotTab {

    public dirty: KnockoutComputed<boolean>;

    public invalid: KnockoutComputed<boolean>;

    constructor(id: string, text: string, templateName: string, order?: number) {
        super(id, text, templateName, order);

        this.dirty = ko.computed({
            read: () => {
                return false;
            }
        });

        this.invalid = ko.computed({
            read: () => {
                return false;
            }
        });
    }

    public dispose() {
        super.dispose();
        this.dirty.dispose();
        this.invalid.dispose();
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Knockout.HubPageExplorerPivot", exports);
import TFS_FilteredListControl = require("Presentation/Scripts/TFS/FeatureRef/FilteredListControl");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import DataCollector_HostControl = require("TestManagement/Scripts/Tfs.TestManagement.DataCollectorHostControl");
import Utils_Core = require("VSS/Utils/Core");
import Controls = require("VSS/Controls");
import Utils_UI = require("VSS/Utils/UI");

let domElem = Utils_UI.domElem;

export class WindowListControl extends TFS_FilteredListControl.FilteredListControl {
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            useBowtieStyle: true
        }, options));
    }

    public initialize() {
        super.initialize();
        this._element.addClass("window-selector-control");
        if (this._options.initialWindows) {
            this._setItemsForTabId("", this._options.initialWindows);
        }
    }

    //Overriding the base implementation of FilteredListControl Options
    public _beginGetListItems(tabId: string, callback: (items: any[]) => void) {

        if (this._options.getWindows) {
            this._options.getWindows.call(this, callback);
        }

    }

    public _getItemName(item: any): string {
        return item ? item.title : "";
    }

    public _getItemTooltip(item: any, defaultTooltip?: string): string {
        return item ? this._getItemName(item) : defaultTooltip;
    }

    public _getNoItemsText(tabId: string) {
        //TODO: Get it UE review
        return Resources.NoScreenShotWindowFound;
    }
}

export class WindowSelectorControl extends DataCollector_HostControl.DataCollectorHostControl {

    private _filteredList: WindowListControl;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
          coreCssClass: "window-selector",
          popupOptions: { cssClass: "filtered-list-popup" }
        }, options));
    }

    public initialize() {
        super.initialize();

        this._popupEnhancement._element.bind("popup-opened", () => {
            this._filteredList.setFocus();
        });

        this._popupEnhancement._element.bind("popup-closed", () => {
            this._filteredList.clearInput();
        });
    }

    /**
     * gets the content of window
     */
    public getContent(): JQuery {
        let $container = $(domElem("div"));
        let $guidanceContainer = $(domElem("div"));
        let $guidanceIcon = $(domElem("div"));
        let $guidanceText = $(domElem("div"));
        $guidanceIcon.addClass("bowtie-icon bowtie-status-info");
        $guidanceText.addClass("window-guidance-text");

        //Change the o
        if (this._options.windowSelectionGuidanceText) {
            $guidanceText.text(this._options.windowSelectionGuidanceText);
        }
        $guidanceContainer.addClass("window-guidance");
        $guidanceContainer.append($guidanceIcon);
        $guidanceContainer.append($guidanceText);
        let $filterListContainer = $(domElem("div"));
        this._filteredList = this._createFilteredList($filterListContainer);

        $container.bind("selected-item-changed", Utils_Core.delegate(this, this.onItemSelected));
        $container.bind("escape-key-pressed", () => {
            this.hidePopup();
            Utils_UI.tryFocus(this._element);
        });

        $filterListContainer.append($guidanceContainer);
        $container.append($filterListContainer);


        return $container;
    }

    /**
     * handles key board events
     */
    public handleKeyBoardEvents(): void {
        // Make this element focusable to listen for keyboard events
        this._element
            .attr("tabIndex", "0")
            .bind("keydown", (e) => {

                switch (e.keyCode) {
                    case Utils_UI.KeyCode.DOWN:
                        this.showPopup(true);
                        return false;
                    case Utils_UI.KeyCode.UP:
                    case Utils_UI.KeyCode.ESCAPE:
                        this.hidePopup();
                        return false;
                    case Utils_UI.KeyCode.ENTER:
                    case Utils_UI.KeyCode.SPACE:
                        this.showPopup(true);
                        return false;
                }
            });
    }

    /**
     * shows the popup
     * @param clearCache
     */
    public showPopup(clearCache?: boolean) {
        if (clearCache && this._filteredList) {
            this._filteredList.updateFilteredList("", clearCache);
        }
        super.showPopup();
    }

    private _createFilteredList($container: JQuery): WindowListControl {
        return <WindowListControl>Controls.BaseControl.createIn(WindowListControl, $container, <TFS_FilteredListControl.FilteredListControlOptions>{
            hideSearchBox: true,
            useBowtieStyle: true,
            getWindows: this._options.getWindows,
            initialWindows: this._options.initialWindows,
            container: this
        });
    }

    private onItemSelected(e?: any, args?: any) {
        this.hidePopup();
        if ($.isFunction(this._options.onItemChanged)) {
            let items = this._filteredList._getCurrentItemsForTabId("");
            let itemCount: number = 0;
            if (items && items.length) {
                itemCount = items.length;
            }
            this._options.onItemChanged.call(this, args.selectedItem, itemCount);
        }
    }
}

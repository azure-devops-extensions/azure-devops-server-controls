import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

export class ListControl extends Controls.BaseControl {
    protected _selectedItem: any;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "list-control"
        }, options));
    }

    public initialize() {

        var $pivotViews: JQuery;

        super.initialize();

        this._selectedItem = this._selectedItem || this._options.selectedItem || null;
    }

    /**
     * Select the next item by delta from current one, and return the newly selected JQuery item.
     * Update styles and aria attributes, and set the focus only if the current item has focus.
     */
    protected selectNextItem($list: JQuery, delta: number): JQuery {
        var $allItems: JQuery,
            selectedIndex: number,
            scrollToPosition: Utils_UI.Positioning.VerticalScrollBehavior,
            $oldSelection: JQuery,
            $newSelection: JQuery;

        $allItems = $list.children(".filtered-list-item");
        selectedIndex = $allItems.index($allItems.filter(".new-selection"));
        $oldSelection = $allItems.eq(selectedIndex);
        $oldSelection.removeClass("new-selection").attr("tabindex", "-1");

        if (delta < 0) {
            selectedIndex = Math.max(selectedIndex + delta, 0);
            scrollToPosition = Utils_UI.Positioning.VerticalScrollBehavior.Bottom;
        }
        else {
            selectedIndex = Math.min(selectedIndex + delta, $allItems.length - 1);
            scrollToPosition = Utils_UI.Positioning.VerticalScrollBehavior.Top;
        }

        $newSelection = $allItems.eq(selectedIndex);
        $newSelection.addClass("new-selection").attr("tabindex", "0");
        if ($oldSelection.is(":focus")) {
            $newSelection.focus();
        }
        Utils_UI.Positioning.scrollIntoViewVertical($newSelection, scrollToPosition);
        return $newSelection;
    }
}

VSS.classExtend(ListControl, TFS_Host_TfsContext.TfsContext.ControlExtensions);

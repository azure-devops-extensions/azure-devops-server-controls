import Diag = require("VSS/Diag");
import Menus = require("VSS/Controls/Menus");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");

export class EllipsisMenuBar extends Menus.MenuBarO<any> {
    /**
     * The ellipsis options control that would be used on pinned items on home page
     */
    constructor(options?) {

        Diag.Debug.assertIsArray(options.subItems);

        options.items = [{
            id: "options",
            title: options.title || PresentationResources.EllipsisMenuTitle,
            idIsAction: false,
            icon: options.iconType,
            hideDrop: true,
            showText: false,
            childItems: options.subItems
        }];

        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssCoreClass: "ellipsis-menubar"
        }, options));
    }

    public initialize() {
        super.initialize();
    }

    public updateItems(items: any) {
        var submenu: Menus.Menu<any> = this._getSubMenu();
        submenu.updateItems(items);
    }

    public updateCommandStates(states: Menus.ICommand[]) {
        var submenu: Menus.Menu<any> = this._getSubMenu();
        submenu.updateCommandStates(states);
    }

    private _getSubMenu(): Menus.Menu<any> {
        return this.getItems()[0].getSubMenu();
    }
}
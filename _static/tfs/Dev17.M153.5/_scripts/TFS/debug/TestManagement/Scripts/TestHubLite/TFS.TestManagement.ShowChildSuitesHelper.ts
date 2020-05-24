import Menus = require("VSS/Controls/Menus");

import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");

export class ShowChildSuitesHelper {

    private static _instance: ShowChildSuitesHelper;
    private _showChildSuites: boolean = false;
    private _toolbar: Menus.MenuBar;

    constructor(suitesToolbar: Menus.MenuBar) {
        if (!ShowChildSuitesHelper._instance) {
            this._toolbar = suitesToolbar;
            ShowChildSuitesHelper._instance = this;
        }
        return ShowChildSuitesHelper._instance;
    }

    public static getInstance() {
        return ShowChildSuitesHelper._instance;
    }

    public isShowChildSuitesEnabled() {
        return this._showChildSuites;
    }

    public toogleShowChildSuites(): boolean {
        this._showChildSuites = !this._showChildSuites;
        this._updateShowChildSuitesToolbarOption();

        return this._showChildSuites;
    }

    public clearShowChildSuites() {
        this._showChildSuites = false;
        this._updateShowChildSuitesToolbarOption();
    }

    /**
     * Disable the show child suites toolbar icon.
     */
    public disableShowChildSuites(disable: boolean) {
        this._toolbar.updateCommandStates(
            <Menus.ICommand[]>[
                {
                    id: TCMLite.TestPlanAndSuitesCommandIds.showTestsFromChildSuites,
                    disabled: disable,
                    toggled: this._showChildSuites
                }]);
    }

    private _updateShowChildSuitesToolbarOption() {
        this._toolbar.updateCommandStates(
            <Menus.ICommand[]>[
                {
                    id: TCMLite.TestPlanAndSuitesCommandIds.showTestsFromChildSuites,
                    toggled: this._showChildSuites
                }]);
    }
}
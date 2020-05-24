import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import TestLiteView = require("TFS.TestManagement.TestLiteView");

import TCMKeyboardShortcuts_LAZY_LOAD = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestHubLiteShortcuts");
import TfsCommon_Shortcuts_LAZY_LOAD = require("TfsCommon/Scripts/KeyboardShortcuts");
import TMShortcutsControls_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.TestHubShortcutsControls");
import TCMControlsCharts_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.Controls.Charts");

import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");

let delegate = Utils_Core.delegate;

export class KeyboardShortcutHelper {

    private static _instance;

    public constructor(element: JQuery, view: TestLiteView.TestHubView) {
        if (!KeyboardShortcutHelper._instance) {
            this._element = element;
            this._view = view;

            KeyboardShortcutHelper._instance = this;
        }
        return KeyboardShortcutHelper._instance;
    }

    public static getInstance() {
        return KeyboardShortcutHelper._instance;
    }

    public reRegisterShortcutGroup(groupName: string, isInitialization?: boolean) {
        if (!this._testhubCommonShortcutGroup && !isInitialization) {
            return;
        }

        this._currentView = groupName;
        if (this._testShortcutGroup) {
            this._testShortcutGroup.removeShortcutGroup();
        }

        VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestHubLiteShortcuts", "TestManagement/Scripts/TFS.TestManagement.Controls.Charts", "TestManagement/Scripts/TFS.TestManagement.TestHubShortcutsControls"],
            (ShortCutsModule: typeof TCMKeyboardShortcuts_LAZY_LOAD, Module: typeof TCMControlsCharts_LAZY_LOAD, CommonShortcuts: typeof TMShortcutsControls_LAZY_LOAD) => {
                if (isInitialization) {
                    this._testhubCommonShortcutGroup = new CommonShortcuts.TestHubCommonShortcutGroup(delegate(this, this._view.allowKeyboardShortcuts));
                }
                this._testShortcutGroup = new ShortCutsModule.TestShortcutGroup(this._view, this._currentView);
                if (groupName === TCMLite.KeyboardShortcutGroups.listGroupName) {
                    this._listViewShortcutGroup = new ShortCutsModule.ListViewShortcutGroup(this._view);
                }
                else if (groupName === TCMLite.KeyboardShortcutGroups.gridGroupName) {
                    this._gridViewShortcutGroup = new ShortCutsModule.GridViewShortcutGroup(this._view);
                } else if (groupName === TCMLite.KeyboardShortcutGroups.chartsGroupName) {
                    if (this._view._testManagementChartsView) {
                        this._view._testManagementChartsView.chartsShortcutGroup = new Module.TestChartsShortcutGroup(this._view._testManagementChartsView);
                    }
                }
                if (isInitialization) {
                    this.bindFocusOut();
                }
            });
    }

    public disableListViewShortcuts() {
        this._listViewShortcutGroup.removeShortcutGroup();
    }
    
    private bindFocusOut() {
        //Remove/Add keyboard shortcut when focus changes from grid
        let $element = this._element.find(".test-edit-grid-area");
        $element.bind("focusout", delegate(this, this._enableGlobalShortcuts));
        $element.bind("focusin", delegate(this, this._disableGlobalShortcuts));
    }

    private _enableGlobalShortcuts() {
        if (!this._testShortcutGroup) {
            return;
        }

        VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestHubLiteShortcuts", "TfsCommon/Scripts/KeyboardShortcuts", "TestManagement/Scripts/TFS.TestManagement.TestHubShortcutsControls"],
            (ShortCutsModule: typeof TCMKeyboardShortcuts_LAZY_LOAD, Module: typeof TfsCommon_Shortcuts_LAZY_LOAD, CommonShortcuts: typeof TMShortcutsControls_LAZY_LOAD) => {
                //Remove the Test shortcutgroup and navigation shortucts
                this._testShortcutGroup.removeShortcutGroup();
                this._testhubCommonShortcutGroup.removeShortcutGroup();
                //Reinitilalize the grid view shortcuts
                new TfsCommon_Shortcuts_LAZY_LOAD.GlobalShortcutGroup();
                this._testhubCommonShortcutGroup = new CommonShortcuts.TestHubCommonShortcutGroup(delegate(this, this._view.allowKeyboardShortcuts));
                this._testShortcutGroup = new ShortCutsModule.TestShortcutGroup(this._view, this._currentView);
                this._gridViewShortcutGroup = new ShortCutsModule.GridViewShortcutGroup(this._view);
            });
    }

    private _disableGlobalShortcuts() {
        if (!this._testShortcutGroup) {
            return;
        }

        this._testShortcutGroup.removeShortcutGroup();
        this._testhubCommonShortcutGroup.removeShortcutGroup();
        this._testShortcutGroup.removeGlobalShortcut();
    }

    private _testShortcutGroup: any;
    private _testhubCommonShortcutGroup: any;
    private _listViewShortcutGroup: any;
    private _gridViewShortcutGroup: any;
    private _element: JQuery;
    private _currentView: string = "list";
    private _view: any;
}
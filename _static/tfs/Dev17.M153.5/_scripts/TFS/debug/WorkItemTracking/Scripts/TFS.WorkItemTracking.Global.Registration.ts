/// <reference types="jquery" />

import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Controls = require("VSS/Controls");
import Service = require("VSS/Service");
import VSS = require("VSS/VSS");
import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Menus = require("VSS/Controls/Menus");
import Q = require("q");
import HostUI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import Telemetry = require("VSS/Telemetry/Services");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_ArtifactsPlugins = require("Presentation/Scripts/TFS/TFS.ArtifactPlugins");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import { ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import WITDialogShim = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");

// Modules for compilation/type support only (no direct require statement)
import TFS_WorkItemTracking_Artifacts_Plugin_NO_REQUIRE = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Artifacts.Plugin");

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;

class WorkItemSearchCommon {
    public static getWatermarkText(): string {
        return VSS_Resources_Platform.SearchWorkItems;
    }

    public static performSearch(searchText: string, options: any) {
        var context: TFS_Host_TfsContext.TfsContext,
            matchInteger: string[],
            workItemId: number;

        if (searchText) {
            context = options.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
            matchInteger = searchText.match(/^\s*#?(\d{1,9})\s*$/);
            workItemId = matchInteger ? parseInt(matchInteger[1], 10) : 0;

            if (workItemId > 0) {
                WITDialogShim.showWorkItemById(workItemId);
            }
            else {
                if (context.navigation.project) {
                    const routeData = { area: "", searchText: searchText };
                    window.location.href = context.getPublicActionUrl(ActionUrl.ACTION_QUERY, "queries", routeData);
                }
                else {
                    $("#select-project").addClass("validation-summary-errors");
                }
            }
        }
    }

    public static getShortcutsAndSearchHistory(callback): void {
        var menuItems = [];

        VSS.using(["WorkItemTracking/Scripts/Resources/VSS.Resources.WorkItemTracking.Common"], (_TFS_Resources_WorkItemTracking_Common: any) => {
            menuItems.push({ text: VSS_Resources_Platform.AddASearchFilter, separator: true, noIcon: true });
            menuItems.push({ id: "search-shortcut", text: VSS_Resources_Platform.AddSearchFilterAssignedTo, "arguments": { search: "a", defaultValue: "@" + _TFS_Resources_WorkItemTracking_Common.WiqlOperators_MacroMe }, cssClass: "search-shortcut", icon: "icon-filter" });
            menuItems.push({ id: "search-shortcut", text: VSS_Resources_Platform.AddSearchFilterCreatedBy, "arguments": { search: "c", defaultValue: "@" + _TFS_Resources_WorkItemTracking_Common.WiqlOperators_MacroMe }, cssClass: "search-shortcut", icon: "icon-filter" });
            menuItems.push({ id: "search-shortcut", text: VSS_Resources_Platform.AddSearchFilterState, "arguments": { search: "s" }, cssClass: "search-shortcut", icon: "icon-filter" });
            menuItems.push({ id: "search-shortcut", text: VSS_Resources_Platform.AddSearchFilterType, "arguments": { search: "t" }, cssClass: "search-shortcut", icon: "icon-filter" });

            Service.VssConnection.getConnection(Context.getDefaultWebContext(), Contracts_Platform.ContextHostType.ProjectCollection).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService).beginReadSetting("/Recent/WorkItemsSearch", TFS_WebSettingsService.WebSettingsScope.User, (setting) => {
                var recentSearches = [];
                if (setting.value) {
                    $.each(setting.value.split(";"), (i, search) => {
                        recentSearches.push({ id: "search-menu-item", text: search, "arguments": { search: search }, noIcon: true });
                    });
                }
                callback(recentSearches.concat(menuItems));
            },
                (error) => {
                    // Ignore errors reading recent searches
                    callback(menuItems);
                });
        });
    }
}

export class WorkItemsSearchAdapter extends HostUI.SearchAdapter {

    public hasDropdown(): boolean {
        return true;
    }

    public getWatermarkText(): string {
        return WorkItemSearchCommon.getWatermarkText();
    }

    public getDropdownMenuItems(contextInfo, callback, errorCallback) {
        WorkItemSearchCommon.getShortcutsAndSearchHistory((menuItems) => {
            callback(menuItems);
        });
    }

    public performSearch(searchText: string, openInNewTab?: boolean) {
        WorkItemSearchCommon.performSearch(searchText, this._options);
    }
}

Controls.Enhancement.registerEnhancement(WorkItemsSearchAdapter, ".search-adapter-work-items");

/**
* Implements a callback for work item search initated from L0 search box
*/
export class GlobalWorkItemsSearchAdapter extends HostUI.MultiEntitySearchAdapter {

    private _input: JQuery;
    private _triggerSearchContext: any;
    private _helpPopup: Menus.PopupMenu;

    public hasDropdown(): boolean {
        return (TFS_Host_TfsContext.TfsContext.getDefault().navigation.serviceHost.hostType !== TFS_Host_TfsContext.NavigationContextLevels.Application);
    }

    public getWatermarkText(isContextualNavigationEnabled: boolean, isCollectionContext: boolean): string {
        return WorkItemSearchCommon.getWatermarkText();
    }

    public getEntityId(): string {
        return "Work items";
    }

    public getHelpDropdownMenu(inputControl: JQuery, parent: JQuery, triggerSearchContext: any, successCallback: any): void {
        this._input = inputControl;
        this._triggerSearchContext = triggerSearchContext;

        this._getHelpDropdownMenuItems().then((menuItems) => {
            this._helpPopup = <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, parent, {
                align: "left-bottom",
                items: [{ childItems: menuItems }],
                executeAction: delegate(this, this._onHelpDropdownMenuItemClick),
                setFocus: false,
            });

            successCallback(this._helpPopup);
        });
    }

    public performSearch(searchText: string, openInNewTab?: boolean) {
        // Log work item search text
        var logTrace: any = Telemetry.TelemetryEventData.fromProperty("WIT", "GlobalSearch", "SearchText", searchText);
        Telemetry.publishEvent(logTrace);

        WorkItemSearchCommon.performSearch(searchText, this._options);
    }

    private _getHelpDropdownMenuItems(): Q.Promise<any[]> {
        var deferred: Q.Deferred<any[]> = Q.defer<any[]>();

        WorkItemSearchCommon.getShortcutsAndSearchHistory((menuItems) => {
            deferred.resolve(menuItems);
        });

        return deferred.promise;
    }

    private _onHelpDropdownMenuItemClick(e?): void {
        // ToDo: remove this, it is a hack to enable dropdown scenario
        // where the focus should remain on search text box if the popup is visible.
        this._helpPopup._active = false;
        if (e.get_commandName() === "search-shortcut") {
            // Search shortcuts are added to the textbox
            this._appendShortcut(e.get_commandArgument());

        }
        else {
            // MRU search terms replace the text in the texbox and triggers search
            this._input.val(e.get_commandArgument().search);
            this._triggerSearchContext.doSearch();
        }
    }

    private _appendShortcut(shortcut: any) {
        /// <summary>Appends the shortcut to the search textbox by making the default value selected</summary>
        /// <param name="shortcut" type="Object">Shortcut item to append</param>

        var value,
            defaultValueEnd,
            defaultValueStart;

        value = this._input.val();
        value += value.length > 0 ? " " : "";       // adding a space before shortcut
        value += shortcut.search || "";             // adding shortcut (a, c, s or t)
        value += shortcut.operator || ":";          // adding operator
        value += "\"";                              // starting double quote
        defaultValueStart = value.length;
        value += shortcut.defaultValue || "";       // adding default value
        defaultValueEnd = value.length;
        value += "\"";                              // closing the double quote

        this._input.val(value);

        // Making the default value selected
        this._selectDefaultValue(defaultValueStart, defaultValueEnd);
    }

    private _selectDefaultValue(start: number, end: number) {
        /// <summary>Makes the specified range for the search textbox selected</summary>
        /// <param name="start" type="Integer">Start index</param>
        /// <param name="end" type="Integer">End index</param>
        var range,
            inp = <any>this._input[0];

        if (inp.setSelectionRange) {
            inp.setSelectionRange(start, end);
        }
        else if (inp.createTextRange) { // Necessary for IE8
            range = inp.createTextRange();
            range.move("character", start);
            range.moveEnd("character", end - start);
            range.select();
        }
    }

}

//Registering the plugin for rendering work items
TFS_ArtifactsPlugins.registerArtifactPluginAsync("workitemtracking", (callback: Function) => {
    VSS.using(['WorkItemTracking/Scripts/TFS.WorkItemTracking.Artifacts.Plugin'], (_TFS_WorkItemTracking: typeof TFS_WorkItemTracking_Artifacts_Plugin_NO_REQUIRE) => {
        callback(_TFS_WorkItemTracking.WorkItemArtifactPlugin);
    });
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.WorkItemTracking.Global.Registration", exports);

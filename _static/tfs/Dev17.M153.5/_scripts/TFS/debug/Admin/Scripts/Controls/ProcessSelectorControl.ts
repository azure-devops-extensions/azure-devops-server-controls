import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");

import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_FilteredListControl = require("Presentation/Scripts/TFS/FeatureRef/FilteredListControl");
import Menus = require("VSS/Controls/Menus");

import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import AdminProcessCommon = require("Admin/Scripts/TFS.Admin.Process.Common");

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;
import getErrorMessage = VSS.getErrorMessage;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export interface ProcessSelectorControlOptions extends TFS_FilteredListControl.FilteredListControlOptions {
    initialProcesses?: AdminProcessCommon.ProcessDescriptorViewModel[],
}

export class ProcessSelectorControl extends TFS_FilteredListControl.FilteredListControl {
    public initialize() {
        this._element.addClass("process-selector-control").addClass("process-selector");

        super.initialize();

        if (this._options.initialProcesses) {
            this._setItemsForTabId("", this._options.initialProcesses);
        }

        this._element.addClass("has-actions");
        this._createActionItems($(domElem("div", "process-selector-actions")).addClass("toolbar").appendTo(this._element));
    }

    private _createActionItems($container: JQuery) {
        var toolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $container, {
            cssClass: "process-selector-actions-menu",
            items: [
                <Menus.IMenuItemSpec> {
                    id: "process-overview",
                    text: AdminResources.Process,
                    title: AdminResources.Process,
                    icon: "icon-prev",
                    action: () => {
                        this._onProcessView();
                    }
                }
            ]
         });
    }

    //Navigate to Process Grid view that lists all the processes
    private _onProcessView() {
        this._fire("action-item-clicked");
        var processUrl = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl(null, 'process', {
            area: "admin",
            project: ""
        });
        window.location.href = processUrl;
    }

    public _getWaterMarkText(tabId: string) {
        return AdminResources.ProcessFilterWatermarkText;
    }

    public _getNoItemsText(tabId: string) {
        return AdminResources.ProcessSelectorNoProcessesInCollection;
    }

    public _getNoMatchesText(tabId: string) {
        return AdminResources.ProcessSelectorNoMatchingProcesses;
    }

    public _getItemName(item: any) {
        var name = item.name,
            processCount = 0;

        $.each(this._getCurrentItemsForTabId("") || [], (i: number, process: AdminProcessCommon.ProcessDescriptorViewModel) => {
            if (process.name === name) {
                processCount++;
            }
        });
        if (processCount > 1) {
            name += " (" + item.name + ")";
        }

        return name;
    }
    
    protected _getItemIconClass(item: AdminProcessCommon.ProcessDescriptorViewModel): string {
        if (item.isSystem) {
            return "process-system";
        } else if (item.isInherited) {
            return "process-inherited";
        } else {
            return "process-custom";
        }
    }
}
VSS.classExtend(ProcessSelectorControl, TfsContext.ControlExtensions);

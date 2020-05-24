import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");

import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_FilteredListControl = require("Presentation/Scripts/TFS/FeatureRef/FilteredListControl");
import TFS_FilteredListDropdownMenu = require("Presentation/Scripts/TFS/FeatureRef/FilteredListDropdownMenu");

import AdminProcessCommon = require("Admin/Scripts/TFS.Admin.Process.Common");
import AdminProcessSelectorControl = require("Admin/Scripts/Controls/ProcessSelectorControl");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;
import getErrorMessage = VSS.getErrorMessage;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export interface ProcessSelectorMenuOptions {
    tfsContext?: TfsContext,
    initialProcesses?: AdminProcessCommon.ProcessDescriptorViewModel[]
}
export class ProcessSelectorMenu extends TFS_FilteredListDropdownMenu.FilteredListDropdownMenu {
    private _processList: AdminProcessCommon.ProcessDescriptorViewModel[];

    public initializeOptions(options?: any) {
        this._processList = options.initialProcesses;

        super.initializeOptions($.extend({
            popupOptions: {
                elementAlign: "left-top",
                baseAlign: "left-bottom",
            }
        }, options));
    }

    public initialize() {
        super.initialize();
        this._element.addClass("process-selector-menu");
        this._getPopupEnhancement()._bind("action-item-clicked", () => {
            this._hidePopup();
        });
    }

    public _createFilteredList($container: JQuery): TFS_FilteredListControl.FilteredListControl {
        return <AdminProcessSelectorControl.ProcessSelectorControl>Controls.Enhancement.enhance
            (AdminProcessSelectorControl.ProcessSelectorControl, $container, <AdminProcessSelectorControl.ProcessSelectorControlOptions>{
                showItemIcons: true,
                initialProcesses: this._processList,
            });
    }

    public _getItemIconClass(item: AdminProcessCommon.ProcessDescriptorViewModel): string {
        if (item) {
            if (item.isSystem) {
                return "process-system";
            } else if (item.isInherited) {
                return "process-inherited";
            }
        }

        return "process-custom";
    }

    public _getItemDisplayText(item: AdminProcessCommon.ProcessDescriptorViewModel): string {
        if (item) {
            return item.name;
        }
        else {
            return AdminResources.SelectProcessContext;
        }
    }

    public _getItemTooltip(item: AdminProcessCommon.ProcessDescriptorViewModel): string {
        return this._getItemDisplayText(item);
    }

    public getSelectedProcess(): AdminProcessCommon.ProcessDescriptorViewModel {
        return <AdminProcessCommon.ProcessDescriptorViewModel>this._getSelectedItem();
    }

    public setSelectedProcess(process: AdminProcessCommon.ProcessDescriptorViewModel) {
        this.setSelectedItem(process);
    }
}
VSS.classExtend(ProcessSelectorMenu, TfsContext.ControlExtensions);

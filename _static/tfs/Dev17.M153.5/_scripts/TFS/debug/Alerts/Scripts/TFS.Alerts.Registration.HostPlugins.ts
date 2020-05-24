/// <reference types="jquery" />



import Menus = require("VSS/Controls/Menus");
import VSS = require("VSS/VSS");

// Modules for compilation/type support only (no direct require statement)
import TFS_Alerts_Controls_NO_REQUIRE = require("Alerts/Scripts/TFS.Alerts.Controls");

Menus.menuManager.attachExecuteCommand(function (sender, args) {

    switch (args.get_commandName()) {
        case "manageAlerts":
            VSS.using(['Alerts/Scripts/TFS.Alerts.Controls'], (_TFS_Alerts_Controls: typeof TFS_Alerts_Controls_NO_REQUIRE) => {
                _TFS_Alerts_Controls.AlertDialogs.manageAlerts();
            });
            return false;
    }
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Alerts.Registration.HostPlugins", exports);

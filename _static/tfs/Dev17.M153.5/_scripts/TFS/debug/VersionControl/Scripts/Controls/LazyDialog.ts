import Q = require("q");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import Performance = require("VSS/Performance");

import _Dialogs = require("VSS/Controls/Dialogs");
import VCUsingWithStatusIndicator = require("VersionControl/Scripts/UsingWithStatusIndicator");

// Would be nice to support the following... need TS 1.8 first though
//    export function show<TOptions, TDialog extends _Dialogs.ModalDialogO<TOptions>>(
export function show<TDialog extends _Dialogs.Dialog>(
    scriptInclude,
    scriptToDialog: (scriptType: any) => { new (): TDialog; },
    dialogOptions: any
) {
    const performance = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.SHOW_LAZY_DIALOG);
    performance.addData({dialogScript: scriptInclude});

    return Q.Promise<TDialog>((resolve, reject) => {
        const imports = [scriptInclude, "VSS/Controls/Dialogs"];

        performance.addSplitTiming("beforeShowStatusIndicator");

        VCUsingWithStatusIndicator.using(imports, (scriptType: TDialog, Dialogs: typeof _Dialogs) => {
            performance.addSplitTiming("afterScriptImported");

            const dialogClass = scriptToDialog(scriptType);
            const dialog = Dialogs.show(dialogClass, dialogOptions);

            performance.addSplitTiming("afterDialogShown");

            resolve(dialog);

            performance.end();
        });
    });
}
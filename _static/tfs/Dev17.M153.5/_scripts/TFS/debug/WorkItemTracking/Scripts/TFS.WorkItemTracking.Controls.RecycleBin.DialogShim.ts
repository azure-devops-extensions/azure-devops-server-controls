import * as VSS from "VSS/VSS";
import { getScenarioManager } from "VSS/Performance";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as WITControlsRecycleBin_Async from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin";

export function showRestoreConfirmationDialog(tfsContext: TfsContext, ciSourceAction: string, ciSourceAreaName: string, selectedWorkItemIds: number[], errorCallback?: (exception: Error) => void) {
    requireModulesWithTiming("RestoreConfirmationDialog", (WITControlsRecycleBin: typeof WITControlsRecycleBin_Async) => {
        WITControlsRecycleBin.RestoreConfirmationDialog.showDialog(() => {
            WITControlsRecycleBin.RecycleBin.beginRestoreWorkItems(
                ciSourceAction,
                ciSourceAreaName,
                tfsContext,
                selectedWorkItemIds,
                () => { },
                errorCallback);
        });
    });
};

export function showDeleteConfirmationDialog(tfsContext: TfsContext, ciSourceAction: string, ciSourceAreaName: string, selectedWorkItemIds: number[], readWorkItemsBeforeDeletion: boolean, testWorkItemTypes?: string[], errorCallback?: (exception: Error) => void) {
    requireModulesWithTiming("DeleteConfirmationDialog", (WITControlsRecycleBin: typeof WITControlsRecycleBin_Async) => {
        WITControlsRecycleBin.DeleteConfirmationDialog.showDialog(false, () => {
            WITControlsRecycleBin.RecycleBin.beginDeleteWorkItems(
                ciSourceAction,
                ciSourceAreaName,
                tfsContext,
                selectedWorkItemIds,
                readWorkItemsBeforeDeletion,
                false,
                false,
                testWorkItemTypes);
        });
    });
};

export function showDestroyConfirmationDialog(tfsContext: TfsContext, ciSourceAction: string, ciSourceAreaName: string, selectedWorkItemIds: number[], errorCallback?: (exception: Error) => void) {
    requireModulesWithTiming("DestroyConfirmationDialog", (WITControlsRecycleBin: typeof WITControlsRecycleBin_Async) => {
        WITControlsRecycleBin.DestroyConfirmationDialog.showDialog(() => {
            WITControlsRecycleBin.RecycleBin.beginDestroyWorkItems(
                ciSourceAction,
                ciSourceAreaName,
                tfsContext,
                selectedWorkItemIds,
                () => { },
                errorCallback);
        });
    });
};

let recycleBinControlsModule: typeof WITControlsRecycleBin_Async;
function requireModulesWithTiming(scenarioName: string, action: (module: typeof WITControlsRecycleBin_Async) => void, errorCallback?: (exception: Error) => void) {
    if (!recycleBinControlsModule) {
        const scenario = getScenarioManager().startScenario("WIT", "RecycleBin.DialogShim");
        VSS.requireModules(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin"]).spread((module: typeof WITControlsRecycleBin_Async) => {
            recycleBinControlsModule = module;
            scenario.end();
            action(module);
        }, errorCallback);
    } else {
        action(recycleBinControlsModule);
    }
};

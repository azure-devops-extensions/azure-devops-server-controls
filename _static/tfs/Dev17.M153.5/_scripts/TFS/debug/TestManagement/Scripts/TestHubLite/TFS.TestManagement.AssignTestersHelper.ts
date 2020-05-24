import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WorkItemTrackingControlsAccessories = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.Accessories");
import TFS_Resources_Presentation = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");

import AssignTester = require("TestManagement/Scripts/TFS.TestManagement.AssignTesters");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import { getDefaultWebContext } from "VSS/Context";

import Menus = require("VSS/Controls/Menus");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import VSS = require("VSS/VSS");

import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");

export class AssignTestHelper {
    private assignTesterEvent: any;

    constructor(assignTesterEvent: any) {
        this.assignTesterEvent = assignTesterEvent;
    }

    /**
     * Assign testers to the given parameters.
     */
    public assignTester(args: any) {
        if (args.identity) {

            let tester: TestsOM.ITesterModel;
            const webContext = getDefaultWebContext();
            const teamId = webContext.team ? webContext.team.id : null;

            if (teamId) {
                tester = new TestsOM.ITesterModel(args.identity.id,
                    args.identity.displayName,
                    args.identity.uniqueName,
                    TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(args.identity)
                );
            }
            else {
                tester = new TestsOM.ITesterModel(args.identity.localId,
                    args.identity.displayName,
                    args.identity.signInAddress,
                    TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(args.identity)
                );
            }
            this.assignTesterEvent(args.selectedTestPoints, tester);
        }
        else if (TMUtils.CommonIdentityPickerHelper.featureFlagEnabled) {
            Diag.logTracePoint("[AssignTestersToSuite.LaunchDialogue]: method called");
            VSS.using(["TestManagement/Scripts/TFS.TestManagement.AssignTesters"], (Module: typeof AssignTester) => {
                Dialogs.show(Module.AssignTesterIdentityPickerDialog, $.extend({
                    width: AssignTester.AssignTesterIdentityPickerDialog.DIALOG_WIDTH,
                    height: AssignTester.AssignTesterIdentityPickerDialog.DIALOG_HEIGHT,
                    tableLabel: Resources.AssignTesterTitle, //text-box prompt
                    contentHeader: Resources.AssignTesterTitle, //titlebar
                    contentDescription: Resources.AssignTesterDialogDescription, //description of dialog
                    resizable: false,
                    saveCallback: (resolvedEntities) => {
                        if (resolvedEntities && resolvedEntities.length > 0) {
                            let tester = new TestsOM.ITesterModel(resolvedEntities[0].localId,
                                resolvedEntities[0].displayName,
                                resolvedEntities[0].signInAddress,
                                resolvedEntities[0].signInAddress
                            );
                            this.assignTesterEvent(args.selectedTestPoints, tester);
                        } else {
                            this.assignTesterEvent(args.selectedTestPoints, null);
                        }
                    }
                }));
            });
        }
    }
}

export module CommonContextMenuItemsWithSearch {
    /**
     * Constructs and returns the Assign To context menu item
     * @param tfsContext: TFS context
     */
    export function getAssignToContextMenuItem(tfsContext: TFS_Host_TfsContext.TfsContext, options?: any, errorHandler?: (...args: any[]) => any): Menus.IMenuItemSpec {
        TMUtils.CommonIdentityPickerHelper.getFeatureFlagState();
        options.addSearchUserChildMenu = TMUtils.CommonIdentityPickerHelper.featureFlagEnabled;

        return {
            id: WorkItemTrackingControlsAccessories.CommonContextMenuItems.ASSIGN_TO_ACTION_NAME,
            rank: options.assignedToRank || 1,
            text: options.title ? options.title : TFS_Resources_Presentation.TeamAwarenessAssignTo,
            title: options.tooltip ? options.tooltip : TFS_Resources_Presentation.TeamAwarenessAssignToTooltip,
            icon: "bowtie-icon bowtie-users",
            childItems: AssignTester.AssignTestersChildItems.getAssignTesterChildItems(tfsContext, options, errorHandler),
            groupId: "modify"
        };
    }

    /**
     * Contributes context menu items for the Test Points Grid
     */
    export function contributeTestPointsGrid(menuOptions: any, options?: any) {

        Diag.Debug.assertParamIsObject(menuOptions, "menuOptions");
        Diag.Debug.assertParamIsObject(options, "options");

        if (options.tfsContext) {
            menuOptions.items = menuOptions.items.concat(<any[]>[
                CommonContextMenuItemsWithSearch.getAssignToContextMenuItem(options.tfsContext, options),
                { rank: 2, separator: true }]);
        }
    }
}

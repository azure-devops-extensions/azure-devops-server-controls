import Q = require("q");
import CoreContracts = require("TFS/Core/Contracts");
import CoreRestClient = require("TFS/Core/RestClient");
import * as Service from "VSS/Service";
import VSS = require("VSS/VSS");
import SDK_Shim = require("VSS/SDK/Shim");
import Menus = require("VSS/Controls/Menus");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import FeedbackResources = require("Requirements/Scripts/Resources/TFS.Resources.RequirementsFeedback");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");

// Only use type information from these imports
import Dialogs_Async = require("VSS/Controls/Dialogs");
import FeedbackDialog_Async = require("TestManagement/Scripts/TFS.TestManagement.FeedbackDialog");

let TelemetryService = TCMTelemetry.TelemetryService;
let defaultTeam: string;

(function () {
    let feedbackRequestMenu = {
        execute: function (actionContext) {
            let workItemStore = TFS_OM_Common.ProjectCollection.getDefaultConnection()
                .getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
            let manager = WorkItemManager.get(workItemStore);
            let workItemId: number = getWorkItemId(actionContext);
            getDefaultTeam(actionContext.currentProjectGuid).then((team) => { 
                let feedbackRequestInProgressIndicator = VSS.globalProgressIndicator.actionStarted("feedback-request", true);
                manager.beginGetWorkItem(workItemId, (workItem: WITOM.WorkItem) => {
                    VSS.globalProgressIndicator.actionCompleted(feedbackRequestInProgressIndicator);
                    TelemetryService.publishEvents(TelemetryService.featureOpenRequestFeedbackForm, {});

                    VSS.requireModules(["VSS/Controls/Dialogs", "TestManagement/Scripts/TFS.TestManagement.FeedbackDialog"])
                        .spread((Dialogs: typeof Dialogs_Async, FeedbackDialog: typeof FeedbackDialog_Async) => {
                            Dialogs.Dialog.show<Dialogs_Async.Dialog>(FeedbackDialog.FeedbackDialog, {
                                fieldData: {
                                    [WITConstants.CoreField.Title]: workItem.getFieldValue(WITConstants.CoreField.Title),
                                    [WITConstants.CoreField.Id]: workItem.getFieldValue(WITConstants.CoreField.Id),
                                    [WITConstants.CoreField.IterationPath]: workItem.getFieldValue(WITConstants.CoreField.IterationPath),
                                    [WITConstants.CoreField.AreaPath]: workItem.getFieldValue(WITConstants.CoreField.AreaPath)
                                },
                                team: team
                            });
                        });
                }, (error) => {
                    VSS.globalProgressIndicator.actionCompleted(feedbackRequestInProgressIndicator);
                    alert(VSS.getErrorMessage(error));
                });
            }, (error) => {
                alert(VSS.getErrorMessage(error));
            });
        },
        getMenuItems: function (actionContext): IPromise<any> {
            let menuItem: Menus.IMenuItemSpec = {
                text: " " + FeedbackResources.DialogTitle,
                groupId: FeedbackUtility.feedbackMenuItemGroupId,
                id: "feedback-request"
            };

            let deferred: Q.Deferred<any> = Q.defer<any>();
            showInContextMenu(actionContext).then((showMenu: boolean) => {
                if (showMenu) {
                    deferred.resolve(Q([$.extend({}, menuItem)]));
                } else {
                    deferred.resolve(Q([$.extend({}, menuItem, { hidden: true })]));
                }
            });

            return deferred.promise;
        }
    };

    SDK_Shim.VSS.register("ms.vss-test-web.feedback-request", feedbackRequestMenu);
}());

export function getDefaultTeam(project?: string): IPromise < string>{
    return new Promise((resolve, reject) => {
        if (defaultTeam) {
            return resolve(defaultTeam);
        } else {
            const projectId = project || TFS_Host_TfsContext.TfsContext.getDefault().navigation.project;
            Service.getClient(CoreRestClient.CoreHttpClient).getProject(projectId).then((project: CoreContracts.TeamProject) => {
                defaultTeam = project.defaultTeam.name;
                return resolve(defaultTeam);
            }, (error) => {
                reject(error);
            });
        }
    });
}

export function getWorkItemId(actionContext: any): number {
    if (!actionContext) {
        return null;
    }

    if (actionContext.workItemId) {
        return actionContext.workItemId;
    }

    return actionContext.id;
}

export function showInContextMenu(actionContext: any): IPromise<boolean> {
    let deferred = Q.defer<boolean>();
    let workItemId: number = getWorkItemId(actionContext);

    if (!workItemId || !actionContext.workItemTypeName) {
        deferred.resolve(false);
        return deferred.promise;
    }

    let workItemStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
    let workItemTypeName = actionContext.workItemTypeName;

    workItemStore.beginGetProject(actionContext.currentProjectGuid, (project: WITOM.Project) => {
        project.beginGetWorkItemCategories((categories) => {
            let found = false;
            $.each(categories, (index, category) => {
                switch (category.referenceName) {
                    case FeedbackUtility.requirementCategory:
                    case FeedbackUtility.featureCategory:
                    case FeedbackUtility.epicCategory:
                        if (category.workItemTypeNames.indexOf(workItemTypeName) > -1) {
                            found = true;

                            // Abort iteration
                            return false;
                        }
                        break;
                }
            });
            deferred.resolve(found);
        }, (error) => {
            deferred.resolve(false);
        });
    }, (error) => {
        deferred.resolve(false);
    });

    return deferred.promise;
}

export class FeedbackUtility {
    public static feedbackMenuItemGroupId: string = "externalTools";
    public static requirementCategory: string = "Microsoft.RequirementCategory";
    public static featureCategory: string = "Microsoft.FeatureCategory";
    public static epicCategory: string = "Microsoft.EpicCategory";
}

VSS.tfsModuleLoaded("TFS.TestManagement.FeedbackContextMenu", exports);
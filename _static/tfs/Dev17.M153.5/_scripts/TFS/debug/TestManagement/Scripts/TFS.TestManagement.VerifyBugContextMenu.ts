// Copyright (c) Microsoft Corporation.  All rights reserved.

import Q = require("q");
import VSS = require("VSS/VSS");
import SDK_Shim = require("VSS/SDK/Shim");
import Menus = require("VSS/Controls/Menus");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WIT_WebApi = require("TFS/WorkItemTracking/RestClient");
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");
import VSS_Artifacts_Services = require("VSS/Artifacts/Services");
import TMService = require("TestManagement/Scripts/TFS.TestManagement.Service");
import Contracts = require("TFS/TestManagement/Contracts");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import * as ConfirmationDialog from "TestManagement/Scripts/Scenarios/Common/Components/ConfirmationDialog";
import Diag = require("VSS/Diag");
import Utils_String = require("VSS/Utils/String");

// Only use type information from the following imports
import TMUtils_Async = require("TestManagement/Scripts/TFS.TestManagement.Utils");

const ArtifactLink = "ArtifactLink";
const TcmResult = "TcmResult";

export class VerifyBugContextMenuHelper {
    private _runIdResultIdDetails: any = null;

    constructor() {   
        this._runIdResultIdDetails = null;   
    }

    public getMenuItems(actionContext): IPromise<any> {
        let menuItem: Menus.IMenuItemSpec = {
            text: Resources.VerifyBug,
            icon: "css://bowtie-icon bowtie-file-bug",
            groupId: VerifyBugUtility.menuItemGroupId,
            id: "verify-bug"
        };
    
        let deferred: Q.Deferred<any> = Q.defer<any>();
        this.showInContextMenu(actionContext).then((showMenu: boolean) => {
            if (showMenu) {
                this.parseResultId(actionContext).then((runIdResultIdDetails) => {
                    deferred.resolve(Q([$.extend({}, menuItem)]));
                }, (error) => {
                    deferred.resolve(Q([$.extend({}, menuItem, { hidden: true })]));
                });
                
            } else {                
                deferred.resolve(Q([$.extend({}, menuItem, { hidden: true })]));
            }
        });
    
        return deferred.promise;
    }
    
    public execute(actionContext: any) {
        TCMTelemetry.TelemetryService.publishEvents(TCMTelemetry.TelemetryService.featureOpenVerifyBugTestRunner, {});
    
        this.parseResultId(actionContext).then((runIdResultIdDetails) => {
            this.getPointInfo(runIdResultIdDetails).then((pointDetails) => {
                this.runTestPoint(pointDetails);
            }, (error) => {
                ConfirmationDialog.openAlertDialog(VSS.getErrorMessage(error));
            });
        }, (error) => {
            ConfirmationDialog.openAlertDialog(VSS.getErrorMessage(error));
        });
    }
    
    public parseResultId(actionContext: any): IPromise<any> {
        let deferred: Q.Deferred<any> = Q.defer<any>();

        let workItemId = this.getWorkItemId(actionContext);
        
        if (this._runIdResultIdDetails && this._runIdResultIdDetails.id === workItemId) {
            deferred.resolve(this._runIdResultIdDetails);
        }
        else {
            this._runIdResultIdDetails = null;
            WIT_WebApi.getClient().getWorkItem(workItemId, null, null, WIT_Contracts.WorkItemExpand.Relations).then((workItemDetails) => {
                let ids: string[] = [];
                if (workItemDetails.relations === undefined) {
                    deferred.reject(Resources.AlertNoTestResultFound);
                }
                else {
                    ids = this.getResultIds(workItemDetails);
                    ids = this.getReverseSortedResultIds(ids);
                    if (ids.length > 0) {
                        let latestRundetails = ids[0].split(".");
                        if (latestRundetails.length === 2) {
                            let runIdResultIdDetails = {
                                runId: parseInt(latestRundetails[0]),
                                resultId: parseInt(latestRundetails[1]),
                                id: workItemDetails.id,
                                title: workItemDetails.fields["System.Title"]
                            };
                            this._runIdResultIdDetails = runIdResultIdDetails;
                            deferred.resolve(runIdResultIdDetails);
                        }
                        else {
                            deferred.reject(Resources.AlertNoTestResultFound);
                        }
                    }
                    else {
                        deferred.reject(Resources.AlertNoTestResultFound);
                    }
                }
            }, (error) => {
                deferred.reject(error);
            });
        }
        return deferred.promise;
    }
    
    private getPointInfo(runIdResultIdDetails: any): IPromise<any> {
        let deferred: Q.Deferred<any> = Q.defer<any>();
        TMService.ServiceManager.instance().testResultsService().getResultById(runIdResultIdDetails.runId, runIdResultIdDetails.resultId).then((result: Contracts.TestCaseResult) => {
            if (result && result.testPoint) {
                let pointDetails = {
                    planId: parseInt(result.testPlan.id),
                    pointId: result.testPoint.id,
                    id: runIdResultIdDetails.id,
                    title: runIdResultIdDetails.title
                };
                deferred.resolve(pointDetails);
            }
            else {
                ConfirmationDialog.openAlertDialog(Resources.AlertNoPointsFound);
            }
            deferred.resolve(null);
        }, (error) => {
            deferred.reject(error);
        });
        return deferred.promise;
    }
    
    private runTestPoint(pointDetails) {
        VSS.requireModules(["TestManagement/Scripts/TFS.TestManagement.Utils"]).spread((TMUtils: typeof TMUtils_Async) => {
            let webRunner = new TMUtils.WebRunner();
            let verifyBugInfo: TestsOM.VerifyBugInfo = {
                id: pointDetails.id,
                title: pointDetails.title
            };
    
            TestsOM.DAUtils.trackAction("RunTestUsingWorkItemDetails", "/Execution");
            if (webRunner._checkForExistingTestRunnerForVerify()) {
                let planId = pointDetails.planId;
                TMUtils.getTestRunManager().CreateTestRunForTestPoints(Utils_String.empty, planId, [pointDetails.pointId], (testRunAndResults) => {
                    webRunner._openRunInNewWindow(testRunAndResults,
                        null, { verifyBugInfo: verifyBugInfo });
                    TCMTelemetry.TelemetryService.publishEvents(TCMTelemetry.TelemetryService.featureVerifyBugTestRunnerOpened, {});
                }, (error) => {
                    ConfirmationDialog.openAlertDialog(VSS.getErrorMessage(error));
                });
            }
        });
    }
    
    public getWorkItemId(actionContext: any): number {
        if (!actionContext) {
            return null;
        }
    
        if (actionContext.workItemId) {
            return actionContext.workItemId;
        }
        return actionContext.id;
    }
    
    public showInContextMenu(actionContext: any): IPromise<boolean> {
        let deferred = Q.defer<boolean>();
        let workItemId: number = this.getWorkItemId(actionContext);
    
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
                        case VerifyBugUtility.bugCategory:
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
    
    public getReverseSortedResultIds(ids: string[]): string[] {
        ids = ids.sort((a, b) => {
            return (parseInt(b.split(".")[0]) - parseInt(a.split(".")[0]));
        });
        return ids;
    }
    
    public getResultIds(workItemDetails: any): string[] {
        let ids: string[] = [];
        for (let relation of workItemDetails.relations) {
            if (relation.rel === ArtifactLink) {
                let decodedURL: VSS_Artifacts_Services.IArtifactData = VSS_Artifacts_Services.LinkingUtilities.decodeUri(relation.url);
                if (decodedURL.type === TcmResult) {
                    let decodedUrlId = decodedURL.id;
                    let runDetails = decodedUrlId.split(".");
                    // To assert if the link format changes in future.
                    Diag.Debug.assert(runDetails.length <= 2, "Result links providing more than expected parameters");
    
                    // Filter out test result links created through exploratory session. Links created through XT contains only sessionId.
                    if (runDetails.length === 2) {
                        ids.push(decodedUrlId);
                    }
                }
            }
        }
        return ids;
    }
}

export class VerifyBugUtility {
    public static menuItemGroupId: string = "externalTools";
    public static bugCategory: string = "Microsoft.BugCategory";
}

export function getRequestMenu(): any {
    let verifyBugHelper = new VerifyBugContextMenuHelper();
    let requestMenu = {
        execute: function (actionContext) {
            verifyBugHelper.execute(actionContext);
        },
        getMenuItems: function (actionContext): IPromise<any> {
            return verifyBugHelper.getMenuItems(actionContext);
        }
    };
    return requestMenu;
}

(function () {
    let requestMenu = getRequestMenu();
    SDK_Shim.VSS.register("ms.vss-test-web.verify-bug", requestMenu);
} ());
VSS.tfsModuleLoaded("TFS.TestManagement.VerifyBugContextMenu", exports);

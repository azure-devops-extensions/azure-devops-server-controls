import * as Q from "q";
import TcmService = require("TestManagement/Scripts/TFS.TestManagement.Service");
import TCMContracts = require("TFS/TestManagement/Contracts");
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");
import WIT_WebApi = require("TFS/WorkItemTracking/RestClient");
import * as Artifacts_Constants from "VSS/Artifacts/Constants";
import * as Diag from "VSS/Diag";
import { getClient, getService } from "VSS/Service";
import Utils_Array = require("VSS/Utils/Array");
import VSS_Artifacts_Services = require("VSS/Artifacts/Services");
import { TestManagementMigrationService } from "TestManagement/Scripts/TestManagementMigrationService";

let LinkingUtilities = VSS_Artifacts_Services.LinkingUtilities;

const ArtifactLink = "ArtifactLink";

export class BugsGridViewSource {

    public loadAssociatedBugs(projectId: string, testCaseResult: TCMContracts.TestCaseResult): IPromise<WIT_Contracts.WorkItem[]> {

        let deferred = Q.defer<WIT_Contracts.WorkItem[]>();
        let bugIds: number[] = [];
        let uniqueBugIds: number[] = [];
        let workItem: WIT_Contracts.WorkItem[] = [];
        let service: TcmService.ITestResultsService = TcmService.ServiceManager.instance().testResultsService();

        let testCaseId: number = testCaseResult.testCase.id ? parseInt(testCaseResult.testCase.id) : 0;

        let getAssociatedRecentBugs = service.getRecentBugs(testCaseResult.automatedTestName, testCaseId);
        let getAssociatedResultBugs = service.getAssociatedBugs(parseInt(testCaseResult.testRun.id), testCaseResult.id);

        Q.allSettled([getAssociatedRecentBugs, getAssociatedResultBugs]).then((results) => {
            results.forEach((p) => {
                if (p.state === "fulfilled") {
                    p.value.forEach((bug) => {
                        bugIds.push(parseInt(bug.id));
                    });
                } else {
                    Diag.logWarning("Unable to load bugs");
                    Diag.logWarning(p.reason);
                }
            });

            uniqueBugIds = Utils_Array.unique(bugIds).reverse();
            if (uniqueBugIds.length > 0) {
                this.getWorkItemTrackingClient()
                    .getWorkItems(uniqueBugIds, null, null, WIT_Contracts.WorkItemExpand.Relations, null, projectId)
                    .then(
                        (workItems: WIT_Contracts.WorkItem[]) => {
                            deferred.resolve(workItems);
                        },
                        (error) => {
                            Diag.logWarning("Unable to load bugs");
                            Diag.logWarning(error);
                            deferred.reject(null);
                        });
            } else {
                deferred.resolve(workItem);
            }

        },
            (error) => {
                Diag.logWarning("Unable to load bugs");
                Diag.logWarning(error);
                deferred.reject(null);
            });

        return deferred.promise;
    }

    public getUpdatedWorkItem(workItem: WIT_Contracts.WorkItem): IPromise<WIT_Contracts.WorkItem> {
        let deferred = Q.defer<WIT_Contracts.WorkItem>();
        this.getWorkItemTrackingClient().getWorkItem(workItem.id, null, null, WIT_Contracts.WorkItemExpand.Relations).then((updatedWorkItem: WIT_Contracts.WorkItem) => {
            deferred.resolve(updatedWorkItem);
        }, (error) => {
            Diag.logWarning(error);
            deferred.reject(null);
        });
        return deferred.promise;
    }

    public deleteAssociations(testCaseResult: TCMContracts.TestCaseResult, bugs: WIT_Contracts.WorkItem[]): IPromise<WIT_Contracts.WorkItem[]> {
        let count = 0;
        let deferred = Q.defer<WIT_Contracts.WorkItem[]>();
        let deletedBugs: WIT_Contracts.WorkItem[] = [];
        bugs.forEach((bug, index) => {
            let data = [];
            let relationIndicesToRemove: number[] = this._getRelationsIndicesToDelete(testCaseResult, bug);
            for (let i = 0; i < relationIndicesToRemove.length; ++i) {
                data.push({
                    op: "remove",
                    path: "/relations/" + relationIndicesToRemove[i].toString()
                });
            }

            this.getWorkItemTrackingClient().updateWorkItem(data, bug.id).then((workItems: WIT_Contracts.WorkItem) => {
                deletedBugs.push(bug);
                count++;
                if (count === bugs.length) {
                    deferred.resolve(deletedBugs);
                }
            }, (error) => {
                count++;
                if (count === bugs.length) {
                    deferred.resolve(deletedBugs);
                }
                Diag.logWarning(error);
            });
        });

        return deferred.promise;
    }

    private _getRelationsIndicesToDelete(testCaseResult: TCMContracts.TestCaseResult, bug: WIT_Contracts.WorkItem): number[] {
        let indicesToDelete = [];
        let uniqueId: string = testCaseResult.testRun.id + "." + testCaseResult.id.toString();
        /* We will delete the links to:
           1. TestResult (url of type: ../TcmResult/{RunId}.{ResultId})
           1. TestCaseRef (url of type: ../TcmTest/{TestCaseRefId})
        */
        for (let i = 0; i < bug.relations.length; ++i) {
            if (bug.relations[i].rel === ArtifactLink) {
                let decodedRelationUri = LinkingUtilities.decodeUri(bug.relations[i].url);
                if ((decodedRelationUri.type === Artifacts_Constants.ArtifactTypeNames.TcmResult && decodedRelationUri.id === uniqueId)
                    || decodedRelationUri.type === Artifacts_Constants.ArtifactTypeNames.TcmTest &&  this._isMatch(decodedRelationUri.id, testCaseResult.testCaseReferenceId)) {
                    indicesToDelete.push(i);
                }
            }
        }
        return indicesToDelete;
    }

    private _isMatch(toolSpecificId: string, testCaseReferenceId: number): boolean {
        const service = getService(TestManagementMigrationService);
        return service.getEncodedRefId(TCMContracts.Service.Tcm, testCaseReferenceId) === toolSpecificId ||
            service.getEncodedRefId(TCMContracts.Service.Tfs, testCaseReferenceId) === toolSpecificId;
    }

    private getWorkItemTrackingClient(): WIT_WebApi.WorkItemTrackingHttpClient {
        return getClient<WIT_WebApi.WorkItemTrackingHttpClient>(WIT_WebApi.WorkItemTrackingHttpClient);
    }
}

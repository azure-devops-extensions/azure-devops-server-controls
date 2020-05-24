import * as Q from "q";
import TcmService = require("TestManagement/Scripts/TFS.TestManagement.Service");
import TCMContracts = require("TFS/TestManagement/Contracts");
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");
import WIT_WebApi = require("TFS/WorkItemTracking/RestClient");
import * as Diag from "VSS/Diag";
import { getClient } from "VSS/Service";

export class RequirementsGridViewSource {

    public getRequirements(projectId: string, testCaseResult: TCMContracts.TestCaseResult): IPromise<WIT_Contracts.WorkItem[]> {

        let deferred = Q.defer<WIT_Contracts.WorkItem[]>();
        let requirementIds: number[] = [];
        let workItem: WIT_Contracts.WorkItem[] = [];
        let service: TcmService.ITestResultsService = TcmService.ServiceManager.instance().testResultsService();

        if (testCaseResult.automatedTestName) {
            service.getTestMethodLinkedWorkItems(testCaseResult.automatedTestName).then((linkedRequirements: TCMContracts.TestToWorkItemLinks) => {
                let requirements: TCMContracts.WorkItemReference[] = linkedRequirements.workItems;
                if (requirements != null && requirements.length > 0) {
                    requirements.forEach((requirement) => {
                        requirementIds.push(parseInt(requirement.id));
                    });
                    this.getWorkItemTrackingClient().getWorkItems(requirementIds, null, null, WIT_Contracts.WorkItemExpand.Relations, null, projectId).then((workItems: WIT_Contracts.WorkItem[]) => {
                        deferred.resolve(workItems);
                    },
                        (error) => {
                            Diag.logWarning("Unable to load requirements");
                            Diag.logWarning(error);
                            deferred.reject(error);
                        });
                } else {
                    deferred.resolve(workItem);
                }
            }, (error) => {
                Diag.logWarning(error);
                deferred.reject(error);
            });
        } else {
            deferred.resolve(workItem);
        }
        return deferred.promise;
    }

    public getUpdatedWorkItem(workItem: WIT_Contracts.WorkItem): IPromise<WIT_Contracts.WorkItem> {
        let deferred = Q.defer<WIT_Contracts.WorkItem>();
        this.getWorkItemTrackingClient().getWorkItem(workItem.id).then((updatedWorkItem: WIT_Contracts.WorkItem) => {
            deferred.resolve(updatedWorkItem);
        }, (error) => {
            Diag.logWarning(error);
            deferred.reject(null);
        });
        return deferred.promise;
    }

    public deleteAssociations(testCaseResult: TCMContracts.TestCaseResult, requirements: WIT_Contracts.WorkItem[]): IPromise<WIT_Contracts.WorkItem[]> {
        let count = 0;
        let deferred = Q.defer<WIT_Contracts.WorkItem[]>();
        let deletedRequirements: WIT_Contracts.WorkItem[] = [];
        requirements.forEach((requirement, index) => {
            TcmService.ServiceManager.instance().testResultsService().deleteTestMethodToWorkItemLink(testCaseResult.automatedTestName, requirement.id).then((associationDeleted: boolean) => {
                if (associationDeleted) {
                    deletedRequirements.push(requirement);
                }
                count++;
                if (count === requirements.length) {
                    deferred.resolve(deletedRequirements);
                }
            }, (error) => {
                count++;
                if (count === requirements.length) {
                    deferred.resolve(deletedRequirements);
                }
                Diag.logWarning(error);
            });
        });

        return deferred.promise;
    }

    private getWorkItemTrackingClient(): WIT_WebApi.WorkItemTrackingHttpClient {
        return getClient<WIT_WebApi.WorkItemTrackingHttpClient>(WIT_WebApi.WorkItemTrackingHttpClient);
    }
}

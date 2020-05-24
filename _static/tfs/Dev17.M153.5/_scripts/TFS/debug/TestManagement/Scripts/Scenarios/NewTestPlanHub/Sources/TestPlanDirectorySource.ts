import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import * as Service from "VSS/Service";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Utils_Array from "VSS/Utils/Array";
import * as WIT_Contracts from "TFS/WorkItemTracking/Contracts";
import * as WIT_RestClient from "TFS/WorkItemTracking/RestClient";
import {
    IAllTestPlanPayload,
    IAllTestPlanInitialPayload,
    IMyTestPlanPayload,
    IMyFavoriteTestPlanPayload,
    ITestPlan,
    WorkItemField,
    IMyTestPlanSkinnyPayload
    } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { WebPageDataService } from "VSS/Contributions/Services";
import { PerformanceUtils } from "TestManagement/Scripts/TFS.TestManagement.Performance";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";

export class TestPlanDirectorySource {

    public static getInstance() {
        if (!TestPlanDirectorySource._instance) {
            TestPlanDirectorySource._instance = new TestPlanDirectorySource();
        }
        return TestPlanDirectorySource._instance;
    }
    private static _instance: TestPlanDirectorySource;
    private readonly batchSize: number = 200;
    private readonly allTestPlanDataProviderId: string = "ms.vss-test-web.testplan-hub-directory-all-tab-data-provider";
    private readonly allTestPlanDataProviderOldId: string = "ms.vss-test-web.testplan-hub-directory-all-tab-data-provider-old";
    private readonly myTestPlanDataProviderId: string = "ms.vss-test-web.testplan-hub-directory-mine-tab-data-provider";
    private readonly myFavoriteTestPlansDataProviderId: string = "ms.vss-test-web.testplan-hub-directory-myfavoriteplans-data-provider";
    private readonly myTestPlanSkinnyDataProviderId: string = "ms.vss-test-web.testplan-hub-directory-mine-tab-skinny-data-provider";
    private readonly allTestPlanInitialDataProviderId: string = "ms.vss-test-web.testplan-hub-directory-all-tab-initial-data-provider";


    /**
     * get data provider value for all page
     */
    public getAllTestPlanPageData(): IPromise<IAllTestPlanPayload> {
        return new Promise((resolve, reject) => {

            // Get page data from the data provider
            const pageDataService = Service.getService(WebPageDataService);

            var dataProviderId;

            // We need to fetch data from the old data provider if the FF is turned OFF
            if (LicenseAndFeatureFlagUtils.isAllTestPlanSkinnyProviderEnabled()) {
                dataProviderId = this.allTestPlanDataProviderId;
            } else {
                dataProviderId = this.allTestPlanDataProviderOldId;
            }

            let pageData = pageDataService.getPageData<IAllTestPlanPayload>(dataProviderId);
            if (pageData) {
                resolve(pageData);
            } else {
                // Measuring the time taken for the call made from the client to fetch the test plans data for the "All" page.
                PerformanceUtils.startScenario(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.FetchTestPlansAllPageData);

                this._ensureDataProviderIsResolved(dataProviderId).then(() => {
                    PerformanceUtils.endScenario(TMUtils.TcmPerfScenarios.FetchTestPlansAllPageData);

                    pageData = pageDataService.getPageData<IAllTestPlanPayload>(dataProviderId);
                    resolve(pageData);
                },
                (error: Error) => {
                    PerformanceUtils.abortScenario(TMUtils.TcmPerfScenarios.FetchTestPlansAllPageData);

                    reject(error);
                });
            }

        });
    }

    /**
     * get initial data provider value for all page
     */
    public getAllTestPlanInitialPageData(): IPromise<IAllTestPlanInitialPayload> {
        return new Promise((resolve, reject) => {

            // Get page data from the data provider
            const pageDataService = Service.getService(WebPageDataService);

            let pageData = pageDataService.getPageData<IAllTestPlanInitialPayload>(this.allTestPlanInitialDataProviderId);
            if (pageData) {
                resolve(pageData);
            } else {
                // Measuring the time taken for the call made from the client to fetch the test plans data for the "All" page.
                PerformanceUtils.startScenario(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.FetchTestPlansAllInitialPageData);

                this._ensureDataProviderIsResolved(this.allTestPlanInitialDataProviderId).then(() => {
                    PerformanceUtils.endScenario(TMUtils.TcmPerfScenarios.FetchTestPlansAllInitialPageData);

                    pageData = pageDataService.getPageData<IAllTestPlanInitialPayload>(this.allTestPlanInitialDataProviderId);
                    resolve(pageData);
                },
                (error: Error) => {
                    PerformanceUtils.abortScenario(TMUtils.TcmPerfScenarios.FetchTestPlansAllInitialPageData);

                    reject(error);
                });
            }

        });
    }

    /**
     * get data provider value for mine page
     */
    public getMyFavoriteTestPlanData(): IPromise<IMyFavoriteTestPlanPayload> {

        return new Promise((resolve, reject) => {

            // Get page data from the data provider
            const pageDataService = Service.getService(WebPageDataService);

            let pageData = pageDataService.getPageData<IMyFavoriteTestPlanPayload>(this.myFavoriteTestPlansDataProviderId);
            if (pageData) {
                resolve(pageData);
            } else {
                this._ensureDataProviderIsResolved(this.myFavoriteTestPlansDataProviderId).then(() => {
                    pageData = pageDataService.getPageData<IMyFavoriteTestPlanPayload>(this.myFavoriteTestPlansDataProviderId);
                    resolve(pageData);
                },
                    (error: Error) => {
                        reject(error);
                    });
            }

        });        
    }

    public getMySkinnyTestPlanData(): IPromise<IMyTestPlanSkinnyPayload> {
        return new Promise((resolve, reject) => {
            const pageDataService = Service.getService(WebPageDataService);

            this._ensureDataProviderIsResolved(this.myTestPlanSkinnyDataProviderId).then(() => {
                let pageData = pageDataService.getPageData<IMyTestPlanSkinnyPayload>(this.myTestPlanSkinnyDataProviderId);
                resolve(pageData);
            },
                (error: Error) => {
                    reject(error);
                });
        });
    }

    public getMyTestPlanPageData(): IPromise<IMyTestPlanPayload> {

        return new Promise((resolve, reject) => {

            // Get page data from the data provider
            const pageDataService = Service.getService(WebPageDataService);

            let pageData = pageDataService.getPageData<IMyTestPlanPayload>(this.myTestPlanDataProviderId);
            if (pageData) {
                resolve(pageData);
            } else {
                // In a normal scenario this code path should not be hit but adding telemetry here as well for consistency.
                PerformanceUtils.startScenario(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.FetchTestPlansMinePageData);

                this._ensureDataProviderIsResolved(this.myTestPlanDataProviderId).then(() => {
                    PerformanceUtils.endScenario(TMUtils.TcmPerfScenarios.FetchTestPlansMinePageData);

                    pageData = pageDataService.getPageData<IMyTestPlanPayload>(this.myTestPlanDataProviderId);
                    resolve(pageData);
                },
                (error: Error) => {
                    PerformanceUtils.abortScenario(TMUtils.TcmPerfScenarios.FetchTestPlansMinePageData);

                    reject(error);
                });
            }

        });

    }

     /**
     * get test plan meta data using wit calls in batches
     * @param idsToFetch
     */
    public getTestPlanMetaData(idsToFetch: number[]): IPromise<IDictionaryStringTo<ITestPlan>>{

        return new Promise((resolve, reject) => {
            this._getWorkItems(idsToFetch).then((workItems: WIT_Contracts.WorkItem[]) => {
                resolve(this._createTestPlanMap(workItems));
            },
            (error: Error) => {
                reject(error);
            });
        });
    }

    private _getWorkItems(idsToFetch: number[]): IPromise<WIT_Contracts.WorkItem[]> {

        let columns: string[] = [];
        columns.push(WorkItemField.iterationPath);
        columns.push(WorkItemField.title);
        columns.push(WorkItemField.id);
        columns.push(WorkItemField.workItemState);
        columns.push(WorkItemField.assignedTo);
        columns.push(WorkItemField.areaPath);
        columns.push(WorkItemField.workItemType);

        let workItemsPromsie = Service.getClient(WIT_RestClient.WorkItemTrackingHttpClient).getWorkItems(
            idsToFetch, columns, new Date());

        return workItemsPromsie.then((workItems: WIT_Contracts.WorkItem[]) => {
            return new Promise(resolve => resolve(workItems));
        },
        (error: Error) => {
            return new Promise((resolve, reject) => reject(error));
        });
    }

    private _ensureDataProviderIsResolved(contributionId: string): IPromise<any> {
        const contribution = <Contributions_Contracts.Contribution>{
            id: contributionId,
            properties: {
                "serviceInstanceType": ServiceInstanceTypes.TFS
            }
        };

        // Fetch pageData asynchronously
        const pageDataService = Service.getService(WebPageDataService);
        return pageDataService.ensureDataProvidersResolved([contribution], true);
    }

    private _createTestPlanMap(workitems: WIT_Contracts.WorkItem[]): IDictionaryStringTo<ITestPlan>{
        let testPlanMap: IDictionaryStringTo<ITestPlan> = {};

        workitems.forEach((workItem) => {

            const testplan: ITestPlan = {
                id: workItem.id,
                loaded: true,
                name: workItem.fields[WorkItemField.title],
                fields: {
                    areaPath: workItem.fields[WorkItemField.areaPath],
                    iterationPath: workItem.fields[WorkItemField.iterationPath],
                    state: workItem.fields[WorkItemField.workItemState],
                    assignedTo: workItem.fields[WorkItemField.assignedTo] && workItem.fields[WorkItemField.assignedTo].id && {
                        id: workItem.fields[WorkItemField.assignedTo].id,
                        displayName: workItem.fields[WorkItemField.assignedTo].displayName,
                        uniqueName: workItem.fields[WorkItemField.assignedTo].uniqueName,
                        imageUrl: workItem.fields[WorkItemField.assignedTo].imageUrl
                    }
                }
            };

            testPlanMap[workItem.id.toString()] = testplan;
        });

        return testPlanMap;
    }

    /**
    * Get project id from context
    */
    private _getProjectIdFromContext(): string {
        return TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.id;
    }
}

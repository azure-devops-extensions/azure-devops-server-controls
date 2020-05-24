import BuildClientContracts_LAZY_LOAD = require("Build.Common/Scripts/ClientContracts");
import BuildClientServices_LAZY_LOAD = require("Build.Common/Scripts/Api2.2/ClientServices");
import BuildContracts = require("TFS/Build/Contracts");
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import Events_Action_LAZY_LOAD = require("VSS/Events/Action");
import RunSettingsHelper_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.TestSettingsHelper");
import TMUtils_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TestsOM_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement");
import TFS_RMService_LAZY_LOAD = require("TestManagement/Scripts/Services/TFS.ReleaseManagement.Service");
import RMContracts_LAZY_LOAD = require("ReleaseManagement/Core/Contracts");
import Services_LAZY_LOAD = require("TestManagement/Scripts/Services/Services.Common");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMAutomatedTestRunHelper_LAZY_LOAD = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.AutomatedTestRunHelper");
import TCMContracts = require("TFS/TestManagement/Contracts");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import TFS_OM_Common_LAZY_LOAD = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VSS_Artifacts_Services = require("VSS/Artifacts/Services");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Culture = require("VSS/Utils/Culture");
import Utils_String = require("VSS/Utils/String");
import Utils_Url = require("VSS/Utils/Url");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import VSS = require("VSS/VSS");
import { isSafeProtocol } from "VSS/Utils/Url";
import * as OnDemandConstants from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Constants";
import * as ConfirmationDialog from "TestManagement/Scripts/Scenarios/Common/Components/ConfirmationDialog";
import Q = require("q");

let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;
let LinkingUtilities = VSS_Artifacts_Services.LinkingUtilities;
let TelemetryService = TCMTelemetry.TelemetryService;
let TfsContext = TFS_Host_TfsContext.TfsContext;

export enum AutomatedTestRunErrorCode {
    NoError,
    GetReleaseServiceError,
    CreateReleaseError,
    UpdateReleaseError,
    StartReleaseEnvironmentError,
    UpdateTestRunError
}

export class TestRunHelper {
    /**
      *  The manual test runner will be launched in a new window and the selected Test points will become available for execution
    */
    public static runTestPointsUsingWebRunner(testPoints: TCMLite.ITestPointModel[], suite: TCMLite.ITestSuiteModel, plan: any, bugCategoryType: string, ownerId: string, errorCallBack: any, selectedBuildUri?: string) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Utils"], (TMUtils: typeof TMUtils_LAZY_LOAD) => {
            let webRunner = new TMUtils.WebRunner();
            if (webRunner._checkForExistingMtrWindow()) {
                this._validateTestPointsCount(testPoints).then(() => {
                    let isDataCollectionEnabled: boolean = TMUtils.isDataCollectionEnabled();
                    let settingName: string = isDataCollectionEnabled ? Resources.ChromeBrowserSettingsName : Resources.NonChromeBrowserSettingsName;
                    this._createTestSettings(settingName, [], plan, (testSettingsId: number) => {
                        this._populateAndGetTestRunDetails(plan, suite, ownerId, selectedBuildUri, testSettingsId).then((testRunDetails) => {
                            TMUtils.getTestRunManager().create(testRunDetails, testPoints, (testRunAndResults) => {
                                testRunAndResults.bugCategoryName = bugCategoryType;
                                webRunner._openRunInNewWindow(testRunAndResults, suite);
                            },
                                (error) => {
                                    this.handleTestPointError(Resources.TestRunError, error, errorCallBack);
                                });
                        });
                    });
                });
            }
        });
    }

    /**
     * The manual test runner will be launched in a MTM client and the selected Test points will become available for execution
     * @param planId
     * @param testPoints
     */
    public static runTestPointsUsingClient(planId: number, testPoints: TCMLite.ITestPointModel[]) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement", "VSS/Events/Action"], (TestsOM: typeof TestsOM_LAZY_LOAD, Events_Action: typeof Events_Action_LAZY_LOAD) => {
            this.validateSelectedTestPoints(testPoints, true).then(() => {
                let testPointIds: number[] = [];

                for (let i = 0, length = testPoints.length; i < length; i++) {
                    testPointIds.push(testPoints[i].testPointId);
                }

                let clientUrl = TestsOM.UriHelper.getClientMTRUri(testPointIds, planId);

                if (isSafeProtocol(clientUrl)) {
                    Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                        url: clientUrl,
                        target: "_self"
                    });
                }

                TelemetryService.publishEvents(TelemetryService.featureRunTestUsingClient, {});
            });
        });
    }

    private static _getBuild(buildDefinitionId: number, buildUri: string): IPromise<BuildContracts.Build> {
        const deferred = Q.defer<BuildContracts.Build>();
        VSS.using([
            "Presentation/Scripts/TFS/TFS.OM.Common",
            "Build.Common/Scripts/Api2.2/ClientServices"
        ],
            (
                TFS_OM_Common: typeof TFS_OM_Common_LAZY_LOAD,
                BuildClientServices: typeof BuildClientServices_LAZY_LOAD
            ) => {
                const buildService = TFS_OM_Common.ProjectCollection.getConnection(TfsContext.getDefault())
                    .getService<BuildClientServices_LAZY_LOAD.BuildClientService>(BuildClientServices.BuildClientService);
                if (buildUri) {
                    const buildArtifact = LinkingUtilities.decodeUri(buildUri);
                    buildService.getBuild(parseInt(buildArtifact.id))
                        .then((build: BuildContracts.Build) => {
                            deferred.resolve(build);
                        }, (reason: any) => {
                            deferred.reject(null);
                        });
                } else {
                    const buildFilter: BuildClientContracts_LAZY_LOAD.IBuildFilter = {
                        definitions: buildDefinitionId.toString(),
                        statusFilter: BuildContracts.BuildStatus.Completed,
                        resultFilter: BuildContracts.BuildResult.Succeeded | BuildContracts.BuildResult.PartiallySucceeded,
                        $top: 1,
                        queryOrder: BuildContracts.BuildQueryOrder.FinishTimeDescending
                    };
                    buildService.getBuilds(buildFilter)
                        .then((buildResults: BuildClientContracts_LAZY_LOAD.GetBuildsResult) => {
                            if (buildResults && buildResults.builds && buildResults.builds.length) {
                                deferred.resolve(buildResults.builds[0]);
                            } else {
                                deferred.reject(null);
                            }
                        }, (reason: any) => {
                            deferred.reject(null);
                        });
                }
            });
        return deferred.promise;
    }

    private static _getReleaseDefinition(releaseDefinitionId: number): IPromise<RMContracts_LAZY_LOAD.ReleaseDefinition> {
        const deferred = Q.defer<RMContracts_LAZY_LOAD.ReleaseDefinition>();
        VSS.using([
            "TestManagement/Scripts/Services/Services.Common"
        ],
            (
                Services: typeof Services_LAZY_LOAD
            ) => {
                const releaseService = Services.ServiceFactory.getService(Services.ServiceType.ReleaseManagement);
                releaseService
                    .then((service: TFS_RMService_LAZY_LOAD.ReleaseService) => {
                        service.getReleaseDefinition(releaseDefinitionId)
                            .then((releaseDefinition: RMContracts_LAZY_LOAD.ReleaseDefinition) => {
                                deferred.resolve(releaseDefinition);
                            }, (reason: any) => {
                                deferred.reject(reason);
                            });
                    }, (reason: any) => {
                        deferred.reject(reason);
                    });
            });
        return deferred.promise;
    }

    public static runAutomatedTestsUsingTestPlanSettings(testPoints: TCMLite.ITestPointModel[], testPlan: any, successCallback: () => void) {
        VSS.using(["TestManagement/Scripts/Services/TFS.ReleaseManagement.Service",
            "TestManagement/Scripts/Services/Services.Common",
            "ReleaseManagement/Core/Contracts",
            "Build.Common/Scripts/ClientContracts"],
            (TFS_RMService: typeof TFS_RMService_LAZY_LOAD,
                Services: typeof Services_LAZY_LOAD,
                RMContracts: typeof RMContracts_LAZY_LOAD,
                BuildClientContracts: typeof BuildClientContracts_LAZY_LOAD) => {

                if (testPlan.buildDefinitionId) {
                    this._getBuild(testPlan.buildDefinitionId, testPlan.buildUri)
                        .then((build: BuildContracts.Build) => {
                            const releaseDefinitionId = testPlan.releaseEnvironmentDefinition ? parseInt(testPlan.releaseEnvironmentDefinition.definitionId) : 0;
                            this._getReleaseDefinition(releaseDefinitionId)
                                .then((releaseDefinition: RMContracts_LAZY_LOAD.ReleaseDefinition) => {
                                    this.startValidationAndRunAutomatedTestPoints(testPoints, build, releaseDefinition, testPlan.releaseEnvironmentDefinition.environmentDefinitionId, testPlan, successCallback);
                                }, (reason: any) => {
                                    this.startValidationAndRunAutomatedTestPoints(testPoints, build, null, 0, testPlan, successCallback);
                                });
                        }, (reason: any) => {
                            this.startValidationAndRunAutomatedTestPoints(testPoints, null, null, null, testPlan, successCallback);
                        });
                } else {
                    this.startValidationAndRunAutomatedTestPoints(testPoints, null, null, null, testPlan, successCallback);
                }
            });
    }

    public static startValidationAndRunAutomatedTestPoints(
        selectedPoints: TCMLite.ITestPointModel[],
        selectedBuild: BuildContracts.Build,
        selectedReleaseDefinition: RMContracts_LAZY_LOAD.ReleaseDefinition,
        selectedReleaseEnvironmentId: number,
        currentPlan: any,
        successCallback: () => void) {

        VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.AutomatedTestRunHelper"], (
            AutomatedTestRunHelperModule: typeof TCMAutomatedTestRunHelper_LAZY_LOAD
        ) => {
            if (!this._automatedTestRunHelper) {
                this._automatedTestRunHelper = new AutomatedTestRunHelperModule.AutomatedTestRunHelper();
            }
            this._automatedTestRunHelper.openAutomatedTestRunDialog(
                selectedPoints,
                selectedBuild,
                selectedReleaseDefinition,
                selectedReleaseEnvironmentId,
                currentPlan,
                successCallback);
        });
    }

    /** 
     * Run Automated tests  by queuing the associated release definition 
     */
    public static runAutomatedTestPointsUsingReleaseEnvironment(pointIds: number[],
        plan: any,
        selectedBuild: BuildContracts.Build,
        releaseDefinition: RMContracts_LAZY_LOAD.ReleaseDefinition,
        releaseDefinitionEnvironmentId: number,
        successCallback: any,
        errorCallBack: any) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement", "TestManagement/Scripts/TFS.TestManagement.Utils", "TestManagement/Scripts/Services/TFS.ReleaseManagement.Service",
            "TestManagement/Scripts/Services/Services.Common", "ReleaseManagement/Core/Contracts"],
            (TMOM: typeof TestsOM_LAZY_LOAD, TMUtils: typeof TMUtils_LAZY_LOAD, TFS_RMService: typeof TFS_RMService_LAZY_LOAD, Services: typeof Services_LAZY_LOAD, RMContracts: typeof RMContracts_LAZY_LOAD) => {
                let runManager = TMUtils.getTestRunManager();
                let artifactSourceAlias = this._getArtifactSourceAlias(releaseDefinition, selectedBuild.definition.id);
                let buildArtifact: RMContracts_LAZY_LOAD.ArtifactMetadata = {
                    alias: artifactSourceAlias,
                    instanceReference: {
                        name: selectedBuild.buildNumber,
                        id: selectedBuild.id.toString(),
                        sourceBranch: selectedBuild.sourceBranch,
                        sourceRepositoryId: selectedBuild.repository.id,
                        sourceRepositoryType: selectedBuild.repository.type,
                        sourceVersion: selectedBuild.sourceVersion,
                        sourcePullRequestVersion: null,
                        commitMessage: null
                    }
                };
                let environmentNames: string[] = releaseDefinition.environments.map((environment: any) => { return environment.name; });

                TestRunHelper._createOnDemandAutomatedRun(runManager, pointIds, plan.id).then((run: TCMContracts.TestRun) => {
                    let releaseService = Services.ServiceFactory.getService(Services.ServiceType.ReleaseManagement);
                    releaseService.then((service: TFS_RMService_LAZY_LOAD.ReleaseService) => {
                        service.createRelease(releaseDefinition.id, environmentNames, buildArtifact).then((release: RMContracts_LAZY_LOAD.Release) => {
                            let envId: number = TestRunHelper._setRunIDInSelectedEnvironment(release, releaseDefinitionEnvironmentId, run.id);
                            if (envId != -1) {
                                TestRunHelper._updateRunWithReleaseAndBuildDetails(runManager, run.id, release.id, envId, selectedBuild.id).then((updatedRun: TCMContracts.TestRun) => {
                                    service.updateRelease(release).then((release: RMContracts_LAZY_LOAD.Release) => {
                                        service.startReleaseEnvironment(release.id, envId).then(() => {
                                            successCallback(release, run);
                                            TelemetryService.publishEvents(TelemetryService.featureReleaseCreationFromAutomatedTestRunner, {
                                                ErrorCode: AutomatedTestRunErrorCode.NoError
                                            });
                                        }, (error) => { this.handleAutomatedTestRunError(Resources.TestRunError, error, AutomatedTestRunErrorCode.StartReleaseEnvironmentError, run, errorCallBack); });
                                    }, (error) => { this.handleAutomatedTestRunError(Resources.TestRunError, error, AutomatedTestRunErrorCode.UpdateReleaseError, run, errorCallBack); });
                                }, (error) => { this.handleAutomatedTestRunError(Resources.TestRunError, error, AutomatedTestRunErrorCode.UpdateTestRunError, run, errorCallBack); });
                            }
                        }, (error) => { this.handleAutomatedTestRunError(Resources.TestRunError, error, AutomatedTestRunErrorCode.CreateReleaseError, run, errorCallBack); });
                    }, (error) => { this.handleAutomatedTestRunError(Resources.TestRunError, error, AutomatedTestRunErrorCode.GetReleaseServiceError, run, errorCallBack); });
                }, (error) => { this.handleTestPointError(Resources.TestRunError, error, errorCallBack); });
            });
    }

    private static _getArtifactSourceAlias(releaseDefinition: RMContracts_LAZY_LOAD.ReleaseDefinition, buildDefinitionId: number): string {
        //Here multiple artifacts can be associated with the ReleaseDefinition. TODO: lets add validation check to check for no of artifact sources to be one .
        if (releaseDefinition.artifacts) {
            for (let i in releaseDefinition.artifacts) {
                if (Utils_String.equals(releaseDefinition.artifacts[i].sourceId,
                    Utils_String.format("{0}:{1}", TfsContext.getDefault().contextData.project.id, buildDefinitionId), true)) {
                    return releaseDefinition.artifacts[i].alias;
                }
            }
        }

        return Utils_String.empty;
    }

    /**
     * Puts runID in the input field of VSTest task and update the release
       This approach is not final yet and will be changed later
     * @param release
     * @param releaseDefinitionEnvironmentId
     * @param runId
     */
    private static _setRunIDInSelectedEnvironment(release: RMContracts_LAZY_LOAD.Release, releaseDefinitionEnvironmentId: number, runId: number): number {
        for (let i in release.environments) {
            if (release.environments[i].definitionEnvironmentId === releaseDefinitionEnvironmentId) {
                release.environments[i].variables[OnDemandConstants.testRunIdEnvVariable] = {
                    isSecret: false, value: runId.toString()
                } as RMContracts_LAZY_LOAD.ConfigurationVariableValue;

                for (let j in release.environments[i].deployPhasesSnapshot) {
                    for (let k in release.environments[i].deployPhasesSnapshot[j].workflowTasks) {
                        if (this.isValidTask(release.environments[i].deployPhasesSnapshot[j].workflowTasks[k])) {
                            release.environments[i].deployPhasesSnapshot[j].workflowTasks[k].inputs[OnDemandConstants.SupportedVSTestTask.testRunInput] = runId.toString();
                        }
                    }
                }
                return release.environments[i].id;
            }
        }
        return -1;
    }

    private static _updateRunWithReleaseAndBuildDetails(runManager: TestsOM_LAZY_LOAD.TestRunManager, runId: number,
        releaseId: number, releaseEnvironmentId: number, buildId: number): IPromise<TCMContracts.TestRun> {
        let updateModel: TCMContracts.RunUpdateModel = {
            build: { id: buildId.toString() } as TCMContracts.ShallowReference,
            releaseEnvironmentUri: Utils_String.format("vstfs:///ReleaseManagement/Environment/{0}", releaseEnvironmentId),
            releaseUri: Utils_String.format("vstfs:///ReleaseManagement/Release/{0}", releaseId)
        } as TCMContracts.RunUpdateModel;
        return runManager.update2(updateModel, runId);
    }

    private static _createOnDemandAutomatedRun(runManager: TestsOM_LAZY_LOAD.TestRunManager, pointIds: number[], planId: number): IPromise<TCMContracts.TestRun> {
        // default options are needed to start a run. Once a run is started the fields are updated. TODO: remove the unnecessary parameters from service and update here
        let runName = Utils_String.format("OnDemandTestRun {0}", new Date().toLocaleString());
        let runCreateModel: TCMContracts.RunCreateModel = {
            name: runName,
            automated: true,
            pointIds: pointIds,
            state: "NotStarted",
            dtlTestEnvironment: { id: "vstfs://dummy" } as TCMContracts.ShallowReference,
            plan: { id: planId.toString() } as TCMContracts.ShallowReference,
            filter: { sourceFilter: "*.dll", testCaseFilter: "" }
        } as TCMContracts.RunCreateModel;

        return runManager.createRun2(runCreateModel);
    }

    private static _getLatestBuildInBuildDefinition(buildDefinitionId: number): IPromise<number> {

        let deferred: Q.Deferred<number> = Q.defer<number>();
        VSS.using(["Presentation/Scripts/TFS/TFS.OM.Common",
            "Build.Common/Scripts/ClientContracts",
            "Build.Common/Scripts/Api2.2/ClientServices"],
            (
                TFS_OM_Common: typeof TFS_OM_Common_LAZY_LOAD,
                BuildClientContracts: typeof BuildClientContracts_LAZY_LOAD,
                BuildClientServices: typeof BuildClientServices_LAZY_LOAD) => {

                let buildService = TFS_OM_Common.ProjectCollection.getConnection(TfsContext.getDefault()).
                    getService<BuildClientServices_LAZY_LOAD.BuildClientService>(BuildClientServices.BuildClientService);

                let buildFilter: BuildClientContracts_LAZY_LOAD.IBuildFilter = {
                    definitions: buildDefinitionId.toString(),
                    statusFilter: BuildContracts.BuildStatus.Completed,
                    resultFilter: BuildContracts.BuildResult.Succeeded | BuildContracts.BuildResult.PartiallySucceeded,
                    $top: 1,
                    queryOrder: BuildContracts.BuildQueryOrder.FinishTimeDescending
                };

                buildService.getBuilds(buildFilter).then((buildResults: BuildClientContracts_LAZY_LOAD.GetBuildsResult) => {
                    if (buildResults && buildResults.builds && buildResults.builds.length) {
                        deferred.resolve(buildResults.builds[0].id);
                    }
                    deferred.resolve(null);
                }, (error) => {
                    deferred.reject(null);
                });
            });

        return deferred.promise;
    }

    /**
    * checks if the task is VSTest
    * @param taskId
    */
    public static isValidTask(workflowTask: RMContracts_LAZY_LOAD.WorkflowTask): boolean {
        if (workflowTask &&
            workflowTask.enabled &&
            Utils_String.equals(workflowTask.taskId, OnDemandConstants.SupportedVSTestTask.id, true)) {
            return true;
        }
        return false;
    }


    /**
     * Aborts run
     * @param run
     */
    private static _abortRun(run: TCMContracts.TestRun, errorMessage: string): void {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Utils"],
            (TMUtils: typeof TMUtils_LAZY_LOAD) => {
                let runUpdateModel: TCMContracts.RunUpdateModel = {
                    state: "Aborted",
                    errorMessage: errorMessage
                } as TCMContracts.RunUpdateModel;
                let runManager = TMUtils.getTestRunManager();
                runManager.update2(runUpdateModel, run.id);
            });
    }

    /**
     * The manual test runner will be launched in a new MTM client with selected datacollector and selected build,
    *  the selected Test points will become available for execution
     * @param testPoints
     * @param suite
     * @param plan
     * @param ownerId
     * @param selectedBuild
     * @param selectedDataCollectors
     * @param errorCallBack
     */
    public static runTestPointsUsingNewClient(testPoints: TCMLite.ITestPointModel[], suite: TCMLite.ITestSuiteModel, plan: any, ownerId: string, selectedBuild: string, selectedDataCollectors: string[], isDTR: boolean, errorCallBack: any) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement", "VSS/Events/Action"], (TestsOM: typeof TestsOM_LAZY_LOAD, Events_Action: typeof Events_Action_LAZY_LOAD) => {
            let settingName: string = (selectedDataCollectors && selectedDataCollectors.length > 0) ? selectedDataCollectors.join() : Resources.EmptyDataCollectorsSettings;
            this._createTestSettings(settingName, selectedDataCollectors, plan, (testSettingsId: number) => {
                this._createTestRun(testPoints, suite, plan, ownerId, selectedBuild, testSettingsId, (testRunAndResult) => {
                    let testRunId: number = testRunAndResult.testRun.testRunId;
                    var clientUrl: string;
                    if (isDTR) {
                        clientUrl  = TestsOM.UriHelper.getTestRunnerUri(testRunId, suite.id);
                    } else {
                        clientUrl = TestsOM.UriHelper.getNewClientMTRUri(testRunId);
                    }
                    if (isSafeProtocol(clientUrl)) {
                        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                            url: clientUrl,
                            target: "_self"
                        });
                    }
                },
                    (error) => {
                        this.handleTestPointError(Resources.TestRunError, error, errorCallBack);
                    });
            },
                (error) => {
                    this.handleTestPointError(Resources.TestRunError, error, errorCallBack);
                });

            TelemetryService.publishEvents(TelemetryService.featureRunTestUsingClient, {});
        });
    }

    public static resumeRun(testPoints: TCMLite.ITestPointModel[], suite: TCMLite.ITestSuiteModel, bugCategoryType: string, errorCallBack: any) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Utils"], (TMUtils: typeof TMUtils_LAZY_LOAD) => {
            let webRunner = new TMUtils.WebRunner();

            if (webRunner._checkForExistingMtrWindow()) {
                TMUtils.getTestRunManager().getTestRun(testPoints[0].mostRecentRunId, testPoints[0], (testRunAndResults) => {
                    testRunAndResults = TMUtils.TestCaseResultUtils.getIterationAndStepResultAttachments(testRunAndResults);
                    testRunAndResults.bugCategoryName = bugCategoryType;
                    webRunner._openRunInNewWindow(testRunAndResults, suite);
                },
                    (error) => {
                        this.handleTestPointError(Resources.TestRunnerStartResumeError, error, errorCallBack);
                    });
            }
        });
    }

    /**
     * Gives option for running the test points using XT.
     */
    public static runXT(testSuite: any, requirementId: number, selectedDataCollectors: string[], plan: any, errorCallBack: any) {
        let settingName: string = (selectedDataCollectors && selectedDataCollectors.length > 0) ? selectedDataCollectors.join() : Resources.EmptyDataCollectorsSettings;
        TestRunHelper._createTestSettings(settingName, selectedDataCollectors, plan, (testSettingsId: number) => {
            this._createXTClientSession(testSuite, requirementId, testSettingsId, plan, (session) => {
                let sessionId: number = session.id;
                let clientUrl: string = TestsOM_LAZY_LOAD.UriHelper.getNewXTClientUri(sessionId);

                if (Utils_Url.isSafeProtocol(clientUrl)) {
                    Events_Action_LAZY_LOAD.getService().performAction(Events_Action_LAZY_LOAD.CommonActions.ACTION_WINDOW_OPEN, {
                        url: clientUrl,
                        target: "_self"
                    });
                }
            });
        }, (error) => {
            this.handleTestPointError(Resources.TestRunError, error, errorCallBack);
        });
        TelemetryService.publishEvents(TelemetryService.featureExploreUsingXTClient, {});
    }

    /**
     * Creates a XT cleint session
     */
    public static _createXTClientSession(testSuite: any, requirementId: number, testSettingsId: number, plan: any, callback, errorCallback?) {
        let testSesion: any = TestRunHelper._populateAndGetTestSession(testSuite, requirementId, plan, testSettingsId);
        TMUtils_LAZY_LOAD.getTestSessionManager().createTestSession(testSesion).then((session) => {
            callback(session);
        }, (error) => {
            errorCallback(error);
        });
    }

    private static _populateAndGetTestSession(testSuite: any, requirementId: number, plan: any, testSettingsId?: number): any {
        let areaName = plan.areaPath;

        //TODO: change source after pankaj change
        let testSession = {
            area: { name: areaName, id: "", url: "" },
            comment: null,
            endDate: null,
            id: 0,
            lastUpdatedBy: null,
            lastUpdatedDate: null,
            owner: null,
            project: null,
            propertyBag: null,
            revision: 0,
            source: TCMContracts.TestSessionSource.XTDesktop2,
            startDate: null,
            state: TCMContracts.TestSessionState.NotStarted,
            title: "Session - " + Utils_Date.localeFormat(new Date(), Utils_Culture.getDateTimeFormat().FullDateTimePattern, true),
            url: null
        };

        testSession.propertyBag = { bag: {} };
        testSession.propertyBag.bag[TCMConstants.TestSessionPropertyBagKeys.testSettingsId] = testSettingsId.toString();
        testSession.propertyBag.bag[TCMConstants.TestSessionPropertyBagKeys.requirementId] = requirementId.toString();
        testSession.propertyBag.bag[TCMConstants.TestSessionPropertyBagKeys.testPlanId] = plan.id;
        return testSession;
    }

    private static _createTestRun(testPoints: any, suite: TCMLite.ITestSuiteModel, plan: any, ownerId: string, selectedBuildUri: string, testSettingsId: number, callback: any, errorCallback: any) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Utils"], (TMUtils: typeof TMUtils_LAZY_LOAD) => {
            this.validateSelectedTestPoints(testPoints).then(() => {
                let testRunDetails = this._populateAndGetTestRunDetails(plan, suite, ownerId, selectedBuildUri, testSettingsId);
                this._populateAndGetTestRunDetails(plan, suite, ownerId, selectedBuildUri, testSettingsId).then((testRunDetails) => {
                    TMUtils.getTestRunManager().create(testRunDetails, testPoints, (testRunAndResults) => {
                        callback(testRunAndResults);
                    },
                        (error) => {
                            this.handleTestPointError(Resources.TestRunError, error, errorCallback);
                        });
                });
            });

        });
    }

    private static _createTestSettings(name: string, dataCollectors: string[], plan: any, callback: any, errorCallBack?: any): void {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.TestSettingsHelper"], (
            RunWithOptionsModule: typeof RunSettingsHelper_LAZY_LOAD
        ) => {
            let testSettingsManager = new RunWithOptionsModule.TestSettingsManager();
            testSettingsManager.createTestSettings(plan.areaPath, dataCollectors, name).then((runSettingId: number) => {
                callback(runSettingId);
            },
                (error) => {
                    this.handleTestPointError(Resources.TestRunError, error, errorCallBack);
                }
            );
        });
    }

    /**
     * Validates whether the test points can be run with MTR
     * @param testPoints
     * @param blockAutomatedTestPoints
     */
    public static validateSelectedTestPoints(testPoints: TCMLite.ITestPointModel[], blockAutomatedTestPoints?: boolean): IPromise<void> {
        return this.validateSelectedTestPointsforRunningManually(testPoints, blockAutomatedTestPoints)
            .then(() => this._validateTestPointsCount(testPoints));
    }

    /**
     * Validates whether the test points can be run manually
     * @param testPoints
     * @param blockAutomatedTestPoints
     */
    public static validateSelectedTestPointsforRunningManually(testPoints: TCMLite.ITestPointModel[], blockAutomatedTestPoints?: boolean): IPromise<void> {
        let deferred = Q.defer<void>();
        if (this._areThereAutomatedTests(testPoints)) {
            if (blockAutomatedTestPoints) {
                ConfirmationDialog.openAlertDialog(Resources.RunContainsAutomatedPointsError,
                    () => {
                        deferred.reject(Resources.RunContainsAutomatedPointsError);
                    });
            }
            else {
                // if there is a mix of automated tests then we want to ask user to run manually
                ConfirmationDialog.openConfirmationDialog(Resources.RunContainsAutomatedPointsWarning,
                    () => {
                        deferred.resolve(null);
                    },
                    () => {
                        deferred.reject(Resources.RunContainsAutomatedPointsWarning);
                    });
            }
        } else {
            deferred.resolve(null);
        }
        return deferred.promise;
    }

    /**
     * validates whether the test run count is more than the supported limit for manual test runner
     * @param testPoints
     */
    private static _validateTestPointsCount(testPoints: TCMLite.ITestPointModel[]) {
        let deferred = Q.defer<void>();
        if (testPoints.length > TCMLite.Constants.runnerTestPointCountLimit) {
            ConfirmationDialog.openAlertDialog(Resources.TestCasesOverLoadError,
                () => {
                    deferred.reject(Resources.TestCasesOverLoadError);
                });
        } else {
            deferred.resolve(null);
        }
        return deferred.promise;
    }

    /**
     * Returns true if all tests are automated
     * @param testPoints
     */
    public static areAllTestsAutomated(testPoints: TCMLite.ITestPointModel[]): boolean {
        return testPoints.every(testPoint => testPoint.automated);
    }

    /**
     * Returns true if any of the testPoints passed as parameter are automated.
     * @param testPoints
     */
    private static _areThereAutomatedTests(testPoints: TCMLite.ITestPointModel[]): boolean {
        return testPoints.some(testPoint => testPoint.automated);
    }

    private static handleAutomatedTestRunError(message: string, error, errorCode: number, run: TCMContracts.TestRun, errorCallBack: any) {
        TelemetryService.publishEvents(TelemetryService.featureReleaseCreationFromAutomatedTestRunner, {
            ErrorCode: errorCode,
            ErrorMessage: VSS.getErrorMessage(error),
        });
        this._abortRun(run, message);
        TestRunHelper.handleTestPointError(message, error, errorCallBack);
    }

    private static handleTestPointError(message: string, error, errorCallBack: any) {
        errorCallBack(Utils_String.format("{0} {1}", message, VSS.getErrorMessage(error)));
    }

    private static _populateAndGetTestRunDetails(plan: any, selectedSuite: TCMLite.ITestSuiteModel, ownerId: any, selectedBuildUri?: string, testSettingsId?: number): IPromise<any> {

        let deferred: Q.Deferred<any> = Q.defer<any>();
        let buildUri = selectedBuildUri ? selectedBuildUri : plan.buildUri;
        let testRunDetails: any = {
            owner: ownerId,
            title: selectedSuite ? Utils_String.format(Resources.BulkMarkRunTitle, selectedSuite.name) : "",
            iteration: plan.iteration,
            buildUri: buildUri,
            state: TCMConstants.TestRunState.InProgress,
            isAutomated: false,
            testPlanId: plan.id
        };
        if (testSettingsId > 0) {
            testRunDetails.testSettingsId = testSettingsId;
        }

        // try fetching latest build if the buildUri is not set 
        if (!testRunDetails.buildUri && plan.buildDefinitionId) {
            this._getLatestBuildInBuildDefinition(plan.buildDefinitionId).then((buildId: number) => {

                if (buildId) {
                    testRunDetails.buildUri = LinkingUtilities.encodeUri({
                        tool: Artifacts_Constants.ToolNames.TeamBuild,
                        type: Artifacts_Constants.ArtifactTypeNames.Build,
                        id: buildId.toString()
                    });
                }
                deferred.resolve(testRunDetails);
            },
                (error) => {
                    deferred.resolve(testRunDetails);
                }
            );
        }
        else {
            deferred.resolve(testRunDetails);
        }
        return deferred.promise;
    }

    private static _automatedTestRunHelper: TCMAutomatedTestRunHelper_LAZY_LOAD.AutomatedTestRunHelper;
}

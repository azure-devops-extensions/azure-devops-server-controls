import {
    AutomatedTestRunActionsHub, IAutomatedTestRunOptions, IReleaseCreationInfo, ICapabilitiesCheckCompletedPayload
} from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Actions/AutomatedTestRunActionsHub";
import { AutomatedTestsValidationSource } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Sources/AutomatedTestsValidationSource";
import { SupportedVSTestTask } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Constants";
import * as TCMTestRunHelper from "TestManagement/Scripts/TFS.TestManagement.TestRunHelper";
import * as Services_LAZY_LOAD from "TestManagement/Scripts/Services/Services.Common";
import * as  TFS_RMService_LAZY_LOAD from "TestManagement/Scripts/Services/TFS.ReleaseManagement.Service";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Utils_Core from "VSS/Utils/Core";
import * as VSS from "VSS/VSS";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import * as Q from "q";

export class AutomatedTestRunActionsCreator {

    constructor(private _actionsHub: AutomatedTestRunActionsHub, private _source: AutomatedTestsValidationSource) {
    }

    public startOnDemandValidations(runOptions: IAutomatedTestRunOptions): void {
        this._runOptions = runOptions;
        this._actionsHub.automatedTestsDiscovered.invoke(this._runOptions.automatedTestPointIds.length);
        if (!this._runOptions.automatedTestPointIds.length || !this._runOptions.selectedPlan) {
            return;
        }
        this._actionsHub.releaseEnvironmentTestRunCapabilitiesCheckStarted.invoke(null);
        this._validateAssociatedTestPlanSettings()
            .then(() => this._checkForEnvironmentValidity())
            .then((isEnvironmentValid: boolean) => {
                if (isEnvironmentValid) {
                    this._triggerRelease();
                }
                this._actionsHub.releaseEnvironmentTestRunCapabilitiesCheckCompleted.invoke({
                    success: isEnvironmentValid
                } as ICapabilitiesCheckCompletedPayload);
            })
            .then(undefined, (reason) => {
                this._actionsHub.releaseEnvironmentTestRunCapabilitiesCheckCompleted.invoke({
                    success: false,
                    reason: reason ? reason.toString() : Resources.OnDemandFallbackErrorMessage
                } as ICapabilitiesCheckCompletedPayload);
            });
    }

    private _validateAssociatedTestPlanSettings(): IPromise<void> {
        const deferred = Q.defer<void>();
        if (!this._runOptions.selectedBuild) {
            if (!this._runOptions.selectedPlan.buildDefinitionId) {
                deferred.reject(Resources.NeedToAssociateBuild);
            } else {
                deferred.reject(Resources.AssociatedBuildDefinitionDeleted);
            }
        } else if (this._runOptions.selectedBuild.deleted) {
            deferred.reject(Resources.AssociatedBuildDefinitionDeleted);
        } else if (!this._runOptions.selectedReleaseDefinition) {
            if (!this._runOptions.selectedPlan.releaseEnvironmentDefinition ||
                !this._runOptions.selectedPlan.releaseEnvironmentDefinition.definitionId) {
                deferred.reject(Resources.NeedToAssociateStage);
            } else {
                deferred.reject(Resources.AssociatedReleaseDefinitionDeleted);
            }
        } else if (!this._runOptions.selectedReleaseEnvironmentId) {
            if (!this._runOptions.selectedPlan.releaseEnvironmentDefinition ||
                !this._runOptions.selectedPlan.releaseEnvironmentDefinition.environmentDefinitionId) {
                deferred.reject(Resources.NeedToAssociateStage);
            } else {
                deferred.reject(Resources.AssociatedStageDeleted);
            }
        } else {
            deferred.resolve(null);
        }
        return deferred.promise;
    }

    private _checkForEnvironmentValidity(): IPromise<boolean> {
        const deferred = Q.defer<boolean>();
        this._hasPermissionsToRunTests()
            .then((hasPermissions: boolean) => {
                if (!hasPermissions) {
                    deferred.reject(Resources.InsufficientPermissions);
                } else {
                    return this._isVsTestTaskPresentWithValidParameters();
                }
            })
            .then((isPresent: boolean) => {
                deferred.resolve(isPresent);
            }, (reason) => {
                deferred.reject(reason);
            });
        return deferred.promise;
    }

    private _hasPermissionsToRunTests(): IPromise<boolean> {
        let deferred = Q.defer<boolean>();
        this._source.hasReleaseEditAndManagePermission(this._runOptions.selectedReleaseDefinition.id, this._runOptions.selectedReleaseEnvironmentId, this._runOptions.selectedReleaseDefinition ? this._runOptions.selectedReleaseDefinition.path : '')
            .then((hasPermission: boolean) => {
                deferred.resolve(hasPermission);
            }, (reason) => {
                deferred.reject(reason);
            });
        return deferred.promise;
    }

    private _isVsTestTaskPresentWithValidParameters(): IPromise<boolean> {
        let deferred = Q.defer<boolean>();
        this._source.getEnvironment(this._runOptions.selectedReleaseDefinition.id, this._runOptions.selectedReleaseEnvironmentId)
            .then((environment: RMContracts.ReleaseDefinitionEnvironment) => {
                const isPresent = Utils_Array.first(environment.deployPhases, deployPhase => !!Utils_Array.first(deployPhase.workflowTasks, workFlowTask => this._hasValidParameters(workFlowTask))) !== null;
                if (isPresent) {
                    deferred.resolve(isPresent);
                } else {
                    deferred.reject(Resources.SupportedVSTestTaskNotPresent);
                }
            }, (reason: any) => {
                deferred.reject(Resources.AssociatedStageDeleted);
            })
            .then(undefined, () => {
                deferred.reject(Resources.SupportedVSTestTaskNotPresent);
            });

        return deferred.promise;
    }

    private _hasValidParameters(workFlowTask: RMContracts.WorkflowTask): boolean {
        return this._isVsTestTask(workFlowTask) &&
            this._hasValidVersion(workFlowTask) &&
            this._isEnabled(workFlowTask) &&
            this._hasValidInputs(workFlowTask);

    }

    private _isVsTestTask(workFlowTask: RMContracts.WorkflowTask): boolean {
        return workFlowTask &&
            Utils_String.equals(workFlowTask.taskId, SupportedVSTestTask.id, true);
    }

    private _hasValidVersion(workFlowTask: RMContracts.WorkflowTask): boolean {
        return workFlowTask &&
            workFlowTask.version &&
            Utils_String.equals(workFlowTask.version.split(".")[0], SupportedVSTestTask.version.toString());
    }

    private _hasValidInputs(workFlowTask: RMContracts.WorkflowTask): boolean {
        return workFlowTask &&
            workFlowTask.inputs &&
            Object.keys(SupportedVSTestTask.inputs).every(key => Utils_String.equals(workFlowTask.inputs[key], SupportedVSTestTask.inputs[key], true));
    }

    private _isEnabled(workFlowTask: RMContracts.WorkflowTask): boolean {
        return workFlowTask.enabled;
    }

    private _triggerRelease(): void {
        this._actionsHub.triggeringRelease.invoke(null);
        this._source.runAutomatedTestPoints(
            this._runOptions.automatedTestPointIds,
            this._runOptions.selectedPlan,
            this._runOptions.selectedBuild,
            this._runOptions.selectedReleaseDefinition,
            this._runOptions.selectedReleaseEnvironmentId,
            this._onReleaseTriggered,
            this._onReleaseTriggerError);
    }

    private _onReleaseTriggered = (release: RMContracts.Release, run: TCMContracts.TestRun): void => {
        const releaseCreationInfo: IReleaseCreationInfo = {
            releaseUrl: release._links.web.href.replace("&_a=release-summary", "&_a=release-logs"),
            releaseName: release.name,
            testRunUrl: run.webAccessUrl
        };
        this._actionsHub.triggeredRelease.invoke(releaseCreationInfo);
    }

    private _onReleaseTriggerError = (errorMessage: string): void => {
        this._actionsHub.triggeringReleaseError.invoke(errorMessage);
    }

    public closeDialog(): void {
        this._actionsHub.closeDialog.invoke(null);
    }

    private _runOptions: IAutomatedTestRunOptions;
}
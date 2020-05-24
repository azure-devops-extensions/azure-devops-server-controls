import * as Q from "q";

import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { OverlayPanelActionsCreator } from "DistributedTaskControls/Actions/OverlayPanelActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Feature, Properties, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { LoadableComponentActionsHub } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentActionsHub";

import { MessageBarType } from "OfficeFabric/MessageBar";

import { ApproveMultipleEnvironmentsPanelActions, IApprovableEnvironments, IDetailedReleaseApprovalData, IEnvironmentApproveProgressState, IEnvironmentSkeleton } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproveMultipleEnvironmentsPanelActions";
import { ReleaseApprovalUtility } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalUtility";
import { ReleaseEnvironmentActionsStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentActionsStore";
import { CanvasSelectorConstants, ReleaseProgressActionCreatorKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionCreator";
import { ReleaseEnvironmentHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentHelper";
import { ReleaseEnvironmentAction } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseApprovalSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseApprovalSource";
import { ReleaseEnvironmentDeploymentSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseEnvironmentDeploymentSource";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { Release, ReleaseApproval, ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";
import * as Utils_String from "VSS/Utils/String";

export class ApproveMultipleEnvironmentsPanelActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return ReleaseProgressActionCreatorKeys.ApprovalMultipleEnvironmentsPanel;
    }

    public initialize(instanceId?: string): void {
        this._instanceId = instanceId;
        this._releaseActionCreator = ActionCreatorManager.GetActionCreator<ReleaseActionCreator>(ReleaseActionCreator);
        this._actionsHub = ActionsHubManager.GetActionsHub<ApproveMultipleEnvironmentsPanelActions>(ApproveMultipleEnvironmentsPanelActions, instanceId);
        this._loadableComponentActionsHub = ActionsHubManager.GetActionsHub<LoadableComponentActionsHub>(LoadableComponentActionsHub, instanceId + ApproveMultipleEnvironmentsPanelActions.SOURCE_KEY);
        this._messageHandlerActionsCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);

        this._approvalUtility = new ReleaseApprovalUtility();
    }

    public fetchApprovalsRetry(releaseDefinitionId: number, currentReleaseId: number, environments: ReleaseEnvironment[], projectId: string) {
        this._loadableComponentActionsHub.showLoadingExperience.invoke({});
        this._messageHandlerActionsCreator.dismissMessage(this._instanceId + ApproveMultipleEnvironmentsPanelActions.SOURCE_KEY);
        this.initializeData(releaseDefinitionId, currentReleaseId, environments, projectId);
    }

    public initializeData(releaseDefinitionId: number, currentReleaseId: number, environments: ReleaseEnvironment[], projectId: string): IPromise<void> {
        //set approvale environments skeleton
        let approvableEnvironments: IApprovableEnvironments = this._getApprovableEnvironments(environments);
        let isPreDeploy: boolean = false;
        let approvableEnvironmentsList: ReleaseEnvironment[];
        if (approvableEnvironments.preApprovableEnvironments.length > 0){
            isPreDeploy = true;
            approvableEnvironmentsList = approvableEnvironments.preApprovableEnvironments;
        }
        else {
            isPreDeploy = false;
            approvableEnvironmentsList = approvableEnvironments.postApprovableEnvironments;
        }

        let approvableEnvironmentsSkeleton = approvableEnvironmentsList.map((item: ReleaseEnvironment) => {
            return {
                id: item.id,
                name: item.name
            } as IEnvironmentSkeleton;
        });
        this._actionsHub.updateApprovableEnvironments.invoke(approvableEnvironmentsSkeleton); 

        //set approvals Data
        let approvalDataDict = this._getApprovalDataDictionary(currentReleaseId, projectId, approvableEnvironmentsList, isPreDeploy);
        return this._initializeActionableApprovals(currentReleaseId, approvalDataDict);
    }

    private _getApprovableEnvironments(environments: ReleaseEnvironment[]): IApprovableEnvironments
    {
        let preApprovableEnvironments: ReleaseEnvironment[] = [];
        let postApprovableEnvironments: ReleaseEnvironment[] = [];
        for (const environment of environments) {
            const environmentActionsStore = StoreManager.GetStore(ReleaseEnvironmentActionsStore, environment.id.toString());
            if (environmentActionsStore.isActionPermissible([ReleaseEnvironmentAction.PreDeployApprove])){
                preApprovableEnvironments.push(environment);
            }
            else if (environmentActionsStore.isActionPermissible([ReleaseEnvironmentAction.PostDeployApprove])){
                postApprovableEnvironments.push(environment);
            }
        }        
        return {
            preApprovableEnvironments: preApprovableEnvironments,
            postApprovableEnvironments: postApprovableEnvironments
        } as IApprovableEnvironments;
    }    

    private _initializeActionableApprovals(
        releaseId: number, 
        approvalsDataDict: IDictionaryNumberTo<IDetailedReleaseApprovalData>): IPromise<void> {

        this._loadableComponentActionsHub.showLoadingExperience.invoke({});
        
        //TODO: optimize this. There may be no need - Task 1236865
        return ReleaseApprovalSource.instance().getMyPendingApprovals(releaseId).then((releaseApprovals: ReleaseApproval[]) => {
            for (let releaseApproval of releaseApprovals){
                if (approvalsDataDict[releaseApproval.releaseEnvironment.id]){
                    for (let approvalItem of approvalsDataDict[releaseApproval.releaseEnvironment.id].approvalData.approvalItems ){
                        if (approvalItem.approval && releaseApproval.id === approvalItem.approval.id){
                            approvalItem.isItemActionable = true;
                        }
                    }
                }
            }
            this._actionsHub.updateApprovalData.invoke(approvalsDataDict);
            this._loadableComponentActionsHub.hideLoadingExperience.invoke({});
            this._messageHandlerActionsCreator.dismissMessage(this._instanceId + ApproveMultipleEnvironmentsPanelActions.SOURCE_KEY);
            this._actionsHub.updateErrorInFetchingApprovals.invoke(false);  
            return Q.resolve();                 
        }, (error: any) => {
            this._loadableComponentActionsHub.hideLoadingExperience.invoke({});
            this._handleError(error);
            return Q.reject(error);
        });
    }

    public deferAndApproveEnvironments(release: Release,
        environmentIds: number[], 
        deferTime: Date,
        approvalData: IDictionaryNumberTo<IDetailedReleaseApprovalData>,
        comment: string,
        applicableCount: number) {
            this._actionsHub.updateApprovalState.invoke(IEnvironmentApproveProgressState.InProgress);

            let promises: IPromise<any>[] = [];
            for (let environmentId of environmentIds) {
                promises.push(this._deferEnvironmentDeployment(environmentId, release.id, deferTime));
            }
            return Q.allSettled(promises).then((promisesState: Q.PromiseState<ReleaseEnvironment>[]) => {
                let isError = false;
                let errorMessages = {}; 
                let failedEnvironments = [];
                
                promisesState.forEach((promiseData: Q.PromiseState<ReleaseEnvironment>) => {
                    if (promiseData
                        && promiseData.state === "rejected"
                        && promiseData.reason) {
                        isError = true;
                        errorMessages[promiseData.reason.environmentName] = promiseData.reason.message ? promiseData.reason.message : promiseData.reason.error;
                    }
                });

                if (isError) {
                    let errorMessage = Resources.DeploymentFailedMultipleEnvironments;
                    for (let environmentName in errorMessages) {
                        errorMessage += "\n" + Utils_String.localeFormat(Resources.DeploymentFailedMultipleEnvironmentsFormat, environmentName, errorMessages[environmentName]) ;
                    }
                    this._actionsHub.updateErrorInApproval.invoke(errorMessage);
                    this.updateSelectedEnvironment([]);
                    this.fetchApprovalsRetry(release.releaseDefinition.id, release.id, release.environments, release.projectReference.id);
                    return Q.reject(errorMessage);
                }
                else {
                    this.approveEnvironments(release, environmentIds, approvalData, comment, applicableCount);
                    return Q.resolve();
                }
            });      
    } 

    public approveEnvironments(release: Release,
        environmentIds: number[], 
        approvalData: IDictionaryNumberTo<IDetailedReleaseApprovalData>,
        comment: string,
        applicableCount: number): IPromise<void> {
            this._publishButtonClickTelemetry(release.id, release.releaseDefinition.id,  comment ? true : false, environmentIds.length, applicableCount);
            this._actionsHub.updateApprovalState.invoke(IEnvironmentApproveProgressState.InProgress);
            const approvalsData = this._getApprovalsDataForAction(environmentIds, approvalData, comment);

            return this._approvalUtility.multipleApprove(approvalsData).then(() => {                    
                return this._handleSuccessfulAction(release);
            }, (error: any) => {
                return this._handleActionError(error, release);
            });
    } 

    public rejectEnvironments(release: Release,
        environmentIds: number[], 
        approvalData: IDictionaryNumberTo<IDetailedReleaseApprovalData>,
        comment: string,
        applicableCount: number): IPromise<void> {
            this._actionsHub.updateApprovalState.invoke(IEnvironmentApproveProgressState.InProgress);
            const approvalsData = this._getApprovalsDataForAction(environmentIds, approvalData, comment);

            return this._approvalUtility.multipleReject(approvalsData).then(() => {                    
                return this._handleSuccessfulAction(release);
            }, (error: any) => {
                return this._handleActionError(error, release);
            }); 
    } 

    public closePanel() {
        let overlayPanelActionsCreator = ActionCreatorManager.GetActionCreator<OverlayPanelActionsCreator>(OverlayPanelActionsCreator,
            CanvasSelectorConstants.ReleaseCanvasSelectorInstance);
        overlayPanelActionsCreator.hideOverlay();
    }

    public updateSelectedEnvironment(environmentIds: number[]) {
        this._actionsHub.updateSelectedEnvironments.invoke(environmentIds);
    }

    public updateDeferDeploymentEnabled(isEnabled: boolean) {
        this._actionsHub.updateDeferDeploymentEnabled.invoke(isEnabled);
    }

    public updateDeferDeploymentTime(time: Date) {
        this._actionsHub.updatedeploymentDeferredTiming.invoke(time);
    }

    private _getApprovalsDataForAction(environmentIds: number[], 
        approvalData: IDictionaryNumberTo<IDetailedReleaseApprovalData>,
        comment: string): IDetailedReleaseApprovalData[] {
            let approvalsData: IDetailedReleaseApprovalData[] = [];
            for (let environmentId of environmentIds) {
                for (let approvalItem of approvalData[environmentId].approvalData.approvalItems){
                    approvalItem.comments = comment;
                }
                approvalsData.push(approvalData[environmentId]);
            }
            return approvalsData;
    }

    private _publishButtonClickTelemetry(releaseId: number, 
        releaseDefinitionId: number, 
        isCommentPresent: boolean, 
        selectedEnvironmentCount: number, 
        applicableEnvironmentCount: number) {
        let feature: string = Feature.MultipleEnvironmentsApprove_Action;
        let eventProperties: IDictionaryStringTo<any> = {};

        eventProperties[Properties.ReleaseId] = releaseId;
        eventProperties[Properties.ReleaseDefinitionId] = releaseDefinitionId;
        eventProperties[Properties.IsCommentPresent] = isCommentPresent;
        eventProperties[Properties.ApplicableEnvironmentsCount] = applicableEnvironmentCount;
        eventProperties[Properties.ApprovalEnvironmentsCount] = selectedEnvironmentCount;

        Telemetry.instance().publishEvent(feature, eventProperties);
    }

    private _handleSuccessfulAction(release: Release): IPromise<void>{
        this._actionsHub.updateApprovalState.invoke(IEnvironmentApproveProgressState.Initial);
        this._releaseActionCreator.refreshRelease(release.id);
        this.closePanel();
        return Q.resolve();
    }

    private _handleActionError(error: any, release: Release): IPromise<void>{
        this._actionsHub.updateErrorInApproval.invoke(error.message);  
        this._releaseActionCreator.refreshRelease(release.id);
        this.updateSelectedEnvironment([]);
        this.fetchApprovalsRetry(release.releaseDefinition.id, release.id, release.environments, release.projectReference.id);
        return Q.reject(error);
    }

    private _deferEnvironmentDeployment(environmentId: number, releaseId: number, deferredDateTime: Date): IPromise<ReleaseEnvironment> {
        return ReleaseEnvironmentDeploymentSource.instance().deferEnvironmentDeployment(releaseId, environmentId, deferredDateTime);
    }

    private _getApprovalDataDictionary(releaseId: number, projectId: string, approvableEnvironments: ReleaseEnvironment[], isPreDeploy: boolean):  IDictionaryNumberTo<IDetailedReleaseApprovalData>{
        let approvalsDataDict: IDictionaryNumberTo<IDetailedReleaseApprovalData> = {};        

        for (let environment of approvableEnvironments) {
            let envhelper = new ReleaseEnvironmentHelper(environment, projectId);
            approvalsDataDict[environment.id] = {
                approvalData: isPreDeploy ? envhelper.getReleasePreApprovalsData() : envhelper.getReleasePostApprovalsData(),
                isPreDeploy: isPreDeploy
            };
        }
        return approvalsDataDict;
    }

    private _handleError(error): void {
        let errorMessage: string = error && error.message;
        if (errorMessage) {
            this._messageHandlerActionsCreator.addMessage(this._instanceId + ApproveMultipleEnvironmentsPanelActions.SOURCE_KEY, errorMessage, MessageBarType.error);
        }
        this._actionsHub.updateErrorInFetchingApprovals.invoke(true);
    }  
    
    private _releaseActionCreator: ReleaseActionCreator;
    private _actionsHub: ApproveMultipleEnvironmentsPanelActions;
    private _loadableComponentActionsHub: LoadableComponentActionsHub;
    private _messageHandlerActionsCreator: MessageHandlerActionsCreator;
    private _approvalUtility: ReleaseApprovalUtility;
    private _instanceId: string;
}
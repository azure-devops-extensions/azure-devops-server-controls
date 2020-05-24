import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";
import { IStoreState, StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { autobind } from "OfficeFabric/Utilities";
import { ApprovalOrderKeys } from "PipelineWorkflow/Scripts/Common/Types";
import {
    ApproveMultipleEnvironmentsPanelActions,
    IApprovalDataForList,
    IDetailedReleaseApprovalData,
    IEnvironmentApproveProgressState,
    IEnvironmentSkeleton,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproveMultipleEnvironmentsPanelActions";
import { IReleaseApprovalItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentApprovalTypes";
import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as Utils_String from "VSS/Utils/String";

export interface IApproveMultipleEnvironmentsPanelItemViewState extends IStoreState {
    approvableEnvironments: IEnvironmentSkeleton[];
    selectedEnvironmentIds: number[];

    isDeferDeploymentEnabled: boolean;
    deploymentDeferredTiming: Date;

    approveErrorMessage: string;
    approveComment: string;
    approveProgressState: IEnvironmentApproveProgressState;  

    approvalData: IDictionaryNumberTo<IDetailedReleaseApprovalData>;
    fetchingApprovalsError: boolean;
}

export class ApprovalMultipleEnvironmentsPanelViewStore extends StoreBase {
    public static getKey(): string {
        return ReleaseProgressStoreKeys.ApprovalMultipleEnvironmentsPanelViewStore;
    }

    public initialize(instanceId: string): void {

         this._setInitialState();

        this._actionsHub = ActionsHubManager.GetActionsHub<ApproveMultipleEnvironmentsPanelActions>(ApproveMultipleEnvironmentsPanelActions, instanceId);
        this._actionsHub.updateApprovalData.addListener(this.updateApprovalData);
        this._actionsHub.updateErrorInFetchingApprovals.addListener(this._updateErrorInFetchingApprovals);
        this._actionsHub.updateApprovalState.addListener(this._updateApprovalState);
        this._actionsHub.updateErrorInApproval.addListener(this._updateErrorInApproval);
        this._actionsHub.updateApprovableEnvironments.addListener(this._updateApprovableEnvironments);
        this._actionsHub.updateDeferDeploymentEnabled.addListener(this.updateDeferDeploymentEnabled);
        this._actionsHub.updatedeploymentDeferredTiming.addListener(this.updatedeploymentDeferredTiming);
        this._actionsHub.updateSelectedEnvironments.addListener(this.updateSelectedEnvironments);

        this._onDataStoreChanged();
    }

    private _setInitialState(): void {
        this._state = {
            approveProgressState: IEnvironmentApproveProgressState.Initial,
            approvalData: {},
            selectedEnvironmentIds: [],
            approvableEnvironments: [],
            isDeferDeploymentEnabled: false,
            deploymentDeferredTiming: new Date(),
        } as IApproveMultipleEnvironmentsPanelItemViewState;
    }

    protected disposeInternal(): void {
        this._actionsHub.updateApprovalData.removeListener(this.updateApprovalData);
        this._actionsHub.updateErrorInFetchingApprovals.removeListener(this._updateErrorInFetchingApprovals);
        this._actionsHub.updateApprovalState.removeListener(this._updateApprovalState);
        this._actionsHub.updateErrorInApproval.removeListener(this._updateErrorInApproval);
        this._actionsHub.updateApprovableEnvironments.removeListener(this._updateApprovableEnvironments);
        this._actionsHub.updateDeferDeploymentEnabled.removeListener(this.updateDeferDeploymentEnabled);
        this._actionsHub.updatedeploymentDeferredTiming.removeListener(this.updatedeploymentDeferredTiming);
        this._actionsHub.updateSelectedEnvironments.removeListener(this.updateSelectedEnvironments);
    }

    public getState(): IApproveMultipleEnvironmentsPanelItemViewState {
        return this._state;
    }

    public isPreDeployApprovalPresent(){
        let isPreDeploy = false;
        for (const environmentId in this._state.approvalData) {
            if (this._state.approvalData.hasOwnProperty(environmentId) && this._state.approvalData[environmentId].isPreDeploy) {
                isPreDeploy = true;
            }
        }
        return isPreDeploy;
    }

    public getApprovalDataForEnvironmentList(): IDictionaryNumberTo<IApprovalDataForList>{
        let approvalDataForList: IDictionaryNumberTo<IApprovalDataForList> = {};
        for (const environmentId in this._state.approvalData) {
            if (this._state.approvalData.hasOwnProperty(environmentId)) {
                const approvalData = this._state.approvalData[environmentId];   
                approvalDataForList[environmentId] = this.getApprovalDataForEachEnvironment(approvalData);
            }            
        }
        return approvalDataForList;
    }

    public getApprovalDataForEachEnvironment(approvalData: IDetailedReleaseApprovalData): IApprovalDataForList {            
            let alreadyApproved: IReleaseApprovalItem[] = [];
            let currentlyApproving: IReleaseApprovalItem[] = [];
            let toBeApproved: IReleaseApprovalItem[] = [];

            let deferredTime: Date = new Date();
            let isDeferred: boolean = false;

            for (let approvalItem of approvalData.approvalData.approvalItems){
                if (approvalItem.approval && approvalItem.approval.approvedBy){
                    alreadyApproved.push(approvalItem);
                }   
                else if (approvalData.approvalData.approvalOrder ===  ApprovalOrderKeys.anyOneUserKey || approvalItem.isItemActionable) {
                    if (approvalItem.isItemActionable){
                        currentlyApproving.unshift(approvalItem);
                    }
                    else{
                        currentlyApproving.push(approvalItem);
                    }
                }
                else{
                    toBeApproved.push(approvalItem);
                }
                if (approvalItem.deferDeploymentProps 
                    && approvalItem.deferDeploymentProps.isDeferDeploymentEnabled
                    && deferredTime < approvalItem.deferDeploymentProps.scheduledDeploymentTime) {
                    deferredTime = approvalItem.deferDeploymentProps.scheduledDeploymentTime;
                    isDeferred = true;
                } 
            }
            let deferApprovalMessage = Utils_String.localeFormat(
                Resources.ApprovalsDeferredAndApproved, 
                new FriendlyDate(new Date(deferredTime), 
                PastDateMode.ago, 
                true).toString());

            return {
                currentlyApproving: currentlyApproving,
                alreadyApproved: alreadyApproved,
                pendingApprovals: toBeApproved,
                isDeferred: isDeferred,
                deferApprovalMessage: deferApprovalMessage,
            } as IApprovalDataForList;

    }

    private _onDataStoreChanged = (): void => {
        this.emitChanged();
    }

    @autobind
    private _updateApprovableEnvironments(environments: IEnvironmentSkeleton[]): void {
        this._state.approvableEnvironments = environments;
        this.emitChanged();
    }


    @autobind
    private _updateApprovalState(state: IEnvironmentApproveProgressState): void {
        this._state.approveProgressState = state;
        this.emitChanged();
    }

    @autobind
    private _updateErrorInApproval(errorMessage: string): void {
        this._state.approveErrorMessage = errorMessage;
        this._state.approveProgressState = IEnvironmentApproveProgressState.Error;
        this.emitChanged();
    }

    @autobind
    private _updateErrorInFetchingApprovals(errorMessage: boolean): void {
        this._state.fetchingApprovalsError = errorMessage;
        this.emitChanged();
    }

    @autobind
    private updateApprovalData(approvalData: IDictionaryNumberTo<IDetailedReleaseApprovalData>): void {
        this._state.approvalData = approvalData;
        this.emitChanged();
    }

    @autobind
    private updateDeferDeploymentEnabled(enabled: boolean): void {
        this._state.isDeferDeploymentEnabled = enabled;
        this.emitChanged();
    }

    @autobind
    private updatedeploymentDeferredTiming(time: Date): void {
        this._state.deploymentDeferredTiming = time;
        this.emitChanged();
    }

    @autobind
    private updateSelectedEnvironments(selectedIds: number[]): void {
        this._state.selectedEnvironmentIds = selectedIds;
        this.emitChanged();
    }

    private _actionsHub: ApproveMultipleEnvironmentsPanelActions;
    
    private _state: IApproveMultipleEnvironmentsPanelItemViewState;
}
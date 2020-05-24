import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { JobStates } from "DistributedTaskUI/Logs/Logs.Types";

import { SpinnerSize } from "OfficeFabric/Spinner";

import { DeploymentGroupInProgressGrid, IDeploymentGroupInProgressGridProps, IDeploymentGroupGridItemContent } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentGroupInProgressGrid";
import { DeploymentGroupInProgressSummary, IDeploymentGroupInProgressSummaryProps, IPhaseStatusCounts } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentGroupInProgressSummary";
import { IReleaseEnvironmentAgentPhaseInProgressContentProps } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentAgentPhaseInProgressContent";
import { ReleasePhaseHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/ReleasePhaseHelper";
import { IInprogressPhaseStatus, IJobInfo, IDeploymentGroupPhaseMachineData } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import {
    ReleaseDeploymentAttemptHelper
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";

import { TaskStatus } from "ReleaseManagement/Core/Contracts";

import { DeploymentMachine } from "TFS/DistributedTask/Contracts";

import { format } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentGroupInProgressPhaseContent";

export interface IDeploymentGroupInProgressPhaseContentProps extends IReleaseEnvironmentAgentPhaseInProgressContentProps {
    deploymentGroupPhaseMachinesData: IDeploymentGroupPhaseMachineData;
}

export interface IDeploymentGroupInProgressPhaseContentState {
    deploymentGroupPhaseMachineCount: number;
}

export class DeploymentGroupInProgressPhaseContent extends Base.Component<IDeploymentGroupInProgressPhaseContentProps, IDeploymentGroupInProgressPhaseContentState>{

    public componentDidMount(): void {
        if (this.props.deploymentGroupPhaseMachinesData) {
            const deploymentGroupPhaseMachinesPromise = ReleaseDeploymentAttemptHelper.getDeploymentGroupPhaseMachines(this.props.deploymentGroupPhaseMachinesData.queueId,
                this.props.deploymentGroupPhaseMachinesData.tags);

            deploymentGroupPhaseMachinesPromise.then((deploymentMachines: DeploymentMachine[]) => {
                this.setState({ deploymentGroupPhaseMachineCount: deploymentMachines.length });
            },
                (error) => {
                    // TODO: Add a retry mechanism in case the call fails
                    this._setCurrentMachineCountAsTotal();
                });
        }
        else {
            this._setCurrentMachineCountAsTotal();
        }
    }

    public render(): JSX.Element {

        const inProgressStatus = this.props.inprogressStatus;
        let showSummary: boolean = false;

        let machinesJobStatus: IJobInfo[] = [];
        let itemCount = 0;
        let phaseCounts: IPhaseStatusCounts;

        let deploymentGridProps: IDeploymentGroupInProgressGridProps = null;
        let deploymentSummaryProps: IDeploymentGroupInProgressSummaryProps = null;

        if (this.props.inProgressPhaseStatus) {
            machinesJobStatus = this.props.inProgressPhaseStatus.jobInfoList;
            itemCount = machinesJobStatus.length;
            machinesJobStatus.sort((a, b) => a.rank - b.rank);
        }

        // If the number of current items is less than total items, add padding.
        if (machinesJobStatus.length < this.state.deploymentGroupPhaseMachineCount) {
            let paddingLength = this.state.deploymentGroupPhaseMachineCount - machinesJobStatus.length;

            // The padding here represents machines which are valid targets but havent started executing the phase yet.
            for (let i = 0; i < paddingLength; i++) {
                machinesJobStatus.push(
                    {
                        id: null,
                        name: null,
                        taskStatusList: null,
                        tasksCount: null,
                        status: null,
                        rank: machinesJobStatus.length + i // We are adding a dummy rank for pending machines, which is greater than all valid rank values.
                    });
            }
        }
        
        // Count the number of machines in various states
        phaseCounts = this._computeMachineStatusCount(machinesJobStatus);

        if (machinesJobStatus.length > DeploymentGroupInProgressPhaseContent._maxGridSize) {
            showSummary = true;
        }

        let gridItems: IDeploymentGroupGridItemContent[] = DeploymentGroupInProgressPhaseContent._convertTaskStatusToJobStates(machinesJobStatus);

        deploymentGridProps = { items: gridItems, runningItemCount: phaseCounts.runningCount, maxGridSize: DeploymentGroupInProgressPhaseContent._maxGridSize };

        if (showSummary) {
            deploymentSummaryProps = { phaseCounts: phaseCounts };
        }


        if (this.state.deploymentGroupPhaseMachineCount) {
            return (
                <div className="deployment-group-phase-details-container">
                    <div className="deployment-group-phase-details-upper-section">
                        {this._getTargetCountComponent(this.state.deploymentGroupPhaseMachineCount)}
                        <DeploymentGroupInProgressGrid {...deploymentGridProps} />
                    </div>
                    {showSummary && <DeploymentGroupInProgressSummary {...deploymentSummaryProps} />}
                </div>
            );
        }

        return <div className="deployment-group-phase-details-container">
            <LoadingComponent className={"deployment-group-phase-loading-spinner"} size={SpinnerSize.medium} ariaLabel={Resources.Loading} />
        </div>;
    }

    // This function is to convert the status of the jobs from TaskStates (as received on canvas) to JobStates.
    private static _convertTaskStatusToJobStates(machinesJobStatus: IJobInfo[]): IDeploymentGroupGridItemContent[] {
        return machinesJobStatus.map((item) => {
            let jobState: JobStates = ReleasePhaseHelper.convertStatusToJobState(item.status);

            return {
                jobState: jobState
            } as IDeploymentGroupGridItemContent;
        });
    }

    private _getTargetCountComponent(itemCount): JSX.Element {
        let targetsLabelText = "";

        if (itemCount === 1) {
            targetsLabelText = Resources.DeploymentGroupsProgressTargetText;
        }
        else {
            targetsLabelText = Resources.DeploymentGroupsProgressTargetsText;
        }

        return <div className="deployment-groups-targets">
            <div className="target-count target-text">{itemCount}</div>
            <div className="target-label target-text">{targetsLabelText}</div>
        </div>;
    }

    private _computeMachineStatusCount(machinesJobStatus: IJobInfo[]) {
        let counts: IPhaseStatusCounts = {
            completedCount: 0,
            partiallySucceededCount: 0,
            runningCount: 0,
            failedCount: 0
        };

        machinesJobStatus.map((machineJobStatus: IJobInfo) => {
            if (machineJobStatus && machineJobStatus.status) {

                switch (machineJobStatus.status) {
                    case TaskStatus.Succeeded:
                    counts.completedCount++;
                    break;
                    
                    case TaskStatus.PartiallySucceeded:
                    counts.partiallySucceededCount++;
                    break;
                    
                    case TaskStatus.InProgress:
                    counts.runningCount++;
                    break;
                    
                    case TaskStatus.Skipped:
                    case TaskStatus.Failed:
                    case TaskStatus.Canceled:
                        counts.failedCount++;
                        break;
                }
            }
        });

        return counts;
    }

    private _setCurrentMachineCountAsTotal() {
        // In case a promise which returns the total machine count was not provided, or if the call failed with an error
        // we just show the number of machines currently running the phase as the total target count.        

        let machineCount = 0;
        let inProgressPhaseStatus = this.props.inProgressPhaseStatus;
        if (inProgressPhaseStatus
            && inProgressPhaseStatus.jobInfoList
            && inProgressPhaseStatus.jobInfoList.length > 0) {
            machineCount = inProgressPhaseStatus.jobInfoList.length;
        }

        this.setState({ deploymentGroupPhaseMachineCount: machineCount });
    }

    private static readonly _maxGridSize = 21;
}
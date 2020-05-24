import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { AgentsSource } from "DistributedTaskControls/Sources/AgentsSource";
import { TagList } from "DistributedTaskControls/Components/TagList";
import { DeployPhaseUtilities } from "DistributedTaskControls/Phase/DeployPhaseUtilities";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { SpinnerSize } from "OfficeFabric/Spinner";

import { DeploymentMachineGroup } from "TFS/DistributedTask/Contracts";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentGroupSummarySecondaryDetails";

export interface IDeploymentGroupSummarySecondaryDetailsProps extends ComponentBase.IProps {
    tags: string[];
    machineGroupId: number;
}

export interface IDeploymentGroupSummarySecondaryDetailsState extends ComponentBase.IState {
    fetchMgInProgress?: boolean;
    mgName?: string;
    mgUrl?: string;
}

export class DeploymentGroupSummarySecondaryDetails extends ComponentBase.Component<IDeploymentGroupSummarySecondaryDetailsProps, IDeploymentGroupSummarySecondaryDetailsState>  {

    public componentDidMount(): void {
        this._fetchMachineGroupDetails();
    }

    public render(): JSX.Element {
        return (
            <div className="dg-group-summary-secondary-details-container">
                {this.state.fetchMgInProgress ? this._getQueueLoadingComponent() : this._getMgDetailsSection()}
            </div>
        );
    }

    private _getMgDetailsSection(): JSX.Element {
        return (
            <div className="machine-group-details-section">
                {this._getDgNameSection()}
                {this._getTagsSection()}
            </div>
        );
    }

    private _getTagsSection(): JSX.Element {
        return (
            <TagList 
                tags={this.props.tags}
                tagItemClassName={"phase-summary-tag-item"}
                ariaLevel={3}
            />
        );
    }

    private _getQueueLoadingComponent(): JSX.Element {
        return (
            <div className="mg-loading-component">
                <div className="mg-loading-spinner">
                    <LoadingComponent
                        className={"mg-fetch-spinner"}
                        size={SpinnerSize.xSmall}
                    />
                </div>
                <div className="mg-loading-text">{"Fetching machine group"}</div>
            </div>
        );
    }

    private _getDgNameSection(): JSX.Element {
        if (this.state.mgName) {
            return (
                <div className="mg-details-section">
                    <div className="mg-name-title">{Resources.DeploymentGroupLabel}</div>
                    <SafeLink
                        className={"mg-name-link"}
                        href={this.state.mgUrl}
                        target="_blank"
                        allowRelative={true}
                        aria-label={this.state.mgName}>
                        {this.state.mgName}
                    </SafeLink>
                </div>
            );
        } else {
            return null;
        }
    }

    private _fetchMachineGroupDetails(): void {
        if (this.props.machineGroupId > 0) {
            this.setState({ fetchMgInProgress: true });
            AgentsSource.instance().getDeploymentMachineGroup(this.props.machineGroupId).then(
                (machineGroup: DeploymentMachineGroup) => {
                    if (machineGroup) {
                        let machineGroupUrl: string = DeployPhaseUtilities.getMachinePageUrl(this.props.machineGroupId);
                        this.setState({ fetchMgInProgress: false, mgName: machineGroup.name, mgUrl: machineGroupUrl });
                    } else {
                        this.setState({ fetchMgInProgress: false });
                    }
                },
                (error) => {
                    // eat any error and dont show the machine group details
                    this.setState({ fetchMgInProgress: false });
                });
        }
    }
}

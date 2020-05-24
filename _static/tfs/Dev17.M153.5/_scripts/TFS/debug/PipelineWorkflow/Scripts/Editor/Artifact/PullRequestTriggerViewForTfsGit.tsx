import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { FilterListComponent } from "DistributedTaskControls/Components/FilterListComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { ConnectedServiceEndpointSource } from "DistributedTaskControls/Sources/ConnectedServiceEndpointSource";
import { ArtifactSource } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactSource";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { PullRequestFilter } from "ReleaseManagement/Core/Contracts";
import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";
import { InputValue, InputValues, InputValuesQuery } from "VSS/Common/Contracts/FormInput";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Core from "VSS/Utils/Core";

//import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerViewForTfsGit";
import { BranchFilterComponent } from "DistributedTaskControls/Components/BranchFilterComponent";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerViewForTfsGit";
import { BuildBranchFilterComponent } from "DistributedTaskControls/Components/BuildBranchFilterComponent";
import { BranchFilterListItem } from "PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerViewForBuildArtifactAndTfsGitSCM";

export interface IPullRequestTriggerViewForTfsGitProps extends ComponentBase.IProps {
    filters: PullRequestFilter[];
    onFilterChange: (index: number, value: PullRequestFilter) => void;
    onFilterDelete: (rowIndex: number) => void;
    onAddFilterClick: (event?: React.MouseEvent<HTMLButtonElement>) => void;
    repositoryId: string;
}

export class PullRequestTriggerViewForTfsGit extends ComponentBase.Component<IPullRequestTriggerViewForTfsGitProps, ComponentBase.IStateless> {

    public constructor(props: IPullRequestTriggerViewForTfsGitProps) {
        super(props);
    }

    public componentDidMount() {

    }

    public render(): JSX.Element {
        const header = (
            <div className="pullrequest-filter-list-header-row">
                <div className="pullrequest-filter-list-branch-selector">
                    {Resources.TargetBranchFilters}
                </div>
            </div>);

        const filters = this.props.filters.map((filter: PullRequestFilter, index: number) => {
            const errorMessage = !filter.targetBranch || filter.targetBranch === Utils_String.empty ? Resources.RequiredInputErrorMessage : Utils_String.empty;
            return (<div className="filter-selector">
                <div className="tfsgit-branch-filter">
                    {this._getBranchFilter(filter, index)}
                </div>
                {filter.targetBranch === Utils_String.empty &&
                    <ErrorComponent
                        errorMessage={Resources.BranchFilterRequired}
                    />
                }
            </div>);
        });


        return (
            <div className="pullrequest-tfsgit-trigger">
                <div className="pullrequest-filter-container">
                    <FilterListComponent
                        filterHeader={header}
                        filters={filters}
                        onAddFilterClick={this.props.onAddFilterClick}
                        onFilterDelete={this.props.onFilterDelete}
                    addButtonAriaLabel={Resources.PullRequestAddBranchFilterAriaDescription}
                    deleteButtonAriaLabel={Resources.DeletePullRequestBranchFilterAriaDescription}
                    />
                    {filters.length === 0 &&
                        <ErrorComponent
                            errorMessage={Resources.BranchOrTagFilterRequired}
                        />
                    }
                </div>
            </div>
        );
    }

    private _getBranchFilter(filter: PullRequestFilter, index: number): JSX.Element {
        return <BranchFilterListItem 
            index={index}
            filter={filter}
            repositoryId={this.props.repositoryId}
            onFilterChange={this.props.onFilterChange}
        />;
    }
}


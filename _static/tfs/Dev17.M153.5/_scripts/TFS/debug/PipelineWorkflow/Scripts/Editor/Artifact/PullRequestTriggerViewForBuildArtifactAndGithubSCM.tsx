import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { FilterListComponent } from "DistributedTaskControls/Components/FilterListComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { TagPickerComponent } from "DistributedTaskControls/Components/TagPicker";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { ConnectedServiceEndpointSource } from "DistributedTaskControls/Sources/ConnectedServiceEndpointSource";
import { ArtifactSource } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactSource";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { PullRequestFilter } from "ReleaseManagement/Core/Contracts";
import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";
import { InputValue, InputValues, InputValuesQuery } from "VSS/Common/Contracts/FormInput";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Core from "VSS/Utils/Core";
import { ITag } from "OfficeFabric/Pickers";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerViewForBuildArtifactAndGithubSCM";

export interface IPullRequestTriggerViewForBuildArtifactAndGithubSCMProps extends ComponentBase.IProps {
    filters: PullRequestFilter[];
    onFilterChange: (index: number, value: PullRequestFilter) => void;
    onFilterDelete: (rowIndex: number) => void;
    onAddFilterClick: (event?: React.MouseEvent<HTMLButtonElement>) => void;
    connectedService: string;
    repositoryName: string;
    allTags: string[];    
}

export interface IPullRequestTriggerViewForGithubSCMPropsState extends ComponentBase.IState {
    connectedServiceOptions: IDictionaryStringTo<string>;
    repositoryOptions: string[];
}

export class PullRequestTriggerViewForBuildArtifactAndGithubSCM extends ComponentBase.Component<IPullRequestTriggerViewForBuildArtifactAndGithubSCMProps, IPullRequestTriggerViewForGithubSCMPropsState> {

    public constructor(props: IPullRequestTriggerViewForBuildArtifactAndGithubSCMProps){
        super(props);
    }

    public componentDidMount() {
        this._setConnectedServiceOptions();
        this._setRepositoryOptions(this.props.connectedService);
    }

    public render(): JSX.Element {
        const header = (
            <div className="pullrequest-filter-header-row">
                <div className="pullrequest-branch-filter-heading">
                    {Resources.TargetBranch}
                </div>
                <div className="pullrequest-tag-filter-heading">
                    {Resources.Tags}
                </div>
            </div>
        );
        
        const filters = this.props.filters.map((filter: PullRequestFilter, index: number) => {
            let tagFilter = this._getTagFilter(this.props.allTags, filter, Utils_Core.curry(this.props.onFilterChange, index));
            let branchFilter = (<StringInputComponent
                value={filter.targetBranch}
                onValueChanged={Utils_Core.curry(this._onBranchValueChanged, index)}
                ariaLabel={Resources.TargetBranch}
            />);

            return (
                <div>              
                    <div className="pullrequest-filter-row">
                        <div className="pullrequest-branch-filter">
                            {branchFilter}
                        </div>
                        <div className="pullrequest-tag-filter">
                            {tagFilter}
                        </div>
                        
                    </div>
                    {filter.targetBranch === Utils_String.empty &&
                        <ErrorComponent
                            errorMessage={Resources.BranchFilterRequired}
                        />
                    }
                </div>
            );
        });

        return (
            <div className="pullrequest-github-trigger">
                <div className="pullrequest-filter-container">
                    <FilterListComponent
                        filterHeader={header}
                        filters={filters}
                        onAddFilterClick={this.props.onAddFilterClick}
                        onFilterDelete={this.props.onFilterDelete}
                        addButtonAriaLabel={Resources.PullRequestAddBranchFilterAriaDescription}
                        deleteButtonAriaLabel={Resources.DeletePullRequestBranchFilterAriaDescription}
                    />
                </div>
            </div>
        );
    }

    private _onBranchValueChanged = (index, branch: string) => {
        this.props.onFilterChange(index, { targetBranch: branch, tags: [] });
    }

    private _setConnectedServiceOptions(): void{
        ConnectedServiceEndpointSource.instance().getServiceEndpoints(this._githubEndpointType).then((endpoints: ServiceEndpoint[]) => {
            let connectedServiceOptions: IDictionaryStringTo<string> = {};
            for (const endpoint of endpoints) {
                connectedServiceOptions[endpoint.id] = endpoint.name;
            }

            this.setState({
                connectedServiceOptions: connectedServiceOptions
            });
        });
    }

    private _getTagFilter(allTags: string[], filter: PullRequestFilter, onFilterChange: (f: PullRequestFilter) => void): JSX.Element {
        return <div className={"pullrequest-trigger-row-tag-filter"}>
            <TagPickerComponent
                items={this._convertTagsToITags(allTags)}
                selectedItems={this._convertTagsToITags(filter.tags)}
                onChange={(tags: ITag[]) => onFilterChange({ targetBranch: filter.targetBranch, tags: this._convertITagsToTags(tags) })}
                getTagForText={this._getTagForText}
                includeUserEnteredTextInSuggestedTags={true}
                inputProps={{
                    "aria-label": Resources.ArtifactTagPickerInputAriaLabel
                }}
            />
        </div>;
    }

    private _setRepositoryOptions(serviceGuid: string): void{
        if (!serviceGuid){
            return;
        } 

        let query: InputValuesQuery = {
            currentValues: {
                connection: serviceGuid
            },
            inputValues: [{ inputId: "definition" } as InputValues],
            resource: this._githubEndpointType
        } as InputValuesQuery;

        ArtifactSource.instance().postInputValuesQuery(query).then((value: InputValuesQuery) => {
            let dropdownOptions = value.inputValues[0].possibleValues.map((e: InputValue) => { return { key: e.value, text: e.displayValue }; });
            this.setState({ repositoryOptions: dropdownOptions.map(e => e.key) });
        });
    }

    private _convertTagsToITags(tags: string[]): ITag[] {
        if (!tags) {
            return [];
        }

        return tags.map((e: string) => {
            return {
                key: e,
                name: e
            } as ITag;
        });
    }

    private _convertITagsToTags(tags: ITag[]): string[] {
        if (!tags) {
            return [];
        }

        return tags.map((e: ITag) => {
            return e.key;
        });
    }

    private _getTagForText = (text: string) => {
        return { key: text, name: text };
    }

    private _githubEndpointType = "GitHub";
}
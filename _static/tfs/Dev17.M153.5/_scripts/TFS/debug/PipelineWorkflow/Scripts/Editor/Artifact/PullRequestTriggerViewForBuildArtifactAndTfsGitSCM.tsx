/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { BuildBranchFilterComponent } from "DistributedTaskControls/Components/BuildBranchFilterComponent";
import { FilterListComponent } from "DistributedTaskControls/Components/FilterListComponent";
import { TagPickerComponent } from "DistributedTaskControls/Components/TagPicker";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { ITag } from "OfficeFabric/Pickers";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { PullRequestFilter } from "ReleaseManagement/Core/Contracts";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerViewForBuildArtifactAndTfsGitSCM";
import { BranchFilterComponent } from "DistributedTaskControls/Components/BranchFilterComponent";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Core from "VSS/Utils/Core";

export interface IPullRequestTriggerViewForBuildArtifactAndTfsGitSCM {
    filters: PullRequestFilter[];
    onFilterChange: (index: number, value: PullRequestFilter) => void;
    onFilterDelete: (rowIndex: number) => void;
    onAddFilterClick: (event?: React.MouseEvent<HTMLButtonElement>) => void;
    repositoryId: string;
    allTags: string[];
}

export class PullRequestTriggerViewForBuildArtifactAndTfsGitSCM extends React.Component<IPullRequestTriggerViewForBuildArtifactAndTfsGitSCM, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <div className="pullrequest-tfsgit-filter-container">
                <FilterListComponent
                    filterHeader={this._getHeader()}
                    filters={this._getFilters()}
                    onAddFilterClick={this.props.onAddFilterClick}
                    onFilterDelete={this.props.onFilterDelete}
                    addButtonAriaLabel={Resources.PullRequestAddBranchFilterAriaDescription}
                    deleteButtonAriaLabel={Resources.DeletePullRequestBranchFilterAriaDescription}
                />
            </div>
        );
    }

    private _getFilters(): JSX.Element[] {
        return this.props.filters.map((filter: PullRequestFilter, index: number) => {
            let branchFilter = this._getBranchFilter(filter, index);
            let tagFilter = this._getTagFilter(filter, index);
            return (
                <div className="pullrequest-filter-row">
                    <div className="pullrequest-filter-toprow">
                        <div className="pullrequest-branch-filter">
                            {branchFilter}
                        </div>
                        <div className="pullrequest-tag-filter">
                            {tagFilter}
                        </div>
                    </div>
                    <div className="pullrequest-filter-toprow">
                        {filter.targetBranch === Utils_String.empty &&
                            <ErrorComponent
                                errorMessage={Resources.BranchFilterRequired}
                            />
                        }
                    </div>
                </div>
            );
        });
    }

    private _getBranchFilter(filter: PullRequestFilter, index: number): JSX.Element {
        return <BranchFilterListItem
            index={index}
            filter={filter}
            repositoryId={this.props.repositoryId}
            onFilterChange={this.props.onFilterChange}
        />;
    }

    private _getTagFilter(filter: PullRequestFilter, index: number): JSX.Element {
        return <div className={"pullrequest-trigger-row-tag-filter"}>
            <TagFilterListItem 
                filter={filter}
                index={index}
                allTags={this.props.allTags}
                onFilterChange={this.props.onFilterChange}
            />
        </div>;
    }

    private _getHeader(): JSX.Element {
        return (
            <div className="pullrequest-filter-header-row">
                <div className="pullrequest-branch-filter">
                    {Resources.TargetBranch}
                </div>
                <div className="pullrequest-tag-filter">
                    {Resources.Tags}
                </div>
            </div>);
    }
}

export interface IBranchFilterListItemProps extends Base.IProps {
    repositoryId: string;
    filter: PullRequestFilter;
    onFilterChange: (index: number, value: PullRequestFilter) => void;
    index: number;
}

export class BranchFilterListItem extends Base.Component<IBranchFilterListItemProps, Base.IStateless> {
    public render(): JSX.Element {
        return (
            <BuildBranchFilterComponent
                repositoryId={this.props.repositoryId}
                branchFilter={this.props.filter.targetBranch ? this.props.filter.targetBranch : Utils_String.empty}
                onBranchFilterChange={this.onBranchChange}
                allowUnmatchedSelection={true}
                disableTags={true}
                updateOnBlur={true}
                supportVariables={false}
            />);
    }

    private onBranchChange = (branch: string) => {
        this.props.onFilterChange(this.props.index, { targetBranch: DtcUtils.getRefFriendlyName(branch), tags: this.props.filter.tags });
    }
}

export interface ITagFilterListItemProps extends Base.IProps {
    allTags: string[];
    filter: PullRequestFilter;
    onFilterChange: (index: number, value: PullRequestFilter) => void;
    index: number;
}

export class TagFilterListItem extends Base.Component<ITagFilterListItemProps, Base.IStateless> {
    public render(): JSX.Element {
        return <div className={"pullrequest-trigger-row-tag-filter"}>
            <TagPickerComponent
                items={this._convertTagsToITags(this.props.allTags)}
                selectedItems={this._convertTagsToITags(this.props.filter.tags)}
                onChange={this.onTagsChange}
                getTagForText={this._getTagForText}
                includeUserEnteredTextInSuggestedTags={true}
                inputProps={{
                    "aria-label": Resources.ArtifactTagPickerInputAriaLabel
                }}
            />
        </div>;
    }

    private onTagsChange = (tags: ITag[]) => {
        this.props.onFilterChange(this.props.index, { targetBranch: this.props.filter.targetBranch, tags: this._convertITagsToTags(tags) });
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
}

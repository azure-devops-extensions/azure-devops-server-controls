import * as React from "react";
import { Dropdown, IDropdownOption, DropdownMenuItemType } from "OfficeFabric/Dropdown";
import { autobind } from "OfficeFabric/Utilities";
import { format } from "VSS/Utils/String";
import { DiscussionType } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";
import {
    PullRequest_FilesFilterDropdownLabel,
    PullRequest_Filter_Everything, PullRequest_Filter_Everything_Short,
    PullRequest_Filter_AllComments, PullRequest_Filter_AllComments_Short,
    PullRequest_Filter_New, PullRequest_Filter_New_Short,
    PullRequest_Filter_Mine, PullRequest_Filter_Mine_Short,
    PullRequest_Filter_ActiveComments, PullRequest_Filter_ActiveComments_Short,
    PullRequest_Filter_ResolvedComments, PullRequest_Filter_ResolvedComments_Short,
    PullRequest_Filter_HideComments, PullRequest_Filter_HideComments_Short,
    
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/DiscussionFilter";

export interface IDiscussionFilterProps {
    /**
     * The currently selected filter in the dropdown.
     */
    filter: DiscussionType;
    /**
     * The previously selected filter.
     */
    previousFilter?: DiscussionType;
    /**
     * Types to include in the filter dropdown. Default is to include all available types.
     */
    typesToInclude?: DiscussionType[];
    /**
     * Current thread counts of discussion threads, indexed by type.
     */
    threadCounts: IDictionaryNumberTo<number>;
    /**
     * What to do when a new filter is selected.
     */
    onFilterSelected(filter: DiscussionType): void;
    /**
     * If true, the text in the dropdown button will be a shorter string. Strings in
     * the dropdown itself will still be the long versions (ex. [All comments] -> [All]).
     */
    useShorthand?: boolean,
}

export interface IDiscussionFilterOption {
    filter: DiscussionType;
    textTemplate: string;
    shorthandTemplate: string;
}

export const DiscussionFilterOptions: IDiscussionFilterOption[] = [
    { filter: DiscussionType.All, textTemplate: PullRequest_Filter_Everything, shorthandTemplate: PullRequest_Filter_Everything_Short },
    { filter: DiscussionType.AllComments, textTemplate: PullRequest_Filter_AllComments, shorthandTemplate: PullRequest_Filter_AllComments_Short },
    { filter: DiscussionType.New, textTemplate: PullRequest_Filter_New, shorthandTemplate: PullRequest_Filter_New_Short },
    { filter: DiscussionType.Mine, textTemplate: PullRequest_Filter_Mine, shorthandTemplate: PullRequest_Filter_Mine_Short },
    { filter: DiscussionType.AllActiveComments, textTemplate: PullRequest_Filter_ActiveComments, shorthandTemplate: PullRequest_Filter_ActiveComments_Short },
    { filter: DiscussionType.AllResolvedComments, textTemplate: PullRequest_Filter_ResolvedComments, shorthandTemplate: PullRequest_Filter_ResolvedComments_Short },
    { filter: DiscussionType.None, textTemplate: PullRequest_Filter_HideComments, shorthandTemplate: PullRequest_Filter_HideComments_Short },
];

/**
 * Dropdown to control thread filtering.
 */
export class DiscussionFilter extends React.PureComponent<IDiscussionFilterProps, {}> {

    private _modifiedFilter: IDiscussionFilterOption = null;

    public componentWillReceiveProps(nextProps: IDiscussionFilterProps): void {
        // store the last known good filter before the user manually modified it
        if (!this._modifiedFilter && nextProps.filter === DiscussionType.Expanded) {
            this._modifiedFilter = { ...DiscussionFilterOptions.filter(op => op.filter === nextProps.previousFilter)[0] }
            this._modifiedFilter.filter = DiscussionType.Expanded;
            this._modifiedFilter.shorthandTemplate = "* " + this._modifiedFilter.shorthandTemplate;
            this._modifiedFilter.textTemplate = "* " + this._modifiedFilter.textTemplate;
        }

        // reset the modified filter when transitioning back to a known state
        if (nextProps.filter !== DiscussionType.Expanded) {
            this._modifiedFilter = null;
        }
    }

    public render(): JSX.Element {
        return (
            <Dropdown
                className={"vc-pullrequest-discussion-filter"}
                label={""} // no text label next to the filter dropdown
                ariaLabel={PullRequest_FilesFilterDropdownLabel}
                options={this._getDropdownOptions()}
                selectedKey={this.props.filter}
                onChanged={this._onFilterSelected}
                onRenderTitle={this._onRenderTitle}
                onRenderOption={this._onRenderOption} />);
    }

    private _getDropdownOptions(): IDropdownOption[] {
        const optionsToInclude: IDiscussionFilterOption[] = Boolean(this.props.typesToInclude)
            ? DiscussionFilterOptions.filter(op => this.props.typesToInclude.some(t => t === op.filter))
            : DiscussionFilterOptions;
        
        const dropdownOptions: IDropdownOption[] = optionsToInclude.map(op => { 
            return { key: op.filter, text: format(op.textTemplate, this.props.threadCounts[op.filter] || 0) }
        });

        // if a valid filter was modified by manual expand/collapse, add an extra item
        // next to the item it is modifying
        if (this._modifiedFilter && this.props.previousFilter !== undefined) {
            for (let i = 0; i < dropdownOptions.length; ++i) {
                const option: IDropdownOption = dropdownOptions[i];
                if (option.key === this.props.previousFilter) {
                    dropdownOptions.splice(i, 0, {
                        key: this._modifiedFilter.filter, 
                        text: format(this._modifiedFilter.textTemplate, this.props.threadCounts[this.props.previousFilter] || 0),
                    });
                    break;
                }
            }
        } 

        return dropdownOptions;
    }

    @autobind
    private _onRenderTitle(option: IDropdownOption | IDropdownOption[]): JSX.Element {
        if (Array.isArray(option)) {
            option = option[0];
        }

        return (
            <span>
                { this.props.useShorthand && <span className={"bowtie-icon bowtie-comment-lines"} /> }
                {this._getFilterText(option)}
            </span>);
    }

    @autobind
    private _onRenderOption(option: IDropdownOption): JSX.Element {
        return (<span className="vc-pullrequest-discussion-filter-row">{option.text}</span>);
    }

    @autobind
    private _onFilterSelected(option: IDropdownOption): void {
        this.props.onFilterSelected && this.props.onFilterSelected(option.key as DiscussionType);
    }

    @autobind
    private _getFilterText(option: IDropdownOption): string {
        const filterOption: IDiscussionFilterOption = DiscussionFilterOptions.filter(op => op.filter === option.key)[0] || this._modifiedFilter;
        const filter: DiscussionType = (filterOption.filter === DiscussionType.Expanded) ? this.props.previousFilter : filterOption.filter;
        const template: string = (this.props.useShorthand && filterOption.shorthandTemplate) || filterOption.textTemplate;

        return format(template, this.props.threadCounts[filter] || 0);
    }
}

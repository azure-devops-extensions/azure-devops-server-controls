import * as React from "react";

import { PrimaryButton } from "OfficeFabric/Button";
import { SearchBox } from "OfficeFabric/SearchBox";

import { ClearFilterButton } from "Presentation/Scripts/TFS/Controls/Filters/ClearFilterButton";
import { FilterState } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";

import { Utils } from "VersionControl/Scenarios/Shared/Utils";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl"

import "VSS/LoaderPlugins/Css!VersionControl/TagsPageToolbar";

export interface TagsPageToolbarProps {
    onSearchValue(newValue: string): void;
    onChangeValue(newValue: string): void;
    onCreateTag(): void;
    isCreateTagVisible: boolean;
}

export const TagsPageToolbar = (props: TagsPageToolbarProps): JSX.Element => {
    return (
        <div className="tags-page-toolbar">
            <div className="hub-title tags-header">
                {VCResources.TagsTabLabel}
            </div>
            <div className="right-panel">
                <TagsPageSearchBox
                    onSearchValue={props.onSearchValue}
                    onChangeValue={props.onChangeValue}
                    />
                {props.isCreateTagVisible &&
                    <PrimaryButton
                        className="create-tags-button"
                        onClick={props.onCreateTag}>
                        {VCResources.CreateTagButton_TagsPage}
                    </PrimaryButton>
                }
            </div>
        </div>
    );
};

export interface TagsPageSearchBoxProps {
    onSearchValue(newValue: string): void;
    onChangeValue(newValue: string): void;
}

export interface TagsPageSearchBoxState {
    value: string;
    filterState: FilterState;
}

export class TagsPageSearchBox extends React.Component<TagsPageSearchBoxProps, TagsPageSearchBoxState> {

    constructor(props: TagsPageSearchBoxProps) {
        super(props);
        this.state = {value: "", filterState: FilterState.FILTER_CLEARED};
    }

    public render(): JSX.Element {
        return (
            <div className="search-box-container">
                <ClearFilterButton
                    filterCleared={this._filterCleared}
                    filterState={this.state.filterState} />
                <span className="search-box">
                    <SearchBox
                        placeholder={VCResources.TagsPage_Header_SearchBoxText}
                        onChange={this._onChangeValue}
                        onSearch={this._onSearchValue}
                        value={this.state.value} />
                </span>
            </div>
        );
    }

    private _onSearchValue = (newValue: string): void => {
        this.setState({
            filterState: newValue ? FilterState.FILTER_APPLIED : FilterState.FILTER_CLEARED,
            value: newValue,
        });
        this.props.onSearchValue(newValue);
    }

    private _onChangeValue = (newValue: string): void => {
        this.setState({
            filterState: newValue ? this.state.filterState : FilterState.FILTER_CLEARED,
            value: newValue,
        });
        this.props.onChangeValue(newValue);
    }

    private _filterCleared = (): void => {
        this.setState({
            filterState: FilterState.FILTER_CLEARED,
            value: "",
        });
        this.props.onChangeValue("");
    }
}

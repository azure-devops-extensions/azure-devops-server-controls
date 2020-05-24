import * as React from "react";

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { SelectionMode } from "OfficeFabric/Selection";

import {
    PickListDropdown,
    IPickListSelection,
    IPickListItem,
    IPickListGroup,
    IPickListAction
} from "VSSUI/PickList";
import { VssIconType } from "VSSUI/VssIcon";

import { BaseComponent, IBaseProps, css } from "OfficeFabric/Utilities";

import { format } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Build/TagsPicker";

export interface ITagsPickerProps extends IBaseProps {
    tags: string[];
    searchTextPlaceHolder: string;
    onTagsChanged: (tags: string[]) => void;
    onClear: () => void;
    className?: string;
    clearTags?: boolean;
}

export interface ITagsPickerState {
    selectedItems: IPickListItem[];
}

export class TagsPicker extends BaseComponent<ITagsPickerProps, ITagsPickerState> {
    private _clearAction: IPickListAction = null;
    private _pickList: PickListDropdown = null;

    constructor(props: ITagsPickerProps) {
        super(props);

        this.state = {
            selectedItems: []
        };
    }

    public render(): JSX.Element {
        const items: IPickListItem[] = this.props.tags.map((tag, index) => {
            // it's expensive to use index as key if re-ordering is involved, but this does no such thing, so it's fine to use index as key
            return {
                name: tag,
                key: index + ""
            };
        });

        return <PickListDropdown
            componentRef={this._resolveRef('_pickList')}
            className={css("build-tags-picker", this.props.className)}
            isSearchable={true}
            selectionMode={SelectionMode.multiple}
            getPickListItems={() => items}
            noItemsText={BuildResources.NoTagsAvailableText}
            onSelectionChanged={this._onSelectionChanged}
            searchNoResultsText={BuildResources.NoTagsAvailableText}
            searchResultsLoadingText={format(BuildResources.LoadingResourceText, BuildResources.TagsLabel)}
            searchTextPlaceholder={this.props.searchTextPlaceHolder}
            placeholder={BuildResources.TagsPickerPlaceHolder}
            selectedItems={this.state.selectedItems}
            ariaLabelFormat={BuildResources.TagsPickerAriaLabelFormat}
            getActions={this._getActions}
            getListItem={(item) => item as IPickListItem} // This has to be sent, other-wise PickList constructs items with name and key as whole item object which would fail to render!
        />;
    }

    public componentWillReceiveProps(nextProps: ITagsPickerProps) {
        // If asked to clear tags now and if we didn't do this already
        if (nextProps.clearTags && this.props.clearTags !== nextProps.clearTags) {
            this.setState({
                selectedItems: []
            });
        }
    }

    private _onSelectionChanged = (selection: IPickListSelection) => {
        const items = (selection.selectedItems || []) as IPickListItem[];
        this.props.onTagsChanged(items.map(x => x.name));
        this.setState({
            selectedItems: items
        });
    }

    private _onClear = () => {
        this.props.onClear();
        // make sure we focus the dropdown
        this._pickList && this._pickList.focus();
        this.setState({
            selectedItems: []
        });
    }

    private _getActions = (): IPickListAction[] => {
        return [this._getClearAction()];
    }

    private _getClearAction() {
        if (!this._clearAction) {
            this._clearAction = {
                name: BuildResources.Clear,
                iconProps: {
                    iconName: "Clear",
                    iconType: VssIconType.fabric
                },
                onClick: this._onClear
            };
        }

        return this._clearAction;
    }
}

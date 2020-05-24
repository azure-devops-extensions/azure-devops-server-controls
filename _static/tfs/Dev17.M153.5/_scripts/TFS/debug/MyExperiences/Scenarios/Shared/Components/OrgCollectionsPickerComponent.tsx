import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";
import { PickListDropdown, IPickListSelection } from "VSSUI/PickList";

import { ICollectionItem, IOrgCollectionsPickerProps } from "MyExperiences/Scenarios/Shared/Models";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Shared/Components/OrgCollectionsPickerComponent";

export interface IOrgCollectionsPickerState {
    selectedCollection?: ICollectionItem;
}

export class OrgCollectionsPickerComponent extends React.Component<IOrgCollectionsPickerProps, IOrgCollectionsPickerState> {

    constructor(props: IOrgCollectionsPickerProps) {
        super(props);
        this.state = {
            selectedCollection: this.props.selectedCollection
        };
    }

    public render(): JSX.Element {
        const { collections, searchBoxAriaLabel, onSelectionChanged, onSearch, preventDismissOnScroll } = this.props;
        const { selectedCollection } = this.state;

        return (
            <div className={"org-collection-picker-container"}>
                <PickListDropdown
                    className={'org-collections-dropdown'}
                    getPickListItems={() => collections}
                    selectedItems={!!selectedCollection && [selectedCollection]}
                    getListItem={this._getPickListItem}
                    isSearchable={true}
                    searchBoxAriaLabel={searchBoxAriaLabel}
                    onSelectionChanged={this._onSelectionChanged}
                    placeholder={MyExperiencesResources.OrganizationCollectionsPickerPlaceholderText}
                    searchTextPlaceholder={MyExperiencesResources.OrganizationCollectionsSearchPlaceholderText}
                    onSearch={onSearch}
                    preventDismissOnScroll={preventDismissOnScroll}
                />
            </div>
        );
    }

    @autobind
    private _getPickListItem(item: ICollectionItem) {
        return {
            name: item.name,
            key: item.id
        };
    }

    @autobind
    private _onSelectionChanged(selection: IPickListSelection): void {
        const selectedItem = selection.selectedItems[0];
        const { selectedCollection } = this.state;

        if (selectedItem && selectedCollection && (selectedItem.id !== selectedCollection.id)) {
            const { onSelectionChanged } = this.props;
            if (onSelectionChanged) {
                onSelectionChanged(selectedItem);
            }

            this.setState({ selectedCollection: selectedItem });
        }
    }
}

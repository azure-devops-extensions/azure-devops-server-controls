/// <reference types="react" />
/// <reference types="react-dom" />

// React
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ComponentBase from "VSS/Flux/Component";

// Office Fabric
import * as DetailsList from "OfficeFabric/DetailsList";
import { autobind } from "OfficeFabric/Utilities";

// Notifications
import * as CategoryActions from "NotificationsUI/Scripts/Actions/CategoryActions";
import * as StoresHub from "NotificationsUI/Scripts/Stores/StoresHub";
import * as NotificationContracts from "Notifications/Contracts";

import { PickList, IPickListItem, IPickListSelection } from "VSSUI/PickList";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";

export interface CategoriesListProps extends ComponentBase.Props {
    storesHub: StoresHub.StoresHub;
    onCategorySelectionChange: (categoryId: string) => void;
    preventOpen?: boolean;
}

export interface CategoriesListState extends ComponentBase.State {
    categories: NotificationContracts.NotificationEventTypeCategory[];
    columns?: DetailsList.IColumn[];
}

export class CategoriesList extends ComponentBase.Component<CategoriesListProps, CategoriesListState> {

    constructor(props: CategoriesListProps) {
        super(props);

        this.state = {
            categories: this.props.storesHub.categoryStore.getCategories(),
            columns: this._getColumns()
        };
    }

    public render(): JSX.Element {
        const initiallySelectedCategories = this.state.categories && this.state.categories.length > 0 ? [this.state.categories[0]] : [];

        return <div className="categorypage-detailed-list">
            <PickList items={this.state.categories} initiallySelectedItems={initiallySelectedCategories} getListItem={this.getListItem} onSelectionChanged={this._handleCategorySelectionChange} selectionMode={SelectionMode.single} selectOnFocus={true} />
        </div>;
    }

    public componentDidMount() {
        super.componentDidMount();
    }

    public componentWillUnmount() {
        super.componentWillUnmount();
    }

    private getListItem(item: NotificationContracts.NotificationEventTypeCategory): IPickListItem {
        return {
            key: item.id,
            name: item.name
        };
    }

    private _getColumns(): DetailsList.IColumn[] {
        let columns: DetailsList.IColumn[] = [];

        columns.push({
            key: "name",
            fieldName: null,
            name: "Name",
            minWidth: 100,
            className: "categorypage-detailed-list",
            onRender: (category: NotificationContracts.NotificationEventTypeCategory, index: number, column: DetailsList.IColumn) => {
                return category.name;
            }
        });

        return columns;
    }

    private _getSelectedCategory(items: NotificationContracts.NotificationEventTypeCategory[]): string {
        if (!items || items.length === 0) {
            return this.state.categories[0].id;
        }
        else {
            return items[0].id;
        }
    }

    @autobind
    private _handleCategorySelectionChange(selection: IPickListSelection) {
        const items: NotificationContracts.NotificationEventTypeCategory[] = selection.selectedItems;
        var currentCategory = this._getSelectedCategory(items);
        var previousCategory = this.props.storesHub.templateStore.getSelectedCategory();
        if (currentCategory && currentCategory !== previousCategory) {
            this.props.onCategorySelectionChange(currentCategory);
        }
    }
}

/// <reference types="react" />
/// <reference types="react-dom" />

// React
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ComponentBase from "VSS/Flux/Component";

// Office Fabric
import * as DetailsList from "OfficeFabric/DetailsList";
import { autobind } from "OfficeFabric/Utilities";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";

// Notifications
import * as TemplateActions from "NotificationsUI/Scripts/Actions/TemplateActions";
import * as StoresHub from "NotificationsUI/Scripts/Stores/StoresHub";
import * as NotificationContracts from "Notifications/Contracts";

import { PickList, IPickListItem, IPickListSelection } from "VSSUI/PickList";

export interface TemplatesListProps extends ComponentBase.Props {
    storesHub: StoresHub.StoresHub;
    templateType: NotificationContracts.SubscriptionTemplateType;
    onTemplateSelectionChange?: (template: NotificationContracts.NotificationSubscriptionTemplate) => void;
}

export interface TemplatesListState extends ComponentBase.State {
    templates: NotificationContracts.NotificationSubscriptionTemplate[];
    columns?: DetailsList.IColumn[];
    selectedCategory: string;
}

export class TemplatesList extends ComponentBase.Component<TemplatesListProps, TemplatesListState> {

    private _updateStateFromStoreDelegate: { (template: NotificationContracts.NotificationSubscriptionTemplate): void };

    constructor(props: TemplatesListProps) {
        super(props);

        this.state = {
            templates: this.props.storesHub.templateStore.getTemplates(this.props.templateType),
            columns: this._getColumns(),
            selectedCategory: this.props.storesHub.templateStore.getSelectedCategory()
        };

    }


    public render(): JSX.Element {
        const initiallySelectedTemplates = this.state.templates && this.state.templates.length > 0 ? [this.state.templates[0]] : [];
        return <div  className="categorypage-detailed-list">
                    <PickList  key={this.state.selectedCategory} items={this.state.templates} initiallySelectedItems= {initiallySelectedTemplates} getListItem={this.getListItem} onSelectionChanged={this._handleTemplateSelectionChange} selectionMode={SelectionMode.single} selectOnFocus={true}/>
               </div>;
    }

    public componentDidMount() {
        this._setDefaultSelection();
        this._updateStateFromStoreDelegate = this._updateStateFromStore.bind(this);
        this.props.storesHub.templateStore.addListener("SelectedCategoryChanged", this._updateStateFromStoreDelegate);
    }

    public componentWillUnmount() {
        this.props.storesHub.templateStore.removeListener("SelectedCategoryChanged", this._updateStateFromStoreDelegate);
    }

    public componentDidUpdate() {
        this._setDefaultSelection();       
    }

    private getListItem(item: NotificationContracts.NotificationSubscriptionTemplate) : IPickListItem {
        return {
            key: item.id,
            name: item.description
        };
    }

    private _setDefaultSelection() {
        this.props.storesHub.templateStore.setSelectedTemplate(0);
    }

    @autobind
    private _handleTemplateSelectionChange(selection: IPickListSelection) {
        const items: NotificationContracts.NotificationSubscriptionTemplate[] = selection.selectedItems;
        var currentTemplate = this._getSelectedTemplate(items);
        var previousTemplate = this.props.storesHub.templateStore.getSelectedTemplate();
        if (currentTemplate && currentTemplate !== previousTemplate) {
            this.props.onTemplateSelectionChange(currentTemplate);
        }
    }

    private _getColumns(): DetailsList.IColumn[] {
        let columns: DetailsList.IColumn[] = [];

        columns.push({
            key: "name",
            fieldName: null,
            name: "Name",
            minWidth: 450,
            className: "categorypage-detailed - list",
            onRender: (template: NotificationContracts.NotificationSubscriptionTemplate, index: number, column: DetailsList.IColumn) => {
                return template.description;
            }
        });

        return columns;
    }

    private _updateStateFromStore() {
        this.setState({
            templates: this.props.storesHub.templateStore.getTemplates(this.props.templateType),
            selectedCategory: this.props.storesHub.templateStore.getSelectedCategory()
        });
    }
    
    private _getSelectedTemplate(items: NotificationContracts.NotificationSubscriptionTemplate[]): NotificationContracts.NotificationSubscriptionTemplate {        
        if (items && items.length > 0) {
            return (items[0] as NotificationContracts.NotificationSubscriptionTemplate);
        }
        return null;
    }
}

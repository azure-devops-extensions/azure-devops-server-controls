/// <reference types="jquery" />

import * as React from "react";
import * as ComponentBase from "VSS/Flux/Component";

// Office Fabric
import { Fabric } from "OfficeFabric/Fabric";

// VSS

// Notifications
import Notifications_Contracts = require("Notifications/Contracts");

// Notifications UI
import NotifResources = require("NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI");
import NotifViewModel = require("NotificationsUI/Scripts/NotificationsViewModel");
import CategoriesList = require("NotificationsUI/Scripts/Components/CategoriesList");
import CategoryActions = require("NotificationsUI/Scripts/Actions/CategoryActions");
import * as TemplatesList from "NotificationsUI/Scripts/Components/TemplatesList";
import * as TemplateActions from "NotificationsUI/Scripts/Actions/TemplateActions";
import * as StoresHub from "NotificationsUI/Scripts/Stores/StoresHub";

export interface TemplateSelectionPageProps extends React.Props<void> {
    viewModel: NotifViewModel.NotificationsViewModel;
    storesHub: StoresHub.StoresHub;
    templateType: Notifications_Contracts.SubscriptionTemplateType;
}

export class TemplateSelectionPage extends ComponentBase.Component<any, ComponentBase.State> {
    private _viewModel: NotifViewModel.NotificationsViewModel;
    private _categoriesList: CategoriesList.CategoriesList;
    private _storesHub: StoresHub.StoresHub;

    constructor(props: TemplateSelectionPageProps) {
        super(props);
        this._viewModel = props.viewModel;
        this._storesHub = props.storesHub
    }


    public render(): JSX.Element {

        return <Fabric>
            <div className="event-subscription-categories-page-root">
                <div className="header-row">
                    <div className="category-column" >{NotifResources.CategoryHeaderText}</div>
                    <div className="spacer-column" />
                    <div className="template-column">{NotifResources.TemplateHeaderText}</div>
                </div>
                <div className="controls-row">
                    <div className="category-column subscription-dialog-list">
                        <CategoriesList.CategoriesList storesHub={this._storesHub} onCategorySelectionChange={CategoryActions.Creator.categorySelected} />
                    </div>
                    <div className="spacer-column" />
                    <div className="template-column subscription-dialog-list">
                        <TemplatesList.TemplatesList storesHub={this._storesHub} templateType={this.props.templateType} onTemplateSelectionChange={TemplateActions.Creator.templateSelected} />
                    </div>
                </div>
            </div>
        </Fabric>;
    }
}

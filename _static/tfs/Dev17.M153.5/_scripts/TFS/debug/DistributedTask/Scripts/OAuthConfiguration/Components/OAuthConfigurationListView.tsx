/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import { PrimaryButton } from "OfficeFabric/Button";
import { ColumnActionsMode } from "OfficeFabric/DetailsList";
import { Fabric } from "OfficeFabric/Fabric";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Control } from "VSS/Controls";
import VSSDialogs = require("VSS/Controls/Dialogs");
import Component_Base = require("VSS/Flux/Component");
import VSS = require("VSS/VSS");
import Utils_Date = require("VSS/Utils/Date");
import * as Utils_String from "VSS/Utils/String";
import Events_Services = require("VSS/Events/Services");
import * as Locations from "VSS/Locations";
import Navigation_Services = require("VSS/Navigation/Services");
import { VssIconType, VssIcon } from "VSSUI/VssIcon";
import { PivotBarItem } from "VSSUI/PivotBar";
import { VssDetailsList } from "VSSUI/VssDetailsList";
import { Hub } from "VSSUI/Hub";
import { IHubViewState, HubViewState } from "VSSUI/Utilities/HubViewState";
import ContextualMenu = require("OfficeFabric/ContextualMenu");
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";

import { ErrorMessageBar } from "DistributedTask/Scripts/Components/ErrorMessageBar";
import { IColumn, CheckboxVisibility, DetailsListLayoutMode, ConstrainMode } from "OfficeFabric/DetailsList";
import { ExternalLink } from "DistributedTaskControls/Components/ExternalLink";
import { KeyboardAccesibleComponent } from "DistributedTask/Scripts/Common/KeyboardAccessible";
import { IHubBreadcrumbItem, HubHeader } from "VSSUI/HubHeader";
import { OAuthConfigurationListStore } from "DistributedTask/Scripts/OAuthConfiguration/Stores/OAuthConfigurationListStore";
import { OAuthConfigurationListActionCreator } from "DistributedTask/Scripts/OAuthConfiguration/Actions/OAuthConfigurationListActionCreator";
import Contracts = require("TFS/ServiceEndpoint/Contracts");
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import Dialogs = require("DistributedTask/Scripts/Components/Dialogs");
import Types = require("DistributedTask/Scripts/DT.Types");
import { OAuthConfigurationHubEvents, NavigationConstants, HelpLinks } from "DistributedTask/Scripts/OAuthConfiguration/Common/OAuthConfigurationConstants";
import "VSS/LoaderPlugins/Css!RM:DistributedTask/Scripts/OAuthConfiguration/Components/OAuthConfigurationListView";

export interface IOAuthConfigurationListViewState extends Component_Base.State {
    oauthConfigurationList: Contracts.OAuthConfiguration[];
    dataLoaded: boolean;
    errorMessage: string;
}

export class OAuthConfigurationListView extends Component_Base.Component<Component_Base.Props, IOAuthConfigurationListViewState> {
    constructor(props?: Component_Base.Props) {
        super(props);
        this._hubViewState = new HubViewState();
        this._oauthConfigurationListStore = StoreManager.GetStore<OAuthConfigurationListStore>(OAuthConfigurationListStore);
        this._oauthConfigurationListActionCreator = ActionCreatorManager.GetActionCreator<OAuthConfigurationListActionCreator>(OAuthConfigurationListActionCreator);
        this._eventManager = Events_Services.getService();
    }

    public componentWillMount(): void {
        this.setState(this._getInitialState());
    }

    public componentDidMount() {
        super.componentDidMount();
        this._oauthConfigurationListStore.addChangedListener(this._onStoreChange);
        this._eventManager.attachEvent(OAuthConfigurationHubEvents.UpdateErrorMessage, this._updateErrorMessage);
        this._eventManager.attachEvent(OAuthConfigurationHubEvents.ClearErrorMessage, this._clearErrorMessage);
    }

    public componentWillUnmount() {
        this._oauthConfigurationListStore.removeChangedListener(this._onStoreChange);
        this._eventManager.detachEvent(OAuthConfigurationHubEvents.UpdateErrorMessage, this._updateErrorMessage);
        this._eventManager.detachEvent(OAuthConfigurationHubEvents.ClearErrorMessage, this._clearErrorMessage);
        super.componentWillUnmount();
    }

    public render(): JSX.Element {
        let hubContent = this._getHubContent();
        let errorMessage = this._getErrorMessage();
        return (
            <Fabric>
                {errorMessage}
                <Hub
                    className={this._getState().errorMessage ? "hub-view oauth-configurations-hub has-error" : "hub-view oauth-configurations-hub"}
                    hubViewState={this._hubViewState}
                    hideFullScreenToggle={true}
                    commands={[
                        {
                            key: "new",
                            name: Resources.New,
                            important: true,
                            iconProps: { iconName: "Add", iconType: VssIconType.fabric }, onClick: this._onAddConfigurationClick
                        },
                        {
                            key: "security",
                            name: Resources.Security,
                            important: true,
                            iconProps: { iconName: "bowtie-shield", iconType: VssIconType.bowtie }, onClick: this._showSecurityDialog
                        }
                    ]} >
                    <HubHeader breadcrumbItems={this._getBreadCrumbItems()} />
                    <PivotBarItem
                        name={Resources.OAuthConfigurationsTabTitle}
                        itemKey="oauthConfigurationsTab"
                        className="oauth-configurations-pivot">
                        {hubContent}
                    </PivotBarItem>
                </Hub>
            </Fabric>
        );
    }

    private _onStoreChange = () => {
        let state = this._getState();
        let oauthConfigurationlist: Contracts.OAuthConfiguration[] = this._oauthConfigurationListStore.getOAuthConfigurationListData().slice();
        state.oauthConfigurationList = oauthConfigurationlist;
        state.dataLoaded = true;
        state.errorMessage = "";
        this.setState(state);
    }

    private _getState(): IOAuthConfigurationListViewState {
        return this.state || this._getInitialState();
    }

    private _getInitialState(): IOAuthConfigurationListViewState {
        return {
            oauthConfigurationList: this._oauthConfigurationListStore.getOAuthConfigurationListData(),
            dataLoaded: this._oauthConfigurationListStore.getOAuthConfigurationIsLoaded(),
            errorMessage: ""
        };
    }

    private _getHubContent(): JSX.Element {
        let state = this._getState();
        let content: JSX.Element;

        if (!state.dataLoaded) {
            content = (
                <div className={"oauth-configurations-spinner"} role="region">
                    <Spinner type={SpinnerType.large} />
                </div>
            );
        }
        else if (state.oauthConfigurationList.length > 0) {
            content = (
                <div className="oauth-configurations-list" role="region" aria-label={Resources.OAuthConfigurationAriaLabel}>
                    <VssDetailsList
                        items={state.oauthConfigurationList}
                        initialFocusedIndex={0}
                        constrainMode={ConstrainMode.unconstrained}
                        layoutMode={DetailsListLayoutMode.justified}
                        columns={this._getColumns()}
                        actionsColumnKey={"name"}
                        getMenuItems={this._menuItems}
                        ariaLabelForGrid={Resources.OAuthConfigurationAriaLabel}
                        onRenderItemColumn={this._renderItemColumn}
                        checkboxVisibility={CheckboxVisibility.hidden}
                        onItemInvoked={(item, index, ev) => this._onItemInvoked(item, ev)} />
                </div>
            );
        }
        else {
            content = (
                <div className="oauth-configurations-list" role="region" aria-label={Resources.OAuthConfigurationAriaLabel}>
                    <div className="oauth-configurations-getting-started">
                        <div className="oauth-configurations-getting-started-icon">
                            <i className="ms-Icon ms-Icon--Permissions"></i>
                        </div>
                        <div className="oauth-configurations-getting-started-content">
                            <div className="oauth-configurations-getting-started-content-title">{Resources.OAuthConfigurationGettingStartedTitle}</div>
                            <div className="oauth-configurations-getting-started-content-about">{Resources.OAuthConfigurationGettingStartedAbout}</div>
                            <div className="oauth-configurations-getting-started-content-button">
                                <PrimaryButton text={Resources.OAuthConfigurationGettingStartedButtonText} onClick={this._onAddConfigurationClick} />
                            </div>
                            <ExternalLink
                                className="oauth-configurations-learn-more-link"
                                href={HelpLinks.OAuthConfigurationLearnMoreLink}
                                text={Resources.OAuthConfigurationGettingStartedLearnMore}
                                newTab={true} />
                        </div>
                    </div>
                </div>
            );
        }

        return content;
    }

    private _getColumns(): IColumn[] {
        return [
            {
                key: "name",
                name: Resources.OAuthConfigurationsDetailsNameColumn,
                fieldName: Resources.OAuthConfigurationsDetailsNameColumn,
                minWidth: 250,
                maxWidth: 350,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled
            },
            {
                key: "url",
                name: Resources.OAuthConfigurationsDetailsUrlColumn,
                fieldName: Resources.OAuthConfigurationsDetailsUrlColumn,
                minWidth: 250,
                maxWidth: 500,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled
            },
            {
                key: "modifiedBy",
                name: Resources.OAuthConfigurationsDetailsModifiedByColumn,
                fieldName: Resources.OAuthConfigurationsDetailsModifiedByColumn,
                minWidth: 250,
                maxWidth: 350,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled
            },
            {
                key: "modifiedOn",
                name: Resources.OAuthConfigurationsDetailsModifiedOnColumn,
                fieldName: Resources.OAuthConfigurationsDetailsModifiedOnColumn,
                minWidth: 250,
                maxWidth: 300,
                columnActionsMode: ColumnActionsMode.disabled
            }
        ];
    }

    private _renderItemColumn = (item, index, column): JSX.Element => {
        let fieldContent = item[column.fieldName];

        switch (column.key) {
            case "name":
                return (
                    <div className="oauth-configurations-item-name">
                        <div className="oauth-configurations-name-wrapper">
                            <KeyboardAccesibleComponent className={"oauth-configurations-name-column"} onClick={() => OAuthConfigurationListView._onOAuthConfigurationClick(item)} toolTip={Utils_String.format(Resources.ViewOAuthConfigurationToolTip, item.name)} >
                                <VssIcon iconName="Permissions" iconType={VssIconType.fabric} />
                                <span>{item.name}</span>
                            </KeyboardAccesibleComponent>
                        </div>
                    </div>
                );

            case "url":
                return (
                    <span className="oauth-configurations-item-url">{item.url}</span>
                );

            case "modifiedBy":
                var userImageUrl = Locations.urlHelper.getMvcUrl({
                    area: "api",
                    controller: "common",
                    action: "IdentityImage",
                    queryParams: { "id": item.modifiedBy.id },
                })

                return (
                    <div className="oauth-configurations-item-modified-by">
                        <div className="identity-image">
                            <img className="image-small" src={userImageUrl} />
                        </div>
                        <span className="identity-image">{item.modifiedBy.displayName}</span>
                    </div>
                );

            case "modifiedOn":
                return (
                    <div className="oauth-configurations-item-modified-date">{Utils_Date.friendly(item.modifiedOn)}</div>
                );

            default:
                return <span>{fieldContent}</span>;
        }
    }

    private _getBreadCrumbItems(): IHubBreadcrumbItem[] {
        let items: IHubBreadcrumbItem[] = [];
        items.push({
            key: "oauthConfigurations",
            text: Resources.OAuthConfigurationsHubTitle
        } as IHubBreadcrumbItem);

        return items;
    }

    private _getErrorMessage(): JSX.Element {
        let state = this._getState();
        return (<ErrorMessageBar errorMessage={state.errorMessage} />);
    }

    private static _onOAuthConfigurationClick(oauthConfiguration: Contracts.OAuthConfiguration): void {
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: NavigationConstants.OAuthConfigurationView, configurationId: oauthConfiguration.id });
    }

    public _onItemInvoked(oauthConfiguration: Contracts.OAuthConfiguration, event: Event): void {
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: NavigationConstants.OAuthConfigurationView, configurationId: oauthConfiguration.id });
        event.stopPropagation();
    }

    private _onAddConfigurationClick = () => {
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: NavigationConstants.OAuthConfigurationView, configurationId: null });
    }

    private _updateErrorMessage = (sender: any, error: any) => {
        let state = this._getState();
        state.errorMessage = VSS.getErrorMessage(error);
        this.setState(state);
    }

    private _clearErrorMessage = () => {
        let state = this._getState();
        state.errorMessage = "";
        this.setState(state);
    }

    private _showSecurityDialog = (): void => {
         Dialogs.Dialogs.showSecurityDialog(Types.LibraryItemType.OAuthConfiguration);
    }

    private _menuItems = (item: Contracts.OAuthConfiguration): ContextualMenu.IContextualMenuItem[] => {
        let menuItems: ContextualMenu.IContextualMenuItem[] = [];

        menuItems.push({
            key: "view",
            iconProps: contextualMenuIcon("bowtie-navigate-forward-circle"),
            name: Resources.EditText,
            onClick: () => {
                OAuthConfigurationListView._onOAuthConfigurationClick(item);
            }
        } as ContextualMenu.IContextualMenuItem);

        menuItems.push({
            key: "delete",
            iconProps: contextualMenuIcon("bowtie-trash"),
            name: Resources.DeleteText,
            onClick: () => {
                Dialogs.Dialogs.showDeleteOAuthConfigurationDialog(
                    item.name,
                    () => {
                        this._oauthConfigurationListActionCreator.deleteOAuthConfiguration(item.id);
                });
            }
        } as ContextualMenu.IContextualMenuItem);

        menuItems.push({
            key: "security",
            iconProps: contextualMenuIcon("bowtie-shield"),
            name: Resources.Security,
            onClick: () => {
                Dialogs.Dialogs.showSecurityDialog(Types.LibraryItemType.OAuthConfiguration, item.id, item.name);
            }
        });

        return menuItems;
    }

    private _oauthConfigurationListActionCreator: OAuthConfigurationListActionCreator;
    private _oauthConfigurationListStore: OAuthConfigurationListStore;
    private _eventManager: Events_Services.EventService;
    private _hubViewState: IHubViewState;
}
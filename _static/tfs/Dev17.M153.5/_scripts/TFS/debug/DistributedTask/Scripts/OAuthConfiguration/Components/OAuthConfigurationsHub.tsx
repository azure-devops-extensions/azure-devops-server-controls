/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");

import Component_Base = require("VSS/Flux/Component");
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_String = require("VSS/Utils/String");
import Context = require("VSS/Context");
import Utils_Core = require("VSS/Utils/Core");

import { Fabric } from "OfficeFabric/Fabric";

import { IHubViewState, HubViewState } from "VSSUI/Utilities/HubViewState";
import { Hub, IHub } from "VSSUI/Hub";
import { IHubBreadcrumbItem, HubHeader } from "VSSUI/HubHeader";
import { PickListFilterBarItem } from "VSSUI/PickList";
import { PivotBarItem, IPivotBarAction } from "VSSUI/PivotBar";
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Contracts = require("TFS/ServiceEndpoint/Contracts");

import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import { NavigationConstants } from "DistributedTask/Scripts/OAuthConfiguration/Common/OAuthConfigurationConstants";
import { OAuthConfigurationListView } from "DistributedTask/Scripts/OAuthConfiguration/Components/OAuthConfigurationListView";
import { OAuthConfigurationView } from "DistributedTask/Scripts/OAuthConfiguration/Components/OAuthConfigurationView";
import { OAuthConfigurationActionCreator } from "DistributedTask/Scripts/OAuthConfiguration/Actions/OAuthConfigurationActionCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { OAuthConfigurationListActionCreator } from "DistributedTask/Scripts/OAuthConfiguration/Actions/OAuthConfigurationListActionCreator";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IOAuthConfigurationState, OAuthConfigurationStore } from "DistributedTask/Scripts/OAuthConfiguration/Stores/OAuthConfigurationStore";
import { OAuthConfigurationListStore } from "DistributedTask/Scripts/OAuthConfiguration/Stores/OAuthConfigurationListStore";
import { PerfTelemetryManager, TelemetryScenarios } from "DistributedTask/Scripts/Utils/TelemetryUtils";

export interface IOAuthConfigurationsHubState extends Component_Base.State {
    view: string;
    oauthConfigurationList: Contracts.OAuthConfiguration[];
    dataLoaded: boolean;
    errorMessage: string;
}

export class OAuthConfigurationsHub extends Component_Base.Component<Component_Base.Props, IOAuthConfigurationsHubState> {

    constructor(props?: Component_Base.Props) {
        super(props);

        PerfTelemetryManager.initialize();
        PerfTelemetryManager.instance.startTTIScenarioOrNormalScenario(TelemetryScenarios.OAuthLanding);

        this._oauthConfigurationActionCreator = ActionCreatorManager.GetActionCreator<OAuthConfigurationActionCreator>(OAuthConfigurationActionCreator);
        this._oauthConfigurationListActionCreator = ActionCreatorManager.GetActionCreator<OAuthConfigurationListActionCreator>(OAuthConfigurationListActionCreator);
        this._oauthConfigurationListStore = StoreManager.GetStore<OAuthConfigurationListStore>(OAuthConfigurationListStore, "l");
    }

    public render(): JSX.Element {
        let state = this._getState();
        if (OAuthConfigurationsHub.isOAuthConfigurationView(state.view)) {
            this._setWindowTitle(Resources.OAuthConfigurationListWindowTitle);
            return (<OAuthConfigurationView />);
        }
        else {
            this._setWindowTitle(Resources.OAuthConfigurationWindowTitle);
            return (<OAuthConfigurationListView />);
        }
    }

    public componentDidMount() {
        super.componentDidMount();
        this._oauthConfigurationListStore.addChangedListener(this._onStoreChange);
        Navigation_Services.getHistoryService().attachNavigate(this._onUrlChange);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();
        this._oauthConfigurationListStore.removeChangedListener(this._onStoreChange);
        Navigation_Services.getHistoryService().detachNavigate(this._onUrlChange);
    }

    private _getState(): IOAuthConfigurationsHubState {
        return this.state || this._getInitialState();
    }

    private _getInitialState(): IOAuthConfigurationsHubState {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        return {
            view: urlState.view || NavigationConstants.OAuthConfigurationListView,
            oauthConfigurationList: [],
            dataLoaded: false,
            errorMessage: ""
        };
    }

    private _onUrlChange =  () => {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        let newState = {
            view: urlState.view || NavigationConstants.OAuthConfigurationListView
        };
        this.setState(newState);

        if (OAuthConfigurationsHub.isOAuthConfigurationView(newState.view) && !!urlState.configurationId) {
            this._oauthConfigurationActionCreator.getOAuthConfiguration(urlState.configurationId);
        }
        else if (OAuthConfigurationsHub.isOAuthConfigurationView(newState.view)) {
            this._oauthConfigurationActionCreator.newOAuthConfiguration();
        }
        else if (!this._getState().dataLoaded) {
            this._oauthConfigurationListActionCreator.loadOAuthConfigurationList();
        }
    }

    public static isOAuthConfigurationView(view: string): boolean {
        return view && Utils_String.equals(view, NavigationConstants.OAuthConfigurationView, true);
    }

    private _setWindowTitle(title: string): void {
        let titleFormat = Context.getPageContext().webAccessConfiguration.isHosted ? VSS_Resources_Platform.PageTitleWithContent_Hosted : VSS_Resources_Platform.PageTitleWithContent;
        document.title = Utils_String.format(titleFormat, title);
    }

    private _onStoreChange = () => {
        let state = this._getState();
        let oauthConfigurationlist: Contracts.OAuthConfiguration[] = this._oauthConfigurationListStore.getOAuthConfigurationListData().slice();
        state.oauthConfigurationList = oauthConfigurationlist;
        state.dataLoaded = true;
        state.errorMessage = "";
        this.setState(state);
    }

    private _oauthConfigurationActionCreator: OAuthConfigurationActionCreator;
    private _oauthConfigurationListActionCreator: OAuthConfigurationListActionCreator;
    private _oauthConfigurationListStore: any;
}

export function load(element: HTMLElement): void {
    ReactDOM.render(<Fabric> <OAuthConfigurationsHub /> </Fabric>, element);
    let urlState = Navigation_Services.getHistoryService().getCurrentState();
    if (OAuthConfigurationsHub.isOAuthConfigurationView(urlState.view) && !!urlState.configurationId) {
        ActionCreatorManager.GetActionCreator<OAuthConfigurationActionCreator>(OAuthConfigurationActionCreator).getOAuthConfiguration(urlState.configurationId);
    }
    else if (OAuthConfigurationsHub.isOAuthConfigurationView(urlState.view)) {
        ActionCreatorManager.GetActionCreator<OAuthConfigurationActionCreator>(OAuthConfigurationActionCreator).newOAuthConfiguration();
    }
    else {
        ActionCreatorManager.GetActionCreator<OAuthConfigurationListActionCreator>(OAuthConfigurationListActionCreator).loadOAuthConfigurationList();
    }
}
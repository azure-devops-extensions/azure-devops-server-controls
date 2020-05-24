/// <reference types="react" />

import * as React from "react";
import * as Q from "q";

import { ServiceEndpointType as EndpointType } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common";
import * as AzureRMEndpointsManageDialog_NO_REQUIRE from "DistributedTasksCommon/ServiceEndpoints/AzureRMEndpointsManageDialog";
import * as CustomEndpointsManageDialog_NO_REQUIRE from "DistributedTasksCommon/ServiceEndpoints/CustomEndpointsManageDialog";
import * as ServiceEndpointUIContributionManageDialog_NO_REQUIRE from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpointUIContributionManageDialog";
import * as DockerRegistryManageDialog_NO_REQUIRE from "DistributedTasksCommon/ServiceEndpoints/DockerRegistryManageDialog";
import * as CustomHandlers_NO_REQUIRE from "DistributedTasksCommon/TFS.Knockout.CustomHandlers";
import * as KubernetesEndpointManageDialog_NO_REQUIRE from "DistributedTasksCommon/ServiceEndpoints/KubernetesEndpointManageDialog";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Common from "DistributedTaskControls/Common/Common";
import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import {
    IInputControlPropsBase,
    IInputControlStateBase,
    InputControlType
} from "DistributedTaskControls/SharedControls/InputControls/Common";
import { ConnectedServiceComponentUtility, IConnectedServiceInputStateBase } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceComponentUtility";
import { Component as RequiredIndicator } from "DistributedTaskControls/SharedControls/InputControls/Components/RequiredIndicator";
import { ConnectedServiceInputStore } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceInputStore";
import { ConnectedServiceInputActionsCreator } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceInputActionsCreator";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { ManageLink, IManageLinkProps, ManageLinkType } from "DistributedTaskControls/Components/ManageLink";
import { PickList } from "DistributedTaskControls/Components/PickList";
import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { Component as AddNewServiceEndpoint } from "DistributedTaskControls/Components/AddNewServiceEndpoint";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { IconButton, CommandButton, IButton } from "OfficeFabric/Button";
import { Link } from "OfficeFabric/Link";
import { css } from "OfficeFabric/Utilities";

import { ServiceEndpointType, ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";

import * as VSS from "VSS/VSS";
import * as Context from "VSS/Context";
import * as Diag from "VSS/Diag";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Dialogs from "VSS/Controls/Dialogs";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ComboBox";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceInputComponent";

import Service = require("VSS/Service");
import Contributions_Services = require("VSS/Contributions/Services");
import Contributions_Contracts = require("VSS/Contributions/Contracts");

export interface IConnectedServiceInputPropsBase extends IInputControlPropsBase<string> {
    options: IDictionaryStringTo<string>;
    onOptionsChanged: (options: IDictionaryStringTo<string>) => void;
    useConnectedService: boolean;
    connectedServiceType: string;
    authSchemes?: string;
    instanceId: string;
    properties: IDictionaryStringTo<string>;
    hideRefreshButton?: boolean;
    hideNewButton?: boolean;
    onConnectionAdded?: (options: IDictionaryStringTo<string>, selectedKey: string) => void;
    setConnectionNameInFocus?: boolean;
}

export interface IConnectedServiceInputProps extends IInputControlPropsBase<string> {
    options: IDictionaryStringTo<string>;
    onOptionsChanged: (options: IDictionaryStringTo<string>) => void;
    connectedServiceType: string;
    authSchemes?: string;
    properties: IDictionaryStringTo<string>;
    hideRefreshButton?: boolean;
    hideNewButton?: boolean;
    onConnectionAdded?: (options: IDictionaryStringTo<string>, selectedKey: string) => void;
    setConnectionNameInFocus?: boolean;
}

/**
 * @brief Implements Connected service input control
 */
export class ConnectedServiceInputComponent extends InputBase<string, IConnectedServiceInputProps, IInputControlStateBase<string>> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_CONNECTED_SERVICE;
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[ConnectedServiceInputComponent.getControl]: Method called.");
        return (
            <ConnectedServiceInputComponentBase
                value={this.state.value}
                disabled={this.props.disabled}
                onValueChanged={this.onValueChanged}
                onOptionsChanged={this.props.onOptionsChanged}
                options={this.props.options}
                getErrorMessage={this.getErrorMessage}
                useConnectedService={true}
                label={this.props.label}
                connectedServiceType={this.props.connectedServiceType}
                authSchemes={this.props.authSchemes}
                instanceId={this.props.instanceId}
                ariaLabelledBy={this.props.ariaLabelledBy || this.getInputFieldLabelElementId()}
                ariaDescribedBy={this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId()}
                ariaLabel={this.props.ariaLabel}
                properties={this.props.properties}
                hideRefreshButton={this.props.hideRefreshButton}
                hideNewButton={this.props.hideNewButton}
                required={this.props.required}
                onConnectionAdded={this.props.onConnectionAdded}
                onNotifyValidationResult={this.props.onNotifyValidationResult}
                setConnectionNameInFocus={this.props.setConnectionNameInFocus} />
        );
    }

    protected getAdditonalLabelControls(): JSX.Element {
        let manageLinkProps: IManageLinkProps = {
            manageLinkType: ManageLinkType.EndPoint,
            displaySeperator: true,
            resourceId: this.state.value
        };
        return (<ManageLink {...manageLinkProps} />);
    }
}

export class ConnectedServiceInputComponentBase extends Base.Component<IConnectedServiceInputPropsBase, IConnectedServiceInputStateBase> {

    constructor(props: IConnectedServiceInputPropsBase) {
        super(props);

        this.state = {
            value: props.value || Utils_String.empty,
            optionsMap: props.options || {}
        };
    }

    public componentWillMount(): void {

        let instanceId = this.props.instanceId;

        this._store = StoreManager.GetStore<ConnectedServiceInputStore>(ConnectedServiceInputStore, instanceId);
        this._inputActionsCreator = ActionsHubManager.GetActionsHub<ConnectedServiceInputActionsCreator>(ConnectedServiceInputActionsCreator, instanceId);

        this._updateStateFromStore();
    }

    public componentDidMount() {
        super.componentDidMount();

        this._showAddServiceConnectionLinkIfRequired();
        this._refreshIfRequired();

        this._store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this._store.removeChangedListener(this._onStoreChanged);
    }

    public componentWillReceiveProps(newProps: IConnectedServiceInputPropsBase) {
        this.setState({
            value: newProps.value || Utils_String.empty,
            optionsMap: newProps.options || {}
        });
    }

    public render(): JSX.Element {

        let refreshIconClassName: string = this.state.showLoadingIcon ? "bowtie-icon bowtie-spinner" : "connected-service-refresh-icon";
        let refreshButtonIconName: string = css({ "Refresh": !this.state.showLoadingIcon });
        return (
            <div>
                <div className="connected-service-container">
                    <div className="connected-service-dropdown">
                        <RequiredIndicator value={this.state.value} onGetErrorMessage={this._getErrorMessage} onNotifyValidationResult={this.props.onNotifyValidationResult} >
                            {this._getPickList()}
                        </RequiredIndicator>
                    </div>
                    <div className="input-control-buttons">
                        {
                            !this.props.hideRefreshButton && !this.props.disabled &&
                            <IconButton
                                disabled={this.props.disabled}
                                onClick={(event: React.MouseEvent<HTMLButtonElement>) => this._onRefreshClick(event)}
                                iconProps={{
                                    iconName: refreshButtonIconName,
                                    className: refreshIconClassName
                                }}
                                className={css("input-control-icon-button", "fabric-style-overrides", "icon-button-override")}
                                ariaLabel={Resources.Refresh}
                                ariaDescription={Utils_String.localeFormat(Resources.RefreshInputDescription, this.props.label)}
                                aria-disabled={this.props.disabled} />
                        }

                        {
                            this.state.addServiceConnectionDetails.showAddServiceEndpointLink && !this.props.hideNewButton && !this.props.disabled &&
                            <CommandButton
                                componentRef={(button: IButton) => { this._newButton = button; }}
                                disabled={this.props.disabled}
                                onClick={this._onAddServiceEndpoint}
                                iconProps={{ iconName: "Add" }}
                                className={css("input-control-icon-button", "fabric-style-overrides", "command-button-override")}
                                ariaLabel={Resources.New}
                                ariaDescription={Utils_String.localeFormat(Resources.AddInputDescription, this.props.label)}
                                aria-disabled={this.props.disabled} >
                                {Resources.New}
                            </CommandButton>
                        }
                    </div>
                </div>
                {this._getConnection()}
            </div>
        );
    }



    private _getConnection(): JSX.Element {
        if (this.state.showNewConnectionControl &&
            Utils_String.equals(this.props.connectedServiceType, EndpointType.GitHub, true)) {
            return (
                <AddNewServiceEndpoint
                    autoGenerateNewConnectionName={true}
                    existingConnectionNames={this._getOptionValues()}
                    id={EndpointType.GitHub}
                    isEnabled={true}
                    connectionType={EndpointType.GitHub}
                    serverUrl={Common.ServiceEndpointConstants.GitHubServerUrl}
                    allowOauth={Context.getPageContext().webAccessConfiguration.isHosted}
                    allowPAT={true}
                    allowBasic={false}
                    allowSetServerUrl={false}
                    onAdd={this._endpointCreatedSuccessCallback}
                    showClose={true}
                    onDismiss={this._onDismiss}
                    setConnectionNameInFocus={this.props.setConnectionNameInFocus} />
            );
        }

        return null;
    }

    private _getOptionValues(): string[] {
        let values: string[] = [];
        for (let key in this.state.optionsMap) {
            if (this.state.optionsMap.hasOwnProperty(key)) {
                values.push(this.state.optionsMap[key]);
            }
        }
        return values;
    }

    private _onDismiss = (): void => {
        this.setState({ showNewConnectionControl: false });
        if (this._newButton) {
            this._newButton.focus();
        }
    }

    private _onStoreChanged = () => {
        this._updateStateFromStore();
    }

    private _updateStateFromStore() {
        let state = this._store.getState();
        this.setState({ addServiceConnectionDetails: state } as IConnectedServiceInputStateBase);
    }

    private _onChanged = (key: string) => {

        this._currentText = key;

        let value: string;

        if (this._isMultiSelect()) {
            value = key;
        }
        else {
            value = (ConnectedServiceComponentUtility.getValueFromKey(this.state.optionsMap, key) !== Utils_String.empty) ? key : Utils_String.empty;
        }

        if (!!this.props.onValueChanged) {
            this.props.onValueChanged(value);
        }
    }

    private _getSelectedOption() {

        let value = this.state.value;
        if (value === Utils_String.empty && this._currentText) {
            value = this._currentText;
        }

        return value;
    }

    private _getErrorMessage = () => {
        if (this.state.value === Utils_String.empty && this._currentText) {
            return Resources.RequiredInputInValidMessage;
        }
        else if (!!this.props.getErrorMessage) {
            return this.props.getErrorMessage(this.state.value);
        }
    }

    private _onRefreshClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        this._onRefresh(event);
        Utils_Core.delay(this, 500, () => {
            if (!this._optionsRefreshed) {
                this.setState({ showLoadingIcon: true } as IConnectedServiceInputStateBase);
            }
        });
    }

    private _onRefresh = (event: React.MouseEvent<HTMLButtonElement>) => {
        this._update();
    }

    /**
     * Show Dialog to create new service endpoint
     * Dialog handles the endpoint creation and sends the endpoint created via callback
     * 
     * @private
     * 
     * @memberof ConnectedServiceInputComponentBase
     */
    private _onAddServiceEndpoint = (event: React.MouseEvent<HTMLButtonElement>) => {

        this._publishaddServiceEndPointTelemetry(this.props.connectedServiceType);

        // Dialog for AzureRM endpoint type
        if (Utils_String.equals(this.props.connectedServiceType, EndpointType.AzureRM, true)) {

            VSS.using(["DistributedTasksCommon/ServiceEndpoints/AzureRMEndpointsManageDialog", "DistributedTasksCommon/TFS.Knockout.CustomHandlers"],
                (AzureRMEndpointsManageDialog: typeof AzureRMEndpointsManageDialog_NO_REQUIRE, CustomHandlers: typeof CustomHandlers_NO_REQUIRE) => {

                    // Inside the dialog we are using some ko handlers so need to initialize them
                    CustomHandlers.initKnockoutHandlers();

                    let azureEndpointDialogModel = new AzureRMEndpointsManageDialog.AddAzureRmEndpointsModel(this._endpointCreatedSuccessCallback, { spnCreateMethod: AzureRMEndpointsManageDialog.SpnCreateMethod.Manual });
                    Dialogs.show(AzureRMEndpointsManageDialog.AddAzureRmEndpointsDialog, azureEndpointDialogModel);
                });
        }
        else if (Utils_String.equals(this.props.connectedServiceType, EndpointType.GitHub, true)) {
            this.setState({ showNewConnectionControl: true });
        }

        else if (Utils_String.equals(this.props.connectedServiceType, EndpointType.Docker, true)) {

            VSS.using(["DistributedTasksCommon/ServiceEndpoints/DockerRegistryManageDialog", "DistributedTasksCommon/TFS.Knockout.CustomHandlers"],
                (DockerRegistryManageDialog: typeof DockerRegistryManageDialog_NO_REQUIRE, CustomHandlers: typeof CustomHandlers_NO_REQUIRE) => {

                    // Inside the dialog we are using some ko handlers so need to initialize them
                    CustomHandlers.initKnockoutHandlers();

                    let dockerEndpointDialogModel = new DockerRegistryManageDialog.AddDockerRegistryEndpointModel(this._endpointCreatedSuccessCallback);
                    Dialogs.show(DockerRegistryManageDialog.AddDockerRegistryEndpointsDialog, dockerEndpointDialogModel);
                });
        }

        else if (Utils_String.equals(this.props.connectedServiceType, EndpointType.Kubernetes, true)) {

            VSS.using(["DistributedTasksCommon/ServiceEndpoints/KubernetesEndpointManageDialog", "DistributedTasksCommon/TFS.Knockout.CustomHandlers"],
                (KubernetesEndpointManageDialog: typeof KubernetesEndpointManageDialog_NO_REQUIRE, CustomHandlers: typeof CustomHandlers_NO_REQUIRE) => {

                    // Inside the dialog we are using some ko handlers so need to initialize them
                    CustomHandlers.initKnockoutHandlers();

                    let kubernetesEndpointDialogModel = new KubernetesEndpointManageDialog.AddKubernetesEndpointModel(this._endpointCreatedSuccessCallback);
                    Dialogs.show(KubernetesEndpointManageDialog.AddKubernetesEndpointsDialog, kubernetesEndpointDialogModel);
                });
        }
        // Dialog for endpoints containing UI contributions
        else if (!!this.state.addServiceConnectionDetails.endpointType.uiContributionId) {
            let endpointType = this.state.addServiceConnectionDetails.endpointType;

            VSS.using(["DistributedTasksCommon/ServiceEndpoints/ServiceEndpointUIContributionManageDialog", "DistributedTasksCommon/TFS.Knockout.CustomHandlers"],
                (ServiceEndpointUIContributionManageDialog: typeof ServiceEndpointUIContributionManageDialog_NO_REQUIRE, CustomHandlers: typeof CustomHandlers_NO_REQUIRE) => {

                    let contributionsPromise: any;
                    contributionsPromise = Service.getService(Contributions_Services.ExtensionService).getContributionsForTarget("ms.vss-endpoint.endpoint-ui-catalog");
                    contributionsPromise.then((contributions) => {
                        if (contributions) {
                            let uiContribution: Contributions_Contracts.Contribution[];
                            let serviceEndpointType;
                            let serviceEndpointDisplayName;
                            uiContribution = contributions.filter((contribution) => contribution.id.toLowerCase().endsWith(endpointType.uiContributionId.toLowerCase()));
                            if (uiContribution) {
                                serviceEndpointDisplayName = endpointType.displayName;
                                serviceEndpointType = endpointType.name;
                                // Inside the dialog we are using some ko handlers so need to initialize them
                                CustomHandlers.initKnockoutHandlers();

                                let serviceEndpointUIContributionManageDialog = new ServiceEndpointUIContributionManageDialog.AddServiceEndpointUIContributionConnectionModel(this._endpointCreatedSuccessCallback, endpointType.dataSources, uiContribution[0], serviceEndpointType, serviceEndpointDisplayName);
                                Dialogs.show(ServiceEndpointUIContributionManageDialog.AddServiceEndpointUIContributionDialog, serviceEndpointUIContributionManageDialog);
                            }
                            else {
                                Diag.logError(Utils_String.format(Resources.FailedToFindEndpointUIContribution, endpointType.uiContributionId));
                            }
                        }
                    });
                });
        }

        // Dialog for rest of the endpoint types
        else {
            let endpointType = this.state.addServiceConnectionDetails.endpointType;

            VSS.using(["DistributedTasksCommon/ServiceEndpoints/CustomEndpointsManageDialog", "DistributedTasksCommon/TFS.Knockout.CustomHandlers"],
                (CustomEndpointsManageDialog: typeof CustomEndpointsManageDialog_NO_REQUIRE, CustomHandlers: typeof CustomHandlers_NO_REQUIRE) => {

                    // Inside the dialog we are using some ko handlers so need to initialize them
                    CustomHandlers.initKnockoutHandlers();

                    let customEndpointDialogModel = new CustomEndpointsManageDialog.AddCustomConnectionsModel(endpointType, Utils_String.empty, null, endpointType.authenticationSchemes[0].scheme, false, this._endpointCreatedSuccessCallback);
                    Dialogs.show(CustomEndpointsManageDialog.AddCustomConnectionsDialog, customEndpointDialogModel);
                });
        }
    }

    private _publishaddServiceEndPointTelemetry(connectedServiceType: string, authScheme?: string, isSuccess?: boolean) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.ServiceEndpointType] = connectedServiceType;
        if (authScheme) {
            eventProperties[Properties.ServiceEndpointAuthScheme] = authScheme;
        }

        if (isSuccess) {
            Telemetry.instance().publishEvent(Feature.AddServiceConnectionSuccess, eventProperties);
        } else {
            Telemetry.instance().publishEvent(Feature.AddServiceConnection, eventProperties);
        }
    }

    /**
     * Show/Hide add connection link
     * 
     * @private
     * @returns 
     * 
     * @memberof ConnectedServiceInputComponentBase
     */
    private _showAddServiceConnectionLinkIfRequired() {

        // Nothing actionable here, as this.state.addServiceConnectionDetails.showAddServiceEndpointLink will take care of show/hide
        // Only if it's not set fallback to actionCreator
        if (this.state.addServiceConnectionDetails.showAddServiceEndpointLink !== null) {
            return;
        }

        this._inputActionsCreator.updateAddServiceEndpointLink(this.props.connectedServiceType, this.props.authSchemes);
    }

    /**
     * Handle the success scenario of endpoint creation
     * 
     * @private
     * 
     * @memberof ConnectedServiceInputComponentBase
     */
    private _endpointCreatedSuccessCallback = (endpoint: ServiceEndpoint) => {
        this._publishaddServiceEndPointTelemetry(this.props.connectedServiceType,
            endpoint.authorization ? endpoint.authorization.scheme : null, true);

        let options = this.state.optionsMap;
        options[endpoint.id] = endpoint.name;

        // set the value to the endpoint created
        let newValue: string;
        if (!!this.props.onValueChanged) {
            // If multiselect, append the value
            if (this._isMultiSelect()) {
                let currentValues: string[] = this.state.value.split(Common.CommaSeparator);
                currentValues.push(endpoint.id);
                newValue = currentValues.join(Common.CommaSeparator);
            }
            // If not multiselect, overwrite the value
            else {
                newValue = endpoint.id;
            }
        }

        if (!!this.props.onConnectionAdded) {
            this.props.onConnectionAdded(options, newValue);
        } else {
            if (!!this.props.onOptionsChanged) {
                this.props.onOptionsChanged(options);
            }

            if (!!this.props.onValueChanged) {
                this.props.onValueChanged(newValue);
            }
        }

        if (this.state.showNewConnectionControl) {
            this.setState({ showNewConnectionControl: false });
        }
    }

    private _refreshIfRequired = (): IPromise<boolean> => {
        let refreshDeferred = Q.defer<boolean>();

        if (this.state.optionsMap &&
            Object.keys(this.state.optionsMap).length === 0) {
            this._update().then(() => {
                refreshDeferred.resolve(true);
            }, (error) => {
                refreshDeferred.reject(error);
            });
            return refreshDeferred.promise;
        }
        refreshDeferred.resolve(false);
        return refreshDeferred.promise;
    }

    private _update(): IPromise<void> {
        this._optionsRefreshed = false;
        return ConnectedServiceComponentUtility.getConnectedServiceOptions(this.state.value, this.props.useConnectedService, this.props.connectedServiceType, this.props.authSchemes, this.props.properties).then((connectedServiceInputBaseState: IConnectedServiceInputStateBase) => {
            this._optionsRefreshed = true;
            this.setState({ showLoadingIcon: false } as IConnectedServiceInputStateBase);
            if (!!this.props.onOptionsChanged) {
                this.props.onOptionsChanged(connectedServiceInputBaseState.optionsMap);
            }

            if (connectedServiceInputBaseState.value !== this.state.value) {
                if (!!this.props.onValueChanged) {
                    this.props.onValueChanged(connectedServiceInputBaseState.value);
                }
            }
        }, (error) => {
            this._optionsRefreshed = true;
            this.setState({ showLoadingIcon: false } as IConnectedServiceInputStateBase);
            return Q.reject(error);
        });
    }

    private _isMultiSelect(): boolean {
        return this.props.properties
            && this.props.properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT_FLATLIST]
            && Boolean.isTrue(this.props.properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT_FLATLIST]);
    }

    private _getPickList(): JSX.Element {
        if (!this._pickList) {
            let properties = {};
            // Clear out all the other properties which are not supported
            // Currently, only MultiSelectFlatList is supported
            if (this.props.properties && this.props.properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT_FLATLIST]) {
                const multiSelectFlatListValue: string = this.props.properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT_FLATLIST];
                properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT_FLATLIST] = multiSelectFlatListValue;
            }
            // If not multiselect, make the pickList editable to leave previous behavior unchanged
            else {
                properties[Common.INPUT_TYPE_PROPERTY_EDITABLE_OPTIONS] = Common.BOOLEAN_TRUE;
            }

            this._pickList = (
                <div className="fabric-style-overrides input-control-dropdown connected-service-combobox">
                    <PickList
                        key="pick-list-component"
                        ref={this._resolveRef("_pickListControl")}
                        selectedValues={this._getSelectedOption()}
                        refreshCallback={this._refreshIfRequired}
                        properties={properties}
                        onChanged={this._onChanged}
                        enabled={!this.props.disabled}
                        options={this.state.optionsMap}
                        ariaLabel={this.props.ariaLabel}
                        ariaLabelledBy={this.props.ariaLabelledBy}
                        ariaDescribedBy={this.props.ariaDescribedBy}
                        ariaRequired={this.props.required} />
                </div>
            );
        }
        else {
            this._pickListControl.updateSource(this.state.optionsMap, this._getSelectedOption(), !this.props.disabled);
        }

        return this._pickList;
    }

    private _currentText: string;

    private _store: ConnectedServiceInputStore;
    private _inputActionsCreator: ConnectedServiceInputActionsCreator;
    private _pickListControl: PickList;
    private _pickList: JSX.Element;
    private _optionsRefreshed: boolean = false;
    private _newButton: IButton;
}
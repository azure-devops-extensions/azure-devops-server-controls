/// <reference types="react" />

import * as React from "react";
import * as Q from "q";

import * as AzureRMEndpointsManageDialog_NO_REQUIRE from "DistributedTasksCommon/ServiceEndpoints/AzureRMEndpointsManageDialog";
import { ServiceEndpointType , EndpointAuthorizationSchemes } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common";
import * as CustomHandlers_NO_REQUIRE from "DistributedTasksCommon/TFS.Knockout.CustomHandlers";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import {
    IInputControlPropsBase,
    IInputControlStateBase,
    InputControlType
} from "DistributedTaskControls/SharedControls/InputControls/Common";
import { ConnectedServiceComponentUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceComponentUtility";
import { AzureResourceManagerInputCombo } from "DistributedTaskControls/SharedControls/InputControls/Components/AzureResourceManagerInputCombo";
import { AzureResourceManagerComponentUtility, IAzureResourceManagerComponentOptions } from "DistributedTaskControls/SharedControls/InputControls/Components/AzureResourceManagerComponentUtility";
import { Component as RequiredIndicator } from "DistributedTaskControls/SharedControls/InputControls/Components/RequiredIndicator";
import { ARMInputStore, IAzureRMInputBaseState } from "DistributedTaskControls/SharedControls/InputControls/Components/ARMInputStore";
import { ARMInputActionsCreator } from "DistributedTaskControls/SharedControls/InputControls/Components/ARMInputActionsCreator";
import { ManageLink, IManageLinkProps, ManageLinkType } from "DistributedTaskControls/Components/ManageLink";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { PrimaryButton, IconButton, CommandButton } from "OfficeFabric/Button";
import { Icon, IIconProps } from "OfficeFabric/Icon";
import { Async, css } from "OfficeFabric/Utilities";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";
import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";

import * as Diag from "VSS/Diag";
import * as VSS from "VSS/VSS";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Dialogs from "VSS/Controls/Dialogs";
import { AriaAttributes } from "VSS/Controls";
import LWP = require("VSS/LWP");

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ComboBox";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/AzureResourceManagerInputComponent";

export interface IAzureResourceManagerInputProps extends IInputControlPropsBase<string> {
    authSchemes: string;
    instanceId: string;
    properties?: IDictionaryStringTo<string>;
}

export class AzureResourceManagerInputComponent extends InputBase<string, IAzureResourceManagerInputProps, IInputControlStateBase<string>> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_AZURE_RESOURCE_MANAGER;
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[AzureConnectionInputComponent.getControl]: Method called.");
        return (
            <AzureRMInputBaseComponent
                properties={this.props.properties}
                label={this.props.label}
                required={this.props.required}
                disabled={this.props.disabled}
                value={this.state.value}
                onValueChanged={this.onValueChanged}
                instanceId={this.props.instanceId}
                authSchemes={this.props.authSchemes}
                ariaLabelledBy={this.props.ariaLabelledBy || this.getInputFieldLabelElementId()}
                ariaDescribedBy={this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId()}
                ariaLabel={this.props.ariaLabel}
                onNotifyValidationResult={this.props.onNotifyValidationResult} />
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

export class AzureRMInputBaseComponent extends Base.Component<IAzureResourceManagerInputProps, IAzureRMInputBaseState> {

    public componentWillMount(): void {

        let instanceId = this.props.instanceId;

        this._store = StoreManager.GetStore<ARMInputStore>(ARMInputStore, instanceId);
        this._armInputActionsCreator = ActionsHubManager.GetActionsHub<ARMInputActionsCreator>(ARMInputActionsCreator, instanceId);
        this._debouncedUpdateEndpointAuthorizationScope = (new Async()).debounce(this._armInputActionsCreator.updateEndpointAuthorizationScope, 1000);
    }

    public componentDidMount() {
        super.componentDidMount();

        this._selectedSubscription = this._store.getState().subscription;
        this._armInputComboControl.setText(this._store.getState().text);
        this.setState(this._store.getState());

        this._store.addChangedListener(this._onStoreChanged);

        this._refresh(false);
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this._store.removeChangedListener(this._onStoreChanged);
    }

    public render(): JSX.Element {

        const ariaAttributes: AriaAttributes = {
            label: this.props.ariaLabel,
            labelledby: this.props.ariaLabelledBy,
            describedby: this.props.ariaDescribedBy
        };

        let refreshIconClassName: string = this.state.showLoadingIcon ? "bowtie-icon bowtie-spinner" : "azure-manager-input-refresh-icon";
        let refreshButtonIconName: string = css({ "Refresh": !this.state.showLoadingIcon });
        const infoMessageClassName: string = !!this.state.authInProgress ? "required-indicator-info-message" : "";
        return (
            <div className="azurerm-combo-container">
                <div className="azurerm-combo-dropdown">
                    <RequiredIndicator value={this.props.value} onGetErrorMessage={this._getErrorMessage} cssClass={infoMessageClassName} onNotifyValidationResult={this.props.onNotifyValidationResult} >
                        <div className="bowtie fabric-style-overrides input-field-picklist">
                            <AzureResourceManagerInputCombo
                                ref={(elem) => {

                                    // This will delay initialize. If you use this variable make sure you check for null
                                    this._armInputComboControl = elem;
                                }}
                                disabled={this.props.disabled}
                                onChanged={(option: string, subscription: DistributedTaskContracts.AzureSubscription) => { this._onChanged(option, subscription); }}
                                ariaAttributes={ariaAttributes}
                                onRefresh={() => this._refresh(false)}
                            />
                        </div>
                        {
                            this._getDescription()
                        }
                    </RequiredIndicator>
                </div>
                <div className="input-control-buttons arm-input-buttons">
                    {
                        this.state.showAuthorize && !this.props.disabled &&
                        <PrimaryButton
                            disabled={this.props.disabled || !this.state.enableAuthorize}
                            onClick={(event: React.MouseEvent<HTMLButtonElement>) => this._onAuthorizeClick(event)}
                            className={css("fabric-style-overrides", "input-control-primary-button")}
                            ariaLabel={this._getAuthorizeButtonText()}
                            aria-disabled={this.props.disabled || !this.state.enableAuthorize}
                            split={true}
                            menuProps={{
                                items: [
                                    {
                                        key: "advancedOptions",
                                        name: Resources.ARMEndpointAdvancedOptions,
                                        iconProps: {
                                            iconName: "settings"
                                        } as IIconProps,
                                        onClick: this._onClickAdvancedOptions
                                    }
                                ]
                            }} >
                            {
                                !!this.state.authInProgress &&
                                <span className="bowtie-icon bowtie-spinner" />
                            }
                            {this._getAuthorizeButtonText()}
                        </PrimaryButton>
                    }
                    {
                        !this.props.disabled &&
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
                        this.state.showAddServiceEndpointLink && !this.props.disabled &&
                        <CommandButton
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
        );
    }

    private _onStoreChanged = () => {
        let state = this._store.getState();
        this.setState(state);
    }

    private _getDescription = () => {
        let warningMessage = null;
        const scheme = this._getAuthScheme();
        const scopeLevel = this._getScopeLevel();
        if (scheme && scheme === EndpointAuthorizationSchemes.ManagedServiceIdentity) {
            warningMessage = Resources.MSIResourceMissingWarning;
        } else if (!!this.state.authorizationScope) {
            warningMessage = AzureResourceManagerComponentUtility.getUserFriendlyAuthorizationScope(this.state.authorizationScope);
        } else if (!!scopeLevel) {
            warningMessage = Utils_String.localeFormat(Resources.ARMEndpointScope, scopeLevel);
        }
        
        if (!!warningMessage){
            return <div className="azurerm-combo-description">
                <Icon iconName="Info" className="azurerm-combo-description-icon" />
                {warningMessage}
            </div>;
        }
    }

    private _getAuthScheme = () => {
        const endpoints = this._store.getState().endpoints;
        let authorizationScheme = null;
        if (endpoints) {
            const endpoint = endpoints[this.props.value];
            if (endpoint && endpoint.authorization && endpoint.authorization.scheme) {
                authorizationScheme = endpoint.authorization.scheme;
            }
        }

        return authorizationScheme;
    }

    private _getScopeLevel() {
        const endpoints = this._store.getState().endpoints;
        const subscriptionString = "subscription";
        let scopeLevel = subscriptionString;
        if (endpoints) {
            const endpoint = endpoints[this.props.value];

            if (endpoint && endpoint.data && endpoint.data.scopeLevel) {
                scopeLevel = endpoint.data.scopeLevel;
                let name =  Utils_String.equals(scopeLevel, subscriptionString, true) ? endpoint.data.subscriptionName : endpoint.data.managementGroupName;

                if (!!name) {
                    return Utils_String.localeFormat("{0} '{1}'", scopeLevel.toLocaleLowerCase(), name);
                }
            } 
        }

        return null;
    }

    private _getErrorMessage = (): string => {

        // User needs to take action i.e. Click on Authorize
        // So, keeping it as red border/text scenario
        // ToDo: (bhbhati) It should be info not error scenario, refactor RequiredIndicator to take care of such scenario
        if (this.state.authInProgress) {
            return Resources.AuthorizationInprogressInfoMessage;
        }
        else if (this._selectedSubscription) {
            return Resources.ClickAuthorizeHelpText;
        }
        else if (this.props.required && this.props.value === Utils_String.empty && this._store.getState().text !== "") {
            return Resources.RequiredInputInValidMessage;
        }
        else if (this.props.required && this.props.value === Utils_String.empty) {
            return Resources.RequiredInputErrorMessage;
        }
        return Utils_String.empty;
    }

    private _onRefreshClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        this._onRefresh(event);
        Utils_Core.delay(this, 500, () => {
            if (!this._optionsRefreshed) {
                this.setState({ showLoadingIcon: true } as IAzureRMInputBaseState);
            }
        });
    }

    private _onRefresh = (event: React.MouseEvent<HTMLButtonElement>) => {
        this._refresh(true);
    }

    private _refresh(forceRefresh: boolean): IPromise<void> {
        let refreshDeferred = Q.defer<void>();
        this._optionsRefreshed = false;
        AzureResourceManagerComponentUtility.getConnectedServiceAzureRMOptions(this.props.value, this.props.authSchemes, forceRefresh, forceRefresh, this.props.properties).then((azureRMComponentOptions: IAzureResourceManagerComponentOptions) => {
            refreshDeferred.resolve(null);
            this._optionsRefreshed = true;
            this.setState({ showLoadingIcon: false } as IAzureRMInputBaseState);
            this._armInputActionsCreator.showAddServiceEndpointLink(azureRMComponentOptions.showAddServiceEndpointLink);

            // Delay initialization of _armInputComboControl can cause null reference exception
            if (this._armInputComboControl) {
                this._armInputComboControl.updateSource(azureRMComponentOptions);

                if (this.props.value !== azureRMComponentOptions.value) {
                    this.props.onValueChanged(azureRMComponentOptions.value);
                }

                this._armInputActionsCreator.updateEndpoints(azureRMComponentOptions.endpoints);
                this._armInputActionsCreator.updateEndpointAuthorizationScope(azureRMComponentOptions.value);
            }

        }, (error) => {
            this._optionsRefreshed = true;
            refreshDeferred.reject(error);
            this.setState({ showLoadingIcon: false } as IAzureRMInputBaseState);
        });

        return refreshDeferred.promise;
    }

    private _onChanged = (option: string, subscription: DistributedTaskContracts.AzureSubscription) => {

        if (!!subscription) {
            this._armInputActionsCreator.updateAuthorizationState({ showAuthorize: true, enableAuthorize: true, authInProgress: false });
            this._debouncedUpdateEndpointAuthorizationScope(Utils_String.empty);
        }
        else {
            this._armInputActionsCreator.updateAuthorizationState({ showAuthorize: false, enableAuthorize: false, authInProgress: false });
            this._debouncedUpdateEndpointAuthorizationScope(option);
        }

        this._selectedSubscription = subscription;

        this._armInputActionsCreator.updateSubscription(this._selectedSubscription);
        this._armInputActionsCreator.updateText(this._armInputComboControl.getText());

        if (this.props.onValueChanged) {
            this.props.onValueChanged(option);
        }
    }

    private _onAuthorizeClick = (event: React.MouseEvent<HTMLButtonElement>) => {

        this._armInputActionsCreator.updateAuthorizationState({ showAuthorize: true, enableAuthorize: false, authInProgress: true });

        AzureResourceManagerComponentUtility.createServiceEndpoint(this._selectedSubscription, () => { return; }).then((endpoint: ServiceEndpoint) => {

            AzureResourceManagerComponentUtility.getConnectedServiceAzureRMOptions(endpoint.id, this.props.authSchemes, true, true, this.props.properties).then((azureRMComponentOptions: IAzureResourceManagerComponentOptions) => {

                this._selectedSubscription = null;
                this._armInputActionsCreator.updateSubscription(this._selectedSubscription);

                if (this._armInputComboControl) {
                    this._armInputComboControl.updateSource(azureRMComponentOptions);
                }
                this._armInputActionsCreator.updateAuthorizationState({ showAuthorize: false, enableAuthorize: false, authInProgress: false });

                if (this.props.onValueChanged) {
                    this.props.onValueChanged(azureRMComponentOptions.value);
                }

                this._armInputActionsCreator.updateEndpoints(azureRMComponentOptions.endpoints);
            });
        },
            (error) => {
                Diag.logError(error);
                if (!!error) {
                    VSS.handleError({ name: "", message: Resources.EndpointCreationOperationFailed, stack: error });
                }

                this._armInputActionsCreator.updateAuthorizationState({ showAuthorize: true, enableAuthorize: true, authInProgress: false });
            }
        );
    }

    private _getAuthorizeButtonText() {
        return (!!this.state.authInProgress) ? Resources.Authorizing : Resources.Authorize;
    }

    private _onAddServiceEndpoint = (event: React.MouseEvent<HTMLButtonElement>) => {

        this._publishaddServiceEndPointTelemetry(ServiceEndpointType.AzureRM);

        VSS.using(["DistributedTasksCommon/ServiceEndpoints/AzureRMEndpointsManageDialog", "DistributedTasksCommon/TFS.Knockout.CustomHandlers"],
            (AzureRMEndpointsManageDialog: typeof AzureRMEndpointsManageDialog_NO_REQUIRE, CustomHandlers: typeof CustomHandlers_NO_REQUIRE) => {

                // Inside the dialog we are using some ko handlers so need to initialize them
                CustomHandlers.initKnockoutHandlers();

                let azureEndpointDialogModel = new AzureRMEndpointsManageDialog.AddAzureRmEndpointsModel(this._endpointCreatedSuccessCallback, { spnCreateMethod: AzureRMEndpointsManageDialog.SpnCreateMethod.Manual });
                Dialogs.show(AzureRMEndpointsManageDialog.AddAzureRmEndpointsDialog, azureEndpointDialogModel);
            });
    }

    private _onClickAdvancedOptions = (ev, item) => {
        VSS.using(["DistributedTasksCommon/ServiceEndpoints/AzureRMEndpointsManageDialog", "DistributedTasksCommon/TFS.Knockout.CustomHandlers"],
            (AzureRMEndpointsManageDialog: typeof AzureRMEndpointsManageDialog_NO_REQUIRE, CustomHandlers: typeof CustomHandlers_NO_REQUIRE) => {

                // Inside the dialog we are using some ko handlers so need to initialize them
                CustomHandlers.initKnockoutHandlers();

                let azureEndpointDialogModel = new AzureRMEndpointsManageDialog.AddAzureRmEndpointsModel(this._endpointCreatedSuccessCallback, { spnCreateMethod: AzureRMEndpointsManageDialog.SpnCreateMethod.Automatic });
                azureEndpointDialogModel.name(this.state.text);
                azureEndpointDialogModel.tenantId(this.state.subscription.subscriptionTenantId);
                azureEndpointDialogModel.subscriptionId(this.state.subscription.subscriptionId);
                azureEndpointDialogModel.subscriptionName(this.state.subscription.displayName);
                Dialogs.show(AzureRMEndpointsManageDialog.AddAzureRmEndpointsDialog, azureEndpointDialogModel);
            }
        );
    }

    private _endpointCreatedSuccessCallback = (endpoint: ServiceEndpoint) => {

        if (endpoint && endpoint.id) {

            AzureResourceManagerComponentUtility.getConnectedServiceAzureRMOptions(endpoint.id, this.props.authSchemes, false, true, this.props.properties).then((azureRMComponentOptions: IAzureResourceManagerComponentOptions) => {
                if (this._selectedSubscription) {
                    // user authorized a subscription from Advanced Options
                    this._selectedSubscription = null;
                    this._armInputActionsCreator.updateSubscription(this._selectedSubscription);
                    this._armInputActionsCreator.updateAuthorizationState({ showAuthorize: false, enableAuthorize: false, authInProgress: false });
                    this._armInputActionsCreator.updateText(endpoint.name);

                    let authorizationScope: string = AzureResourceManagerComponentUtility.getEndpointAuthorizationScopeFromEndpoint(endpoint);
                    this._armInputActionsCreator.updateEndpointAuthorizationScope(endpoint.id, authorizationScope);
                }

                if (this._armInputComboControl) {
                    this._armInputComboControl.updateSource(azureRMComponentOptions);
                }

                if (this.props.onValueChanged) {
                    this.props.onValueChanged(azureRMComponentOptions.value);
                }

                this._armInputActionsCreator.updateEndpoints(azureRMComponentOptions.endpoints);
            });
        }
    }

    private _publishaddServiceEndPointTelemetry(connectedServiceType: string) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.ServiceEndpointType] = connectedServiceType;

        Telemetry.instance().publishEvent(Feature.AddServiceConnection, eventProperties);
    }

    private _armInputComboControl: AzureResourceManagerInputCombo;
    private _selectedSubscription: DistributedTaskContracts.AzureSubscription;

    private _store: ARMInputStore;
    private _armInputActionsCreator: ARMInputActionsCreator;
    private _optionsRefreshed: boolean = false;
    private _debouncedUpdateEndpointAuthorizationScope: (endpointId: string) => void;
}

LWP.registerLWPComponent("azureResourceManagerInputComponent", AzureResourceManagerInputComponent);
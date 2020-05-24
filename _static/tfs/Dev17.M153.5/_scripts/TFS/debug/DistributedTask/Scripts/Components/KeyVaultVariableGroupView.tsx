/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Q = require("q");

import Component_Base = require("VSS/Flux/Component");

import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import VSS = require("VSS/VSS");
import Context = require("VSS/Context");
import Service = require("VSS/Service");
import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");
import DistributedTaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import Constants = require("DistributedTask/Scripts/Constants");
import Markdown = require("DistributedTaskControls/Components/MarkdownRenderer");
import CopyButton = require("DistributedTaskControls/Components/CopyButton");
import Events_Services = require("VSS/Events/Services");
import * as Async_ChooseKeyVaultSecretsDialog from "DistributedTask/Scripts/Components/ChooseKeyVaultSecretsDialog";
import * as Async_Dialogs from "VSS/Controls/Dialogs";

import * as DTResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { KeyCodes } from "DistributedTaskControls/Common/ShortKeys";
import { ComboBox as EditableComboBox, ComboBoxType } from "DistributedTaskControls/Components/ComboBox";
import { IFlatViewCell, IFlatViewTableRow, ICellIndex, ContentType, IFlatViewColumn } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { FlatViewTableWithAddButton } from "DistributedTaskControls/Components/FlatViewTableWithAddButton";
import { FlatViewButton } from "DistributedTaskControls/Components/FlatViewButton";
import { PrimaryButton, IconButton } from "OfficeFabric/Button";
import { css } from "OfficeFabric/Utilities";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { KeyVaultVariableGroupStore, IKeyVaultVariableGroupDetails, VaultReference } from "DistributedTask/Scripts/Stores/KeyVaultVariableGroupStore";
import { Label } from "OfficeFabric/Label";
import { AzureResourceManagerInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/AzureResourceManagerInputComponent";
import { AzureKeyVaultVariable, VariableGroup, AzureKeyVaultSecretTypes } from "DistributedTask/Scripts/DT.VariableGroup.Model";
import { Component as RequiredIndicator } from "DistributedTaskControls/SharedControls/InputControls/Components/RequiredIndicator";
import { MessageBar, MessageBarType } from 'OfficeFabric/MessageBar';
import { AzureRmEndpointUtils } from "DistributedTasksCommon/ServiceEndpoints/AzureRMEndpointsManageDialog";

import Library_Actions = require("DistributedTask/Scripts/Actions/LibraryActions");

export interface State extends Component_Base.State {
    data: IKeyVaultVariableGroupDetails;
}

export class KeyVaultVariableGroupView extends Component_Base.Component<Component_Base.Props, State> {

    constructor(props: Component_Base.Props) {
        super(props);

        this._isHosted = !!Context.getPageContext().webAccessConfiguration.isHosted;

        this._store = StoreManager.GetStore<KeyVaultVariableGroupStore>(KeyVaultVariableGroupStore);

        this.state = this.getState();
        (this.state as State).data = this.getKeyVaultVariableGroupDetailsClone();
        
        let connection: Service.VssConnection = new Service.VssConnection(Context.getDefaultWebContext());
        this._connectedServicesClient = connection.getService<DistributedTaskModels.ConnectedServicesClientService>(DistributedTaskModels.ConnectedServicesClientService);
    }

    private getKeyVaultVariableGroupDetailsClone(): IKeyVaultVariableGroupDetails {
        let keyVaultVariableGroupDetails = this._store.getKeyVaultVariableGroupDetails();
        var keyVaultsList: string[] = Utils_Array.clone(keyVaultVariableGroupDetails.keyVaultsList);
        var keyVaultReferencesList: VaultReference[] = Utils_Array.clone(keyVaultVariableGroupDetails.keyVaultReferencesList);
        var secrets: AzureKeyVaultVariable[] = Utils_Array.clone(keyVaultVariableGroupDetails.secrets);;

        return {
            keyVaultsList: keyVaultsList,
            keyVaultReferencesList: keyVaultReferencesList,
            spnHasRequiredKeyVaultPermissions: keyVaultVariableGroupDetails.spnHasRequiredKeyVaultPermissions,
            authInProgress: keyVaultVariableGroupDetails.authInProgress,
            lastRefreshedOn: keyVaultVariableGroupDetails.lastRefreshedOn,
            secrets: secrets,
            serviceEndpointId: keyVaultVariableGroupDetails.serviceEndpointId,
            vault: keyVaultVariableGroupDetails.vault,
            formattedScript: keyVaultVariableGroupDetails.formattedScript
        };
    }

    protected getState(): State {
        if (this.state == null) {
            return { data: { vault: Utils_String.empty, keyVaultsList: [], keyVaultReferencesList: [], spnHasRequiredKeyVaultPermissions: true, authInProgress: false, lastRefreshedOn: null, secrets: [], serviceEndpointId: Utils_String.empty, formattedScript: Utils_String.empty } };
        }

        return this.state;
    }

    public render(): JSX.Element {

        var keyVaultVariableGroupDetails = this.getState().data;
        var lastRefreshedOnString = Utils_String.empty;
        if (keyVaultVariableGroupDetails.lastRefreshedOn)
        {
            lastRefreshedOnString = Utils_String.localeFormat(Resources.LastRefreshedOnLabelFormat, Utils_Date.friendly(keyVaultVariableGroupDetails.lastRefreshedOn));
        } 

        return (
            <div className={"kv-vg-view"}>
                <div className={"kv-vg-azsub"}>
                    <AzureResourceManagerInputComponent
                        authSchemes={""}
                        instanceId={"azurekeyvault-connectedservice"}
                        label={Resources.AzureKeyVaultSubscriptionLabel}
                        value={keyVaultVariableGroupDetails.serviceEndpointId}
                        onValueChanged={this.onServiceEndPointValueChanged}
                        required={true}
                        readOnly={false}
                        disabled={false}
                        forceUpdate={false} />
                </div>

                <div className={"kv-vg-keyvault"}>
                    <div className="kv-vg-lbl-grp">
                        <Label required={true} className={"kv-vg-lbl"}>{Resources.AzureKeyVaultNameLabel}</Label>
                        <SafeLink className="kv-vg-managekvlink" href="https://portal.azure.com" target="_blank" >
                            {Resources.ManageInAzurePortalText}
                            <i className="bowtie-icon bowtie-navigate-external"></i>
                        </SafeLink>
                    </div>
                    <div className="kv-vg-container">
                        <RequiredIndicator value={keyVaultVariableGroupDetails.vault}  onGetErrorMessage={this._getKeyVaultErrorMessage} >
                            <div className="kv-vg-kvbox">
                                <div className="bowtie fabric-style-overrides input-field-picklist">
                                        <EditableComboBox
                                            ariaLabel={Resources.AzureKeyVaultNameLabel}
                                            value={keyVaultVariableGroupDetails.vault}
                                            comboBoxType={ComboBoxType.Editable}
                                            source={keyVaultVariableGroupDetails.keyVaultsList}
                                            onChange={this.onKeyVaultValueChanged}
                                            enabled={true} />
                                </div>
                                <div className="kv-vg-control-buttons">
                                    {
                                        !keyVaultVariableGroupDetails.spnHasRequiredKeyVaultPermissions &&
                                        this._isHosted &&
                                        <div className="kv-vg-authorize-section">
                                            <PrimaryButton
                                                disabled={keyVaultVariableGroupDetails.authInProgress}
                                                onClick={(event: React.MouseEvent<HTMLButtonElement>) => this.onAuthorizeClick(keyVaultVariableGroupDetails.serviceEndpointId, keyVaultVariableGroupDetails.vault)}
                                                className={css("fabric-style-overrides", "input-control-primary-button")}
                                                ariaLabel={DTResources.Authorize}
                                                aria-disabled={keyVaultVariableGroupDetails.authInProgress}>
                                                {
                                                    !!keyVaultVariableGroupDetails.authInProgress &&
                                                    <span className="bowtie-icon bowtie-spinner" />
                                                }
                                                {DTResources.Authorize}
                                            </PrimaryButton>
                                        </div>
                                    }
                                    <IconButton
                                        ariaLabel={Resources.RefreshKeyVaultsList}
                                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => this.refreshKeyVaultsList()}
                                        iconProps={{ iconName: "Refresh" }}
                                        className={css("input-control-icon-button", "fabric-style-overrides", "icon-button-override")}
                                    />
                                </div>
                            </div>
                        </RequiredIndicator>
                    </div>
                </div>
                {
                    !keyVaultVariableGroupDetails.spnHasRequiredKeyVaultPermissions &&
                    !this._isHosted &&
                    !!keyVaultVariableGroupDetails.formattedScript &&
                    <div className={"kv-vg-permissionscmdlet"} role = "region">
                        <div className="script-content powershell"><DynamicMarkDown markdown={keyVaultVariableGroupDetails.formattedScript} /></div>
                        <CopyButton.CopyButton cssClass={"btn-cta"} copyText={keyVaultVariableGroupDetails.formattedScript} copyAsHtml={true} buttonTitle={Resources.CopyScriptToClipboard} />
                    </div>
                }
                {
                    (!!keyVaultVariableGroupDetails.vault) &&
                    (keyVaultVariableGroupDetails.spnHasRequiredKeyVaultPermissions
                    || (!!keyVaultVariableGroupDetails.secrets && keyVaultVariableGroupDetails.secrets.length > 0)) &&
                    <div className={"kv-vg-secrets"}>
                    <div className={"kv-vg-secrets-titlebar"}>
                        <h2 id="lib-vg-header-variables" className={"lib-vg-header"}>{Resources.VariablesText}</h2>
                        <h2 id="lib-vg-header-lastrefreshedon" className={"kv-vg-lastRefreshedOn"}>{lastRefreshedOnString}</h2>
                    </div>
                    <FlatViewTableWithAddButton
                        containerClass="kv-vg-vars-table"
                        flatViewContainerClass="kv-vg-vars-list"
                        isHeaderVisible={true}
                        headers={this.getSecretsTableColumnHeaders()}
                        rows={this.getSecretsRows()}
                        onCellValueChanged={this.onCellValueChanged}
                        onAdd={this.launchAddSecretsDialog}
                        addButtonClass="fabric-style-overrides add-new-item-button"
                        ariaLabel={Resources.ARIALabelSecretsTable} />
                </div>
                }
        </div>);
    }

    private onCellValueChanged = (newValue: string, cellIndex: ICellIndex) => {
        // nothing todo
    }

    private launchAddSecretsDialog = () => {
        var keyVaultVariableGroupDetails = this.getState().data;

        VSS.using(["DistributedTask/Scripts/Components/ChooseKeyVaultSecretsDialog"], (Dialogs: typeof Async_ChooseKeyVaultSecretsDialog) => {
            Dialogs.ChooseKeyVaultSecretsDialog.show(Dialogs.ChooseKeyVaultSecretsDialog, {
                dialogClass: "kv-vg-choosesecretsdialog",
                keyVaultVariableGroupDetails: keyVaultVariableGroupDetails,
                title: Resources.ChooseSecretsTitle,
                resizeable: false,
                width: 800,
                height: 600,
                okText: Resources.OkText,
                okCallback: (dialogResult: any) => {
                    var selectedSecrets = dialogResult.selectedSecrets as AzureKeyVaultVariable[];
                    var removedSecrets = dialogResult.removedSecrets as AzureKeyVaultVariable[];
                    this._store.updateSecrets(selectedSecrets, removedSecrets);
                },
                cancelCallback: () => {
                    // Do nothing
                },
                defaultButton: Utils_String.empty
            });
        });
    }

    private _getKeyVaultErrorMessage = (): string => {
        var keyVaultVariableGroupDetails = this.getState().data;

        if (!!keyVaultVariableGroupDetails.vault && !!keyVaultVariableGroupDetails.keyVaultsList && keyVaultVariableGroupDetails.keyVaultsList.length === 0) {
            return Utils_String.empty;
        }

        if (!!keyVaultVariableGroupDetails.vault && !Utils_Array.contains(keyVaultVariableGroupDetails.keyVaultsList, keyVaultVariableGroupDetails.vault)) {
            return DTResources.RequiredInputInValidMessage;
        }

        if (!keyVaultVariableGroupDetails.vault) {
            return DTResources.RequiredInputErrorMessage;
        }

        if (!keyVaultVariableGroupDetails.spnHasRequiredKeyVaultPermissions) {
            if (this._isHosted) {
                return Resources.AzureKeyVaultSpnPermissionsHostedErrorText;
            }
            else {
                return Resources.AzureKeyVaultSpnPermissionsOnPremErrorText;
            }
        }

        return Utils_String.empty;
    }

    private getSecretsTableColumnHeaders(): IFlatViewColumn[] {

        let secretsTableHeaders: IFlatViewColumn[]= [];

        secretsTableHeaders.push({
            key: "delete",
            name: Resources.DeleteSecretText,
            isFixedColumn: true,
            maxWidth: 40
        });

        secretsTableHeaders = Async_ChooseKeyVaultSecretsDialog.KeyVaultSecretsTable.getSecretsTableColumnHeaders(secretsTableHeaders);

        return secretsTableHeaders;
    }

    private getSecretsRows(): IFlatViewTableRow[] {
        let secretRows: IFlatViewTableRow[] = [];
        let row: IFlatViewTableRow;

        let secrets = this.getState().data.secrets;

        secrets.forEach((secret: AzureKeyVaultVariable, index: number) => {
            let row: IFlatViewTableRow = { cells: {} };

            row.cells["delete"] = {
                content: <FlatViewButton
                    tooltip={Resources.DeleteText}
                    rowSelected={false}
                    iconProps={{
                        iconName: "Trash"
                    }}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => { this._store.deleteSecret(index, secret); }}
                    disabled={false} />,
                contentType: ContentType.JsxElement,
            } as IFlatViewCell;

            row = Async_ChooseKeyVaultSecretsDialog.KeyVaultSecretsTable.getSecretRow(row, secret);
            secretRows.push(row);
        });

        return secretRows;
    }

    public componentWillMount(): void {
        this._store.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreChange);
    }

    private onServiceEndPointValueChanged = (newValue: string) => {
        // In AzureResourceManagerInputComponent the input can be changed by both typing and selection hence it will fire the changed event on every change
        // It provides the valid values in the callback if the user has entered/selected a valid subscription or specified a variable. For all other cases, it passes empty string and null
        if (newValue) {
            Library_Actions.updateServiceEndPointInVariableGroup.invoke(newValue);
        }
    }

    private refreshKeyVaultsList = () => {
        Library_Actions.refreshKeyVaultsList.invoke({});
    }

    private onAuthorizeClick = (serviceEndpointId: string, vault: string) => {
        Library_Actions.updateKeyVaultAuthorizationState.invoke(true);

        let authInProgress = (authInProgress: boolean) => {
            // Do nothing
        };

        let spnOperationInProgress = (spnOperationInProgress: boolean) => {
            // Do nothing
        };

        let resourceGroup: string = this._store.getResourceGroup(vault);

        if (!resourceGroup)
        {
            Library_Actions.updateKeyVaultAuthorizationState.invoke(false);
            Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, Utils_String.localeFormat(Resources.KeyVaultNotFoundText, vault));
            return;
        }

        this._connectedServicesClient.beginGetEndpoint(serviceEndpointId).then((endpoint: ServiceEndpointContracts.ServiceEndpoint) => {
            let existingAzureSpnPermissionsJson = endpoint.data["azureSpnPermissions"];

            let mergedAzureSpnPermissions = [];
            if (!!existingAzureSpnPermissionsJson) {
                mergedAzureSpnPermissions = JSON.parse(existingAzureSpnPermissionsJson);
            }

            let keyVaultPermission: DistributedTaskContracts.AzureKeyVaultPermission = {
                provisioned: false,
                resourceProvider: "Microsoft.KeyVault",
                resourceGroup: resourceGroup,
                vault: vault
            };
            mergedAzureSpnPermissions.push(keyVaultPermission);

            endpoint.data["azureSpnPermissions"] = JSON.stringify(mergedAzureSpnPermissions);

            AzureRmEndpointUtils.authorizeServiceEndpoint(
                this._connectedServicesClient, 
                endpoint.authorization.parameters.tenantid,
                authInProgress,
                spnOperationInProgress,
                endpoint,
                this.updateServiceEndpoint).then((provisionEndpointResponse: ServiceEndpointContracts.ServiceEndpoint) => {

                Library_Actions.updateKeyVaultAuthorizationState.invoke(false);

            }, (error) => {
                Library_Actions.updateKeyVaultAuthorizationState.invoke(false);
                Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, error);
            });
        }, (error) => {
            Library_Actions.updateKeyVaultAuthorizationState.invoke(false);
            Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, error);
        });
    }

    private updateServiceEndpoint(serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint, connectedServicesClient: DistributedTaskModels.ConnectedServicesClientService): IPromise<ServiceEndpointContracts.ServiceEndpoint> {
        var spnOperationInProgress = (operationInProgress: boolean) => {
            // Do nothing
        };

        var defer = Q.defer<ServiceEndpointContracts.ServiceEndpoint>();

        connectedServicesClient.beginUpdateServiceEndpoint(serviceEndpoint, "AssignPermissions").then((response: ServiceEndpointContracts.ServiceEndpoint) => {

            AzureRmEndpointUtils.waitForSpnEndpointOperationToComplete(connectedServicesClient, response.id, spnOperationInProgress).then((provisionEndpointResponse) => {
                defer.resolve(provisionEndpointResponse);
            }, (error) => {
                defer.reject(error);
            });

        }, (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

    private onKeyVaultValueChanged = (newValue: string) => {
        Library_Actions.updateKeyVaultNameInVariableGroup.invoke(newValue);
    }

    private showConfirmationDialog(message: String, okCallback: Function, cancelCallback: Function): void {
        VSS.using(["VSS/Controls/Dialogs"], (Dialogs: typeof Async_Dialogs) => {
            Dialogs.Dialog.show(Dialogs.ConfirmationDialog, {
                title: Resources.ChangingVariableGroupTypeTitle,
                contentText: message,
                resizeable: false,
                height: "170px",
                okText: Resources.ConfirmText,
                okCallback: okCallback,
                cancelCallback: cancelCallback
            }).setDialogResult(true);
        });
    }

    private _onStoreChange = () => {
        let state: State = this.getState();
        state.data = this.getKeyVaultVariableGroupDetailsClone();
        this.setState(state);
    }

    private _store: KeyVaultVariableGroupStore;
    private _connectedServicesClient: DistributedTaskModels.ConnectedServicesClientService;
    private _isHosted: boolean;
}

export class DynamicMarkDown extends Markdown.Component{
    public componentWillReceiveProps(nextProps: Markdown.IProps): void {
        if (!Utils_String.equals(this.props.markdown, nextProps.markdown, false))
            this.setState({
                resolvedMarkdown: Markdown.Component.marked(nextProps.markdown)
            });
    }
}
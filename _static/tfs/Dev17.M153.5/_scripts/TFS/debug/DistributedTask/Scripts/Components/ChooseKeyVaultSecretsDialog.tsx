/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import Events_Services = require("VSS/Events/Services");
import PlatformContracts = require("VSS/Common/Contracts/Platform");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_Url = require("VSS/Utils/Url");
import * as VSS from "VSS/VSS";
import VSSContext = require("VSS/Context");

import * as Base from "DistributedTaskControls/Common/Components/Base";
import Constants = require("DistributedTask/Scripts/Constants");
import DTContracts = require("TFS/DistributedTask/Contracts");
import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");

import { AzureKeyVaultVariable, AzureKeyVaultSecretTypes } from "DistributedTask/Scripts/DT.VariableGroup.Model";
import { Checkbox } from "OfficeFabric/Checkbox";
import { Dialog } from "OfficeFabric/Dialog";
import { DialogFooter } from "OfficeFabric/components/Dialog/DialogFooter";
import { DialogType } from "OfficeFabric/components/Dialog/DialogContent.types";
import { Fabric } from "OfficeFabric/Fabric";
import { FlatViewTable, IFlatViewTableProps } from "DistributedTaskControls/Components/FlatViewTable";
import { IFlatViewCell, IFlatViewTableRow, ICellIndex, ContentType, IFlatViewColumn } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { IKeyVaultVariableGroupDetails } from "DistributedTask/Scripts/Stores/KeyVaultVariableGroupStore";
import { IModalDialogOptions, ModalDialogO } from "VSS/Controls/Dialogs";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { Label } from "OfficeFabric/Label";
import { MessageBar, MessageBarType } from 'OfficeFabric/MessageBar';
import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";
import { KeyCode } from "VSS/Utils/UI";

export interface IChooseKeyVaultSecretsOptions extends IModalDialogOptions {
    keyVaultVariableGroupDetails: IKeyVaultVariableGroupDetails;
}

export class SelectableVariable extends AzureKeyVaultVariable {
    isSelected: boolean;
}

export class KeyVaultSecretsTable {
    public static getSecretsTableColumnHeaders(headers: IFlatViewColumn[]): IFlatViewColumn[] {

        headers.push({
            key: "name",
            name: Resources.SecretNameText,
            isFixedColumn: true
        });

        headers.push({
            key: "type",
            name: Resources.ContentTypeText,
            isFixedColumn: true,
            minWidth: 150
        });

        headers.push({
            key: "enabled",
            name: Resources.StatusText,
            isFixedColumn: true
        });

        headers.push({
            key: "expires",
            name: Resources.ExpiresText,
            isFixedColumn: true,
            minWidth: 150
        });

        return headers;
    }

    public static getSecretRow(row: IFlatViewTableRow, secret: AzureKeyVaultVariable): IFlatViewTableRow {
        row.cells["name"] = {
            content: (
                    <Label> {secret.name} </Label>
                ),
            contentType: ContentType.JsxElement
        } as IFlatViewCell;

        row.cells["type"] = {
            content: (
                    <Label> {secret.contentType} </Label>
                ),
            contentType: ContentType.JsxElement
        } as IFlatViewCell;

        row.cells["enabled"] = {
            content: (
                    <Label> { secret.enabled ? Resources.EnabledText : Resources.DisabledText } </Label>
                ),
            contentType: ContentType.JsxElement
        } as IFlatViewCell;

        row.cells["expires"] = {
            content: (
                    <Label> { secret.expires ? Utils_Date.localeFormat(new Date(secret.expires)).replace(",","") : Resources.NeverText } </Label>
                ),
            contentType: ContentType.JsxElement
        } as IFlatViewCell;

        return row;
    }
    
    public static getPropertyValue(theObject: IDictionaryStringTo<string>, prop: string): string {
        var theKeys = Object.getOwnPropertyNames(theObject);
        var lookup = {};
        theKeys.forEach(function(key) {
            lookup[key.toLowerCase()] = theObject[key];
        });

        return lookup[prop.toLowerCase()];
    }
}

export class ChooseKeyVaultSecretsDialog extends ModalDialogO<IChooseKeyVaultSecretsOptions> {
    public initializeOptions(options: IChooseKeyVaultSecretsOptions) {
        this._keyVaultVariableGroupDetails = options.keyVaultVariableGroupDetails;
        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();
        this.updateOkButton(true);

        this.loadSecretsList();
    }

    private render() {
        ReactDOM.render(
            <Fabric>
                <div>
                    <div className={"kv-vg-choose-secrets"}>
                        {this.getMessageControl()}
                        {
                            !this._errorMessage &&
                            <FlatViewTable
                                cssClass="kv-vg-choosesecrets-list"
                                isHeaderVisible={true}
                                headers={this.getSecretsTableColumnHeaders()}
                                rows={this.getSecretsRows()}
                                onCellValueChanged={this.onCellValueChanged}
                            />
                        }
                        {
                            !!this._loadMoreLink &&
                        <div className="lib-vg-loadmore" tabIndex={0} role={"button"} onKeyDown={ this.onLoadMoreKeyDown } onClick={ Utils_Core.delegate(this, () => { this.loadSecretsList(); })}>{Resources.LoadMoreText}</div>
                        }
                    </div>
                </div>
            </Fabric>,
            this._element[0]);
    }

    private onLoadMoreKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
            this.loadSecretsList();
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private onCellValueChanged = (newValue: string, cellIndex: ICellIndex) => {
        // nothing todo
    }

    private getMessageControl(): JSX.Element {
        if (!!this._errorMessage) {
            return (
                <MessageBar messageBarType={ MessageBarType.error } onDismiss={ () => { this.cleanErrorMessage(); } }>
                    {this._errorMessage}
                </MessageBar>
            );
        }
        else {
            return (<Label className={"kv-vg-lbl"}>{Resources.ChooseSecretsMessage}</Label>);
        }
    }

    private cleanErrorMessage(): void {
        this._errorMessage = Utils_String.empty;
        this.render();
    }

    private updateErrorMessageIfRequired(errorMessage: string): void {
        if (!!errorMessage) {
            this._errorMessage = errorMessage;
        }
    }

    private loadSecretsList(): void {
        if (!!this._keyVaultVariableGroupDetails && !!this._keyVaultVariableGroupDetails.serviceEndpointId && !!this._keyVaultVariableGroupDetails.vault) {
            let projectId = VSSContext.getDefaultWebContext().project.id;
            let secretsRequest = this.getServiceEndpointRequest();

            let progressId = VSS.globalProgressIndicator.actionStarted("KeyVaultVariableGroup.getKeyVaultSecrets", true);
            this.getTaskHttpClient().executeServiceEndpointRequest(secretsRequest, projectId, this._keyVaultVariableGroupDetails.serviceEndpointId).then((endpointRequestResult: ServiceEndpointContracts.ServiceEndpointRequestResult) => {
                VSS.globalProgressIndicator.actionCompleted(progressId);

                let result: any = endpointRequestResult.result;
                var errorMessage = Utils_String.empty;

                if (Utils_String.equals(endpointRequestResult.statusCode, "ok", true)) {
                    this.populateAzureKeyVaultSecrets(result);
                    if (!this._secretsInKeyVault || this._secretsInKeyVault.length === 0) {
                        errorMessage = Resources.KeyVaultSecretsNotFoundText;
                    }
                } else {
                    errorMessage = endpointRequestResult.errorMessage;
                }

                this.updateErrorMessageIfRequired(errorMessage);
                this.render();

            }, (err: any) => {
                VSS.globalProgressIndicator.actionCompleted(progressId);

                this._secretsInKeyVault = [];

                this.updateErrorMessageIfRequired(err);
                this.render();
            });
        }
    }

    private getServiceEndpointRequest(): ServiceEndpointContracts.ServiceEndpointRequest {
        var dataSourceName: string;
        var parameters: {[key: string]: string};

        if (!!this._loadMoreLink) {
            let queryParameters = Utils_Url.getQueryParameters(this._loadMoreLink);
            let skipToken = encodeURIComponent(KeyVaultSecretsTable.getPropertyValue(queryParameters, "$skiptoken"));
            dataSourceName = "AzureKeyVaultSecretsWithSkipToken";
            parameters = { 
                "KeyVaultName": this._keyVaultVariableGroupDetails.vault,
                "SkipToken": skipToken 
            };
        }
        else {
            dataSourceName = "AzureKeyVaultSecrets";
            parameters = { "KeyVaultName": this._keyVaultVariableGroupDetails.vault };
        }

        let dataSourceDetails: ServiceEndpointContracts.DataSourceDetails = {
            dataSourceName: dataSourceName,
            dataSourceUrl: null,
            headers: null,
            requestContent: null,
            requestVerb: null,
            resourceUrl: null,
            parameters: parameters,
            resultSelector: null,
            initialContextTemplate: null
        };

        let resultTransformationDetails: ServiceEndpointContracts.ResultTransformationDetails = {
            resultTemplate: null,
            callbackContextTemplate: null,
            callbackRequiredTemplate: null
        };

        let serviceEndpointRequest: ServiceEndpointContracts.ServiceEndpointRequest = {
            serviceEndpointDetails: null,
            dataSourceDetails: dataSourceDetails,
            resultTransformationDetails: resultTransformationDetails
        };

        return serviceEndpointRequest;
    }

    private getTaskHttpClient(): TaskAgentHttpClient {
        if(!this._taskHttpClient)
        {
            var webContext: PlatformContracts.WebContext = VSSContext.getDefaultWebContext();
            var vssConnection: Service.VssConnection = new Service.VssConnection(webContext, PlatformContracts.ContextHostType.ProjectCollection);
            this._taskHttpClient = vssConnection.getHttpClient(TaskAgentHttpClient);
        }

        return this._taskHttpClient;
    }

    private populateAzureKeyVaultSecrets(result: any) {
        if (!this._secretsInKeyVault) {
            this._secretsInKeyVault = [];
        }
        
        if (!!result) {
            var secretsResult = JSON.parse(result);
            if (!!secretsResult.value) {
                this._loadMoreLink = secretsResult.nextLink;
                secretsResult.value.forEach((serverSecret: any) => {
                    var secret: SelectableVariable = {
                        name: Utils_String.empty,
                        isSecret: true,
                        value: null,
                        enabled: false,
                        contentType: Utils_String.empty,
                        expires: null,
                        isSelected: false
                    };

                    if (!!serverSecret.id) {
                        secret.name = Utils_String.singleSplit(Utils_String.singleSplit((Utils_String.singleSplit(serverSecret.id, "://").part2), "/", true).part2, "/").part2;
                    }

                    if (!!serverSecret.attributes) {
                        if (!!serverSecret.attributes.enabled) {
                            secret.enabled = serverSecret.attributes.enabled;
                        }

                        if (!!serverSecret.attributes.exp) {
                            var expires = new Date(0);
                            expires.setSeconds(parseInt(serverSecret.attributes.exp));
                            secret.expires = expires;
                        }
                    }

                    if (!!serverSecret.contentType) {
                        secret.contentType = serverSecret.contentType;
                    }

                    var currentIndex = Utils_Array.findIndex(this._keyVaultVariableGroupDetails.secrets, a => Utils_String.localeIgnoreCaseComparer(a.name, secret.name) === 0);
                    secret.isSelected = (currentIndex >= 0);

                    this._secretsInKeyVault.push(secret);
                });
            }
        }
    }

    public onOkClick(e?: JQueryEventObject): any {
        var selectedSecrets: AzureKeyVaultVariable[] = [];
        var removedSecrets: AzureKeyVaultVariable[] = [];

        if (!!this._secretsInKeyVault) {
            this._secretsInKeyVault.forEach(s => {
                var variable = this.convertToVariable(s);
                if (s.isSelected) {
                    selectedSecrets.push(variable);
                }
                else {
                    removedSecrets.push(variable);
                }
            });
        }

        this.setDialogResult({
            selectedSecrets: selectedSecrets, 
            removedSecrets: removedSecrets 
        });

        super.onOkClick(e);
    }

    public close(): void {
        ReactDOM.unmountComponentAtNode(this._element[0]);
        super.close();
    }

    private convertToVariable(selectableSecret: SelectableVariable): AzureKeyVaultVariable {
        return {
            isSecret: selectableSecret.isSecret,
            name: selectableSecret.name,
            value: selectableSecret.value,
            enabled: selectableSecret.enabled,
            contentType: selectableSecret.contentType,
            expires: selectableSecret.expires
        };
    }

    private getSecretsTableColumnHeaders(): IFlatViewColumn[] {
        let secretsTableHeaders: IFlatViewColumn[] = [];

        secretsTableHeaders.push({
            key: "selected",
            name: Resources.SelectSecretText,
            isFixedColumn: true,
            maxWidth: 30
        });

        secretsTableHeaders = KeyVaultSecretsTable.getSecretsTableColumnHeaders(secretsTableHeaders);
        return secretsTableHeaders;
    }

    private getSecretsRows(): IFlatViewTableRow[] {
        let secretRows: IFlatViewTableRow[] = [];

        if (!this._secretsInKeyVault) {
            return secretRows;
        }

        this._secretsInKeyVault.forEach((secret: SelectableVariable, index: number) => {
            let row: IFlatViewTableRow = { cells: {} };

            let isValidSecret = secret.enabled && (secret.expires === null || Utils_Date.isGivenDayInFuture(secret.expires))

            row.cells["selected"] = {
                content: (
                    <Checkbox className="kv-vg-secretselect"
                        inputProps={{
                            onFocus: null,
                            onBlur: null,
                            "aria-label": (Resources.SelectSecretText),
                            "aria-disabled": (!isValidSecret && !secret.isSelected)
                        }}
                        checked={secret.isSelected}
                        disabled={!isValidSecret && !secret.isSelected}
                        onChange={(ev?: React.FormEvent<HTMLInputElement>, checked?: boolean) => {
                            if (checked) {
                                secret.isSelected = true;
                            }
                            else {
                                secret.isSelected = false;
                            }
                        this.render();
                    }}/>
                ),
                contentType: ContentType.JsxElement
            } as IFlatViewCell;

            row = KeyVaultSecretsTable.getSecretRow(row, secret);

            secretRows.push(row);
        });

        return secretRows;
    }

    private _keyVaultVariableGroupDetails: IKeyVaultVariableGroupDetails;
    private _errorMessage: string;
    private _secretsInKeyVault: SelectableVariable[];
    private _loadMoreLink: string;
    private _taskHttpClient: TaskAgentHttpClient;
}
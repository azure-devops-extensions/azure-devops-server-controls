/// <reference types="jquery" />

import Q = require("q");

import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");

import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import TFS_Admin_ServiceEndpoints = require("Admin/Scripts/TFS.Admin.ServiceEndpoints");
import TFS_Admin_Dialogs = require("Admin/Scripts/TFS.Admin.Dialogs");
import ServiceEndpointContracts = require("TFS/DistributedTask/Contracts");

import AzureRMEndpointsManageDialog = require("DistributedTasksCommon/ServiceEndpoints/AzureRMEndpointsManageDialog");

var spnCreateMethod = {
    Manual: "Manual",
    Automatic: "Automatic"
}

export class DeleteAzureRmServiceEndpointConfirmationDialog extends TFS_Admin_Dialogs.DeleteServiceEndpointConfirmationDialog {
    private connectedServicesService: TFS_Admin_ServiceEndpoints.ServiceEndPointService;
    private azureEndpointDialogModel: AzureRMEndpointsManageDialog.AddAzureRmEndpointsModel;
    private deepDeleteAzureRmEndpoint: boolean;

    constructor(options?) {
        super(options);

        this.deepDeleteAzureRmEndpoint = true;
    }

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            width: 500,
            dialogClass: "delete-azurerm-endpoint-confirmation-dialog"
        }, options));

        var tfsConnection = new Service.VssConnection(this._options.tfsContext.contextData);
        this.connectedServicesService = tfsConnection.getService<TFS_Admin_ServiceEndpoints.ServiceEndPointService>(TFS_Admin_ServiceEndpoints.ServiceEndPointService);
        this.azureEndpointDialogModel = new AzureRMEndpointsManageDialog.AddAzureRmEndpointsModel(null);
    }

    public getDialogResult() {
        
        if (this._options.connectedService.data["creationMode"] === spnCreateMethod.Automatic) {
            this.autoDeleteServiceEndpoint().then((response: ServiceEndpointContracts.ServiceEndpoint) => {
                this._onSuccess(response);
            }, (error) => {
                this.onError(error);
                if (!this.deepDeleteAzureRmEndpoint) {
                    // the previous call to delete was a deep delete operation, but the deletion failed due to some error
                    // keep the Ok button enabled to let users decide whether they want to remove the endpoint from database
                    this.setShallowDeleteEndpointConfirmationMessage();
                    this.updateOkButton(true);
                }
                else {
                    this.clearShallowDeleteEndpointConfirmationMessage();
                }
            });
        } else {
            this.connectedServicesService.beginDisconnect(this._options.connectedService.id).then((response) => {
                this._onSuccess(response);
            }, (error) => {
                this.onError(error);
            });
        }

        return null;
    }

    private autoDeleteServiceEndpoint() : IPromise<ServiceEndpointContracts.ServiceEndpoint> {
        var defer = Q.defer<ServiceEndpointContracts.ServiceEndpoint>();

        if(this.azureEndpointDialogModel.isOAuthBasedSpnAcrossTenantsFeatureEnabled()) {
            this.azureEndpointDialogModel.tenantId(this._options.connectedService.authorization.parameters["tenantid"]);

            this.azureEndpointDialogModel.authorize(this._options.connectedService.id).then((accessTokenKey: string) => {
                this.autoDeleteServiceEndpointHelper().then((response) => {
                    defer.resolve(response);
                }, (error) => {
                    defer.reject(error);
                });
            }, (error) => {
                defer.reject(error);
            });

        } else {
            this.autoDeleteServiceEndpointHelper().then((provisionEndpointResponse) => {
                this._onSuccess(provisionEndpointResponse);
            }, (error) => {
                defer.reject(error);
            });
        }

        return defer.promise;
    }

    private autoDeleteServiceEndpointHelper() : IPromise<ServiceEndpointContracts.ServiceEndpoint> {
        var defer = Q.defer<ServiceEndpointContracts.ServiceEndpoint>();

        this.connectedServicesService.beginDisconnect(this._options.connectedService.id, this.deepDeleteAzureRmEndpoint).then((data) => {
            this.waitForSpnEndpointDelete(this._options.connectedService.id).then(() => {
                defer.resolve(data);
            }, (error) => {
                // deletion failed while trying to remove the AAD application from Azure. Prompt the user for confirmation. 
                // any subsequent attempt to delete the endpoint in the same session will not try to remove the AAD application in Azure.
                this.deepDeleteAzureRmEndpoint = false;
                defer.reject(error);
            });
        }, (error) => {
            // deletion failed due to invalid permissions or sql exceptions. We don't need to prompt the user again for deletion. Reset the deep delete operation
            this.deepDeleteAzureRmEndpoint = true;
            defer.reject(error);
        });

        return defer.promise;
    }

    public waitForSpnEndpointDelete(endpointId: string): IPromise<void> {
        var defer = Q.defer<void>();
        var tfsConnection = new Service.VssConnection(this._options.tfsContext.contextData);
        var connectedServicesService = tfsConnection.getService<TFS_Admin_ServiceEndpoints.ServiceEndPointService>(TFS_Admin_ServiceEndpoints.ServiceEndPointService);

        var deleteSpnProgress = `<div id="spn-delete-in-progress"> <span class="icon status-progress"/> <span><strong>${AdminResources.DisconnectSpnEndpointInprogress}</strong></span> </div>`;
        $("#confirmation-message", this._element).replaceWith(deleteSpnProgress);

        var operationStatus = { "state": "InProgress", "statusMessage": "" };
        var monitorSpnProgress = new Utils_Core.DelayedFunction(this, 1000, "monitorSpnProgress", () => {

            connectedServicesService.beginGetServiceEndPoint(endpointId).then((response: ServiceEndpointContracts.ServiceEndpoint) => {
                if (response) {

                    if (response.operationStatus !== null) {
                        operationStatus = response.operationStatus;
                    } else {
                        monitorSpnProgress.reset();
                    }

                    if (operationStatus.state === "Failed") {
                        defer.reject(operationStatus.statusMessage);
                        monitorSpnProgress.cancel();
                        $("#spn-delete-in-progress", this._element).hide();
                    }
                    else {
                        monitorSpnProgress.reset();
                    }
                } else {
                    defer.resolve(null);
                    monitorSpnProgress.cancel();
                    $("#spn-delete-in-progress", this._element).hide();
                }
            });
        });
        monitorSpnProgress.start();
        return defer.promise;
    }
    
    private onError(error: any) {
        this.$errorContainer.html(error).show();
    }

    private setShallowDeleteEndpointConfirmationMessage(): void {
        if ($("#shallow-delete-confirmation-message", this._element).length === 0) {
            let confirmationMessage = `<div id="shallow-delete-confirmation-message"> <strong>${AdminResources.AzureRmSPNShallowDeleteConfirmationMessage}</strong> </div>`;
            this._element.append(confirmationMessage);
        }
    }

    private clearShallowDeleteEndpointConfirmationMessage(): void {
        if ($("#shallow-delete-confirmation-message", this._element).length !== 0) {
            $("#shallow-delete-confirmation-message", this._element).remove();
        }
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Controls.AzureRMEndpointsDeleteDialog", exports);

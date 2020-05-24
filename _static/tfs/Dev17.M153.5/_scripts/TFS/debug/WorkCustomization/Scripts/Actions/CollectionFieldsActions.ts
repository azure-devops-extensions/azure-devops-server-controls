import VSS_Service = require("VSS/Service");
import { Action } from "VSS/Flux/Action";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import * as WorkItemTrackingRestClient from "TFS/WorkItemTracking/RestClient";
import * as WorkContracts from "TFS/WorkItemTracking/Contracts";
import SecurityRestClient = require("VSS/Security/RestClient");
import { SecurityConstants } from "WorkCustomization/Scripts/Constants";
import { PageDataService } from "WorkCustomization/Scripts/WebApi/PageDataService";
import { getCollectionService } from "VSS/Service";
import { IWorkCustomizationHubData } from "WorkCustomization/Scripts/Contracts/WorkCustomizationHubData";

export interface IEndGetCollectionFieldsPayload {
    hasDeleteFieldPermission?: boolean;
    fields: WorkContracts.WorkItemField[];
}

export const endGetCollectionFieldsAction = new Action<IEndGetCollectionFieldsPayload>();
export const endDeleteFieldAction = new Action<void>();
export const fieldsCacheReloaded = new Action<IWorkCustomizationHubData>();


export module CollectionFieldsActionCreator {
    export function beginGetCollectionFields(errorBarId?: string): void {
        let client: WorkItemTrackingRestClient.WorkItemTrackingHttpClient = VSS_Service.getClient<WorkItemTrackingRestClient.WorkItemTrackingHttpClient>(WorkItemTrackingRestClient.WorkItemTrackingHttpClient);

        client.getFields()
            .then((fields: WorkContracts.WorkItemField[]) => {
                let endGetCollectionFieldPayload: IEndGetCollectionFieldsPayload = {
                    fields: fields
                }

                // have fields, now determining if user has delete field permission
                let securityClient = VSS_Service.getClient<SecurityRestClient.SecurityHttpClient>(SecurityRestClient.SecurityHttpClient);
                securityClient.hasPermissions(SecurityConstants.teamProjectCollectionNamespaceId, SecurityConstants.deleteFieldPermission, SecurityConstants.teamProjectCollectionNamespaceToken)
                    .then((value: boolean[]) => {
                        if (value && value.length > 0) {
                            endGetCollectionFieldPayload.hasDeleteFieldPermission = value[0];
                        }
                        endGetCollectionFieldsAction.invoke(endGetCollectionFieldPayload);
                        clearErrorAction.invoke(null);

                    }, () => {
                        // returning the list of fields even if security call failed. We will check the permissions later anyways
                        endGetCollectionFieldsAction.invoke(endGetCollectionFieldPayload);
                        clearErrorAction.invoke(null);
                    })
            }, error => showErrorAction.invoke({ errorMessage: error.message, errorBarId: errorBarId }));
    }

    export function beginReloadCache(): IPromise<void> {
        let dataSvc = getCollectionService(PageDataService);
        return dataSvc.beginReloadPageData()
            .then(response => {
                fieldsCacheReloaded.invoke(response);
            });
    }

    export function beginDeleteField(referenceName: string, errorBarId?: string): void {
        let client: WorkItemTrackingRestClient.WorkItemTrackingHttpClient = VSS_Service.getClient<WorkItemTrackingRestClient.WorkItemTrackingHttpClient>(WorkItemTrackingRestClient.WorkItemTrackingHttpClient);
        client.deleteField(referenceName)
            .then(() => {
                endDeleteFieldAction.invoke(null);
                clearErrorAction.invoke(null);
                CollectionFieldsActionCreator.beginGetCollectionFields();
            }, error => showErrorAction.invoke({ errorMessage: error.message, errorBarId: errorBarId }));
    }
}
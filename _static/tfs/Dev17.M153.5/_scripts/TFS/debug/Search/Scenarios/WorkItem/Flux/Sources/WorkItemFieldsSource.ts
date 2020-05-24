import * as VSS from "VSS/VSS";
import * as _OMCommon from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as _WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as _WITRestClient from "TFS/WorkItemTracking/RestClient";
import * as _WITContracts from "TFS/WorkItemTracking/Contracts";
import * as Constants from "Search/Scenarios/WorkItem/Constants";
import { IWITFieldWrapper } from "Search/Scenarios/WorkItem/Flux/ActionsHub"
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export class WorkItemFieldsSource {
    public getFields(project: string): IPromise<IWITFieldWrapper[]> {        
        return new Promise((resolve, reject) => {
            VSS.using([
                "WorkItemTracking/Scripts/TFS.WorkItemTracking",
                "Presentation/Scripts/TFS/TFS.OM.Common",
                "TFS/WorkItemTracking/RestClient"
            ], (WITOM: typeof _WITOM,
                OMCommon: typeof _OMCommon,
                WITRestClient: typeof _WITRestClient) => {
                    const witHttpClient = OMCommon.ProjectCollection
                        .getConnection(TfsContext.getDefault())
                        .getHttpClient<_WITRestClient.WorkItemTrackingHttpClient>(WITRestClient.WorkItemTrackingHttpClient);

                    witHttpClient
                        .getFields(project)
                        .then((fields: _WITContracts.WorkItemField[]) => {
                            resolve(fields.map < IWITFieldWrapper>((field) => {
                                return {
                                    field: field,
                                    shortcut: Constants.Fields.shortcutTexts[field.name.toLowerCase()]
                                }
                            }))
                        }, reject)
                }, reject);
        });
    }
}

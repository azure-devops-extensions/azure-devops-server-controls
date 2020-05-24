
import Q = require("q");
import { Action } from "VSS/Flux/Action";
import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import { IProcess, ICreateProcessRequestPayload } from "WorkCustomization/Scripts/Contracts/Process";
import { WebAccessHttpClient, ICreateProcessResult, IWebAccessHttpClient } from "WorkCustomization/Scripts/WebApi/WebAccessHttpClient";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import { clearCreateInheritedProcessAction } from "WorkCustomization/Scripts/Common/Actions/CreateInheritedProcessMessageBarAction";

export interface IEndCreateProcessPayload {
    processTemplateTypeId: string;
    createdProcess: IProcess;
    parentTypeId: string;
}

export const endCreateProcessAction = new Action<IEndCreateProcessPayload>();

export class CreateProcessActionCreator extends TfsService {

    public beginCreateProcess(payload: ICreateProcessRequestPayload, errorBarId: string): Q.Promise<void> {

        let httpClient: IWebAccessHttpClient = this._getClient();

        return Q(httpClient.beginCreateProcess(payload)
            .then<void>((result: ICreateProcessResult) => {
                endCreateProcessAction.invoke({  processTemplateTypeId: result.createdProcess.templateTypeId, createdProcess: result.createdProcess, parentTypeId: payload.parentTypeId });
                clearErrorAction.invoke(null);
                if (payload.navigate) {
                    clearCreateInheritedProcessAction.invoke(null);
                    UrlUtils.navigateToProcessOverview(payload.name);
                }
            }, (error) => {
                showErrorAction.invoke({ errorMessage: error.message, errorBarId: errorBarId });
            }));
    }

    private _getClient(): IWebAccessHttpClient {
        return this.tfsConnection.getService(WebAccessHttpClient);
    }
}
import { IUrlParameters } from "MyExperiences/Scenarios/CreateProject/Contracts";
import { UrlParameters } from "MyExperiences/Scenarios/CreateProject/Constants";
import * as VSS_Url from "VSS/Utils/Url";

export class UrlParametersSource {
   
    /**
     * Gets the urls parameters from the url to pass to the project creation page
     * @param inputUrl - The url that will be passed to getUrlParameters. Else window.location.href is used. It is primarily used for testing.
     */
    public getUrlParameters(inputUrl?: string): IUrlParameters {
        let urlParameters: IUrlParameters = {};
        let url: string = inputUrl || window.location.href;
        let queryParams: VSS_Url.IQueryParameter[] = VSS_Url.Uri.parse(url).queryParameters;

        queryParams.forEach((queryParam: VSS_Url.IQueryParameter) => {
            switch (queryParam.name.toUpperCase()) {
                case UrlParameters.Source:
                    urlParameters.source = queryParam.value;
                    break;
                case UrlParameters.VersionControl:
                    urlParameters.versionControl = queryParam.value;
                    break;
                case UrlParameters.ProcessTemplate:
                    urlParameters.processTemplate = queryParam.value;
                    break;
                default:
                    break;
            }
        })

        return urlParameters;
    }
}
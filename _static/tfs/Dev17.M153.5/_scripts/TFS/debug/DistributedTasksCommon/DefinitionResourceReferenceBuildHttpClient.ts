
import Build_Client = require("TFS/Build/RestClient");
import Build = require("TFS/Build/Contracts");

import VSS_WebApi = require("VSS/WebApi/RestClient");

/**
 * Creating a private extension of the legacy build http client. The legacy build http client is no longer generated
 * but this page depends on some newer APIs. Instead of creating potential S2S version issues by hand editing the legacy
 * client, the functionality will be added below.
 */
export class DefinitionResourceReferenceBuildHttpClient extends Build_Client.BuildHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * @param resources - 
     * @param project - Project ID or project name
     */
    public async authorizeProjectResources(
        resources: Build.DefinitionResourceReference[],
        project: string
        ): Promise<Build.DefinitionResourceReference[]> {

        return this._beginRequest<Build.DefinitionResourceReference[]>({
            httpMethod: "PATCH",
            area: "build",
            locationId: "398c85bc-81aa-4822-947c-a194a05f0fef",
            apiVersion: "5.0-preview.1",
            routeTemplate: "{project}/_apis/build/authorizedresources",
            responseIsCollection: true,
            routeValues: {
                project: project
            },
            data: resources
        });
    }

    /**
     * @param project - Project ID or project name
     * @param type - 
     * @param id - 
     */
    public async getProjectResources(
        project: string,
        type?: string,
        id?: string
        ): Promise<Build.DefinitionResourceReference[]> {

        const queryValues: any = {
            type: type,
            id: id
        };

        return this._beginRequest<Build.DefinitionResourceReference[]>({
            httpMethod: "GET",
            area: "build",
            locationId: "398c85bc-81aa-4822-947c-a194a05f0fef",
            apiVersion: "5.0-preview.1",
            routeTemplate: "{project}/_apis/build/authorizedresources",
            responseIsCollection: true,
            routeValues: {
                project: project
            },
            queryParams: queryValues
        });
    }
}
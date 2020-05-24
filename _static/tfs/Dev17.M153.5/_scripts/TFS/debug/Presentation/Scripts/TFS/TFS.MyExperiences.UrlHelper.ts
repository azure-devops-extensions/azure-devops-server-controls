import * as Q from "q";
import * as VSS_Service from "VSS/Service";
import * as Utils_File from "VSS/Utils/File";
import * as Url from "VSS/Utils/Url";
import * as VSS_Context from "VSS/Context";
import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import * as Contribution_Services from "VSS/Contributions/Services";

const extensionService = VSS_Service.getService(Contribution_Services.ExtensionService);

export interface IUrlParameters {
    source?: string;
    processTemplate?: string;
    versionControl?: string;
}

// Exporting for testing
export class ContributionConstants {
    public static ProjectsHubRoute = "ms.vss-tfs-web.collection-project-hub-route";
    public static SuitesMePageRoute = "ms.vss-tfs-web.suite-me-page-route";
}

export class MyExperiencesUrls {

    public static ActionParameter = "_a";
    public static SourceParameter = "source";
    public static VersionControlParameter = "versionControl";
    public static ProcessTemplateParameter = "processTemplate";

    /**
     * Gets the url for the My projects hub under a collection home
     * @param collectionName - Collection name for which the project is to be created
     */
    public static getMyProjectsUrl(collectionName: string): IPromise<string> {
        const deferred = Q.defer<string>();

        extensionService.getContribution(ContributionConstants.ProjectsHubRoute).then((contribution: Contributions_Contracts.Contribution) => {
            MyExperiencesUrls.getContributionRoute(ContributionConstants.ProjectsHubRoute).then((route: string) => {
                deferred.resolve(MyExperiencesUrls.getWebPageURL(
                    collectionName,
                    route));
            });
        }, (error: Error) => {
            deferred.reject(null);
        });

        return deferred.promise;
    }

    /**
     * Gets the url for the create new project view in My projects hub under a collection home
     * @param collectionName - Collection name for which the project is to be created
     * @param params - The Url parameters that can be passed in the create new project url
     */
    public static getCreateNewProjectUrl(collectionName: string, params?: IUrlParameters): IPromise<string> {
        const deferred = Q.defer<string>();

        MyExperiencesUrls.constructCreateProjectUrl(ContributionConstants.ProjectsHubRoute, collectionName, params, "new").then((url: string) => {
            deferred.resolve(url);
        }, (error: Error) => {
            MyExperiencesUrls.constructCreateProjectUrl(ContributionConstants.SuitesMePageRoute, collectionName, params, "newProject").then((url: string) => {
                deferred.resolve(url);
            }, (error: Error) => {
                deferred.reject(null);
            });
        });

        return deferred.promise;
    }

    private static getWebPageURL(collectionName: string, relativePath?: string): string {
        const baseurl = MyExperiencesUrls.getBaseUrl(collectionName);
        let webPageUrl = baseurl;

        if (relativePath) {
            webPageUrl = Utils_File.combinePaths(baseurl, relativePath);
        }

        return webPageUrl;
    }

    private static getBaseUrl(collectionName: string): string {
        const pageContext = VSS_Context.getPageContext();
        const webContext = pageContext.webContext;
        const isHostedEnvironment = pageContext.webAccessConfiguration.isHosted;

        if (isHostedEnvironment) {
            // No Collection in Hosted
            return webContext.account.relativeUri;
        } else {
            // Collection is involved in the OnPrem paths
            return Utils_File.combinePaths(webContext.account.relativeUri, collectionName);
        }
    }

    private static getContributionRoute(contributionId: string): IPromise<string> {
        return extensionService.getContribution(contributionId).then((contribution: Contributions_Contracts.Contribution) => {
            return contribution.properties.routeTemplates[0];
        });
    }

    private static constructCreateProjectUrl(contributionId: string,
        collectionName: string,
        params?: IUrlParameters,
        createProjectActionParamValue?: string): IPromise<string> {
        return MyExperiencesUrls.getContributionRoute(contributionId).then((route: string) => {
            const uri = Url.Uri.parse(route);
            let relativePath = uri.path;
            let queryParams: Url.IQueryParameter[] = uri.queryParameters || [];

            if (createProjectActionParamValue) {
                queryParams.push({
                    name: MyExperiencesUrls.ActionParameter,
                    value: createProjectActionParamValue
                });
            }

            if (params) {
                if (params.source) {
                    queryParams.push({
                        name: MyExperiencesUrls.SourceParameter,
                        value: params.source
                    });
                }

                if (params.versionControl) {
                    queryParams.push({
                        name: MyExperiencesUrls.VersionControlParameter,
                        value: params.versionControl
                    });
                }

                if (params.processTemplate) {
                    queryParams.push({
                        name: MyExperiencesUrls.ProcessTemplateParameter,
                        value: params.processTemplate
                    });
                }
            }

            if (queryParams && queryParams.length > 0) {
                relativePath = relativePath + "?" + MyExperiencesUrls.queryString(queryParams);
            }

            return MyExperiencesUrls.getWebPageURL(collectionName, relativePath);
        });
    }

    private static queryString(queryParameters: Url.IQueryParameter[]): string {
        if (queryParameters && queryParameters.length > 0) {
            return queryParameters.map((param) => {
                if (param.value) {
                    return encodeURIComponent(param.name) + "=" + encodeURIComponent(param.value);
                }
                else {
                    return encodeURIComponent(param.name);
                }
            }).join("&");
        }
        else {
            return "";
        }
    }
}

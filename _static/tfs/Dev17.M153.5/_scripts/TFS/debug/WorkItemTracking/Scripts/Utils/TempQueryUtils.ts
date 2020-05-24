import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as TFS_Core_WebApi from "Presentation/Scripts/TFS/TFS.Core.WebApi";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { ITemporaryQueryData } from "WorkItemTracking/Scripts/Queries/Models/Models";

export namespace TempQueryUtils {
    /**
     * Creates a temp query with the given WIQL and returns a promise with temp query id.
     * @param tfsContext TFS context object
     * @param queryText WIQL query
     * @returns A promise containing the query ID
     */
    export function beginCreateTemporaryQueryId(tfsContext: TfsContext, queryText: string, queryType?: string): IPromise<string> {
        const httpClient = ProjectCollection.getConnection(tfsContext).getHttpClient<TFS_Core_WebApi.TemporaryDataHttpClient>(TFS_Core_WebApi.TemporaryDataHttpClient);
        const temporaryQueryData = { queryText: queryText, queryType: queryType } as ITemporaryQueryData;

        return httpClient.beginCreateTemporaryData({ value: temporaryQueryData } as TFS_Core_WebApi.ITemporaryDataRequest).then(
            (response: TFS_Core_WebApi.ITemporaryDataResponse) => response.id);
    }

    /**
     * Creates an href with the URL for the specified temp query ID
     * @param tfsContext TFS context object
     * @param tempQueryId ID of the temp query
     * @returns href with the URL for the specified temp query ID
     */
    export function createTempQueryLink(tfsContext: TfsContext, tempQueryId: string): string {
        return `<br><a href='${createTempQueryUrl(tfsContext, tempQueryId)}' target='_blank' style='color:#FF0000'>${Resources.CopySelectedWorkitemsOpenAsQuery}</a>`;
    }

    /**
     * Creates a URL for the specified temp query ID
     * @param tfsContext TFS context object
     * @param tempQueryId ID of the temp query
     * @returns URL for the specified temp query ID
     */
    export function createTempQueryUrl(tfsContext: TfsContext, tempQueryId: string): string {
        return tfsContext.getPublicActionUrl("", "queries", { tempQueryId: tempQueryId } as IRouteData);
    }
}


import { CoreHttpClient2_3 } from "TFS/Core/RestClient";
import { getClient } from "VSS/Service";
import { TeamContext } from "TFS/Core/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { VssConnection } from "VSS/Service";
import { WorkHttpClient3 } from "TFS/Work/RestClient";

export abstract class BaseDataProvider {
    private _workHttpClient: WorkHttpClient3;
    private _coreHttpClient: CoreHttpClient2_3;

    /**
     * Return the team context from the default Tfs context for the current project and team
     * @return {TeamContext} : Team context of the logged user
     */
    public _getTeamContext(): TeamContext {
        const context = TfsContext.getDefault();
        const teamContext = {
            project: context.contextData.project.name,
            projectId: context.contextData.project.id
        } as TeamContext;

        return teamContext;
    }

    /**
     * Get the project id for the current request context.
     * @returns {string} ProjectId
     */
    public _getProjectId(): string {
        const context = TfsContext.getDefault();
        return context.contextData.project.id;
    }

    /**
     * Get the http REST client for Agile Work
     * @return {WorkHttpClient3} The agile http client
     */
    public _getWorkHttpClient(): WorkHttpClient3 {
        if (!this._workHttpClient) {
            let tfsConnection: VssConnection = new VssConnection(TfsContext.getDefault().contextData);
            this._workHttpClient = tfsConnection.getHttpClient<WorkHttpClient3>(WorkHttpClient3);
        }
        return this._workHttpClient;
    }

    /**
     * Get the http REST client for Core
     * @return {CoreHttpClient2_3} The core http client
     */
    public _getCoreHttpClient(): CoreHttpClient2_3 {
        if (!this._coreHttpClient) {
            this._coreHttpClient = getClient<CoreHttpClient2_3>(CoreHttpClient2_3);
        }
        return this._coreHttpClient;
    }
}

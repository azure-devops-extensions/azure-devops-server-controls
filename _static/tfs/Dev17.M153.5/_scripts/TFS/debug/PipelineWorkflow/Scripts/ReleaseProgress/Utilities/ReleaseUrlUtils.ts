import { NavigationConstants } from "PipelineWorkflow/Scripts/Common/Constants";
import { DefinitionsHubKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { ReleaseProgressNavigateStateActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";

import * as RestClient from "ReleaseManagement/Core/RestClient";
import { TfsContext } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Host.TfsContext";
import * as ReleaseTypes from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

import { ContextHostType, WebContext } from "VSS/Common/Contracts/Platform";
import { getDefaultWebContext, getPageContext } from "VSS/Context";
import { getCachedServiceLocation } from "VSS/Locations";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Utils_String from "VSS/Utils/String";
import { Uri } from "VSS/Utils/Url";
import { getLocalService } from "VSS/Service";
import { PresentationUtils } from "DistributedTasksCommon/TFS.Tasks.Utils";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

export class ReleaseUrlUtils {

    public static getReleaseUrl(releaseId: number): string {
        return this.getReleaseProgressUrl(releaseId);
    }

    public static getReleaseLandingPageUrl(definitionId: number): string {
        if (FeatureFlagUtils.isNewReleasesHubEnabled()) {
            const viewActiveTabUrl: string = DtcUtils.getUrlForExtension(
                PipelineTypes.PipelineExtensionAreas.ReleaseExplorer2,
                PipelineTypes.PipelineDefinitionDesignerActions.viewReleasesAction,
                {
                    definitionId: definitionId,
                    view: DefinitionsHubKeys.MinePivotItemKey
                },
                true
            );

            return viewActiveTabUrl;
        }
        else {
            const viewReleasesUrl: string = DtcUtils.getUrlForExtension(
                PipelineTypes.PipelineExtensionAreas.ReleaseExplorer,
                PipelineTypes.PipelineDefinitionDesignerActions.viewReleasesAction,
                {
                    definitionId: definitionId
                },
            );

            return viewReleasesUrl;
        }
    }

    public static getReleaseProgressUrl(releaseId: number): string {
        let urlCreator: Uri = new Uri(ReleaseUrlUtils._getReleaseProgressViewRelativeUrl());

        urlCreator.addQueryParam(ReleaseUrlUtils.ACTION_QUERY_PARAMETER_KEY, ReleaseUrlUtils.RELEASE_PROGRESS_QUERY_PARAMETER_VALUE);

        if (releaseId) {
            urlCreator.addQueryParam(ReleaseUrlUtils.RELEASE_ID_QUERY_PARAMETER_KEY, releaseId.toString());
        }

        return urlCreator.absoluteUri;
    }

    public static getOldReleaseViewUrl(releaseId: number, action?: string): string {
        let urlCreator: Uri = new Uri(ReleaseUrlUtils._getOldReleaseViewRelativeUrl());

        if (releaseId) {
            urlCreator.addQueryParam(ReleaseUrlUtils.RELEASE_ID_QUERY_PARAMETER_KEY, releaseId.toString());
            urlCreator.addQueryParam(ReleaseUrlUtils.FORCE_OPEN_OLD_VIEW_PARAMETER_KEY, ReleaseUrlUtils.FORCE_OPEN_OLD_VIEW_PARAMETER_VALUE_TRUE);
        }

        if (!!action) {
            urlCreator.addQueryParam(ReleaseUrlUtils.ACTION_QUERY_PARAMETER_KEY, action);
        }
        else {
            urlCreator.addQueryParam(ReleaseUrlUtils.ACTION_QUERY_PARAMETER_KEY, ReleaseUrlUtils.RELEASE_SUMMARY_QUERY_PARAMETER_VALUE);
        }

        return urlCreator.absoluteUri;
    }

    public static navigateToDraftReleaseViewInNewHub(releaseId: number): void {
        const hubsService = getLocalService(HubsService);
        let urlCreator: Uri = new Uri(Utils_String.format("{0}/{1}", PresentationUtils.getTeamUrl(), this.RELEASE_DRAFT_ROUTE));

        if (releaseId) {
            urlCreator.addQueryParam(ReleaseUrlUtils.RELEASE_ID_QUERY_PARAMETER_KEY, releaseId.toString());
            urlCreator.addQueryParam(ReleaseUrlUtils.ACTION_QUERY_PARAMETER_KEY, ReleaseUrlUtils.RELEASE_ENVIRONMENTS_QUERY_PARAMETER_VALUE);
        }

        hubsService.navigateToHub(NavigationConstants.ReleaseManagementExplorer2HubId, urlCreator.absoluteUri);
    }

    public static getDeploymentQueueUrl(releaseId: number, releaseDefinitionId: number, environmentDefinitionId: number): string {
        let deploymentQueueUrl: string =
            (FeatureFlagUtils.isNewReleasesHubEnabled())
                ? this.getOldReleaseViewDeploymentQueueUrlForNewHub(releaseDefinitionId, environmentDefinitionId)
                : this.getOldReleaseViewDeploymentQueueUrl(releaseId, releaseDefinitionId, environmentDefinitionId);

        return deploymentQueueUrl;
    }

    public static getOldReleaseViewDeploymentQueueUrl(releaseId: number, releaseDefinitionId: number, environmentDefinitionId: number): string {
        let urlCreator: Uri = new Uri(ReleaseUrlUtils._getOldReleaseViewRelativeUrl());

        if (releaseId) {
            urlCreator.addQueryParam(ReleaseUrlUtils.RELEASE_ID_QUERY_PARAMETER_KEY, releaseId.toString());
            urlCreator.addQueryParam(ReleaseUrlUtils.FORCE_OPEN_OLD_VIEW_PARAMETER_KEY, ReleaseUrlUtils.FORCE_OPEN_OLD_VIEW_PARAMETER_VALUE_TRUE);

            if (releaseDefinitionId && environmentDefinitionId) {
                //add action parameter
                urlCreator.addQueryParam(ReleaseUrlUtils.ACTION_QUERY_PARAMETER_KEY, ReleaseUrlUtils.ENVIRONMENT_SUMMARY_QUERY_PARAMETER_VALUE);

                urlCreator.addQueryParam(ReleaseUrlUtils.RELEASE_DEFINITION_ID_QUERY_PARAMETER_KEY, releaseDefinitionId.toString());
                urlCreator.addQueryParam(ReleaseUrlUtils.RELEASE_DEFINITION_ENVIRONMENT_ID_QUERY_PARAMETER_KEY, environmentDefinitionId.toString());
            }
        }
        return urlCreator.absoluteUri;
    }

    public static getOldReleaseViewDeploymentQueueUrlForNewHub(releaseDefinitionId: number, environmentDefinitionId: number): string {
        let urlCreator: Uri = new Uri(Utils_String.format("{0}/{1}", PresentationUtils.getTeamUrl(), this.ENVIRONMENT_SUMMARY_ROUTE));

        if (releaseDefinitionId && environmentDefinitionId) {
            //add action parameter
            urlCreator.addQueryParam(ReleaseUrlUtils.ACTION_QUERY_PARAMETER_KEY, ReleaseUrlUtils.ENVIRONMENT_SUMMARY_QUERY_PARAMETER_VALUE);

            urlCreator.addQueryParam(ReleaseUrlUtils.RELEASE_DEFINITION_ID_QUERY_PARAMETER_KEY, releaseDefinitionId.toString());
            urlCreator.addQueryParam(ReleaseUrlUtils.RELEASE_DEFINITION_ENVIRONMENT_ID_QUERY_PARAMETER_KEY, environmentDefinitionId.toString());
        }

        return urlCreator.absoluteUri;
    }


    public static getReleaseEnvironmentLogsUrl(releaseId: number, environmentId: number): string {
        let urlCreator: Uri = new Uri(ReleaseUrlUtils._getReleaseProgressViewRelativeUrl());
        urlCreator.addQueryParam(ReleaseUrlUtils.ACTION_QUERY_PARAMETER_KEY, ReleaseProgressNavigateStateActions.ReleaseEnvironmentLogs);

        if (releaseId) {
            urlCreator.addQueryParam(ReleaseUrlUtils.RELEASE_ID_QUERY_PARAMETER_KEY, releaseId.toString());
        }
        if (environmentId) {
            urlCreator.addQueryParam(ReleaseUrlUtils.ENVIRONMENT_ID_QUERY_PARAMETER_KEY, environmentId.toString());
        }

        return urlCreator.absoluteUri;
    }

    public static getReleaseDefinitionUrl(definitionId: number): string {
        let urlCreator: Uri = new Uri(ReleaseUrlUtils._getEditorRelativeUrl());

        urlCreator.addQueryParam("definitionId", definitionId.toString());
        urlCreator.addQueryParam(ReleaseUrlUtils.ACTION_QUERY_PARAMETER_KEY, ReleaseUrlUtils.ACTION_EDIT_DEFINITION);

        return urlCreator.absoluteUri;
    }

    private static _getEditorRelativeUrl(): string {
        return this._getHubUrl(NavigationConstants.ReleaseManagementEditorHubId);
    }

    public static getTestResultExtensionUrl(releaseId: number, environmentId: number): string {
        let urlCreator: Uri = new Uri(ReleaseUrlUtils._getReleaseProgressViewRelativeUrl());
        urlCreator.addQueryParam(ReleaseUrlUtils.ACTION_QUERY_PARAMETER_KEY, ReleaseProgressNavigateStateActions.ReleaseEnvironmentExtension);
        urlCreator.addQueryParam(ReleaseUrlUtils.RELEASE_ID_QUERY_PARAMETER_KEY, releaseId.toString());
        urlCreator.addQueryParam(ReleaseUrlUtils.ENVIRONMENT_ID_QUERY_PARAMETER_KEY, environmentId.toString());
        urlCreator.addQueryParam(ReleaseUrlUtils.EXTENSION_ID_PARAMETER, ReleaseUrlUtils.TEST_RESULT_EXTENSION_PARAMETER_VALUE);
        return urlCreator.absoluteUri;
    }

    public static getCompatOldReleaseViewUrl(releaseId: number): string {
        let urlCreator: Uri = new Uri(Utils_String.format("{0}/{1}", PresentationUtils.getTeamUrl(), this.RELEASE_COMPAT_OLD_VIEW_ROUTE));

        if (releaseId) {
            // add action parameter
            urlCreator.addQueryParam(ReleaseUrlUtils.ACTION_QUERY_PARAMETER_KEY, ReleaseUrlUtils.RELEASE_SUMMARY_QUERY_PARAMETER_VALUE);

            // add releaseId
            urlCreator.addQueryParam(ReleaseUrlUtils.RELEASE_ID_QUERY_PARAMETER_KEY, releaseId.toString());
        }

        return urlCreator.absoluteUri;
    }

    private static _getReleaseLandingPageRelativeUrl(): string {
        if (FeatureFlagUtils.isNewReleasesHubEnabled()) {
            return this._getNewReleaseViewRelativeUrl();
        }
        else {
            return this._getOldReleaseViewRelativeUrl();
        }
    }

    private static _getNewReleaseViewRelativeUrl(): string {
        return this._getHubUrl(NavigationConstants.ReleaseManagementExplorer2HubId);
    }

    private static _getOldReleaseViewRelativeUrl(): string {
        return this._getHubUrl(NavigationConstants.ReleaseManagementExplorerHubId);
    }

    private static _getReleaseProgressViewRelativeUrl(): string {
        return this._getHubUrl(NavigationConstants.ReleaseProgressHubId);
    }

    private static _getHubUrl(hubId: string): string {
        const hubsService: HubsService = new HubsService();
        const hub: Hub = hubsService.getHubById(hubId);
        const relativeUrl: string = hub ? hub.uri : Utils_String.empty;
        return relativeUrl;
    }

    public static getRMApisEndPoint(): string {
        // output is like: protocol://<account>.visualstudio.com:<rmport>/<collection>/<projectname>/<_apis>/Release/
        // {0} is protocol://<account>.visualstudio.com:<rmport>
        // {1} is /<collection>/<projectname>/<_apis>
        // {2} is ReleaseManagement
        const webContext: WebContext = getDefaultWebContext();
        const releaseManagementUri = ReleaseUrlUtils.getReleaseEndPoint();
        return Utils_String.format("{0}{1}/{2}/",
            releaseManagementUri,
            TfsContext.getDefault().getActionUrl("", ReleaseTypes.ReleasePipelineAreas.APIS, { project: webContext.project ? webContext.project.id : "", team: "" }),
            ReleaseTypes.WebApiConstants.Area);
    }

    public static getReleaseEndPoint(): string {
        // output is like: protocol://<account>.vsrm.visualstudio.com:<rmport>
        const webContext: WebContext = getDefaultWebContext();
        return getPageContext().webAccessConfiguration.isHosted ?
            getCachedServiceLocation(RestClient.ReleaseHttpClient.serviceInstanceId, ContextHostType.ProjectCollection, webContext)
            : Utils_String.empty;
    }

    private static readonly RELEASE_DEFINITION_ID_QUERY_PARAMETER_KEY: string = "definitionId";
    private static readonly RELEASE_ID_QUERY_PARAMETER_KEY: string = "releaseId";
    private static readonly ENVIRONMENT_ID_QUERY_PARAMETER_KEY: string = "environmentId";
    private static readonly ACTION_QUERY_PARAMETER_KEY: string = "_a";
    private static readonly RELEASE_ENVIRONMENTS_QUERY_PARAMETER_VALUE: string = "release-environments-editor";
    private static readonly RELEASE_SUMMARY_QUERY_PARAMETER_VALUE: string = "release-summary";
    private static readonly ENVIRONMENT_SUMMARY_QUERY_PARAMETER_VALUE: string = "environment-summary";
    private static readonly RELEASE_DEFINITION_ENVIRONMENT_ID_QUERY_PARAMETER_KEY: string = "definitionEnvironmentId";
    private static readonly RELEASE_QUERY_PARAMETER_VALUE: string = "releases";
    private static readonly RELEASE_PROGRESS_QUERY_PARAMETER_VALUE: string = "release-pipeline-progress";
    private static readonly FORCE_OPEN_OLD_VIEW_PARAMETER_KEY: string = "forceOpenOldView";
    private static readonly FORCE_OPEN_OLD_VIEW_PARAMETER_VALUE_TRUE: string = "true";
    private static readonly ACTION_EDIT_DEFINITION: string = "environments-editor-preview";
    private static readonly EXTENSION_ID_PARAMETER: string = "extensionId";
    private static readonly TEST_RESULT_EXTENSION_PARAMETER_VALUE: string = "ms.vss-test-web.test-result-in-release-environment-editor-tab";
    private static readonly RELEASE_DRAFT_ROUTE = "_releaseDraft";
    private static readonly ENVIRONMENT_SUMMARY_ROUTE = "_releaseDefinition/environment";
    private static readonly RELEASES_VIEW_QUERY_PARAMETER_KEY: string = "view";
    private static readonly RELEASE_COMPAT_OLD_VIEW_ROUTE = "_releaseOldView";
}
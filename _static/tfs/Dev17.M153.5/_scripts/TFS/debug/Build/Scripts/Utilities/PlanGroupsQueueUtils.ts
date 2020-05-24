import React = require("react");
import ReactDOM = require("react-dom");

import Q = require("q");

import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");

import { PlanGroupsQueueDialog, IPlanGroupsQueueDialogProps } from "DistributedTaskControls/PlanGroupsQueue/PlanGroupsQueueDialog";
import { IHub, IPlanGroupsListProps } from "DistributedTaskControls/PlanGroupsQueue/Types";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { TaskOrchestrationQueuedPlanGroup, PlanGroupStatus } from "TFS/DistributedTask/Contracts";
import { TaskHttpClient } from "TFS/DistributedTask/TaskRestClient";

import Authentication_Contracts = require("VSS/Authentication/Contracts");
import { AuthenticationHttpClient } from "VSS/Authentication/RestClient";
import { BearerAuthTokenManager } from "VSS/Authentication/Services";
import { ContextHostType } from "VSS/Common/Contracts/Platform";
import VssContext = require("VSS/Context");
import VSSLocations = require("VSS/Locations");
import { ServiceDefinition, ServiceStatus } from "VSS/Locations/Contracts";
import { LocationsHttpClient3 } from "VSS/Locations/RestClient";
import { VssConnection } from "VSS/Service";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

var delegate: typeof Utils_Core.delegate = Utils_Core.delegate;

class Constants {
    public static readonly ReleasesHubName = "Release";
    public static readonly BuildsHubName = "Build";
    public static readonly ReleaseManagementServiceId = "0000000D-0000-8888-8000-000000000000";
}

export function showPlanGroupsQueueDialogHelper(sourceEvent?: JQueryEventObject, sourceElement?: JQuery, targetElementCss?: string): void {
    sourceElement = (!!sourceEvent && sourceEvent.target) ? $(sourceEvent.target) : sourceElement;
    targetElementCss = targetElementCss || ".pipeline-plan-groups-queue-dialog-placeholder";

    if (sourceElement != null && !!targetElementCss) {
        let targetElement = sourceElement.prev(targetElementCss);
        if (targetElement && targetElement.length > 0) {
            showPlanGroupsQueueDialog(targetElement[0]);
        }
    }
}

export function showPlanGroupsQueueDialog(targetElement: any): void {
    if (!!targetElement) {
        let isHosted: boolean = TfsContext.getDefault().isHosted;

        // This is name of the hub, not display name, so it is hard coded
        let selectedHubName: string = Constants.ReleasesHubName;
        let selectedStatus: PlanGroupStatus = PlanGroupStatus.Running;

        let releaseHub: IHub;
        let buildHub: IHub;
        let hubs: IHub[] = [];

        if (isHosted) {
            selectedHubName = Constants.BuildsHubName;

            let buildsHubStatusHeaderText: {
                [key: string]: string;
            } = {
                    [PlanGroupStatus.Queued.toString()]: BuildResources.BuildsPipelinePlanGroupsQueueQueuedStatusHeaderText,
                    [PlanGroupStatus.Running.toString()]: BuildResources.BuildsPipelinePlanGroupsQueueRunningStatusHeaderText
                };

            // Here name is like an id for the hub, this is not visible to user
            buildHub = {
                name: Constants.BuildsHubName,
                displayText: BuildResources.BuildsPipelinesDisplayHubName,
                statusHeaderText: buildsHubStatusHeaderText
            } as IHub;
        }

        hasRMServiceProvisioned().then((serviceProvisioned: boolean) => {
            if (serviceProvisioned) {
                let releasesHubStatusHeaderText: {
                    [key: string]: string;
                } = {
                        [PlanGroupStatus.Queued.toString()]: BuildResources.ReleasesPipelinePlanGroupsQueueQueuedStatusHeaderText,
                        [PlanGroupStatus.Running.toString()]: BuildResources.ReleasesPipelinePlanGroupsQueueRunningStatusHeaderText
                    };

                // For OnPrem use default getQueuedPlanGroups
                let getQueuedPlanGroups = !isHosted ? null : (props: IPlanGroupsListProps): IPromise<TaskOrchestrationQueuedPlanGroup[]> => {
                    let vssConnection = new VssConnection(VssContext.getDefaultWebContext(), ContextHostType.ProjectCollection);
                    let taskHttpClient = vssConnection.getHttpClient<TaskHttpClient>(TaskHttpClient, Constants.ReleaseManagementServiceId);

                    return taskHttpClient.getQueuedPlanGroups(null, Constants.ReleasesHubName, props.status);
                };

                releaseHub = {
                    name: Constants.ReleasesHubName,
                    displayText: BuildResources.ReleasesPipelinesDisplayHubName,
                    statusHeaderText: releasesHubStatusHeaderText,
                    getQueuedPlanGroups: getQueuedPlanGroups
                } as IHub;
            }

            // Order of hubs should be preserved. First builds and then releases
            if (!!buildHub) {
                hubs.push(buildHub);
            }
            if (!!releaseHub) {
                hubs.push(releaseHub);
            }

            let props: IPlanGroupsQueueDialogProps = {
                dialogTitle: BuildResources.PipelinesPlanGroupsQueueDialogTitle,
                hubs: hubs,
                selectedHubName: selectedHubName,
                selectedStatus: selectedStatus,
                targetElement: targetElement,
                showDialog: true
            };

            ReactDOM.render(React.createElement(PlanGroupsQueueDialog, props), targetElement);
        });
    }
}

export function hasRMServiceProvisioned(): IPromise<boolean> {
    var deferred: Q.Deferred<boolean> = Q.defer<boolean>();
    let isHosted = TfsContext.getDefault().isHosted;

    // OnPrem, RMO is always provisioned
    if (!isHosted) {
        deferred.resolve(true);
    }
    else {
        let rmServiceProvisioned: boolean = false;
        let spsLocation = VSSLocations.getCachedServiceLocation(ServiceInstanceTypes.SPS, ContextHostType.ProjectCollection);
        let locationClient: LocationsHttpClient3 = new LocationsHttpClient3(spsLocation);

        let connection = new VssConnection(TfsContext.getDefault().contextData);
        let authClient = connection.getHttpClient(AuthenticationHttpClient)

        let tokenToCreate = <Authentication_Contracts.WebSessionToken>{
            appId: Utils_String.EmptyGuidString,
            force: false,
            name: Utils_String.EmptyGuidString,
            tokenType: Authentication_Contracts.DelegatedAppTokenType.Session,
            namedTokenId: null,
            validTo: null,
            token: null
        };

        let tokenResult: Q.Deferred<string> = Q.defer<string>();
        let getTokenPromise = tokenResult.promise.then((token: string) => {
            locationClient.authTokenManager = new BearerAuthTokenManager(token);
        });

        authClient.createSessionToken(tokenToCreate).then((createdToken: Authentication_Contracts.WebSessionToken) => {
            tokenResult.resolve(createdToken.token);
        }, (error) => {
            tokenResult.reject(error);
        });

        locationClient._setInitializationPromise(getTokenPromise);

        let locationClientPromise: Q.Promise<ServiceDefinition[]> = <Q.Promise<ServiceDefinition[]>>locationClient.getServiceDefinitions("LocationService2");
        locationClientPromise.then((serviceDefinitions: ServiceDefinition[]) => {
            // Absence of 'status' field or value of Active indicates service is provisioned
            rmServiceProvisioned = !!serviceDefinitions
                && serviceDefinitions.length > 0
                && serviceDefinitions.some(definition => (Utils_String.equals(definition.identifier, Constants.ReleaseManagementServiceId, true)
                                                          && (definition.status == null || definition.status === ServiceStatus.Active)));
        }).fin(() => {
            // Error is not handled, rmServiceProvisioned is false by default, so returning the same
            deferred.resolve(rmServiceProvisioned);
        });
    }

    return deferred.promise;
}

import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import {
    BuildStateProperties,
    DefinitionStateProperties,
    RawStateProperties
} from "Build.Common/Scripts/Navigation";

import { BuildResultsViewTabIds } from "TFS/Build/ExtensionContracts";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { HubsService } from "VSS/Navigation/HubsService";
import { getLocalService } from "VSS/Service";
import { Uri } from "VSS/Utils/Url";

export module Mvc {
    export const Controller: string = "build";
    export const DefaultAction: string = "index";
    export const DetailAction: string = "detail";
    export const DesignerAction: string = "definitionEditor";
}

export module DefinitionsActions {
    export const Mine: string = "mine";
    export const All: string = "allDefinitions";
    export const All2: string = "allDefinitions2";
    export const AllBuilds: string = "allBuilds";
    export const Queued: string = "queued";
    export const Xaml: string = "xaml";
}

export module DefinitionActions {
    export const Summary: string = "summary";
    export const History: string = "history";
    export const Deleted: string = "deleted";
}

export module DesignerActions {
    export const General: string = "general";
    export const SimpleProcess: string = "simple-process";
    export const Triggers: string = "triggers";
    export const Repositories: string = "repositories";
    export const Variables: string = "variables";
    export const Settings: string = "settings";
    export const History: string = "history";
    export const Retention: string = "retention";
}

export module ExplorerActions {
    export const QueuedBuilds: string = "queued";
    export const CompletedBuilds: string = "completed";
    export const DeletedBuilds: string = "deleted";
}

export module BuildActions {
    export const Artifacts: string = BuildResultsViewTabIds.Artifacts;
    export const Console: string = BuildResultsViewTabIds.Console;
    export const Logs: string = BuildResultsViewTabIds.Logs;
    export const Summary: string = BuildResultsViewTabIds.Summary;
    export const Timeline: string = BuildResultsViewTabIds.Timeline;

    export const Details: string = "details";
    export const Diagnostics: string = "diagnostics";
    export const Drop: string = "drop";
}

export module XamlBuildActions {
    export const Log: string = BuildResultsViewTabIds.XamlLog;
    export const Diagnostics: string = BuildResultsViewTabIds.XamlDiagnostics;
}

export module UserActions {
    export const QueueNewBuild: string = "queuebuild";
    export const NewDefinition: string = "new";
}

export module EditorActions {
    export const GettingStarted = "build-definition-getting-started";
    export const EditBuildDefinition = "edit-build-definition";
    export const CloneBuildDefinition = "clone-build-definition";
    export const ContributionId = "ms.vss-ciworkflow.build-ci-hub";
}

export module EditorParameter {
    export const Path = "path";
    export const Source = "source";
    export const Id = "id";
}

export module BuildLinks {
    export function getAllDefinitionsLink(path?: string): string {
        let routeData: IRouteData = {};
        routeData[RawStateProperties.Action] = DefinitionsActions.All;
        routeData[DefinitionStateProperties.Path] = path;

        return TfsContext.getDefault().getActionUrl(Mvc.DefaultAction, Mvc.Controller, routeData);
    }

    export function getBuildDetailLink(buildId: number, tab?: string, routeData?: any): string {
        routeData = copy(routeData);
        routeData[BuildStateProperties.BuildId] = buildId;
        routeData[RawStateProperties.Action] = tab || DefinitionActions.Summary;

        // point to new build result page, this will handle redirection if the new page preview is not ON and fallsback to old page
        return TfsContext.getDefault().getActionUrl("", "build/results", routeData);
    }

    export function getDefinitionLink(definitionId: number, tab?: string, routeData?: any): string {
        routeData = copy(routeData);
        routeData[DefinitionStateProperties.DefinitionId] = definitionId;

        // if the feature flag is off, there is no definition Summary
        let defaultTab = BuildActions.Summary;
        if (!FeatureAvailabilityService.isFeatureEnabled("WebAccess.Build.Definitions", false)) {
            defaultTab = ExplorerActions.CompletedBuilds;
        }

        routeData[RawStateProperties.Action] = tab || defaultTab;

        return TfsContext.getDefault().getActionUrl(Mvc.DefaultAction, Mvc.Controller, routeData);
    }

    export function getDefinitionEditorLink(definitionId: number, tab?: string, routeData?: any): string {
        routeData = copy(routeData);
        // If there is no cloneId add definitionId
        if (!routeData[DefinitionStateProperties.CloneId]) {
            routeData[DefinitionStateProperties.DefinitionId] = definitionId;
        }

        routeData[RawStateProperties.Action] = tab || DesignerActions.SimpleProcess;

        return TfsContext.getDefault().getActionUrl(Mvc.DesignerAction, Mvc.Controller, routeData);
    }

    export function getMyDefinitionsLink(): string {
        let routeData = {};
        routeData[RawStateProperties.Action] = DefinitionsActions.Mine;

        return TfsContext.getDefault().getActionUrl(Mvc.DefaultAction, Mvc.Controller, routeData);
    }

    export function getNewDefinitionLink(tab?: string, routeData?: any): string {
        routeData = copy(routeData);
        routeData[RawStateProperties.Action] = tab || DesignerActions.SimpleProcess;

        return TfsContext.getDefault().getActionUrl(Mvc.DesignerAction, Mvc.Controller, routeData);
    }

    export function getQueueLink(queuedId: number) {
        let tfsContext = TfsContext.getDefault();
        return tfsContext.getActionUrl(null, "AgentQueue", {
            project: tfsContext.navigation.project,
            area: "admin",
            "queueId": queuedId
        } as IRouteData);
    }

    export function getPoolLink(poolId: number, action: PoolPageAction, configuration?: IPoolPageConfiguration) {
        let tfsContext = TfsContext.getDefault();

        var routeData: IRouteData = {
            project: null,
            area: "admin",
            "poolId": poolId,
            "_a": action
        } as IRouteData;

        if (configuration) {
            if (configuration.agentId) {
                $.extend(routeData, { "agentId": configuration.agentId });
            }
        }

        return tfsContext.getActionUrl(null, "AgentPool", routeData);
    }

    export enum PoolPageAction {
        Agents = "agents",
        Roles = "roles"
    };

    export interface IPoolPageConfiguration {
        agentId?: number
    }

    export class PoolPageConfiguration implements IPoolPageConfiguration {
        agentId?: number
    }

    export function getGettingStartedUrl(path?: string, source?: string): string {
        const uri = getEditorUri(EditorActions.GettingStarted);
        if (!uri) {
            return null;
        }

        // Add more query parameters in the URL
        if (path) {
            uri.addQueryParam(EditorParameter.Path, path);
        }

        if (source) {
            uri.addQueryParam(EditorParameter.Source, source);
        }

        return uri.absoluteUri;
    }

    export function getEditDefinitionUrl(definitionId: number): string {
        const uri = getEditorUri(EditorActions.EditBuildDefinition);
        if (!uri) {
            return null;
        }

        // Add more query parameters in the URL
        if (definitionId) {
            uri.addQueryParam(EditorParameter.Id, definitionId.toString());
        }

        return uri.absoluteUri;
    }

    export function getCloneDefinitionUrl(cloneId: number): string {
        const uri = getEditorUri(EditorActions.CloneBuildDefinition);
        if (!uri) {
            return null;
        }

        if (cloneId) {
            uri.addQueryParam(EditorParameter.Id, cloneId.toString());
        }

        return uri.absoluteUri;
    }

    function getEditorUri(actionName?: string): Uri {
        const hubService = getLocalService(HubsService);
        const hub = hubService.getHubById(EditorActions.ContributionId);
        if (!hub) {
            // the editor hub is currently not exposed to anonymous users
            return null;
        }

        const uri = new Uri(TfsContext.getDefault().getHostUrl());
        uri.path = Uri.parse(hub.uri).path;

        // Add the query parameters in the URL
        if (actionName) {
            uri.addQueryParam(RawStateProperties.Action, actionName);
        }

        return uri;
    }
}

export function copy(routeData: any): any {
    let result = {};

    Object.keys(routeData || {}).forEach((key) => {
        result[key] = routeData[key];
    });

    return result;
}
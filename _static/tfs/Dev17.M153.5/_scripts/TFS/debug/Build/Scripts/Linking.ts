import { DefinitionStateProperties } from "Build.Common/Scripts/Navigation";
import { BuildLinks, DefinitionsActions, copy, Mvc } from "Build.Common/Scripts/Linking";
import { CIOptinConstants } from "Build/Scripts/Constants";
import * as Utils from "Build/Scripts/Utilities/Utils";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { getHistoryService } from "VSS/Navigation/Services";

import { BuildDefinitionReference } from "TFS/Build/Contracts";

export const BuildHelpLink = "https://go.microsoft.com/fwlink/?LinkId=619385";

export interface IContributionNavigationState {
    contributionId?: string;
    action: string;
    path?: string;
}

export function getDefaultBreadcrumbUrl(path: string) {
    let currentState: IContributionNavigationState = getHistoryService().getCurrentState();
    if (currentState) {
        let data = copy(currentState);
        data.path = path;
        data._a = currentState.action;
        return TfsContext.getDefault().getActionUrl(Mvc.DefaultAction, Mvc.Controller, data);
    }
    else {
        return "";
    }
}

export function getBreadcrumbUrlForDefinitionEditor(path: string) {
    let url: string = "";
    if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.BuildAllDefinitionsTab)) {
        url = BuildLinks.getAllDefinitionsLink(path);
    }
    else {
        url = BuildLinks.getMyDefinitionsLink();
    }

    return url;
}

export function getDefaultBreadcrumbUrlForDefinition(path: string) {
    let urlState = getHistoryService().getCurrentState();
    let action = DefinitionsActions.All;
    // honor context only if user clicks on root breadcrumb, if it's folder, it should goto default alldefinitions action
    if (path === "\\" && urlState && urlState.context) {
        action = urlState.context;
    }

    let routeData = {
        _a: action,
        path: path
    };

    return TfsContext.getDefault().getActionUrl(Mvc.DefaultAction, Mvc.Controller, routeData as any);
}

export function getDefinitionEditorLink(definitionId: number) {
    return BuildLinks.getEditDefinitionUrl(definitionId);
}

export function getDefinitionSummaryLink(definitionId: number) {
    return BuildLinks.getDefinitionLink(definitionId);
}

export function getDefinitionLink(definition: BuildDefinitionReference, isfavDefinition: boolean): string {
    let urlState = getHistoryService().getCurrentState();
    let context = DefinitionsActions.All;

    if (isfavDefinition) {
        context = DefinitionsActions.Mine;
    }

    if (urlState && urlState.action) {
        context = urlState.action;
    }
    else {
        // default state to "Mine" since this is default selected tab
        context = DefinitionsActions.Mine;
    }

    let routeData = {};
    routeData[DefinitionStateProperties.Context] = context;
    routeData[DefinitionStateProperties.Path] = definition.path;

    return BuildLinks.getDefinitionLink(definition.id, null, routeData);
}
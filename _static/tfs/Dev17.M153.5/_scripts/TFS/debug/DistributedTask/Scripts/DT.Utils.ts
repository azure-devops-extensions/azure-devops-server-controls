import Context = require("VSS/Context");
import Navigation_Services = require("VSS/Navigation/Services");
import PlatformContracts = require("VSS/Common/Contracts/Platform");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");

import Constants = require("DistributedTask/Scripts/Constants");

export class ErrorHelper {
    public static convertToShallowError(error: TfsError): TfsError {
        if(error != null) {
            return ({ name: error.name, message: error.message });
        }

        return error;
    }
}

export class UrlHelper {

    public static getUrlForExtension(contributionId: string, action?: any, queryParameters?: any, projectName?: string) {
        var pageContext = Context.getPageContext();

        var collectionUri: string = pageContext.webContext.collection.uri;
        var projectNameForUri: string = projectName || pageContext.webContext.project && pageContext.webContext.project.name;
        var teamName = "";
        if (pageContext.navigation.topMostLevel === PlatformContracts.NavigationContextLevels.Team) {
            teamName = Context.getPageContext().webContext.team.name;
        }

        var baseUri: string = collectionUri + (!!projectNameForUri ? projectNameForUri + "/" : "") + (!!teamName ? teamName + "/" : "");
        return this._getExtensionActionUrlFragment(baseUri, contributionId, action, queryParameters).replace("#", "?");
    }

    private static _getExtensionActionUrlFragment(baseUri: string, contributionId: string, action: any, queryParameters?: any): string {
        var fragementActionLink = Navigation_Services.getHistoryService().getFragmentActionLink(action, queryParameters);

        return baseUri + UrlHelper._getExtensionUrl(contributionId) + fragementActionLink;
    }

    private static _getExtensionUrl(contributionId: string): string {
        if (ExtensionIdToRouteMap[contributionId]) {
            return ExtensionIdToRouteMap[contributionId];
        }
        else {
            return `_apps/hub/${contributionId}`;
        }
    }
}

export const ExtensionIdToRouteMap = {
    [Constants.ExtensionArea.LibraryHub]: Constants.ExtensionRoutes.LibraryHub,
    [Constants.ExtensionArea.OAuthConfigurationsHub]: Constants.ExtensionRoutes.OAuthConfigurationsHub
};

export class KeyboardHelper {
    public static onWindowCtrlShortcut(keyCode: number, action: () => void) {
        $(window).bind('keydown', event => {
            if (Utils_UI.KeyUtils.isExclusivelyCtrl(event) && (event.keyCode === keyCode)) {
                event.preventDefault();
                action();
            }
        });
    }
}
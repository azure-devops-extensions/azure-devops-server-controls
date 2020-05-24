import VSS = require("VSS/VSS");
import Navigation_Services = require("VSS/Navigation/Services");
import VCCommon = require("VersionControl/Scripts/Generated/TFS.VersionControl.Common");
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCWikiLinkTransformer = require("VersionControl/Scripts/TFS.VersionControl.WikiLinkTransformer");
import VC = require("VersionControl/Scripts/TFS.VersionControl");

export function getWelcomeUrl(repository: RepositoryContext, name?: string, repositoryType?: RepositoryType, path?: string, action?: string, state?: any, routeData?: any): string {

    var tfsContext = repository.getTfsContext();
    var welcomeUrl = tfsContext.getActionUrl(null, "welcome", routeData);

    if (!state) {
        state = {};
    }
    if (name) {
        state.name = name;
    }
    if (repositoryType != null) {
        state.repositoryType = repositoryType;
    }
    if (path) {
        state.path = path;
    }
    var urlFragment = Navigation_Services.getHistoryService().getFragmentActionLink(action, state);
    var fullUrl = welcomeUrl + urlFragment;
    return fullUrl;
}

export class Actions {
    public static VIEW: string = "view";
}

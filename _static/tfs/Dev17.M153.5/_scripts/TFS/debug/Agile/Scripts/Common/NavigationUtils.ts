
import Context = require("VSS/Context");
import VSS_Service = require("VSS/Service");
import Utils_Url = require("VSS/Utils/Url");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");

export interface UrlInfo {
    controller?: string;
    action?: string;
    urlParameters?: string;
    queryParameters?: IDictionaryStringTo<string>;
}

export module NavigationUtils {

    export const boardPageAction = "board";
    export const capacityPageAction = "capacity";
    export const taskboardPageAction = "taskboard";
    export const iterationPageAction = "iteration";

    const BACKLOGS_CONTROLLER = "_backlogs";

    /**
     * Adds the current url to backlogsMruHub to support sticky behavior on backlogs
     */
    export function rememberMruHub() {
        const project = Context.getPageContext().webContext.project;

        if (!project || !project.id) {
            return;
        }

        let navigationContext = Context.getPageContext().navigation;
        let currentController = navigationContext.currentController;
        let currentAction = navigationContext.currentAction;
        let urlParams = navigationContext.currentParameters ? navigationContext.currentParameters : null;
        let queryParams = Utils_Url.getQueryParameters(window.location.href);
        let settingsSvc = VSS_Service.getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);

        let obj = <UrlInfo>{
            controller: currentController,
            action: currentAction,
            urlParameters: urlParams,
            queryParameters: queryParams
        };
        settingsSvc.beginWriteSetting(getMruHubRegistryPath(project.id), JSON.stringify(obj), TFS_WebSettingsService.WebSettingsScope.User, null);
    }

    /**
     * Rewrites backlogs url with supplied action and parameters
     * @param action
     * @param parameter
     */
    export function rewriteBacklogsUrl(action: string, parameter?: string) {
        let currentUrl = window.location.pathname;
        let idx = currentUrl.toLowerCase().indexOf(BACKLOGS_CONTROLLER);

        if (idx != -1) {
            let newUrl = currentUrl.substring(0, idx + BACKLOGS_CONTROLLER.length);
            if (action) {
                newUrl = newUrl + "/" + action;
            }
            if (parameter) {
                newUrl = newUrl + "/" + parameter;
            }
            window.history.replaceState(null, document.title, newUrl);
        }
    }

    /**
     * Returns registry path
     */
    function getMruHubRegistryPath(projectId: string): string {
        const registryPath = "/Backlogs/Navigation/mruHub";
        return `${registryPath}/${projectId}`;
    }
}
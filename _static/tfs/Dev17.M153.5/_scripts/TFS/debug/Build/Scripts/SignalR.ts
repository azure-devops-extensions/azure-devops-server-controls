import { DataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { WebPageDataService } from "VSS/Contributions/Services";
import * as Diag from "VSS/Diag";
import { getService } from "VSS/Service";
import * as StringUtils from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

interface SignalRUrlData {
    actionUrl: string;
    hubsUrl: string;
}

export function getSignalRConnectionUrl(): string {
    let dataService: WebPageDataService = getService(WebPageDataService);
    let pageData = dataService.getPageData<SignalRUrlData>("ms.vss-build-web.build-signalr-data-provider");
    if (pageData) {
        return pageData.actionUrl;
    }
}

export function loadSignalR(signalrHubUrl?: string): IPromise<void> {
    const tfsContext = TfsContext.getDefault();

    if (!signalrHubUrl) {
        let dataService: WebPageDataService = getService(WebPageDataService);
        let pageData = dataService.getPageData<SignalRUrlData>("ms.vss-build-web.build-signalr-data-provider");
        if (pageData) {
            signalrHubUrl = pageData.hubsUrl;
        }
    }

    // Get SignalR scripts from the 3rd party scripts path
    const thirdPartyUrl = tfsContext.configuration.get3rdPartyStaticRootPath();
    const minified = !Diag.getDebugMode() ? "min." : "";
    const signalRScript = StringUtils.format("{0}_scripts/jquery.signalR-vss.2.2.0.{1}js", thirdPartyUrl, minified);

    return VSS.requireModules([signalRScript]).then(
        () => {
            return VSS.requireModules([signalrHubUrl]);
        }
    );
}
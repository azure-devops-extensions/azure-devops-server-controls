import * as Q from "q";
import { ExtensionService, WebPageDataService } from "VSS/Contributions/Services";
import { getHistoryService } from "VSS/Navigation/Services";
import * as VSSService from "VSS/Service";
import { LocalSettingsService } from "VSS/Settings";
import * as Utils_String from "VSS/Utils/String";
import { BrowserCheckUtils, htmlEncode } from "VSS/Utils/UI";
import { Uri } from "VSS/Utils/Url";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { SupportedIde, SupportedIdeType } from "TFS/VersionControl/Contracts";

const favoriteIdeKey = "favorite-ide-index";
const supportedIdesContributionKey = "ms.vss-code-web.protocol-handler-data-provider";

/**
* Serves as the authority for IDEs that are supported through protocol handlers on the web as well as user preferred IDEs.
*/
export class IdeSource {
    private settingsService = VSSService.getLocalService(LocalSettingsService);
    private _branchName;

    constructor(branchName: string) {
        this._branchName = branchName;
    }

    /**
     * Gets a list of all the supportedIDEs on the client.
     */
    public getSupportedIdes = (repoId: string): IPromise<SupportedIde[]> => {
        const platformKey =
            BrowserCheckUtils.isWindows() ? "Win"
                : BrowserCheckUtils.isMacintosh() ? "Mac"
                    : "Linux";
        const deferred = Q.defer<SupportedIde[]>();
        const webPageDataService = VSSService.getService(WebPageDataService);
        const contribution = {
            id: supportedIdesContributionKey,
            properties: {
                serviceInstanceType: ServiceInstanceTypes.TFS,
            },
        } as Contribution;

        const properties = {
            "repositoryId": repoId,
        };

        webPageDataService.ensureDataProvidersResolved([contribution], true, properties).then(() => {
            const supportedIdes: SupportedIde[] = webPageDataService.getPageData(supportedIdesContributionKey) || [];
            deferred.resolve(supportedIdes.filter(ide => this.supportsPlatform(ide, platformKey)));
        }, deferred.reject);

        return deferred.promise;
    }

    /**
     * Sets the favorite IDE type.
     */
    public setFavoriteIdeType = (newFavorite: SupportedIdeType): void => {
        this.settingsService.write(favoriteIdeKey, newFavorite);
    }

    /**
     * Gets the current favorite IDE type.
     */
    public getFavoriteIdeType = (): SupportedIdeType => {
        return this.settingsService.read<SupportedIdeType>(favoriteIdeKey);
    }

    /**
     * Opens the repository on the provided IDE.
     */
    public openInIde = (ide: SupportedIde): void => {

        // A branch other than the user's default may have been specified in the URL or selected by the user.
        const state: any = getHistoryService().getCurrentState();
        const version: string = state.version || state.itemVersion;
        const branchName: string = (version && version.toUpperCase().indexOf("GB") === 0) ?
            version.substr(2) : this._branchName;

        let url = ide.protocolHandlerUrl;
        if (Utils_String.startsWith(url, "vsoi://", Utils_String.ignoreCaseComparer)) {
            url += "&Ref=" + htmlEncode(branchName);
        } else if (Utils_String.startsWith(url, "vsoeclipse://", Utils_String.ignoreCaseComparer)) {
            const parsedUrl: Uri = Uri.parse(url);
            let tfsLink: string = parsedUrl.getQueryParam("tfslink");
            let tfsLinkDecoded: string = window.atob(tfsLink);
            tfsLinkDecoded += "&ref=" + encodeURIComponent(branchName);
            tfsLink = window.btoa(tfsLinkDecoded);
            parsedUrl.addQueryParam("tfslink", tfsLink, true);
            url = parsedUrl.absoluteUri;
        }
        this.openExternalUrl(url);
    }

    /**
     * Downloads the provided IDE.
     */
    public downloadIde = (ide: SupportedIde): void => {
        this.openExternalUrl(ide.downloadUrl);
    }

    private supportsPlatform(ide: SupportedIde, platformToSupport: string): boolean {
        return ide.supportedPlatforms.some(platform => platform.indexOf(platformToSupport) !== -1);
    }

    private openExternalUrl = (url: string): void => {
        const newWindow = window.open(url, "_blank");
        if (newWindow) {
            newWindow.opener = null;
        }
    }
}


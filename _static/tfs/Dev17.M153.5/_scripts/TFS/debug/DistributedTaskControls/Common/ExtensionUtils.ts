
import * as Common from "DistributedTaskControls/Common/Common";
import { IMarketplaceData } from "DistributedTaskControls/Common/MarketplaceLinkHelper";
import { IExtensionDefinitionItem, IRequestedExtension, TaskItemType, ExtensionStatisticName } from "DistributedTaskControls/Common/Types";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ExtensionDefinitionSource } from "DistributedTaskControls/Sources/ExtensionDefinitionSource";

import * as VSSContext from "VSS/Context";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { PublishedExtension, PublishedExtensionFlags, ExtensionFile, ExtensionStatistic } from "VSS/Gallery/Contracts";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class ExtensionUtils {

    public static mapExtensionDefinitionToIExtensionDefinitionItem(extension: PublishedExtension, installedExtensionsIdentifierArray: string[],
        requestedExtensionsData: IRequestedExtension[], marketplaceData: IMarketplaceData): IExtensionDefinitionItem {
        let extensionDefinitionItem: IExtensionDefinitionItem = {
            id: extension.extensionId,
            friendlyName: extension.displayName,
            name: extension.extensionName,
            iconUrl: this._getExtensionIconUrl(extension.versions[0].files),
            description: extension.shortDescription,
            author: extension.publisher.displayName,
            extensionStatusText: this._getExtensionStatusText(extension, installedExtensionsIdentifierArray, requestedExtensionsData, this._getCurrentUserId()),
            extensionUrl: this._getExtensionUrl(extension, marketplaceData),
            definitionType: TaskItemType.Extension,
            installCount: this._getExtensionInstallCount(extension),
            tags: extension.tags || []
        };

        return extensionDefinitionItem;
    }

    public static prefetchExtensions(): void {
        // prefetch extensions
        ExtensionDefinitionSource.instance().getExtensionsList();
        ExtensionDefinitionSource.instance().getInstalledExtensionsList();
        ExtensionDefinitionSource.instance().getRequestedExtensionsList();
    }

    public static createExtensionIdentifier(publisherName: string, extensionName: string): string {
        return publisherName + "." + extensionName;
    }

    private static _getExtensionInstallCount(extension: PublishedExtension): number {
        let installStatistic = Utils_Array.first(extension.statistics, (statistic: ExtensionStatistic) => {
            return (Utils_String.ignoreCaseComparer(statistic.statisticName, ExtensionStatisticName.Install) === 0);
        });

        let onpremDownloadsStatistic = Utils_Array.first(extension.statistics, (statistic: ExtensionStatistic) => {
            return (Utils_String.ignoreCaseComparer(statistic.statisticName, ExtensionStatisticName.OnpremDownloads) === 0);
        });

        let extensionInstallCount: number = 0;

        if (installStatistic) {
            extensionInstallCount += installStatistic.value;
        }

        if (onpremDownloadsStatistic) {
            extensionInstallCount += onpremDownloadsStatistic.value;
        }
        
        return extensionInstallCount;
    }

    private static _getExtensionIconUrl(files: ExtensionFile[]): string {
        let file = Utils_Array.first(files, (file: ExtensionFile) => {
            return (Utils_String.ignoreCaseComparer(file.assetType, "Microsoft.VisualStudio.Services.Icons.Small") === 0);
        });

        return file ? file.source : Utils_String.empty;
    }

    private static _getExtensionStatusText(extension: PublishedExtension, installedExtensionsIdentifierArray: string[],
        requestedExtensionsData: IRequestedExtension[], userId: string): string {
            
            if (this._isExtensionInstalled(extension, installedExtensionsIdentifierArray)) {
                return Resources.InstalledText;
            }
            else if (this._isExtensionRequested(extension, requestedExtensionsData, userId)) {
                return Resources.RequestedText;
            }
            else {
                if (this.isFirstPartyPaid(extension) || this.isThirdPartyPaid(extension)) {
                    return Resources.GetText;
                }
                else {
                    return Resources.GetItFreeText;
                }
            }
    }

    private static _isExtensionInstalled(extension: PublishedExtension, installedExtensionsIdentifierArray: string[]): boolean {
        return extension ? Utils_Array.contains(installedExtensionsIdentifierArray, this.createExtensionIdentifier(extension.publisher.publisherName, extension.extensionName), this._extensionIdentityComparer) : false;
    }

    private static _extensionIdentityComparer = (a: string, b: string) => {
        return Utils_String.ignoreCaseComparer(a, b);
    }

    private static _isExtensionRequested(extension: PublishedExtension, requestedExtensionsData: IRequestedExtension[], userId: string): boolean {
        let extensionIdentifier: string = this.createExtensionIdentifier(extension.publisher.publisherName, extension.extensionName);
        
        for (let requestedExtensionData of requestedExtensionsData) {            
            if (Utils_String.ignoreCaseComparer(requestedExtensionData.id, extensionIdentifier) === 0) {
                for (let requester of requestedExtensionData.requestedBy) {
                    if (Utils_String.equals(userId, requester.id)) {
                        return true;
                    }
                }
            }
        }        
        return false;
    }

    private static _getCurrentUserId(): string {
        return VSSContext.getDefaultWebContext().user.id;
    }

    private static _getExtensionUrl(extension: PublishedExtension, marketplaceData: IMarketplaceData): string {
        if (extension && marketplaceData) {
            let rootUrl: string = marketplaceData.marketplaceUrl;
            // Make sure that the url does not ends with a slash
            if (Utils_String.endsWith(rootUrl, "/")) {
                rootUrl = rootUrl.slice(0, rootUrl.length - 1);
            }

            let url: string = Utils_String.format(this._marketplaceExtensionItemUrlFormat, rootUrl, extension.publisher.publisherName, extension.extensionName);

            if (!VSSContext.getPageContext().webAccessConfiguration.isHosted) {
                return marketplaceData.serverKey ? Utils_String.format(this._marketplaceExtensionItemUrlFormatWithSeverKey, url, marketplaceData.serverKey) : url;
            }
            else {
                url = Utils_String.format(this._marketplaceExtensionItemUrlFormatWithTargetId, url, VSSContext.getDefaultWebContext().host.id);

                if (FeatureAvailabilityService.isFeatureEnabled(Common.FeatureFlag_EnableIdentityNavigation, false)) {
                    let hostUri: string = VSSContext.getDefaultWebContext().host.uri;

                    // Make sure that the host uri does not ends with a slash
                    if (Utils_String.endsWith(hostUri, "/")) {
                        hostUri = hostUri.slice(0, hostUri.length - 1);
                    }
    
                    url = Utils_String.format(this._marketplaceRedirectUrlFormat, hostUri, encodeURIComponent(url));
                }

                return url;
            }
        }
        
        return Utils_String.empty;
    }

    private static isFirstPartyPaid(extension: PublishedExtension) {
        return extension.publisher.displayName === this._microsoftText && !this.isPreview(extension) && this.isPaidExtension(extension);
    }

    private static isThirdPartyPaid(extension: PublishedExtension) {
        return extension.publisher.displayName !== this._microsoftText && this.isPaidExtension(extension);
    }

    private static isPaidExtension(extension: PublishedExtension) {
        if ((extension.flags &  PublishedExtensionFlags.Paid) !== 0) {
            return true;
        }

        let containsPaidTag = false;
        if (extension && extension.tags) {
            if (Utils_Array.arrayContains(this._paidTag, extension.tags, (val1, val2) => { return (Utils_String.ignoreCaseComparer(val1, val2) === 0); })) {
                containsPaidTag = true;
            }
        }

        return containsPaidTag;
    }

    private static isPreview(extension:  PublishedExtension) {
        let isPreview = false;
        isPreview = Utils_Array.arrayContains(this._previewTag, extension.tags, (val1, val2) => { return (Utils_String.ignoreCaseComparer(val1, val2) === 0); });

        return (isPreview || (extension.flags &  PublishedExtensionFlags.Preview) !== 0);
    }

    public static readonly extensionsIdentifierText: string = "_extensions";
    private static readonly _marketplaceExtensionItemUrlFormat = "{0}/items?itemName={1}.{2}";
    private static readonly _marketplaceExtensionItemUrlFormatWithSeverKey = "{0}&serverKey={1}";
    private static readonly _marketplaceExtensionItemUrlFormatWithTargetId = "{0}&targetId={1}";
    private static readonly _marketplaceRedirectUrlFormat = "{0}/_redirect?target={1}";
    private static readonly _paidTag: string = "$IsPaid";
    private static readonly _previewTag: string = "$preview";
    private static readonly _microsoftText: string = "Microsoft";
}
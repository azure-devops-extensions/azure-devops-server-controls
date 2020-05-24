import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { IconType } from "OfficeFabric/Icon";

import { Action } from "VSS/Flux/Action";
import { HostNavigationService } from "VSS/SDK/Services/Navigation";

import { getPackageDetailsPageUrl } from "Package/Scripts/Helpers/UrlHelper";
import * as PackageResources from "Feed/Common/Resources";
import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import { IPackageVersionSelectedPayload } from "./ActionPayloads";

/**
 * Get Open and Open In New Tab commands for context menu.
 * @param feedName
 * @param pkg
 * @param version Pass in version when you're already in the package page. Don't pass version from the package list.
 * @param updatePivotSelectionCallback Pass in to handle pivot change event on version click.
 * @param viewName Pass in if you have used the view filter (to be able to pass the filter value to the package details page).
 */
export function getNavigationCommands(
    feedName: string,
    pkg: Package,
    actions: { [key: string]: Action<{}> },
    version?: PackageVersion,
    updatePivotSelectionCallback?: () => void,
    viewName?: string
): IContextualMenuItem[] {
    const packageContextMenuCommands: IContextualMenuItem[] = [];
    const iconProps = {
        iconType: IconType.Default,
        className: " bowtie-icon bowtie-arrow-open"
    };

    packageContextMenuCommands.push({
        key: "open",
        name: PackageResources.FeedGrid_ContextMenu_Open,
        iconProps,
        onClick: () => {
            if (version) {
                const payload = {
                    version,
                    viewName
                } as IPackageVersionSelectedPayload;
                actions.PackageVersionSelected.invoke(payload);

                if (updatePivotSelectionCallback) {
                    updatePivotSelectionCallback();
                }
            } else {
                actions.PackageSelected.invoke(pkg);
            }
        }
    });

    packageContextMenuCommands.push({
        key: "openInNewTab",
        name: PackageResources.FeedGrid_ContextMenu_OpenInNewTab,
        iconProps,
        onClick: (): void => {
            const selectedVersion = version ? version.version : pkg.versions[0].version;
            const packageUrl: string = getPackageDetailsPageUrl(feedName, pkg, selectedVersion);
            const hostNavigationService: HostNavigationService = new HostNavigationService();
            hostNavigationService.openNewWindow(packageUrl, null);
        }
    });

    return packageContextMenuCommands;
}

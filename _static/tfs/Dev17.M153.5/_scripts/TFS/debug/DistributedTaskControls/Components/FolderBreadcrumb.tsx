/// <reference types="react" />

import React = require("react");

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { AppContext, AppCapability } from "DistributedTaskControls/Common/AppContext";
import { DefaultBreadcrumbDisplayedItems, STRING_BACKSLASH } from "DistributedTaskControls/Common/Common";
import { IBreadcrumb, FolderBreadcrumbUtils } from "DistributedTaskControls/Components/FolderBreadcrumbUtils";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { Breadcrumb, IBreadcrumbItem } from "OfficeFabric/Breadcrumb";
import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import { getLWPModule } from "VSS/LWP";
const FPS = getLWPModule("VSS/Platform/FPS");

export interface IFolderBreadcrumbProps extends Base.IProps {
    folderPath: string;
    getBreadcrumbLink: (path: string) => string;
    rootFolderName?: string;
    maxDisplayedItems?: number;
    containerClassName?: string;
}

export class FolderBreadcrumb extends Base.Component<IFolderBreadcrumbProps, Base.IStateless> {

    public render() {
        let breadcrumbs: IBreadcrumb[] = FolderBreadcrumbUtils.getBreadcrumbs(this.props.folderPath);

        // There are requirement to show only last folder of the hierarchy and root folder name as link always go to overflow button
        // also we need to show '>' before build definition name, for this we are adding one extra empty item in the breadcrumb
        // There are two cases for the breadcrumb, 1) Folder name speicified and 2) No Folder name specified while saving build definition
        // in both case maximum displayed item change, when we have any crumbs then make maximum dispalyed item as 2, one for last folder name
        // and other for empty item to show >, in case no crumb make maximum dispalyed item as 1 to just show >
        let maxDisplayedItems = breadcrumbs.length > 0 ? DefaultBreadcrumbDisplayedItems : DefaultBreadcrumbDisplayedItems - 1;

        return (
            <div className={css(this.props.containerClassName, "dtc-bread-crumb-component")}>
                <Breadcrumb
                    className={this.props.cssClass}
                    ariaLabel={Resources.FolderPath}
                    onReduceData={(data) => undefined}
                    items={this._getBreadcrumbsItems(breadcrumbs)}
                    maxDisplayedItems={this.props.maxDisplayedItems || maxDisplayedItems} />
            </div>
        );
    }

    /**
     * Get Breadcrumbs items from the path
     * @param path Folder path
     */
    private _getBreadcrumbsItems(breadcrumbs: IBreadcrumb[]): IBreadcrumbItem[] {
        let items: IBreadcrumbItem[] = [];

        // Push root folder as well apart from regular folder, one can navigate to root path using this item
        if (this.props.rootFolderName) {
            items.push({
                text: this.props.rootFolderName,
                key: "root-folder",
                href: this._getHref(Utils_String.empty),
                onClick: this._onBreadcrumbItemClicked
            });
        }

        breadcrumbs.forEach((breadcrumb) => {
            let href: string = this._getHref(breadcrumb.path);

            items.push({
                text: breadcrumb.crumb,
                key: breadcrumb.path,
                href: href,
                onClick: this._onBreadcrumbItemClicked
            });
        });

        // Push one empty item so that we can show ">" before the definition name
        items.push({
            text: Utils_String.empty,
            key: "empty-crumb"
        });

        return items;
    }

    private _getHref(path: string): string {
        let href: string = Utils_String.empty;

        if (this.props.getBreadcrumbLink) {
            href = this.props.getBreadcrumbLink(path);
        }

        return href;
    }

    private _onBreadcrumbItemClicked(ev: React.MouseEvent<HTMLElement>, item: IBreadcrumbItem) {
        let eventProperties: IDictionaryStringTo<any> = {};
        if (item) {
            eventProperties[Properties.FolderPath] = item.key;
        }

        Telemetry.instance().publishEvent(Feature.FolderBreadcrumb, eventProperties, null, true);
        const lwpContext = AppContext.instance().PageContext;
        if (lwpContext && item.href) {
            ev.preventDefault();
            ev.stopPropagation();

            // The breadcrumb stays once we click on href, since we do FPS...to make it collapse, let's dispatch focus event on the component
            const element = document.querySelector(".dtc-bread-crumb-component");
            if (element) {
                const event = document.createEvent("Event");
                event.initEvent("focus", true, true);
                element.dispatchEvent(event);
            }

            FPS.onClickFPS(AppContext.instance().PageContext, item.href, true, ev);
        }
    }
}
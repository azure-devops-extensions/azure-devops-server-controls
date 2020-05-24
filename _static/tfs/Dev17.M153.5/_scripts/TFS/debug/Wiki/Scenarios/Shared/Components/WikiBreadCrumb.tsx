import * as React from "react";

import { autobind, css } from "OfficeFabric/Utilities";

import {
    getService as getSettingsService,
    ISettingsService,
    SettingsUserScope,
} from "VSS/Settings/Services";
import { IHubBreadcrumbItem } from "VSSUI/Components/HubHeader/HubBreadcrumb.Props";
import { IPickListAction } from "VSSUI/Components/PickList/PickList.Props";
import { HubHeader } from "VSSUI/HubHeader";
import { StateMergeOptions } from "VSS/Navigation/NavigationHistoryService";
import { IItemPickerProvider } from "VSSUI/PickList";
import { IVssIconProps, VssIcon, VssIconType } from "VSSUI/VssIcon";

import { GitVersionDescriptor } from "TFS/VersionControl/Contracts";
import { WikiV2 } from "TFS/Wiki/Contracts";
import {
    getWikiUrl,
    getWikiPageViewUrl,
    getWikiPageHistoryUrl,
    getWikiPublishUrl,
    redirectToUrl,
} from "Wiki/Scripts/WikiUrls";
import { IWikiItem, WikiPicker } from "Wiki/Scenarios/Integration/WikiPicker/WikiPicker";
import { WikiActionIds, WikiUserSettingKeys } from "Wiki/Scripts/CommonConstants";
import { getPageNameFromPath, versionDescriptorToString } from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Shared/Components/WikiBreadCrumb";

export interface WikiBreadCrumbProps {
    currentAction: string;
    currentWiki: WikiV2;
    currentWikiVersion: GitVersionDescriptor;
    currentPagePath?: string;
    hidePublishWikiAction?: boolean;
    hideProjectWikiAction?: boolean;
    hideUnpublishWikiAction?: boolean;
    onCreateWiki?(): void;
    onPublishWikiAction?(): void;
    onUnpublishWikiAction?(): void;
}

export class WikiBreadCrumb extends React.PureComponent<WikiBreadCrumbProps, {}> {
    private _hubHeaderContainerRef: HTMLElement;

    public render(): JSX.Element {
        if (!this.props.currentWiki) {
            return null;
        }

        const headerClassName = css("wiki-bread-crumb ", { "project-only-wiki": !WikiFeatures.isProductDocumentationEnabled() });
        return (
            <div className={headerClassName} ref={this._setHubHeaderContainerRef}>
                <HubHeader
                    breadcrumbItems={this._getBreadcrumbs()}
                    hubBreadcrumbAriaLabel={WikiResources.WikiBreadcrumb_Arialabel}
                    iconProps={{
                        iconName: "bowtie-icon bowtie-log",
                        iconType: VssIconType.bowtie,
                    } as IVssIconProps}
                    headerItemPicker={this._getWikiPicker()}
                    pickListClassName={"wiki-pick-list"}
                    title={this._getHubHeaderTitle()}
                    maxBreadcrumbItemWidth="inherit"
                />
            </div>
        );
    }

    @autobind
    private _setHubHeaderContainerRef(hubHeaderContainer: HTMLElement): void {
        this._hubHeaderContainerRef = hubHeaderContainer;
    }

    private _getWikiPicker(): IItemPickerProvider<IWikiItem> {
        if (this.props.currentAction === WikiActionIds.View && this._shouldShowWikiPicker()) {
            return new WikiPicker({
                projectId: this.props.currentWiki.projectId,
                selectedItem: this.props.currentWiki,
                onWikiSelectionChange: this._onWikiSelectionChange,
                getActions: this._getWikiPickerActions,
            });
        }

        return null;
    }

    private _getHubHeaderTitle(): string {
        if (this.props.currentAction === WikiActionIds.View && !this._shouldShowWikiPicker()) {
            return this.props.currentWiki.name;
        }

        return null;
    }

    @autobind
    private _getWikiPickerActions(): IPickListAction[] {
        const actions: IPickListAction[] = [];

        if (!this.props.hidePublishWikiAction) {
            // Add action to go to Publish view
            actions.push({
                onClick: this._onPublishWikiAction,
                name: WikiResources.WikiPickerPublishWikiActionText,
                iconProps: {
                    iconName: "bowtie-icon bowtie-math-plus-light",
                    iconType: VssIconType.bowtie,
                } as IVssIconProps,
            });
        }

        if (!this.props.hideUnpublishWikiAction) {
            actions.push({
                onClick: this._onUnpublishWiki,
                name: WikiResources.WikiPickerUnpublishWikiActionText,
                iconProps: {
                    iconName: "Delete",
                    iconType: VssIconType.fabric,
                } as IVssIconProps,
            });
        }

        if (!this.props.hideProjectWikiAction && this.props.onCreateWiki) {
            actions.push({
                onClick: this.props.onCreateWiki,
                name: WikiResources.WikiPickerCreateWikiActionText,
                iconProps: {
                    iconName: "bowtie-icon bowtie-math-plus-light",
                    iconType: VssIconType.bowtie,
                } as IVssIconProps,
            });
        }

        return actions;
    }

    private _shouldShowWikiPicker(): boolean {
        return WikiFeatures.isProductDocumentationEnabled();
    }

    @autobind
    private _onPublishWikiAction(): void {
        this._closeWikiPickerDropdown();
        this.props.onPublishWikiAction();
    }

    @autobind
    private _onUnpublishWiki(): void {
        this._closeWikiPickerDropdown();
        this.props.onUnpublishWikiAction();
    }

    @autobind
    private _closeWikiPickerDropdown(): void {
        // This can be removed once the task is fixed. Task 1153729: Version picker does not close the dropdown when an action in it is clicked
        if (this._hubHeaderContainerRef) {
            // To toggle hub header dropdown which otherwise does not toggle on action click.
            this._hubHeaderContainerRef.click();
        }
    }

    @autobind
    private _onWikiSelectionChange(item: IWikiItem): void {
        getSettingsService().setEntries(
            { [WikiUserSettingKeys.WikiName]: item.name },
            SettingsUserScope.Me,
            "Project",
            this.props.currentWiki.projectId
        );

        // redirectToUrl() - isInternal is 'false' to force full refresh.
        // TODO: Fix Task 1153174 before making isInternal 'true' to force XHR.
        redirectToUrl(
            getWikiUrl(
                WikiActionIds.View,
                {
                    wikiIdentifier: item.name,
                },
                StateMergeOptions.routeValues),
            false);
    }

    private _getBreadcrumbs(): IHubBreadcrumbItem[] {
        const currentWikiName = this.props.currentWiki.name;
        const currentWikiVersion = versionDescriptorToString(this.props.currentWikiVersion);
        const currentPagePath = this.props.currentPagePath;

        // This is the root item. This is currently not actionable.
        const breadcrumbItems: IHubBreadcrumbItem[] = [{
            key: "wikis-root-breadcrumb",
            text: WikiResources.BreadcrumbRoot,
        }];

        if (this.props.currentAction === WikiActionIds.View) {
            return breadcrumbItems;
        }

        breadcrumbItems.push({
            key: "wikis-wiki-breadcrumb",
            text: currentWikiName,
            leftIconProps: {
                iconName: "bowtie-icon bowtie-log",
                iconType: VssIconType.bowtie,
            } as IVssIconProps,
            onClick: () => {
                redirectToUrl(
                    getWikiPageViewUrl(
                        {
                            wikiIdentifier: currentWikiName,
                            wikiVersion: currentWikiVersion,
                        },
                        StateMergeOptions.routeValues));
            },
        });

        breadcrumbItems.push({
            key: "wikis-page-breadcrumb",
            text: currentPagePath && getPageNameFromPath(currentPagePath),
            onClick: () => {
                redirectToUrl(
                    getWikiPageViewUrl(
                        {
                            wikiIdentifier: currentWikiName,
                            wikiVersion: currentWikiVersion,
                            pagePath: currentPagePath,
                        },
                        StateMergeOptions.routeValues));
            },
            isCurrentItem: this.props.currentAction === WikiActionIds.History,
        });

        if (this.props.currentAction === WikiActionIds.History) {
            return breadcrumbItems;
        }

        breadcrumbItems.push({
            key: "wikis-revisions-breadcrumb",
            text: WikiResources.HistoryPageTitle,
            onClick: () => {
                redirectToUrl(
                    getWikiPageHistoryUrl(
                        {
                            wikiIdentifier: currentWikiName,
                            wikiVersion: currentWikiVersion,
                            pagePath: currentPagePath,
                        },
                        StateMergeOptions.routeValues));
            },
            isCurrentItem: this.props.currentAction === WikiActionIds.Compare,
        });

        if (this.props.currentAction === WikiActionIds.Compare) {
            return breadcrumbItems;
        } else {
            return null;
        }
    }
}

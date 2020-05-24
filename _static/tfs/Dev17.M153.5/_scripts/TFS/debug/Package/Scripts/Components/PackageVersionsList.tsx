import * as React from "react";

import { IconButton } from "OfficeFabric/Button";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import {
    CheckboxVisibility,
    ColumnActionsMode,
    DetailsRow,
    IColumn,
    IDetailsRowProps,
    SelectionMode
} from "OfficeFabric/DetailsList";
import { IconType } from "OfficeFabric/Icon";
import { Link } from "OfficeFabric/Link";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind } from "OfficeFabric/Utilities";
import { Selection } from "OfficeFabric/utilities/selection/Selection";

import { Action } from "VSS/Flux/Action";
import { Component, Props, State } from "VSS/Flux/Component";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_Clipboard from "VSS/Utils/Clipboard";
import { delay } from "VSS/Utils/Core";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Url from "VSS/Utils/Url";

import { Filter } from "VSSUI/Utilities/Filter";
import { VssDetailsList, VssDetailsListTitleCell } from "VSSUI/VssDetailsList";

import * as Actions from "Package/Scripts/Actions/Actions";
import { IPackageVersionSelectedPayload } from "Package/Scripts/Common/ActionPayloads";
import * as ContextMenuNavigationCommands from "Package/Scripts/Common/ContextMenuNavigationCommands";
import { ProtocolCommands } from "Package/Scripts/Common/ProtocolCommands";
import { LoadingContainer } from "Package/Scripts/Components/LoadingContainer";
import { NoResultsPane } from "Package/Scripts/Components/NoResultsPane";
import { PackageUpstreamSource } from "Package/Scripts/Components/PackageUpstreamSource";
import { ViewsGridCell } from "Package/Scripts/Components/ViewsGridCell";
import { CiConstants, PackageDetailsPivot, PackageFilterBarConstants } from "Feed/Common/Constants/Constants";
import * as CommandGetters from "Package/Scripts/Helpers/CommandGetters";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import * as PackageCommandMenuItem from "Package/Scripts/Helpers/PackageCommandToContextMenuItem";
import { getPackageDetailsPageUrl } from "Package/Scripts/Helpers/UrlHelper";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { MavenKey } from "Package/Scripts/Protocols/Maven/Constants/MavenConstants";
import * as PackageResources from "Feed/Common/Resources";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import {
    MinimalPackageVersion,
    Package,
    PackageVersion,
    RecycleBinPackageVersion
} from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/PackageVersionsList";

export interface IPackageVersionsListProps extends Props {
    selectedPackage: Package;
    selectedVersion?: PackageVersion;
    feed: Feed;
    items: MinimalPackageVersion[];
    protocolMap: IDictionaryStringTo<IPackageProtocol>;
    displayVersionDetails: (changingVersion: boolean) => void;
    selectedFeed: Feed;
    filterState?: Filter;
    isRecycleBin: boolean;
    actions: { [key: string]: Action<{}> };
    clearSelection?: boolean;
    isLoading: boolean;
}

export interface IPackageVersionsListState extends State {
    wasCopied?: boolean;
    /**
     * Store selected versions, so when filtering changes (details list will reset selection)
     * and items in the grid changes
     * We can select those versions that were selected before filtering
     */
    selectedVersions: PackageVersion[];
}

export class PackageVersionsList extends Component<IPackageVersionsListProps, IPackageVersionsListState> {
    private _selection: Selection;

    constructor(props: IPackageVersionsListProps) {
        super(props);
        this.state = {
            wasCopied: false,
            selectedVersions: []
        };

        this._selection = new Selection({
            getKey: item => this._getSelectionKey(item as PackageVersion),
            onSelectionChanged: () => this._onSelectionChangedCallback(),
            canSelectItem: item => this._canSelectItem(item)
        });
    }

    public componentDidMount(): void {
        super.componentDidMount();
        // Ensure that the Package Store has retrieved package versions (or initiate the retrieval)
        // Do this on a delay, because until this method has completed, the component hasn't
        // subscribed to store events (and any store changes emited from within
        // the action handler won't be received by this component)
        delay(this, 0, () => this.props.actions.VersionsPivotSelected.invoke({}));
    }

    public componentWillReceiveProps(nextProps: IPackageVersionsListProps): void {
        if (this.props.clearSelection === false && nextProps.clearSelection === true) {
            // Clear all selections when selectedVersions were cleared out in the package store (e.g. after deleting a version).
            this._selection.setAllSelected(false);
        }
    }

    public render(): JSX.Element {
        return (
            <LoadingContainer isLoading={this.props.isLoading}>
                {this.props.items && this.props.items.length > 0 ? (
                    <VssDetailsList
                        ariaLabelForSelectionColumn={PackageResources.DetailsList_SelectionColumn_AriaLabel}
                        ariaLabelForSelectAllCheckbox={PackageResources.DetailsList_SelectAll_AriaLabel}
                        setKey={this.props.selectedPackage.id}
                        className={"package-version-list"}
                        allocateSpaceForActionsButtonWhileHidden={true}
                        actionsColumnKey={"version"}
                        getMenuItems={(item: PackageVersion) => this._getContextMenuItems(item)}
                        shouldDisplayActions={this._shouldDisplayActions}
                        items={this.props.items}
                        columns={this._getColumns()}
                        onRenderRow={this._onRenderRow}
                        selection={this._selection}
                        selectionMode={this._getSelectionMode()}
                        selectionPreservedOnEmptyClick={true}
                        checkboxVisibility={CheckboxVisibility.onHover}
                    />
                ) : (
                        <NoResultsPane
                            header={PackageResources.PackageGrid_NoPackagesMessage}
                            subheader={Utils_String.empty}
                            link={Utils_String.empty}
                            linkText={Utils_String.empty}
                            iconClass={"bowtie-search"}
                        />
                    )}
            </LoadingContainer>
        );
    }

    private _getSelectionMode(): SelectionMode {
        if (!this.props.isRecycleBin) {
            return this._isMaven() ? SelectionMode.single : SelectionMode.multiple;
        }

        return SelectionMode.multiple;
    }

    private _canSelectItem(item): boolean {
        return !item.isDeleted || this.props.isRecycleBin;
    }

    @autobind
    private _onRenderRow(props: IDetailsRowProps) {
        return (
            <div className={"versions-list-row"}>
                <DetailsRow {...props} />
            </div>
        );
    }

    @autobind
    private _shouldDisplayActions(item: PackageVersion) {
        if (this.props.isRecycleBin) {
            return false;
        }

        const commands: IContextualMenuItem[] = this._getContextMenuItems(item);
        if (commands.length > 0) {
            return true;
        }

        return false;
    }

    private _getContextMenuItems(item: PackageVersion): IContextualMenuItem[] {
        if (this.props.isRecycleBin) {
            return [];
        }

        const contextItemsGetter = new PackageCommandMenuItem.ContextualMenuItemsGetter();
        let menuItems: IContextualMenuItem[] = [];
        let commands: IPackageCommand[] = [];
        const changingVersion = item !== this.props.selectedVersion;

        // if multiple packages were selected, determine if a selected package was clicked
        if (
            this.state.selectedVersions &&
            this.state.selectedVersions.length > 1 &&
            this._selection.isKeySelected(item.id)
        ) {
            if (!item.isDeleted) {
                commands = this.props.protocolMap[
                    this.props.selectedPackage.protocolType
                ].getMultiSelectPackageCommands(this.props.selectedFeed, null, this.state.selectedVersions);
                menuItems = contextItemsGetter.GetContextMenuItems(commands);
            }
        } else {
            const packageCommandsGetter = new CommandGetters.PackageCommandsGetter();
            const isMaven = this._isMaven();
            const viewFilterName = this._getViewName();
            menuItems = ContextMenuNavigationCommands.getNavigationCommands(
                viewFilterName ? this.props.feed.name + "@" + viewFilterName : this.props.feed.name,
                this.props.selectedPackage,
                this.props.actions,
                item,
                () => this.props.displayVersionDetails(changingVersion),
                viewFilterName
            );

            menuItems.push({
                key: "link",
                name: PackageResources.VersionList_GetALink,
                iconProps: { iconName: "Link" },
                onClick: () => {
                    CustomerIntelligenceHelper.publishEvent(CiConstants.PackageVersionLinkCopied, {
                        protocol: this.props.selectedPackage.protocolType
                    });
                    const linkUrl = Utils_Url.replaceUrlParam(window.location.href, "version", item.version);
                    Utils_Clipboard.copyToClipboard(
                        Utils_Url.replaceUrlParam(linkUrl, "view", PackageDetailsPivot.OVERVIEW)
                    );
                }
            } as IContextualMenuItem);

            if (!item.isDeleted) {
                menuItems.push({
                    key: "install",
                    title: isMaven
                        ? PackageResources.VersionList_CopyInstallCommand_Maven
                        : PackageResources.VersionList_CopyInstallCommand,
                    name: isMaven
                        ? PackageResources.VersionList_CopyInstallCommand_ContextMenu_Maven
                        : PackageResources.VersionList_CopyInstallCommand_ContextMenu,
                    iconProps: {
                        iconType: IconType.Default,
                        className: "bowtie-icon bowtie-file-type-cmd"
                    },
                    onClick: () => {
                        CustomerIntelligenceHelper.publishEvent(CiConstants.PackageVersionInstallCommandCopied, {
                            protocol: this.props.selectedPackage.protocolType
                        });
                        Utils_Clipboard.copyToClipboard(this._getCopyCommands(item));
                    }
                } as IContextualMenuItem);

                const packageProtocol = this.props.protocolMap[this.props.selectedPackage.protocolType];
                commands = packageCommandsGetter.getSingleSelectionItems(
                    this.props.selectedFeed,
                    packageProtocol,
                    this.props.selectedPackage,
                    item,
                    /*viaPackageList*/ false
                );
                const protocolContextMenuItems = contextItemsGetter.GetContextMenuItems(commands, item.version);
                menuItems.push(...protocolContextMenuItems);
            }
        }

        return menuItems;
    }

    private _getColumns(): IColumn[] {
        const columns: IColumn[] = [];
        columns.push({
            key: "version",
            fieldName: "version",
            name: PackageResources.VersionList_VersionColumn,
            minWidth: 200,
            maxWidth: 450,
            isResizable: true,
            headerClass: "version-header",
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: (item: PackageVersion) => {
                return this._getVersionColumn(item);
            }
        } as IColumn);

        // If protocol supports promote, show views column
        // tslint:disable:no-bitwise
        if (
            !this.props.isRecycleBin &&
            (this.props.protocolMap[this.props.selectedPackage.protocolType].supportedCommandsMask &
                ProtocolCommands.Promote) !== 0
        ) {
            columns.push({
                key: "views",
                fieldName: "views",
                name: PackageResources.ReleaseViewsColumn,
                minWidth: 185,
                maxWidth: 185,
                isResizable: true,
                className: "views-grid-cell",
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (item: PackageVersion) => {
                    return <ViewsGridCell packageVersion={item} />;
                }
            } as IColumn);
        }

        if (this.props.isRecycleBin === true) {
            columns.push({
                key: "deletedDate",
                fieldName: "deletedDate",
                name: PackageResources.VersionList_DeletedColumn,
                isResizable: true,
                minWidth: 100,
                maxWidth: 150,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (item: PackageVersion) => {
                    const agoDate = Utils_Date.ago(item.deletedDate);
                    const fullDate = Utils_String.dateToString(item.deletedDate);
                    return (
                        <TooltipHost content={fullDate}>
                            <span>{agoDate}</span>
                        </TooltipHost>
                    );
                }
            } as IColumn);

            columns.push({
                key: "scheduledPermanentDeleteDate",
                fieldName: "scheduledPermanentDeleteDate",
                name: PackageResources.PermanentDeleteDateColumn,
                isResizable: true,
                minWidth: 100,
                maxWidth: 150,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (item: RecycleBinPackageVersion) => {
                    const displayDate = Utils_Date.format(item.scheduledPermanentDeleteDate, "ddd MMM dd yyyy");
                    return (
                        <TooltipHost content={displayDate}>
                            <span>{displayDate}</span>
                        </TooltipHost>
                    );
                }
            } as IColumn);
        } else {
            columns.push({
                key: "published",
                fieldName: "published",
                name: PackageResources.VersionList_PublishedColumn,
                isResizable: true,
                minWidth: 100,
                maxWidth: 150,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (item: PackageVersion) => {
                    const agoDate = Utils_Date.ago(item.publishDate);
                    const fullDate = Utils_String.dateToString(item.publishDate);
                    return (
                        <TooltipHost content={fullDate}>
                            <span>{agoDate}</span>
                        </TooltipHost>
                    );
                }
            } as IColumn);

            columns.push({
                key: "source",
                fieldName: "source",
                name: PackageResources.UpstreamSourceColumn,
                isResizable: true,
                minWidth: 100,
                maxWidth: 150,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (item: PackageVersion) => {
                    return (
                        <PackageUpstreamSource
                            packageSummary={this.props.selectedPackage}
                            packageVersion={item}
                            upstreamSources={this.props.selectedFeed.upstreamSources}
                        />
                    );
                }
            } as IColumn);
        }

        return columns;
    }

    private _getVersionColumn(item: PackageVersion): JSX.Element {
        return (
            <VssDetailsListTitleCell
                onRenderPrimaryText={() => {
                    const versionString =
                        !this.props.isRecycleBin &&
                            this.props.selectedVersion &&
                            this.props.selectedVersion.version === item.version
                            ? Utils_String.format(PackageResources.VersionList_SelectedVersionString, item.version)
                            : item.version;
                    const isMaven = this._isMaven();
                    const url =
                        getPackageDetailsPageUrl(this.props.feed.name, this.props.selectedPackage, versionString) +
                        "&view=overview";
                    let installCommand: string = null;
                    let content: string = null;

                    if (!isMaven) {
                        installCommand = this._getCopyCommands(item);
                        content = this.state.wasCopied
                            ? Utils_String.format(
                                PackageResources.VersionList_CopyInstallCommand_Copied,
                                installCommand
                            )
                            : PackageResources.VersionList_CopyInstallCommand;
                    }

                    return (
                        <div className={"version-column"}>
                            <Link
                                className={
                                    this.props.isRecycleBin || (item.isListed && !item.isDeleted)
                                        ? "version-link"
                                        : "version-link strike-through"
                                }
                                href={url}
                                disabled={this.props.isRecycleBin}
                                onClick={evt => {
                                    if (evt.ctrlKey) {
                                        return;
                                    }
                                    evt.preventDefault();
                                    this._onVersionClick(item, this.props.actions.PackageVersionSelected);
                                }}
                            >
                                {versionString}
                            </Link>
                            {!this.props.isRecycleBin &&
                                this.state.selectedVersions &&
                                this.state.selectedVersions.length < 2 &&
                                (installCommand || isMaven) &&
                                !item.isDeleted && (
                                    <TooltipHost
                                        content={isMaven ? null : content}
                                        // Maven needs new lines for the tooltip, so it needs to be rendered as JSX instead of a string.
                                        tooltipProps={
                                            isMaven
                                                ? {
                                                    onRenderContent: () => {
                                                        return (
                                                            <div>
                                                                {" "}
                                                                {this.state.wasCopied ? (
                                                                    this._getMavenToolTip()
                                                                ) : (
                                                                        <span>
                                                                            {
                                                                                PackageResources.VersionList_CopyInstallCommand_Maven
                                                                            }
                                                                        </span>
                                                                    )}{" "}
                                                            </div>
                                                        );
                                                    }
                                                }
                                                : null
                                        }
                                    >
                                        <IconButton
                                            className={"install-button"}
                                            onMouseOut={() => this.setState({ wasCopied: false })}
                                            iconProps={{
                                                iconType: IconType.Default,
                                                className: "bowtie-icon bowtie-file-type-cmd"
                                            }}
                                            onClick={() => this._onInstallCommandClick(item)}
                                            ariaLabel={
                                                isMaven
                                                    ? PackageResources.VersionList_CopyInstallCommand_ContextMenu_Maven
                                                    : PackageResources.VersionList_CopyInstallCommand_ContextMenu
                                            }
                                        />
                                    </TooltipHost>
                                )}
                        </div>
                    );
                }}
            />
        );
    }

    private _getCopyCommands(item: PackageVersion): string {
        const { feed, protocolMap, selectedPackage } = this.props;
        const packageProtocol = protocolMap[selectedPackage.protocolType];

        return packageProtocol.getCopyInstallCommand(feed.name, selectedPackage.name, item.version);
    }

    private _getMavenToolTip(): JSX.Element {
        const packageNameParts = this.props.selectedPackage.name ? this.props.selectedPackage.name.split(":") : "";

        if (packageNameParts.length === 2) {
            return (
                <ul style={{ margin: 0, padding: 0 }}>
                    <li>{"<dependency>"}</li>
                    <li>{"<groupId>" + packageNameParts[0] + "</groupId>"}</li>
                    <li>{"<artifactId>" + packageNameParts[1] + "</artifactId>"}</li>
                    <li>{"<version>" + this.props.selectedVersion.version + "</version>"}</li>
                    <li>
                        {Utils_String.format(PackageResources.VersionList_CopyInstallCommand_Copied, "</dependency>")}
                    </li>
                </ul>
            );
        }

        return <span> PackageResources.MavenOverview_InvalidPackageError} </span>;
    }

    private _onInstallCommandClick(item: PackageVersion): void {
        Utils_Clipboard.copyToClipboard(this._getCopyCommands(item));
        this.setState({
            wasCopied: true
        });

        const announcement: string = this._isMaven()
            ? PackageResources.VersionList_InstallCommand_Copied_AriaLabel_Maven
            : PackageResources.VersionList_InstallCommand_Copied_AriaLabel;
        announce(announcement);
    }

    private _onVersionClick(item: PackageVersion, packageVersionSelectedAction: Action<{}>): void {
        const changingVersion = item !== this.props.selectedVersion;
        const viewFilterName = this._getViewName();
        const payload = {
            version: item,
            viewName: viewFilterName
        } as IPackageVersionSelectedPayload;
        packageVersionSelectedAction.invoke(payload);
        this.props.displayVersionDetails(changingVersion);
    }

    private _getViewName(): string {
        const viewFilterValue = this.props.filterState.getFilterItemValue(PackageFilterBarConstants.ViewFilterKey);
        if (viewFilterValue == null || !viewFilterValue[0]) {
            return null;
        }

        const viewFilterName = viewFilterValue[0].split("@");
        return viewFilterName && viewFilterName.length === 1 ? viewFilterName[0] : viewFilterName[1];
    }

    private _getSelectionKey(version: PackageVersion): string {
        return version ? version.id : undefined;
    }

    private _onSelectionChangedCallback(): void {
        const selectedVersions = this._selection.getSelection() as PackageVersion[];

        // When filtering first time using keyword (action trigger is throttled by 200ms between keystrokes)
        // below action gets executed before Filter action completes and will throw action is executing error
        // so delay will invoke this action in next cycle
        delay(this, 0, () => Actions.VersionSelectionChanged.invoke(selectedVersions));
    }

    private _isMaven(): boolean {
        return this.props.selectedPackage.protocolType.toLowerCase() === MavenKey;
    }
}

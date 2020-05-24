import { ICalloutProps } from "OfficeFabric/Callout";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { IColumn, ConstrainMode, DetailsListLayoutMode, CheckboxVisibility } from "OfficeFabric/DetailsList";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import { Selection } from "OfficeFabric/utilities/selection/Selection";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as VSSUtilsDate from "VSS/Utils/Date";
import { localeIgnoreCaseComparer, format } from "VSS/Utils/String";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { VssDetailsList } from "VSSUI/VssDetailsList";

import { FileDropTarget } from "Presentation/Scripts/TFS/Components/Tree/DropTarget";
import { ActionCreator } from "VersionControl/Scenarios/Explorer/ActionCreator";
import { getCommands, ExplorerCommandCreator } from "VersionControl/Scenarios/Explorer/Commands/ItemCommands";
import { getFilesItemProvider, ContributionNames } from "VersionControl/Scenarios/Explorer/Commands/ItemContribution";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { FileNameCell } from "VersionControl/Scenarios/Explorer/Components/FileNameCell";
import { FolderContentState, ChangeInfo } from "VersionControl/Scenarios/Explorer/Stores/FolderContentStore";
import { CommitHash } from "VersionControl/Scenarios/Shared/CommitHash";
import { getShortCommitId } from "VersionControl/Scripts/CommitIdHelper";
import { VersionControlActionIds, getFragmentAction } from "VersionControl/Scripts/Controls/ControlsCommon";
import { ItemModel, GitObjectId } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import "VSS/LoaderPlugins/Css!VersionControl/FolderContent";

export namespace ColumnKeys {
    export const name = "name";
    export const changeDate = "changeDate";
    export const comment = "comments";
}

const columnWidths: IDictionaryStringTo<number> = {
    [ColumnKeys.name]: 240,
    [ColumnKeys.changeDate]: 180,
    [ColumnKeys.comment]: 10000,
};

const lineHeightInPixels = 36;
const defaultItemsPerPage = 10;
const virtualizeItemsThreshold = 100;

export const FolderContentContainer = VCContainer.create(
    ["context", "extensions", "knownItems", "fileContent", "folderContent", "permissions", "path", "version"],
    ({ repositoryContext, extensionsState, folderContentState, knownItemsState, fileContentState, permissionsState, path, versionSpec, isGit }, { actionCreator }) => {
        const allowEditing = fileContentState.allowEditingFeatures && fileContentState.allowEditingVersion;
        const hasEditPermissions = permissionsState.createOrModifyFiles;
        return <FolderContent
            {...folderContentState}
            isGit={isGit}
            folderPath={path}
            versionSpec={versionSpec}
            repositoryContext={repositoryContext}
            itemIconClasses={knownItemsState.iconClasses}
            knownItems={knownItemsState.knownItems}
            allowEditing={allowEditing}
            hasEditPermissions={hasEditPermissions}
            rootPath={fileContentState.rootPath}
            extraCommands={extensionsState.extraCommands}
            onSearchClick={actionCreator.retrieveAllLastChanges}
            onSelectionChanged={actionCreator.selectFolderChildren}
            onContentFirstRendered={actionCreator.notifyContentRendered}
            onFilesDrop={actionCreator.promptUploadFilesFromFolderEmptySpace}
            onCommitClick={actionCreator.goToLatestChangeCommit}
            onCommitCopied={actionCreator.notifyCommitCopied}
            onColumnSorted={actionCreator.notifyColumnSorted}
            actionCreator={actionCreator}
            />;
    });

export interface FolderContentProps extends FolderContentState {
    isGit: boolean;
    folderPath: string;
    versionSpec: VersionSpec;
    repositoryContext: RepositoryContext;
    itemIconClasses: IDictionaryStringTo<string>;
    knownItems: IDictionaryStringTo<ItemModel>;
    actionCreator: ActionCreator;
    allowEditing: boolean;
    hasEditPermissions: boolean;
    rootPath: string;
    extraCommands: ExplorerCommandCreator[];
    onContentFirstRendered(): void;
    onSearchClick(fullName: string): void;
    onSelectionChanged(items: ItemModel[]): void;
    onFilesDrop(dataDrop: DataTransfer): void;
    onCommitClick: React.EventHandler<React.MouseEvent<HTMLLinkElement>>;
    onCommitCopied(): void;
    onColumnSorted(columnKey: string, isDescending: boolean): void;
}

export interface FolderContentComponentState {
    sortedItems: ItemModel[];
    sortedColumnKey: string;
    isSortedDescending: boolean;
    selection: Selection;
}

export class FolderContent extends React.PureComponent<FolderContentProps, FolderContentComponentState> {
    private isFirstRendered = false;
    private wasFocusedBeforeUpdate = false;
    private detailsListDomNode: Element;

    constructor(props: FolderContentProps) {
        super(props);

        this.state = {
            sortedItems: props.items && this.sortItems(props.items, getComparer(ColumnKeys.name, props), false),
            sortedColumnKey: ColumnKeys.name,
            isSortedDescending: false,
            selection: new Selection({ onSelectionChanged: this.onSelectionChanged }),
        };
    }

    public componentWillReceiveProps(nextProps: FolderContentProps): void {
        const hasToSort =
            nextProps.items !== this.props.items ||
            (this.state.sortedColumnKey === ColumnKeys.changeDate &&
            nextProps.itemsChangeInfo !== this.props.itemsChangeInfo);

        if (!hasToSort) {
            return;
        }

        this.setState(
            state => ({
                sortedItems: nextProps.items &&
                    this.sortItems(
                        nextProps.items,
                        getComparer(state.sortedColumnKey, nextProps),
                        state.isSortedDescending),
            }));
    }

    public componentWillUpdate(): void {
        // Remind focus until we have items again to set it back
        this.wasFocusedBeforeUpdate =
            this.wasFocusedBeforeUpdate && !this.props.items ||
            this.isFocused();
    }

    public render(): JSX.Element {
        const { sortedItems, selection } = this.state;
        if (!this.isFirstRendered && sortedItems && sortedItems.length === 0) {
            this.onContentFirstRendered();
        }

        return (
            <FileDropTarget
                className="inner-content vc-folder-content"
                isEnabled={this.props.allowEditing}
                onFilesDrop={this.props.onFilesDrop}>
                    {
                        !sortedItems &&
                        <div className="loading-items-spinner-container">
                            <Spinner type={SpinnerType.large} label={VCResources.LoadingText} />
                        </div>
                    }
                    <VssDetailsList
                        ref={ref => this.detailsListDomNode = ReactDOM.findDOMNode(ref) as Element}
                        setKey={"don't reset selection"}
                        ariaLabelForGrid={this.getGridAriaLabel()}
                        getRowAriaLabel={this.getRowAriaLabel}
                        items={sortedItems || []}
                        columns={this.getColumns()}
                        selectionMode={SelectionMode.single}
                        selection={selection}
                        constrainMode={ConstrainMode.unconstrained}
                        layoutMode={DetailsListLayoutMode.justified}
                        checkboxVisibility={CheckboxVisibility.hidden}
                        onRowDidMount={!this.isFirstRendered && this.onContentFirstRendered}
                        actionsColumnKey={ColumnKeys.name}
                        getMenuItems={this.getItemCommands}
                        getMenuItemProviders={this.getMenuItemProviders}
                        initialFocusedIndex={this.wasFocusedBeforeUpdate ? 0 : undefined}
                        listProps={{
                            getPageHeight: () => lineHeightInPixels * defaultItemsPerPage,
                            onShouldVirtualize: () => sortedItems && sortedItems.length > virtualizeItemsThreshold,
                        }}
                    />
                </FileDropTarget>);
    }

    private isFocused(): boolean {
        return this.detailsListDomNode &&
            this.detailsListDomNode.querySelectorAll("a:focus").length > 0;
    }

    private getItemCommands = (item: ItemModel) => {
        return getCommands({
            ...this.props,
            item,
            isCurrentItem: false,
            isEditing: false,
            isDirty: false,
            isNewFile: false,
            isRoot: item.serverItem === this.props.rootPath,
            uiSource: "grid-context-menu",
        } as any);
    }

    private getMenuItemProviders = (item: ItemModel) => {
        return [getFilesItemProvider(item, this.props.versionSpec, this.props.repositoryContext, ContributionNames.gridItem)];
    }

    private getGridAriaLabel(): string {
        return format(VCResources.ExplorerFolderContentTitle, this.props.folderPath);
    }

    private getRowAriaLabel = (item: ItemModel): string => {
        return this.props.itemNames[item.serverItem];
    }

    private onContentFirstRendered = () => {
        if (!this.isFirstRendered) {
            this.isFirstRendered = true;
            this.props.onContentFirstRendered();
        }
    }

    private onSelectionChanged = (): void => {
        if (this.state.selection.count > 1) {
            throw new Error("Multiple selection is not supported.");
        }

        const selectedItems = this.state.selection.getSelection() as ItemModel[];
        this.props.onSelectionChanged(selectedItems);
    }

    private getColumns(): IColumn[] {
        const renderChangeDateCell = (item: ItemModel): JSX.Element =>
            <ChangeDateCell
                item={item}
                changeInfo={this.props.itemsChangeInfo[item.serverItem]}
                lastExploredTime={this.props.lastExploredTime}
                loadingTriggerFullName={this.props.loadingRemainderLatestChangesTriggerFullName}
                onSearchClick={() => this.props.onSearchClick(item.serverItem)}
                />;

        const renderNameCell = (item: ItemModel): JSX.Element =>
            <FileNameCell
                name={this.props.itemNames[item.serverItem]}
                fileUrl={getFragmentAction(VersionControlActionIds.Default, item.serverItem, this.props.versionSpec.toVersionString())}
                iconClass={this.props.itemIconClasses[item.serverItem]}
                item={this.props.knownItems[item.serverItem]}
                canDrop={this.props.allowEditing && item.isFolder}
                onFilesDrop={initialDrop => this.props.actionCreator.promptUploadFilesFromFolderInGrid(item.serverItem, initialDrop)}
                />;

        const renderCommentCell = (item: ItemModel) => {
            const changeInfo = this.props.itemsChangeInfo[item.serverItem];
            return changeInfo
                ? <CommentCell
                    changeInfo={changeInfo}
                    onLinkClick={this.props.onCommitClick}
                    onCommitCopied={this.props.onCommitCopied}
                    />
                : null;
        };

        const commentsTitle = this.props.isGit
            ? VCResources.FileListColumnCommits
            : VCResources.FileListColumnChangesets;

        return [
            this.createColumn(ColumnKeys.name, VCResources.FileListColumnName, renderNameCell),
            this.createColumn(ColumnKeys.changeDate, VCResources.FileListColumnLastChange, renderChangeDateCell),
            this.createColumn(ColumnKeys.comment, commentsTitle, renderCommentCell),
        ];
    }

    private createColumn(key: string, name: string, onRender: (item: ItemModel) => JSX.Element): IColumn {
        return {
            fieldName: key,
            key,
            name,
            onRender,
            onColumnClick: this.onColumnClick,
            minWidth: 100,
            maxWidth: columnWidths[key],
            isCollapsable: true,
            isResizable: true,
            isSorted: this.state.sortedColumnKey === key,
            isSortedDescending: this.state.isSortedDescending,
        };
    }

    private onColumnClick = (ev?: React.MouseEvent<HTMLElement>, column?: IColumn): void => {
        const comparer = getComparer(column.key, this.props);
        if (!comparer) {
            return;
        }

        const isSortedDescending = this.state.sortedColumnKey === column.key && !column.isSortedDescending;

        this.setState({
            sortedColumnKey: column.key,
            isSortedDescending,
            sortedItems: this.props.items && this.sortItems(this.props.items, comparer, isSortedDescending),
        } as FolderContentComponentState);

        this.props.onColumnSorted(column.key, isSortedDescending);
    }

    private sortItems(items: ItemModel[], ascendingComparer: IComparer<ItemModel>, isSortedDescending: boolean): ItemModel[] {
        const comparer = isSortedDescending
            ? (one, another) => ascendingComparer(another, one)
            : ascendingComparer;

        const foldersFirstComparer = wrapComparerFoldersGoFirst(comparer);

        return items.slice().sort(foldersFirstComparer);
    }
}

function getComparer(columnName: string, props: FolderContentProps): IComparer<ItemModel> {
    if (columnName === ColumnKeys.name) {
        return (a, b) => {
            const aName = props.itemNames[a.serverItem];
            const bName = props.itemNames[b.serverItem];

            return localeIgnoreCaseComparer(aName, bName);
        };
    } else if (columnName === ColumnKeys.changeDate) {
        return (a, b) => {
            const aChangeInfo = props.itemsChangeInfo[a.serverItem];
            const bChangeInfo = props.itemsChangeInfo[b.serverItem];

            if (!aChangeInfo || !aChangeInfo.changeDate) {
                return -1;
            } else if (!bChangeInfo || !bChangeInfo.changeDate) {
                return 1;
            } else {
                return aChangeInfo.changeDate.getTime() - bChangeInfo.changeDate.getTime();
            }
        };
    }
}

function wrapComparerFoldersGoFirst(comparer: IComparer<ItemModel>): IComparer<ItemModel> {
    return (a: ItemModel, b: ItemModel) => {
        if (a.isFolder) {
            if (!b.isFolder) {
                return -1;
            }
        } else if (b.isFolder) {
            return 1;
        }

        return comparer(a, b);
    };
}

interface ChangeDateCellProps extends KnownChangeDateCellProps, UnknownChangeDateCellProps {
    item: ItemModel;
}

const ChangeDateCell = (props: ChangeDateCellProps) =>
    props.changeInfo && props.changeInfo.changeDate
        ? <KnownChangeDateCell changeInfo={props.changeInfo} />
        : props.item.serverItem === props.loadingTriggerFullName
            ? <LoadingChangeDateCell />
            : <UnknownChangeDateCell
                lastExploredTime= {!props.changeInfo && props.lastExploredTime}
                loadingTriggerFullName={props.loadingTriggerFullName}
                onSearchClick= {props.onSearchClick} />;

interface KnownChangeDateCellProps {
    changeInfo: ChangeInfo;
}

const KnownChangeDateCell = (props: KnownChangeDateCellProps): JSX.Element =>
    <span title={VSSUtilsDate.localeFormat(props.changeInfo.changeDate, "F")}>
        {VSSUtilsDate.friendly(props.changeInfo.changeDate)}
    </span>;

const LoadingChangeDateCell = (): JSX.Element =>
    <span>
        <Spinner className="loading-last-change-spinner" />
        {"Searching history..."}
    </span>;

interface UnknownChangeDateCellProps {
    lastExploredTime: Date;
    loadingTriggerFullName: string;
    onSearchClick(): void;
}

const UnknownChangeDateCell = (props: UnknownChangeDateCellProps): JSX.Element => {
    if (!props.lastExploredTime) {
        return null;
    }

    const ageText = format(VCResources.FileListMoreThan, VSSUtilsDate.ago(props.lastExploredTime));

    if (props.loadingTriggerFullName) {
        return <span>{ageText}</span>;
    }

    return (
        <a role="button" title={VCResources.FileListSearchInFullHistory} onClick={props.onSearchClick}>
            {ageText}
        </a>
    );
};

interface CommentCellProps {
    changeInfo: ChangeInfo;
    onLinkClick: React.EventHandler<React.MouseEvent<HTMLLinkElement>>;
    onCommitCopied(): void;
}

const commentCalloutProps: ICalloutProps = { isBeakVisible: false };

const CommentCell = (props: CommentCellProps): JSX.Element =>
    <div
        className="change-cell">
        <CommitHash
            className="change-id"
            commitId={getCommitId(props.changeInfo.changeId)}
            href={props.changeInfo.changeUrl}
            onLinkClick={props.onLinkClick}
            showCopyButton={true}
            onCopied={props.onCommitCopied}
            />
        <TooltipHost
            directionalHint={DirectionalHint.topRightEdge}
            overflowMode={TooltipOverflowMode.Parent}
            content={[props.changeInfo.comment, props.changeInfo.userName].join(" - ")}
            calloutProps={commentCalloutProps}>
            <span className="change-comment">
                {props.changeInfo.comment}
            </span>
            <span className="change-author">
                {" " + (props.changeInfo.userName || "")}
            </span>
        </TooltipHost>
    </div>;

function getCommitId(changeId: string): GitObjectId {
    return { full: changeId, short: getShortCommitId(changeId) };
}

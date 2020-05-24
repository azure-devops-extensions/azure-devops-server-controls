import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Directory/Components/DirectoryGrid";
import * as AgileResources from "Agile/Scripts/Resources/TFS.Resources.Agile";
import { FavoriteStar } from "Favorites/Controls/FavoriteStar";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import {
    ColumnActionsMode,
    ConstrainMode,
    DetailsListLayoutMode,
    DetailsRow,
    IColumn,
    IDetailsRowProps,
    SelectionMode
} from "OfficeFabric/DetailsList";
import { Link } from "OfficeFabric/Link";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";
import { KeyCode } from "VSS/Utils/UI";
import { VssDetailsList } from "VSSUI/Components/VssDetailsList/VssDetailsList";
import { IVssIconProps, VssIcon, VssIconType } from "VSSUI/VssIcon";
import { InfoIcon } from "Presentation/Scripts/TFS/Components/InfoIcon";
import { TeamPanelIconButton } from "Presentation/Scripts/TFS/TeamPanel/TeamPanelIconButton";
import { ITeam } from "Agile/Scripts/Models/Team";

export type IGridRow<T, R extends IDirectoryRow<T>> = R | IGroupRow | IEmptyRow;

export namespace DirectoryColumnKeys {
    export const Name = "Name";
    export const Team = "Team";
}

export namespace CSS {
    export const DIRECTORY_ROWITEM = "directory-rowitem";
    export const DIRECTORY_GROUP_SPACER = "directory-group-spacer";
    export const DIRECTORY_COLUMN = "directory-column";
    export const DIRECTORY_COLUMN_HEADER = "directory-column-header";
    export const DIRECTORY_DELETED_FAVORITE_CONTAINER = "directory-deleted-favorite-container";
}

/** Row containing a directory artifact of type T */
export interface IDirectoryRow<T> {
    /** The row key */
    key: string;
    /** The title of the row */
    title: string;
    /** The team associated to the row */
    team: ITeam;
    url: string;
    /** Is the row deleted */
    isDeleted: boolean;
    /** Is the row favorited */
    isFavorited: boolean;
    /** The data object behind the row */
    data: T;
    /** Optional error message */
    errorMessage?: string;
}

/** The group header row */
export interface IGroupRow {
    /** The row key */
    key: string;
    /** The group title */
    title: string;
    /** Is the group expanded */
    expanded: boolean;
    /** Marker to identify a group row */
    isGroupRow: boolean;
    /** Optional icon properties for the group */
    iconProps?: IVssIconProps;
}

export interface IEmptyRow {
    key: string;
    ariaLabel: string;
    content: JSX.Element | string;
    isEmptyRow: boolean;
}

/** 
 * A group of rows 
 * If you wish to not use grouping, only provide the items attribute
 */
export interface IDirectoryRowGroup<T, R extends IDirectoryRow<T>> {
    /** The items in the group */
    items: R[];
    /** Is the group expanded */
    expanded?: boolean;
    /** The group key */
    groupKey?: string;
    /** The group header */
    groupHeader?: string;
    /** The group icon */
    groupIcon?: IVssIconProps;
}

export const DEFAULT_NAME_COLUMN: IColumn = {
    fieldName: DirectoryColumnKeys.Name,
    key: DirectoryColumnKeys.Name,
    name: AgileResources.DirectoryNameColumnTitle,
    minWidth: 400,
    maxWidth: 600,
    headerClassName: CSS.DIRECTORY_COLUMN_HEADER,
    className: CSS.DIRECTORY_COLUMN,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled
};

export const DEFAULT_TEAM_COLUMN: IColumn = {
    fieldName: DirectoryColumnKeys.Team,
    key: DirectoryColumnKeys.Team,
    name: AgileResources.DirectoryTeamColumnTitle,
    isResizable: true,
    minWidth: 200,
    maxWidth: 600,
    headerClassName: CSS.DIRECTORY_COLUMN_HEADER,
    className: CSS.DIRECTORY_COLUMN,
    columnActionsMode: ColumnActionsMode.disabled
};

export interface IDirectoryGridProps<T, R extends IDirectoryRow<T>> {
    /** The artifact icon, displayed next to each name */
    artifactIconProps?: IVssIconProps;
    /** Optional class name to append to the Grid container */
    className?: string;
    /** Get context menu items for the item */
    getContextMenuItems?: (item: R) => IContextualMenuItem[];
    /** Get the content for a zero data row for a group */
    getZeroDataContent?: (groupKey: string) => { content: JSX.Element | string, ariaLabel?: string };
    /** Is the grid in grouped mode? */
    isGrouped: boolean;
    /** The groups to display */
    items: IDirectoryRowGroup<T, R>[];
    /** The columns to display */
    columns: IColumn[];
    /** Project identifier for team cell */
    project: ContextIdentifier;
    /** Optional render override */
    onRenderCell?: (
        item: R,
        index: number,
        column: IColumn,
        defaultRenderer?: (item: R, index: number, column: IColumn) => JSX.Element
    ) => JSX.Element;

    /** Called when the favorite star is toggled for a row */
    onFavoriteToggled?: (item: R) => void;
    /** Called when a group is expanded/collapsed */
    onGroupToggled?: (groupKey: string) => void;
    /** Called when an item link is clicked/activated */
    onItemClicked?: (item: R, e: Event) => void;
    /** Indicates if the grid should acquire focus when it mounts */
    takeFocusOnMount?: boolean;
}

export interface IDirectoryGridState<T, R extends IDirectoryRow<T>> {
    /** The flattened rows */
    flattenedRows: IGridRow<T, R>[];
}

/**
 * A generic directory grid component
 * @param T The type of the underlying artifact (ex: Team)
 * @param R The type of the row object, which extends IDirectoryRow<T>
 */
export class DirectoryGrid<T, R extends IDirectoryRow<T>> extends React.Component<IDirectoryGridProps<T, R>, IDirectoryGridState<T, R>> {
    private _hasMounted: boolean;

    constructor(props: IDirectoryGridProps<T, R>) {
        super(props);

        this.state = {
            flattenedRows: this._flattenGroups(props.items, props.isGrouped),
        };
    }

    public componentWillReceiveProps(nextProps: IDirectoryGridProps<T, R>): void {
        if (this.props.items !== nextProps.items || this.props.isGrouped !== nextProps.isGrouped) {
            this.setState({ flattenedRows: this._flattenGroups(nextProps.items, nextProps.isGrouped) });
        }
    }
    public render(): JSX.Element {
        const {
            className,
            columns,
            getContextMenuItems,
            takeFocusOnMount
        } = this.props;

        const {
            flattenedRows
        } = this.state;

        return (
            <div className={css("directory-grid-container", className)}>
                <VssDetailsList
                    ariaLabelForGrid={AgileResources.Directory_GridLabel}
                    setKey={"sprints-gridview"} // setKey is required to keep focus on the selected item when the row is re-rendered
                    layoutMode={DetailsListLayoutMode.justified}
                    constrainMode={ConstrainMode.unconstrained}
                    isHeaderVisible={true}
                    columns={columns}
                    className="directory-gridview"
                    items={flattenedRows}
                    onRenderItemColumn={this._onRenderCell}
                    selectionMode={SelectionMode.single}
                    initialFocusedIndex={takeFocusOnMount && !this._hasMounted ? 0 : -1}
                    getKey={this._getRowKey}
                    onRenderRow={this._onRenderRow}
                    selectionPreservedOnEmptyClick={true}
                    allocateSpaceForActionsButtonWhileHidden={true}
                    actionsColumnKey={DirectoryColumnKeys.Name}
                    getMenuItems={getContextMenuItems ? this._getContextMenuItems : undefined}
                    shouldDisplayActions={this._shouldDisplayActions}
                    onItemInvoked={this._onRowInvoked}
                />
            </div>
        );
    }

    public componentDidMount(): void {
        this._hasMounted = true;
    }

    private _onRenderRow = (props: IDetailsRowProps): JSX.Element => {
        const {
            columns,
            isGrouped
        } = this.props;

        const isGroupRow = this._isGroupRow(props.item);
        const isEmptyRow = this._isEmptyRow(props.item);

        if (isGroupRow) {
            return (
                <GroupRow
                    columnKey={columns[0].key}
                    row={props.item as IGroupRow}
                    onToggled={this._onGroupRowToggled}
                    {...props}
                    // Shut up the typesystem complaining about refs
                    ref={null}
                    componentRef={null}
                />
            );
        } else if (isEmptyRow) {
            return (
                <EmptyRow
                    columnKey={columns[0].key}
                    isGrouped={isGrouped}
                    row={props.item as IEmptyRow}
                    {...props}
                    // Shut up the typesystem complaining about refs
                    ref={null}
                    componentRef={null}
                />
            );
        } else {
            return (
                <DetailsRow
                    {...props}
                />
            );
        }
    }

    private _onRenderCell = (row: R, index: number, column: IColumn): JSX.Element => {
        const {
            columns,
            isGrouped,
            onRenderCell = this._defaultOnRenderCell
        } = this.props;

        return (
            <div className={CSS.DIRECTORY_ROWITEM}>
                {isGrouped && column.key === columns[0].key && <div className={CSS.DIRECTORY_GROUP_SPACER} />}
                {onRenderCell(row, index, column, this._defaultOnRenderCell)}
            </div>
        );
    }

    private _defaultOnRenderCell = (row: R, index: number, column: IColumn): JSX.Element => {
        switch (column.fieldName) {
            case DirectoryColumnKeys.Name:
                return this._renderNameCell(row, index);
            case DirectoryColumnKeys.Team:
                return this._renderTeamCell(row);
            default:
                return null;
        }
    }

    /**
     * Render the name cell
     */
    private _renderNameCell(row: R, index: number): JSX.Element {
        const {
            artifactIconProps
        } = this.props;

        return (
            <NameCell
                artifactIconProps={artifactIconProps}
                row={row}
                onFavoriteToggled={this._onFavoriteToggled}
                onClick={this._onRowClicked}
            />
        );
    }

    /**
     * Render team cell
     */
    private _renderTeamCell(row: R): JSX.Element {
        if (!row.team.name) {
            return null;
        }

        const {
            project: {
                name: projectName,
                id: projectId
            }
        } = this.props;

        return (
            <div
                className="directory-row-team-cell"
            >
                <TeamPanelIconButton
                    projectName={projectName}
                    projectId={projectId}
                    teamId={row.team.id}
                    teamName={row.team.name}
                />

                <TooltipHost
                    hostClassName="team-name flex-tooltip-host"
                    overflowMode={TooltipOverflowMode.Self}
                    content={row.isDeleted ? AgileResources.DeletedFavoriteInfoMessage : row.team.name}
                >
                    <span>
                        {row.isDeleted ? AgileResources.DeletedFavoriteInfoMessage : row.team.name}
                    </span>
                </TooltipHost>
            </div>
        );
    }

    private _getContextMenuItems = (row: IGridRow<T, R>): IContextualMenuItem[] => {
        const {
            getContextMenuItems
        } = this.props;

        if (getContextMenuItems && !this._isGroupRow(row)) {
            return getContextMenuItems(row as R);
        }

        return [];
    }

    private _onFavoriteToggled = (item: R): void => {
        const {
            onFavoriteToggled
        } = this.props;

        if (onFavoriteToggled) {
            onFavoriteToggled(item);
        }
    }

    private _onGroupRowToggled = (row: IGroupRow): void => {
        const {
            onGroupToggled
        } = this.props;

        if (onGroupToggled) {
            onGroupToggled(row.key);
        }
    }

    private _onRowClicked = (row: R, index?: number, ev?: Event): void => {
        const {
            onItemClicked
        } = this.props;

        if (onItemClicked) {
            onItemClicked(row, ev);
        }
    }

    private _onRowInvoked = (row: IGridRow<T, R>, index?: number, ev?: Event): void => {
        if (!this._isEmptyRow(row) && !this._isGroupRow(row)) {
            this._onRowClicked(row as R, index, ev);
        }
    }

    private _flattenGroups(groups: IDirectoryRowGroup<T, R>[], isGrouped: boolean, props: IDirectoryGridProps<T, R> = this.props): IGridRow<T, R>[] {
        const {
            getZeroDataContent
        } = props;

        const flattenedRows: IGridRow<T, R>[] = [];
        if (groups) {
            groups.forEach((group: IDirectoryRowGroup<T, R>) => {
                if (isGrouped && group.groupHeader) {
                    const groupRow: IGroupRow = {
                        key: group.groupKey,
                        title: group.groupHeader,
                        expanded: group.expanded,
                        isGroupRow: true,
                        iconProps: group.groupIcon
                    };

                    flattenedRows.push(groupRow);

                    if (group.expanded) {
                        if (group.items.length > 0) {
                            flattenedRows.push(...group.items);
                        } else if (getZeroDataContent) {
                            // Try to get a zero data string
                            const { content, ariaLabel } = getZeroDataContent(group.groupKey);
                            if (content) {
                                const emptyRow: IEmptyRow = {
                                    key: `${group.groupKey} - empty`,
                                    ariaLabel,
                                    content,
                                    isEmptyRow: true
                                };

                                flattenedRows.push(emptyRow);
                            }
                        }
                    }
                } else {
                    // We are not in grouped mode, just flatten everything
                    flattenedRows.push(...group.items);
                }
            });
        }

        return flattenedRows;
    }

    private _getRowKey = (row: IDirectoryRow<T>): string => {
        return row.key;
    }

    private _isGroupRow(row: IGridRow<T, R>): boolean {
        return row.hasOwnProperty("isGroupRow") && (row as IGroupRow).isGroupRow;
    }

    private _isEmptyRow(row: IGridRow<T, R>): boolean {
        return row.hasOwnProperty("isEmptyRow") && (row as IEmptyRow).isEmptyRow;
    }

    private _shouldDisplayActions = (row: IGridRow<T, R>): boolean => {
        const {
            getContextMenuItems
        } = this.props;

        if (!getContextMenuItems) {
            return false;
        }

        if (this._isGroupRow(row)) {
            return false;
        }

        return true;
    }
}

export interface IGroupRowProps extends IDetailsRowProps {
    columnKey: string;
    row: IGroupRow;
    onToggled: (row: IGroupRow) => void;
}

class GroupRow extends React.Component<IGroupRowProps> {
    public render(): JSX.Element {
        const {
            row
        } = this.props;

        return (
            <div
                onClick={this._onClicked}
                onKeyDown={this._onKeyDown}
                aria-label={row.title}
                aria-expanded={row.expanded}
            >
                <DetailsRow
                    {...this.props}
                    onRenderItemColumn={this._renderCell}
                    className="directory-group-row"
                />
            </div>

        );
    }

    private _renderCell = (row: IGroupRow, index: number, column: IColumn): JSX.Element => {
        if (column.key === this.props.columnKey) {
            return (
                <div className={CSS.DIRECTORY_ROWITEM}>
                    <VssIcon className={css("directory-group-chevron", row.expanded && "expanded")} iconName="ChevronRight" iconType={VssIconType.fabric} />
                    {row.iconProps && <VssIcon {...row.iconProps} className="directory-group-icon" />}
                    <div className="directory-group-row-title">
                        <TooltipHost
                            overflowMode={TooltipOverflowMode.Parent}
                            content={row.title}
                            hostClassName="flex-tooltip-host"
                        >
                            <span>
                                {row.title}
                            </span>
                        </TooltipHost>
                    </div>
                </div>
            );
        }
    }

    private _onClicked = (): void => {
        const {
            row,
            onToggled
        } = this.props;

        if (onToggled) {
            onToggled(row);
        }
    }

    private _onKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
        const {
            row,
            onToggled
        } = this.props;

        if (onToggled) {
            if (!row.expanded && event.keyCode === KeyCode.RIGHT ||
                row.expanded && event.keyCode === KeyCode.LEFT
            ) {
                onToggled(row);
                event.preventDefault();
            }
        }
    }
}

export interface IEmptyRowProps extends IDetailsRowProps {
    columnKey: string;
    row: IEmptyRow;
    isGrouped: boolean;
}

class EmptyRow extends React.Component<IEmptyRowProps> {

    public render(): JSX.Element {
        const {
            row
        } = this.props;

        const ariaLabel = row.ariaLabel || (row.content === "string" ? row.content : undefined);
        return (
            <DetailsRow
                {...this.props}
                className="directory-group-row"
                onRenderItemColumn={this._renderCell}
                aria-label={ariaLabel}
            />
        );
    }

    private _renderCell = (row: IEmptyRow, index: number, column: IColumn): JSX.Element => {
        const {
            columnKey,
            isGrouped
        } = this.props;
        if (column.key === columnKey) {
            return (
                <div className={CSS.DIRECTORY_ROWITEM}>
                    {isGrouped && <div className={CSS.DIRECTORY_GROUP_SPACER} />}
                    <div className="directory-group-row-title">
                        {row.content}
                    </div>
                </div>
            );
        }
    }
}

/**
 * The name cell renders the name portion of a row and handles the favoriting behavior
 */
class NameCell<T, R extends IDirectoryRow<T>> extends React.Component<{
    artifactIconProps?: IVssIconProps;
    row: R;
    onFavoriteToggled: (row: R) => void;
    onClick: (row: R, index: number, ev: Event) => void;
}> {
    public render(): JSX.Element {
        const {
            artifactIconProps,
            row
        } = this.props;

        return (
            <div className="directory-row-name-cell">
                {artifactIconProps && <VssIcon {...artifactIconProps} className="directory-artifact-icon" />}

                <TooltipHost
                    overflowMode={TooltipOverflowMode.Self}
                    content={row.title}
                    hostClassName="directory-row-title flex-tooltip-host"
                >
                    {
                        row.isDeleted ?
                            row.title
                            :
                            <Link
                                className="directory-title"
                                href={row.url}
                                onClick={this._onClicked}
                            >
                                {row.title}
                            </Link>
                    }
                </TooltipHost>
                <div className={css("directory-row-favorite", row.isFavorited && "favorited")}>
                    <FavoriteStar
                        className={"directory-row-favorite-icon"}
                        isFavorite={row.isFavorited}
                        isDeleted={row.isDeleted}
                        onToggle={this._onFavorite}
                    />
                </div>
                <div className="directory-row-error">
                    {row.errorMessage && (
                        <InfoIcon
                            infoText={row.errorMessage}
                            iconProps={{ iconType: VssIconType.fabric, iconName: "Error" }}
                        />
                    )}
                    {row.errorMessage && (
                        <div className="directory-row-error-annoucement screenreader" aria-live="assertive">
                            {row.errorMessage}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    private _onFavorite = (): void => {
        const {
            row,
            onFavoriteToggled
        } = this.props;

        if (onFavoriteToggled) {
            onFavoriteToggled(row);
        }
    }

    private _onClicked = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        const {
            row,
            onClick,
        } = this.props;

        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && onClick) {
            onClick(row, undefined, event.nativeEvent);
        }
    }
}
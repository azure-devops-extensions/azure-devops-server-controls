import * as React from "react";

import { IDirectoryActionsCreator } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActionsCreator";
import { DEFAULT_NAME_COLUMN, DEFAULT_TEAM_COLUMN, DirectoryGrid, IDirectoryRowGroup } from "Agile/Scripts/Common/Directory/Components/DirectoryGrid";
import { FavoriteState, IFavoriteData } from "Agile/Scripts/Common/Directory/DirectoryContracts";
import { DEFAULT_GROUP, FAVORITE_GROUP } from "Agile/Scripts/Common/Directory/Selectors/ContentSelectors";
import { DirectoryPivotType } from "Agile/Scripts/Common/DirectoryPivot";
import { SprintsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { SprintsUrls } from "Agile/Scripts/Common/HubUrlUtilities";
import * as AgileResources from "Agile/Scripts/Resources/TFS.Resources.Agile";
import * as SprintDirectoryResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.Directory";
import { ISprintsDirectoryActionsCreator } from "Agile/Scripts/SprintsHub/Directory/ActionsCreator/SprintsDirectoryActionsCreator";
import { ISprintDirectoryRow, ITeamIteration } from "Agile/Scripts/SprintsHub/Directory/Selectors/SprintsContentSelectors";
import { SprintsDirectoryUsageTelemetryConstants } from "Agile/Scripts/SprintsHub/Directory/SprintsHubDirectoryConstants";
import { ColumnActionsMode, IColumn } from "OfficeFabric/DetailsList";
import { Link } from "OfficeFabric/Link";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";
import { getDefaultWebContext } from "VSS/Context";
import { delay } from "VSS/Utils/Core";
import { getNowInUserTimeZone, localeFormat } from "VSS/Utils/Date";
import { format } from "VSS/Utils/String";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

export interface ISprintsDirectoryGridProps {
    /** Common actions creator */
    directoryActionsCreator: IDirectoryActionsCreator;
    sprintDirectoryActionsCreator: ISprintsDirectoryActionsCreator;
    /** Get the favorite data */
    getFavoriteData: (teamId: string) => IFavoriteData;
    /** Get the favorite state */
    getFavoriteState: (teamId: string) => FavoriteState;
    /** The pivot type hosting this grid  */
    hostPivot: DirectoryPivotType;
    /** Is the grid grouped */
    isGrouped: boolean;
    /** The row groups to display */
    rowGroups: IDirectoryRowGroup<ITeamIteration, ISprintDirectoryRow>[];
    takeFocusOnMount?: boolean;
}

const ITERATION_NAME_COLUMN: IColumn = {
    fieldName: "IterationName",
    key: "IterationName",
    name: SprintDirectoryResources.CurrentIteration_Title,
    minWidth: 200,
    maxWidth: 400,
    columnActionsMode: ColumnActionsMode.disabled
};

const ITERATION_DATE_COLUMN: IColumn = {
    fieldName: "IterationDate",
    key: "IterationDate",
    name: SprintDirectoryResources.SprintDates_Title,
    minWidth: 200,
    maxWidth: 400,
    columnActionsMode: ColumnActionsMode.disabled
};

/**
 * Directory grid which contains Sprint specific columns and behavior
 */
export class SprintsDirectoryGrid extends React.Component<ISprintsDirectoryGridProps> {
    public render(): JSX.Element {
        const {
            isGrouped,
            rowGroups,
            takeFocusOnMount
        } = this.props;

        return (
            <DirectoryGrid
                artifactIconProps={{
                    iconName: "Sprint",
                    iconType: VssIconType.fabric
                }}
                columns={[
                    DEFAULT_NAME_COLUMN,
                    DEFAULT_TEAM_COLUMN,
                    ITERATION_NAME_COLUMN,
                    ITERATION_DATE_COLUMN
                ]}
                className="sprints-directory-grid"
                project={getDefaultWebContext().project}
                isGrouped={isGrouped}
                items={rowGroups}
                getZeroDataContent={this._getZeroDataContent}
                takeFocusOnMount={takeFocusOnMount}
                onFavoriteToggled={this._onFavoriteToggled}
                onGroupToggled={this._onGroupToggled}
                onItemClicked={this._onItemClicked}
                onRenderCell={this._onRenderCell}
            />
        );
    }

    private _onRenderCell = (
        row: ISprintDirectoryRow,
        index: number,
        column: IColumn,
        defaultRenderer: (row: ISprintDirectoryRow, index: number, column: IColumn) => JSX.Element
    ): JSX.Element => {
        if (!row.isDeleted) {
            if (column.key === ITERATION_NAME_COLUMN.key) {
                return (
                    <div>
                        {row.iterationTitle}
                    </div>
                );
            } else if (column.key === ITERATION_DATE_COLUMN.key) {
                return (
                    <div>
                        {this._renderDates(row)}
                    </div>
                );
            }
        }

        return defaultRenderer(row, index, column);
    }

    private _renderDates(row: ISprintDirectoryRow): JSX.Element {
        return (
            <DateCell
                row={row}
                onClickSetDates={this._onEditIteration}
            />
        );
    }

    private _onEditIteration = (row: ISprintDirectoryRow): void => {
        const {
            hostPivot,
            sprintDirectoryActionsCreator
        } = this.props;

        const iteration = row.data.iteration;
        sprintDirectoryActionsCreator.editSprint(iteration.id, hostPivot);
    }

    private _onFavoriteToggled = (row: ISprintDirectoryRow): void => {
        const {
            directoryActionsCreator,
            getFavoriteData,
            getFavoriteState
        } = this.props;

        const team = row.data.team;
        directoryActionsCreator.toggleFavorite(team, getFavoriteState(team.id), getFavoriteData(team.id));
    }

    private _onGroupToggled = (groupKey: string): void => {
        const {
            directoryActionsCreator
        } = this.props;

        directoryActionsCreator.groupToggled(groupKey);
    }

    private _onItemClicked = (row: ISprintDirectoryRow, ev: Event): void => {
        SprintsHubTelemetryHelper.publishTelemetry(SprintsDirectoryUsageTelemetryConstants.SPRINTSDIRECTORY_NAVIGATEACTION, {
            targetTeamId: row.data.team.id,
            url: row.url
        });

        // Do XHR nav when updating team isn't necessary
        if (!getDefaultWebContext().team) {
            delay(this, 0, () => SprintsUrls.navigateToSprintsHubUrl(row.url));

            // Prevent full page refresh
            ev.stopPropagation();
            ev.preventDefault();
        }
    }

    private _getZeroDataContent = (groupKey: string): { content: JSX.Element | string, ariaLabel?: string } => {
        if (groupKey === FAVORITE_GROUP) {
            return {
                content: (
                    <FormatComponent format={AgileResources.DirectoryEmptyFavoritesGroupText}>
                        <VssIcon iconName="favorite" iconType={VssIconType.bowtie} />
                        {SprintDirectoryResources.Sprint.toLowerCase()}
                    </FormatComponent>
                ),
                ariaLabel: format(AgileResources.DirectoryEmptyFavoritesGroupText, "", SprintDirectoryResources.Sprint.toLowerCase())
            };
        } else if (groupKey === DEFAULT_GROUP) {
            return {
                content: format(AgileResources.DirectoryEmptyMyTeamsGroupText, SprintDirectoryResources.Sprint.toLowerCase())
            };
        }
    }
}

class DateCell extends React.Component<{ row: ISprintDirectoryRow, onClickSetDates: (item: ISprintDirectoryRow) => void }> {
    public render(): JSX.Element {
        const {
            row
        } = this.props;
        if (!row.isDeleted) {
            let content: string;
            const datesExist = !(!row.iterationStartDate || !row.iterationFinishDate);
            if (datesExist) {
                // If either date is not in this year, then both dates will be in "Jan 01 2017" Format
                let dateFormat = "MMM dd";
                const today: Date = getNowInUserTimeZone();
                if (row.iterationStartDate.getFullYear() !== today.getFullYear()
                    || row.iterationFinishDate.getFullYear() !== today.getFullYear()) {
                    dateFormat = "MMM dd yyyy";
                }

                const startDateString = localeFormat(row.iterationStartDate, dateFormat, /*ignore time zone*/ true);
                const finishDateString = localeFormat(row.iterationFinishDate, dateFormat, /*ignore time zone*/ true);

                content = `${startDateString} - ${finishDateString}`;
            } else {
                content = SprintDirectoryResources.SprintsGrid_SetSprintDatesButtonLabel;
            }

            return (
                <TooltipHost
                    overflowMode={TooltipOverflowMode.Parent}
                    content={content}
                    hostClassName="flex-tooltip-host"
                >
                    <Link
                        aria-label={`${datesExist ? `${content} ` : ""}${SprintDirectoryResources.SprintsGrid_SetSprintDatesButtonLabel}`}
                        className={css("sprint-dates", !datesExist && "sprint-dates-visible-on-hover")}
                        onClick={this._onClickSetDates}
                    >
                        {content}
                    </Link>
                </TooltipHost>
            );
        }

        return null;
    }

    private _onClickSetDates = (): void => {
        const {
            onClickSetDates,
            row
        } = this.props;

        if (onClickSetDates) {
            onClickSetDates(row);
        }
    }
}
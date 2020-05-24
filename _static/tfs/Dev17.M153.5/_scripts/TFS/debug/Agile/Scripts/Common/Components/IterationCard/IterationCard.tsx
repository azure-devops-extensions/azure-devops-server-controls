import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Components/IterationCard/IterationCard";
import { Card } from "Agile/Scripts/Common/Components/Card/Card";
import { SprintMarker } from "Agile/Scripts/Common/Components/SprintMarker/SprintMarker";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import * as BacklogContentViewResources from "Agile/Scripts/Resources/TFS.Resources.BacklogsHub.BacklogView";
import { IconButton } from "OfficeFabric/Button";
import { ContextualMenu, IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Link } from "OfficeFabric/Link";
import { Spinner } from "OfficeFabric/Spinner";
import { DirectionalHint, TooltipHost } from "VSSUI/Tooltip";
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { DateRange } from "TFS/Work/Contracts";
import { getDefaultWebContext } from "VSS/Context";
import { format } from "VSS/Utils/String";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

export interface IIterationCardProps {
    /** The iteration data for this row */
    iteration: Iteration;
    /** The url for this iteration */
    iterationUrl?: string;
    /** Is this row a current row? */
    isCurrent?: boolean;
    /** The effort estimate value */
    effort?: number;
    /** The days off for the team */
    weekends?: number[];
    teamDaysOffUTC?: DateRange[];
    /** Are the work items loading? */
    iterationDetailsLoading?: boolean;
    /** The # of work items for this iteration, binned by type */
    workItemCountByName?: IDictionaryStringTo<number>;
    /** Error */
    summaryError?: Error;
    /** Any context menu items to display */
    contextMenuItems?: IContextualMenuItem[];
    /** Event for when the iteration title is clicked */
    onIterationClicked?: (event: React.MouseEvent<HTMLElement>, iteration: Iteration) => void;
}

export interface IIterationCardState {
    /** Is the context menu visible */
    contextMenuVisible: boolean;
}

export class IterationCard extends React.Component<IIterationCardProps, IIterationCardState> {
    private _contextMenuButton: HTMLElement;

    constructor(props: IIterationCardProps, context: any) {
        super(props, context);
        this.state = {
            contextMenuVisible: false
        };
    }

    public render(): JSX.Element {
        return (
            <Card className="iteration-card">
                {this._renderHeader()}
                {this._renderWorkItemSummary()}
                {this._renderContextMenuButton()}
                {this._renderContextMenu()}
            </Card>
        );
    }

    private _renderContextMenuButton(): JSX.Element {
        const {
            contextMenuItems
        } = this.props;

        if (contextMenuItems && contextMenuItems.length > 0) {
            return (
                <div ref={this._resolveContextualMenuButton} className="card-contextual-menu-button">
                    <IconButton
                        iconProps={{
                            iconName: "More"
                        }}
                        onClick={this._openContextMenu}
                    />
                </div>
            );
        }
    }

    private _renderContextMenu(): JSX.Element {
        const {
            contextMenuVisible
        } = this.state;

        if (contextMenuVisible) {
            return (
                <ContextualMenu
                    items={this.props.contextMenuItems}
                    target={this._contextMenuButton}
                    onDismiss={this._closeContextMenu}
                />
            );
        }
    }

    private _renderHeader(): JSX.Element {
        const {
            effort,
            isCurrent,
            iteration,
            iterationDetailsLoading,
            teamDaysOffUTC,
            weekends,
            workItemCountByName
        } = this.props;

        let showEffort = false;
        if (!iterationDetailsLoading) {
            for (const workItem in workItemCountByName) {
                if (workItemCountByName[workItem] !== 0) {
                    showEffort = true;
                    break;
                }
            }
        }

        // Truncate the value to only 2 decimal places
        // Can't just use .toFixed(2) directly or you will
        // end up with 100.00 instead of 100 for 100.005
        const displayEffort = parseFloat((effort * 100).toFixed()) / 100;

        return (
            <div className="card-header-section">
                <div className="card-title-section">
                    <div className="card-title">
                        {this._renderIterationTitle()}
                    </div>
                    {isCurrent && <SprintMarker className="card-marker" />}
                    <div className="card-dates">
                        {iteration.startDateUTC && iteration.finishDateUTC && `${iteration.localeDisplayStartDate} - ${iteration.localeDisplayFinishDate}`}
                    </div>
                </div>
                <div className="card-subtitle-section">
                    <div className="card-estimation">
                        {showEffort && format(BacklogContentViewResources.EffortLabel, displayEffort === 0 ? "-" : displayEffort)}
                    </div>
                    <div className="card-working-days">
                        {!iterationDetailsLoading && iteration.startDateUTC && iteration.finishDateUTC && format(BacklogContentViewResources.IterationWorkingDays, iteration.getWorkingDays(weekends, teamDaysOffUTC))}
                    </div>
                </div>

            </div>
        );
    }

    private _renderIterationTitle(): JSX.Element {
        const {
            iterationUrl,
            iteration,
            onIterationClicked
        } = this.props;

        if (onIterationClicked) {
            return (
                <TooltipHost directionalHint={DirectionalHint.topCenter} content={iteration.iterationPath}>
                    <Link
                        href={iterationUrl}
                        onClick={this._onIterationClicked}
                    >
                        {iteration.name}
                    </Link>
                </TooltipHost>
            );
        } else {
            return (
                <div>
                    {iteration.name}
                </div>
            );
        }
    }

    private _renderWorkItemSummary(): JSX.Element {
        const {
            iterationDetailsLoading,
            summaryError,
            workItemCountByName
        } = this.props;

        let content: JSX.Element | JSX.Element[];

        if (summaryError) {
            content = this._renderSummaryError();
        } else if (iterationDetailsLoading) {
            content = <Spinner className="card-summary-loading" />;
        } else {
            const workItemsSummaryList = [];

            for (const workItemType in workItemCountByName) {
                if (workItemCountByName[workItemType]) {
                    workItemsSummaryList.push({
                        workItemTypeName: workItemType,
                        count: workItemCountByName[workItemType]
                    });
                }
            }

            if (workItemsSummaryList.length > 0) {
                content = workItemsSummaryList.map(wi => this._renderWorkItemType(wi.workItemTypeName, wi.count));
            } else {
                content = this._renderEmptySummary();
            }
        }

        return (
            <div className="card-summary">
                {content}
            </div>
        );
    }

    private _renderWorkItemType(workItemType: string, itemCount: number) {
        const workItemTypeIconDetails = WorkItemTypeColorAndIconsProvider.getInstance().getColorAndIcon(getDefaultWebContext().project.name, workItemType);

        return (
            <div key={workItemType} className="work-item-type-summary">
                <TooltipHost content={workItemType}>
                    <VssIcon
                        iconType={VssIconType.bowtie}
                        iconName={workItemTypeIconDetails.icon}
                        styles={{ root: { color: workItemTypeIconDetails.color } }}
                    />
                    <b>{`${itemCount}`}</b>
                </TooltipHost>
            </div>
        );
    }

    private _renderEmptySummary(): JSX.Element {
        return (
            <div className="empty-summary">
                {BacklogContentViewResources.NoWorkScheduledYet}
            </div>
        );
    }

    private _renderSummaryError(): JSX.Element {
        const {
            summaryError
        } = this.props;

        if (summaryError) {
            return (
                <div className="card-summary-error">
                    <VssIcon iconType={VssIconType.fabric} iconName="StatusErrorFull" />
                    {summaryError.message}
                </div>
            );
        }
    }

    private _openContextMenu = (): void => {
        this.setState({ contextMenuVisible: true });
    }

    private _closeContextMenu = (): void => {
        this.setState({ contextMenuVisible: false });
    }

    private _onIterationClicked = (event: React.MouseEvent<HTMLElement>): void => {
        const {
            iteration,
            onIterationClicked
        } = this.props;

        if (onIterationClicked && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            onIterationClicked(event, iteration);
        }
    }

    private _resolveContextualMenuButton = (button: HTMLElement) => {
        this._contextMenuButton = button;
    }
}
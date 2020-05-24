import * as React from "react";

import { ActiveDefinitionsStore } from "./Stores/ActiveDefinitions";
import { BuildStatusDisplayDetails, getBuildStatusDisplayDetails } from "./BuildDisplayDetails";
import {
    IBuildListProps,
    IBuildListState
} from "./BuildList.types";

import {
    Build,
    BuildDefinition,
    BuildResult,
    BuildReason,
    BuildStatus
} from "TFS/Build/Contracts";
import { BuildLinks } from "Build.Common/Scripts/Linking";
import * as Resources from "Build/Scripts/Resources/TFS.Resources.Build";
import * as BuildMenuItems from "Build/Scenarios/CI/BuildMenuItems";
import {
    BuildsActionCreator,
    BuildsActionHub
} from "Build/Scripts/CI/Actions/Builds";

import { ago, friendly, localeFormat, stripTimeFromDate } from "VSS/Utils/Date";
import { format } from "VSS/Utils/String";
import { VssDetailsList, VssDetailsListRowStyle, VssDetailsListTitleCell } from "VSSUI/VssDetailsList";
import { VssIcon, VssIconType, IVssIconProps } from "VSSUI/VssIcon";
import { VssPersona, IIdentityDetailsProvider } from "VSSUI/VssPersona";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import { PopupContextualMenu, IPopupContextualMenuProps } from "Presentation/Scripts/TFS/Components/PopupContextualMenu";

import { DetailsListLayoutMode, Selection, IColumn, ConstrainMode, IGroup } from "OfficeFabric/DetailsList";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { Link } from "OfficeFabric/Link";
import { SelectionMode } from "OfficeFabric/Selection";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { IContextualMenuItem, ContextualMenuItemType } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { getDateTimeFormat } from "VSS/Utils/Culture";

export class BuildList extends React.Component<IBuildListProps, IBuildListState>{
    private _columns: IColumn[];

    constructor(props: IBuildListProps) {
        super(props);
        this.state = {
            builds: null
        };
    }

    public componentDidMount() {
        this.props.store.addChangedListener(this._updateState);
        this._getState();
    }

    public componentWillUnmount() {
        this.props.store.removeChangedListener(this._updateState);
    }

    public componentWillReceiveProps(nextProps: IBuildListProps) {
        let state: IBuildListState = {
            builds: this.props.store.getBuilds(nextProps.definition.id)
        } as IBuildListState;

        this.setState(state);
    }

    public render() {
        if (!this._columns) {
            this._buildColumns();
        }

        let buildList = null;

        if (this.state.builds) {
            if (this.state.builds.length > 0) {
                let groups = this._getGroups();
                buildList = <VssDetailsList
                    className="ci-detail-list"
                    items={this.state.builds}
                    groups={groups}
                    groupProps={{
                        onRenderHeader: this._renderGroupHeader,
                        onRenderFooter: this._renderGroupFooter
                    }}
                    hideGroupExpansion={true}
                    columns={this._columns}
                    rowStyle={VssDetailsListRowStyle.twoLine}
                    constrainMode={ConstrainMode.horizontalConstrained}
                    layoutMode={DetailsListLayoutMode.justified}
                    selectionMode={SelectionMode.none}
                />;
            }
            else {
                buildList = <div className="empty-build-list ci-no-color">{Resources.BuildStatusTextNoBuilds}</div>;
            }
        }

        return <FocusZone direction={FocusZoneDirection.vertical}>
            {buildList}
        </FocusZone>;
    }

    private _renderGroupHeader(props): JSX.Element {
        return null;
    }

    private _renderGroupFooter(props): JSX.Element {
        return <div className="group-divider"></div>;
    }

    //group builds by the day they were queued
    private _getGroups = (): IGroup[] => {
        let groups: IGroup[] = [];
        let groupNumber: number = 0;
        let startIndex: number = 0;
        const builds: Build[] = this.state.builds || [];
        //get year, month, and day of build
        let currentGroupDate = stripTimeFromDate(builds[0].queueTime || new Date());
        for (let i = 0; i < builds.length; i++) {
            //get year, month, and day of next build
            const nextQueueDate = stripTimeFromDate(builds[i].queueTime || new Date());
            //if the date is different than that of the current group, push group and start a new one
            if (currentGroupDate.getTime() - nextQueueDate.getTime() != 0) {
                groups.push({
                    key: groupNumber.toString(),
                    name: groupNumber.toString(),
                    startIndex: startIndex,
                    count: i - startIndex
                });
                //set up values for new group
                groupNumber++;
                startIndex = i;
                currentGroupDate = nextQueueDate;
            }
        }
        //add last group
        groups.push({
            key: groupNumber.toString(),
            name: groupNumber.toString(),
            startIndex: startIndex,
            count: builds.length - startIndex
        });

        return groups;
    }

    private _buildColumns() {
        this._columns = [
            {
                key: "statusIcon",
                minWidth: 40,
                maxWidth: 40,
                onRender: getStatusIcon
            } as IColumn,
            {
                key: 'title',
                name: Resources.VersionReasonRequestorHeader,
                className: 'cicd-activity-list-main-column',
                minWidth: 250,
                maxWidth: 400,
                onRender: (item: Build) => {
                    return <VssDetailsListTitleCell
                        onRenderPrimaryText={() => {
                            return this.getTitlePrimaryText(item);
                        }}
                        onRenderSecondaryText={() => {
                            return getTitleSecondaryText(item);
                        }}
                    />;
                }
            } as IColumn,
            {
                key: 'menu',
                className: 'cicd-activity-list-menu-column',
                minWidth: 40,
                maxWidth: 40,
                onRender: (item: Build) => {
                    return <VssDetailsListTitleCell
                        onRenderPrimaryText={() => getMenu(item, this.props.buildsActionCreator)}
                        onRenderSecondaryText={() => <span />}
                    />
                }
            } as IColumn,
            {
                key: "retained",
                headerClassName: "icon-header",
                iconClassName: " bowtie-icon bowtie-security-lock",
                minWidth: 20,
                maxWidth: 20,
                onRender: getRetainedContent
            } as IColumn,
            {
                key: "buildnumber",
                name: Resources.BuildNumberHeader,
                minWidth: 120,
                maxWidth: 200,
                onRender: (item: Build) => {
                    return <span className="small-text">{item.buildNumber}</span>
                }
            } as IColumn,
            {
                key: 'source',
                name: Resources.QueueBuildBranchTitle,
                minWidth: 150,
                maxWidth: 200,
                onRender: (item: Build) => {
                    return (<div className="active-definition-flex-shrink small-text">
                        <VssIcon iconType={VssIconType.bowtie} iconName="bowtie-tfvc-branch" />
                        <span key="branchName">{item.sourceBranch}</span>
                    </div>)
                }
            } as IColumn,
            {
                key: 'queuedTime',
                name: Resources.QueuedBuildQueuedColumn,
                minWidth: 110,
                maxWidth: 130,
                onRender: (item: Build) => {
                    return getDateTimeElement(item.queueTime);
                }
            } as IColumn,
            {
                key: 'duration',
                name: Resources.DurationHeader,
                headerClassName: 'activity-list-duration-header',
                className: 'activity-list-duration',
                minWidth: 100,
                maxWidth: 100,
                onRender: (item: Build) => {
                    if (item.finishTime && item.startTime) {
                        return <span className="duration-content"><span className="small-text">{getDurationText(Math.abs(item.finishTime.getTime() - item.startTime.getTime()))}</span></span>
                    } else {
                        return <span></span>
                    }
                }
            } as IColumn,
            {
                key: 'queueName',
                name: Resources.QueuedBuildQueueColumn,
                isCollapsable: true,
                minWidth: 100,
                maxWidth: 200,
                onRender: (item: Build) => {
                    return <span className="small-text">{item.queue.name}</span>
                }
            } as IColumn,
            {
                key: 'startTime',
                name: Resources.StartedHeader,
                minWidth: 110,
                maxWidth: 130,
                isCollapsable: true,
                onRender: (item: Build) => {
                    return getDateTimeElement(item.startTime);
                }
            } as IColumn,
            {
                key: 'FinishTime',
                name: Resources.CompletedHeader,
                isCollapsable: true,
                minWidth: 110,
                maxWidth: 130,
                onRender: (item: Build) => {
                    return getDateTimeElement(item.finishTime);
                }
            } as IColumn,
            {
                key: 'repository',
                name: Resources.RepositoryHeader,
                isCollapsable: true,
                minWidth: 100,
                onRender: (item: Build) => {
                    return <span className="small-text">{item.repository.name}</span>
                }
            } as IColumn
        ];
    }

    private _getState() {
        return {
            builds: this.props.store.getBuilds(this.props.definition.id)
        } as IBuildListState;
    }

    private _updateState = () => {
        let state: IBuildListState = this._getState();
        this.setState(state);
    }

    private getTitlePrimaryText(item: Build): JSX.Element {
        const buildUrl = BuildLinks.getBuildDetailLink(item.id)

        //temporary- will be commit message
        return <Link className="active-definition-flex-container" href={buildUrl} title={Resources.BuildDetailMenuItemText}>
            <span>{item.buildNumber}</span>
        </Link>;
    }
}

function getMenu(item: Build, actionCreator: BuildsActionCreator): JSX.Element {
    let menuItems: IContextualMenuItem[] = [
        BuildMenuItems.getViewBuildMenuItem(item),
        {
            key: "share-build",
            name: "Share",
            disabled: true,
            iconProps: {
                iconName: "Share"
            },
            onClick: () => {
                // TODO
            }
        },
        {
            key: "divider1",
            itemType: ContextualMenuItemType.Divider
        },
        BuildMenuItems.getRetainBuildMenuItem(item, actionCreator),
        {
            key: "create-release",
            name: "Create new release",
            disabled: true,
            iconProps: {
                iconName: "Rocket"
            },
            onClick: () => {
                // TODO
            }
        },
        {
            key: "divider2",
            itemType: ContextualMenuItemType.Divider
        },
        BuildMenuItems.getDeleteBuildMenuItem(item, actionCreator)
    ];
    return <PopupContextualMenu className="popup-menu" iconClassName="bowtie-ellipsis" items={menuItems} />
}

function getDurationStats(milliseconds: number) {
    milliseconds = Math.abs(milliseconds);
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    return {
        days: days,
        hours: hours % 24,
        minutes: minutes % 60,
        seconds: seconds % 60,
        milliseconds: milliseconds % 1000
    };
}

function padZeroes(number: number, times: number = 2) {
    let result = number + "";
    while (result.length < times) {
        result = "0" + result;
    }

    return result;
}

function getDurationText(milliseconds: number) {
    const durationStats = getDurationStats(milliseconds);
    let text = "";
    if (durationStats.days > 0) {
        text = format("{0}d {1}:{2}:{3}.{4}",
            durationStats.days,
            padZeroes(durationStats.hours),
            padZeroes(durationStats.minutes),
            padZeroes(durationStats.seconds),
            padZeroes(durationStats.milliseconds, 3));
    }
    else if (durationStats.hours > 0) {
        text = format("{0}:{1}:{2}.{3}",
            durationStats.hours,
            padZeroes(durationStats.minutes),
            padZeroes(durationStats.seconds),
            padZeroes(durationStats.milliseconds, 3));
    }
    else {
        text = format("{0}:{1}.{2}",
            durationStats.minutes,
            padZeroes(durationStats.seconds),
            padZeroes(durationStats.milliseconds, 3));
    }

    return text;
}

function getTitleSecondaryText(item: Build): JSX.Element {
    const description = getActivityDescription(item);
    let secondaryText = <div className="active-definition-flex-container">
        <div className="active-definition-flex-shrink">
            {description}
        </div>
    </div>

    return secondaryText;
}

function getRetainedContent(item: Build): JSX.Element {
    if (item.keepForever || item.retainedByRelease) {
        return (<div className="active-definition-flex-static">
            <VssIcon className="lock-icon" aria-label={item.retainedByRelease ? Resources.RetainedByReleaseText : Resources.RetainedIndefinitelyText} iconType={VssIconType.bowtie} iconName="bowtie-security-lock" />
        </div>);
    }
    else {
        return null;
    }
}

function getStatusDetailPrimaryText(item: Build): JSX.Element {
    const status = getBuildStatusDisplayDetails(item);
    return <FormatComponent format="{0}" className={status.className}>
        <span key="statusText">{status.text}</span>
    </FormatComponent>
}

function getStatusIconProps(item: Build): IVssIconProps {
    const status = getBuildStatusDisplayDetails(item);
    return {
        iconType: status.iconType,
        className: status.className,
        iconName: status.iconName
    }
}

function getStatusDetailSecondaryText(item: Build): JSX.Element {
    return <span>{friendly(item.queueTime)}</span>
}

function getStatusIcon(item: Build): JSX.Element {
    const status = getBuildStatusDisplayDetails(item);

    // special case for in-progress to show a spinner.
    if (item.status === BuildStatus.InProgress) {
        return <span className={status.className}>
            <Spinner key="statusIcon" size={SpinnerSize.small} />
        </span>
    }
    else {
        return <span className={status.className}>
            <VssIcon key="statusIcon" iconType={status.iconType} iconName={status.iconName} />
        </span>
    }
}

function getActivityDescription(item: Build): string {
    if (!item) {
        return "";
    }

    switch (item.reason) {
        case BuildReason.BatchedCI:
            return format(Resources.BatchedCIBuildReasonDescription, item.requestedFor.displayName);
        case BuildReason.IndividualCI:
            return format(Resources.CIBuildReasonDescription, item.requestedFor.displayName);
        case BuildReason.PullRequest:
            return format(Resources.PRBuildReasonDescription, item.requestedFor.displayName);
        case BuildReason.Schedule:
            return Resources.ScheduledBuildReasonDescription;
        case BuildReason.CheckInShelveset:
            return format(Resources.ShelvesetCheckinBuildReasonDescription, item.requestedFor.displayName);
        case BuildReason.ValidateShelveset:
            return format(Resources.ShelvesetValidationBuildReasonDescription, item.requestedFor.displayName);
        case BuildReason.BuildCompletion:
            return format(Resources.BuildCompletionBuildReasonDescription, item.triggeredByBuild.buildNumber);
        case BuildReason.Manual:
        default:
            return format(Resources.ManualBuildReasonDescription, item.requestedFor.displayName);
    }
}

function getDateTimeElement(date: Date): JSX.Element {
    const formattedDate = localeFormat(date, "yyyy-MM-dd");
    const formattedTime = localeFormat(date, "HH:mm");
    return (<div className="small-text"><span>{formattedDate}</span><span className="build-summary-divider">&#183;</span><span>{formattedTime}</span></div>);
}

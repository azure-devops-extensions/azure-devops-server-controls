/// <reference types="react" />

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Shared/Components/HubGroup";
import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/MyWork/Components/WorkItemGrid";
import VSSError = require("VSS/Error");
import Utils_Date = require("VSS/Utils/Date");
import * as Utils_String from "VSS/Utils/String";
import * as Telemetry from "VSS/Telemetry/Services";

import * as React from "react";
import { Link } from "OfficeFabric/Link";
import * as DetailsListComponent from "OfficeFabric/DetailsList";
import * as DetailsRowComponent from "OfficeFabric/components/DetailsList/DetailsRow";
import * as Tooltip from "VSSUI/Tooltip";

import { IWorkItemDetails, IFollowedState, WorkItemRecentActivityType, WorkItemFormatType } from "MyExperiences/Scenarios/MyWork/Contracts";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { MyExperiencesTelemetry } from "MyExperiences/Scripts/Telemetry";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants";
import { ActionsCreator } from "MyExperiences/Scenarios/MyWork/Actions/ActionsCreator";
import { WorkItemStateCellRenderer } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateCellRenderer";

import { HubRow } from "MyExperiences/Scenarios/Shared/Components/HubRow";
import { WorkItemTypeIcon } from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";

export interface IWorkItemGridProps {
    /**
     * Actions Creator
     */
    actionsCreator: ActionsCreator;

    /**
     * Work Items to render rows for in this grid
     */
    workItems: IWorkItemDetails[];

    /**
     * Boolean indicating whether the Follows/Unfollows is Enabled
     */
    isFollowsEnabled?: boolean;

    /**
     * Indicate whether the current device is mobile
     */
    isMobile: boolean;
}

const WorkItemIdColumnKey = "ID";
const TooltipContainerClass = "tooltip-container";

export const WorkItemGrid: React.StatelessComponent<IWorkItemGridProps> =
    (props: IWorkItemGridProps): JSX.Element => {
        if (!props.workItems || props.workItems.length < 1) {
            return null;
        }

        const publishCI = (action: string, item: IWorkItemDetails, index?: number, immediate: boolean = false) => {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.AREAS.MyExperiences,
                action,
                {
                    // null >= 0 is true, but undefined >= 0 is false
                    [CustomerIntelligenceConstants.PROPERTIES.INDEX]: index !== null && index >= 0 ? index : -1
                }),
                immediate
            );
        };

        const publishNavigationCI = (action: string, item: IWorkItemDetails, index?: number) => {
            // This action will navigate to another page, so we want to send the CI immediately
            publishCI(action, item, index, true);
            MyExperiencesTelemetry.LogNavigation();
        };

        const getLastUpdatedDate = (item: IWorkItemDetails): Date => {
            if (item.format === WorkItemFormatType.RecentActivity) {
                return item.activityDate;
            }
            if (item.format === WorkItemFormatType.Mentioned) {
                return item.lastMentionedDate;
            }

            return item.lastUpdatedDate;
        };

        const getFriendlyDateFormat = (item: IWorkItemDetails): string => {
            if (item.format === WorkItemFormatType.RecentActivity) {
                return item.activityType === WorkItemRecentActivityType.Visited ? PresentationResources.YouViewedDateFormat : PresentationResources.YouUpdatedDateFormat;
            }
            if (item.format === WorkItemFormatType.Mentioned) {
                return PresentationResources.LastMentionedDateFormat;
            }

            return PresentationResources.LastUpdatedDateFormat;
        };

        const getLastUpdatedDateCell = (lastUpdatedDate: Date, friendlyDate: string, dateFormat: string): JSX.Element => {
            const friendlyDateString = friendlyDate ? Utils_String.format(dateFormat, friendlyDate) : "";
            return <Tooltip.TooltipHost hostClassName={TooltipContainerClass} content={Utils_Date.localeFormat(lastUpdatedDate, "F")}>
                {friendlyDateString}
            </Tooltip.TooltipHost>;
        };

        const columns: DetailsListComponent.IColumn[] = [
            {
                fieldName: null,
                key: WorkItemIdColumnKey,
                minWidth: 250,
                maxWidth: Infinity,
                name: "id",
                isMultiline: props.isMobile,
                onRender: (item?: IWorkItemDetails, index?: number, column?: DetailsListComponent.IColumn) => {
                    const onRowClick = (item: IWorkItemDetails, index?: number) => {
                        publishNavigationCI(CustomerIntelligenceConstants.FEATURES.MYWORK_TITLE_ACTION, item, index);
                        window.location.href = item.url;
                    };

                    if (item) {
                        if (props.isMobile) {
                            return (
                                <div className="work-item-icon-title-cell">
                                    <div className="work-item-icon-cell">
                                        <WorkItemTypeIcon workItemTypeName={item.workItemType} projectName={item.teamProject.name} />
                                    </div>
                                    <div className="work-item-title-cell" onClick={() => onRowClick(item, index)}>
                                        <span className="work-item-id">{item.id}</span>
                                        <span>{item.title}</span>
                                    </div>
                                </div>
                            );
                        } else {
                            return (
                                <div className="work-item-icon-title-cell">
                                    <div className="work-item-icon-cell">
                                        <WorkItemTypeIcon workItemTypeName={item.workItemType} projectName={item.teamProject.name} />
                                    </div>
                                    <div className="work-item-title-cell">
                                        <span className="work-item-id">{item.id}</span>
                                        <Tooltip.TooltipHost content={item.title} overflowMode={Tooltip.TooltipOverflowMode.Parent}>
                                            <Link href={item.url} onClick={() => publishNavigationCI(CustomerIntelligenceConstants.FEATURES.MYWORK_TITLE_ACTION, item, index)}>
                                                <span>{item.title}</span>
                                            </Link>
                                        </Tooltip.TooltipHost>
                                    </div>
                                </div>
                            );
                        }
                    } else {
                        VSSError.publishErrorToTelemetry({
                            name: "MyWork.WorkItemGrid.NullWorkItemException",
                            message: "WorkItem was null inside Column.onRender in MyWork.WorkItemGrid"
                        });
                    }
                }
            }];

        if (!props.isMobile) {
            // Add the identity column if there is identity
            if (props.workItems && props.workItems.some(wi => (wi && wi.identity !== null))) {
                columns.push({
                    fieldName: null,
                    key: "identity",
                    minWidth: 150,
                    maxWidth: 150,
                    name: "identity",
                    isCollapsable: true,
                    onRender: (item?: IWorkItemDetails, index?: number, column?: DetailsListComponent.IColumn) => {
                        if (item && item.identity) {
                            // note: avatar image is decorative and alt should be set, so set it to empty
                            return (
                                <Tooltip.TooltipHost hostClassName={TooltipContainerClass} content={item.identity.uniquefiedName}>
                                    <div className="identity-cell">
                                        <img src={item.identity.imageUrl} alt="" />
                                        <span className="identity-displayname"> {item.identity.displayName} </span>
                                    </div>
                                </Tooltip.TooltipHost>
                            );
                        }
                    }
                });
            }

            columns.push({
                fieldName: null,
                key: "state",
                minWidth: 90,
                maxWidth: 90,
                name: "state",
                isCollapsable: true,
                onRender: (item?: IWorkItemDetails, index?: number, column?: DetailsListComponent.IColumn) => {
                    if (item) {
                        const colorObj = WorkItemStateCellRenderer.getProcessedStateColor(item.stateColor);
                        return (
                            <Tooltip.TooltipHost content={item.state} overflowMode={Tooltip.TooltipOverflowMode.Parent}>
                                <span className="workitem-state-circle" style={{ backgroundColor: colorObj.backgroundColor, borderColor: colorObj.borderColor }}></span>
                                <span>{item.state}</span>
                            </Tooltip.TooltipHost>
                        );
                    }
                }
            });

            columns.push({
                fieldName: null,
                key: "project",
                minWidth: 100,
                maxWidth: 100,
                name: "project",
                isCollapsable: true,
                onRender: (item?: IWorkItemDetails, index?: number, column?: DetailsListComponent.IColumn) => {
                    if (item) {
                        return (
                            <Tooltip.TooltipHost content={item.teamProject.name} overflowMode={Tooltip.TooltipOverflowMode.Self}>
                                <Link
                                    href={item.teamProject.url}
                                    onClick={() => publishNavigationCI(CustomerIntelligenceConstants.FEATURES.MYWORK_PROJECT_ACTION, item, index)}>
                                    {item.teamProject.name}
                                </Link>
                            </Tooltip.TooltipHost>
                        );
                    }
                }
            });

            columns.push({
                fieldName: null,
                key: "lastUpdated",
                minWidth: 195,
                maxWidth: 195,
                name: "last updated",
                isCollapsable: true,
                onRender: (item?: IWorkItemDetails, index?: number, column?: DetailsListComponent.IColumn) => {
                    if (item) {
                        return getLastUpdatedDateCell(getLastUpdatedDate(item), item.friendlyDateString, getFriendlyDateFormat(item));
                    }
                }
            });
        }

        if (props.isFollowsEnabled && !props.isMobile) {
            columns.push({
                fieldName: null,
                key: "follow",
                minWidth: 25,
                maxWidth: 25,
                name: "follow",
                onRender: (item?: IWorkItemDetails, index?: number, column?: DetailsListComponent.IColumn) => {
                    if (item) {
                        let title: string;
                        let className: string;
                        let onClick: () => void;

                        const shouldDisableClick = item.followed === IFollowedState.Following || item.followed === IFollowedState.Unfollowing;
                        const buttonClass = `action ${shouldDisableClick ? "waiting" : Utils_String.empty}`;

                        if (item.followed === IFollowedState.Followed ||
                            item.followed === IFollowedState.Following) {
                            title = MyExperiencesResources.MyWork_Action_Unfollow;
                            className = "bowtie-icon bowtie-watch-eye-fill";
                            onClick = () => {
                                if (!shouldDisableClick) {
                                    publishCI(CustomerIntelligenceConstants.FEATURES.MYWORK_UNFOLLOW_ACTION, item, index);
                                    props.actionsCreator.unfollowWorkItem(item.id);
                                }
                            };
                        } else if (item.followed === IFollowedState.Unfollowed ||
                            item.followed === IFollowedState.Unfollowing) {
                            title = MyExperiencesResources.MyWork_Action_Follow;
                            className = "bowtie-icon bowtie-watch-eye";
                            onClick = () => {
                                if (!shouldDisableClick) {
                                    publishCI(CustomerIntelligenceConstants.FEATURES.MYWORK_FOLLOW_ACTION, item, index);
                                    props.actionsCreator.followWorkItem(item.id);
                                }
                            };
                        }

                        return (
                            <Tooltip.TooltipHost hostClassName={TooltipContainerClass} content={title}>
                                <Link
                                    onClick={onClick}
                                    className={buttonClass}
                                    aria-busy={shouldDisableClick}
                                    aria-label={title}>
                                    <div className={className}></div>
                                </Link>
                            </Tooltip.TooltipHost>
                        );
                    }
                }
            });
        }

        const detailsListProps: DetailsListComponent.IDetailsListProps = {
            items: props.workItems,
            columns: columns,
            isHeaderVisible: false,
            onRenderRow: (detailsRowProps: DetailsRowComponent.IDetailsRowProps) => {
                return <HubRow rowProps={detailsRowProps} />;
            },
            selectionMode: DetailsListComponent.SelectionMode.none,
            constrainMode: DetailsListComponent.ConstrainMode.unconstrained,
            layoutMode: DetailsListComponent.DetailsListLayoutMode.justified,
        };

        return (
            <div className="work-item-grid">
                <DetailsListComponent.DetailsList {...detailsListProps} />
            </div>
        );
    };

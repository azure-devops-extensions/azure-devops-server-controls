import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { Link } from "OfficeFabric/Link";
import { css } from "OfficeFabric/Utilities";

import * as TimelineTypes from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/Timeline.types";
import { DateTimeUtils } from "PipelineWorkflow/Scripts/Shared/Utils/DateTimeUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { curry } from "VSS/Utils/Core";
import { empty, localeFormat as localeStringFormat } from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import { TooltipHost } from "VSSUI/Tooltip";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { VssPersona } from "VSSUI/VssPersona";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Timeline/EnvironmentTimelineSnapshot";

export class EnvironmentTimelineSnapshot extends Base.Component<TimelineTypes.IEnvironmentTimelineSnapshotProps, TimelineTypes.IEnvironmentTimelineSnapshotState> {

    public render(): JSX.Element {
        let headerElement: JSX.Element = null;

        if (this.props.headerData) {
            if (this.props.headerData.headerElement) {
                headerElement = this.props.headerData.headerElement;
            }
            else if (this.props.headerData.onClick) {
                const additionalAttributes: { [key: string]: any } = {};
                if (this.props.headerData.role) {
                    additionalAttributes["role"] = this.props.headerData.role;
                }

                headerElement = (
                    <TooltipHost content={this.props.headerData.tooltip} hostClassName="cd-deployment-status-tooltip-container" directionalHint={DirectionalHint.topCenter}>
                        <Link
                            onClick={this.props.headerData.onClick}
                            onKeyDown={curry(this._handleKeyDownOnHeaderLink, this.props.headerData.onClick)}
                            className={css("snapshot-header", "header-link")}
                            {...additionalAttributes}>
                            {this.props.headerData.name}
                        </Link>
                    </TooltipHost>
                );
            }
            else {
                headerElement = (
                    <span className="snapshot-header">{this.props.headerData.name}</span>
                );
            }
        }

        let descriptionElements: JSX.Element[] = [];

        if (this.props.descriptionData) {
            let descriptionDataList: TimelineTypes.ISnapshotDescriptionData[] =
                (this.props.descriptionData instanceof Array)
                    ? this.props.descriptionData as Array<TimelineTypes.ISnapshotDescriptionData>
                    : [this.props.descriptionData as TimelineTypes.ISnapshotDescriptionData];

            descriptionDataList.forEach((descriptionData: TimelineTypes.ISnapshotDescriptionData, index: number) => {
                let descriptionElement: JSX.Element = null;

                if (descriptionData.descriptionElement) {
                    descriptionElement = descriptionData.descriptionElement;
                }
                else if (descriptionData.text) {
                    descriptionElement = (<span>{descriptionData.text}</span>);
                }
                else {
                    const timeStampString = (descriptionData.timeStamp instanceof Date)
                        ? DateTimeUtils.getLocaleTimestamp(descriptionData.timeStamp as Date)
                        : descriptionData.timeStamp;

                    if (timeStampString) {
                        descriptionElement = this._getTimelineNodeDescriptionFromDateAndUser(
                            timeStampString,
                            descriptionData.users,
                            descriptionData.timeStampDescriptionPrefix,
                            descriptionData.timeStampDescriptionSuffix,
                            descriptionData.format
                        );
                        if (!descriptionElement) {
                            descriptionElement = this._getTimelineNodeDescriptionFromTimeStamp(
                                timeStampString,
                                descriptionData.timeStampDescriptionPrefix,
                                descriptionData.timeStampDescriptionSuffix,
                                descriptionData.format
                            );
                        }
                    }
                }

                let descriptionIconElement: JSX.Element = null;
                if (descriptionData.icon) {
                    descriptionIconElement = (
                        <VssIcon
                            className={css("description-icon", descriptionData.icon.class)}
                            iconName={descriptionData.icon.iconName}
                            iconType={descriptionData.icon.type}
                        />
                    );
                }

                let descriptionDurationElement: JSX.Element = null;
                if (descriptionData.duration) {
                    descriptionDurationElement = (
                        <div className="description-duration">
                            <VssIcon iconName="Stopwatch" iconType={VssIconType.fabric} className="description-icon text-highlight" />
                            <FormatComponent format={Resources.TimelineDescriptionRanForFormat} elementType="div">
                                <span className="text-highlight">{descriptionData.duration}</span>
                            </FormatComponent>
                        </div>
                    );
                }

                descriptionElement = (
                    <div className="snapshot-description" key={index}>
                        {descriptionIconElement}
                        {descriptionElement}
                        {descriptionDurationElement &&
                            <div className="duration-container">
                                {(descriptionIconElement || descriptionElement) && <span className="description-separator">&middot;</span>}
                                {descriptionDurationElement}
                            </div>}
                    </div>
                );

                descriptionElements.push(descriptionElement);
            });
        }

        return (
            <div className={css("environment-timeline-snapshot", { "is-header-button": !!this.props.headerData.onClick })}>
                <div role="heading" aria-level={3}>
                    {headerElement}
                </div>
                {descriptionElements}
                {this.props.children &&
                    <div className="snapshot-content">
                        {this.props.children}
                    </div>
                }
            </div>
        );
    }

    private _handleKeyDownOnHeaderLink = (onClick: () => void, e: React.KeyboardEvent<HTMLElement>) => {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            onClick();
            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _getTimelineNodeDescriptionFromTimeStamp(timeStamp: String, timeStampDescriptionPrefix?: string, timeStampDescriptionSuffix?: string, format?: string): JSX.Element {
        if (!format) {
            format = empty;
            if (timeStampDescriptionPrefix) {
                format = Resources.TimelineDescriptionOnFormat;
            }
            else {
                format = Resources.OnPrepositionForTimestamp;
            }

            if (timeStampDescriptionSuffix) {
                format = localeStringFormat(Resources.TimelineDescriptionWithSuffixFormat, format, timeStampDescriptionSuffix);
            }
        }
        return (
            <FormatComponent format={format} elementType="div" className="date-user-description">
                {timeStampDescriptionPrefix && <span>{timeStampDescriptionPrefix}</span>}
                <span className="text-highlight">{timeStamp}</span>
            </FormatComponent>
        );
    }

    private _getTimelineNodeDescriptionFromDateAndUser(timeStamp: string, users: TimelineTypes.IDescriptionUser[], timeStampDescriptionPrefix?: string, timeStampDescriptionSuffix?: string, format?: string): JSX.Element {
        if (!(users && users.length > 0)) {
            return null;
        }

        if (!format) {
            format = users.length > 1 ? Resources.TimelineDescriptionByMultipleOnFormat : Resources.TimelineDescriptionByOnFormat;
            if (timeStampDescriptionSuffix) {
                format = localeStringFormat(Resources.TimelineDescriptionWithSuffixFormat, format, timeStampDescriptionSuffix);
            }
        }

        return (
            <FormatComponent format={format} elementType="div" className="date-user-description">
                {timeStampDescriptionPrefix && <span>{timeStampDescriptionPrefix}</span>}
                {
                    (!this.state.imageError && users[0].imageUrl)
                        ? (<VssPersona
                            size={"extra-extra-small"}
                            onImageError={this._onImageError}
                            cssClass={"canceled-by-persona"}
                            suppressPersonaCard={true}
                            imgAltText={empty}
                            identityDetailsProvider={{
                                getIdentityImageUrl: (size: number): string => {
                                    return users[0].imageUrl;
                                },
                                getDisplayName: (): string => {
                                    return empty;
                                }
                            }}
                        />)
                        : (<span />)
                }
                <span className="text-highlight">{users[0].displayName}</span>
                {
                    (users.length > 1)
                        ? (<span className="text-highlight">{users.length - 1}</span>)
                        : null
                }
                <span className="text-highlight">{timeStamp}</span>
            </FormatComponent>
        );
    }

    private _onImageError = (): void => {
        this.setState({ imageError: true });
    }
}
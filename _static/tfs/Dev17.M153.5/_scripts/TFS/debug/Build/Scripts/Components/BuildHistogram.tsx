/// <reference types="react" />

import React = require("react");

import { QueryResult } from "Build/Scripts/QueryResult";
import { EnvironmentStore, getEnvironmentStore } from "Build/Scripts/Stores/Environment";

import { getSortedBuilds } from "Build.Common/Scripts/BuildReference";
import { BuildResult } from "Build.Common/Scripts/BuildResult";
import { getDurationText } from "Build.Common/Scripts/Duration";

import BuildCommonResources = require("Build.Common/Scripts/Resources/TFS.Resources.Build.Common");
import { BuildCustomerIntelligenceInfo } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { BuildReference, BuildStatus } from "TFS/Build/Contracts";

import { Component as Histogram, HistogramBarData } from "VSSPreview/Flux/Components/Histogram";

import { CommonActions, getService as getActionService } from "VSS/Events/Action";
import { Props as BaseProps, State as BaseState } from "VSS/Flux/Component";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");

export interface Props extends BaseProps {
    barCount?: number;
    builds: QueryResult<BuildReference[]>;
    selectedBuildId?: number;
    environmentStore?: EnvironmentStore;
}

export class Component extends React.Component<Props, BaseState> {
    private static DefaultBarCount: number = 10;

    private _environmentStore: EnvironmentStore;

    public constructor(props: Props) {
        super(props);

        this._environmentStore = (props && props.environmentStore) ? props.environmentStore : getEnvironmentStore();
    }

    public shouldComponentUpdate(nextProps: Props, nextState: BaseState): boolean {
        return nextProps.builds && !nextProps.builds.pending;
    }

    public render(): JSX.Element {
        let barCount: number = this.props.barCount || Component.DefaultBarCount;

        let items: HistogramBarData[] = [];
        if (this.props.builds && !this.props.builds.pending) {
            items = this._getItems(this.props.builds.result || []);
        }

        return <Histogram cssClass={"build-histogram definition-histogram"} barCount={barCount} barWidth={6} barHeight={35} barSpacing={2} selectedState={"selected"} hoverState={"hover"} items={items} />;
    }

    private getBuildTooltipText(build: BuildReference): string {
        if (build.status === BuildStatus.Completed && build.finishTime) {
            if (Utils_Date.isMinDate(build.finishTime)) {
                return Utils_String.format(BuildCommonResources.BuildCompletedDuration, build.buildNumber, BuildResult.getDisplayText(build.result), getDurationText(build.startTime, build.startTime));
            }
            else {
                return Utils_String.format(BuildCommonResources.BuildCompletedDuration, build.buildNumber, BuildResult.getDisplayText(build.result), getDurationText(build.startTime, build.finishTime));
            }
        }
        else if (build.status === BuildStatus.InProgress) {
            return Utils_String.format(BuildCommonResources.BuildInProgressDuration, build.buildNumber, getDurationText(build.startTime, this._environmentStore.getTime()));
        }
    }

    private _getItems(builds: BuildReference[]): HistogramBarData[] {
        if (!this.props.builds || !this.props.builds.result) {
            return [];
        }

        let maxDuration = Number.MIN_VALUE;
        let sortedBuilds = getSortedBuilds(this.props.builds.result);
        let items: HistogramBarData[] = sortedBuilds.finishedBuilds.reverse().concat(sortedBuilds.runningBuilds.reverse()) // finish time ascending - older builds to the left
            .map((build: BuildReference) => {
                let duration: any;
                let startTime: any = build.startTime;
                let finishTime: any = build.finishTime;
                let currentTime: any = this._environmentStore.getTime();
                if (startTime && finishTime) {
                    duration = finishTime - startTime;
                }
                else if (startTime) {
                    duration = currentTime - startTime;
                }
                else {
                    duration = 0;
                }
                maxDuration = Math.max(maxDuration, duration);

                return {
                    selected: build.id === this.props.selectedBuildId,
                    value: duration,
                    state: BuildResult.getTextClassName(build.result),
                    action: (item: BuildReference) => {
                        publishEvent(new TelemetryEventData(BuildCustomerIntelligenceInfo.Area, "view-build", { "source": "BuildHistogramComponent" }));

                        getActionService().performAction(CommonActions.ACTION_WINDOW_NAVIGATE, {
                            url: item._links["web"].href
                        });
                    },
                    actionArgs: build,
                    title: this.getBuildTooltipText(build),
                    link: build._links["web"].href
                };
            });

        items.forEach((item) => {
            item.value = ((item.value / maxDuration) * 1000) / 10;
        });

        return items;
    }
}

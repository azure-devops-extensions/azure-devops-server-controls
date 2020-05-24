/// <reference types="react" />

import * as React from "react";

import { AppContext } from "DistributedTaskControls/Common/AppContext";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import { DeploymentCanceledMessageBar } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/DeploymentCanceledMessageBar";
import { EnvironmentTimelineSnapshot } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/EnvironmentTimelineSnapshot";
import * as Types from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/Timeline.types";
import { TimelineUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/TimelineUtils";

import { LWPComponent } from "VSSPreview/Flux/Components/LWP";

import { VssIconType } from "VSSUI/VssIcon";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Timeline/EnvironmentDeploymentAttemptTimeline";

class TimelineSnapshotWrapper extends React.Component<Types.ITimelineSnapshotProps, Base.IStateless>{
    public render() {
        return <div>Note! This is just a holder, this text would never show up!</div>;
    }
}

export class EnvironmentDeploymentAttemptTimeline extends Base.Component<Types.IEnvironmentDeploymentAttemptTimelineProps, Base.IStateless> {

    public render(): JSX.Element {

        const timelineProps = {
            resource: this.props.deploymentAttemptHelper,
            className: "environment-deployment-attempt-timeline",
            regionForSnapshots: "releaseSummaryTimeline"
        } as Types.ITimelineProps;

        return (
            <div>
                {this.props.deploymentAttemptHelper &&
                    <DeploymentCanceledMessageBar
                        instanceId={this.props.instanceId}
                        deploymentAttemptHelper={this.props.deploymentAttemptHelper}
                        deploymentActionsMap={this.props.deploymentActionsMap}
                    />
                }
                <LWPComponent pageContext={AppContext.instance().PageContext}
                    wrappedType="shared-timeline"
                    dependencies={["ms.vss-build-web.shared"]}
                    {...timelineProps}>

                    {this._getTimelineSnapshotElements()}

                </LWPComponent>
            </div>
        );
    }

    private _getTimelineSnapshotElements(): JSX.Element[] {
        let timelineSnapshotDetailsProvidersList: Types.ITimelineSnapshotDetailsProvider[] = TimelineUtils.getTimelineSnapshotDetailsProvidersList(
            this.props.deploymentAttemptHelper,
            this.props.environmentExecutionPolicy,
            this.props.deploymentActionsMap,
            this.props.nowAtNodeProvider,
            this.props.artifactNodeProvider,
            this.props.triggerDefinitionNodeProvider
        );

        return timelineSnapshotDetailsProvidersList.map((timelineSnapshotDetailsProvider: Types.ITimelineSnapshotDetailsProvider) => {
            if (timelineSnapshotDetailsProvider) {
                return this._getTimelineSnapshot(timelineSnapshotDetailsProvider);
            }
        });
    }

    private _getTimelineSnapshot(provider: Types.ITimelineSnapshotDetailsProvider): JSX.Element {
        let details = TimelineUtils.getTimelineSnapshotDetailsFromProvider(provider, this.props.instanceId);

        let iconProps: Types.ITimelineIconProps = details.iconProps ?
            {
                name: details.iconProps.iconName,
                type: details.iconProps.iconType,
                className: details.iconProps.className
            } : null;

        let snapshotContent: JSX.Element = null;

        if (provider.getSnapshotContent) {
            snapshotContent = provider.getSnapshotContent(this.props.instanceId, details.contentProps);
        }

        else {
            snapshotContent = (<EnvironmentTimelineSnapshot {...details.contentProps} />);
        }

        if (!snapshotContent) {
            return null;
        }

        return (
            <TimelineSnapshotWrapper
                key={details.key}
                snapshotKey={details.key}
                iconProps={iconProps}
                onRenderIcon={details.onRenderIcon}
                initializeSnapshot={details.initializeSnapshot}>

                {snapshotContent}

            </TimelineSnapshotWrapper>
        );
    }
}
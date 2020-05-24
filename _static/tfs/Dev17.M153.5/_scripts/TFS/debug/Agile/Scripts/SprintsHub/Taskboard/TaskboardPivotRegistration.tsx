import { component } from "Agile/Scripts/Common/Components/ComponentRegistration";
import { DynamicPivotItem } from "Agile/Scripts/Common/Components/DynamicPivotItem";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { AgileHubContributionIds } from "Agile/Scripts/Generated/HubConstants";
import { AGGREGATEDCAPACITY_DATAPROVIDER_ID, CAPACITYOPTIONS_DATAPROVIDER_ID, TEAMCAPACITY_DATAPROVIDER_ID } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { ISprintViewPivotContext } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { TASKBOARD_DATAPROVIDER_ID } from "Agile/Scripts/SprintsHub/Taskboard/ActionsCreator/TaskboardActionsCreator";
import { IContributedPivotProps } from "VSSPreview/Utilities/PivotContributions";
import * as React from "react";

export interface ITaskboardPivotProps extends IContributedPivotProps<ISprintViewPivotContext, {}> {
}

@component("work.sprintshub.taskboard")
export class TaskboardPivot extends React.Component<ITaskboardPivotProps> {
    public render(): JSX.Element {
        const { pivotContext } = this.props;
        const onRenderLoading = () => <LoadingComponent />;

        return (
            <DynamicPivotItem
                dataProviders={[
                    TASKBOARD_DATAPROVIDER_ID,
                    AGGREGATEDCAPACITY_DATAPROVIDER_ID,
                    CAPACITYOPTIONS_DATAPROVIDER_ID,
                    TEAMCAPACITY_DATAPROVIDER_ID,
                    AgileHubContributionIds.BacklogConfiguration_DataProvider,
                    AgileHubContributionIds.TeamSetting_DataProvider]}
                shouldReloadDataProviders={pivotContext.shouldReloadDataProviders}
                modules={["Agile/Scripts/SprintsHub/Taskboard/Components/SprintViewTaskboardPivot"]}
                componentKey={"sprint-taskboard-pivot"}
                onRenderLoading={onRenderLoading}
                componentProps={pivotContext}
            />
        );
    }
}

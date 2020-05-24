import { component } from "Agile/Scripts/Common/Components/ComponentRegistration";
import { DynamicPivotItem } from "Agile/Scripts/Common/Components/DynamicPivotItem";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { AgileHubContributionIds } from "Agile/Scripts/Generated/HubConstants";
import { BACKLOG_DATAPROVIDER_ID } from "Agile/Scripts/SprintsHub/Backlog/ActionsCreator/BacklogDataProvider";
import { AGGREGATEDCAPACITY_DATAPROVIDER_ID, CAPACITYOPTIONS_DATAPROVIDER_ID, TEAMCAPACITY_DATAPROVIDER_ID } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { ISprintViewPivotContext } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { IContributedPivotProps } from "VSSPreview/Utilities/PivotContributions";
import * as React from "react";

export interface IBacklogPivotProps extends IContributedPivotProps<ISprintViewPivotContext, {}> {
}

@component("work.sprintshub.backlog")
export class BacklogPivot extends React.Component<IBacklogPivotProps> {
    public render(): JSX.Element {
        const { pivotContext } = this.props;
        const onRenderLoading = () => <LoadingComponent />;

        return (
            <DynamicPivotItem
                dataProviders={[
                    BACKLOG_DATAPROVIDER_ID,
                    AGGREGATEDCAPACITY_DATAPROVIDER_ID,
                    CAPACITYOPTIONS_DATAPROVIDER_ID,
                    TEAMCAPACITY_DATAPROVIDER_ID,
                    AgileHubContributionIds.BacklogConfiguration_DataProvider,
                    AgileHubContributionIds.TeamSetting_DataProvider]}
                shouldReloadDataProviders={pivotContext.shouldReloadDataProviders}
                modules={["Agile/Scripts/SprintsHub/Backlog/Components/SprintViewBacklogPivot"]}
                onRenderLoading={onRenderLoading}
                componentProps={pivotContext}
                componentKey={"sprint-backlog-pivot"}
            />
        );
    }
}

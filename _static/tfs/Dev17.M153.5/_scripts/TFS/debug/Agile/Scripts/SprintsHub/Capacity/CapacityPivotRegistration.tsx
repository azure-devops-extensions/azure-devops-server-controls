import { component } from "Agile/Scripts/Common/Components/ComponentRegistration";
import { DynamicPivotItem } from "Agile/Scripts/Common/Components/DynamicPivotItem";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { AgileHubContributionIds } from "Agile/Scripts/Generated/HubConstants";
import { CAPACITYOPTIONS_DATAPROVIDER_ID, TEAMCAPACITY_DATAPROVIDER_ID } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { ISprintViewPivotContext } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { IContributedPivotProps } from "VSSPreview/Utilities/PivotContributions";
import * as React from "react";

export interface ICapacityPivotProps extends IContributedPivotProps<ISprintViewPivotContext, {}> {
}

@component("work.sprintshub.capacity")
export class CapacityPivot extends React.Component<ICapacityPivotProps> {
    public render(): JSX.Element {
        const { pivotContext } = this.props;

        return (
            <DynamicPivotItem
                dataProviders={[
                    TEAMCAPACITY_DATAPROVIDER_ID,
                    CAPACITYOPTIONS_DATAPROVIDER_ID,
                    AgileHubContributionIds.BacklogConfiguration_DataProvider,
                    AgileHubContributionIds.TeamSetting_DataProvider]}
                shouldReloadDataProviders={pivotContext.shouldReloadDataProviders}
                modules={["Agile/Scripts/SprintsHub/Capacity/Components/SprintViewCapacityPivot"]}
                onRenderLoading={() => <LoadingComponent />}
                componentProps={pivotContext}
                componentKey="sprint-capacity-pivot"
            />
        );
    }
}

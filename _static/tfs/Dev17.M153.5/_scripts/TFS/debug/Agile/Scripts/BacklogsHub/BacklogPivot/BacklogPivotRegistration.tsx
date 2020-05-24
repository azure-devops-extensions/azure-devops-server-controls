import { IBacklogPivotContext } from "Agile/Scripts/BacklogsHub/BacklogHubContracts";
import { component } from "Agile/Scripts/Common/Components/ComponentRegistration";
import { DynamicPivotItem } from "Agile/Scripts/Common/Components/DynamicPivotItem";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { AgileHubContributionIds, BacklogsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { IContributedPivotProps } from "VSSPreview/Utilities/PivotContributions";
import * as React from "react";

export interface IBacklogPivotProps extends IContributedPivotProps<IBacklogPivotContext, {}> {
}

@component("work.backlogshub.backlog")
export class BacklogPivot extends React.Component<IBacklogPivotProps> {
    public render(): JSX.Element {
        const { pivotContext } = this.props;

        return (
            <DynamicPivotItem
                dataProviders={[
                    BacklogsHubConstants.PRODUCTBACKLOG_DATAPROVIDER_ID,
                    AgileHubContributionIds.BacklogConfiguration_DataProvider,
                    AgileHubContributionIds.TeamSetting_DataProvider
                ]}
                shouldReloadDataProviders={pivotContext.shouldReloadDataProviders}
                modules={["Agile/Scripts/BacklogsHub/BacklogPivot/Components/BacklogPivot"]}
                onRenderLoading={() => <LoadingComponent />}
                componentProps={pivotContext}
                componentKey="backlogs-backlog-pivot"
            />
        );
    }
}

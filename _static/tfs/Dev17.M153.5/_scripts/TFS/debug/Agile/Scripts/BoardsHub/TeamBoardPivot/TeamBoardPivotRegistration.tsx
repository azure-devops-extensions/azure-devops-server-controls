import { ITeamBoardPivotContext } from "Agile/Scripts/BoardsHub/BoardsHubContracts";
import { component } from "Agile/Scripts/Common/Components/ComponentRegistration";
import { DynamicPivotItem } from "Agile/Scripts/Common/Components/DynamicPivotItem";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { AgileHubContributionIds, BoardsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { IContributedPivotProps } from "VSSPreview/Utilities/PivotContributions";
import * as React from "react";

export interface IBoardPivotProps extends IContributedPivotProps<ITeamBoardPivotContext, {}> {
}

@component("work.boardshub.board")
export class BoardPivot extends React.Component<IBoardPivotProps> {
    public render(): JSX.Element {
        const { pivotContext } = this.props;
        const dataProviders = [
            BoardsHubConstants.TEAM_BOARD_CONTENT_DATAPROVIDER_ID,
            AgileHubContributionIds.BacklogConfiguration_DataProvider,
            AgileHubContributionIds.TeamSetting_DataProvider
        ];
        const modules = ["Agile/Scripts/BoardsHub/TeamBoardPivot/Components/TeamBoardPivot"];

        return (
            <DynamicPivotItem
                dataProviders={dataProviders}
                shouldReloadDataProviders={pivotContext.shouldReloadDataProviders}
                modules={modules}
                onRenderLoading={() => <LoadingComponent />}
                componentProps={pivotContext}
                componentKey="boards-board-pivot"
            />
        );
    }
}

import { PivotItemContent } from "Agile/Scripts/Common/Components/PivotItemContent";
import { SprintsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { ISprintViewPivotContext, IRightPanelContributionState } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { getService } from "VSS/Service";
import { SprintsNavigationSettingsService } from "Agile/Scripts/SprintsHub/Common/SprintsNavigationSettingsService";
import { SprintsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { SprintViewUsageTelemetryConstants } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewTelemetryConstants";

export abstract class SprintViewPivotBase<TState> extends PivotItemContent<ISprintViewPivotContext, TState> {
    constructor(props: ISprintViewPivotContext, context?: any) {
        super(props, context, SprintsHubConstants.HUB_NAME, props.pivotName);
    }

    public abstract isDataReady(): boolean;

    public componentWillMount() {
        if (super.componentWillMount) {
            super.componentWillMount();
        }
    }

    public componentWillUnmount() {
        if (super.componentWillUnmount) {
            super.componentWillUnmount();
        }
    }

    protected getSplitterState(): IRightPanelContributionState {
        const svc = getService(SprintsNavigationSettingsService);
        return svc.contentPivotSettings.rightPanelContributionSettings;
    }

    protected updateSplitterState(newContributionId: string) {
        const svc = getService(SprintsNavigationSettingsService);
        const currentPivotSettings = svc.contentPivotSettings;
        const previousSettings = currentPivotSettings.rightPanelContributionSettings;
        const { contributionId } = previousSettings;

        // If we open/close the pane or switch the content of the pane, save the state and send telemetry
        if (contributionId !== newContributionId) {
            svc.contentPivotSettings = {
                ...currentPivotSettings,
                rightPanelContributionSettings: {
                    ...currentPivotSettings.rightPanelContributionSettings,
                    contributionId: newContributionId
                }
            };

            SprintsHubTelemetryHelper.publishTelemetry(
                SprintViewUsageTelemetryConstants.RIGHT_PANEL_CHANGED,
                {
                    id: newContributionId,
                    selectedPivot: this.props.pivotName,
                    teamId: this.props.team.id
                }
            );
        }
    }
}
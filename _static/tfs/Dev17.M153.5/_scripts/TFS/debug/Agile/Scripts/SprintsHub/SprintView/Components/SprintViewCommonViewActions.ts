import { HubViewActions } from "Agile/Scripts/Common/HubViewActions";
import * as SprintsHubResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub";
import { ISprintViewPivotContext, RightPanelKey, ViewActionKey } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { TaskboardGroupBy } from "Agile/Scripts/Taskboard/TaskboardConstants";
import { Contribution } from "VSS/Contributions/Contracts";
import { equals, format } from "VSS/Utils/String";
import { PivotBarViewActionArea } from "VSSUI/Components/PivotBar";
import { IChoiceGroupViewActionProps, ICommandViewActionProps, IOnOffViewActionProps, IPivotBarViewAction, PivotBarViewActionType } from "VSSUI/PivotBar";
import { VssIconType } from "VSSUI/VssIcon";

export const SprintPickerViewActionClassName = "sprint-picker-view-action";

export namespace SprintViewCommonViewActions {

    export function getGroupBy(pluralWorkItemName: string): IPivotBarViewAction {
        return {
            key: ViewActionKey.GROUP_BY_KEY,
            name: SprintsHubResources.GroupBy,
            actionType: PivotBarViewActionType.ChoiceGroup,
            actionProps: {
                options: [
                    {
                        key: TaskboardGroupBy.PEOPLE_CLASSIFICATION,
                        text: SprintsHubResources.People
                    },
                    {
                        key: TaskboardGroupBy.PARENT_CLASSIFICATION,
                        text: pluralWorkItemName
                    }
                ]
            } as IChoiceGroupViewActionProps
        };
    }

    export function getShowParents(): IPivotBarViewAction {
        return {
            key: ViewActionKey.SHOW_PARENTS_KEY,
            actionType: PivotBarViewActionType.OnOff,
            name: SprintsHubResources.ShowParents,
            actionProps: {
                on: true,
                offAriaLabel: format(SprintsHubResources.TurnOff, SprintsHubResources.ShowParents),
                onAriaLabel: format(SprintsHubResources.TurnOn, SprintsHubResources.ShowParents)
            } as IOnOffViewActionProps
        };
    }

    export function shouldUpdateSprintPickerViewAction(
        currentContext: ISprintViewPivotContext,
        nextContext: ISprintViewPivotContext
    ): boolean {

        return currentContext.selectedIteration.id !== nextContext.selectedIteration.id;
    }

    /**
     * Builds view actions common to all pivots in the Sprints Hub.
     * @param pivotContext The pivot context.
     * @param disabled Whether or not the view actions should be disabled.
     * @param rightPanelContributions The contributions for the right panel.
     */
    export function getViewActions(
        pivotContext: ISprintViewPivotContext,
        disabled: boolean,
        includePlanning: boolean = false,
        selectedContributionId: string = RightPanelKey.OFF,
        rightPanelContributions: Contribution[] = null
    ): IPivotBarViewAction[] {

        return [
            ...getSprintPickerViewActions(pivotContext.selectedIteration.name, pivotContext.onSprintPickerClicked),
            getRightPanelViewAction(disabled, includePlanning, selectedContributionId, rightPanelContributions),
            ...getCommonViewActions(pivotContext)
        ];
    }

    /**
     * Builds view actions targeting the right panel.
     * @param disabled Whether or not the view actions are disabled.
     * @param selectedContributionId The selected pane.
     * @param rightPanelContributions The contributions for the right panel.
     */
    export function getRightPanelViewAction(
        disabled: boolean,
        includePlanning: boolean,
        selectedContributionId: string,
        rightPanelContributions: Contribution[]
    ): IPivotBarViewAction {
        const contributionOptions = (rightPanelContributions || []).map((contribution) => {
            return {
                key: contribution.id,
                text: contribution.properties.name,
                checked: equals(contribution.id, selectedContributionId, true)
            };
        });

        const options = [];
        options.push({
            key: RightPanelKey.WORK_DETAILS,
            text: SprintsHubResources.WorkDetails,
            checked: equals(RightPanelKey.WORK_DETAILS, selectedContributionId, true)
        });

        if (includePlanning) {
            options.push({
                key: RightPanelKey.PLANNING,
                text: SprintsHubResources.Planning,
                checked: equals(RightPanelKey.PLANNING, selectedContributionId, true)
            });
        }

        options.push(...contributionOptions);
        options.push({
            key: RightPanelKey.OFF,
            text: SprintsHubResources.Off,
            checked: !selectedContributionId || equals(RightPanelKey.OFF, selectedContributionId, true)
        });

        return {
            key: ViewActionKey.RIGHT_PANEL,
            name: SprintsHubResources.RightPanelTitle,
            actionType: PivotBarViewActionType.ChoiceGroup,
            disabled,
            actionProps: {
                options: options
            } as IChoiceGroupViewActionProps
        };
    }

    /**
     * Returns common view actions across all pivots.
     * @param pivotContext The pivot context.
     */
    function getCommonViewActions(pivotContext: ISprintViewPivotContext): IPivotBarViewAction[] {
        return [
            HubViewActions.getCommonSettings(pivotContext.onOpenSettings)
        ];
    }

    export function getSprintPickerViewActions(iterationName: string, onClick: (event: React.MouseEvent<HTMLElement>) => void): IPivotBarViewAction[] {
        const actionProps: ICommandViewActionProps = {
            className: SprintPickerViewActionClassName,
            showChevron: true
        };
        return [
            {
                actionType: PivotBarViewActionType.Command,
                important: true,
                name: iterationName,
                title: iterationName,
                key: "sprint-picker",
                actionProps,
                iconProps: {
                    iconName: "sprint",
                    iconType: VssIconType.fabric,
                    className: "sprint-title-icon"
                },
                onClick: onClick,
                viewActionRenderArea: PivotBarViewActionArea.beforeViewOptions
            }
        ];
    }
}
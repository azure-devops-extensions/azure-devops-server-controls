import { Colors } from "Agile/Scripts/Common/Colors";
import { AgileRouteParameters } from "Agile/Scripts/Generated/HubConstants";
import { IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import { equals } from "VSS/Utils/String";
import { first } from "VSS/Utils/Array";
import { PivotBarViewActionArea, IPivotBarViewAction } from "VSSUI/Components/PivotBar";
import { IPivotBarAction } from "VSSUI/PivotBar";
import { IViewOptions } from "VSSUI/Utilities/ViewOptions";
import { IVssIconProps } from "VSSUI/VssIcon";

export const BacklogLevelSelectorClass = "backlog-level-selector-view-action";

export function getLevelSelectorViewAction(
    backlogLevels: IBacklogLevelConfiguration[],
    viewOptions: IViewOptions,
    canSwitchLevels?: () => boolean,
    artifactName?: string,
    iconProps?: IVssIconProps,
    showMessage?: () => void
): IPivotBarViewAction {
    canSwitchLevels = canSwitchLevels || (() => true);
    const currentLevelName = viewOptions.getViewOption(AgileRouteParameters.BacklogLevel);
    const levels: IPivotBarAction[] = backlogLevels.map((backlogLevel) => {
        return {
            key: `backlog-level-${backlogLevel.name}`,
            name: backlogLevel.name,
            ariaLabel: `${backlogLevel.name} ${artifactName}`,
            iconProps: iconProps ? { ...iconProps, styles: { root: { color: `${formatColor(backlogLevel.color)} !important` } } } : undefined,
            important: true,
            onClick: () => {
                if (!equals(currentLevelName, backlogLevel.name, /*ignore case*/ true)) {
                    if (canSwitchLevels()) {
                        viewOptions.setViewOption(AgileRouteParameters.BacklogLevel, backlogLevel.name);
                    } else {
                        if (showMessage) {
                            showMessage();
                        }
                    }
                }
            }
        } as IPivotBarAction;
    });

    let currentBacklog = first(backlogLevels, (level) => equals(level.name, currentLevelName, true /*ignore case*/));
    if (!currentBacklog) {
        currentBacklog = backlogLevels[0];
    }

    return {
        key: "backlog-level-selector",
        actionProps: { className: BacklogLevelSelectorClass },
        name: currentBacklog.name,
        ariaLabel: `${currentBacklog.name} ${artifactName}`,
        iconProps: iconProps ? { ...iconProps, styles: { root: { color: `${formatColor(currentBacklog.color)} !important` } } } : undefined,
        important: true,
        viewActionRenderArea: PivotBarViewActionArea.beforeViewOptions,
        children: levels
    };
}

function formatColor(color: string): string {
    if (color.length !== 6 && color.length !== 8) {
        return Colors.BLACK;
    }

    const colorValue = color.length === 6 ? color : color.substr(2, 6);
    return `#${colorValue}`;
}
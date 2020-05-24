import { Backlog } from "Agile/Scripts/Backlog/Backlog";
import { ContextMenuContributionUtils } from "Agile/Scripts/Backlog/ProductBacklogContextMenu";
import * as AgileProductBacklogResources from "Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog";
import { TeamAwarenessService } from "Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import * as KeyboardShortcuts from "VSS/Controls/KeyboardShortcuts";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { ITeamSettings } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";

const tfsContext = TfsContext.getDefault();

export interface IBacklogShortcutGroupOptions {
    getTeamId: () => string;

    /** Backlog for generating shared shortcuts */
    getBacklog: () => Backlog;

    /** Element for setting backlog shortcuts on */
    backlogElement: Element;

    /** Action for activating the filter */
    activateFilter: (e?: KeyboardShortcuts.IEKeyboardEvent, combo?: string) => void;
    /** Add show parents shortcut and run this delegate */
    showParents?: (e?: KeyboardShortcuts.IEKeyboardEvent, combo?: string) => void;
    /** Add item shortcut */
    addNewItem?: (e?: KeyboardShortcuts.IEKeyboardEvent, combo?: string) => void;
    /** Optionally add addPanel shortcuts */
    addPanelShortcuts?: boolean;
}

export class BacklogShortcutGroup extends ShortcutGroupDefinition {
    protected _shortcutsData: IDictionaryStringTo<KeyboardShortcuts.IShortcutOptions>;
    protected _options: IBacklogShortcutGroupOptions;

    constructor(options: IBacklogShortcutGroupOptions) {
        super(AgileProductBacklogResources.KeyboardShortcutGroup_Backlog);
        this._options = options;

        this._initializeData();
        this.unregisterAllShortcuts();
        this._registerAllShortcuts();
    }

    public unregisterAllShortcuts(): void {
        const shortcutKeys = Object.keys(this._shortcutsData);
        for (const shortcutKey of shortcutKeys) {
            this.unRegisterShortcut(shortcutKey);
        }
    }

    protected _initializeData(): void {
        this._shortcutsData = {};

        const {
            activateFilter,
            addNewItem,
            addPanelShortcuts,
            backlogElement,
            getBacklog,
            showParents
        } = this._options;
        const backlog = getBacklog();
        const moveToPositionHelper = backlog.getMoveToPositionHelper();

        // Shortcuts hidden from helper menu
        // Expand one level
        this._shortcutsData["+"] = {
            action: () => { backlog.expandOneLevel(); },
            description: "Expand one level",
            element: backlogElement,
            hideFromHelpDialog: true
        };
        // Collapse one level
        this._shortcutsData["-"] = {
            action: () => { backlog.collapseOneLevel(); },
            description: "Collapse one level",
            element: backlogElement,
            hideFromHelpDialog: true
        };

        // Move item to top of backlog
        this._shortcutsData["mod+home"] = {
            action: () => {
                const grid = backlog.getGrid();
                let workItemIds = grid.getSelectedWorkItemIds();

                workItemIds = moveToPositionHelper.filterWorkItemIds(workItemIds);
                if (moveToPositionHelper.isMoveToPositionAllowed(workItemIds) &&
                    !moveToPositionHelper.isMoveToTopHidden(workItemIds) &&
                    !ContextMenuContributionUtils.anyWorkItemSaving(grid, workItemIds)) {
                    moveToPositionHelper.moveToTop(workItemIds);
                }
            },
            description: AgileProductBacklogResources.KeyboardShortcutDescription_Move_Item_To_Top,
            element: backlogElement
        };

        // Move iteration shortcuts
        this._shortcutsData["m b"] = {
            action: () => {
                this._getTeamSettings().then(teamSettings => {
                    ContextMenuContributionUtils.moveToIteration(backlog.getGrid().getSelectedWorkItemIds(), teamSettings.backlogIteration.friendlyPath);
                });
            },
            description: AgileProductBacklogResources.KeyboardShortcutDescription_Move_Item_To_Backlog,
            element: backlogElement
        };
        this._shortcutsData["m i"] = {
            action: () => {
                this._getTeamSettings().then(teamSettings => {
                    if (teamSettings.currentIteration) {
                        this._setIterationPath(teamSettings.currentIteration.friendlyPath);
                    }
                });
            },
            description: AgileProductBacklogResources.KeyboardShortcutDescription_Move_Item_To_Current_Iteration,
            element: backlogElement
        };
        this._shortcutsData["m n"] = {
            action: () => {
                this._getTeamSettings().then(teamSettings => {
                    if (teamSettings.futureIterations && teamSettings.futureIterations.length > 0) {
                        this._setIterationPath(teamSettings.futureIterations[0].friendlyPath);
                    }
                });
            },
            description: AgileProductBacklogResources.KeyboardShortcutDescription_Move_Item_To_Next_Iteration,
            element: backlogElement
        };

        // Add panel related shortcuts
        if (addPanelShortcuts) {
            // Escape from add panel
            this._shortcutsData["esc"] = {
                action: () => {
                    backlog.setAddPanelState(false);
                    backlog.getGrid().focus(0);
                },
                description: "Escape from add panel",
                element: backlog.getAddPanelContainer()[0],
                hideFromHelpDialog: true
            };
        }

        if (addNewItem) {
            // Add item
            this._shortcutsData["n"] = {
                action: addNewItem,
                description: AgileProductBacklogResources.KeyboardShortcutDescription_Open_New_Item_Panel,
                element: backlogElement
            };
        }

        // Insert child
        this._shortcutsData["ins"] = {
            action: () => { backlog.openAddChild(); },
            description: AgileProductBacklogResources.KeyboardShortcutDescription_Add_Child,
            element: backlogElement
        };

        // Activate filter
        this._shortcutsData["mod+shift+f"] = {
            action: activateFilter,
            description: WITResources.KeyboardShortcutDescription_FilterResults,
            globalCombos: ["mod+shift+f"]
        };

        // Show parents
        if (showParents) {
            this._shortcutsData["r"] = {
                action: showParents,
                description: AgileProductBacklogResources.KeyboardShortcutDescription_Show_Hide_Parents,
                element: backlogElement
            };
        }
    }

    private _setIterationPath(iterationPath: string) {
        const {
            getBacklog
        } = this._options;
        ContextMenuContributionUtils.moveToIteration(getBacklog().getGrid().getSelectedWorkItemIds(), iterationPath);
    }

    private _registerAllShortcuts(): void {
        const shortcutKeys = Object.keys(this._shortcutsData);
        for (const shortcutKey of shortcutKeys) {
            this.registerShortcut(shortcutKey, this._shortcutsData[shortcutKey]);
        }
    }

    private _getTeamSettings(): Promise<ITeamSettings> {
        const teamAwareness = ProjectCollection.getConnection(tfsContext).getService<TeamAwarenessService>(TeamAwarenessService);
        return teamAwareness.beginGetTeamSettings(this._options.getTeamId());
    }
}

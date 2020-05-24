import Navigation_Services = require("VSS/Navigation/Services");
import Navigation = require("VSS/Controls/Navigation");
import Utils_UI = require("VSS/Utils/UI");
import Controls = require("VSS/Controls");
import CodeHubCloneRepositoryAction_NO_REQUIRE = require("VersionControl/Scripts/CodeHubCloneRepositoryAction");
import Menus = require("VSS/Controls/Menus");

import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VSS = require("VSS/VSS");

import domElem = Utils_UI.domElem;

export class VersionControlCommonPivotFilters extends Controls.BaseControl {

    private _$historyFilters: JQuery;
    private _viewFiltersMenu: Menus.MenuBar;
    private _clonePopupCreated: boolean = false;

    public initialize() {

        super.initialize();

        this._viewFiltersMenu = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar,
            $(domElem("span", "vc-view-pivot-filters toolbar")).appendTo(this._element),
            { cssClass: "vc-view-pivot-menu" }
        );

        // Create place-holders for pivot filters
        this._$historyFilters = $(domElem("div", "vc-history-filters-aligned"))
            .css("display", "none")
            .appendTo(this._element);

        const $historyPivotFilters = $(domElem("div", "vc-history-pivot-filters")).appendTo(this._$historyFilters);
        // Workaround for fixing the pivot flickering issue on history hub
        $historyPivotFilters.css("float", "none");
        $(domElem("div", "vc-history-graph-toggle")).appendTo(this._$historyFilters);
    }

    public updateViewFilters(explorerView: Navigation.TabbedNavigationView) {

        const currentState = explorerView.getState(),
            currentRawState = explorerView.getRawState(),
            currentAction = explorerView.getCurrentAction();

        explorerView.setFullScreenMode(currentState.fullScreenMode, this._options.showLeftPaneInFullScreenMode);

        this._updateViewPivotMenu(explorerView, currentAction, currentState, currentRawState);

        this._$historyFilters.toggle(currentAction === VCControlsCommon.VersionControlActionIds.History);
    }

    private _updateViewPivotMenu(explorerView: Navigation.TabbedNavigationView, action: string, parsedState: any, rawState: any) {
        let showFullScreenItem = false;

        if (parsedState.item && !parsedState.item.isFolder) {
            if (action === VCControlsCommon.VersionControlActionIds.Contents || action === VCControlsCommon.VersionControlActionIds.Compare) {
                showFullScreenItem = true;
            }
        }

        if (parsedState.fullScreenMode || action === VCControlsCommon.VersionControlActionIds.Summary ||
            (action || "").indexOf(VCControlsCommon.VersionControlActionIds.DiffParent) === 0) {
            showFullScreenItem = true;
        }

        const menuItems: any[] = [];

        if (showFullScreenItem) {
            if (parsedState.fullScreenMode) {
                menuItems.push({
                    id: "exit-full-screen",
                    title: VCResources.ExitFullScreenMode,
                    icon: "bowtie-icon bowtie-view-full-screen-exit",
                    showText: false,
                    action: "navigate",
                    "arguments": { url: Navigation_Services.getHistoryService().getFragmentActionLink(action, $.extend({}, rawState, { fullScreen: "false" })) }
                });
            }
            else {
                menuItems.push({
                    id: "full-screen",
                    title: VCResources.EnterFullScreenModeTooltip,
                    icon: "bowtie-icon bowtie-view-full-screen",
                    showText: false,
                    action: "navigate",
                    "arguments": { url: Navigation_Services.getHistoryService().getFragmentActionLink(action, $.extend({}, rawState, { fullScreen: "true" })) }
                });
            }
        }

        const showCloneItem = (this._options.repositoryContext.getRepositoryType() === RepositoryType.Git) && this._options.showCloneButton;

        if (showCloneItem) {
            menuItems.push({
                id: "clone-popup",
                title: VCResources.CloneAction,
                text: VCResources.CloneAction,
                icon: "bowtie-icon bowtie-clone-to-desktop",
                showText: true,
                cssClass: "vc-clone-menu-button-main-view",
                action: () => {
                    VSS.using(["VersionControl/Scripts/CodeHubCloneRepositoryAction"], (CodeHubCloneRepositoryAction: typeof CodeHubCloneRepositoryAction_NO_REQUIRE) => {
                        if (!this._clonePopupCreated) {
                            CodeHubCloneRepositoryAction.createCloneRepositoryPopup(this._viewFiltersMenu.getItem("clone-popup")._element, {
                                repositoryContext: this._options.repositoryContext,
                                openInVsLink: explorerView._options.openInVsLink,
                                sshEnabled: explorerView._options.sshEnabled,
                                sshUrl: explorerView._options.sshUrl,
                                cloneUrl: explorerView._options.cloneUrl,
                                branchName: parsedState.versionSpec.branchName,
                                openedFromL2Header: false
                            });
                            this._clonePopupCreated = true;
                        }
                    });
                }
            });
        }

        this._viewFiltersMenu.updateItems(menuItems);
    }
}

/// <reference types="react" />
import * as React from "react";
import { CommandBar } from "OfficeFabric/CommandBar";
import { ActionCreator } from  "VersionControl/Scenarios/Explorer/ActionCreator";
import { getFullScreenCommand } from "VersionControl/Scenarios/Explorer/Commands/ItemCommands";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export const FullScreenCommandBarContainer = VCContainer.create(
    ["pivotTabs"],
    ({ pivotTabsState }, { actionCreator }) =>
        pivotTabsState.isFullScreen
        ? <CommandBar
            className="vc-item-command-bar"
            items={[]}
            farItems={[getFullScreenCommand(pivotTabsState.isFullScreen, actionCreator)]}
            />
        : null);

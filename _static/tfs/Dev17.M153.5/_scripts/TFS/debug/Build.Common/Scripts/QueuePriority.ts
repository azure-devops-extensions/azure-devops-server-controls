import BuildCommonResources = require("Build.Common/Scripts/Resources/TFS.Resources.Build.Common");

import * as BuildContracts from "TFS/Build/Contracts";

export module QueuePriority {
    let _names: IDictionaryNumberTo<{ name: string, displayName: string }> = null;

    export function getName(priority: BuildContracts.QueuePriority, display?: boolean): string {
        _ensureNames();

        let names = _names[priority];
        if (!names) {
            names = _names[BuildContracts.QueuePriority.Normal];
        }

        return names[display === true ? "displayName" : "name"];
    }

    function _ensureNames() {
        if (!_names) {
            let names: IDictionaryNumberTo<{ name: string, displayName: string }> = {};
            names[BuildContracts.QueuePriority.High] = { name: "high", displayName: BuildCommonResources.QueueBuildPriorityHigh };
            names[BuildContracts.QueuePriority.AboveNormal] = { name: "abovenormal", displayName: BuildCommonResources.QueueBuildPriorityAboveNormal };
            names[BuildContracts.QueuePriority.Normal] = { name: "normal", displayName: BuildCommonResources.QueueBuildPriorityNormal };
            names[BuildContracts.QueuePriority.BelowNormal] = { name: "belownormal", displayName: BuildCommonResources.QueueBuildPriorityBelowNormal };
            names[BuildContracts.QueuePriority.Low] = { name: "low", displayName: BuildCommonResources.QueueBuildPriorityLow };
            _names = names;
        }
    }
}
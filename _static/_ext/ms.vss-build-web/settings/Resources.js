// Copyright (C) Microsoft Corporation. All rights reserved.
define("Build/Settings/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BadgesArePublic = "Allow anonymous access to badges";
    exports.DaysToKeepArtifacts = "Days to keep artifacts and attachments";
    exports.DaysToKeepPullRequestRuns = "Days to keep pull request runs";
    exports.DaysToKeepRuns = "Days to keep runs";
    exports.General = "General";
    exports.LoadingText = "Loading...";
    exports.PurgeArtifactsSettingIgnored = "The artifacts and attachments retention setting is being ignored because the runs retention setting is evaluated first.";
    exports.RequiredValueRangeError = "Enter a value between {0} and {1}";
    exports.RetentionPolicy = "Retention policy";
    exports.Settings = "Settings";
});
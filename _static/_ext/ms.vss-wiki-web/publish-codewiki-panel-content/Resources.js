// Copyright (C) Microsoft Corporation. All rights reserved.
define("Wiki/PublishCodeWikiPanel/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PublishWikiPanelTitle = "Publish pages from code repository as Wiki";
    exports.PublishWikiPanelDescription = "Markdown pages from the selected folder in the code repository will be published as Wiki.";
    exports.Cancel = "Cancel";
    exports.Publish = "Publish";
    exports.RepositoryLabel = "Repository";
    exports.BranchLabel = "Branch";
    exports.FolderLabel = "Folder";
    exports.WikiNameLabel = "Wiki name";
    exports.FolderFieldPlaceHolder = "Select a folder";
    exports.WikiNameFieldPlaceHolder = "Enter wiki name";
    exports.LoadingSpinnerText = "Loading initial data...";
    exports.PublishingSpinnerText = "Publishing wiki...";
    exports.VersionSelectorPlaceholderText = "Select a branch";
    exports.InvalidFolderPathError = "Invalid path value. Path should start with \"/\".";
    exports.InvalidWikiName = "The wiki name is invalid.";
});
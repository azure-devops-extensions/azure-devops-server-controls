// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import { Splitter } from "VSS/Controls/Splitter";
import Service = require("VSS/Service");
import Settings = require("VSS/Settings");
import Utils_Core = require("VSS/Utils/Core");
import Diag = require("VSS/Diag");
import Utils_UI = require("VSS/Utils/UI");

export const VIEW_PANE_SIZE_PREFERENCE_KEY: string = "vss-search-platform/PreviewPaneSizePreferences";

/**
 * Wrapper on top of Splitter control. The wrapper wraps various functions specific to our needs e.g.
 * Storing fixed pane size whenever the split panes sizes are modified by dragging/collapsing the splitter.
 * The class also provides the functionality to restore the size of the fixed pane, stored as user preference.
 */
export class PreferenceRestorableSplitter extends Splitter {
    private _localSettingsService: Settings.LocalSettingsService;
    private _providerExtensionName: string;
    constructor(options, enhancementOptions?) {
        super(options);
        this.setEnhancementOptions(enhancementOptions);
        Diag.Debug.assertIsNotUndefined(options.providerExtensionName, "providerExtensionName is null or undefined.");
        this._localSettingsService = options.localSettingsService || Service.getLocalService(Settings.LocalSettingsService);
        this._providerExtensionName = options.providerExtensionName;
    }

    get splitOrientation(): string {
        return this
            .getElement()
            .hasClass("vertical") ?
            "vertical" :
            "horizontal";
    }

    public initialize(): void {
        super.initialize();

        // detach splitter from reacting to resize event.
        // An explicit resize event on another splitter within the search page hub causes the splitter 
        // on the results page to change the dimension, hence detaching.
        this.detachResize();
        Utils_UI.detachResize(this.getElement());

        // bind to "change" event to store the fixed pane width as preference
        this._bind("changed", Utils_Core.delegate(
            this,
            (e?) => {
                var pix = this.getFixedSidePixels(),
                    splitOrientation = this.splitOrientation;
                this.onSplitterSizeChanged(pix, splitOrientation);
            }));
    }

    /**
     * Delegate invoked whenever the splitter is dragged/collapsed to resize the split panes.
     * Method made public for L0 testing purposes.
     * @param splitterFixedSideSizeInPixels
     * @param splitOrientation
     */
    public onSplitterSizeChanged(splitterFixedSideSizeInPixels: number, splitOrientation: string): any {
        // read the preferences
        let viewPanePreference: any = this._localSettingsService.read(VIEW_PANE_SIZE_PREFERENCE_KEY, null, Settings.LocalSettingsScope.Global) || {};
        if (!viewPanePreference[this._providerExtensionName]) {
            viewPanePreference[this._providerExtensionName] = {
                vertical: 0,
                horizontal: 0
            }
        }

        // update fixed pane size in pixels
        viewPanePreference[this._providerExtensionName][splitOrientation] = splitterFixedSideSizeInPixels;

        this._localSettingsService.write(VIEW_PANE_SIZE_PREFERENCE_KEY, viewPanePreference, Settings.LocalSettingsScope.Global);

        return viewPanePreference;
    }

    /**
     * Method to restore the preview pane size based on the value persisted as one of the preferences.
     * Made public for L0 testing purposes.
     * @param splitOrientation
     */
    public restorePreviewPaneSizePreferences(splitOrientation: string, shouldResize: boolean, resizeIfNoPreferenceAvailale?: boolean): number {
        let viewPanePreference: any;
        if (splitOrientation) {
            viewPanePreference = this._localSettingsService.read(VIEW_PANE_SIZE_PREFERENCE_KEY, null, Settings.LocalSettingsScope.Global)
            if (viewPanePreference && viewPanePreference[this._providerExtensionName]) {
                let fixedPaneSizeInPixels = viewPanePreference[this._providerExtensionName][splitOrientation];
                if (fixedPaneSizeInPixels && fixedPaneSizeInPixels > 0) {
                    // resize using Splitter's public API.
                    if (shouldResize) {
                        this.resize(fixedPaneSizeInPixels, true);
                    }

                    return fixedPaneSizeInPixels;
                }
            }
            else if (resizeIfNoPreferenceAvailale && splitOrientation === "horizontal") {
                // Bug 993421: Sometimes tags are not rendered even though there is enough space for them to be render
                // If there is no preference available for splitter width, then the available width to render tags is being sent as null
                // So setting width by calculating default value.
                let splitterWidthWithNoPreference = $(".leftPane.search-view-results-pane").width();
                if (splitterWidthWithNoPreference) {
                    // resize using Splitter's public API.
                    this.resize(splitterWidthWithNoPreference, true);
                }
            }
        }
    }
}

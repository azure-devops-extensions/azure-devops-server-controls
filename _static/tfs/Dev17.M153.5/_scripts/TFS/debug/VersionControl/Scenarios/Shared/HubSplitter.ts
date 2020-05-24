import Controls = require("VSS/Controls");
import Service = require("VSS/Service");
import Settings = require("VSS/Settings");
import {StatefulSplitterEnhancement,
    StatefulSplitterOptions,
    StatefulSplitterSetting} from "Presentation/Scripts/TFS/TFS.UI.Controls.Accessories";
import {Splitter, ISplitterOptions} from "VSS/Controls/Splitter";

export function createLocalStorageHubSplitter($element: JQuery, settingsPath: string, collapsedLabel: string, defaultExpanded: boolean = true) {

    //Look up settings from local storage
    const settings: StatefulSplitterSetting = Service.getLocalService(Settings.LocalSettingsService).read(settingsPath, {
        size: null,
        expanded: defaultExpanded
    } as StatefulSplitterSetting);

    //set up the splitter
    const splitterOptions: ISplitterOptions = {
        vertical: false,
        collapsedLabel,
        enableToggleButton: true,
        initialSize: settings.size,
        expandState: settings.expanded ? null : "right"
    };
    Controls.Enhancement.enhance(Splitter, $element, splitterOptions);

    //enhance the splitter using local storage
    const statefulSplitterOptions: StatefulSplitterOptions = {
        settingPath: settingsPath,
        useLocalStorage: true
    };
    Controls.Enhancement.enhance(StatefulSplitterEnhancement, $element, statefulSplitterOptions);
}
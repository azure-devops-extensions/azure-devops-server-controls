import * as BasePreviewOrientationStore from "Search/Scenarios/Shared/Base/Stores/PreviewOrientationStore";
import * as _PreviewSetting from "Search/Scenarios/Shared/Components/PreviewSettingsPivot";
import * as Settings from "VSS/Settings";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { PreviewOrientationActionIds } from "Search/Scenarios/Code/Constants";

const PreviewOrientationSettingKey = "vss-search-platform/code/PreviewOrientation";
export class PreviewOrientationStore extends BasePreviewOrientationStore.PreviewOrientationStore {
    constructor(settings?: Settings.LocalSettingsService) {
        super(PreviewOrientationSettingKey, settings);
        this._state.previewOrientation = this.readSetting(PreviewOrientationActionIds.Right);
    }

    public get availablePreviewOrientations(): _PreviewSetting.PreviewSetting[] {
        return [
            { key: PreviewOrientationActionIds.Right, name: Resources.RightPreviewOrientation },
            { key: PreviewOrientationActionIds.Bottom, name: Resources.BottomPreviewOrientation }
        ];
    }
}
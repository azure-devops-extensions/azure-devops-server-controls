import * as BasePreviewOrientationStore from "Search/Scenarios/Shared/Base/Stores/PreviewOrientationStore";
import * as _PreviewSetting from "Search/Scenarios/Shared/Components/PreviewSettingsPivot";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as Settings from "VSS/Settings";
import { PreviewOrientationActionIds } from "Search/Scenarios/WorkItem/Constants";

const PreviewOrientationSettingKey = "vss-search-platform/workitem/PreviewOrientation";
export class PreviewOrientationStore extends BasePreviewOrientationStore.PreviewOrientationStore {

    constructor(settings?: Settings.LocalSettingsService) {
        super(PreviewOrientationSettingKey, settings);
        this._state.previewOrientation = this.readSetting(PreviewOrientationActionIds.RightPreviewOrientation);
    }

    public get availablePreviewOrientations(): _PreviewSetting.PreviewSetting[] {
        return [
            { key: PreviewOrientationActionIds.OffPreviewOrientation, name: Resources.OffPreviewOrientation },
            { key: PreviewOrientationActionIds.RightPreviewOrientation, name: Resources.RightPreviewOrientation },
            { key: PreviewOrientationActionIds.BottomPreviewOrientation, name: Resources.BottomPreviewOrientation }
        ];
    }
}
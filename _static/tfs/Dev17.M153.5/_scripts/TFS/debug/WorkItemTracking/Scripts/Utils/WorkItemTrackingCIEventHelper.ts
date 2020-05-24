
// VSS module
import VSS_Telemetry_Services = require("VSS/Telemetry/Services");

// WorkItemTracking module
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");

function _PublishCIEvent(feature: string, properties: { [key: string]: any; }, immediate?: boolean): void {
    VSS_Telemetry_Services.publishEvent(
        new VSS_Telemetry_Services.TelemetryEventData(
            CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
            feature,
            properties),
        immediate);
}

export class AttachmentsControlCIEvents {
    public static ACTIONS_ADD = "AddAttachment";
    public static ACTIONS_DELETE = "DeleteAttachment";
    public static ACTIONS_EDIT = "EditAttachment";
    public static ACTIONS_OPEN = "OpenAttachment";
    public static ACTIONS_SAVE = "SaveAttachment";

    public static UI_CHANGE_VIEW_MODE = "UIChangeViewMode";
    public static UI_PREVIEW_MODE = "UIPreviewMode";
    public static UI_PREVIEW_TRAVERSE = "UIPreviewModeNext";
    public static UI_DOWNLOAD = "UIDownload";
    public static UI_DELETE = "UIDelete";
    public static UI_EDIT_COMMENT = "UIEditComment";
    public static UI_PREVIEW = "UIShowPreview";

    private static _featureName = "AttachmentsControl";

    public static publishEvent(action: string, properties: { [key: string]: any; } = {}, immediate?: boolean): void {
        _PublishCIEvent(
            AttachmentsControlCIEvents._featureName,
            $.extend({ action: action }, properties),
            immediate);
    }
}

export class AttachmentsControlUIActionSource {
    public static UI_THUMBNAIL_CONTEXT_MENU = "ThumbnailContextMenu";
    public static UI_THUMBNAIL_CARD = "ThumbnailCard";
    public static UI_GRID_TITLE = "GridTitle";
    public static UI_GRID_ROW = "GridRow";
    public static UI_GRID_CONTEXT_MENU = "GridContextMenu";
    public static UI_PREVIEW_CONTEXT_MENU = "PreviewContextMenu";
}

export class AttachmentsControlUIViewMode {
    public static GRID = "ViewModeGrid";
    public static THUMBNAIL = "ViewModeThumbnail";
}

export class QueryHierarchyCIEvents {
    public static EVENTS_TREE_NODE_SELECTED = "TreeNodeSelected";
    public static EVENTS_FAVORITES_POPULATED = "FavoritesPopulated";
    public static ACTIONS_DRAG_AND_DROP_TREE_NODE = "DragAndDropTreeNode";
    public static ACTIONS_CLICK_ADD_TO_MY_FAVORITES_MENU_ITEM = "ClickAddToMyFavoritesMenuItem";
    public static ACTIONS_CLICK_ADD_TO_TEAM_FAVORITES_MENU_ITEM = "ClickAddToTeamFavoritesMenuItem";

    private static _featureName = "QueryHierarchy";

    public static publishEvent(action: string, properties?: { [key: string]: any; }, immediate?: boolean): void {
        _PublishCIEvent(
            QueryHierarchyCIEvents._featureName,
            $.extend({ action: action }, properties ? properties : {}),
            immediate);
    }
}

export class QueryCIEvents {
    public static EVENTS_QUERY_EXECUTED = "QueryExecuted";

    private static _featureName = "Query";

    public static publishEvent(action: string, properties?: { [key: string]: any; }, immediate?: boolean): void {
        _PublishCIEvent(
            QueryCIEvents._featureName,
            $.extend({ action: action }, properties ? properties : {}),
            immediate);
    }
}

const FEATURE_GITHUB_INTEGRATION = "GitHubIntegration";
export class GitHubIntegrationCIActions {
    public static LINKS_FETCH = "LINKS_FETCH";
}

export function publishGitHubTelemetry(action: string, properties: { [key: string]: any; } = {}, immediate?: boolean): void {
    _PublishCIEvent(
        FEATURE_GITHUB_INTEGRATION,
        { action, ...properties },
        immediate
    );
}

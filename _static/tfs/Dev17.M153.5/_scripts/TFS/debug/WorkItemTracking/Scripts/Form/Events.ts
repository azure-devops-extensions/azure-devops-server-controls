import VSS = require("VSS/VSS");
import Models = require("WorkItemTracking/Scripts/Form/Models");

const PageActivatedEventKey = "VSS.WorkItemTracking.Form.Page.Activated";

export class FormEvents {
    /** Event for group being collapsed or expanded */
    private static GroupExpandedEventKey: string = "VSS.WorkItemTracking.Form.Group.ExpandStateChanged";

    /** Event for form resize */
    private static LayoutResizedEventKey: string = "VSS.WorkItemTracking.Layout.Resized";

    /** Event for form resize click */
    private static ControlResizedEventKey: string = "VSS.WorkItemTracking.Control.Resized";

    /** Event for form control visibility changed */
    private static ControlVisibilityChangedKey: string = "VSS.WorkItemTracking.Form.Control.VisibilityChanged";

    public static GroupExpandStateChangedEvent(): string {
        return FormEvents.GroupExpandedEventKey;
    }

    public static LayoutResizedEvent(id?: string): string {
        return `${FormEvents.LayoutResizedEventKey}.#${id}`;
    }

    /** 
     * Event to fire when the page with the given id has been activated 
     * @param viewId Id of form viewId
     * @param pageId Id of page
     */
    public static PageActivated(viewId: string, pageId: string): string {
        return `${PageActivatedEventKey}.#${viewId}.#${pageId}`;
    }

    public static ControlResizedEvent(): string {
        return FormEvents.ControlResizedEventKey;
    }

    public static ControlVisibilityChangedEvent(): string {
        return FormEvents.ControlVisibilityChangedKey;
    }
}

export interface IGroupExpandStateChangedArgs {
    isExpanded: boolean;
    group: Models.IGroup;
    groupElement: JQuery;
    witRefName: string;
}

export interface IControlVisibilityChangedArgs {
    isVisible: boolean;
    controlElement: JQuery;
}

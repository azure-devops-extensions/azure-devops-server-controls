import Context = require("VSS/Context");
import Utils_String = require("VSS/Utils/String");

export enum MenuItemLocation {
    Unknown,
    Backlog,
    Kanban,
    Taskboard,
    Queries,
    WorkItemForm
}

export function GetContextMenuLocation(context: any): MenuItemLocation {
    if (context.rows) {
        // Queries
        return MenuItemLocation.Queries;
    }
	else if (context.workItemIds) {
        // work items on backlog view
        return MenuItemLocation.Backlog;
    }
    else if (context.id) {
        // work items on board view 
        let action = Context.getPageContext().navigation.currentAction;
        if (Utils_String.localeIgnoreCaseComparer(action, "TaskBoard") === 0) {
            return MenuItemLocation.Taskboard;
        }
        else {
            return MenuItemLocation.Kanban;
        }
    }
    // Must check for undefined
    else if (typeof context.workItemAvailable === "boolean") {
        // Work Item form
        return MenuItemLocation.WorkItemForm;
    }
    return MenuItemLocation.Unknown;
}

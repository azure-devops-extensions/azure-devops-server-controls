import * as React from "react";
import * as ReactDOM from "react-dom";
import { IWorkItemsListData } from "TFS/WorkItemTracking/Controls";
import * as Context from "VSS/Context";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";
import { ActionsCreator } from "WorkItemsHub/Scripts/Actions/ActionsCreator";
import { ActionsHub } from "WorkItemsHub/Scripts/Actions/ActionsHub";
import { WorkItemsTabContent } from "WorkItemsHub/Scripts/Components/WorkItemsTabContent";
import { WorkItemsHubData } from "WorkItemsHub/Scripts/Generated/Contracts";
import { WorkItemsHubStore } from "WorkItemsHub/Scripts/Stores/WorkItemsHubStore";
import { WorkItemsGridColumnFactory } from "WorkItemsHub/Scripts/Utils/WorkItemsGridColumnFactory";
import { SecuredGenericData } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Contracts";

SDK_Shim.registerContent("workitem.workitem-list", (context: SDK_Shim.InternalContentContextData): void => {

    const options: IWorkItemsListData = context.options;
    const hubData: WorkItemsHubData = {
        processSettings: {
            doneStateNames: null,
            fieldFriendlyNames: options.fieldFriendlyNames,
            fieldReferenceNames: options.fieldReferenceNames,
            unsortableFieldReferenceNames: options.unsortableFieldReferenceNames,
            tabId: options.tabId,
            wiqlTemplate: Utils_String.empty,
            defaultOrderByClause: Utils_String.empty,
            defaultWhereClause: Utils_String.empty,
            defaultSortOptions: null,
            featureNotSupported: false,
            featureNotSupportedReason: null
        },
        fieldValues: options.fieldValues.map((values, index) => { return { data: values } as SecuredGenericData; }),
        pageContext: null,
        userSettings: null,
        permission: null
    };

    const actionsHub = new ActionsHub();
    const store = new WorkItemsHubStore(actionsHub, options.tabId, hubData);
    const actionsCreator = new ActionsCreator(actionsHub);
    const scrollableContentContainer = context.container ? context.container.querySelector("[data-is-scrollable='true']") : null;
    
    ReactDOM.render(<WorkItemsTabContent
        tabId={options.tabId}
        gridClassName={options.tabId + "-grid"}
        store={store}
        actionsCreator={actionsCreator}
        gridColumnFactory={new WorkItemsGridColumnFactory()}
        projectInfo={Context.getPageContext().webContext.project}
        tagWidthsCache={{}}
        onOpenWorkItem={() => { }}
        scrollableContentContainer={scrollableContentContainer} />,
        context.container);
});

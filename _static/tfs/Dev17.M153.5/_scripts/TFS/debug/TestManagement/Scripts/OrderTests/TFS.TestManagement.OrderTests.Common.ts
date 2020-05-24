// Copyright (c) Microsoft Corporation.  All rights reserved.

import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

let _orderTestCaseManager: TestsOM.OrderTestCaseManager = null;

export class OrderTestsEvent {
    public static ItemUpdated = "OrderTests.ItemUpdated";
}

export class OrderTestsColumnIds {
    public static order: string = "Order";
    public static id: string = WITConstants.CoreFieldRefNames.Id;
    public static title: string = WITConstants.CoreFieldRefNames.Title;
}

export class Constants {
    public static OrderTestsDragDropScope = "OrderTests.OrderTestsGrid";
    public static orderTestsGridSelector = ".order-testcases-grid-area";
    public static DataTestCaseIds: string = "test-case-ids";
    public static SelectedIndices: string = "selected-indices";
    public static ContextMenuMoveToTopId: string = "move-to-top";
    public static ContextMenuMoveToPositionId: string = "move-to-position";
    public static MouseDragDistance: number = 20;
    public static initPageSize: number = 100;
    public static pageSize: number = 100;
}

export function getOrderTestCaseManager(): TestsOM.OrderTestCaseManager {
    /// <summary>Initialize OrderTestCaseManager if not yet initialized and return it</summary>
    if (!_orderTestCaseManager) {
        _orderTestCaseManager = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService<TestsOM.OrderTestCaseManager>(TestsOM.OrderTestCaseManager);
    }

    return _orderTestCaseManager;
}

/// <reference types="jquery" />
import { Backlog } from "Agile/Scripts/Backlog/Backlog";
import { BacklogShortcutGroup } from "Agile/Scripts/Backlog/BacklogShortcutGroup";
import { ProductBacklogGrid } from "Agile/Scripts/Backlog/ProductBacklogGrid";
import { ReorderManager, BacklogContext } from "Agile/Scripts/Common/Agile";
import { ProductBacklog } from "Agile/Scripts/ProductBacklog/ProductBacklog";
import { ProductBacklogOptions } from "Agile/Scripts/ProductBacklog/ProductBacklogContracts";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import * as EngagementDispatcher_Async from "Engagement/Dispatcher";
import { Enhancement } from "VSS/Controls";
import * as VSS from "VSS/VSS";
import { getDefaultWebContext } from "VSS/Context";
import { parseJsonIsland } from "VSS/Utils/Core";

$(() => {
    const backlogContext = BacklogContext.getInstance();

    const backlogPayloadData = parseJsonIsland($(document), ".backlog-payload", false);
    backlogContext.setBacklogContextData(backlogPayloadData.backlogContext);

    const webContext = getDefaultWebContext();
    const $element = $(".main-content");
    const gridOptions = Enhancement.getEnhancementOptions(ProductBacklogGrid, $("." + Backlog.CSS_GRID, $element));
    const options: ProductBacklogOptions = {
        $backlogElement: $element,
        eventHelper: new ScopedEventHelper(`ProductBacklog_${(new Date()).getTime().toString()}`),
        deferInitialization: true,
        isNewHub: false,
        gridOptions: gridOptions,
        reorderManager: new ReorderManager(webContext.team.id)
    };
    const productBacklog = new ProductBacklog(options);
    new BacklogShortcutGroup({
        getTeamId: () => webContext.team.id,
        getBacklog: () => productBacklog,
        backlogElement: productBacklog.getGridElement()[0],
        addPanelShortcuts: true,
        activateFilter: () => { productBacklog.activateFilter(); },
        addNewItem: () => { productBacklog.setAddPanelState(true); },
        showParents: () => { productBacklog.toggleShowParents(); }
    });

    // bootstrapping the Engagement experiences
    VSS.using(["Engagement/Dispatcher"], (EngagementDispatcher: typeof EngagementDispatcher_Async) => {
        EngagementDispatcher.Dispatcher.getInstance().start("Backlog");
    });
});
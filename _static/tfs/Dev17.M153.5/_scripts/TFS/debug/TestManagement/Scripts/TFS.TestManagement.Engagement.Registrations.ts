import Engagement = require("Engagement/Core");
import EngagementDispatcher = require("Engagement/Dispatcher");
import PageContexts = require("TestManagement/Scripts/TFS.TestManagement.Engagement.PageContexts");
import XTQuickStart_NO_REQUIRE = require("TestManagement/Scripts/TFS.TestManagement.QuickStart.XTPromotion");
import TestHubQuickStart_NO_REQUIRE = require("TestManagement/Scripts/TFS.TestManagement.QuickStart.TestHub");
import TraceabilityQuickStart_NO_REQUIRE = require("TestManagement/Scripts/TestReporting/Traceability/QuickStart");

class XTPromotionQuickStartPageContext implements PageContexts.IXTPromotionQuickStartPageContext {
    public getMarketPlaceIcon(): JQuery {
        return $(".bowtie-shop");
    }
}

class TraceabilityQuickStartPageContext implements PageContexts.ITraceabilityQuickStartPageContext {
    public getTestResultsDetailContainer(): JQuery {
        return $(".test-results-details-part");
    }

    public getAddLinkIcon(): JQuery {
        return $(".bowtie-link");
    }
}

export function registerXtQuickStart() {
    EngagementDispatcher.Dispatcher.getInstance().register(<Engagement.IEngagementModel>{
        id:  "XTPromotion",
        type: Engagement.EngagementType.QuickStart,
        model: EngagementDispatcher.lazyLoadModel(["TestManagement/Scripts/TFS.TestManagement.QuickStart.XTPromotion"], (XTQuickStart: typeof XTQuickStart_NO_REQUIRE) => {
            let pageContext = new XTPromotionQuickStartPageContext();
            return new XTQuickStart.XTPromotionQuickStartModel(pageContext);
        })
});
}

export function registerTestManagementQuickStart() {
    EngagementDispatcher.Dispatcher.getInstance().register({
        id: "TestManagement",
        type: Engagement.EngagementType.QuickStart,
        model: EngagementDispatcher.lazyLoadModel(["TestManagement/Scripts/TFS.TestManagement.QuickStart.TestHub"], (TestHubQuickStart: typeof TestHubQuickStart_NO_REQUIRE) => {
            return new TestHubQuickStart.QuickStartTestHubModel();
        })
    });
}

export function registerTraceabilityQuickStart() {
    EngagementDispatcher.Dispatcher.getInstance().register(<Engagement.IEngagementModel>{
        id: "TraceabilityQuickStart",
        type: Engagement.EngagementType.QuickStart,
        model: EngagementDispatcher.lazyLoadModel(["TestManagement/Scripts/TestReporting/Traceability/QuickStart"], (TraceabilityQuickStart: typeof TraceabilityQuickStart_NO_REQUIRE) => {
            let pageContext = new TraceabilityQuickStartPageContext();
            return new TraceabilityQuickStart.TraceabilityQuickStartModel(pageContext);
        })
    });
}

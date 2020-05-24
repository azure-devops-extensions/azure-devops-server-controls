import * as React from "react";
import * as ReactDOM from "react-dom";

import { Header } from "TfsCommon/Scripts/MobileNavigation/Header/Header";
import { checkForResolvedUrl } from "TfsCommon/Scripts/MobileNavigation/Model";
import { FastPageSwitchEvent, FastPageSwitchEventCompletedDetail } from "VSS/Platform/Context";

checkForResolvedUrl();

let mobileHeaderContainer : Element = null;
renderHeader();

document.body.addEventListener("fpsCompleted", (completedEvent: FastPageSwitchEvent<FastPageSwitchEventCompletedDetail>) => {
    if (completedEvent.detail.success) {
        renderHeader();
    }
});

function renderHeader() {
    if (mobileHeaderContainer) {
        ReactDOM.unmountComponentAtNode(mobileHeaderContainer);
        mobileHeaderContainer = null;
    }
    
    const container = document.querySelector(".mobile-header");
    if (container){
        ReactDOM.render(<Header />, container);
        mobileHeaderContainer = container;
    }
}

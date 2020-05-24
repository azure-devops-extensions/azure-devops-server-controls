/// <reference types="jquery" />
import * as Scroll from "OfficeFabric/Utilities";

import * as Q from "q";
import * as PageEvents from "VSS/Events/Page";
import * as EventServices from "VSS/Events/Services";
import { HubEventNames, HubsService, IHubEventArgs } from "VSS/Navigation/HubsService";
import * as Service from "VSS/Service";
import * as Context from "VSS/Context";
import * as Settings from "VSS/Settings";
import * as String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import * as Locations from "VSS/Locations";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import { MyExperiencesTelemetry } from "MyExperiences/Scripts/Telemetry";

import { RefitEventName as L1HubsRefitEventName } from "TfsCommon/Scripts/Navigation/L1.HubSelector";

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Shared/Header";

const bodySelector = "body";
const mainContainerSelector = ".main-container";
const mainSelector = mainContainerSelector + ">.main";
const headerSelector = mainContainerSelector + " .vsts-header";
const myExperiencePageClass = "my-experience-page";
const accountHomeScriptLoadedClass = "account-home-script-loaded";
const headerL1Selector = headerSelector + " .l1";
const headerRowSelector = headerL1Selector + " .header-row";
const headerL1MenuBarSelector = headerL1Selector + " .l1-menubar";
const headerRowHeightCollapsed: number = $(headerL1MenuBarSelector).height();
const leftSectionSelector = headerL1Selector + " .left-section";
const centerSectionSelector = headerL1Selector + " .center-section";
const rightSectionSelector = headerL1Selector + " .right-section";
const centerSectionMenuBarSelector = centerSectionSelector + " .hub-selector .menu-bar";
const centerSectionMenuBarPadding = 10;
const contentSelector = ".content-section";
const globalMessageSelector = mainSelector + " .global-message-section";

function getGreeting(): string {
    function getTimeAtBeginningOfDay(): Date {
        let time = new Date();
        time.setHours(0, 0, 0, 0);
        return time;
    }

    function checkAndSetIfAlreadyGreeted(): boolean {
        const settingKey = "BannerHeaderLastGreetedDate";
        let localSettings = Service.getLocalService(Settings.LocalSettingsService);
        let lastGreetedDateString = localSettings.read<string>(settingKey);
        localSettings.write(settingKey, new Date());
        if (!lastGreetedDateString) {
            return false;
        }
        let lastGreetedDate = new Date(lastGreetedDateString);
        let timeAtBeginningOfDay = getTimeAtBeginningOfDay();
        return (lastGreetedDate > timeAtBeginningOfDay);
    }

    function getGreetingForCurrentTimeOfDay(): string {
        const MORNING_BEGIN = 3;
        const AFTERNOON_BEGIN = 12;
        const EVENING_BEGIN = 17;

        let currentHours = new Date().getHours();
        if (currentHours >= MORNING_BEGIN && currentHours < AFTERNOON_BEGIN) {
            return MyExperiencesResources.BannerGreetingMorning;
        }
        if (currentHours >= AFTERNOON_BEGIN && currentHours < EVENING_BEGIN) {
            return MyExperiencesResources.BannerGreetingAfternoon;
        }
        return MyExperiencesResources.BannerGreetingEvening;
    }

    let greeting = checkAndSetIfAlreadyGreeted() ?
        MyExperiencesResources.BannerGreetingAlreadyGreeted :
        getGreetingForCurrentTimeOfDay();
    let name = Context.getDefaultWebContext().user.name;
    greeting = String.format(greeting, name);
    return greeting;
}

$(mainContainerSelector).scroll((ev: JQueryEventObject) => {
    addContainerCollapsingBehaviour();
    translateIfNeeded();
});


var wasCollapsed = false;

/**
 * overriding collapsing behaviour for the content section with the banner.
 */
function addContainerCollapsingBehaviour() {
    let isCollapsed = $(contentSelector).get(0).getBoundingClientRect().top <= headerRowHeightCollapsed;
    let $headerElement = $(headerSelector);
    $headerElement.toggleClass("collapsed", isCollapsed);
    let $errorMessageElement = $(globalMessageSelector);

    // Edge doesn't cleanly scroll to zero, so we need some bigger number for buffer.
    let isScrolled = $headerElement.get(0).getBoundingClientRect().top < -30;
    $headerElement.toggleClass("scrolled", isScrolled);
    $errorMessageElement.toggleClass("sticky", isCollapsed);


    if (wasCollapsed !== isCollapsed) {
        MyExperiencesTelemetry.LogHeaderCollapseToggle(isCollapsed);
        wasCollapsed = isCollapsed;
    }
}

function adjustElementsForScrollBar() {
    let scrollBarWidth = `${Scroll.getScrollbarWidth()}px`;
    $(rightSectionSelector).css({ "right": scrollBarWidth });
}

function translateIfNeeded() {
    // Take the size of project selector component (empty on-prem)
    let $leftSection = $(leftSectionSelector);
    let leftSectionRect = { right: 0, bottom: 0 };
    let childrenCount = $leftSection[0].children.length;

    // Get the bounding rect for the right most element in the left part.
    // Only right and bottom values are used.
    for (let childIndex = 0; childIndex < childrenCount; childIndex++) {
        leftSectionRect = $leftSection[0].children[childIndex].getBoundingClientRect();
    }

    let $centerSectionMenuBar = $(centerSectionMenuBarSelector);
    let menuBarRect = $centerSectionMenuBar[0].getBoundingClientRect();
    let previousTransform = $centerSectionMenuBar.css("transform");
    if ((menuBarRect.top <= leftSectionRect.bottom && menuBarRect.left <= leftSectionRect.right) || menuBarRect.top === 0) {
        $(headerRowSelector).toggleClass("full-expand", false);
        let translationAmount = leftSectionRect.right + centerSectionMenuBarPadding;
        $centerSectionMenuBar.css("transform", `translateX(${translationAmount}px)`);
    } else {
        // when not transform, we will fool the HubSelector so it will not collapse too aggressively when it has room
        $(headerRowSelector).toggleClass("full-expand", true);
        $centerSectionMenuBar.css("transform", "translateX(0px)");
    }

    if (previousTransform !== $centerSectionMenuBar.css("transform")) {
        // Fire event to get L1.Hubs refit
        EventServices.getService().fire(L1HubsRefitEventName);
    }
}

const resizeHandler = (ev: JQueryEventObject) => {
    /*
        Perform translation conditionally on resize, while on My Experience page. No-op custom handling on header in any other views.
        Note: Traditional optimal strategy would normally be to remove handler on PreXHRNavigate event...
        ..however, this approach requires a retrofit of all consumers to correspondingly request the use of My header,
        rather than current pattern of referring to this script from code/contribution, which would require reaction due to increased latency of header customization rendering.
    */
    if($(bodySelector).hasClass(myExperiencePageClass)) {
        translateIfNeeded();
    }
}

window.addEventListener("resize", resizeHandler);

function alignCenterSection() {
    translateIfNeeded();
}

function setGreeting() {
    let $headerElement = $(headerSelector);
    $headerElement.css("background-image", "url(" + Locations.urlHelper.getVersionedContentUrl("MyExperiences/account-home-background.png") + ")");
    $headerElement.attr("data-greeting", getGreeting());
}

function setMainContainerScrollable(): void {
    /**
     * VERY IMPORTANT
     * This is neccessary so that the Fabric Controls know's which element is the scrollable element
     */
    $(mainContainerSelector).attr(Scroll.DATA_IS_SCROLLABLE_ATTRIBUTE, "true");
}

// apply a containing class to the pages.
$(bodySelector).addClass(myExperiencePageClass);

// setup header.
addContainerCollapsingBehaviour();
adjustElementsForScrollBar();
alignCenterSection();
setGreeting();

// main content.
setMainContainerScrollable();

/*
 * This script has after effects on the style, and it loads after the css, which leads
 * to jarring flicker. To address this, the css will hide most of the elements until the
 * script is loaded. The css will know that the script is loaded by the presence of the
 * class we're adding below.
 */
$(headerSelector).toggleClass(accountHomeScriptLoadedClass, true);

MyExperiencesTelemetry.LogHubLoad(Service.getLocalService(HubsService).getSelectedHubId());
EventServices.getService().attachEvent(HubEventNames.PreXHRNavigate, (sender: any, args: IHubEventArgs) => {
    MyExperiencesTelemetry.LogHubSwitch(args.hubId);
});

PageEvents.getService().fire("nps-survey-page-ready");
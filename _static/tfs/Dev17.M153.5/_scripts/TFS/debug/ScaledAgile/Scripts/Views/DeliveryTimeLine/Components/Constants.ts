export namespace DeliveryTimeLineViewConstants {

    /**
     * Default start zoom level (zoomLevelMin + zoomStep).
     */
    export var zoomLevelDefault = 17;

    /**
     * Max level the zoom can go to
     */
    export var zoomLevelMax = 44;

    /**
     * Min level the zoom can go to 
     */
    export var zoomLevelMin = 8;

    /**
     * Step size for slider zoom controller.  zoomLevelMax - zoomLevelMin / 4 (steps) will equal the number of steps.  This number should divide the difference evenly. 
     */
    export var zoomStep = 9;

    /**
     * Default max number of cards displayed per iteration. This value should come from the svc but is here for now.
     */
    export var defaultMaxDisplayedCardsPerIteration = 10;

    /**
     * The minimum height for a single team row.
     */
    export var minHeightForSingleTeamRow = 600;

    /**
     * Set the width of team side bar to 150px. Components like calendarpan, intervals and sprint curtain use the value to shift to the right in ViewContent
     */
    export var teamSidebarWidth = 150;

    /**
     * Calendar pan width is used by both calendar pan and today marker
     */
    export var calendarPanWidthAndHeight = 24;

    /**
     * Calender pan button number of days to move per click
     */
    export var calendarPanNumberOfDays = 30;

    /**
     * The space between two months in pixel
     */
    export var spaceBetweenMonthInPixel = 1;

    /**
     * The space between two interval in pixel
     */
    export var spaceBetweenIntervalInPixel = 1;

    /**
     * Value to go pass to get the system trigger a notification in the Flux pipeline
     */
    export var viewportChangeThresholdPixel = 4;

    /**
     * Spacing margin between teams
     */
    export var teamMargin = 10;

    /**
     * Height reserved for the interval header. It contains the main name as well as the sub title (date) and "add" button
     */
    export var intervalHeaderHeight = 35;

    /**
     * Height of the interval summary. Contain the number of items inside the interval.
     */
    export var intervalSummaryHeight = 22;

    /**
     * Min width of the interval summary. Contain the number of items inside the interval.
     */
    export var intervalSummaryMinWidth = 22;

    /**
     * Max width of the interval summary. Contain the number of items inside the interval.
     */
    export var intervalSummaryMaxWidth = 25;

    /**
     * Max width of the interval summary when work item type icon is present. Contain the number of items inside the interval.
     */
    export var intervalSummaryWithIconMaxWidth = 35;

    /**
     * Width of the margin applied after the interval summary
     */
    export var intervalSummaryMarginRight = 4;

    /**
     * Width of the margin applied to the label of the interval summary
     */
    export var intervalSummaryLabelMarginRight = 10;

    /**
     * The general size of letters in the work item type labels
     */
    export var intervalSummaryWITTypeLabelLetterSize = 6;

    /**
     * Padding and margin value for interval. This is used between elements inside an interval
     * but also around the border of the interval.
     */
    export var intervalPadding = 10;

    /**
     * Space between each card
     */
    export var cardMargin = 10;

    /**
     * Height of the load more button
     */
    export var loadMoreHeight = 20;

    /**
     * This is the official value for left mouse value
     */
    export var leftButton = 1;

    /**
     * Amount of seperation between the timeline and the months above
     */
    export var timelineSeperationMargin = 10;

    /**
     * Threshold amount of pixels on the area for drag and pane on the edge of the viewport.
     */
    export var dragAndPanAreaThresholdPixel = 40;

    /**
     * Number of days to change the viewport when drag and pane on the edge of the viewport.
     */
    export var dragAndPanViewportChangeNumberOfDays = 3;

    /**
     * Teams margin top
     */
    export var teamsMarginTop = calendarPanWidthAndHeight + timelineSeperationMargin;

    /**
     * Margin/spacing between curtain and teams button and the main timeline region/months
     */
    export var leftCurtainMarginRight = 1;

    /**
     * height of the title and settings header at the top of the page
     */
    export var titleHeaderHeight = 40;

    /**
     * top position of teams vertical scrollbar
     */
    export var teamsVerticalScrollbarTop = teamsMarginTop;

    /**
     * Right hand margin for the overall plan area.
     */
    export var planMarginRight = 10;

    /**
     * Amount the today marker overlaps the title.
     */
    export var todayMarkerTitleOverlap = 21;

    /**
     * Amount the calendar marker top position above the plan view.
     */
    export var calendarMarkerTitleOverlap = 18;

    /**
     * Delta in pixel to identify whether the mouse movement is dragging the timeline or dragging an item.
     */
    export var mousemoveDelta = 10;

    export var minIntervalWidthCollapsedNewButton = 170;

    /**
     * The number of milliseconds to wait between recieving a zoom change event and firing the
     * "zoom finished" action.
     */
    export const delayBeforeZoomFinishedMs = 500;
}

/**
 * Constants for class name used in delivery timeline.
 */
export namespace DeliveryTimeLineViewClassNameConstants {
    export var main = "main";
    export var deliveryTimeline = "delivery-timeline";
    export var scrollingIntervalsCurtain = "scrolling-intervals-curtain";
    export var card = "card";
    export var propagateKeydownEvent = "propagate-keydown-event";
}

/**
 * Constants for class name used in delivery timeline.
 */
export namespace DragDropZoneEnclosureConstants {
    export var CONTEXT_ID_ADDITIONAL_FIELD_CONFIGURATION = "cardadditionalfield";
    export var CONTEXT_ID_TEAMS_CONFIGURATION = "teamsettings";
    export var CONTEXT_ID_DELIVERY = "delivery";
}
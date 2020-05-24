/**
 * This module contains all the PageContexts to be used in creating engagement
 * controls. These are usually JQuery selectors and references to the page
 * elements. They could also contains event objects to synchronize the page
 * elements and the engagement controls.
 * 
 * The assignments to the actual values should be placed in the class that
 * represents the page, in order to make use of existing JQuery objects and
 * help improve performance.
 *
 * When in doubt, consult VSCS Engagement Team <vsacquisition@microsoft.com>
 */

export interface IXTPromotionQuickStartPageContext {
    getMarketPlaceIcon(): JQuery;
}

export interface ITraceabilityQuickStartPageContext {
    getTestResultsDetailContainer(): JQuery;
    getAddLinkIcon(): JQuery;
}
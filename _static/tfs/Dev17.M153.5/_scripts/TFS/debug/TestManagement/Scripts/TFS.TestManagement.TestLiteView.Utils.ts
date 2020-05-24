import Controls = require("VSS/Controls");
import Service = require("VSS/Service");
import Navigation = require("VSS/Controls/Navigation");
import Menus = require("VSS/Controls/Menus");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Contributions_Services = require("VSS/Contributions/Services");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Utils_String = require("VSS/Utils/String");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");

import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");

export class TestLiteViewUtils {
    public static hideViewGrid(filters: TCMLite.Filters, testPointsToolbar: Menus.MenuBar, iterationHelper: any, testPaneHelper: any, element: any) {

        testPointsToolbar.hideElement();
        TestLiteViewUtils.hideViewGridFilters(filters, testPaneHelper);
        TestLiteViewUtils.setVisibility(TCMLite.GridAreaSelectors.viewGrid, false, element);
        TestLiteViewUtils._hideIterationDates(iterationHelper);
        TestLiteViewUtils._hidePointsCount();
    }

    public static hideViewGridFilters(filters: TCMLite.Filters, testPaneHelper: any, hideViewFilter?: boolean) {
        if (filters) {
            if (filters.outcomeFilter) {
                filters.outcomeFilter.hideElement();
            }
            if (filters.testerFilter) {
                filters.testerFilter.hideElement();
            }
            if (filters.configurationFilter) {
                filters.configurationFilter.hideElement();
            }
            if (filters.viewFilter && hideViewFilter) {
                filters.viewFilter.hideElement();
            }

            if (testPaneHelper) {
                testPaneHelper.saveAndClearPaneFilter();
            }
        }
    }

    public static setVisibility(selector: string, visible: boolean, element: any) {
        let $control = element.find(selector);
        if (visible) {
            $control.show();
        }
        else {
            $control.hide();
        }
    }

    public static showCount(totalPointCount: number, pointCount: number, isFilterApplied: boolean){
           if (!TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isPointCountFeatureDisabled()){
               return;
           }

           if (isFilterApplied){
               this._appendCountData(Utils_String.format(Resources.ShowTestPointsCountOnFilter, pointCount, totalPointCount));
           } else{
               this._appendCountData(Utils_String.format(Resources.ShowTestPointsCount, totalPointCount));
           }
           this.cachedPointsCount = pointCount;
           this.cachedTotalPointsCount = totalPointCount;
    }


    /**
     * Assigns the appropriate sequence numbers to the given test points.
     */
    public static modifySequenceNumber(testPoints: any[]) {

        let sequenceNumbers: number[] = [];
        let i: number;
        let length = testPoints ? testPoints.length : 0;
        if (testPoints && length > 0) {

            for (i = 0; i < length; i++) {
                if (sequenceNumbers.indexOf(testPoints[i].sequenceNumber) < 0) {
                    sequenceNumbers.push(testPoints[i].sequenceNumber);
                }
            }

            //sort the sequence numbers in ascending orders
            sequenceNumbers.sort(function (a, b) { return a - b; });

            //Create a map of original sequnce number and sequence number to store
            let map = {};
            for (i = 0; i < length; i++) {
                map[sequenceNumbers[i]] = i + 1;
            }

            for (i = 0; i < length; i++) {
                testPoints[i].sequenceNumber = map[testPoints[i].sequenceNumber];
            }
        }
    }

    /**
     * Maps the new test suite model to old test suites model.
     * @param testSuite
     */
    public static mapSuitesToLegacyModel(testSuite: any) {
        if (!testSuite) {
            return testSuite;
        }
        testSuite.type = parseInt(testSuite.suiteType);
        testSuite.title = testSuite.name;

        return testSuite;
    }

    public static displayContributedTab(contributionId: string, contributionContext: any): void {
        let $pivotView = $("." + this.tabViewClass);
        let pivotView = <Navigation.PivotView>Controls.Enhancement.enhance(Navigation.PivotView, $pivotView);
        pivotView.refreshContributedItems().then(() => {
            //Select the pivot view
            pivotView.setSelectedView(pivotView.getView(contributionId));
            let $hubPivotElement = $("." + this.hubPivotContentClass);

            //Create container for the tab
            let $contributedContent = $("." + this.contributableContainerClassName);
            if (!$contributedContent || $contributedContent.length === 0) {
                $contributedContent = $("<div />").addClass(this.contributableContainerClassName);
                $contributedContent.appendTo($hubPivotElement);
            }
            else {
                $contributedContent.empty();
            }

            //Create extension host and pass contribution context
            Contributions_Controls.createExtensionHost($contributedContent, contributionId, contributionContext).then((host) => {

                //Once the host is available get the contribution instance and update the page title
                Service.getService(Contributions_Services.ExtensionService).getContribution(contributionId).then((contribution) => {
                    host.getRegisteredInstance<IContributedTab>(contribution.properties["registeredObjectId"] || contribution.id).then((instance) => {
                        let pageTitle = (instance.pageTitle || instance.name) || contribution.properties["name"];
                        let pageTitlePromise;
                        if (typeof pageTitle === "function") {
                            pageTitlePromise = pageTitle(contributionContext);
                        } else {
                            pageTitlePromise = Q.resolve(pageTitle);
                        }
                        pageTitlePromise.then((title) => {
                            this._setPageTitle(this.pageTitleClass, title, title);
                        });
                    });
                });
            });

            $contributedContent.show();
        });
    }

    public static hideContributedTab(): void {
        let $contributedContent = $("." + this.contributableContainerClassName);
        $contributedContent.hide();
    }

    /** Sets page title */
    private static _setPageTitle(pageTitleClass: string, pageTitle: string, pageTooltip: string) {
        let $titleDiv = $("." + pageTitleClass);

        $titleDiv.text(pageTitle);
        RichContentTooltip.addIfOverflow(pageTooltip, $titleDiv);

        document.title = pageTitle;
    }

    private static _hideIterationDates(iterationHelper) {
        if (iterationHelper) {
            iterationHelper.clearIterationDatesSpan();
        }
    }

    private static _appendCountData(countContent: string) {
        if (!this._countSpan) {
            this._countSpan = $("<div class='test-point-count' />")
                .insertBefore(".hub-title")
                .addClass("hub-title-right");
        }
        
        this._countSpan.text(countContent);
        this._countSpan.show();
    }

    private static _hidePointsCount(){
        if (TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isPointCountFeatureDisabled()){
               let countSpan = $("div.test-point-count");
               if (countSpan){
                   countSpan.hide();
               }
         }
    }

    public static tabViewClass = "test-items-tabs";
    static hubPivotContentClass = "hub-pivot-content";
    static contributableContainerClassName = "contributed-tab-content-container";
    static pageTitleClass = "hub-title";

    public static cachedTotalPointsCount;
    public static cachedPointsCount;

    private static _countSpan;
}
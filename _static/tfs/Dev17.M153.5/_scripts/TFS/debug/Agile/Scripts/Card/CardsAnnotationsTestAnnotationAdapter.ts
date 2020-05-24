///<amd-dependency path="VSS/Utils/Draggable"/>
import ko = require("knockout");

import Agile_Annotations = require("Agile/Scripts/Card/CardsAnnotationsCommon");
import Agile_Controls_Resources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");

import VSS_Controls = require("VSS/Controls");
import VSS_Core = require("VSS/Utils/Core");
import VSS_Utils_UI = require("VSS/Utils/UI");

import Models = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationModels");
import Source = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationSource");
import Badge = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationBadge");
import View = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationView");
import ViewModels = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationViewModels");
import Telemetry = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationTelemetry");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

TFS_Knockout.overrideDefaultBindings()

var delegate = VSS_Core.delegate;
var domElem = VSS_Utils_UI.domElem;

export var testAnnotationId = "Microsoft.VSTS.TestManagement.TestAnnotation";

export class TestAnnotationAdapter extends Agile_Annotations.AnnotationAdapter {

    private _testSuiteControl: View.TestSuiteControl;

    constructor(options: Agile_Annotations.IAnnotationAdapterOptions) {
        super($.extend(options, {
            id: testAnnotationId,
            priority: 20,
            $annotationDetailPaneContainer: $(domElem("div", "testlist-action-pane")),
            $badgeContainer: $(domElem("div", "badge testlist-badge"))
        }));

        this._registerCardMenuItem();
    }

    public refreshAnnotation() {
        var suite = this._fetchSuite();

        // remove if no suite exists or test points count == 0
        if (!suite || suite.testPoints().length === 0) {
            this.dispose();
        } else {
            this._refreshBadge();
            VSS_Core.delay(this, 0, () => {
                if (this._testSuiteControl) {
                    this._testSuiteControl.refresh();
                }
            });
        }
    }

    public dispose() {
        super.dispose();
        this._removeTestSuiteControl();

        if (this.badgeControl) {
            this.badgeControl.dispose();
        }

    }

    private _getItemSource(): Source.TestSuiteSource {
        return <Source.TestSuiteSource>this.options.source.getAnnotationItemSource(Source.TestSuiteSource.sourceType);
    }

    private _registerCardMenuItem() {
        this.menuItems.push({
            id: "add-test",
            text: Agile_Controls_Resources.TestAnnotation_CardMenu_AddTest,
            icon: "bowtie-icon bowtie-math-plus",
            groupId: "modify",
            setTitleOnlyOnOverflow: true,
            action: () => {
                this._onAddTestMenuItemClick();
            }
        });
    }

    private _onAddTestMenuItemClick() {
        if (!this.$annotationDetailPaneControl) {

            //create new suite model if none exists
            if (!this._fetchSuite()) {
                this._getItemSource().addItem(this._getRequirementId(), new Models.TestSuiteModel());
            }

            this._createTestSuiteControl().then(() => {
                this._testSuiteControl.viewModel.addTestPoint();
            });
        } else {
            this._testSuiteControl.viewModel.addTestPoint();
        }

        Telemetry.TelemeteryHelper.publishFeatureTelemetry(Telemetry.FeatureScenarios.AddTest, { "Source": "CardContextMenu" });
    }


    private _onAnnotationClick(e) {
        if (!this.$annotationDetailPaneControl) {
            this._createTestSuiteControl();
        } else {
            this._removeTestSuiteControl();
        }

        Telemetry.TelemeteryHelper.publishFeatureTelemetry(Telemetry.FeatureScenarios.BadgeClick, { "Action": "Click" });

        e.preventDefault();
    }

    private _createBadge() {
        this.badgeControl = VSS_Controls.Control.create(Badge.TestAnnotationBadge, this.options.$badgeContainer, <Agile_Annotations.IAnnotationBadgeOptions>{
            cssClass: "child-tests-summary",
            $annotationIcon: $("<span>"),
            clickEventHandler: delegate(this, this._onAnnotationClick),
            source: this.options.source
        });
    }

    private _refreshBadge() {
        if (!this.badgeControl) {
            if (this._fetchSuite() && this._fetchSuite().testPoints && this._fetchSuite().testPoints().length > 0) {
                this._createBadge();
                if (this.$annotationDetailPaneControl) {
                    this.badgeControl.applySelectedStyle();
                }
            }
        }
        else {
            if (!this._fetchSuite().testPoints || this._fetchSuite().testPoints().length === 0) {
                this.badgeControl.dispose();
                this.badgeControl = null;
            } else {
                this.badgeControl.update(this.options.source);
            }
        }
    }

    private _createTestSuiteControl(): IPromise<any> {
        return this._getItemSource().getDefaultTestCaseWorkItemType().then((testCaseWorkItemType) => {
            // Remove testSuiteControl, if exist, before creating new testSuiteControl
            this._removeTestSuiteControl();

            var $container = $("<div/>");

            var options: View.ITestSuiteControlOptions = {
                source: this.options.source,
                defaultTestWorkItemType: testCaseWorkItemType,
                refreshBadge: delegate(this, this._refreshBadge),
                removeTestSuiteControl: delegate(this, this._removeTestSuiteControl)
            };

            this._testSuiteControl = VSS_Controls.Control.create(View.TestSuiteControl, $container, options);

            this.createDetailPane($container);

            this._testSuiteControl.focus();
        });
    }

    private _removeTestSuiteControl() {

        if (this._testSuiteControl) {
            if (this.$annotationDetailPaneControl && this.$annotationDetailPaneControl.length > 0) {
                ko.removeNode(this.$annotationDetailPaneControl[0]);
            }

            this._testSuiteControl.dispose();
            this._testSuiteControl = null;
            this.removeDetailPane();
            this.setFocusToTile();
        }
    }

    private _fetchSuite(): Models.ITestSuiteModel {
        const itemSource = this._getItemSource();
        if (itemSource) {
            return itemSource.getItem(this.options.source.id());
        }
        else {
            return null;
        }
    }

    private _getRequirementId(): number {
        return this.options.source.id();
    }

    public acceptHandler($testPoint: JQuery): boolean {

        if (!$testPoint.hasClass(View.DragDropBindingConstants.TEST_POINT_CLASS)) {
            return false;
        }

        var testPointViewModel: ViewModels.TestPointViewModel = $testPoint.data(View.DragDropBindingConstants.DataKeyDraggableItem);
        var sourceSuite: ViewModels.TestSuiteViewModel = $testPoint.data(View.DragDropBindingConstants.DataKeyDroppableItem);
        // don't accept if item gets dropped on its parent
        if (testPointViewModel && sourceSuite) {

            var sourcerequirementId = sourceSuite.getRequirementId();
            var targetRequirementId = this.options.source.id();

            return !(sourcerequirementId === targetRequirementId);
        }
        return false;
    }

    public dropHandler(event: JQueryEventObject, ui: any) {
        var target = this;
        var itemVM: ViewModels.TestPointViewModel = ui.draggable.data(View.DragDropBindingConstants.DataKeyDraggableItem);
        var sourceSuite: ViewModels.TestSuiteViewModel = ui.draggable.data(View.DragDropBindingConstants.DataKeyDroppableItem);
        var targetSuite: ViewModels.TestSuiteViewModel;
        var removeLinkToExistingStory: boolean = !(event.ctrlKey || event.metaKey);

        // if test suite Control is present update immediately
        if (target._testSuiteControl && target._testSuiteControl.viewModel) {
            targetSuite = target._testSuiteControl.viewModel;
        }

        if (targetSuite) {
            targetSuite.dropHandler(itemVM, sourceSuite, removeLinkToExistingStory, sourceSuite.testPointCollection.length);
        } else {
            var targetRequirementId: number = target.options.source.id();
            var sourceRequirementId: number = sourceSuite.getRequirementId();

            if (targetRequirementId > 0 && itemVM) {
                sourceSuite.onTestPointDrop(itemVM, sourceRequirementId, targetRequirementId, removeLinkToExistingStory).then(() => {
                    sourceSuite.refreshSuite();

                    target._getItemSource().refreshItem(targetRequirementId).then(() => {
                        target._refreshBadge();
                    });
                });
            }
        }

        ui.draggable.data(View.DragDropBindingConstants.DataKeyItemDroppedOnTile, true);
    }

}



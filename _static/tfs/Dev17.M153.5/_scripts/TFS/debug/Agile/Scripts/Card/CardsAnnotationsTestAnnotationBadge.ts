import Agile_Annotations = require("Agile/Scripts/Card/CardsAnnotationsCommon");
import Agile_Boards = require("Agile/Scripts/TFS.Agile.Boards");
import Agile_Controls_Resources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");

import VSS_Utils_String = require("VSS/Utils/String");

import Models = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationModels");
import Source = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationSource");
import Contracts = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationContracts");

import { RichContentTooltip } from "VSS/Controls/PopupContent";

type ITestSuiteModel = Models.ITestSuiteModel;
type ITestPointModel = Models.ITestPointModel;
type TestSuiteSource = Source.TestSuiteSource;

var sourceType = Source.TestSuiteSource.sourceType;

export interface ITestAnnotationBadgeOptions extends Agile_Annotations.IAnnotationBadgeOptions {
    source: Agile_Boards.WorkItemItemAdapter;
}

export class TestAnnotationBadge extends Agile_Annotations.AnnotationBadge {
    private $content: JQuery;
    private $status: JQuery;
    private $statusDot: JQuery;
    private $statusBadge: JQuery;
    public $errorMessageIcon: JQuery;
    private _errorMessageTooltip: RichContentTooltip;
    private _summaryTooltip: RichContentTooltip;

    constructor(options: ITestAnnotationBadgeOptions) {
        super(options);
    }

    public createLayout() {
        super.createLayout();
        this._addErrorMessageIcon();
        this._addStatusIcon();
        this._addTextContainer();
        this._refresh();
    }

    public dispose(): void {
        super.dispose();
        if (this._errorMessageTooltip) {
            this._errorMessageTooltip.dispose();
            this._errorMessageTooltip = null;
        }

        if (this._summaryTooltip) {
            this._summaryTooltip.dispose();
            this._summaryTooltip = null;
        }
    }

    public update(source: Agile_Boards.WorkItemItemAdapter) {
        this._refresh();
    }

    private _refresh() {
        this._setError();
        this._setStatus();
        this._setText();
    }

    private _addErrorMessageIcon() {
        this.$errorMessageIcon = $("<div>").addClass("error-message-icon bowtie-icon bowtie-status-error");
        this.$container[0].appendChild(this.$errorMessageIcon[0]);
    }

    private _addStatusIcon() {
        var $badge = $('<span><span class="bowtie-icon bowtie-test-fill"></span><span class="status-badge"><span class="bowtie-stack"><span class="bowtie-icon status-white-icon"></span><i class="bowtie-icon status-icon"></i></span></span></span>')

        this.$container[0].appendChild($badge[0]);

        this.$statusBadge = $badge.find("span.status-badge");
        this.$statusDot = $badge.find("span.status-white-icon");
        this.$status = $badge.find("i.status-icon");
    }

    private _addTextContainer() {
        this.$content = $("<span>").addClass("work-item-summary-text");
        this.$container[0].appendChild(this.$content[0]);
    }

    private _setText() {
        var passedCount = 0;
        var failedCount = 0;
        var othersCount = 0;

        var suite = this._fetchSuite();
        $.each(suite.testPoints(), (index: number, testPoint: ITestPointModel) => {
            if (testPoint.outcome() === Contracts.TestOutcome.Passed) {
                passedCount++;
            }
            else if (testPoint.outcome() === Contracts.TestOutcome.Failed) {
                failedCount++;
            }
            else {
                othersCount++;
            }
        });

        var totalTests = suite.testPoints().length;
        this.$content
            .text(totalTests);

        var toolTipText = VSS_Utils_String.format(Agile_Controls_Resources.TestAnnotation_Badge_Tooltip, passedCount, failedCount, othersCount);
        if (this._summaryTooltip) {
            this._summaryTooltip.setTextContent(toolTipText);
        }
        else {
            this._summaryTooltip = RichContentTooltip.add(toolTipText, this.$container, { setAriaDescribedBy: true });
        }
    }

    private _setStatus() {
        var passedCount = 0;
        var hasFailure = false;
        var suite = this._fetchSuite();
        $.each(suite.testPoints(), (index: number, testPoint: ITestPointModel) => {
            if (testPoint.outcome() === Contracts.TestOutcome.Passed) {
                passedCount++;
            }
            if (testPoint.outcome() === Contracts.TestOutcome.Failed) {
                hasFailure = true;
                return false;
            }
        });

        this.$statusDot.removeClass("bowtie-dot white");
        this.$status.removeClass("bowtie-status-success success");
        this.$status.removeClass("bowtie-status-failure fail");

        if (hasFailure) {
            this.$statusDot.addClass("bowtie-dot white");
            this.$status.addClass("bowtie-status-failure fail");
            this.$statusBadge.show();
            return;
        }

        var totalTests = suite.testPoints().length;

        if (passedCount === totalTests) {
            this.$statusDot.addClass("bowtie-dot white");
            this.$status.addClass("bowtie-status-success success");
            this.$statusBadge.show();
            return;
        }

        this.$statusBadge.hide();

    }

    private _setError() {
        var errorMessage = this._getErrorMessage(this._fetchSuite().testPoints());

        if (this._errorMessageTooltip) {
            this._errorMessageTooltip.setTextContent(errorMessage);
        }
        else {
            this._errorMessageTooltip = RichContentTooltip.add(errorMessage, this.$errorMessageIcon, { setAriaDescribedBy: true });
        }
        if (errorMessage) {
            // JQuery's toggle function sets the display to block, so set it to inline-block explicitly, instead of using "toggle(this._hasError)"
            this.$errorMessageIcon.addClass("show");
        }
        else {
            this.$errorMessageIcon.removeClass("show");
        }
    }

    private _fetchSuite(): ITestSuiteModel {
        return (<TestSuiteSource>(<ITestAnnotationBadgeOptions>this._options).source.getAnnotationItemSource(sourceType)).getItem((<ITestAnnotationBadgeOptions>this._options).source.id());
    }

    private _getErrorMessage(items: ITestPointModel[]): string {
        // Show the first error message, in case of multiple errors
        var message: string;
        if (items) {
            for (var i = 0, len = items.length; i < len; i++) {
                message = items[i].errorMessage();
                if (message) {
                    break;
                }
            }
        }
        return message;
    }
}



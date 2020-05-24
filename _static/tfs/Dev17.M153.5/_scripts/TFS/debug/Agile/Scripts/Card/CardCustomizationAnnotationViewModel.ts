/// <reference types="jquery" />

import StyleCustomization_NO_REQUIRE = require("Agile/Scripts/Card/CardCustomizationStyle");
import Cards_NO_REQUIRE = require("Agile/Scripts/Card/Cards");

import ko = require("knockout");
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import VSS_Utils_String = require("VSS/Utils/String");

import { RuleType } from "Agile/Scripts/Card/CardCustomizationStyle";
import { Board } from "Agile/Scripts/TFS.Agile.Boards";
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

TFS_Knockout.overrideDefaultBindings()

/**
 * The view model for the collection of annotation rules in the card settings for a board
 */
export class AnnotationCollectionViewModel {
    public annotationRulesUpdatedDelegate: (isDirty: boolean, isValid: boolean) => void;
    public availableAnnotations: KnockoutObservableArray<AnnotationViewModel> = ko.observableArray<AnnotationViewModel>([]);
    public isDirty: KnockoutComputed<boolean>;
    public isValid: KnockoutComputed<boolean>;
    public isEditable: KnockoutObservable<boolean> = ko.observable(false);
    public annotationsLimitReached: KnockoutComputed<boolean>;

    public static MAX_ANNOTATION_LIMIT: number = 5;

    constructor(annotations: Cards_NO_REQUIRE.IStyleRule[], isEditable: boolean = true) {
        for (let i = 0, length = annotations.length; i < length; i++) {
            this.availableAnnotations.push(new AnnotationViewModel(annotations[i]));
        }

        this.annotationsLimitReached = ko.computed(() => {
            const annotations = this.availableAnnotations();
            let numEnabled = 0;
            for (let i = 0, length = annotations.length; i < length; i++) {
                if (annotations[i].isOn()) {
                    numEnabled++;
                }
            }
            return numEnabled >= AnnotationCollectionViewModel.MAX_ANNOTATION_LIMIT;
        });

        this.isDirty = ko.computed(() => {
            let modified: boolean = false;
            const annotations = this.availableAnnotations();
            for (let i = 0, length = annotations.length; i < length; i++) {
                if (annotations[i].isDirty()) {
                    modified = true;
                }
            }

            if (this.annotationRulesUpdatedDelegate) {
                this.annotationRulesUpdatedDelegate(modified, this.isValid());
            }

            return modified;
        });

        this.isValid = ko.computed(() => {
            const annotations = this.availableAnnotations();
            let numEnabled = 0;
            for (let i = 0, length = annotations.length; i < length; i++) {
                if (annotations[i].isOn()) {
                    numEnabled++;
                }
            }

            return numEnabled <= AnnotationCollectionViewModel.MAX_ANNOTATION_LIMIT;
        });

        this.isEditable(isEditable);
    }

    public dispose(): void {
        this.availableAnnotations.removeAll().forEach((annotation: AnnotationViewModel) => {
            annotation.dispose();
        });

        if (this.isDirty !== undefined) {
            this.isDirty.dispose();
        }
    }

    /**
     * Get Annotation settings to be saved to server
     */
    public getAnnotationSettings(): StyleCustomization_NO_REQUIRE.IBaseStyleRule[] {
        let rules: StyleCustomization_NO_REQUIRE.IBaseStyleRule[] = [];
        let annotations = this.availableAnnotations();

        for (let i = 0, length = annotations.length; i < length; i++) {
            let annotationViewModel: AnnotationViewModel = annotations[i];
            let rule: StyleCustomization_NO_REQUIRE.IBaseStyleRule = {
                isEnabled: annotationViewModel.isOn(),
                name: annotationViewModel.getId(),
                type: RuleType.ANNOTATION
            };

            rules.push(rule);
        }

        return rules;
    }
}

/**
 * The view model for a annotation rule shown in the card settings for a board
 */
export class AnnotationViewModel {
    public iconControl: string;
    public isDirty: KnockoutComputed<boolean>;
    public isOn: KnockoutObservable<boolean> = ko.observable(true);
    public name: string;
    public ariaLabel: string;

    private _id: string;

    constructor(annotation: Cards_NO_REQUIRE.IStyleRule) {
        this._id = annotation.name;

        let iconHtml = Board.BoardAnnotationSettings.getPreviewIcon(this._id)[0].outerHTML;
        this.iconControl = iconHtml;

        this.isDirty = ko.computed(() => {
            return annotation.isEnabled !== this.isOn();
        });

        this.isOn(annotation.isEnabled);
        this.name = Board.BoardAnnotationSettings.getDisplayName(this._id);
        this.ariaLabel = VSS_Utils_String.format(AgileControlsResources.Annotation_Checkbox_Label, this.name);
    }

    public dispose(): void {
        if (this.isDirty !== undefined) {
            this.isDirty.dispose();
        }
    }

    /**
     * Get the annotation id to be stored in server.
     * We are not storing name displayed in the settings page as the name can be
     * diffirent for different boards for the same annotation as in case of checklist
     */
    public getId(): string {
        return this._id;
    }
}

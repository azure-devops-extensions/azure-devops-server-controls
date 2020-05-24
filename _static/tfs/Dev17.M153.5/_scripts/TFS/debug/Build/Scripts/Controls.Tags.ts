/// <reference types="jquery" />

import ko = require("knockout");

import Context = require("Build/Scripts/Context");
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import TFS_TagService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TagService");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Controls = require("VSS/Controls");
import VSS = require("VSS/VSS");

import Tags = require("WorkItemTracking/Scripts/TFS.UI.Tags");

export interface TagControlOptions extends Tags.ITagControlOptions {
    beginGetSuggestedValues?: (callback: (tagNames: string[]) => void) => void;
}

interface TagChangeEventArgs {
    name: string;
    type: Tags.TagChangeType;
}

export class TagsViewModel extends Adapters_Knockout.TemplateViewModel {
    public options: TagControlOptions;
    public tags: KnockoutObservableArray<string> = ko.observableArray([]);

    private _suggestedTagsPromise: IPromise<string[]>;

    constructor(options?: TagControlOptions) {
        super();

        this.options = {
            addButtonText: BuildResources.AddTagLabel,
            selectable: true,
            ...options
        };
    }

    public getSuggestedTags(): IPromise<string[]> {
        if (!this._suggestedTagsPromise) {
            this._suggestedTagsPromise = Context.viewContext.buildClient.getSuggestedTags();
        }

        return this._suggestedTagsPromise;
    }

    public setReadOnly(value: boolean): void {
        this.options.readOnly = value;
    }
}

export class TagsControl extends Adapters_Knockout.TemplateControl<TagsViewModel> {
    private _tagsControl: Tags.TagControl;

    constructor(viewModel: TagsViewModel) {
        super(viewModel, viewModel.options as any);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            useDeleteExperience: true,
            beginGetSuggestedValues: (callback) => {
                this.getViewModel().getSuggestedTags().then(
                    (tags: string[]) => {
                        callback(tags);
                    },
                    () => {
                        callback([]);
                    });
            }
        }, options));
    }

    public focusAddButton() {
        this._tagsControl.focusAddButton();
    }

    initialize(): void {
        const tagsElement = $("<div />").appendTo(this.getElement());
        const viewModel = this.getViewModel();

        // the tags control will use the ObservableArray's underlying array
        this._options.tags = viewModel.tags();

        this._tagsControl = <Tags.TagControl>Controls.BaseControl.createIn(Tags.TagControl, tagsElement, this._options);

        this.subscribe(viewModel.tags, (newValue: string[]) => {
            this._tagsControl.setItems(newValue);
        });

        this._tagsControl._bind("change", (event: JQueryEventObject, args: TagChangeEventArgs) => {
            viewModel.tags.valueHasMutated();

            if (args.type === Tags.TagChangeType.Add) {
                this._fire("add", args.name);
            }
            else if (args.type === Tags.TagChangeType.Delete) {
                this._fire("delete", args.name);
            }
        });
    }
}

Adapters_Knockout.TemplateControl.registerBinding("buildvnext_tags", TagsControl, (context?: any): TagsViewModel => {
    return new TagsViewModel();
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Controls.Tags", exports);

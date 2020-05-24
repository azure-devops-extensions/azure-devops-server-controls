import * as Controls from "VSS/Controls";
import * as Diag from "VSS/Diag";
import { shallowEquals } from "VSS/Utils/Array";
import * as Tags from "WorkItemTracking/Scripts/TFS.UI.Tags";

import * as React from "react";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import { autobind } from "OfficeFabric/Utilities";
import "VSS/LoaderPlugins/Css!VersionControl/PullRequestLabelsList";
import "VSS/LoaderPlugins/Css!WorkItemArea";

export interface IPullRequestLabelsProps {
    labels: string[];
    readOnly?: boolean;
    useDeleteExperience?: boolean;
    selectable?: boolean;
    /**
     * Max width of the list of labels. If specified, a ellipsis can be rendered if necessary
     * to display the labels that overflow.
     */
    maxWidth?: number;
    onNewLabel?(name: string): void;
    onRemoveLabel?(name: string): void;
    beginGetSuggestedLabels?(callback: (tagNames: string[]) => void): void;
    onError?(error: Error, component: string): void;
}

interface TagChangeEventArgs {
    name: string;
    type: Tags.TagChangeType;
}

export class LabelsComponent extends React.Component<IPullRequestLabelsProps, {}> {
    public render(): JSX.Element {
        return <TagControlWrapper {...this.props} />;
    }

    public shouldComponentUpdate(nextProps: IPullRequestLabelsProps): boolean {
        return !shallowEquals(nextProps.labels, this.props.labels) ||
            nextProps.readOnly !== this.props.readOnly ||
            nextProps.useDeleteExperience !== this.props.useDeleteExperience ||
            nextProps.selectable !== this.props.selectable ||
            nextProps.maxWidth !== this.props.maxWidth;
    }

    public componentDidCatch(error: Error, info: any) {
        if (error) {
            Diag.logError(`${error.message} ${error.stack}`);
            if (this.props.onError) {
                this.props.onError(error, "LabelsComponent");
            }
        }
    }
}

export class TagControlWrapper extends React.Component<IPullRequestLabelsProps, {}> {
    private _tagsControl: Tags.TagControl;
    private _options: Tags.ITagControlOptions;
    private _sectionRef: Element;

    constructor(labelProps: IPullRequestLabelsProps) {
        super(labelProps);
    }

    public render(): JSX.Element {
        return (
            <div
                className="pullrequest-labels-section"
                ref={this._addRef}/>
        );
    }

    @autobind
    private _addRef(section: Element) {
        this._sectionRef = section;
    }

    @autobind
    public initializeOptions(options?: Tags.ITagControlOptions) {
        this._options =
        {
            addButtonText: VCResources.PullRequest_Labels_Add_Label,
            selectable: this.props.selectable != null ? this.props.selectable : true,
            useDeleteExperience: this.props.useDeleteExperience != null ? this.props.useDeleteExperience : false,
            readOnly: this.props.readOnly != null ? this.props.readOnly : true,
            beginGetSuggestedValues: this.props.beginGetSuggestedLabels,
            addTagTextOnChange: true,
            unsorted: false,
            ...options
        };

        if (this.props.maxWidth) {
            this._options.type = "single.line";
            this._options.maxWidth = this.props.maxWidth;
        }
    }

    public componentDidMount() {
        this.initialize();
    }

    public componentDidUpdate() {
        this._tagsControl.setItems(this.props.labels);
    }

    @autobind
    public initialize(): void {
        this.initializeOptions({tags:  this.props.labels});
        this._tagsControl = Controls.BaseControl.createIn(Tags.TagControl, this._sectionRef, this._options) as Tags.TagControl;
        this._tagsControl._bind("change", (event: JQueryEventObject, args: TagChangeEventArgs) => {
            if (args.type === Tags.TagChangeType.Add) {
                this.props.onNewLabel(args.name);
                event.preventDefault();
            }
            else if (args.type === Tags.TagChangeType.Delete) {
                this.props.onRemoveLabel(args.name);
            }
        });
    }
}

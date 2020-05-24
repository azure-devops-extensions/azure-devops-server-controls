
import Controls = require("VSS/Controls");
import { TagControl, ITagControlOptions } from "WorkItemTracking/Scripts/TFS.UI.Tags";
import { LegacyComponent, ILegacyComponentProps, ILegacyComponentState } from "Presentation/Scripts/TFS/Components/LegacyComponent";

export interface ITagsProps extends ILegacyComponentProps {
    value: string;
    maxWidth: number;
    maxTags?: number;
    maxCharacterLength?: number;
}

export interface ITagsState extends ILegacyComponentState {
}

export class Tags extends LegacyComponent<TagControl, ITagsProps, ITagsState> {

    public shouldComponentUpdate(nextProps: ITagsProps, nextState: ITagsState): boolean {
        return this.props.value !== nextProps.value || (this.props.maxWidth !== nextProps.maxWidth);
    }

    public createControl(element: HTMLElement, props: ITagsProps, state: ITagsState): TagControl {
        let tags = props.value ? props.value.split(/[,;]/) : [];
        tags = tags.map(t => $.trim(t));

        let options: ITagControlOptions = {
            tags: tags,
            readOnly: true,
            type: "single.line",
            maxWidth: props.maxWidth,
            maxTags: props.maxTags || 10,
            selectable: false,
            tagCharacterLimit: props.maxCharacterLength || 20
        };

        return Controls.create(TagControl, $(element), options);
    }
}

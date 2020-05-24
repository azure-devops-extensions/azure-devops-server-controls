import * as React from "react";

import { TagActionHub, TagsRetrievedPayload } from "Build/Scripts/Actions/Tags";
import { TagsActionCreator } from "Build/Scripts/Actions/TagsActionCreator";
import { TagsPicker } from "Build/Scripts/Components/TagsPicker";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

export interface IBuildTagsPickerState {
    tags: string[];
}

export interface IBuildTagsPickerProps {
    onTagsChanged: (tags: string[]) => void;
    className?: string;
    actionHub?: TagActionHub;
    clearTags?: boolean;
}

export class BuildTagsPicker extends React.Component<IBuildTagsPickerProps, IBuildTagsPickerState> {
    private _actionCreator: TagsActionCreator = null;
    private _actionHub: TagActionHub = null;

    constructor(props: IBuildTagsPickerProps) {
        super(props);
        this._actionHub = (props.actionHub) ? props.actionHub : new TagActionHub();
        this._actionCreator = new TagsActionCreator(this._actionHub);

        this.state = {
            tags: []
        };
    }

    public render(): JSX.Element {
        return <TagsPicker
            tags={this.state.tags}
            searchTextPlaceHolder={BuildResources.SearchBuildTagsPlaceholder}
            onTagsChanged={this._onTagsChanged}
            onClear={this._onClear}
            className={this.props.className}
            clearTags={this.props.clearTags}
        />;
    }

    public componentDidMount() {
        this._actionHub.suggestionsRetrieved.addListener(this._onTagsRetreival);

        // Trigger tags fetch
        // Note: This fetches all build tags, we don't have paging support for tags yet
        this._actionCreator.fetchBuildTags();
    }

    public componentWillUnMount() {
        this._actionHub.suggestionsRetrieved.removeListener(this._onTagsRetreival);
    }

    private _onTagsRetreival = (payload: TagsRetrievedPayload) => {
        this.setState({
            tags: payload.tags
        });
    }

    private _onClear = () => {
        this._onTagsChanged([]);
    }

    private _onTagsChanged = (tags: string[]) => {
        this.props.onTagsChanged(tags);
    }
}

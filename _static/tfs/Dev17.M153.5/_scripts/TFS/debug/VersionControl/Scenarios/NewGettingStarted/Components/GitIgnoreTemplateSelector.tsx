import * as React from "react";
import { GitTemplate } from "TFS/VersionControl/Contracts";
import { GitIgnoreTemplateSelectorMenu } from "VersionControl/Scripts/Controls/GitIgnoreTemplateSelector";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { BaseControl } from "VSS/Controls";

import "VSS/LoaderPlugins/Css!VersionControl/GitIgnoreTemplateSelector";

export interface GitIgnoreTemplateSelectorProps {
    projectName: string;
    onItemChanged?(selectedItem: GitTemplate): void;
    popupOptions?: any;
    style?: React.CSSProperties;
    showInlineLabel?: boolean;
    ariaLabelledBy?: string;
    setPopupWidthToMatchMenu?: boolean;
}

export class GitIgnoreTemplateSelector extends React.Component<GitIgnoreTemplateSelectorProps, {}> {

    private _gitIgnoreSelector: GitIgnoreTemplateSelectorMenu;
    private _element: HTMLDivElement;

    public componentDidMount(): void {
        const topOffsetPixels = 400;
        const comboboxHeight = 32;
        const popupOptions = this.props.popupOptions || {
            topOffsetPixels: -topOffsetPixels, // temporary hack to move the popup to top even the first time
            overflow: "hidden-hidden",
            height: (topOffsetPixels - comboboxHeight) + "px", // hack to avoid hanging popup after filtering
        };
        const options = {
            projectName: this.props.projectName,
            onItemChanged: (selectedItem: GitTemplate) => {
                if (this.props.onItemChanged) {
                    this.props.onItemChanged(selectedItem);
                }
            },
            popupOptions,
            showInlineLabel: this.props.showInlineLabel !== false,
            ariaLabelledBy: this.props.ariaLabelledBy,
            setPopupWidthToMatchMenu: this.props.setPopupWidthToMatchMenu,
        };

        this._gitIgnoreSelector = BaseControl.enhance(
            GitIgnoreTemplateSelectorMenu,
            this._element,
            options) as GitIgnoreTemplateSelectorMenu;

        // overriding title to announce valid instruction for gitignore combobox.
        this._gitIgnoreSelector.getElement().attr("title", VCResources.AddGitIgnoreSelector_PrefixText);
    }

    public componentWillUnmount(): void {
        if (this._gitIgnoreSelector) {
            this._gitIgnoreSelector.dispose();
            this._gitIgnoreSelector = null;
        }
    }

    public render(): JSX.Element {
        return (
            <div
                role="combobox"
                className="gitignore-selector"
                style={this.props.style}
                // tslint:disable-next-line:jsx-no-lambda
                ref={item => {this._element = item; }} />
        );
    }
}

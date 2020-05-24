import * as React from "react";
import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";
import { DescriptionEditingToggleType } from "ProjectOverview/Scripts/Constants";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/DescriptionViewer";

export interface DescriptionViewerProps {
    text: string;
    isReadOnly: boolean;
    isLoadingAsyncScripts: boolean;
    onTextClicked: (toggleType: DescriptionEditingToggleType) => void;
    isExpanded: boolean;
    toggleExpandedText: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export interface DescriptionViewerState {
    needContentToggleButton: boolean;
}

const ReadMoreTextContainerClass = "read-more-text-content";
const MaxHeightToDisplayFullDescription = 45;

export class DescriptionViewer extends React.Component<DescriptionViewerProps, DescriptionViewerState> {
    private _contentDiv: HTMLDivElement;

    constructor(props: DescriptionViewerProps, context?: any) {
        super(props, context);
        this.state = {
            needContentToggleButton: false,
        };
    }

    public componentDidMount(): void {
        if (this._contentDiv && this._contentDiv.scrollHeight > MaxHeightToDisplayFullDescription) {
            this.setState({
                needContentToggleButton: true,
            });
        }
    }

    public componentDidUpdate(): void {
        if (this._contentDiv && !this.props.isExpanded) {
            this._contentDiv.scrollTop = 0;
        }
    }

    public render(): JSX.Element {
        let containerCSSClass: string = this._getContainerCSSClass();
        let placeHolder: string = this._getPlaceHolderToShow();
        let contentCSSClass: string = this._getContentCSSClass();
        let contentToggleButtonText: string = this._getContentToggleButtonText();
        let contentToggleButtonAriaLabel: string = this._getContentToggleButtonAriaLabel();

        return (
            <div className="description-viewer">
                <div
                    className={containerCSSClass}
                    tabIndex={this.props.isReadOnly ? null : 0}
                    onFocus={this._onTextClicked}
                    onClick={this._onTextClicked}>
                    {
                        this.props.text
                            ? <div
                                ref={(ref) => { this._contentDiv = ref }}
                                className={contentCSSClass}>
                                {this.props.text}
                            </div>
                            : <input
                                disabled={true}
                                className={"description-placeholder"}
                                placeholder={placeHolder}
                            />
                    }
                </div>
                {
                    this.state.needContentToggleButton &&
                    <KeyboardAccesibleComponent
                        ariaLabel={contentToggleButtonAriaLabel}
                        ariaExpanded={this.props.isExpanded}
                        className="content-toggle-button"
                        onClick={this.props.toggleExpandedText}>
                        {contentToggleButtonText}
                    </KeyboardAccesibleComponent>
                }
            </div>
        );
    }

    private _onTextClicked = (): void => {
        return this.props.isLoadingAsyncScripts
            ? undefined
            : this.props.onTextClicked(DescriptionEditingToggleType.StartEditingToggle);
    }

    private _getPlaceHolderToShow = (): string => {
        if (this.props.isReadOnly) {
            return ProjectOverviewResources.ProjectDescription_NonAdminPlaceHolder;
        } else if (!this.props.isLoadingAsyncScripts) {
            return ProjectOverviewResources.ProjectDescription_AdminPlaceHolder;
        } else {
            return null;
        }
    }

    private _getContainerCSSClass = (): string => {
        if (this.props.isReadOnly || this.props.isLoadingAsyncScripts) {
            return ReadMoreTextContainerClass;
        } else {
            return ReadMoreTextContainerClass + " edit-enabled";
        }
    }

    private _getContentCSSClass = (): string => {
        return this.props.isExpanded
            ? "content-expanded"
            : "content-collapsed";
    }

    private _getContentToggleButtonText = (): string => {
        return this.props.isExpanded
            ? ProjectOverviewResources.ProjectDescription_LessButtonText
            : ProjectOverviewResources.ProjectDescription_MoreButtonText;
    }

    private _getContentToggleButtonAriaLabel = (): string => {
        return this.props.isExpanded
            ? ProjectOverviewResources.ProjectDescription_LessButtonLabel
            : ProjectOverviewResources.ProjectDescription_MoreButtonLabel;
    }
}

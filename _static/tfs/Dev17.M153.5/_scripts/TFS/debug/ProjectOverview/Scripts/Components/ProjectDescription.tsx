import * as React from "react";
import { using } from "VSS/VSS";
import { DescriptionViewer, DescriptionViewerProps } from "ProjectOverview/Scripts/Components/DescriptionViewer";
import * as DescriptionEditor_Async from "ProjectOverview/Scripts/Components/DescriptionEditor";
import { DescriptionEditingToggleType } from "ProjectOverview/Scripts/Constants";

export interface ProjectDescriptionProps {
    description: string;
    hasProjectEditPermission: boolean;
    errorMessage: string;
    onSaveClicked: (newText: string) => void;
    isEditing: boolean;
    isEditingDisabled: boolean;
    toggleEditing: (toggleType: DescriptionEditingToggleType) => void;
    clearErrorMessage: () => void;
    publishProjectDescriptionDiscardClicked: () => void;
    publishProjectDescriptionDiscardDialogOKClicked: () => void;
    publishProjectDescriptionDiscardDialogCancelClicked: () => void;
    publishProjectDescriptionDiscardDialogDismissed: () => void;
}

export interface ProjectDescriptionState {
    isExpanded: boolean;
    isLoadingAsyncScripts: boolean;
}

export class ProjectDescription extends React.Component<ProjectDescriptionProps, ProjectDescriptionState> {
    private _DescriptionEditor: (props: DescriptionEditor_Async.DescriptionEditorProps) => JSX.Element;

    constructor(props: ProjectDescriptionProps, context?: any) {
        super(props, context);
        this.state = {
            isExpanded: false,
            isLoadingAsyncScripts: true,
        };
    }

    public componentDidMount(): void {
        this._fetchAndInitializeDescriptionEditor();
    }

    public render(): JSX.Element {
        return (
            <div>
                {
                    this.props.isEditing
                        ? <this._DescriptionEditor
                            initialText={this.props.description || ""}
                            onSaveClicked={this.props.onSaveClicked}
                            errorMessage={this.props.errorMessage}
                            isEditingDisabled={this.props.isEditingDisabled}
                            clearErrorMessage={this.props.clearErrorMessage}
                            toggleEditing={this.props.toggleEditing}
                            publishProjectDescriptionDiscardClicked={this.props.publishProjectDescriptionDiscardClicked}
                            publishProjectDescriptionDiscardDialogOKClicked={this.props.publishProjectDescriptionDiscardDialogOKClicked}
                            publishProjectDescriptionDiscardDialogCancelClicked=
                            {this.props.publishProjectDescriptionDiscardDialogCancelClicked}
                            publishProjectDescriptionDiscardDialogDismissed={this.props.publishProjectDescriptionDiscardDialogDismissed} />
                        : <DescriptionViewer
                            text={this.props.description}
                            isReadOnly={!this.props.hasProjectEditPermission}
                            isLoadingAsyncScripts={this.state.isLoadingAsyncScripts}
                            onTextClicked={this.props.toggleEditing}
                            isExpanded={this.state.isExpanded}
                            toggleExpandedText={this._toggleExpandedText} />
                }
            </div>
        );
    }

    private _fetchAndInitializeDescriptionEditor = (): void => {
        if ((this.props.hasProjectEditPermission) && this._DescriptionEditor == null) {
            using(["ProjectOverview/Scripts/Components/DescriptionEditor"],
                (DecriptionEditorModule: typeof DescriptionEditor_Async) => {
                    this._DescriptionEditor = (props: DescriptionEditor_Async.DescriptionEditorProps): JSX.Element => {
                        return (<DecriptionEditorModule.DescriptionEditor {...props} />);
                    }

                    this._loadingAsyncScriptsCompleted();
                }
            );
        }
    }

    private _loadingAsyncScriptsCompleted = (): void => {
        this.setState((prevState) => {
            return {
                isExpanded: prevState.isExpanded,
                isLoadingAsyncScripts: false,
            }
        });
    }

    private _toggleExpandedText = (e: React.MouseEvent<HTMLAnchorElement>): void => {
        this.setState((prevState) => {
            return {
                isExpanded: !prevState.isExpanded,
                isLoadingAsyncScripts: prevState.isLoadingAsyncScripts,
            }
        });
    }
}
import * as React from "react";

import * as AgileProductBacklogResources from "Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import { FieldControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/FieldControl";
import { WorkItemClassificationControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemClassificationControl";
import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { FieldDefinition, WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export interface IWorkItemControlWrapperProps {
    fieldDef: FieldDefinition;
    workItem: WorkItem;
    controlId: string;
    onKeyPress: (e: React.KeyboardEvent<HTMLElement>) => void;
}

export class WorkItemControlWrapper extends React.Component<IWorkItemControlWrapperProps> {
    private _container: HTMLDivElement;
    private _control: WorkItemControl;

    public render(): JSX.Element {
        return (
            <div ref={this._resolveContainerRef} className="work-item-control-container">
                <div
                    id={this.props.controlId + "ariadescription"}
                    style={{ display: "none" }}
                    onKeyPress={this._onKeyPress}
                >
                    {Utils_String.format(AgileProductBacklogResources.AddPanel_AriaDescription, this.props.fieldDef.name)}
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        this._renderFieldControl();
    }

    public shouldComponentUpdate(nextProps: IWorkItemControlWrapperProps) {
        return nextProps.fieldDef !== this.props.fieldDef ||
            nextProps.workItem !== this.props.workItem ||
            nextProps.controlId !== this.props.controlId;
    }

    public componentDidUpdate(prevProps: IWorkItemControlWrapperProps): void {
        this._renderFieldControl();
    }

    public componentWillUnmount(): void {
        this._disposeFieldControl();
    }

    public getControlVaue(): any {
        return this._control._getControlValue();
    }

    private _renderFieldControl(): void {
        this._disposeFieldControl();

        const {
            workItem,
            controlId
        } = this.props;
        const $controlContainer = $(this._container);

        switch (this.props.fieldDef.type) {
            case WITConstants.FieldType.String:
            case WITConstants.FieldType.Integer:
            case WITConstants.FieldType.Double:
            case WITConstants.FieldType.DateTime:
                this._control = this._createLiteralControl($controlContainer, controlId);
                this._control.bind(workItem);
                break;
            case WITConstants.FieldType.TreePath:
                //  We need to wait for the tree control to be rendered before binding the work item,
                //  so passing _bindWorkItem as the render callback function.
                this._control = this._createTreeControl($controlContainer, controlId, this._bindWorkItem);
                break;
            default:
                break;
        }
    }

    private _disposeFieldControl(): void {
        if (this._control) {
            this._control.unbind();
            this._control.dispose();
            this._control = null;
        }
    }

    /**
     * Manages creating a control for wit types String, Integer, DateTime, Double
     *
     * @param $controlContainer container that the control needs to be created inside
     * @param controlId id attribute of control input
     */
    private _createLiteralControl($controlContainer: JQuery, controlId: string) {
        return new FieldControl($controlContainer, {
            controlId,
            dontLayer: true,
            fieldName: this.props.fieldDef.referenceName,
            comboCssClass: "add-panel-input",
            allowEmpty: true
        },
            this.props.fieldDef.workItemType);
    }

    /**
     * Manages creating a control for wit type TreePath
     *
     * @param $controlContainer container that the control needs to be created inside
     * @param controlId id attribute of control input
     * @param renderCallback Callback function to invoke once the tree control is rendered.
     */
    private _createTreeControl($controlContainer: JQuery, controlId: string, renderCallback?: () => void) {
        return new WorkItemClassificationControl($controlContainer,
            {
                controlId,
                fieldName: this.props.fieldDef.referenceName,
                allowEmpty: true,
                useLegacy: true,
                renderCallback: renderCallback
            },
            this.props.fieldDef.workItemType);
    }

    private _resolveContainerRef = (element: HTMLDivElement): void => {
        this._container = element;
    }

    private _onKeyPress = (e: React.KeyboardEvent<HTMLElement>): void => {
        if (e.charCode === KeyCode.ENTER && this._control) {
            this._control.flush();
        }
        this.props.onKeyPress(e);
    }

    private _bindWorkItem = (): void => {
        const {
            workItem
        } = this.props;

        this._control.bind(workItem);
    }
}
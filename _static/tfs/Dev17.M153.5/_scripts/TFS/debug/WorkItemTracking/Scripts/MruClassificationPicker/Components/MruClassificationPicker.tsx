import { ClassificationFieldsMruStore, IClassificationFieldsMruFluxContext } from 'WorkItemTracking/Scripts/MruClassificationPicker/Stores/ClassificationFieldsMruStore';
import { ClassificationFieldsMruActionsCreator } from 'WorkItemTracking/Scripts/MruClassificationPicker/Actions/ClassificationFieldsMruActionsCreator';
import * as React from 'react';
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { TreePicker, ITreePickerProps } from "VSSPreview/Controls/TreePicker";
import { autobind, BaseComponent, IRenderFunction } from "OfficeFabric/Utilities";
import { CoreFieldRefNames } from 'Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants';
import { equals } from "VSS/Utils/String";

export interface IMruClassificationPickerProps extends ITreePickerProps<INode> {
    /** The field id [AreaPath or IterationPath] */
    fieldRefName: string;
    /** The current project id */
    projectId: string;
    /** Boolean flag that denotes if mru needs to be updated on item selection from the picker */
    updateMruOnSelection?: boolean;
    /** If true, skips the truncation behavior */
    skipPathTruncation?: boolean;
}

export interface IMruClassificationPickerState {
    /** The current MRU node ids */
    mruItemIds: number[];
}

/**
 * Classification picker that has MRU support
 */
export class MruClassificationPicker extends BaseComponent<IMruClassificationPickerProps, IMruClassificationPickerState> {
    private _treePicker: TreePicker<INode>;
    private _mruStore: ClassificationFieldsMruStore;
    private _mruActionCreator: ClassificationFieldsMruActionsCreator;

    constructor(props: IMruClassificationPickerProps) {
        super(props);

        const fluxContext = ClassificationFieldsMruStore.getDefaultFluxContext();
        this._mruStore = fluxContext.store;
        this._mruActionCreator = fluxContext.actionsCreator;

        this.state = {
            mruItemIds: this._getMruItemIds(props.fieldRefName, props.projectId)
        };
    }

    public confirmEdit(): boolean {
        if (this._treePicker) {
            return this._treePicker.confirmEdit();
        }

        return false;
    }

    public focus(): void {
        if (this._treePicker) {
            this._treePicker.focus();
        }
    }

    public hideDropdown(): boolean {
        if (this._treePicker) {
            return this._treePicker.hideDropdown();
        }

        return false;
    }

    public componentDidMount(): void {
        const {
            projectId
        } = this.props;

        this._mruStore.addChangedListener(this._onStoreChanged);

        if (!this.state.mruItemIds && !this.props.disabled && !this.props.readOnly) {
            // initialize mru only when its not already initialized and if the control is not disabled.
            this._mruActionCreator.initializeClassificationFieldsMru(projectId);
        }
    }

    public componentWillReceiveProps(nextProps: IMruClassificationPickerProps): void {
        if (!equals(this.props.projectId, nextProps.projectId, true) || !equals(this.props.fieldRefName, nextProps.fieldRefName, true)) {
            const mruItemIds = this._getMruItemIds(nextProps.fieldRefName, nextProps.projectId);
            this.setState({ mruItemIds: mruItemIds });

            if (!mruItemIds && !nextProps.disabled && !nextProps.readOnly) {
                // initialize mru only when its not already initialized and if the control is not disabled.
                this._mruActionCreator.initializeClassificationFieldsMru(nextProps.projectId);
            }
        }
    }

    public componentWillUnmount(): void {
        this._mruStore.removeChangedListener(this._onStoreChanged);
    }

    public render(): JSX.Element {
        const {
            mruItemIds
        } = this.state;

        return (
            <TreePicker
                {...this._getClassificationPickerProps(this.props)}
                componentRef={this._resolveClassificationPicker}
                mruItemIds={mruItemIds}
                onValueSelected={this._onValueSelected}
                skipPathTruncation={this.props.skipPathTruncation}
            />
        );
    }

    private _getMruItemIds(fieldRefName: string, projectId: string): number[] {
        if (equals(fieldRefName, CoreFieldRefNames.AreaPath, true)) {
            return this._mruStore.getAreaPathMru(projectId);
        } else if (equals(fieldRefName, CoreFieldRefNames.IterationPath, true)) {
            return this._mruStore.getIterationPathMru(projectId);
        } else {
            return [];
        }
    }

    @autobind
    private _resolveClassificationPicker(classificationPicker: TreePicker<INode>): void {
        this._treePicker = classificationPicker;
    }

    @autobind
    private _onStoreChanged(): void {
        const {
            fieldRefName,
            projectId
        } = this.props;

        this.setState({ mruItemIds: this._getMruItemIds(fieldRefName, projectId) });
    }

    @autobind
    private _onValueSelected(value: string, node?: INode, isSuggestedValue?: boolean): void {
        const {
            fieldRefName,
            projectId,
            onValueSelected,
            updateMruOnSelection
        } = this.props;

        // If a node was returned, use it for the MRU
        if (node && node.id && updateMruOnSelection) {
            if (equals(fieldRefName, CoreFieldRefNames.AreaPath, true)) {
                this._mruActionCreator.addToAreaPathMru(projectId, [node.id]);
            } else if (equals(fieldRefName, CoreFieldRefNames.IterationPath, true)) {
                this._mruActionCreator.addToIterationPathMru(projectId, [node.id]);
            }
        }

        // Pass the value up the chain
        if (onValueSelected) {
            onValueSelected(value, node, isSuggestedValue);
        }
    }

    private _getClassificationPickerProps(props: IMruClassificationPickerProps): IMruClassificationPickerProps {
        const classificationProps = { ...this.props };
        delete classificationProps.fieldRefName;
        delete classificationProps.projectId;

        return classificationProps as IMruClassificationPickerProps;
    }
}
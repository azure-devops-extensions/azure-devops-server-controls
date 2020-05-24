import "VSS/LoaderPlugins/Css!Queries/Components/ColumnOptions/ColumnOptionsPanel";

import * as Q from "q";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { IContributionHubViewStateRouterContext } from "Presentation/Scripts/TFS/Router/ContributionHubViewStateRouter";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as ColumnOptionsPanelContent_Async from "WorkItemTracking/Scripts/Queries/Components/ColumnOptions/ColumnOptionsPanelContent";
import { IColumnField } from "WorkItemTracking/Scripts/Queries/Components/ColumnOptions/Constants";
import { IColumnOptionsPanelDisplayColumn, IColumnOptionsPanelSortColumn, IColumnOptionsResult, IDisplayColumnResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { WorkItemStore, FieldDefinition } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { LinkColumnHelper } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking";
import { registerLWPComponent } from "VSS/LWP";
import { FieldFlags } from "WorkItemTracking/Scripts/OM/WorkItemConstants";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";

import { autobind } from "OfficeFabric/Utilities";
import { Panel, PanelType, IPanelProps } from "OfficeFabric/Panel";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

// Component to display while delay loading async modules
const LoadingComponent: React.StatelessComponent<{}> = (): JSX.Element => {
  return <div className="hub-loading-spinner-overlay">
    <Spinner size={SpinnerSize.large} />
  </div>;
};

const AsyncColumnOptionsPanelContentComponent = getAsyncLoadedComponent(
  ["WorkItemTracking/Scripts/Queries/Components/ColumnOptions/ColumnOptionsPanelContent"],
  (m: typeof ColumnOptionsPanelContent_Async) => m.ColumnOptionsPanelContent,
  () => <LoadingComponent />);

export interface IColumnOptionsPanelProps {
  /**
   * Array of query columns data
   */
  displayColumns: IColumnOptionsPanelDisplayColumn[];
  /**
   * Array of sort columns data
   */
  sortColumns?: IColumnOptionsPanelSortColumn[];
  /**
   * Specifies if picking sort columns is allowed or not
   */
  allowSort: boolean;
  /**
   * Specifies which work item type to use to pull down available fields. Null means pull fields from all work item types
   */
  workItemTypeNames?: string[];
  /**
   * Specifies which project to use to pull down available fields. Null means pull fields from all projects
   */
  project?: string;

  /**
   * Callback called to get width of the field. It will be used if IColumnOptionsPanelDisplayColumn.width is not available.
   */
  getFieldWidth?: (fieldrefName: string) => number;
  /**
   * An optional callback function to get available field columns which are what populate the auto-complete dropdowns
   */
  getAvailableFields?: () => IPromise<FieldDefinition[]>;
  /**
   * Callback called when panel is dismissed by either clicking Cancel or hitting Esc
   */
  onDismiss?: () => void;
  /**
   * Callback called when user clicks OK button in the panel
   */
  onOkClick: (result: IColumnOptionsResult, dataChanged?: boolean) => void;
}

export interface IColumnOptionsPanelState {
  allDisplayFields: IColumnField[];
  allSortFields: IColumnField[];

  originalDisplayColumnFields: IColumnField[];
  changedDisplayColumnFields: IColumnField[];

  originalSortColumnFields: IColumnField[];
  changedSortColumnFields: IColumnField[];

  error?: string;
}

export class ColumnOptionsPanel extends React.Component<IColumnOptionsPanelProps, IColumnOptionsPanelState> {
  private _store: WorkItemStore;
  private _isDisposed: boolean;
  private _fieldWidthsMap: IDictionaryStringTo<number>;
  private _requiredColumnsMap: IDictionaryStringTo<boolean>;

  public static componentType = "columnOptionsPanel";

  constructor(props: IColumnOptionsPanelProps, context?: IContributionHubViewStateRouterContext) {
    super(props, context);

    this._isDisposed = false;
    const tfsContext = TfsContext.getDefault();
    this._store = ProjectCollection.getConnection(tfsContext).getService<WorkItemStore>(WorkItemStore);
    this._fieldWidthsMap = {};
    this._requiredColumnsMap = {};

    this.state = {
      originalDisplayColumnFields: null,
      allDisplayFields: null,
      allSortFields: null,
      changedDisplayColumnFields: null,
      originalSortColumnFields: null,
      changedSortColumnFields: null
    };
  }

  public componentDidMount() {
    this._initializeFieldState();
  }

  public componentWillUnmount() {
    this._isDisposed = true;
  }

  public render(): JSX.Element {
    return <Panel
      isOpen={true}
      onRenderHeader={(props?: IPanelProps, defaultRender?: (props?: IPanelProps) => JSX.Element) => {
        return <div className="column-options-panel-header">
          {defaultRender(props)}
        </div>;
      }}
      closeButtonAriaLabel={WITResources.ClosePanel}
      headerText={WITResources.ColumnOptions}
      type={PanelType.custom}
      customWidth="450px"
      isLightDismiss={false}
      isFooterAtBottom={true}
      className="column-options-panel"
      onRenderFooterContent={() => {
        return <div style={{ textAlign: "right" }}>
          <PrimaryButton
            ariaLabel={WITResources.OK}
            disabled={!this._areColumnsValid()}
            onClick={this._onOkClick}
            style={{ marginRight: "8px" }}>
            {WITResources.OK}
          </PrimaryButton>
          <DefaultButton
            ariaLabel={WITResources.Cancel}
            onClick={this.props.onDismiss}
          >
            {WITResources.Cancel}
          </DefaultButton>
        </div>;
      }}
      layerProps={{
        className: "column-options-panel-layer"
      }}
      onDismiss={this.props.onDismiss}>

      {this._renderContents()}
    </Panel>;
  }

  protected _initializeFieldState(): IPromise<void> {
    this.props.displayColumns.forEach(dc => {
      if (dc.width) {
        this._fieldWidthsMap[dc.fieldRefName.toLowerCase()] = dc.width;
      }
      if (dc.isRequired) {
        this._requiredColumnsMap[dc.fieldRefName.toLowerCase()] = true;
      }
    });

    const deferred = Q.defer<void>();
    this._getAvailableFields().then((fields: FieldDefinition[]) => {

      if (!this._isDisposed) {
        const displayColumnFieldsMap: IDictionaryStringTo<IColumnField> = {};
        const sortFieldsMap: IDictionaryStringTo<IColumnField> = {};
        const allDisplayFields: IColumnField[] = [];
        const allSortFields: IColumnField[] = [];

        for (const field of fields) {
          const columnField = this._mapFieldDefinitionToColumnField(field);
          if (field.isQueryable()) {
            allDisplayFields.push(columnField);
            displayColumnFieldsMap[field.referenceName.toLowerCase()] = columnField;
          }

          if (field.canSortBy()) {
            allSortFields.push(columnField);
            sortFieldsMap[field.referenceName.toLowerCase()] = columnField;
          }
        }

        const displayColumnFields = (this.props.displayColumns || [])
          .map(displayColumn => {
            const refName = displayColumn.fieldRefName.toLowerCase();
            let columnField = displayColumnFieldsMap[refName];
            if (!columnField) {
              columnField = this._getField(refName);
            }

            return columnField || {
              identifier: GUIDUtils.newGuid(),
              fieldRefName: "",
              fieldId: null,
              name: displayColumn.fieldRefName,
              isRequired: false,
              isInvalid: true,
              error: WITResources.FieldDoesNotExist
            } as IColumnField;
          });

        const sortColumnFields = (this.props.sortColumns || [])
          .map(sortColumn => {
            const fieldKey = sortColumn.fieldRefName.toLowerCase();
            let sortColumnField = sortFieldsMap[fieldKey] || this._getField(fieldKey);

            if (sortColumnField) {
              return {
                ...sortColumnField,
                asc: !sortColumn.descending
              };
            }

            return {
              identifier: GUIDUtils.newGuid(),
              fieldRefName: "",
              fieldId: null,
              name: sortColumn.fieldRefName,
              isRequired: false,
              isInvalid: true,
              error: WITResources.FieldDoesNotExist
            } as IColumnField;
          });

        this.setState({
          allDisplayFields: allDisplayFields,
          allSortFields: allSortFields,
          originalDisplayColumnFields: displayColumnFields,
          originalSortColumnFields: sortColumnFields,
          changedSortColumnFields: sortColumnFields,
          changedDisplayColumnFields: displayColumnFields,
        }, deferred.resolve);
      }
    }, (e) => {
      this.setState({ error: e.message || e }, deferred.resolve);
    });

    return deferred.promise;
  }

  private _renderContents(): React.ReactNode {
    if (this.state.error) {
      return <MessageBar messageBarType={MessageBarType.error}>{this.state.error}</MessageBar>;
    }

    if (!this.state.allDisplayFields) {
      return <Spinner size={SpinnerSize.large} />;
    }

    return <AsyncColumnOptionsPanelContentComponent
      allowSort={this.props.allowSort}
      sortColumnFields={this.state.changedSortColumnFields}
      availableSortColumnFields={this.state.allSortFields}
      onSortColumnsChange={this._onSortColumnsChange}
      displayColumnFields={this.state.changedDisplayColumnFields}
      availableDisplayColumnFields={this.state.allDisplayFields}
      onDisplayColumnsChange={this._onDisplayColumnsChange}
      getField={this._getField} />;
  }

  private _mapFieldDefinitionToColumnField(fd: FieldDefinition): IColumnField {
    if (!fd) {
      return null;
    }

    const isRequired = !!this._requiredColumnsMap[fd.referenceName.toLowerCase()];
    const isHidden = (fd.flags & FieldFlags.Ignored) === FieldFlags.Ignored;

    return {
      identifier: GUIDUtils.newGuid(),
      fieldRefName: fd.referenceName,
      fieldId: fd.id,
      name: fd.name,
      isRequired: isRequired,
      isHidden: isHidden
    } as IColumnField;
  }

  private _getField = (fieldReference: string): IColumnField => {
    // handle edge case where store may not be initialized
    if (!this._store.fieldMap) {
      this._store.beginGetFields(() => { 
        const fieldDef = this._store.getFieldDefinition(fieldReference); 
        return fieldDef !== null ? this._mapFieldDefinitionToColumnField(fieldDef) : null;
      })
    }
    else {
      const fieldDef = this._store.getFieldDefinition(fieldReference);
      return fieldDef !== null ? this._mapFieldDefinitionToColumnField(fieldDef) : null;
    }
  }

  private _getAvailableFields(): IPromise<FieldDefinition[]> {
    const deferred = Q.defer<FieldDefinition[]>();
    const fieldIdMap: IDictionaryNumberTo<boolean> = {};
    const fields: FieldDefinition[] = [];

    const finalize = (fields: FieldDefinition[]) => {
      fields.sort((fd1, fd2) => Utils_String.localeIgnoreCaseComparer(fd1.name, fd2.name));
      deferred.resolve(fields);
    };

    if (this.props.getAvailableFields) {
      this.props.getAvailableFields().then((fields: FieldDefinition[]) => finalize(fields), deferred.reject);
    } else if (!this.props.project && !this.props.workItemTypeNames) {
      this._store.beginGetProjects(projects => {
        for (const proj of projects) {
          for (const fieldId of proj.fieldIds) {
            if (!(fieldId in fieldIdMap)) {
              fieldIdMap[fieldId] = true;
              fields.push(this._store.getFieldDefinition(fieldId));
            }
          }
        }

        finalize(fields);
      }, deferred.reject);
    } else if (this.props.project) {
      this._store.beginGetProject(this.props.project, (project) => {
        if (this.props.workItemTypeNames) {
          project.beginGetWorkItemTypes(this.props.workItemTypeNames, wits => {
            for (const wit of wits) {
              for (const field of wit.fields) {
                if (!(field.id in fieldIdMap)) { // We don't want duplicate fields so don't add it if its already in the map
                  fieldIdMap[field.id] = true;
                  fields.push(field);
                }
              }
            }

            finalize(fields);
          }, deferred.reject);
        } else {
          for (const fieldId of project.fieldIds) {
            // Project only has the ids of the fields. Thus, we need to get
            // the details of the fields from the store
            const fd = this._store.getFieldDefinition(fieldId);
            if (fd) {
              fields.push(fd);
            }
          }
          finalize(fields);
        }
      }, deferred.reject);
    } else {
      finalize([]);
    }

    return deferred.promise;
  }

  @autobind
  private _onDisplayColumnsChange(newColumns: IColumnField[]) {
    this.setState({
      changedDisplayColumnFields: newColumns,
    });
  }

  @autobind
  private _onSortColumnsChange(newColumns: IColumnField[]) {
    this.setState({
      changedSortColumnFields: newColumns,
    });
  }

  @autobind
  protected _onOkClick() {
    const changedColumnFieldRefNames = this.state.changedDisplayColumnFields.map(c => c.fieldRefName);
    const originalColumnFieldRefNames = this.state.originalDisplayColumnFields.map(c => c.fieldRefName);
    const addedFieldRefNames = Utils_Array.subtract(changedColumnFieldRefNames, originalColumnFieldRefNames, Utils_String.ignoreCaseComparer);
    const removedFieldRefNames = Utils_Array.subtract(originalColumnFieldRefNames, changedColumnFieldRefNames, Utils_String.ignoreCaseComparer);

    const displayColumns = this.state.changedDisplayColumnFields.map(c => {
      const width = this._getFieldWidth(c.fieldRefName);
      return {
        id: c.fieldId,
        name: c.fieldRefName,
        text: c.name,
        width: width
      } as IDisplayColumnResult;
    });

    const sortColumns = this.state.changedSortColumnFields.map(c => {
      return {
        id: c.fieldId,
        name: c.fieldRefName,
        text: c.name,
        asc: c.asc
      } as IDisplayColumnResult;
    });

    // Last param is set to true because we want to compare same index in both the arrays and not do a contains comparison
    const columnOptionsChanged = !Utils_Array.arrayEquals(this.state.changedDisplayColumnFields, this.state.originalDisplayColumnFields, (c1, c2) => Utils_String.equals(c1.fieldRefName, c2.fieldRefName, true), false, true);
    const sortOptionsChanged = !Utils_Array.arrayEquals(sortColumns, this.state.originalSortColumnFields, (s1, s2) => Utils_String.equals(s1.name, s2.fieldRefName, true) && s1.asc === s2.asc, false, true);
    const result: IColumnOptionsResult = {
      display: displayColumns,
      sort: sortColumns,
      added: addedFieldRefNames,
      removed: removedFieldRefNames
    };

    this.props.onOkClick(result, columnOptionsChanged || sortOptionsChanged);
  }

  protected _getFieldWidth(fieldRefName: string): number {
    return this._fieldWidthsMap[fieldRefName.toLowerCase()]
      || (this.props.getFieldWidth && this.props.getFieldWidth(fieldRefName))
      || LinkColumnHelper.getFieldColumnWidth(fieldRefName, this._store);
  }

  protected _areColumnFieldsValid(columnFields: IColumnField[], checkLength: boolean): boolean {
    return columnFields
      && (checkLength ? columnFields.length > 0 : true)
      && columnFields.filter(c => c.isInvalid || c.fieldRefName === null || c.fieldRefName.trim() === "").length === 0;
  }

  private _areColumnsValid(): boolean {
    return this._areColumnFieldsValid(this.state.changedDisplayColumnFields, true)
      && this._areColumnFieldsValid(this.state.changedSortColumnFields, false);
  }
}

/**
 * Render column options panel
 *
 * @props Props to pass on to the component
 */
export function showColumnOptionsPanel(props: IColumnOptionsPanelProps): void {
  const panelNode = document.createElement("div");
  const panelProps: IColumnOptionsPanelProps = {
    ...props,
    onDismiss: () => {
      ReactDOM.unmountComponentAtNode(panelNode);
      if (props.onDismiss) {
        props.onDismiss();
      }
    },
    onOkClick: (newColumns: IColumnOptionsResult, dataChanged?: boolean) => {
      ReactDOM.unmountComponentAtNode(panelNode);
      props.onOkClick(newColumns, dataChanged);
    }
  };
  ReactDOM.render(<ColumnOptionsPanel {...panelProps} />, panelNode);
}

registerLWPComponent(ColumnOptionsPanel.componentType, ColumnOptionsPanel);

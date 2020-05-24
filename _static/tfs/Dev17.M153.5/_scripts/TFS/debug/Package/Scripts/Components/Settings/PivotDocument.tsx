import * as Events_Document from "VSS/Events/Document";
import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

export interface IPivotDocumentProps extends Props {
    /**
     * True if user has made changes to this pivot
     */
    hasChanges: () => boolean;
}

export abstract class PivotDocument<TProps extends IPivotDocumentProps, TState extends State = {}>
    extends Component<TProps, TState>
    implements Events_Document.RunningDocument {
    public componentDidMount(): void {
        super.componentDidMount();
        this._documentEntry = Events_Document.getRunningDocumentsTable().add(this.getPivotMoniker(), this);
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        Events_Document.getRunningDocumentsTable().remove(this._documentEntry);
    }

    public isDirty(): boolean {
        return this.props.hasChanges();
    }

    // the pivot key of the pivot document
    protected abstract getPivotKey(): string;

    // string to identify the pivot document in the running documents table
    protected getPivotMoniker(): string {
        return Utils_String.format("feedsettings.{0}", this.getPivotKey());
    }

    private _documentEntry: Events_Document.RunningDocumentsTableEntry;
}

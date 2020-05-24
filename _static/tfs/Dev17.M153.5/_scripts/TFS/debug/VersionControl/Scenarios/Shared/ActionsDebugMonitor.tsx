import * as React from "react";
import * as ReactDOM from "react-dom";
import { logWarning } from "VSS/Diag";

export function renderInBody(actionsHub: any): HTMLDivElement {
    const container = document.createElement("div");
    document.body.appendChild(container);
    ReactDOM.render(
        <ActionsDebugMonitorContainer actionsHub={actionsHub} />,
        container);

    return container;
}

interface ContainerProps {
    actionsHub: any;
}

class ActionsDebugMonitorContainer extends React.Component<ContainerProps, {}> {
    constructor(props: ContainerProps) {
        super(props);

        this.store = new Store(props.actionsHub, () => this.forceUpdate());
    }

    private store: Store;

    public render(): JSX.Element {
        return (
            <ActionsDebugMonitor
                entries={this.store.entries}
                onReset={this.store.reset}
                />);
    }
}

interface Entry {
    index: number;
    name: string;
    payload: IDictionaryStringTo<any>;
}

class Store {
    constructor(actionsHub: any, private onChange: () => void) {
        this.listen(actionsHub);
    }

    private nextIndex = 1;
    public entries: Entry[] = [];

    public reset = (): void => {
        this.entries = [];

        this.onChange();
    }

    private listen(actionsHub: any): void {
        forEachProperty(
            actionsHub,
            (name, action) => action.addListener
                ? action.addListener(payload => this.addActionInvoked(name, payload))
                // If it's not an action, assume it's a nested actionsHub.
                : this.listen(action));
            }

    private addActionInvoked(name: string, payload: any): void {
        this.entries = [...this.entries, { index: this.nextIndex, name, payload }];
        this.nextIndex++;

        this.onChange();
    }
}

interface Props {
    entries: Entry[];
    onReset(): void;
}

interface State {
    isOpen: boolean;
}

class ActionsDebugMonitor extends React.Component<Props, State> {
    public state: State = { isOpen: false };

    public render(): JSX.Element {
        const background = "#DDDDCC";

        if (!this.state.isOpen) {
            return (
                <button
                    style={ { position: "fixed", right: 0, bottom: "26px", background } }
                    onClick={ () => this.setState({ isOpen: true }) }>
                    {this.props.entries.length + " actions invoked"}
                </button>);
        }

        return (
            <div style={ { position: "fixed", right: 0, top: 0, bottom: 0, overflow: "auto", maxWidth: "50em", background, fontFamily: "consolas" } }>
                <h2 style={ { margin: "1em" } }>Actions Monitor</h2>
                <ol>
                    {this.props.entries.map(entry => renderValue(entry.name, entry.payload, entry.index))}
                </ol>
                <span style={ { position: "fixed", right: 0, bottom: 0, margin: "2em" } }>
                    <button onClick={this.props.onReset}>
                        Reset
                    </button>
                    <button onClick={ () => this.setState({ isOpen: false }) }>
                        Hide
                    </button>
                </span>
            </div>);
    }
}

export class ObjectValues extends React.Component<{ name: string, values: IDictionaryStringTo<any> }, { isExpanded: boolean }> {
    public state = { isExpanded: false };

    public render(): JSX.Element {
        const propertyLis: JSX.Element[] = [];
        forEachProperty(
            this.props.values,
            (key, value) => propertyLis.push(renderValue(key, value)));

        return (
            <li>
                <a onClick={ () => this.setState({ isExpanded: !this.state.isExpanded }) }>
                    {this.props.name}
                </a>
                { this.state.isExpanded &&
                    <ul style={ { paddingLeft: "1.5em" } }>
                        {propertyLis}
                    </ul>
                }
            </li>
        );
    }
}

const ScalarValue = (props: { name: string, value: any }) =>
    <li>{props.name + ": "} <strong>{toStringValue(props.value)}</strong></li>;

function toStringValue(value: any): string {
    return isFunction(value) ? "<function>"
        : value === null ? "<null>"
        : value === undefined ? "<undefined>"
        : value.toString();
}

function forEachProperty(object: any, fn: Function): void {
    for (const key in object) {
        if (object.hasOwnProperty(key)) {
            fn(key, object[key]);
        }
    }
}

function renderValue(name: string, value: any, key?: any): JSX.Element {
    return isEmptyArray(value) ? <ScalarValue key={key || name} name={name} value="[]" />
        : isObject(value) ? <ObjectValues key={key || name} name={name} values={value} />
        : <ScalarValue key={key || name} name={name} value={value} />;
}

function isFunction(value: any): boolean {
    return typeof value === "function";
}

function isEmptyArray(value: any): boolean {
    return Array.isArray(value) && value.length === 0;
}

function isObject(value: any): boolean {
    return value &&
        typeof value === "object" &&
        value.constructor !== Date;
}

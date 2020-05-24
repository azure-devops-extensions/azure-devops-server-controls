export interface ICounterVariable {
    id: number;
    seed: string;
    value: string;
}

export interface ICounterVariableReference {
    name: string;
    counter: ICounterVariable;
}

export type CounterVariableList = ICounterVariableReference[];

export type NamedCounterVariables = IDictionaryStringTo<ICounterVariable>;

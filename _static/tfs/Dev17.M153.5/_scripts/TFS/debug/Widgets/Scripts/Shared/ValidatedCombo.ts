import Combos = require("VSS/Controls/Combos");

export class ValidatedCombo extends Combos.ComboO<any> {
    validate: () => string;
}
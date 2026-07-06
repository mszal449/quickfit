const UNITS_KEY = "quickfit:units";

export type Units = "kg" | "lb";

export function getUnits(): Units {
  return localStorage.getItem(UNITS_KEY) === "lb" ? "lb" : "kg";
}

export function setUnits(value: Units): void {
  localStorage.setItem(UNITS_KEY, value);
}

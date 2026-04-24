import type { ProgressProps } from "./Progress.types";

const Placeholder = (_props: ProgressProps) => null;
Placeholder.Root = (_props: unknown) => null;
Placeholder.Track = (_props: unknown) => null;
Placeholder.Indicator = (_props: unknown) => null;
Placeholder.Label = (_props: unknown) => null;
Placeholder.ValueText = (_props: unknown) => null;

export const Progress = Placeholder;

import { StitchEmptyState } from "../common/StitchScreen";

export const EmptyState = ({ text }: { text: string }) => (
  <StitchEmptyState title="Nothing here yet" message={text} />
);
